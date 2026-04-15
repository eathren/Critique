import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ensureGitignore } from "../lib/gitignore.js";
import { mkdir, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("ensureGitignore", () => {
  let testDir;

  beforeEach(async () => {
    testDir = join(tmpdir(), `critique-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true });
  });

  it("creates .gitignore if it doesn't exist", async () => {
    await ensureGitignore(testDir);
    const content = await readFile(join(testDir, ".gitignore"), "utf-8");
    expect(content).toBe(".critique/\n");
  });

  it("appends to existing .gitignore", async () => {
    await writeFile(join(testDir, ".gitignore"), "node_modules/\n");
    await ensureGitignore(testDir);
    const content = await readFile(join(testDir, ".gitignore"), "utf-8");
    expect(content).toBe("node_modules/\n.critique/\n");
  });

  it("adds newline before appending if missing", async () => {
    await writeFile(join(testDir, ".gitignore"), "node_modules/");
    await ensureGitignore(testDir);
    const content = await readFile(join(testDir, ".gitignore"), "utf-8");
    expect(content).toBe("node_modules/\n.critique/\n");
  });

  it("does not duplicate if .critique already present", async () => {
    await writeFile(join(testDir, ".gitignore"), ".critique/\n");
    await ensureGitignore(testDir);
    const content = await readFile(join(testDir, ".gitignore"), "utf-8");
    expect(content).toBe(".critique/\n");
  });

  it("handles .critique without trailing slash", async () => {
    await writeFile(join(testDir, ".gitignore"), ".critique\n");
    await ensureGitignore(testDir);
    const content = await readFile(join(testDir, ".gitignore"), "utf-8");
    expect(content).toBe(".critique\n");
  });
});
