# Relay upgrades from Angelo's workflow

Status: in progress
Opened: 2026-10-15

## Your words

> I don't have Unity Repo setup in Git hub, rather it is setup in Unity Version Control. anyways we keep leave the Game Development outside. and focus more on Software Development and Ai Engineering. can you provide me visual representation in Artifacts. on how we can improve relay. like how Angelo does it. dont go over board with it, do it in caveman terms

Added 2026-10-15:

> okay let's proceed to upgrading Relay-Agents

Added 2026-10-15:

> what's next? and continue it

## Goal

Add the pieces Angelo Umali's public workflow has and relay lacks, one small PR at a time, aimed at software development and AI engineering. The picture of this plan is the "Relay Upgrade Map" Artifact.

## Phases

- [x] **Phase 1: CI on every PR.** GitHub Actions runs the self-test on Ubuntu and Windows. Done when: the PR's checks go green on both.
- [x] **Phase 2: AGENTS.md is the brief.** `/relay:setup-project` writes `AGENTS.md` and a one-line `CLAUDE.md` that imports it. Done when: cold-read tests of the skill pass in scratch folders.
- [x] **Phase 3: Plan and ledger.** `/relay:plan` writes this kind of file and `/relay:ship` ticks the boxes. Done when: cold-read tests of both skills pass in scratch folders.
- [x] **Phase 4: Prove it.** `/relay:verify` runs the real app, reads the errors, saves a screenshot and says pass or fail. Done when: it passes and fails correctly on a scratch project.
- [ ] **Phase 5: Stronger ship.** `/relay:ship` adds a security review agent and runs verify before the PR. Done when: a PR body lists the gate, review and verify results.

## Assumptions

- Game development is out of scope: the owner's Unity work lives in Unity Version Control, not GitHub.
- The order is the one on the map. Each phase is its own PR, and the owner merges it.
- Parking lot, not planned yet: many agents with one worktree each, a scoreboard of what the gate caught, and a first-run yes before relay runs commands a repo supplies (`relay.json`, `verify.md`; found by the security review of phase 5).

## Log

- 2026-10-15: Plan written.
- 2026-10-15: Phase 1 done (PR #6, CI green on Ubuntu and Windows).
- 2026-10-15: Phase 2 done (PRs #6 and #7, relay 0.3.1, cold-read tests passed).
- 2026-10-15: Phase 3 done (relay 0.4.0, cold-read tests of /relay:plan and /relay:ship passed in scratch folders).
- 2026-10-16: Phase 4 done (relay 0.5.0, /relay:verify passed on this repo's board and passed, failed and reported UNVERIFIED correctly on scratch apps).
