import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const runner = path.join(repoRoot, "plugins/swarm-code/scripts/opencode-runner.mjs");

function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-code-cli-"));
  const bin = path.join(dir, "bin");
  const workspace = path.join(dir, "workspace");
  fs.mkdirSync(bin);
  fs.mkdirSync(workspace);
  execFileSync("git", ["init"], { cwd: workspace, stdio: "ignore" });

  const opencode = path.join(bin, "opencode");
  fs.writeFileSync(opencode, `#!/usr/bin/env bash
set -euo pipefail
case "\${1:-}" in
  --version)
    printf 'mock-opencode-1.0\\n'
    ;;
  models)
    printf 'minimax/MiniMax-M2.7\\nopenai/gpt-5-codex\\n'
    ;;
  run)
    prompt="\${@: -1}"
    printf 'mock worker output: %s\\n' "$prompt"
    ;;
  *)
    printf 'unexpected opencode args: %s\\n' "$*" >&2
    exit 2
    ;;
esac
`, "utf8");
  fs.chmodSync(opencode, 0o755);

  const env = {
    ...process.env,
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    SWARM_CODE_DATA_DIR: path.join(dir, "state"),
    SWARM_CODE_HOST: "codex",
  };

  return { dir, workspace, env };
}

function runJson(args, fixture) {
  const stdout = execFileSync(process.execPath, [runner, ...args], {
    cwd: fixture.workspace,
    env: fixture.env,
    encoding: "utf8",
  });
  return JSON.parse(stdout);
}

function run(args, fixture) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd: fixture.workspace,
    env: fixture.env,
    encoding: "utf8",
  });
}

function readState(fixture) {
  return JSON.parse(fs.readFileSync(path.join(fixture.env.SWARM_CODE_DATA_DIR, "state.json"), "utf8"));
}

test("models returns mocked OpenCode model inventory", () => {
  const fixture = makeFixture();
  const result = runJson(["models"], fixture);

  assert.equal(result.active, "minimax/MiniMax-M2.7");
  assert.equal(result.providers.minimax, 1);
  assert.equal(result.providers.openai, 1);
});

test("init --json reports OpenCode and active model", () => {
  const fixture = makeFixture();
  const result = runJson(["init", "--json"], fixture);

  assert.equal(result.opencode, "vmock-opencode-1.0");
  assert.equal(result.activeModel, "minimax/MiniMax-M2.7");
  assert.equal(result.models, 2);
});

test("init --reconfigure refreshes the model inventory", () => {
  const fixture = makeFixture();
  fs.mkdirSync(fixture.env.SWARM_CODE_DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(fixture.env.SWARM_CODE_DATA_DIR, "state.json"),
    JSON.stringify({
      config: {
        modelPriority: ["stale/model"],
        availableModels: ["stale/model"],
        availableModelsCheckedAt: new Date().toISOString(),
      },
      jobs: [],
    }),
    "utf8"
  );

  const result = runJson(["init", "--reconfigure", "--json"], fixture);

  assert.equal(result.reconfigure, true);
  assert.deepEqual(result.detectedModels, ["minimax/MiniMax-M2.7", "openai/gpt-5-codex"]);
  assert.deepEqual(readState(fixture).config.availableModels, result.detectedModels);
});

test("init replaces the complete model priority list", () => {
  const fixture = makeFixture();
  const priority = ["openai/gpt-5-codex", "minimax/MiniMax-M2.7"];

  run(["init", "--set-model-priority", JSON.stringify(priority)], fixture);

  assert.deepEqual(readState(fixture).config.modelPriority, priority);
  assert.equal(runJson(["init", "--json"], fixture).activeModel, priority[0]);
});

test("init rejects model priorities that are not currently available", () => {
  const fixture = makeFixture();

  assert.throws(() => run(["init", "--set-model-priority", '["missing/model"]'], fixture), (error) => {
    assert.match(error.stderr, /not available/);
    return true;
  });
});

test("init accepts an empty model priority for later configuration", () => {
  const fixture = makeFixture();

  run(["init", "--set-model-priority", "[]"], fixture);

  assert.deepEqual(readState(fixture).config.modelPriority, []);
});

test("init reset clears configuration but preserves job history", () => {
  const fixture = makeFixture();
  fs.mkdirSync(fixture.env.SWARM_CODE_DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(fixture.env.SWARM_CODE_DATA_DIR, "state.json"),
    JSON.stringify({
      config: {
        modelPriority: ["openai/gpt-5-codex"],
        availableModels: ["openai/gpt-5-codex"],
        availableModelsCheckedAt: "2026-01-01T00:00:00.000Z",
        swarmProfile: { goal: "old goal", tasks: ["Code review"] },
      },
      jobs: [{ id: "job-1", status: "done" }],
    }),
    "utf8"
  );

  run(["init", "--reset"], fixture);

  const state = readState(fixture);
  assert.deepEqual(state.config.modelPriority, []);
  assert.deepEqual(state.config.availableModels, []);
  assert.equal(state.config.availableModelsCheckedAt, null);
  assert.equal(state.config.swarmProfile, undefined);
  assert.deepEqual(state.jobs, [{ id: "job-1", status: "done" }]);
});

test("ask --prompt-file --json uses mock OpenCode run", () => {
  const fixture = makeFixture();
  const promptFile = path.join(fixture.dir, "prompt.txt");
  fs.writeFileSync(promptFile, "Explain the system", "utf8");

  const result = runJson(["ask", "--host", "codex", "--prompt-file", promptFile, "--json"], fixture);

  assert.equal(result.kind, "ask");
  assert.equal(result.status, "done");
  assert.equal(result.host, "codex");
  assert.match(result.output, /mock worker output/);
  assert.match(result.output, /under Codex CLI/);
});

test("review --json runs on working tree changes", () => {
  const fixture = makeFixture();
  fs.writeFileSync(path.join(fixture.workspace, "changed.txt"), "hello\n", "utf8");

  const result = runJson(["review", "--host", "codex", "--json"], fixture);

  assert.equal(result.kind, "review");
  assert.equal(result.status, "done");
  assert.equal(result.host, "codex");
  assert.match(result.output, /mock worker output/);
});
