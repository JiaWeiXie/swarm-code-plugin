---
name: swarm-code-orchestrate
description: Use OpenCode from Codex for multi-angle analysis by decomposing a complex task into parallel OpenCode worker passes.
---

# swarm-code Orchestrate

Use this skill for complex tasks that benefit from multiple independent analytical passes, such as security plus performance review, migration tradeoffs, or cross-checking a plan.

## Workflow

1. Gather the minimum source context needed for all worker angles.
2. Resolve the plugin root from this skill path: `codex/skills/swarm-code-orchestrate/SKILL.md` lives three directories below the plugin root.
3. Write the orchestration task to a temporary file outside the repository.
4. Run:

```bash
node "$PLUGIN_ROOT/scripts/opencode-runner.mjs" orchestrate --host codex --prompt-file "$PROMPT_FILE" --json
```

5. Read the JSON `agents` and `output`, resolve contradictions yourself, and present one synthesized answer.

## Constraints

- Use this only when independent perspectives are useful; for a single focused question, use `$swarm-code-ask`.
- Do not let OpenCode mutate files.
- Call out failed worker passes separately from validated findings.
