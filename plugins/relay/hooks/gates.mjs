#!/usr/bin/env node
// relay Stop hook: run the project's gate commands before Claude may stop.
// Exit 2 = keep working (stderr goes to Claude). Exit 0 = let it stop.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MAX_BLOCKS = 3;
const TAIL_LINES = 40;

// Synchronous on purpose: callers rely on finish() never returning.
function finish(code, fd, text) {
  if (text) {
    try {
      writeSync(fd, text + '\n');
    } catch {}
  }
  process.exit(code);
}

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {}

// Start from the session's cwd, not CLAUDE_PROJECT_DIR: that variable stays stale when a
// session moves folders mid-flight. The git root also covers sessions inside a subfolder.
// shortcut: the project root is the git root, so a relay.json in a monorepo subfolder is not found.
const start = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: start, encoding: 'utf8' });
if (top.status !== 0) finish(0); // not a git repo
const dir = top.stdout.trim();
const cfgPath = join(dir, '.claude', 'relay.json');
if (!existsSync(cfgPath)) finish(0);

// Nothing changed: nothing to check.
const status = spawnSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' });
if (status.status !== 0 || !status.stdout.trim()) finish(0);

// Block counter lives in the OS temp dir so nothing is written into the repo.
const sid = String(input.session_id || 'nosession').replace(/[^\w-]/g, '_');
const stateDir = join(tmpdir(), 'relay-gates');
const stateFile = join(stateDir, `${sid}.json`);
const readBlocks = () => {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8')).blocks || 0;
  } catch {
    return 0;
  }
};
const writeBlocks = (blocks) => {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify({ blocks }));
};

function fail(name, detail) {
  const blocks = readBlocks();
  if (blocks >= MAX_BLOCKS) {
    const msg = `relay: gate "${name}" still failing after ${MAX_BLOCKS} blocked stops; letting Claude stop. Fix it before you commit.`;
    finish(0, 1, JSON.stringify({ systemMessage: msg }));
  }
  writeBlocks(blocks + 1);
  finish(2, 2, `relay gate "${name}" failed. ${detail}\nFix it, then finish again. (blocked stop ${blocks + 1}/${MAX_BLOCKS})`);
}

let cfg;
try {
  cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
} catch (e) {
  fail('relay.json', `.claude/relay.json is not valid JSON: ${e.message}`);
}

const timeoutMs = (cfg.timeoutSec || 120) * 1000;
for (const gate of Array.isArray(cfg.gates) ? cfg.gates : []) {
  if (typeof gate.cmd !== 'string') continue;
  const name = gate.name || gate.cmd;
  const run = spawnSync(gate.cmd, { cwd: dir, shell: true, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 });
  if (run.status === 0) continue;
  const why = run.error?.code === 'ETIMEDOUT' ? `Timed out after ${timeoutMs / 1000}s.` : `Exit code ${run.status}.`;
  const tail = `${run.stdout || ''}${run.stderr || ''}`.trimEnd().split(/\r?\n/).slice(-TAIL_LINES).join('\n');
  fail(name, `${why} Last ${TAIL_LINES} lines of output:\n${tail}`);
}

writeBlocks(0);
finish(0);
