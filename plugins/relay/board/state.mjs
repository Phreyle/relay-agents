// Turns the stream of hook events into one card per session. Pure, so it is easy to test.
const NEEDS_YOU = new Set(['permission_prompt', 'idle_prompt', 'agent_needs_input', 'elicitation_dialog', 'elicitation_url_dialog']);
const RANK = { needs_you: 0, blocked: 1, error: 1, ready: 2, checking: 3, working: 3, done: 4, idle: 5, ended: 6 };
// Only a real session emits these. A gate run by hand (a dry run) sends just GatesStart and Stop, so it never gets a card.
// shortcut: a session already running when relay loaded stays hidden until its next prompt or session start.
const REAL = new Set(['SessionStart', 'UserPromptSubmit', 'Notification', 'StopFailure', 'SessionEnd']);
const ATTENTION = new Set(['needs_you', 'blocked', 'error']);
const STALE_MS = 30 * 60 * 1000;
const ENDED_VISIBLE_MS = 60 * 60 * 1000;
const QUIET_HIDE_MS = 12 * 60 * 60 * 1000; // a closed window may never send SessionEnd, so quiet cards expire
const ATTENTION_HIDE_MS = 24 * 60 * 60 * 1000; // blocked, needs-you and error cards stay a day
const hideAfter = (c) => (c.state === 'ended' ? ENDED_VISIBLE_MS : ATTENTION.has(c.state) ? ATTENTION_HIDE_MS : QUIET_HIDE_MS);

function applyStop(c, e) {
  if (e.result === 'passed') {
    Object.assign(c, { state: 'ready', detail: 'All gates passed', n: 0, released: false, gates: c.gates.map((g) => ({ ...g, status: 'pass' })) });
  } else if (e.result === 'blocked' || e.result === 'released') {
    const at = c.gates.findIndex((g) => g.name === e.gate);
    const gates = at < 0 ? c.gates : c.gates.map((g, i) => ({ ...g, status: i < at ? 'pass' : i === at ? 'fail' : 'pending' }));
    const released = e.result === 'released';
    Object.assign(c, {
      state: 'blocked',
      released,
      gates,
      n: released ? c.max : e.n,
      max: e.max || c.max,
      detail: released ? `${e.gate} still failing, Claude stopped` : `${e.gate} failed, Claude is fixing`,
    });
  } else {
    Object.assign(c, { state: 'done', detail: 'Turn finished, no gates ran', released: false, gates: [] });
  }
}

export function reduce(events, now = Date.now()) {
  const cards = new Map();
  for (const e of events) {
    if (!e || !e.session) continue;
    const c = cards.get(e.session) ?? {
      session: e.session, tag: e.session.slice(-4), repo: e.repo, state: 'idle',
      task: '', detail: '', gates: [], n: 0, max: 3, released: false, last: e.t, real: false,
    };
    cards.set(e.session, c);
    c.repo = e.repo || c.repo;
    c.last = e.t;
    if (REAL.has(e.event)) c.real = true;
    switch (e.event) {
      case 'SessionStart':
        // Compaction restarts the session in the middle of a turn, so it must not reset the card.
        if (e.source === 'compact') break;
        Object.assign(c, { state: 'idle', detail: 'Session started', gates: [], n: 0, released: false });
        if (e.source !== 'resume') c.task = '';
        break;
      case 'UserPromptSubmit': {
        // Automated turns (background tasks, subagent hand-backs) arrive as <task-notification> or <agent-message> text.
        // shortcut: any prompt that starts with "<" counts as automated, so a typed one (pasted HTML) keeps the old task line; upgrade if that bites.
        const typed = e.task && !e.task.startsWith('<');
        Object.assign(c, { state: 'working', task: typed ? e.task : c.task, detail: '', gates: [], n: 0, released: false });
        break;
      }
      case 'GatesStart':
        Object.assign(c, { state: 'checking', detail: 'Running the gates', gates: (e.gates || []).map((name) => ({ name, status: 'pending' })) });
        break;
      case 'Stop':
        applyStop(c, e);
        break;
      case 'Notification':
        if (NEEDS_YOU.has(e.type)) Object.assign(c, { state: 'needs_you', detail: e.message || 'Waiting for you' });
        break;
      case 'StopFailure':
        Object.assign(c, { state: 'error', detail: e.error || 'API error' });
        break;
      case 'SessionEnd':
        Object.assign(c, { state: 'ended', detail: 'Session ended' });
        break;
    }
  }
  const visible = [...cards.values()].filter((c) => c.real && now - Date.parse(c.last) < hideAfter(c));
  for (const c of visible) c.stale = (ATTENTION.has(c.state) || c.state === 'working' || c.state === 'checking') && now - Date.parse(c.last) > STALE_MS;
  return visible.sort((a, b) => RANK[a.state] - RANK[b.state] || Date.parse(b.last) - Date.parse(a.last));
}
