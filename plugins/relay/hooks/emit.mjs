#!/usr/bin/env node
// relay hook: record one status event for the board. Silent by design (see events.mjs).
import { readFileSync } from 'node:fs';
import { emit, repoName } from './events.mjs';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {}

const name = input.hook_event_name;
if (!name || !input.session_id) process.exit(0);

const event = { session: input.session_id, repo: repoName(input.cwd), cwd: input.cwd, event: name };
if (name === 'UserPromptSubmit') event.task = String(input.prompt || '').replace(/\s+/g, ' ').trim().slice(0, 60);
if (name === 'SessionStart') event.source = input.source;
if (name === 'SessionEnd') event.reason = input.reason;
if (name === 'StopFailure') event.error = input.error;
if (name === 'Notification') {
  event.type = input.notification_type;
  event.message = String(input.message || '').slice(0, 120);
}
emit(event);
