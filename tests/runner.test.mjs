import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildPromptPrefix,
  buildResultPayload,
  parseArgs,
  readPromptFromFlags,
  resolveHost,
} from "../plugins/swarm-code/scripts/opencode-runner.mjs";

test("parseArgs supports host and prompt-file flags", () => {
  const parsed = parseArgs([
    "node",
    "runner",
    "ask",
    "--host",
    "codex",
    "--prompt-file",
    "/tmp/prompt.txt",
    "--json",
  ]);

  assert.equal(parsed.command, "ask");
  assert.equal(parsed.flags.host, "codex");
  assert.equal(parsed.flags["prompt-file"], "/tmp/prompt.txt");
  assert.equal(parsed.flags.json, true);
});

test("resolveHost detects explicit, env, and auto hosts", () => {
  assert.equal(resolveHost({ host: "claude" }, {}), "claude");
  assert.equal(resolveHost({ host: "codex" }, {}), "codex");
  assert.equal(resolveHost({}, { SWARM_CODE_HOST: "codex" }), "codex");
  assert.equal(resolveHost({}, { CLAUDE_PLUGIN_ROOT: "/plugin" }), "claude");
  assert.equal(resolveHost({}, { CODEX_HOME: "/home/user/.codex" }), "codex");
  assert.throws(() => resolveHost({ host: "other" }, {}), /Invalid host/);
});

test("buildPromptPrefix emits host-specific context", () => {
  assert.match(buildPromptPrefix({ host: "claude" }), /inside Claude Code/);
  assert.match(buildPromptPrefix({ host: "codex" }), /under Codex CLI/);
});

test("readPromptFromFlags reads prompt files before positional args", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "swarm-code-prompt-")), "prompt.txt");
  fs.writeFileSync(file, "from file", "utf8");
  assert.equal(readPromptFromFlags({ "prompt-file": file }, ["from", "args"]), "from file");
});

test("buildResultPayload returns stable JSON result shape", () => {
  const payload = buildResultPayload("ask", {
    success: true,
    model: "mock/model",
    attempts: 1,
    fallbackUsed: false,
    output: "done",
  }, { jobId: "job-1", host: "codex" });

  assert.deepEqual(payload, {
    kind: "ask",
    status: "done",
    success: true,
    model: "mock/model",
    attempts: 1,
    fallbackUsed: false,
    output: "done",
    error: null,
    jobId: "job-1",
    host: "codex",
  });
});
