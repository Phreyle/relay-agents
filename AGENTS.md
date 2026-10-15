# relay-agents

My Claude Code playground. It holds `relay` (my own plugin: reviewer and tester agents, setup, ship and board skills, a Stop-hook quality gate, a live status board) and SuperClaude 4.3.0 (third-party, vendored, this repo only). `README.md` has the full picture and `docs/guide.html` the visual guide.

## Commands

- Self-test: `node --test "plugins/relay/**/*.test.mjs"` (Node, no dependencies). CI and the Stop gate both run it. Needs Node 21 or later for the glob (CI uses 24). Tests must pass on Ubuntu and Windows.
- Validate: `claude plugin validate .` and `claude plugin validate ./plugins/relay`. The Stop gate runs these; CI cannot.
- Board: `node plugins/relay/board/server.mjs [--port 4317] [--data <folder>]`.

## Rules

- Work on a branch, never on `main`. Open a PR. The owner merges: never merge, force-push or push `main`.
- Ask before every commit, push and PR.
- Changed anything under `plugins/relay/`? Bump `version` in `plugins/relay/.claude-plugin/plugin.json`, or installs keep the old copy.
- Hooks stay silent: stdout from `SessionStart` and `UserPromptSubmit` hooks goes into Claude's context. `emit.mjs` prints nothing.
- Keep files short. Tests sit next to the code (`events.mjs` is covered through `emit.test.mjs`).
- Put rules and facts in `AGENTS.md`. `CLAUDE.md` stays one line (`@AGENTS.md`).
- Never hard-delete the owner's files (use the Recycle Bin). Never change PATH or system settings.
- `.claude/commands/sc/` and the SuperClaude agents in `.claude/agents/` are vendored. Do not edit them. How to refresh: `THIRD_PARTY/SuperClaude-LICENSE.md`.

## Known traps

Add one line here each time something non-obvious costs you time: what happened and the fix.

- The `relay-agents` marketplace on this machine flips between GitHub and the local folder. Run `claude plugin marketplace list` before promising that an install or update picks up a branch. Installs are cached and pinned by `version`.
- relay is installed at `local` scope here. Update with `claude plugin update relay@relay-agents --scope local` from each project folder, then `/reload-plugins`.
- The terminals inside the Claude app cannot find `claude` (PATH lacks the npm folder). Run `claude plugin ...` from the agent's own shell.
- `CLAUDE_PROJECT_DIR` goes stale when a session changes folders. The gate starts from the hook's `cwd` and the git root.
- `claude plugin list` omits a relative-path plugin from a local marketplace. Use `claude plugin details relay`.
- A running board keeps the code it started with. Restart it after an update. `/relay:board` runs the board from this folder, so keep this folder on `main` once a change is merged.
- A board card needs a real event (start, prompt, notification, failure or end). A gate run by hand makes no card.
