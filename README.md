# relay-agents

A playground for learning AI engineering with Claude Code. It holds two things that run side by side, enabled for this repo only:

- **relay**: my own Claude Code plugin (two agents, two skills, one Stop-hook quality gate).
- **SuperClaude** v4.3.0: a third-party command and agent framework, installed at project scope: 30 `/sc:*` commands in `.claude/commands/sc/` and 20 agents in `.claude/agents/`. It has no Claude Code plugin yet, and its official installer writes to global `~/.claude`, so it is installed by script instead. See `THIRD_PARTY/SuperClaude-LICENSE.md` for its license, the script and how to refresh it.

## How the pieces fit

```
.claude-plugin/marketplace.json   the catalog: "relay-agents" lists the plugin "relay"
plugins/relay/                    the plugin itself
  .claude-plugin/plugin.json      name, version, license
  agents/reviewer.md              read-only reviewer
  agents/tester.md                writes tests in the project's own style
  skills/setup-project/SKILL.md   /relay:setup-project
  skills/ship/SKILL.md            /relay:ship
  hooks/hooks.json                registers the Stop hook
  hooks/gates.mjs                 the quality gate (Node, no dependencies)
  hooks/gates.test.mjs            self-test for the gate
.claude/                          this repo's own config (relay.json, settings.json)
.claude/commands/sc/, agents/     SuperClaude (third-party, see THIRD_PARTY/)
```

- **Marketplace**: a catalog file that tells Claude Code where plugins live, so other repos can install relay by name.
- **Plugin**: a folder of agents, skills and hooks that Claude Code loads as one unit. Its commands are prefixed with the plugin name, for example `/relay:ship`.
- **Agent** (subagent): a specialist Claude can hand a job to, with its own tool allowlist. `reviewer` only has Read, Grep and Glob, so it cannot edit anything. `tester` can edit and run, but its instructions limit it to test files.
- **Skill**: a reusable instruction file that runs when you type its command. Both relay skills set `disable-model-invocation`, so they are never loaded unless you call them.
- **Hook**: a script Claude Code runs at a lifecycle event. relay uses the `Stop` event, which fires each time Claude says it is done.

## The quality gate (Stop hook)

`hooks/gates.mjs` reads `.claude/relay.json` in the project and decides whether Claude may stop:

1. No `.claude/relay.json`: allow the stop.
2. Not a git repo, or `git status` shows no changes: allow the stop.
3. Otherwise run each gate command in order. At the first failure, print the gate name and the last 40 lines of its output to stderr and exit 2. Exit 2 tells Claude Code to keep going, so Claude sees the failure and fixes it.
4. After 3 blocked stops in a row, the 4th stop is allowed with a notice that the gate is still failing. A passing run resets the count. The counter lives in the OS temp folder, never in your repo.

`.claude/relay.json`:

```json
{
  "gates": [{ "name": "test", "cmd": "npm test" }],
  "slow": [{ "name": "build", "cmd": "npm run build" }],
  "timeoutSec": 120
}
```

`gates` run at every stop and must be fast. `slow` is for builds and smoke tests; only `/relay:ship` runs them.

Self-test: `node --test "plugins/relay/hooks/*.test.mjs"`.

## Skills

- `/relay:setup-project`: run once in a new repo. Detects the stack, tries each check and keeps only those that pass today and need no running server, writes `.claude/relay.json`, writes a short `CLAUDE.md` if none exists, and adds deny rules for deploy, publish and remote-database scripts. It shows everything before writing.
- `/relay:ship [task]`: runs the gate and the slow checks, sends the diff to the reviewer agent, then asks before commit, push and PR. It refuses to work on `main`.

## Install relay in another repo

From the other repo's folder:

```bash
claude plugin marketplace add Phreyle/relay-agents --scope project
claude plugin install relay@relay-agents --scope project
```

Then start Claude Code and run `/relay:setup-project`. Commit that repo's `.claude/settings.json` so collaborators get the same setup (each collaborator runs the install command once). This repo is private, so it works wherever your git login works.

## Update relay

`plugin.json` pins `version`, so users only get a new copy when that string changes. After pushing a change:

1. Bump `version` in `plugins/relay/.claude-plugin/plugin.json`.
2. In the repo that uses relay: `claude plugin marketplace update relay-agents`, then `claude plugin update relay@relay-agents`.
3. In a running session, `/reload-plugins`.

Inside this repo, relay loads straight from `plugins/relay/`, so edits apply at the next session start or `/reload-plugins`.

## What it costs in context

Everything Claude loads every turn costs tokens. Measured with `/context` on 2026-10-14:

- **relay: 79 tokens per turn.** The `reviewer` and `tester` agent descriptions cost 44 and 35. Neither skill appears in the Skills list (they set `disable-model-invocation`), so they cost nothing until you run them. The hook costs nothing unless it blocks. `claude plugin details relay` prints a static estimate of about 123 tokens that counts the skills, so it overstates.
- **SuperClaude: about 0.9k tokens per turn.** Custom agents went from 1.1k to 2.0k for its 20 agents (about 45 each). The Skills line stayed at 9.8k, so its 30 commands showed no measurable cost there. These figures compare two sessions and are rounded to 0.1k.

## License

MIT. See `LICENSE`.
