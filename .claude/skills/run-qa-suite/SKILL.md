---
name: run-qa-suite
description: Run end-to-end QA for a Linkbase feature by driving the real app in a browser through the Playwright MCP, against the isolated test database. Use whenever the user asks to run QA, run the QA suite, QA a feature, test the app, or test a feature end to end (e.g. "run QA", "run QA on auth", "run the QA suite", "test the app", "QA the link editor", "test the signup flow end to end"). Reads Doc/testing.md and the feature plan's QA Scenarios (plans/feature-<name>.md, falling back to plans/<current-branch>.md), starts `npm run qa:server` (test database only, port 3100), resets QA data between scenarios, runs each scenario with fresh test data, diagnoses and fixes failing application code (max 3 attempts per failure), then cleans up, stops the server with `npm run qa:stop` and reports. Does not write test files, commit or push.
---

# Run QA Suite

Run a feature's QA Scenarios in a real browser against the **test database**. Fix failures in the application code, with at most 3 attempts on the same failure. Then clean up and report back to the user.

## Hard rules

- **Test database only.** Start the app with `npm run qa:server` (port **3100**), never `npm run dev` (port 3000, dev database). Never drive port 3000 for QA. If `qa:server` or `qa:cleanup` refuses to run, stop and report its message. Don't work around it.
- **Never weaken the safety checks.** Don't change `src/lib/db/database-target.ts`, the test-mode checks in `src/lib/db/connect.ts`, `scripts/qa-*.ts`, the `qa:*` scripts in `package.json`, `.claude/hooks/` or any `.env*` file. Don't set `LINKBASE_DB_TARGET` or any database variable by hand.
- **Never read, print, copy or screenshot** `.env*` files, connection strings, `AUTH_SECRET`, session cookies or tokens. You may check whether a file *exists*, by name only. Screenshots are of app pages only. Don't put values in reports, commit messages or code comments.
- **QA data only.** Every account QA creates uses a `qa+<runId>-<n>@linkbase.test` email. Never sign in as, change or delete any other account.
- **No test files.** Don't create an `e2e/` folder, a `playwright.config.ts` or `*.spec.ts` files. QA lives in this skill and the MCP session ([`Doc/testing.md`](../../../Doc/testing.md) §3).
- **Fixes go in application code only** (Step 6). Never make a scenario pass by changing the scenario, the plan, a unit test's expectations or a safety check.
- Do not commit, push or merge. Don't stop processes you didn't start. Ask the user instead.

## Step 1: Read the docs and find the scenarios

1. Read `Doc/testing.md` in full (§3 QA, §4 test database, §5 independence).
2. Find the feature's approved plan, in this order:
   1. `plans/feature-<name>.md`, where `<name>` is the feature the user named or the one the branch is about (e.g. `test/qa-infrastructure` → `plans/feature-qa-infrastructure.md`).
   2. Otherwise `plans/<current-branch>.md`. Get the branch with `git branch --show-current`. A slash in the branch name maps to a subfolder (`feat/auth` → `plans/feat/auth.md`).
   3. If more than one plan could match, or none does, list what you found and ask. Don't guess, and don't create or copy a plan.
