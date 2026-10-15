import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from './state.mjs';

const at = (min) => new Date(Date.UTC(2026, 9, 15, 12, min)).toISOString();
const ev = (min, event, extra = {}, session = 's1') => ({ t: at(min), session, repo: 'katiwala', event, ...extra });
const now = (min) => Date.parse(at(min));

test('walks one session from idle to ready to ship', () => {
  const events = [
    ev(0, 'SessionStart', { source: 'startup' }),
    ev(1, 'UserPromptSubmit', { task: 'Add rent reminder' }),
    ev(2, 'GatesStart', { gates: ['test', 'lint'] }),
    ev(3, 'Stop', { result: 'blocked', gate: 'test', n: 1, max: 3 }),
    ev(4, 'GatesStart', { gates: ['test', 'lint'] }),
    ev(5, 'Stop', { result: 'passed' }),
  ];
  const card = (k) => reduce(events.slice(0, k), now(6))[0];
  assert.equal(card(1).state, 'idle');
  assert.deepEqual([card(2).state, card(2).task], ['working', 'Add rent reminder']);
  assert.equal(card(3).state, 'checking');
  const blocked = card(4);
  assert.deepEqual([blocked.state, blocked.n, blocked.max], ['blocked', 1, 3]);
  assert.deepEqual(blocked.gates.map((g) => g.status), ['fail', 'pending']);
  assert.equal(card(5).state, 'checking');
  const ready = card(6);
  assert.equal(ready.state, 'ready');
  assert.deepEqual(ready.gates.map((g) => g.status), ['pass', 'pass']);
});

test('marks gates before the failing one as passed', () => {
  const [c] = reduce([
    ev(0, 'GatesStart', { gates: ['test', 'lint', 'types'] }),
    ev(1, 'Stop', { result: 'blocked', gate: 'lint', n: 2, max: 3 }),
  ], now(2));
  assert.deepEqual(c.gates.map((g) => g.status), ['pass', 'fail', 'pending']);
});

test('a released stop stays blocked and shows it gave up', () => {
  const [c] = reduce([
    ev(0, 'GatesStart', { gates: ['test'] }),
    ev(1, 'Stop', { result: 'released', gate: 'test' }),
  ], now(2));
  assert.deepEqual([c.state, c.released, c.n], ['blocked', true, 3]);
});

test('a skipped stop is done with no gates', () => {
  const [c] = reduce([ev(0, 'UserPromptSubmit', { task: 'x' }), ev(1, 'Stop', { result: 'skipped' })], now(2));
  assert.deepEqual([c.state, c.gates], ['done', []]);
});

test('a blocked gate that was never announced leaves the gate list alone', () => {
  const [c] = reduce([ev(0, 'Stop', { result: 'blocked', gate: 'relay.json', n: 1, max: 3 })], now(1));
  assert.deepEqual([c.state, c.gates], ['blocked', []]);
});

test('only prompts that wait for the user count as needs you', () => {
  assert.equal(reduce([ev(0, 'Notification', { type: 'permission_prompt', message: 'Allow Bash?' })], now(1))[0].state, 'needs_you');
  assert.equal(reduce([ev(0, 'Notification', { type: 'idle_prompt' })], now(1))[0].state, 'needs_you');
  assert.equal(reduce([ev(0, 'Notification', { type: 'auth_success' })], now(1))[0].state, 'idle');
});

test('resume keeps the task, a fresh start clears it', () => {
  const base = [ev(0, 'UserPromptSubmit', { task: 'old task' })];
  assert.equal(reduce([...base, ev(1, 'SessionStart', { source: 'resume' })], now(2))[0].task, 'old task');
  assert.equal(reduce([...base, ev(1, 'SessionStart', { source: 'startup' })], now(2))[0].task, '');
});

test('sorts the cards that need attention first, then newest', () => {
  const cards = reduce([
    ev(0, 'SessionStart', {}, 'idle'),
    ev(1, 'UserPromptSubmit', { task: 'a' }, 'work'),
    ev(2, 'Stop', { result: 'passed' }, 'done'),
    ev(3, 'Stop', { result: 'blocked', gate: 'g', n: 1, max: 3 }, 'block'),
    ev(4, 'Notification', { type: 'permission_prompt' }, 'ask'),
  ], now(5));
  assert.deepEqual(cards.map((c) => c.session), ['ask', 'block', 'done', 'work', 'idle']);
});

test('keeps sessions of one repo apart', () => {
  const cards = reduce([ev(0, 'UserPromptSubmit', { task: 'a' }, 'aaaa1111'), ev(1, 'UserPromptSubmit', { task: 'b' }, 'bbbb2222')], now(2));
  assert.deepEqual(cards.map((c) => c.tag).sort(), ['1111', '2222']);
});

test('hides a session that ended more than an hour ago', () => {
  const events = [ev(0, 'SessionStart'), ev(1, 'SessionEnd', { reason: 'other' })];
  assert.equal(reduce(events, now(30)).length, 1);
  assert.equal(reduce(events, now(90)).length, 0);
});

test('flags a working session that has gone quiet', () => {
  const events = [ev(0, 'UserPromptSubmit', { task: 'x' })];
  assert.equal(reduce(events, now(5))[0].stale, false);
  assert.equal(reduce(events, now(45))[0].stale, true);
});

test('ignores events without a session and survives empty input', () => {
  assert.deepEqual(reduce([]), []);
  assert.deepEqual(reduce([{ t: at(0), event: 'Stop' }, null]), []);
});
