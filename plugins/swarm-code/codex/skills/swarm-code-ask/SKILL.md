---
name: swarm-code-ask
description: Use OpenCode from Codex for focused codebase questions, explanations, and analysis when the answer benefits from a delegated worker.
---

# swarm-code Ask

Use this skill when a Codex task asks for focused analysis, explanation, or Q&A that OpenCode can answer from provided context.

## Workflow

1. Gather only the repository context needed for the question.
2. Resolve the plugin root from this skill path: `codex/skills/swarm-code-ask/SKILL.md` lives three directories below the plugin root.
3. Write the worker prompt to a temporary file outside the repository.
4. Run:

```bash
node "$PLUGIN_ROOT/scripts/opencode-runner.mjs" ask --host codex --prompt-file "$PROMPT_FILE" --json
```

5. Read the JSON `output`, validate it against the source context, and present the final answer in your normal Codex voice.

## Constraints

- Do not ask OpenCode to edit files.
- Include relevant code, diffs, logs, and constraints in the prompt file.
- If OpenCode fails or returns low-confidence output, say so and answer directly from inspected context.
