#!/usr/bin/env node
// Local status board for relay: serves the page and pushes card changes over Server-Sent Events.
// Listens on 127.0.0.1 only and never writes anything.
import { createServer } from 'node:http';
import { closeSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dataDir, eventsFile } from '../hooks/events.mjs';
import { reduce } from './state.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TAIL_BYTES = 512 * 1024;
const CSP = "default-src 'none'; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'";

// Only the tail of the file matters: it holds the latest state of every live session.
function readEvents(file) {
  try {
    const size = statSync(file).size;
    const len = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(len);
    const fd = openSync(file, 'r');
    try {
      readSync(fd, buf, 0, len, size - len);
    } finally {
      closeSync(fd);
    }
    const lines = buf.toString('utf8').split('\n');
    if (size > len) lines.shift();
    return lines.filter(Boolean).flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

export function start({ port = 4317, data = dataDir() } = {}) {
  const file = eventsFile(data);
  const clients = new Set();
  const cardsJson = () => JSON.stringify(reduce(readEvents(file)));
  const snapshot = (cards) => `{"now":${Date.now()},"cards":${cards}}`;

  const server = createServer((req, res) => {
    const p = server.address().port;
    // Host check blunts DNS-rebinding: a web page cannot read the board through another hostname.
    if (req.headers.host !== `127.0.0.1:${p}` && req.headers.host !== `localhost:${p}`) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const path = req.url.split('?')[0];
    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': CSP });
      res.end(readFileSync(join(HERE, 'index.html')));
    } else if (path === '/api/state') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(snapshot(cardsJson()));
    } else if (path === '/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write(`data: ${snapshot(cardsJson())}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
    } else {
      res.writeHead(404).end('not found');
    }
  });

  // Polling the file once a second is simpler and more reliable on Windows than fs.watch.
  let last = cardsJson();
  let ticks = 0;
  const timer = setInterval(() => {
    const now = cardsJson();
    ticks++;
    if (now !== last) {
      last = now;
      for (const c of clients) c.write(`data: ${snapshot(now)}\n\n`);
    } else if (ticks % 15 === 0) {
      for (const c of clients) c.write(': keepalive\n\n');
    }
  }, 1000);
  server.on('close', () => clearInterval(timer));
  server.listen(port, '127.0.0.1');
  return server;
}

const isMain = process.argv[1] && process.platform === 'win32'
  ? import.meta.url.toLowerCase() === pathToFileURL(process.argv[1]).href.toLowerCase()
  : import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const port = Number(arg('--port') || 4317);
  const server = start({ port, data: arg('--data') || dataDir() });
  server.on('error', (e) => {
    if (e.code !== 'EADDRINUSE') throw e;
    console.log(`Board already running at http://127.0.0.1:${port}`);
    process.exit(0);
  });
  server.on('listening', () => console.log(`Relay board: http://127.0.0.1:${port}`));
}
