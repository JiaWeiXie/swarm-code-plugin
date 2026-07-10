---
name: swarm-code-configure
description: Configure or reconfigure the shared swarm-code OpenCode model priority and project task profile for the current workspace.
---

# swarm-code Configure

Use this skill when the user wants to set up or change swarm-code's OpenCode models, fallback order, project context, directory scope, or delegated task types.

## Workflow

1. Resolve the plugin root from this skill path: `codex/skills/swarm-code-configure/SKILL.md` lives three directories below the plugin root.
2. Run the status command from the target workspace:

```bash
node "$PLUGIN_ROOT/scripts/opencode-runner.mjs" init --host codex --reconfigure --json
```

3. Show the current primary model, fallbacks, goal, directories, and task types. Explain that the new choices replace those settings but preserve job history.
4. Use `detectedModels` from the JSON to ask for one primary model, then optional fallback models in the requested order. The user may choose to configure a model later.
5. Replace the entire model priority in one call. Use an empty JSON array if the user chose to configure later:

```bash
node "$PLUGIN_ROOT/scripts/opencode-runner.mjs" init --host codex --set-model-priority '<JSON array of primary followed by fallbacks>' --json
```

6. Ask for the project goal, directories in scope, and delegated task types. Save a replacement profile:

```bash
node "$PLUGIN_ROOT/scripts/opencode-runner.mjs" init --host codex --save-profile '<JSON profile with goal, dirs, tasks, configuredAt>'
```

7. Run `init --host codex --json` and report the resulting primary model, fallback order, and delegated task types.

## Constraints

- Keep all configuration project-scoped in `.swarm-code/state.json`.
- Do not edit repository files.
- Validate user-selected model IDs against `detectedModels`; do not invent model names.
