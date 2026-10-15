---
name: plan
description: Write a plan file for a bigger job. Your words are kept word for word, with a goal, phases with tick boxes, assumptions and a log, saved in docs/plans/. /relay:ship ticks the boxes.
disable-model-invocation: true
argument-hint: [what you want, in your own words]
---
Write a plan for this job. My words: $ARGUMENTS (if empty, ask me for them in one line before anything else). Write nothing to disk until I confirm (in step 1 for an extension, in step 4 for a new plan), and write no code while planning.

1. **Read first.** Read `AGENTS.md` and `CLAUDE.md` (whichever exist), `README.md`, and the code this job touches. If the whole job is one small change (a few lines in one or two files), say so and offer to just do it instead; if I say yes, stop planning and do the change. List `docs/plans/` and open every plan whose slug, title or goal could be about this job, by meaning and not only by shared words. If one covers it, say so and, in the same message, show exactly the lines you would change or add; make those edits and no others, and only after I say yes. If a box already ticked there no longer holds in the code, say so but leave it as it is. If I would rather have a separate plan, go on to step 2. Extending is append-only: add `Added <YYYY-MM-DD>:` and a quote of my new words under `Your words`; add phases (the cap in step 3 counts ticked ones; past it, offer a separate plan); replace a lone `- none` under Assumptions, or add to it; add one Log line (`<YYYY-MM-DD>: Extended: <what>`); and set Status back to `in progress` if it was `done`. Never change existing quotes, phases, boxes or Log lines; rewrite Goal only if my new words change the job.
2. **Draft `docs/plans/<slug>-<YYYY-MM-DD>.md`.** The slug is 2 to 5 lowercase words joined by hyphens; if the file already exists, add `-2` after the slug. Use today's date from your context (or `date +%F` in a shell). Shape:

   ```markdown
   # <Title: a short noun phrase>

   Status: in progress
   Opened: <YYYY-MM-DD>

   ## Your words

   > <my words, copied exactly, typos included>

   ## Goal

   <One or two sentences.>

   ## Phases

   - [ ] **Phase 1: <name>.** <what changes>. Done when: <a command that passes, or a file or output you can check>.
   - [ ] **Phase 2: <name>.** <what changes>. Done when: <...>.

   ## Assumptions

   - <every choice you made without asking me>

   ## Log

   - <YYYY-MM-DD>: Plan written.
   ```

   Copy my words exactly, typos included, with `> ` at the start of every line (a blank line becomes a line holding only `>`). Fix typos in the Title and Goal, never in `Your words`.
3. **Keep it small.** At most 6 phases in total, each one working session with a check that can fail: a command that passes, or a file or output that can be inspected, not a feeling. If one unknown blocks the plan, ask me one short question (two at most) before you draft; otherwise put it under Assumptions.
4. **Show** the draft in a code block and ask me to confirm. Write the file only after I say yes, creating `docs/plans/` if it is missing and never overwriting an existing file. Then tell me the path and stop: do not start any phase.
