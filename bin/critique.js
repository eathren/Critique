#!/usr/bin/env node

import { resolve, basename } from "path";
import { mkdir, readFile, writeFile, readdir, rm, stat } from "fs/promises";
import { getCritiqueRoles, loadRole, loadAllRoles } from "../lib/roles.js";
import { buildContext } from "../lib/context.js";
import { runAgent, runRoundtable } from "../lib/agent.js";

// Colors
const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case "review":
      return cmdReview(args[0]);
    case "roundtable":
      return cmdRoundtable(args[0]);
    case "run":
      return cmdRun(args[0]);
    case "solo":
      return cmdSolo(args[0], args[1]);
    case "status":
      return cmdStatus(args[0]);
    case "clean":
      return cmdClean(args[0]);
    case "roles":
      return cmdRoles();
    case "help":
    case "--help":
    case "-h":
      return usage();
    default:
      if (!command) return usage();
      console.log(c.red(`Unknown command: ${command}\n`));
      usage();
      process.exit(1);
  }
}

function usage() {
  console.log(`
${c.bold("critique")} — a team of AI agents that critique your product

${c.bold("USAGE")}
    critique <command> [path-to-project]

${c.bold("COMMANDS")}
    ${c.green("review")}      Run all agents against the codebase (parallel)
    ${c.green("roundtable")}  Agents read each other's critiques and synthesize
    ${c.green("run")}         Full pipeline: review → roundtable
    ${c.green("solo")}        Run a single agent (e.g., critique solo growth-lead)
    ${c.green("status")}      Show which critiques exist for a project
    ${c.green("clean")}       Remove critique output for a project
    ${c.green("roles")}       List available roles

${c.bold("EXAMPLES")}
    critique review ~/Projects/myapp
    critique roundtable ~/Projects/myapp
    critique run .
    critique solo founder-coach .

${c.bold("OUTPUT")}
    Critiques are written to <project>/.critique/
`);
}

async function cmdRoles() {
  const roles = await loadAllRoles();
  console.log(`\n${c.bold("Available roles:")}\n`);
  for (const r of roles) {
    const tag = r.phase === "roundtable" ? c.cyan(r.slug.padEnd(22)) : c.green(r.slug.padEnd(22));
    console.log(`  ${tag} ${r.emoji}  ${r.name}`);
  }
  console.log();
}

