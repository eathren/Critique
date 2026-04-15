# critique

A team of AI agents that critique your codebase from a product, growth, and "get people to buy it" perspective. Each agent has a distinct role — product manager, designer, founder coach, etc. — and they synthesize their findings into a single prioritized action plan.

## What It Does

- **Multi-perspective analysis**: 16 specialized AI personas review your code, each with different expertise (product, growth, design, security, DevOps, etc.)
- **Actionable output**: Each agent produces a structured critique saved to `.critique/<role>.md`
- **Synthesis**: A "roundtable" step reads all critiques and produces a prioritized action plan with consensus findings and debates
- **Two interfaces**: Use as a CLI tool or as an MCP server for integration with Claude Code, Claude Desktop, or other MCP clients

## What It Doesn't Do

- **Run tests or lint your code** — it reads and analyzes, it doesn't execute
- **Make changes** — it produces recommendations, not patches
- **Access external services** — it only reads your local codebase (no GitHub API, no analytics, no production metrics)
- **Remember across runs** — each critique is independent; re-running overwrites previous output
- **Provide real-time feedback** — it's a batch analysis, not a code review bot

## Install

### Prerequisites

- Node.js 18+
- [Claude Code](https://claude.ai/code) installed via one of:
  - VS Code extension
  - npm: `npm install -g @anthropic-ai/claude-code`
  - Homebrew: `brew install claude-code`

### Setup

```bash
git clone https://github.com/yourusername/critique ~/Projects/critique
cd ~/Projects/critique
npm install
npm link   # Makes 'critique' available globally
```

## CLI Usage

```bash
# Run all agents against a project (sequential)
critique review ~/Projects/myapp

# Synthesize all critiques into a prioritized action plan
critique roundtable ~/Projects/myapp

# Both phases in one shot
critique run ~/Projects/myapp

# Run a single agent
critique solo founder-coach ~/Projects/myapp

# See what's been run
critique status ~/Projects/myapp

# Start fresh
critique clean ~/Projects/myapp

# List all available roles
critique roles
```

## MCP Server Setup

The critique tool can also run as an MCP (Model Context Protocol) server, allowing Claude Code or Claude Desktop to invoke critique tools directly.

### Register with Claude Code

Add to your Claude Code settings (`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "critique": {
      "command": "node",
      "args": ["/absolute/path/to/critique/mcp-server.js"]
    }
  }
}
```

### Register with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "critique": {
      "command": "node",
      "args": ["/absolute/path/to/critique/mcp-server.js"]
    }
  }
}
```

### Available MCP Tools

Once registered, these tools become available:

| Tool | Description |
|------|-------------|
| `list_roles` | List all available critique roles and their prompts |
| `build_context` | Build a structured project context (tree, README, source files) |
| `save_critique` | Save a critique to the project's `.critique/` directory |
| `read_critiques` | Read all existing critiques for roundtable synthesis |
| `critique_status` | Show which critiques exist and their metadata |
| `clean_critiques` | Remove all critique output for a project |

## The Team

### Product & Business

| Role | What they evaluate |
|------|-------------------|
| **Product Manager** | Product-market fit, feature gaps, user journeys |
| **User Advocate** | First 5 minutes, onboarding friction, error messages |
| **Growth Lead** | Acquisition → activation → retention → referral funnel |
| **Sales Engineer** | Demo-ability, objection handling, competitive positioning |
| **Customer Success** | Support burden prediction, docs gaps, retention risks |
| **Competitor Analyst** | Market position, competitor matrix, moats & vulnerabilities |
| **Founder Coach** | YC office hours style — honest take, hard questions, focus |

### Design & Copy

| Role | What they evaluate |
|------|-------------------|
| **Designer** | Visual hierarchy, consistency, AI slop detection |
| **Copywriter** | Messaging, CTAs, tone, before→after rewrites |
| **Accessibility Auditor** | WCAG compliance, screen reader support, keyboard navigation |

### Technical

| Role | What they evaluate |
|------|-------------------|
| **Tech Reviewer** | Performance, reliability, scaling — through a product lens |
| **Software Engineer** | Code quality, architecture, maintainability, testing |
| **Performance Engineer** | Speed, efficiency, bottlenecks, scaling concerns |
| **DevOps Engineer** | CI/CD, deployment, monitoring, operational readiness |
| **Cybersecurity Auditor** | Vulnerabilities, auth, injection flaws, dependency risks |
| **Privacy Officer** | Data collection, GDPR/CCPA compliance, third-party sharing |

## How It Works

**Phase 1 — Review**: Each agent independently reads your codebase (structure, README, source files, config) and writes a critique to `.critique/<role>.md` inside your project.

**Phase 2 — Roundtable**: A moderator reads all critiques, finds consensus (high-confidence issues), surfaces disagreements (with a tiebreaker), and produces a prioritized action plan ranked by impact vs effort.

The agents talk to each other through the roundtable — not directly. This avoids groupthink. Each agent forms their own opinion first, then the roundtable synthesizes.

### Why Sequential?

Agents run one at a time, not in parallel. This is intentional:

- **Token efficiency**: Each agent gets a fresh context window. Running 16 agents in parallel would require 16 concurrent Claude sessions, each consuming tokens independently.
- **Cost control**: Sequential runs let you stop early if you've seen enough, or run just the roles you care about with `critique solo`.
- **Reliability**: Parallel runs risk rate limits or timeouts. Sequential is slower but predictable.
- **Streaming output**: You see each agent's critique as it's written, so you can read while waiting.

A full review takes 10-20 minutes depending on codebase size. Use `critique solo <role>` to run individual agents in ~1 minute each.

## Output

All output goes to `<your-project>/.critique/`:

```
.critique/
├── product-manager.md
├── user-advocate.md
├── growth-lead.md
├── designer.md
├── copywriter.md
├── sales-engineer.md
├── customer-success.md
├── competitor-analyst.md
├── tech-reviewer.md
├── founder-coach.md
├── software-engineer.md
├── cybersecurity.md
├── ...
└── roundtable.md        ← the synthesized action plan
```

The tool automatically adds `.critique/` to your `.gitignore`.

## Customizing Roles

Each role is a markdown file in `roles/`. Edit them, delete ones you don't need, or add your own.

### Frontmatter format

```yaml
---
name: Your Role Name
emoji: "\U0001F4CB"
phase: critique
---
Your system prompt here...
```

- `name`: Display name for the role
- `emoji`: Unicode emoji (use `\U` escape format)
- `phase`: Either `critique` (runs during review) or `roundtable` (runs during synthesis)

### Creating a new role

1. Create `roles/my-new-role.md` with frontmatter
2. Write the system prompt defining what the role evaluates and how to format output
3. Run `critique roles` to verify it appears
4. Run `critique solo my-new-role ~/Projects/myapp` to test

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## License

MIT
