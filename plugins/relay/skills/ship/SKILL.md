---
name: ship
description: Pre-PR checks. Runs the slow checks the Stop gate skips, runs the reviewer agent, then commits, pushes and opens a PR after confirmation.
disable-model-invocation: true
argument-hint: [the task, in one line]
---
Ship the current work. Task: $ARGUMENTS (if empty, ask me for it in one line).

1. **Branch.** Run `git branch --show-current`. On `main` or `master`, propose a branch name `feat/<slug>` and `git switch -c` it. Never commit to or push `main`.
2. **Checks.** Read `.claude/relay.json`. Run every `gates` command, then every `slow` command, in order. Stop at the first failure, show the last 40 lines, and fix it or ask me. No `relay.json`: say so and suggest `/relay:setup-project`.
3. **Review.** Collect the diff against the base branch (`git diff <base>...HEAD` plus uncommitted changes; base is `origin/HEAD` or `main`). Send the task and the diff to the `relay:reviewer` agent. Show its findings. Fix blockers and majors, then re-run step 2.
4. **Confirm before anything outward.** Show `git status`, the proposed commit message, and the PR title and body. Ask before each of: commit, push, open the PR. Push with `git push -u origin <branch>` and open with `gh pr create`. Never merge, never force-push.
