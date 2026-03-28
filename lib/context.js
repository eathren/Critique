import { readdir, readFile, stat } from "fs/promises";
import { join, relative } from "path";

const IGNORE = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  ".critique",
  "target",
  "__pycache__",
  ".venv",
  "vendor",
  ".nuxt",
  ".output",
  ".turbo",
  ".cache",
]);

const IGNORE_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "bun.lock",
  "pnpm-lock.yaml",
]);

async function walkTree(dir, base, depth = 0) {
  if (depth > 6) return [];
  const entries = [];
  let items;
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const item of items) {
    if (IGNORE.has(item.name) || item.name.startsWith(".")) continue;
    if (IGNORE_FILES.has(item.name)) continue;
    const rel = relative(base, join(dir, item.name));
    entries.push(rel);
    if (item.isDirectory() && entries.length < 300) {
      entries.push(...(await walkTree(join(dir, item.name), base, depth + 1)));
    }
    if (entries.length >= 300) break;
  }
  return entries;
}

async function safeRead(path, maxLines = 200) {
  try {
    const content = await readFile(path, "utf-8");
    return content.split("\n").slice(0, maxLines).join("\n");
  } catch {
    return null;
  }
}

export async function buildContext(projectPath) {
  const parts = [];

  // Tree
  const tree = await walkTree(projectPath, projectPath);
  parts.push(`## Project Structure\n\`\`\`\n${tree.join("\n")}\n\`\`\``);

  // README
  for (const name of ["README.md", "README.rst", "README.txt", "README"]) {
    const content = await safeRead(join(projectPath, name));
    if (content) {
      parts.push(`## ${name}\n\`\`\`\n${content}\n\`\`\``);
      break;
    }
  }

  // Project metadata
  for (const name of [
    "package.json",
    "Cargo.toml",
    "pyproject.toml",
    "go.mod",
    "setup.py",
  ]) {
    const content = await safeRead(join(projectPath, name), 80);
    if (content) {
      parts.push(`## ${name}\n\`\`\`\n${content}\n\`\`\``);
    }
  }

  // Try to grab a few key source files to give real substance
  const sourceFiles = await findKeyFiles(projectPath);
  for (const file of sourceFiles.slice(0, 10)) {
    const content = await safeRead(join(projectPath, file), 150);
    if (content) {
      parts.push(`## ${file}\n\`\`\`\n${content}\n\`\`\``);
    }
  }

  return parts.join("\n\n");
}

async function findKeyFiles(projectPath) {
  const tree = await walkTree(projectPath, projectPath);
  const priority = [];
  const rest = [];

  for (const f of tree) {
    // Prioritize entry points, configs, main files
    if (
      /^(src\/)?(index|main|app|server|routes)\.(ts|js|tsx|jsx|py|go|rs)$/.test(f) ||
      /\.(html|svelte|vue)$/.test(f) ||
      /(config|\.env\.example)/.test(f)
    ) {
      priority.push(f);
    } else if (/\.(ts|js|tsx|jsx|py|go|rs|rb)$/.test(f) && !f.includes("test") && !f.includes("spec")) {
      rest.push(f);
    }
  }

  return [...priority, ...rest];
}
