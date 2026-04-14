import { describe, it, expect } from "vitest";
import { buildContext } from "../lib/context.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");

describe("buildContext", () => {
  it("builds context for a project", async () => {
    const context = await buildContext(PROJECT_ROOT);
    expect(context).toContain("## Project Structure");
    expect(context).toContain("## README.md");
    expect(context).toContain("## package.json");
  });

  it("includes source files", async () => {
    const context = await buildContext(PROJECT_ROOT);
    // Should include some source files
    expect(context).toContain("mcp-server.js");
  });

  it("excludes node_modules and .git", async () => {
    const context = await buildContext(PROJECT_ROOT);
    expect(context).not.toContain("node_modules/");
    expect(context).not.toContain(".git/");
  });

  it("handles non-existent path gracefully", async () => {
    const context = await buildContext("/nonexistent/path/12345");
    // Should return something, not crash
    expect(context).toContain("## Project Structure");
  });
});
