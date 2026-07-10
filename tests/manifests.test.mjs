import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

test("Claude and Codex plugin manifests are valid and isolated", () => {
  const claude = readJson("plugins/swarm-code/.claude-plugin/plugin.json");
  const codex = readJson("plugins/swarm-code/.codex-plugin/plugin.json");

  assert.equal(claude.name, "swarm-code");
  assert.equal(codex.name, "swarm-code");
  assert.equal(codex.skills, "./codex/skills/");
  assert.equal(claude.description.includes("Claude Code"), true);
  assert.equal(codex.description.includes("Codex CLI"), true);
});

test("marketplaces point at the swarm-code plugin", () => {
  const claudeMarketplace = readJson(".claude-plugin/marketplace.json");
  const codexMarketplace = readJson(".agents/plugins/marketplace.json");

  assert.equal(claudeMarketplace.plugins[0].source, "./plugins/swarm-code");
  assert.equal(codexMarketplace.plugins[0].source.path, "./plugins/swarm-code");
});

test("Codex skills expose the expected skill names", () => {
  const skillRoot = path.join(repoRoot, "plugins/swarm-code/codex/skills");
  const skillNames = fs.readdirSync(skillRoot).sort();

  assert.deepEqual(skillNames, [
    "swarm-code-ask",
    "swarm-code-configure",
    "swarm-code-orchestrate",
    "swarm-code-plan",
    "swarm-code-review",
  ]);

  for (const name of skillNames) {
    const body = fs.readFileSync(path.join(skillRoot, name, "SKILL.md"), "utf8");
    assert.match(body, new RegExp(`name: ${name}`));
    assert.match(body, /--host codex/);
  }

  const configure = fs.readFileSync(path.join(skillRoot, "swarm-code-configure", "SKILL.md"), "utf8");
  assert.match(configure, /--set-model-priority/);
  assert.match(configure, /--save-profile/);
});
