// Shared by the hooks and the board: where events live and how one is appended.
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

const MAX_BYTES = 1024 * 1024;

// CLAUDE_PLUGIN_DATA is Claude Code's per-plugin folder; the fallback is the same folder for a manual run.
export const dataDir = () =>
  process.env.CLAUDE_PLUGIN_DATA || join(homedir(), '.claude', 'plugins', 'data', 'relay-relay-agents');
export const eventsFile = (dir = dataDir()) => join(dir, 'events.jsonl');

export function repoName(cwd) {
  const where = cwd || process.cwd();
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: where, encoding: 'utf8' });
  return basename(top.status === 0 ? top.stdout.trim() : where);
}

// Never throws and never prints: SessionStart and UserPromptSubmit stdout would land in Claude's context.
export function emit(event, { dir = dataDir() } = {}) {
  try {
    mkdirSync(dir, { recursive: true });
    const file = eventsFile(dir);
    try {
      if (statSync(file).size > MAX_BYTES) renameSync(file, join(dir, 'events.1.jsonl'));
    } catch {}
    appendFileSync(file, JSON.stringify({ t: new Date().toISOString(), ...event }) + '\n');
  } catch {}
}
