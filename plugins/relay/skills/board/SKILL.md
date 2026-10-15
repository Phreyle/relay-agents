---
name: board
description: Start the relay status board, a live local page with one card per Claude session, and open it.
disable-model-invocation: true
---
Start the relay status board.

1. Run this in the background with the Bash tool (`run_in_background`). If it prints that the board is already running, that is fine:
   `node "${CLAUDE_PLUGIN_ROOT}/board/server.mjs" --data "${CLAUDE_PLUGIN_DATA}"`
2. Open http://127.0.0.1:4317 in the built-in browser (`preview_start` with that URL). If there is no browser, give me the URL.
3. Tell me in one line what the card colors mean: purple needs you, amber blocked, green ready to ship, blue working or checking, gray idle or done.
