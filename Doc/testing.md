# Testing

How Linkbase is tested: Vitest unit tests for pure logic, and Playwright MCP-driven QA for end-to-end behaviour against an isolated test database. Read this before writing a test, running QA, or touching test environment config.

> **Status: unit tests and QA tooling set up and verified.** Vitest is installed, with passing unit tests for the auth validation schemas. QA runs through the `run-qa-suite` skill against the test database, started only by `npm run qa:server` with fail-safe checks (§3–§4). The `write-tests` skill exists. The QA infrastructure passed all six planned scenarios on 2026-11-03 (§7). Section 1 lists what is actually available. Everything else is a planned convention. Undecided details are marked **TBD**. Related: [`errors-and-validation.md`](errors-and-validation.md) (Zod schemas), [`data-mutations.md`](data-mutations.md) (Server Actions), [`database.md`](database.md), [`security.md`](security.md) (secrets, env files).

## 1. What exists today (verified)

| Item | State |
| --- | --- |
| **Vitest** | **Installed and configured:** `vitest` 4.1.12 (dev dependency), config in `vitest.config.mts` (§2) |
| `test` script in `package.json` | `npm run test` → `vitest run` (runs once, no watch mode) |
| Test files | `src/lib/validation/auth.test.ts`: 39 unit tests for `signUpSchema` and `logInSchema`, all passing. Unit tests only, no MongoDB or other database access. No `*.spec.ts` files |
| **Playwright MCP** | **Available to Claude Code** as a user-level plugin (`playwright@claude-plugins-official`). Not configured in this repo: no `.mcp.json`, and nothing in `.claude/settings.json`. Used by the `run-qa-suite` skill |
| **`write-tests` skill** | **Exists** in `.claude/skills/write-tests/`. Writes Vitest unit tests following this doc; doesn't run them, run QA or commit |
| **`run-qa-suite` skill** | **Exists** in `.claude/skills/run-qa-suite/`. Drives the plan's QA Scenarios through the Playwright MCP against the test database (§3) |
| QA scripts | `npm run qa:server` (`scripts/qa-server.ts`), `npm run qa:stop` (`scripts/qa-stop.ts`) and `npm run qa:cleanup` (`scripts/qa-cleanup.ts`), sharing `scripts/qa-env.ts` (§3–§5) |
| Test-database checks | `src/lib/db/database-target.ts`, used by `connect.ts` and the QA scripts (§4) |
| `.env.test` | **You create it** (one line: `MONGODB_URI_TEST=…`). Git-ignored by the `.env*` rule, and Claude Code's env-file hook blocks edits to it |
| `MONGODB_URI_TEST` | Read only in test mode (`LINKBASE_DB_TARGET=test`, set by `qa:server`) and by `qa:cleanup`. Placeholder in `.env.example` |
| Test database | **Exists and verified:** a separate MongoDB Atlas database, `linkbase_test`, reached through `MONGODB_URI_TEST` in `.env.test` (§4). Used by the QA run on 2026-11-03 (§7) |
| Zod | Installed (Zod 4), schemas in `src/lib/validation/` ([`errors-and-validation.md`](errors-and-validation.md)) |

## 2. Unit tests: Vitest

**Scope:** pure functions and Zod validation schemas only. No database, network, session or Next.js runtime.

- **Location:** next to the file under test, named `<file>.test.ts`:

  ```
  src/lib/validation/<schema-file>.ts
  src/lib/validation/<schema-file>.test.ts
  ```

- **Independent:** each test sets up its own data. No shared mutable state between tests, no reliance on run order. Reset anything a test changes (e.g. mocks, timers) in that test or in `beforeEach` / `afterEach`.
- **Schemas:** test both valid and invalid input, and check the field-level errors the forms will display ([`errors-and-validation.md`](errors-and-validation.md) §4).
- **Don't unit-test Server Actions by mocking** auth, the database or Next.js. They're covered by QA (§3).
- Follow [`coding-standards.md`](coding-standards.md) (TypeScript strict, no `any`, `async`/`await`).

### Setup (decided)

- **Version:** `vitest` 4.1.12. Vitest 5 needs `@types/node` 22+, and the project uses `@types/node` 20.
- **Config:** `vitest.config.mts` at the project root:
  - `test.environment: "node"`: no browser or DOM, since components aren't unit-tested.
  - `test.include: ["src/**/*.test.ts"]`: only `*.test.ts` files under `src/`, so `*.spec.ts` files are never collected.
  - `resolve.tsconfigPaths: true`: Vite 8's built-in tsconfig path resolution, so `@/*` → `src/*` works in tests exactly as in app code. No `vite-tsconfig-paths` plugin.
