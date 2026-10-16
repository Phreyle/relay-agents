# relay-agents

My Claude Code playground. It holds `relay` (my own plugin: reviewer, security-reviewer and tester agents, setup, plan, verify, ship and board skills, a Stop-hook quality gate, a live status board) and SuperClaude 4.3.0 (third-party, vendored, this repo only). `README.md` has the full picture and `docs/guide.html` the visual guide.

## Commands

- Self-test: `node --test "plugins/relay/**/*.test.mjs"` (Node, no dependencies). CI and the Stop gate both run it. Needs Node 21 or later for the glob (CI uses 24). Tests must pass on Ubuntu and Windows.
- Validate: `claude plugin validate .` and `claude plugin validate ./plugins/relay`. The Stop gate runs these; CI cannot.
- Board: `node plugins/relay/board/server.mjs [--port 4317] [--data <folder>]`.

## Rules

- Work on a branch, never on `main`. Open a PR. The owner merges: never merge, force-push or push `main`.
- Ask before every commit, push and PR.
- More than one PR of work? Ask me to run `/relay:plan` first (agents cannot run it). It writes `docs/plans/<slug>-<date>.md`, and `/relay:ship` ticks its boxes. The roadmap is `docs/plans/relay-upgrades-2026-10-15.md`.
- To see a change work for real, ask me to run `/relay:verify` (agents cannot run it directly; `/relay:ship` follows it for you). This repo's recipe is `.claude/verify.md`: the board on port 4398 with a temp data folder.
- Changed anything under `plugins/relay/`? Bump `version` in `plugins/relay/.claude-plugin/plugin.json`, or installs keep the old copy.
- Hooks stay silent: stdout from `SessionStart` and `UserPromptSubmit` hooks goes into Claude's context. `emit.mjs` prints nothing.
- Keep files short. Tests sit next to the code (`events.mjs` is covered through `emit.test.mjs`).
- Put rules and facts in `AGENTS.md`. `CLAUDE.md` stays one line (`@AGENTS.md`).
- Never hard-delete the owner's files (use the Recycle Bin). Never change PATH or system settings.
- `.claude/commands/sc/` and the SuperClaude agents in `.claude/agents/` are vendored. Do not edit them. How to refresh: `THIRD_PARTY/SuperClaude-LICENSE.md`.

### Token budget

- One session per task or PR.
- After an auto-compact, or at about 150k tokens of context, say so and suggest a fresh session. State lives in `AGENTS.md`, memory and `docs/plans`.
- No cold-read test rounds, paper walk-throughs or second review passes unless I ask: one `relay:reviewer` plus `relay:security-reviewer` pass per PR, plus the one re-run `/relay:ship` does after a fix.
- Subagents: use the narrow-tool `relay:*` agents, and model `haiku` for mechanical jobs. Never `general-purpose`, except for a skill test I ask for.
- Browser only when the change touches UI, or when I run `/relay:verify` or `/relay:ship`.
- When I ask about usage, call `get_usage`.
- On a 200k window, remove `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` from `.claude/settings.json`: 15% is 30k, below the 75k a session starts with, so it would compact every turn.

## Known traps

Add one line here each time something non-obvious costs you time: what happened and the fix.

- The `relay-agents` marketplace on this machine flips between GitHub and the local folder. Run `claude plugin marketplace list` before promising that an install or update picks up a branch. Installs are cached and pinned by `version`.
- relay is installed at `local` scope here. Update with `claude plugin update relay@relay-agents --scope local` from each project folder, then `/reload-plugins`.
- The terminals inside the Claude app cannot find `claude` (PATH lacks the npm folder). Run `claude plugin ...` from the agent's own shell.
- `CLAUDE_PROJECT_DIR` goes stale when a session changes folders. The gate starts from the hook's `cwd` and the git root.
- `claude plugin list` omits a relative-path plugin from a local marketplace. Use `claude plugin details relay`.
- A running board keeps the code it started with. `/relay:board` runs it from the installed plugin copy (`${CLAUDE_PLUGIN_ROOT}`), so run `claude plugin update` first, then restart the board.
- A skill with `disable-model-invocation` cannot be run by the agent. Test its text by having a fresh subagent follow it step by step in scratch folders under the session scratchpad, then send the folders to the Recycle Bin.
- The Browser pane can be closed, and then `tabs_create` fails: open it with `preview_start` and a `url`. On Windows, TaskStop on an app started through `npm` can leave its `node` child listening: check the port and stop that PID.
- `$ARGUMENTS` in a skill body is replaced by what I typed after the command. Write it once, where the argument goes, and say "the argument" elsewhere (`/relay:ship` step 4 once had a second one).
- A board card needs a real event (start, prompt, notification, failure or end). A gate run by hand makes no card.
- `get_usage` prints `autoCompactsAtPercent` 97 even when the lean-mode override is live. The real check is `compact_boundary` `preTokens` in the transcripts under `~/.claude/projects/`.
