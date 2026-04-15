import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";

/**
 * Ensures .critique/ is in the project's .gitignore file.
 * Creates .gitignore if it doesn't exist.
 */
export async function ensureGitignore(projectPath) {
  const gitignorePath = resolve(projectPath, ".gitignore");
  let content = "";
  try {
    content = await readFile(gitignorePath, "utf-8");
  } catch {
    // no .gitignore yet
  }

  if (content.split("\n").some((line) => line.trim() === ".critique" || line.trim() === ".critique/")) {
    return; // already covered
  }

  const newline = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  await writeFile(gitignorePath, content + newline + ".critique/\n");
}