- **Run:** `npm run test` (`vitest run`). It runs once and exits.
- **Unit tests never touch MongoDB.** Nothing a unit test imports may call `connectToDatabase()`, read `process.env`, or use Mongoose models. Database behaviour is covered by QA (§3, §4).
- **Existing tests:** `src/lib/validation/auth.test.ts` covers valid input, normalisation (trimming, lowercased email, passwords kept as typed, unknown fields dropped), the first field-level message each form shows, and length limits (including the 72-byte password limit).

**TBD:** coverage tooling and thresholds, and whether CI runs the tests (no CI exists).

## 3. End-to-end QA: Playwright MCP

- End-to-end QA is done by **Claude Code driving a browser through the Playwright MCP** against a running Linkbase app.
- QA is run through the **`run-qa-suite` skill** (`.claude/skills/run-qa-suite/SKILL.md`).
- **Server Actions are tested here**, through the real UI: sign-in, ownership rules, validation messages, revalidation. They aren't mocked in unit tests.

### QA workflow (decided)

1. **Scenarios** come from the feature plan's **QA Scenarios** section (`plans/feature-<name>.md`), or from the user.
2. **Server:** `npm run qa:server` starts `next dev` on **port 3100**, connected to the test database only (§4). Stop the normal dev server first: Next.js allows one `next dev` per project folder.
3. **Reset:** `npm run qa:cleanup -- --confirm` removes earlier QA data (§5).
4. **Run:** each scenario starts from a clean browser, creates its own accounts and checks the final URL and visible text through the Playwright MCP.
5. **Sign-in and test accounts:** QA signs up through the real `/signup` form with throwaway accounts: `qa+<runId>-<n>@linkbase.test` (`.test` is a reserved domain, so these can never be real users). There are no shared, long-lived test users.
6. **Fix failures:** if a scenario fails, the skill diagnoses it, fixes the application code, then retries the scenario, up to **3 attempts on the same failure**. If it still fails after 3 attempts, the skill stops and reports what is blocking. It never changes the safety checks, QA scripts or env files to make a scenario pass.
7. **Report:** Pass / Fail / Blocked per scenario, with evidence and any fixes applied. Then clean up and stop the server with `npm run qa:stop`, confirming port 3100 is free (§4, "Stopping the QA server"). Fixes are left uncommitted: the skill never commits or pushes.

**Do not create:**
- an `e2e/` (or `/e2e`) folder,
- a `playwright.config.ts`,
- committed `*.spec.ts` files.

QA lives in the skill and MCP sessions, not in a Playwright test-runner setup.

**TBD:** whether the Playwright MCP should be declared at project level.

## 4. Test database isolation (security requirement)

- QA runs against a **separate test database**, never the development or production database.
- The test connection string lives in **`MONGODB_URI_TEST`**, in **`.env.test`**.
- **Never commit `.env.test` with real credentials.** The Next.js docs suggest committing `.env.test`, but in Linkbase it holds a database credential, so it stays Git-ignored (the current `.env*` rule already does this). If it's ever documented for others, use placeholder values only, as with `.env.example` ([`security.md`](security.md) §2).
- **Never print, log or paste** the value of `MONGODB_URI_TEST` or any other connection string, including in QA output, screenshots or chat.

### How the app picks the test database

Next.js loads `.env.test` **only when `NODE_ENV=test`**, and `next dev` always runs as `development`. So Linkbase doesn't rely on Next.js to load it:

- **`npm run qa:server`** (`scripts/qa-server.ts`) reads `.env.test` itself, runs the checks below, then starts `next dev --port 3100` with **`LINKBASE_DB_TARGET=test`** and `MONGODB_URI_TEST` in the process environment. Process env takes precedence over `.env*` files, so the app can't pick up a different value.
- **`connectToDatabase()`** ([`database.md`](database.md) §4) asks `resolveDatabaseConfig()` in `src/lib/db/database-target.ts` which URI to use:
  - no `LINKBASE_DB_TARGET` → `MONGODB_URI`, exactly as before (dev and production unchanged);
  - `LINKBASE_DB_TARGET=test` → `MONGODB_URI_TEST`, only if it passes the checks below.
