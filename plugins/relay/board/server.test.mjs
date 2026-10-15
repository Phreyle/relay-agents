import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emit } from '../hooks/events.mjs';
import { start } from './server.mjs';

async function withServer(fn) {
  const data = mkdtempSync(join(tmpdir(), 'relay-board-test-'));
  const server = start({ port: 0, data });
  await once(server, 'listening');
  try {
    await fn({ data, port: server.address().port });
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    rmSync(data, { recursive: true, force: true });
  }
}

const get = (port, path, headers = {}) =>
  new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path, headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });

test('serves the page, the state and a 404', () =>
  withServer(async ({ data, port }) => {
    emit({ session: 'a', repo: 'katiwala', event: 'UserPromptSubmit', task: 'hi' }, { dir: data });
    const page = await get(port, '/');
    assert.equal(page.status, 200);
    assert.match(page.body, /Relay board/);
    assert.match(page.headers['content-security-policy'], /default-src 'none'/);
    const state = JSON.parse((await get(port, '/api/state')).body);
    assert.deepEqual([state.cards[0].repo, state.cards[0].state], ['katiwala', 'working']);
    assert.equal((await get(port, '/nope')).status, 404);
  }));

test('refuses requests for any other host name', () =>
  withServer(async ({ port }) => {
    assert.equal((await get(port, '/api/state', { host: 'evil.example' })).status, 403);
    assert.equal((await get(port, '/api/state', { host: `localhost:${port}` })).status, 200);
  }));

test('starts empty when there is no events file yet', () =>
  withServer(async ({ port }) => {
    assert.deepEqual(JSON.parse((await get(port, '/api/state')).body).cards, []);
  }));

test('pushes a changed card over the event stream', () =>
  withServer(async ({ data, port }) => {
    const seen = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no update within 5s')), 5000);
      http.get({ host: '127.0.0.1', port, path: '/events' }, (res) => {
        let buf = '';
        res.on('data', (c) => {
          buf += c;
          if (buf.includes('"state":"ready"')) {
            clearTimeout(timer);
            res.destroy();
            resolve(buf);
          }
        });
      }).on('error', () => {});
    });
    await new Promise((r) => setTimeout(r, 300));
    emit({ session: 'a', repo: 'bathala', event: 'Stop', result: 'passed' }, { dir: data });
    assert.match(await seen, /"repo":"bathala"/);
  }));
