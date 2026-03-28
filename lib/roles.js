import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROLES_DIR = join(__dirname, "..", "roles");

export async function loadRole(slug) {
  const content = await readFile(join(ROLES_DIR, `${slug}.md`), "utf-8");

  // Parse frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { slug, name: slug, emoji: "", phase: "critique", prompt: content };

  const frontmatter = match[1];
  const prompt = match[2].trim();

  const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim() || slug;
  const emoji = frontmatter.match(/emoji:\s*"(.+)"/)?.[1]?.trim() || "";
  const phase = frontmatter.match(/phase:\s*(.+)/)?.[1]?.trim() || "critique";

  return { slug, name, emoji, phase, prompt };
}

export async function loadAllRoles() {
  const files = await readdir(ROLES_DIR);
  const roles = [];
  for (const f of files) {
    if (!f.endsWith(".md")) continue;
    const slug = f.replace(".md", "");
    roles.push(await loadRole(slug));
  }
  return roles;
}

export async function getCritiqueRoles() {
  const all = await loadAllRoles();
  return all.filter((r) => r.phase === "critique");
}