- `.env.local` is still loaded as normal (`AUTH_SECRET`, and `MONGODB_URI` for comparison).
- `.env.test` holds one line: `MONGODB_URI_TEST=…`. **The user creates it**; Claude Code's env-file hook blocks edits to it.

**Retired interim method:** the manual auth QA used a temporary `.env.development.local` that pointed `MONGODB_URI` at `linkbase_test`. While it exists, every `npm run dev` uses the test database, with no checks. `qa:server` **refuses to start while it exists**. Move its connection string into `.env.test` as `MONGODB_URI_TEST`, then delete it.

### Fail safely (implemented)

`resolveDatabaseConfig()` is shared by the app, `qa:server` and `qa:cleanup`. In test mode it **refuses before connecting** when:
- `MONGODB_URI_TEST` is missing, empty or not a MongoDB URI,
- its database name (the URI path) doesn't end in **`_test`** (the rule for recognising a test database),
- it points to the same database as `MONGODB_URI` (same host and database name, or the same string), or
- `NODE_ENV` is `production`.

`qa:server` and `qa:cleanup` also refuse when `.env.test` is missing or `.env.development.local` exists, and `qa:server` refuses when port 3100 is busy.

**After connecting**, the app and `qa:cleanup` check the database the driver actually selected (`connection.name`) and stop if it doesn't end in `_test`. The app then logs `[db] Test database mode: connected to "<name>"`: the database name only.

Every message names the variable and the problem, **never the value**. Unexpected driver errors are reported by error name only, because their messages can include host names.

### Stopping the QA server (implemented)

Always stop the QA server with **`npm run qa:stop`** (`scripts/qa-stop.ts`). In an interactive terminal, Ctrl+C also works.

- **Why a separate command:** Windows has no POSIX signals, and ending a parent process doesn't end its children. Stopping the background task that ran `npm run qa:server` ends only the outer shell, so the launcher, `next dev` and the server process `next dev` forks keep running, and port 3100 stays busy. Even `child.kill()` on Windows force-ends only the direct child and leaves its forked server running.
- **What `qa:server` does:** it records its own PID and the PID of the `next dev` it starts in `linkbase-qa-server.json` in the system temp folder (PIDs only, no env values). When it gets Ctrl+C, Ctrl+Break or a stop request, on Windows it ends the whole `next dev` process tree (`taskkill /T /F`). On other platforms it forwards the signal. It removes the PID file when it exits.
- **What `qa:stop` does:** it reads the PID file and stops a recorded process only if its command line is still this project's QA launcher (`scripts/qa-server.ts`) or its `next dev --port 3100`. On Windows it ends that process tree with `taskkill /T /F`; elsewhere it sends `SIGTERM` to the launcher. It then waits until port 3100 is free and removes the PID file.
- **What it never does:** kill processes by name or by port, touch the normal dev server on port 3000 or other Node.js processes, read env files, or connect to a database. A PID that no longer matches is left alone with a warning.
- **If the port stays busy:** when port 3100 is in use but no QA server is recorded, or is still in use after stopping, `qa:stop` exits with an error and stops nothing else. Check the process by hand; don't kill it blindly.

## 5. Test independence (all tests)

- **Every test or QA scenario runs on its own.** It creates the data it needs and doesn't rely on another test having run first.
- **No shared mutable state** between tests: no module-level variables, no reused records modified by several tests.
- **Order doesn't matter.** Tests pass in any order, alone or together.
- **Clean up** data a test created, in the **test database only**. Clean-up must never be able to touch dev or production data, so it's protected by the same safety checks as §4.
- **QA data is marked by email:** every account QA creates uses `qa+<runId>-<n>@linkbase.test`, unique per run.
- **Clean-up (decided): `npm run qa:cleanup`** (`scripts/qa-cleanup.ts`). It runs the §4 checks before and after connecting.
  - **Dry run by default:** prints counts only.
  - **`npm run qa:cleanup -- --confirm`** deletes only users matching `qa+…@linkbase.test` and the test database's `authattempts` (rate-limit records). Clearing those lets repeated runs stay under the sign-up limit (5 per hour per IP).
  - It never drops collections or databases, and never touches other users.
- `run-qa-suite` runs clean-up before each suite, between scenarios, and after the suite.

