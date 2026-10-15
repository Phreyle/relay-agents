import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EMIT = join(dirname(fileURLToPath(import.meta.url)), 'emit.mjs');

function scenario(name, fn) {
  test(name, () => {
    const data = mkdtempSync(join(tmpdir(), 'relay-emit-data-'));
    const cwd = mkdtempSync(join(tmpdir(), 'relay-emit-cwd-'));
    try {
      fn({ data, cwd });
    } finally {
      rmSync(data, { recursive: true, force: true });
      rmSync(cwd, { recursive: true, force: true });
    }
  });
}

const run = (data, input) =>
  spawnSync(process.execPath, [EMIT], { input, encoding: 'utf8', env: { ...process.env, CLAUDE_PLUGIN_DATA: data } });
const lines = (data) => readFileSync(join(data, 'events.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

scenario('is silent and stores a tidy, shortened task', ({ data, cwd }) => {
  const prompt = '  Add   a rent\nreminder ' + 'x'.repeat(100);
  const r = run(data, JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 's1', cwd, prompt }));
  assert.deepEqual([r.status, r.stdout, r.stderr], [0, '', '']);
  const [e] = lines(data);
  assert.equal(e.task.length, 60);
  assert.match(e.task, /^Add a rent reminder x/);
  assert.deepEqual([e.event, e.session, e.repo], ['UserPromptSubmit', 's1', basename(cwd)]);
});

scenario('records the notification type and message', ({ data, cwd }) => {
  run(data, JSON.stringify({ hook_event_name: 'Notification', session_id: 's1', cwd, notification_type: 'permission_prompt', message: 'Claude needs your permission' }));
  const [e] = lines(data);
  assert.deepEqual([e.type, e.message], ['permission_prompt', 'Claude needs your permission']);
});

scenario('records source, reason and error for the other events', ({ data, cwd }) => {
  run(data, JSON.stringify({ hook_event_name: 'SessionStart', session_id: 's1', cwd, source: 'resume' }));
  run(data, JSON.stringify({ hook_event_name: 'SessionEnd', session_id: 's1', cwd, reason: 'logout' }));
  run(data, JSON.stringify({ hook_event_name: 'StopFailure', session_id: 's1', cwd, error: 'rate_limit' }));
  const [a, b, c] = lines(data);
  assert.deepEqual([a.source, b.reason, c.error], ['resume', 'logout', 'rate_limit']);
});

scenario('ignores garbage and payloads without a session', ({ data }) => {
  for (const input of ['', 'not json', '{}', JSON.stringify({ hook_event_name: 'Stop' })]) {
    const r = run(data, input);
    assert.deepEqual([r.status, r.stdout], [0, '']);
  }
  assert.equal(existsSync(join(data, 'events.jsonl')), false);
});

scenario('names the repo after the git root, even from a subfolder', ({ data, cwd }) => {
  spawnSync('git', ['init', '-q'], { cwd });
  mkdirSync(join(cwd, 'sub'));
  run(data, JSON.stringify({ hook_event_name: 'SessionStart', session_id: 's1', cwd: join(cwd, 'sub') }));
  assert.equal(lines(data)[0].repo, basename(cwd));
});

scenario('moves a file past 1 MB aside and starts a new one', ({ data, cwd }) => {
  writeFileSync(join(data, 'events.jsonl'), 'x'.repeat(1024 * 1024 + 10));
  run(data, JSON.stringify({ hook_event_name: 'SessionStart', session_id: 's1', cwd }));
  assert.equal(existsSync(join(data, 'events.1.jsonl')), true);
  assert.equal(lines(data).length, 1);
});
