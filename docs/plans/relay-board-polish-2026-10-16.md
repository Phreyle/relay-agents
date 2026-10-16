# Relay board polish

Status: in progress
Opened: 2026-10-16

## Your words

> make the relay board look better

## Goal

Make the relay board page easier to read at a glance and nicer to look at, without changing what it shows or how it works.

## Phases

- [x] **Phase 1: Cards you can scan.** In `plugins/relay/board/index.html`: give each card a status stripe, make "needs you", "blocked" and "error" cards clearly louder than "idle", "ended" and "turn finished", make the task line the card's main text, show each gate as a chip with a check or cross (not colour alone), and tidy the spacing. Bump `version` in `plugins/relay/.claude-plugin/plugin.json`. Done when: the Stop gate passes (self-test and both `claude plugin validate` runs), `/relay:verify` ends PASS, and a screenshot of a seeded board (the 9 states, plus a "Still failing" card and a "(quiet)" card; light and dark) shows each state with its own stripe and label.
- [ ] **Phase 2: Header, summary, guide, empty state, new picture.** Same file: give the title, the live dot, the summary counts, the guide panel and the empty-board message the same look as the cards, and make the page fit a 375 px phone without sideways scrolling. If any page text that the recipe in `.claude/verify.md` expects changes, update the recipe in the same PR. Replace `docs/board.jpg` with a shot of a seeded board and bump `version`. Done when: the Stop gate passes, `/relay:verify` ends PASS, `document.documentElement.scrollWidth <= window.innerWidth` is true at 375 px wide in the Browser pane, and `docs/board.jpg` shows the new look.

## Assumptions

- "Look better" means polish of the page only: same cards, labels, states and sort order. `state.mjs` and `server.mjs` stay as they are.
- The style stays calm and flat, in the current palette and system font: clearer and tidier, not a redesign.
- Hard limits stay: one file, no libraries, no build step, no external fonts or images (the page's CSP allows only inline script and style), card text set with `textContent`, light and dark follow the OS, and `id="guide"` stays (`server.test.mjs` checks it).
- Each phase is its own PR and the owner merges it, as in the roadmap. Each touches `plugins/relay/`, so each bumps `version`.
- Demo data is hand-written event lines in a temp data folder, on port 4398 (never 4317 or the real data folder). Each session seeds it again; the line shape is in `.claude/verify.md` step 3 and `state.test.mjs`. Nothing for it is committed.
- Screenshots come from the Browser pane at about 1280 px wide (desktop) and 375 px wide (phone), in light and dark.
- Left out: animation, a favicon, a light/dark toggle, sort or filter controls, and the look of `docs/guide.html`.

## Log

- 2026-10-16: Plan written.
- 2026-10-16: Phase 1 done (cards restyled, relay 0.6.1, /relay:verify passed, seeded-board screenshots in light and dark).
