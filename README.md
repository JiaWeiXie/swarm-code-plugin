# swarm-code

> Agent swarm adapter for Claude Code and Codex CLI. Claude or Codex leads; OpenCode executes delegated review, planning, and analysis work.

[![Made by ApoApps](https://img.shields.io/badge/Made%20by-Alejandro%20Apodaca%20Cordova-blue)](https://apoapps.com)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-purple)](https://claude.ai/code)
[![Codex Plugin](https://img.shields.io/badge/Codex-Plugin-black)](https://developers.openai.com/codex)
[![OpenCode Compatible](https://img.shields.io/badge/OpenCode-CLI-orange)](https://opencode.ai)

> NOT an official Anthropic, OpenAI, or OpenCode product. Community plugin by [Alejandro Apodaca Cordova](https://apoapps.com).

## What It Does

`swarm-code` lets a primary coding agent delegate focused work to OpenCode:

```text
User -> Claude Code or Codex CLI -> swarm-code runner -> OpenCode worker
                                      ^                       |
                                      |_______________________|
                                            result to host
```

The host agent stays responsible for judgment, synthesis, approvals, and final delivery. OpenCode is used for bounded worker tasks such as:

- Code review of local diffs
- Implementation planning
- Architecture or debugging analysis
- Multi-angle analytical passes

## Host Support

### Claude Code

Claude Code keeps the existing plugin layout:

```text
plugins/swarm-code/
  .claude-plugin/plugin.json
  commands/init.md
  agents/opencode-worker.md
  hooks/hooks.json
  skills/
```

Initialize from Claude Code:

```text
/swarm-code:init
```

Claude can then spawn `swarm-code:opencode-worker`, which relays work through `scripts/oc-run.sh`.

### Codex CLI

Codex CLI uses a separate Codex plugin manifest and Codex-only skills:

```text
plugins/swarm-code/
  .codex-plugin/plugin.json
  codex/skills/
    swarm-code-ask/
    swarm-code-review/
    swarm-code-plan/
    swarm-code-orchestrate/
```

The repo marketplace is checked in at:

```text
.agents/plugins/marketplace.json
```

After restarting Codex, open `/plugins`, install `swarm-code` from the repo marketplace, then use the skills explicitly:

```text
$swarm-code-ask
$swarm-code-review
$swarm-code-plan
$swarm-code-orchestrate
```

Codex custom prompts are intentionally not used because Codex now recommends skills for reusable workflows.

## Shared Runner

Both hosts use the same Node runner:

```bash
node plugins/swarm-code/scripts/opencode-runner.mjs init --json
node plugins/swarm-code/scripts/opencode-runner.mjs models
node plugins/swarm-code/scripts/opencode-runner.mjs ask --host codex --prompt-file /tmp/task.txt --json
node plugins/swarm-code/scripts/opencode-runner.mjs plan --host codex --prompt-file /tmp/task.txt --json
node plugins/swarm-code/scripts/opencode-runner.mjs execute --host codex --prompt-file /tmp/task.txt --json
node plugins/swarm-code/scripts/opencode-runner.mjs orchestrate --host codex --prompt-file /tmp/task.txt --json
node plugins/swarm-code/scripts/opencode-runner.mjs review --host codex --json
```

Supported host values:

- `--host claude`
- `--host codex`
- `--host auto`

Environment overrides:

- `SWARM_CODE_HOST`
- `SWARM_CODE_DATA_DIR`
- `SWARM_CODE_LOG_DIR`
- `SWARM_DELEGATE=0`

Runtime state is stored in the workspace `.swarm-code/` directory by default and is ignored by git. Existing Claude/tmp state is read as a migration fallback.

## Requirements

- Node.js 18 or newer
- OpenCode CLI installed and available as `opencode`
- Git repository workspace
- Claude Code for Claude-hosted use
- Codex CLI for Codex-hosted use

## Legacy Components

`opencode-bridge.sh`, tmux pane helpers, and keyword watcher scripts are legacy compatibility pieces. The current primary runtime is:

```text
opencode-runner.mjs -> lib/opencode.mjs -> opencode run
oc-run.sh -> opencode run
```

## Development Checks

```bash
node --test
find plugins/swarm-code -name '*.mjs' -print -exec node --check {} \;
find plugins/swarm-code -name '*.sh' -print -exec bash -n {} \;
```

## Disclaimer

Unofficial community plugin. Not affiliated with Anthropic, OpenAI, or OpenCode. Anthropic and Claude are trademarks of Anthropic. OpenAI and Codex are trademarks of OpenAI. OpenCode is a trademark of its respective owners.

Made by [Alejandro Apodaca Cordova](https://apoapps.com).