async function cmdReview(projectArg) {
  const projectPath = resolve(projectArg || ".");
  const outputDir = resolve(projectPath, ".critique");
  await mkdir(outputDir, { recursive: true });

  const roles = await getCritiqueRoles();
  const name = basename(projectPath);

  console.log(`\n${c.bold(c.cyan("Product Critique"))} — ${name}`);
  console.log(c.dim(`Building codebase context...`));

  const context = await buildContext(projectPath);

  console.log(c.dim(`Running ${roles.length} agents in parallel...\n`));

  const results = await Promise.allSettled(
    roles.map(async (role) => {
      const label = `${role.emoji}  ${role.name}`;
      console.log(`${c.blue("⟳")} ${label} ${c.dim(`(${role.slug})`)}`);
      try {
        const output = await runAgent(role, context, projectPath);
        await writeFile(resolve(outputDir, `${role.slug}.md`), output);
        console.log(`${c.green("✓")} ${label} → ${c.dim(`.critique/${role.slug}.md`)}`);
        return { slug: role.slug, output };
      } catch (err) {
        console.log(`${c.red("✗")} ${label} — ${c.dim(err.message)}`);
        throw err;
      }
    })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log();
  if (failed === 0) {
    console.log(`${c.green(c.bold("All agents complete."))} Critiques in ${c.dim(outputDir)}`);
  } else {
    console.log(
      `${c.yellow(`${failed} agent(s) failed.`)} ${succeeded} critiques in ${c.dim(outputDir)}`
    );
  }
  console.log(`\nNext: ${c.cyan(`critique roundtable ${projectArg || "."}`)}`);
}

async function cmdRoundtable(projectArg) {
  const projectPath = resolve(projectArg || ".");
  const outputDir = resolve(projectPath, ".critique");

  let files;
  try {
    files = await readdir(outputDir);
  } catch {
    console.log(c.red("No critiques found. Run 'critique review' first."));
    return;
  }

  const critiqueFiles = files.filter(
    (f) => f.endsWith(".md") && f !== "roundtable.md"
  );
  if (critiqueFiles.length === 0) {
    console.log(c.red("No critiques found. Run 'critique review' first."));
    return;
  }

  console.log(
    `\n${c.bold(c.cyan("Roundtable"))} — synthesizing ${critiqueFiles.length} critiques...\n`
  );

  const critiques = {};
  for (const f of critiqueFiles) {
    const slug = f.replace(".md", "");
    critiques[slug] = await readFile(resolve(outputDir, f), "utf-8");
  }

  process.stdout.write(c.dim("Thinking..."));
  let started = false;

  const output = await runRoundtable(critiques, (chunk) => {
    if (!started) {
      process.stdout.write("\r\x1b[K"); // clear "Thinking..."
      started = true;
    }
    process.stdout.write(chunk);
  });

  await writeFile(resolve(outputDir, "roundtable.md"), output);

  console.log(`\n\n${c.green("✓")} Roundtable → ${c.dim(".critique/roundtable.md")}`);
  console.log(`\n${c.bold("Action plan ready:")} ${outputDir}/roundtable.md`);
}

async function cmdRun(projectArg) {
  await cmdReview(projectArg);
  console.log();
  await cmdRoundtable(projectArg);
}

async function cmdSolo(roleSlug, projectArg) {
  if (!roleSlug) {
    console.log(c.red("Usage: critique solo <role> [project]"));
    console.log(`Run ${c.cyan("critique roles")} to see available roles.`);
    process.exit(1);
  }

  const projectPath = resolve(projectArg || ".");
  const outputDir = resolve(projectPath, ".critique");
  await mkdir(outputDir, { recursive: true });

  let role;
  try {
    role = await loadRole(roleSlug);
  } catch {
    console.log(c.red(`Unknown role: ${roleSlug}`));
    return;
  }

  console.log(`\n${c.bold(c.cyan("Solo Critique"))} — ${basename(projectPath)}\n`);
  console.log(c.dim("Building codebase context..."));

  const context = await buildContext(projectPath);

  console.log(`${c.blue("⟳")} ${role.emoji}  ${role.name}\n`);

  let started = false;
  const output = await runAgent(role, context, projectPath, (chunk) => {
    if (!started) started = true;
    process.stdout.write(chunk);
  });

  await writeFile(resolve(outputDir, `${role.slug}.md`), output);
  console.log(`\n\n${c.green("✓")} ${role.emoji}  ${role.name} → ${c.dim(`.critique/${role.slug}.md`)}`);
}

async function cmdStatus(projectArg) {
  const projectPath = resolve(projectArg || ".");
  const outputDir = resolve(projectPath, ".critique");
  const roles = await loadAllRoles();

  let files;
  try {
    files = await readdir(outputDir);
  } catch {
    console.log(c.dim(`No critiques yet for ${basename(projectPath)}`));
    return;
  }

  console.log(`\n${c.bold(`Critiques for ${basename(projectPath)}:`)}\n`);

  for (const role of roles) {
    const file = resolve(outputDir, `${role.slug}.md`);
    try {
      const s = await stat(file);
      const size = s.size;
      const date = s.mtime.toISOString().slice(0, 16).replace("T", " ");
      console.log(
        `  ${c.green("✓")} ${role.emoji}  ${role.name} ${c.dim(`(${size}B, ${date})`)}`
      );
    } catch {
      console.log(`  ${c.dim(`✗ ${role.emoji}  ${role.name} — not run`)}`);
    }
  }
  console.log();
}

async function cmdClean(projectArg) {
  const projectPath = resolve(projectArg || ".");
  const outputDir = resolve(projectPath, ".critique");
  try {
    await rm(outputDir, { recursive: true });
    console.log(c.green(`Cleaned critiques for ${basename(projectPath)}`));
  } catch {
    console.log(c.dim("Nothing to clean"));
  }
}

main().catch((err) => {
  console.error(c.red(err.message));
  process.exit(1);
});