3. Use the plan's **QA Scenarios** section as the test list. If the user named extra or different scenarios, use theirs.
4. Sort each scenario into **happy path**, **auth boundary** (signed-out access, redirects, another user's data), **validation** (field errors, bad input) or **edge case** (limits, duplicates, odd input). If a category the feature clearly needs has no scenario, mention the gap in the report. Don't invent extra scenarios without asking.
5. If there's no plan and the user gave no scenarios, ask which flows to test. Don't invent a suite.

## Step 2: Pre-flight

1. Check that ports 3000 and 3100 are free and no `next dev` is running for this project. Next.js allows one dev server per folder. If one is running, ask the user to stop it and wait.
2. Check that `.env.test` exists (name only, never its contents). If it doesn't, stop and tell the user to create it from `.env.example` (`MONGODB_URI_TEST`, database name ending in `_test`).

## Step 3: Start the QA server

1. Run `npm run qa:server` in the background.
2. Wait for both lines in its output:
   - `[qa] Test database check passed: "<name>"`, with a name ending in `_test`, and
   - Next.js's `Ready` message.
3. If it prints a `[qa]` refusal or exits, stop and report the message. It names the problem, never a value.
4. The app is at **http://localhost:3100**. After the first page that touches the database, the server log should show `[db] Test database mode: connected to "<name>_test"`. If it shows anything else, stop.

## Step 4: Reset QA data

Run `npm run qa:cleanup -- --confirm`. It re-checks that the database is a test database, then deletes only QA users, the links they own (first) and rate-limit records. Add `--orphaned-links` to also remove links whose owner no longer exists (dry run first). Note the counts it prints.

## Step 5: Run each scenario

- **Run ID:** the current UTC time as `yyyymmddthhmm` (e.g. `20261102t2230`).
- **Test data:** emails `qa+<runId>-<n>@linkbase.test` (a new `n` per account, never reused in the run, even on a re-run), names like `QA User <n>`, passwords like `qa-<runId>-pass`. These are throwaway test values, not secrets.
- **Reset between scenarios:** before each scenario after the first, run `npm run qa:cleanup -- --confirm`, so earlier accounts and rate-limit records can't affect it.
- **Independent:** start each scenario from a clean browser (`browser_close`, then navigate again), so no cookies carry over. Create the data the scenario needs inside the scenario. Don't rely on an earlier scenario's account or order.
- **Drive the UI** with the Playwright MCP tools: `browser_navigate`, `browser_snapshot` (read the page), `browser_fill_form` / `browser_type`, `browser_click`, `browser_press_key`, `browser_wait_for`. Use `browser_console_messages` and the QA server's output when a step fails.
- **Check outcomes** with the final URL and visible text from the snapshot, e.g. "redirected to `/login?callbackUrl=%2Fdashboard`" or "field error: Enter a valid email address."
- **Rate limits:** sign-up allows 5 per hour per IP, and QA traffic counts. Scenarios that test the limit itself should create their own fresh accounts after the reset.
- Mark each scenario **Pass**, **Fail** or **Blocked** (couldn't run, e.g. the server failed). Never mark Pass without evidence.

Some scenarios test the QA tooling itself (e.g. "`.env.test` is missing → `qa:server` refuses"). These need env files changed or removed, which this skill must not do. Mark them **Blocked: needs manual setup** and say what the user would have to do.

## Step 6: Diagnose and fix failures

For each **Fail**:

1. **Diagnose.** Reproduce it once. Read the snapshot, console messages and server output, then the relevant code. Say what the cause is before changing anything.
2. **Decide whether it's a code bug.** If the scenario itself looks wrong, conflicts with a `Doc/` file, or the fix would need a product decision, a new dependency or a safety-check change, don't fix it. Mark it **Fail (needs decision)** and ask in the report.
3. **Fix** the application code (`src/`), following the relevant `Doc/` files and `CLAUDE.md`. Check library APIs with Context7 and the bundled Next.js docs before changing library-specific code. Keep the change as small as possible.
4. **Check the fix:** run `npm run lint` and `npm run test`. `next dev` reloads changed code, so don't restart the QA server unless the change needs it (e.g. `next.config.ts`).
5. **Re-run** the failed scenario from Step 5's reset, with new test data. Then re-run the scenarios that passed earlier and touch the same code, to catch regressions.
6. **Cap: 3 attempts on the same failure** (the same scenario failing for the same cause). After the third failed attempt, stop fixing and stop the run. Go to Step 7, mark it **Blocked**, and say what was tried and what is in the way.

## Step 7: Clean up and stop

Always do this, whether the run passed, failed or stopped early:

1. Run `npm run qa:cleanup -- --confirm` and note the counts.
2. Close the browser (`browser_close`).
3. Run `npm run qa:stop`. It stops only the QA launcher and the `next dev` it started (verified by PID and command line), then waits for the port to free up. Don't stop the background task as the way to shut the server down: on Windows that leaves `next dev` running and port 3100 busy.
4. Confirm the output says port 3100 is free. If `qa:stop` reports the port is still in use, or in use by an unrecorded process, don't kill anything by hand. Report it to the user.

## Step 8: Report and hand back

When every scenario is green, report a summary of what was tested and stop. Otherwise report what's failing or blocking. Use this shape:

```
QA: <feature>, run <runId>, test database "<name>_test", plan <plan path>

| # | Category | Scenario | Result | Attempts | Evidence |
|---|---|---|---|---|---|
| 1 | Happy path | <scenario> | Pass/Fail/Blocked | <n> | <URL, visible text, or error> |

Fixes applied (uncommitted): <file: one line on what changed and why>, or "none".
Checks after fixes: npm run lint <result>, npm run test <result>.
Blocked / needs decision: <what is blocking, what was tried, what you need from the user>.
Coverage gaps: <missing happy path / auth boundary / validation / edge case scenarios, if any>.
Clean-up: <n> QA users and <n> rate-limit records deleted.
```

Then stop. Don't commit, push or write tests. The user reviews the fixes and decides what happens next.
