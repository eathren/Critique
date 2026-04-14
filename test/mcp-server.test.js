import { describe, it, expect } from "vitest";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVER_PATH = join(__dirname, "..", "mcp-server.js");

function sendToServer(messages) {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [SERVER_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Send all messages
    for (const msg of messages) {
      proc.stdin.write(JSON.stringify(msg) + "\n");
    }
    proc.stdin.end();

    setTimeout(() => {
      proc.kill();
      const lines = stdout.trim().split("\n").filter(Boolean);
      const responses = lines.map((line) => JSON.parse(line));
      resolve({ responses, stderr });
    }, 1000);
  });
}

describe("MCP Server", () => {
  it("initializes correctly", async () => {
    const { responses } = await sendToServer([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0" },
        },
      },
    ]);

    expect(responses[0].result.serverInfo.name).toBe("critique");
    expect(responses[0].result.serverInfo.version).toBe("1.0.0");
  });

  it("lists tools", async () => {
    const { responses } = await sendToServer([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0" },
        },
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      },
    ]);

    const toolsResponse = responses[1];
    const toolNames = toolsResponse.result.tools.map((t) => t.name);

    expect(toolNames).toContain("list_roles");
    expect(toolNames).toContain("build_context");
    expect(toolNames).toContain("save_critique");
    expect(toolNames).toContain("read_critiques");
    expect(toolNames).toContain("critique_status");
    expect(toolNames).toContain("clean_critiques");
  });

  it("calls list_roles tool", async () => {
    const { responses } = await sendToServer([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0" },
        },
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "list_roles", arguments: {} },
      },
    ]);

    const callResponse = responses[1];
    const content = JSON.parse(callResponse.result.content[0].text);

    expect(Array.isArray(content)).toBe(true);
    expect(content.some((r) => r.slug === "product-manager")).toBe(true);
  });

  it("calls build_context tool", async () => {
    const projectPath = join(__dirname, "..");
    const { responses } = await sendToServer([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0" },
        },
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "build_context", arguments: { project_path: projectPath } },
      },
    ]);

    const callResponse = responses[1];
    const context = callResponse.result.content[0].text;

    expect(context).toContain("## Project Structure");
    expect(context).toContain("## README.md");
  });
});
