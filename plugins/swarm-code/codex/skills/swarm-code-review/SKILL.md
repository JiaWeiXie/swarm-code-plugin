---
name: swarm-code-review
description: Use OpenCode from Codex to review local git changes for bugs, security issues, regressions, and missing tests.
---

# swarm-code Review

Use this skill when the user wants a delegated review of the current working tree, staged changes, or branch diff.

## Workflow

1. Resolve the plugin root from this skill path: `codex/skills/swarm-code-review/SKILL.md` lives three directories below the plugin root.
2. Run the review command from the repository working directory:

```bash
node "$PLUGIN_ROOT/scripts/opencode-runner.mjs" review --host codex --json
```

3. If the user names a base ref or scope, pass `--base <ref>` or `--scope auto|working-tree|branch`.
4. Read the JSON `output`, validate the highest-severity findings against the diff, and present findings first with file and line references.

## Constraints

- Keep Codex in a reviewer stance; do not implement fixes unless the user asks.
- If the working tree is clean, report the clean state.
- Do not expose raw provider errors beyond a concise failure summary.
