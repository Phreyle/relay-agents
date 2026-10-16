# Verify relay-agents

Kind: web app (the relay board, a local page)
Port: 4398
Launch: `node plugins/relay/board/server.mjs --port 4398 --data <a new empty temp folder>` (background). Ready when: `http://127.0.0.1:4398/api/state` answers 200 within 10 seconds.
Drive:
1. Open `http://127.0.0.1:4398/`. Expect: the title "Relay board", the status dot says "live" within 5 seconds, the text "No sessions yet", and the Guide panel open with six steps.
2. Click "Hide guide". Expect: the panel is hidden and the button says "Guide". Click it again. Expect: the panel shows.
3. With the Bash tool, append this line to `events.jsonl` in the temp folder, with the current UTC time in `t` (`printf '...\n' >> events.jsonl`; PowerShell 5 would write UTF-16): `{"t":"<now>","session":"verify-1","repo":"demo","event":"UserPromptSubmit","task":"Try the board"}`. Expect: within 5 seconds a card "demo" shows "Working" and the task "Try the board".
Pass when: every Expect is met, console errors 0, failed requests 0, app log errors 0 (a 404 for `/favicon.ico` is expected).
Never: use port 4317 or the real data folder (`~/.claude/plugins/data/relay-relay-agents`).
Missing: the real hooks writing events, the "needs you" card, phone width.
