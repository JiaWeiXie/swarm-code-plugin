---
name: swarm-code-plan
description: Use OpenCode from Codex to draft implementation plans, migration plans, or architecture plans from explicit requirements and local context.
---

# swarm-code Plan

Use this skill when the user asks for a detailed implementation plan and a delegated planning pass would improve coverage.

## Workflow

1. Inspect enough local context to make the prompt concrete.
2. Resolve the plugin root from this skill path: `codex/skills/swarm-code-plan/SKILL.md` lives three directories below the plugin root.
3. Write the planning prompt to a temporary file outside the repository.
4. Run:

```bash
node "$PLUGIN_ROOT/scripts/opencode-runner.mjs" plan --host codex --prompt-file "$PROMPT_FILE" --json
```

5. Validate the JSON `output`, remove any impossible or stale assumptions, and present a decision-complete plan.

## Constraints

- Do not mutate repository files while planning.
- Include constraints, target files, and acceptance criteria in the prompt file.
- If the user needs Codex Plan mode, keep the final answer as a plan rather than implementation.
