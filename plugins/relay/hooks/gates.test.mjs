// Self-test for gates.mjs. Run: node --test
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GATES = join(dirname(fileURLToPath(import.meta.url)), 'gates.mjs');
const PASS = { name: 'pass', cmd: 'exit 0' };
const FAIL = { name: 'fail', cmd: 'exit 1' };

// Events go to a temp folder, never to the real board data.
const DATA = mkdtempSync(join(tmpdir(), 'relay-test-data-'));
after(() => rmSync(DATA, { recursive: true, force: true }));
const eventsFor = (sid) => {
  try {
    return readFileSync(join(DATA, 'events.jsonl'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l))
      .filter((e) => e.session === sid);
  } catch {
    return [];
  }
};

const git = (dir, ...args) =>
  spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: dir, encoding: 'utf8' });

// Throwaway git repo. config=null means no relay.json; clean=true commits everything.
function project({ config, clean = false }) {
  const dir = mkdtempSync(join(tmpdir(), 'relay-test-'));
  git(dir, 'init', '-q');
  writeFileSync(join(dir, 'a.txt'), 'x');
  if (config) setConfig(dir, config);
  if (clean) {
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'init');
  }
  return dir;
}

function setConfig(dir, config) {
  mkdirSync(join(dir, '.claude'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'relay.json'), JSON.stringify(config));
}

// env = the CLAUDE_PROJECT_DIR the hook sees, cwd = the session's cwd from the Stop JSON.
const run = (dir, sid, { env = dir, cwd = dir } = {}) =>
  spawnSync(process.execPath, [GATES], {
    input: JSON.stringify({ session_id: sid, cwd }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: env, CLAUDE_PLUGIN_DATA: DATA },
  });

// Each test gets its own repo and session id, and cleans up after itself.
function scenario(name, fn) {
  test(name, () => {
    const sid = randomUUID();
    const dirs = [];
    const make = (opts) => dirs.push(project(opts)) && dirs.at(-1);
    try {
      fn(make, sid);
    } finally {
      dirs.forEach((d) => rmSync(d, { recursive: true, force: true }));
      rmSync(join(tmpdir(), 'relay-gates', `${sid}.json`), { force: true });
    }
  });
}

scenario('no relay.json: lets Claude stop', (make, sid) => {
  const r = run(make({}), sid);
  assert.equal(r.status, 0);
  assert.equal(r.stderr, '');
});

scenario('clean git tree: skips gates even if one would fail', (make, sid) => {
  const r = run(make({ config: { gates: [FAIL] }, clean: true }), sid);
  assert.equal(r.status, 0);
});

scenario('first failing gate blocks with its name and only the last 40 lines', (make, sid) => {
  const dir = make({ config: { gates: [FAIL] } });
  writeFileSync(join(dir, 'noisy.mjs'), "for (let i = 1; i <= 60; i++) console.log('line ' + i); process.exit(1);");
  writeFileSync(join(dir, 'ran.mjs'), "import { writeFileSync } from 'node:fs'; writeFileSync('ran.txt', 'x');");
  setConfig(dir, { gates: [{ name: 'noisy', cmd: 'node noisy.mjs' }, { name: 'later', cmd: 'node ran.mjs' }] });
  const r = run(dir, sid);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /gate "noisy" failed/);
  assert.match(r.stderr, /line 60/);
  assert.match(r.stderr, /line 21/);
  assert.doesNotMatch(r.stderr, /line 20\b/);
  assert.equal(existsSync(join(dir, 'ran.txt')), false, 'gates after the first failure must not run');
});

scenario('passing gates let Claude stop and reset the block counter', (make, sid) => {
  const dir = make({ config: { gates: [FAIL] } });
  assert.equal(run(dir, sid).status, 2);
  assert.equal(run(dir, sid).status, 2);
  setConfig(dir, { gates: [PASS] });
  assert.equal(run(dir, sid).status, 0);
  setConfig(dir, { gates: [FAIL] });
  const r = run(dir, sid);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /blocked stop 1\/3/);
});

scenario('uses the session cwd when CLAUDE_PROJECT_DIR is stale', (make, sid) => {
  const stale = make({});
  const dir = make({ config: { gates: [FAIL] } });
  assert.equal(run(dir, sid, { env: stale }).status, 2);
});

scenario('finds relay.json from a subfolder of the repo', (make, sid) => {
  const dir = make({ config: { gates: [FAIL] } });
  mkdirSync(join(dir, 'sub'));
  assert.equal(run(dir, sid, { cwd: join(dir, 'sub') }).status, 2);
});

scenario('emits GatesStart then Stop passed for the board', (make, sid) => {
  const dir = make({ config: { gates: [PASS] } });
  assert.equal(run(dir, sid).status, 0);
  const [start, stop] = eventsFor(sid);
  assert.equal(start.event, 'GatesStart');
  assert.deepEqual(start.gates, ['pass']);
  assert.equal(start.repo, basename(dir));
  assert.deepEqual([stop.event, stop.result], ['Stop', 'passed']);
});

scenario('emits Stop blocked with the failing gate and the count', (make, sid) => {
  run(make({ config: { gates: [FAIL] } }), sid);
  const stop = eventsFor(sid).at(-1);
  assert.deepEqual([stop.event, stop.result, stop.gate, stop.n, stop.max], ['Stop', 'blocked', 'fail', 1, 3]);
});

scenario('emits Stop skipped when the tree is clean and no GatesStart', (make, sid) => {
  run(make({ config: { gates: [FAIL] }, clean: true }), sid);
  assert.deepEqual(eventsFor(sid).map((e) => [e.event, e.result]), [['Stop', 'skipped']]);
});

scenario('after 3 blocked stops the 4th is allowed with a notice', (make, sid) => {
  const dir = make({ config: { gates: [FAIL] } });
  for (let i = 1; i <= 3; i++) assert.equal(run(dir, sid).status, 2);
  const r = run(dir, sid);
  assert.equal(r.status, 0);
  assert.match(JSON.parse(r.stdout).systemMessage, /still failing after 3 blocked stops/);
});