## 6. Open decisions

| Decision | Status |
| --- | --- |
| Install Vitest, version, config file, `test` script | **Decided:** Vitest 4.1.12, `vitest.config.mts`, `npm run test` (§2) |
| Coverage tooling and thresholds | TBD |
| Create the `run-qa-suite` skill, its flows and reporting | **Decided:** flows from the plan's QA Scenarios, Pass/Fail/Blocked report (§3) |
| Declare Playwright MCP at project level or keep user-level | TBD (user-level today) |
| How the QA server is started and made to read `.env.test` | **Decided:** `npm run qa:server`, port 3100 (§4) |
| How the connection helper selects `MONGODB_URI_TEST` | **Decided:** `LINKBASE_DB_TARGET=test` + `resolveDatabaseConfig()` (§4) |
| Rule for recognising a safe test database | **Decided:** name ends in `_test`, differs from `MONGODB_URI`, never in production, re-checked after connecting (§4) |
| Test data clean-up strategy | **Decided:** `qa+…@linkbase.test` accounts, `npm run qa:cleanup` (§5) |
| QA sign-in method and test accounts | **Decided:** throwaway accounts through `/signup` (§3) |
| CI for tests | TBD (no CI exists) |

## 7. Verification record

### QA infrastructure: passed on 2026-11-03

The QA infrastructure plan (`plans/feature-qa-infrastructure.md`, local only) was run through the `run-qa-suite` skill (run `20261103t1046`, test database `linkbase_test`). **All six planned scenarios passed.** No application code needed fixing.

| # | Scenario | Result | How it was verified |
| --- | --- | --- | --- |
| 1 | `qa:server` uses only the test database | **Pass** | The launcher logged `Test database check passed: "linkbase_test"` and started on port 3100. A QA sign-up through the real `/signup` form redirected to `/dashboard`, and the app logged `[db] Test database mode: connected to "linkbase_test"`. `qa:cleanup` then counted that QA user in `linkbase_test`. No connection string appeared in any output |
| 2 | `.env.test` missing, or `MONGODB_URI_TEST` empty → refused | **Pass** | Byte-identical copies of the QA scripts were run in an isolated temporary folder with fake env files (fake credentials, unresolvable `.invalid` hosts), so the real env files were never changed. Both `qa:server` and `qa:cleanup` refused before starting or connecting |
| 3 | Database name without `_test`, or same database as `MONGODB_URI` → refused | **Pass** | Same isolated method. Both scripts refused before connecting |
| 4 | `.env.development.local` exists → refused | **Pass** | Same isolated method. Both scripts refused and explained how to remove the file |
| 5 | `qa:cleanup` dry run, `--confirm`, and refusal on a non-test database | **Pass** | Dry run printed counts only. `--confirm` deleted only the QA user and the rate-limit records. A final dry run showed **0 QA users and 0 rate-limit records** remaining. A non-test database was refused before connecting (isolated method) |
| 6 | Normal dev and build unaffected; checks pass | **Pass** | `npm run dev` started with only `.env.local` loaded and no test-mode log line; no page was loaded, so the development database was not contacted. `npm run lint` passed, `npm run test` passed (**39 Vitest tests**), and `npm run build` (including the TypeScript check) succeeded |

**Safety checks:** in the isolated runs, every unsafe setup was refused before any connection, by `resolveDatabaseConfig()` and the QA scripts: a missing, empty or non-MongoDB `MONGODB_URI_TEST`, a database name without `_test`, the same database as `MONGODB_URI`, production mode, and an existing `.env.development.local`. No error output contained a connection string, username, password or host. Unexpected driver errors are reported by error name only.

**Shutdown:** the QA server was stopped with `npm run qa:stop`, and ports 3000 and 3100 were free afterwards.

**Notes from the run:**
- **Session revocation:** a signed session cookie issued earlier kept granting `/dashboard` access after its QA user had been deleted. This is a known limitation of the JWT sessions, not fixed: see [`security.md`](security.md) §7.1.
- **Clean browser:** the Playwright MCP keeps its browser profile, so `browser_close` alone does not clear cookies. Clear the browser context's cookies before each scenario so no session carries over (§5).
- **Intermittent connections:** `qa:cleanup` sometimes failed with `MongooseServerSelectionError` while the app connected normally. Retrying succeeded. If it recurs, check MongoDB Atlas Network Access for the current IP address.
