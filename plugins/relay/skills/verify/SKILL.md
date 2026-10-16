---
name: verify
description: Run the real app, drive it, read its errors, take a screenshot and say PASS, FAIL or UNVERIFIED with the evidence. Follows the recipe in .claude/verify.md, or drafts one first.
disable-model-invocation: true
argument-hint: [what to check, optional]
---
Check that the app really works, not only that its tests pass. What to check: $ARGUMENTS (if empty, run the whole recipe; if given, run only the recipe steps that relate to it: leave the others out of the counts and list them under Skipped, and if none runs the verdict is UNVERIFIED). Run commands from the project root (the folder with `.claude/`, `.git` or `package.json`). Check the clock (`date`) when you launch and before each later step: after 10 minutes, stop what you started and end UNVERIFIED "timed out". Give every `curl` and CLI run a timeout (for example `curl --max-time 10`). Use the Bash tool for `curl` and for launching; on Windows `curl` in PowerShell is another command.

1. **Recipe.** Read `.claude/verify.md`. If it is missing, draft it from `AGENTS.md`, `README.md`, the `package.json` scripts (`dev`, `start`, `preview`) and the code, in this shape. Show it and write it only after I say yes; that yes also covers running it, so then go on.

   ```markdown
   # Verify <project>

   Kind: web app, API, CLI or library
   Port: <N, or none>
   Launch: `<command>` (background), or none. Ready when: <a URL answers 200, or an output line appears> within <N> seconds.
   Drive:
   1. <open this URL, or run this command>. Expect: <what you should see or get>.
   2. <...>
   Pass when: every Expect is met, console errors 0, failed requests 0, app log errors 0 (name any expected exception or expected 4xx here).
   Never: <data you must not touch or send>.
   Missing: <what this check does not cover>
   ```
2. **Stay safe.** These rules win over the recipe. Before you launch or run any command, read what it runs: the script body, its `pre` and `post` hooks, any `&&` chain, and the `.env` it loads. If it deploys, publishes, migrates a remote database, downloads and runs code, deletes anything outside a temp folder, or points at a remote service it could write to (anything not on this machine), do not run it: end UNVERIFIED and say why. Never print passwords or keys you read from `.env` or elsewhere. Open only `localhost` or `127.0.0.1` URLs. Never use real credentials or personal data, never submit a form that sends email or takes payment, and obey the recipe's `Never:` line. Use only test accounts and values the recipe names. A step that needs more is not covered: do not run it and do not ask me for secrets; it goes under Not covered and the verdict cannot be PASS.
3. **Launch.** Unless `Port: none`, first check that the port is free (`netstat -ano` on Windows, `lsof -i :<port>` elsewhere; look for LISTEN or LISTENING). If something is listening, do not launch and do not kill it: end UNVERIFIED "port in use" and name the process or its PID. Otherwise start the app in the background with the Bash tool (`run_in_background`) and keep its task id and the path of its output file, which is the app's log. A CLI or library has nothing to launch: go to step 4. Wait for the ready check by trying it about once a second until the recipe's deadline (one quick try each, for example `curl -sf --max-time 2 <url>`), and read the log between tries. Stop waiting as soon as the process has exited. If it exits, or is not ready in time, stop it and report FAIL "did not start" with the last 40 lines of its log in Failing.
4. **Drive.** Do each step in order; after a failed step carry on with the ones that do not depend on it. A step you ran and that failed is not met; a step you never reached (the app did not start, the port was busy) is not covered. For a web app use the built-in browser tools: open your own tab (`tabs_create`; if that or `navigate` fails because the browser pane is closed, open the page with `preview_start` and its `url`), then use `navigate`, `read_page`, `computer` (click, screenshot), `read_console_messages` and `read_network_requests`; if you have none of these, use Playwright or Chrome DevTools tools. If a click or screenshot times out because the page has not drawn, front the tab (`tabs_select`) and retry, up to 3 times. Read the console and the network after each page load and step, ignoring other tabs and browser extensions. For an API use `curl`; for a CLI run the command, capturing stderr on its own in a uniquely named file in the OS temp folder (`mktemp`, or `New-TemporaryFile` in PowerShell; not the project) and removing it after you read it, and note its output and exit code (a non-zero exit the Expect does not name is a failure). If you have no way to drive the app, say what is missing and end UNVERIFIED, after step 6.
5. **Evidence.** Keep the result of each Expect, and what you saw; console errors (every line at level error, and uncaught exceptions; warnings do not count; one fault may give several lines, and only 0 against not 0 matters); failed requests (network errors, status 500 or above, and 4xx the recipe does not expect); app log errors (lines in the app's log since launch that contain error, exception or fatal, ignoring case, but not the npm banner or the exit line; for a CLI, any line on its stderr); and, for anything with a screen, a screenshot of the final state. The recipe's `Pass when:` may allow an expected exception: leave that one line out of the count. A count is n/a only for a channel the kind does not have (a CLI has no console or requests) and then counts as 0. If a channel exists but you could not read it, the verdict is UNVERIFIED.
6. **Stop**, whatever the outcome and before you reply. End what you started with TaskStop (load it with ToolSearch first if it is deferred) and close the tab you opened. Then check the port again: on Windows `npm` can leave its `node` child listening. If something still listens, read its command line (PowerShell `(Get-CimInstance Win32_Process -Filter "ProcessId=<pid>").CommandLine`). Stop it by PID (PowerShell `Stop-Process -Id <pid> -Force`, or `kill <pid>` elsewhere) only if that command line is the app you launched, then check the port is free. If it is anything else, leave it alone and report it under Left running: the verdict cannot be PASS. Never stop any other process. If you started nothing, skip this step.
7. **Verdict.**
   - **PASS:** every step is met, no step is not covered (the recipe's Missing list is only reported), all three error counts are 0, and a screenshot was taken (a CLI or API run shows its output instead).
   - **FAIL:** the app ran, or tried to start, and at least one check failed: an Expect not met, a non-zero error count, or "did not start". Name each failing check with its evidence.
   - **UNVERIFIED:** something stopped you from checking: a busy port, a launch you must not run, no browser tool, a console, network or log you could not read, no screenshot possible, a step that is not covered, something left running, or the time limit. FAIL beats UNVERIFIED, and both beat PASS: if a check failed, the verdict is FAIL even when something else also stopped you.

   Never say PASS without evidence. Reply in this shape (write n/a for a field that does not apply, including the counts when nothing ran), then send me the screenshot with SendUserFile if you have its file path:

   ```text
   VERIFY: PASS | FAIL | UNVERIFIED
   Started: <ready in N seconds, or why not>
   Steps: <met> of <total> met, <n> not covered
   Met: <each met step and what you saw, or none>
   Console errors: N, failed requests: N, app log errors: N
   Screenshot: <path, or taken inline, or n/a>
   Output: <for a CLI or API, each command, its exit code and key output; otherwise n/a>
   Failing: <each failing check and its evidence, or none>
   Not covered: <each step you could not run and why, or none>
   Skipped: <steps left out because of the arguments, or none>
   Missing: <the recipe's Missing list>
   Left running: <none, or what is still running and why>
   ```
