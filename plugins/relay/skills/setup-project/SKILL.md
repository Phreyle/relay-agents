---
name: setup-project
description: One-time setup of relay in a repo. Detects the stack, writes .claude/relay.json gates, an AGENTS.md brief with a one-line CLAUDE.md that imports it, and deny rules for deploy scripts.
disable-model-invocation: true
---
Set up relay in this repo. Show everything before writing anything.

1. **Detect the stack.** Read `package.json` (scripts, lockfile), `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `Makefile`. List the test, lint, typecheck, build and smoke commands you find.
2. **Try each candidate once** from the repo root. Keep a command only if it exits 0 today and needs no running server, database or network. Skip the rest and say why in one line each: failed today, needs a server, too slow, not found.
   - `gates` run at every stop, so they must be fast (about 60s together): lint, typecheck, unit tests.
   - `slow` runs only in `/relay:ship`: build, smoke and end-to-end tests, even when they pass.
3. **Draft `.claude/relay.json`:**
   `{"gates":[{"name":"test","cmd":"npm test"}],"slow":[{"name":"build","cmd":"npm run build"}],"timeoutSec":120}`
4. **AGENTS.md and CLAUDE.md.** The brief lives in `AGENTS.md`, which other coding agents read too. `CLAUDE.md` only imports it, so Claude loads it in every session. "`CLAUDE.md` exists" below also counts `.claude/CLAUDE.md`.
   - Neither file exists: draft `AGENTS.md` under 35 lines: what the project is, how to run each check, conventions you actually observed. End it with a `## Known traps` section holding this one line: `Add one line here each time something non-obvious costs you time: what happened and the fix.` Draft `CLAUDE.md` containing only `@AGENTS.md` on its own line. Write it as plain text, never inside backticks: an import inside a code span is not expanded, so the brief would never load.
   - Only `AGENTS.md` exists: draft just that one-line `CLAUDE.md` and leave `AGENTS.md` alone.
   - `CLAUDE.md` exists: leave both files alone and say so. If `AGENTS.md` exists too, check whether `CLAUDE.md` already has an `@AGENTS.md` line: say it is wired, or tell me Claude ignores `AGENTS.md` until `CLAUDE.md` imports it.
   - No boilerplate in any of them.
5. **Deny rules** for `permissions.deny` in `.claude/settings.json`: scripts and commands that deploy, publish, release, or touch a remote or production database. Find them in `package.json` scripts and common CLIs (wrangler deploy, vercel --prod, npm publish, prisma migrate deploy, drizzle-kit push, supabase db push). Write script-name prefixes without a space before the star (`Bash(npm run deploy*)` also catches `deploy:prod`), and CLI subcommands with one (`Bash(npx wrangler deploy *)`). Merge into the existing file; never overwrite or remove existing keys. Deny rules are a guardrail, not a sandbox: `bash -c '...'` can slip past them.
6. **Show** the drafts (`relay.json`, `AGENTS.md` with `CLAUDE.md`, deny rules) and the skip list, then ask me to confirm. Write the files only after I say yes.
