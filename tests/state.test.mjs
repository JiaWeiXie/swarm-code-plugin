import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  getConfig,
  loadState,
  resolveLegacyStateDirs,
  resolveStateDir,
  resolveStateFile,
  resolveWorkspaceRoot,
  setConfig,
} from "../plugins/swarm-code/scripts/lib/state.mjs";

function tempWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-code-state-"));
  fs.mkdirSync(path.join(dir, ".git"));
  return dir;
}

function withEnv(patch, fn) {
  const previous = {};
  for (const key of Object.keys(patch)) {
    previous[key] = process.env[key];
    if (patch[key] == null) delete process.env[key];
    else process.env[key] = patch[key];
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("state defaults to workspace .swarm-code", () => {
  withEnv({ SWARM_CODE_DATA_DIR: null, CLAUDE_PLUGIN_DATA: null }, () => {
    const workspace = tempWorkspace();
    assert.equal(resolveWorkspaceRoot(path.join(workspace, "nested")), workspace);
    assert.equal(resolveStateDir(workspace), path.join(workspace, ".swarm-code"));
    assert.equal(resolveStateFile(workspace), path.join(workspace, ".swarm-code", "state.json"));
  });
});

test("SWARM_CODE_DATA_DIR overrides state directory", () => {
  const workspace = tempWorkspace();
  const override = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-code-data-"));

  withEnv({ SWARM_CODE_DATA_DIR: override }, () => {
    assert.equal(resolveStateDir(workspace), override);
    setConfig(workspace, { modelPriority: ["mock/model"] });
    assert.deepEqual(getConfig(workspace).modelPriority, ["mock/model"]);
    assert.ok(fs.existsSync(path.join(override, "state.json")));
  });
});

test("loadState reads legacy Claude/tmp state as migration fallback", () => {
  const workspace = tempWorkspace();
  const claudeData = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-code-claude-"));

  withEnv({ SWARM_CODE_DATA_DIR: null, CLAUDE_PLUGIN_DATA: claudeData }, () => {
    const [legacyDir] = resolveLegacyStateDirs(workspace);
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(
      path.join(legacyDir, "state.json"),
      JSON.stringify({ config: { modelPriority: ["legacy/model"] }, jobs: [{ id: "job-1" }] }),
      "utf8"
    );

    const loaded = loadState(workspace);
    assert.deepEqual(loaded.config.modelPriority, ["legacy/model"]);
    assert.equal(loaded.jobs[0].id, "job-1");

    setConfig(workspace, { modelPriority: ["new/model"] });
    assert.deepEqual(loadState(workspace).config.modelPriority, ["new/model"]);
    assert.ok(fs.existsSync(path.join(workspace, ".swarm-code", "state.json")));
  });
});
