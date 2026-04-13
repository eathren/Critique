#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolve, basename } from "path";
import { mkdir, readFile, writeFile, readdir, rm, stat } from "fs/promises";
import { buildContext } from "./lib/context.js";
import { getCritiqueRoles, loadRole, loadAllRoles } from "./lib/roles.js";

const server = new McpServer({
  name: "critique",
  version: "1.0.0",
});

server.tool(
  "list_roles",
  "List all available critique roles and their prompts",
  {},
  async () => {
    const roles = await loadAllRoles();
    const result = roles.map((r) => ({
      slug: r.slug,
      name: r.name,
      emoji: r.emoji,
      phase: r.phase,
      prompt: r.prompt,
    }));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "build_context",
  "Build a structured project context summary for critique. Returns the project tree, README, metadata, and key source files.",
  { project_path: z.string().describe("Absolute path to the project to critique") },
  async ({ project_path }) => {
    const projectPath = resolve(project_path);
    const context = await buildContext(projectPath);
    return { content: [{ type: "text", text: context }] };
  }
);

server.tool(
  "save_critique",
  "Save a completed critique to the project's .critique/ directory",
  {
    project_path: z.string().describe("Absolute path to the project"),
    role: z.string().describe("Role slug (e.g. 'product-manager', 'roundtable')"),
    content: z.string().describe("The critique content to save"),
  },
  async ({ project_path, role, content }) => {
    const projectPath = resolve(project_path);
    const outputDir = resolve(projectPath, ".critique");
    await mkdir(outputDir, { recursive: true });

    // Ensure .gitignore covers .critique/
    const gitignorePath = resolve(projectPath, ".gitignore");
    let gitignore = "";
    try {
      gitignore = await readFile(gitignorePath, "utf-8");
    } catch {}
    if (!gitignore.split("\n").some((l) => l.trim() === ".critique" || l.trim() === ".critique/")) {
      const nl = gitignore.length > 0 && !gitignore.endsWith("\n") ? "\n" : "";
      await writeFile(gitignorePath, gitignore + nl + ".critique/\n");
    }

    const filePath = resolve(outputDir, `${role}.md`);
    await writeFile(filePath, content);
    return { content: [{ type: "text", text: `Saved critique to .critique/${role}.md` }] };
  }
);

server.tool(
  "read_critiques",
  "Read all existing critiques from a project's .critique/ directory. Useful for the roundtable synthesis step.",
  { project_path: z.string().describe("Absolute path to the project") },
  async ({ project_path }) => {
    const projectPath = resolve(project_path);
    const outputDir = resolve(projectPath, ".critique");

    let files;
    try {
      files = await readdir(outputDir);
    } catch {
      return { content: [{ type: "text", text: "No critiques found. Run critiques first." }] };
    }

    const critiqueFiles = files.filter((f) => f.endsWith(".md") && f !== "roundtable.md");
    if (critiqueFiles.length === 0) {
      return { content: [{ type: "text", text: "No critiques found. Run critiques first." }] };
    }

    const critiques = {};
    for (const f of critiqueFiles) {
      const slug = f.replace(".md", "");
      critiques[slug] = await readFile(resolve(outputDir, f), "utf-8");
    }

    return { content: [{ type: "text", text: JSON.stringify(critiques, null, 2) }] };
  }
);

server.tool(
  "critique_status",
  "Show which critiques exist for a project and their metadata",
  { project_path: z.string().describe("Absolute path to the project") },
  async ({ project_path }) => {
    const projectPath = resolve(project_path);
    const outputDir = resolve(projectPath, ".critique");
    const roles = await loadAllRoles();

    let files;
    try {
      files = await readdir(outputDir);
    } catch {
      return { content: [{ type: "text", text: `No critiques yet for ${basename(projectPath)}` }] };
    }

    const status = [];
    for (const role of roles) {
      const filePath = resolve(outputDir, `${role.slug}.md`);
      try {
        const s = await stat(filePath);
        status.push({
          role: role.slug,
          name: role.name,
          emoji: role.emoji,
          done: true,
          size: s.size,
          modified: s.mtime.toISOString(),
        });
      } catch {
        status.push({ role: role.slug, name: role.name, emoji: role.emoji, done: false });
      }
    }

    return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
  }
);

server.tool(
  "clean_critiques",
  "Remove all critique output for a project",
  { project_path: z.string().describe("Absolute path to the project") },
  async ({ project_path }) => {
    const projectPath = resolve(project_path);
    const outputDir = resolve(projectPath, ".critique");
    try {
      await rm(outputDir, { recursive: true });
      return { content: [{ type: "text", text: `Cleaned critiques for ${basename(projectPath)}` }] };
    } catch {
      return { content: [{ type: "text", text: "Nothing to clean" }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
