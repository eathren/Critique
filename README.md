# critique

A team of 10 AI agents that critique your codebase from a product, growth, and "get people to buy it" perspective. Each agent has a distinct role — product manager, designer, founder coach, etc. — and they synthesize their findings into a single prioritized action plan.

Uses your existing Claude Code subscription (Max/Pro). No API key needed.

## Install

Requires: Node.js, [Claude Code](https://claude.ai/code) VS Code extension

```bash
git clone <this-repo> ~/Projects/critique
cd ~/Projects/critique
npm i
npm link
```

That puts `critique` on your PATH.

## Usage

```bash
# Run all 10 agents against a project (parallel)
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

# List all roles
critique roles
```

## The Team

| Role                   | What they evaluate                                          |
| ---------------------- | ----------------------------------------------------------- |
| **Product Manager**    | Product-market fit, feature gaps, user journeys             |
| **User Advocate**      | First 5 minutes, onboarding friction, error messages        |
| **Growth Lead**        | Acquisition → activation → retention → referral funnel      |
| **Designer**           | Visual hierarchy, consistency, AI slop detection            |
| **Copywriter**         | Messaging, CTAs, tone, before→after rewrites                |
| **Sales Engineer**     | Demo-ability, objection handling, competitive positioning   |
| **Customer Success**   | Support burden prediction, docs gaps, retention risks       |
| **Competitor Analyst** | Market position, competitor matrix, moats & vulnerabilities |
| **Tech Reviewer**      | Performance, reliability, scaling — through a product lens  |
| **Founder Coach**      | YC office hours style — honest take, hard questions, focus  |

## How It Works

**Phase 1 — Review**: Each agent independently reads your codebase (structure, README, source files, config) and writes a critique to `.critique/<role>.md` inside your project.

**Phase 2 — Roundtable**: A moderator reads all 10 critiques, finds consensus (high-confidence issues), surfaces disagreements (with a tiebreaker), and produces a prioritized action plan ranked by impact vs effort.

The agents talk to each other through the roundtable — not directly. This avoids groupthink. Each agent forms their own opinion first, then the roundtable synthesizes.

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
└── roundtable.md        ← the synthesized action plan
```

Add `.critique/` to your `.gitignore`.

## Customizing Roles

Each role is a markdown file in `roles/`. Edit them, delete ones you don't need, or add your own. The frontmatter format:

```yaml
---
name: Your Role Name
emoji: "\U0001F4CB"
phase: critique
---
Your system prompt here...
```

Set `phase: critique` for roles that run during `review`, or `phase: roundtable` for the synthesis step.

## License

MIT
