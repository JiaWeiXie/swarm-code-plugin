/**
 * State management for OpenCode plugin — config, jobs, model preferences.
 * Made by Alejandro Apodaca Cordova (apoapps.com)
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const STATE_VERSION = 1;
const CLAUDE_PLUGIN_DATA_ENV = "CLAUDE_PLUGIN_DATA";
const STATE_DATA_ENV = "SWARM_CODE_DATA_DIR";
const WORKSPACE_STATE_DIR = ".swarm-code";
const LEGACY_FALLBACK_STATE_ROOT = path.join(os.tmpdir(), "opencode-companion");
const STATE_FILE = "state.json";
const JOBS_DIR = "jobs";
const MAX_JOBS = 50;

function nowIso() {
  return new Date().toISOString();
}

function defaultState() {
  return {
    version: STATE_VERSION,
    config: {
      // Model priority list — first available model is used
      modelPriority: [
        "minimax/MiniMax-M2.7",
        "minimax/MiniMax-M2.5",
        "minimax/MiniMax-M2.7-highspeed",
      ],
      // Cache of last detected available models
      availableModels: [],
      availableModelsCheckedAt: null,
      // Review on stop gate
      reviewOnStop: false,
    },
    jobs: [],
  };
}

export function resolveWorkspaceRoot(cwd) {
  let dir = cwd || process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    dir = path.dirname(dir);
  }
  return cwd || process.cwd();
}

function legacyStateSlug(cwd) {
  const root = resolveWorkspaceRoot(cwd);
  let canonical = root;
  try { canonical = fs.realpathSync.native(root); } catch { /* keep root */ }

  const slug = (path.basename(root) || "workspace")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workspace";
  const hash = createHash("sha256").update(canonical).digest("hex").slice(0, 16);
  return `${slug}-${hash}`;
}

export function resolveStateDir(cwd) {
  const override = process.env[STATE_DATA_ENV];
  if (override) return path.resolve(override);
  return path.join(resolveWorkspaceRoot(cwd), WORKSPACE_STATE_DIR);
}

export function resolveLegacyStateDirs(cwd) {
  const slug = legacyStateSlug(cwd);
  const dirs = [];
  const claudeDataDir = process.env[CLAUDE_PLUGIN_DATA_ENV];
  if (claudeDataDir) {
    dirs.push(path.join(claudeDataDir, "state", slug));
  }
  dirs.push(path.join(LEGACY_FALLBACK_STATE_ROOT, slug));
  return dirs;
}

export function resolveStateFile(cwd) {
  return path.join(resolveStateDir(cwd), STATE_FILE);
}

export function resolveJobsDir(cwd) {
  return path.join(resolveStateDir(cwd), JOBS_DIR);
}

export function ensureStateDir(cwd) {
  fs.mkdirSync(resolveJobsDir(cwd), { recursive: true });
}

function readStateFile(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      ...defaultState(),
      ...parsed,
      config: { ...defaultState().config, ...(parsed.config ?? {}) },
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    };
  } catch {
    return null;
  }
}

export function loadState(cwd) {
  const file = resolveStateFile(cwd);
  if (fs.existsSync(file)) return readStateFile(file) ?? defaultState();

  for (const dir of resolveLegacyStateDirs(cwd)) {
    const legacyFile = path.join(dir, STATE_FILE);
    if (!fs.existsSync(legacyFile)) continue;
    const state = readStateFile(legacyFile);
    if (state) return state;
  }

  return defaultState();
}

export function saveState(cwd, state) {
  ensureStateDir(cwd);
  fs.writeFileSync(resolveStateFile(cwd), JSON.stringify(state, null, 2), "utf8");
}

function pruneJobs(jobs) {
  if (jobs.length <= MAX_JOBS) return jobs;
  const sorted = [...jobs].sort((a, b) =>
    String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))
  );
  return sorted.slice(0, MAX_JOBS);
}

export function upsertJob(cwd, job) {
  const state = loadState(cwd);
  const idx = state.jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) {
    state.jobs[idx] = { ...state.jobs[idx], ...job, updatedAt: nowIso() };
  } else {
    state.jobs.push({ ...job, createdAt: nowIso(), updatedAt: nowIso() });
  }
  state.jobs = pruneJobs(state.jobs);
  saveState(cwd, state);
}

export function listJobs(cwd) {
  return loadState(cwd).jobs;
}

export function getConfig(cwd) {
  return loadState(cwd).config;
}

export function setConfig(cwd, patch) {
  const state = loadState(cwd);
  state.config = { ...state.config, ...patch };
  saveState(cwd, state);
}

export function clearConfiguration(cwd) {
  const state = loadState(cwd);
  state.config = {
    ...state.config,
    modelPriority: [],
    availableModels: [],
    availableModelsCheckedAt: null,
  };
  delete state.config.swarmProfile;
  saveState(cwd, state);
}

export function generateJobId() {
  return crypto.randomUUID();
}

export function writeJobFile(cwd, jobId, filename, content) {
  const dir = path.join(resolveJobsDir(cwd), jobId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

export function readJobFile(cwd, jobId, filename) {
  const filePath = path.join(resolveJobsDir(cwd), jobId, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}
