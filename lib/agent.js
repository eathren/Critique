import { spawn } from "child_process";
import { readdir } from "fs/promises";
import { join } from "path";

// Find the claude binary from the VS Code extension
async function findClaude() {
  const extDir = join(process.env.HOME, ".vscode", "extensions");
  let entries;
  try {
    entries = await readdir(extDir);
  } catch {
    throw new Error("Could not find VS Code extensions directory");
  }

  // Find the latest claude-code extension
  const claudeExts = entries
    .filter((e) => e.startsWith("anthropic.claude-code-"))
    .sort()
    .reverse();

  if (claudeExts.length === 0) {
    throw new Error("Claude Code VS Code extension not found");
  }

  return join(extDir, claudeExts[0], "resources", "native-binary", "claude");
}

function runClaude(prompt, onStream) {
  return new Promise(async (resolve, reject) => {
    const claudePath = await findClaude();

    const proc = spawn(claudePath, ["-p", "--output-format", "text"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let output = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      if (onStream) onStream(text);
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `claude exited with code ${code}`));
      } else {
        resolve(output);
      }
    });

    proc.on("error", (err) => reject(err));

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

export async function runAgent(role, context, projectPath, onStream) {
  const prompt = `You are reviewing a software project located at: ${projectPath}

${role.prompt}

Be specific. Reference actual files, actual code, actual copy. Don't give generic advice — give advice that could ONLY apply to THIS product.

Here is context about the project:

${context}

Now produce your critique following the output format specified in your role. Be thorough and specific.`;

  return runClaude(prompt, onStream);
}

export async function runRoundtable(critiques, onStream) {
  const critiqueText = Object.entries(critiques)
    .map(
      ([slug, content]) => `\n\n---\n## Critique from: ${slug}\n\n${content}`
    )
    .join("");

  const prompt = `You are the Roundtable Moderator. You've received critiques from an entire product team.

Your job is to synthesize their critiques into a single, prioritized action plan and surface where the team disagrees.

## How you work

1. **Find consensus**: What did multiple reviewers flag? These are your highest-confidence findings.
2. **Surface conflicts**: Where do reviewers disagree? Present both sides and give YOUR recommendation.
3. **Prioritize ruthlessly**: Rank by (a) impact on users/revenue, (b) effort to fix, (c) risk of NOT fixing.
4. **Be specific**: Every recommendation should be actionable.
5. **Credit the source**: Say which reviewer raised each finding.

## Output format

### Executive Summary
3-5 sentences. The state of this product and the single most important thing to do next.

### Consensus Findings
Things multiple reviewers independently flagged.

### Debates
Where reviewers disagreed, with your tiebreaker recommendation.

### Prioritized Action Plan
Numbered list. Each item: **What** (action), **Why** (who flagged it, impact), **Effort** (S/M/L), **Priority** (P0/P1/P2/P3).

### What NOT to Do
Things that seem tempting but would be a distraction right now.

Here are all the critiques from the team:
${critiqueText}

Synthesize these into a single, prioritized action plan.`;

  return runClaude(prompt, onStream);
}
