# Testing

How Linkbase is tested: Vitest unit tests for pure logic, and Playwright MCP-driven QA for end-to-end behaviour against an isolated test database. Read this before writing a test, running QA, or touching test environment config.

> **Status: unit tests and QA tooling set up and verified.** Vitest is installed, with passing unit tests for the auth validation schemas. QA runs through the `run-qa-suite` skill against the test database, started only by `npm run qa:server` with fail-safe checks (§3–§4). The `write-tests` skill exists. The QA infrastructure passed all six planned scenarios on 2026-11-03 (§7). Section 1 lists what is actually available. Everything else is a planned convention. Undecided details are marked **TBD**. Related: [`errors-and-validation.md`](errors-and-validation.md) (Zod schemas), [`data-mutations.md`](data-mutations.md) (Server Actions), [`database.md`](database.md), [`security.md`](security.md) (secrets, env files).

## 1. What exists today (verified)

| Item | State |
| --- | --- |
| **Vitest** | **Installed and configured:** `vitest` 4.1.12 (dev dependency), config in `vitest.config.mts` (§2) |
| `test` script in `package.json` | `npm run test` → `vitest run` (runs once, no watch mode) |
| Test files | 518 tests in 14 `*.test.ts` files beside the code they test (§2), all passing. No MongoDB or other database access; the only mocked tests are listed in §2.1. No `*.spec.ts` files |
| **Playwright MCP** | **Available to Claude Code** as a user-level plugin (`playwright@claude-plugins-official`). Not configured in this repo: no `.mcp.json`, and nothing in `.claude/settings.json`. Used by the `run-qa-suite` skill |
| **`write-tests` skill** | **Exists** in `.claude/skills/write-tests/`. Writes Vitest unit tests following this doc; doesn't run them, run QA or commit |
| **`run-qa-suite` skill** | **Exists** in `.claude/skills/run-qa-suite/`. Drives the plan's QA Scenarios through the Playwright MCP against the test database (§3) |
| QA scripts | `npm run qa:server` (`scripts/qa-server.ts`), `npm run qa:stop` (`scripts/qa-stop.ts`) and `npm run qa:cleanup` (`scripts/qa-cleanup.ts`), sharing `scripts/qa-env.ts` (§3–§5) |
| Test-database checks | `src/lib/db/database-target.ts`, used by `connect.ts` and the QA scripts (§4) |
| `.env.test` | **You create it** (one line: `MONGODB_URI_TEST=…`). Git-ignored by the `.env*` rule, and Claude Code's env-file hook blocks edits to it |
| `MONGODB_URI_TEST` | Read only in test mode (`LINKBASE_DB_TARGET=test`, set by `qa:server`) and by `qa:cleanup`. Placeholder in `.env.example` |
| `BLOB_READ_WRITE_TOKEN_TEST` | Token of a **separate** Vercel Blob store for QA, in `.env.test`. `qa:server` passes it to the app as `BLOB_READ_WRITE_TOKEN`; `qa:cleanup` uses it to delete QA pictures. Both refuse if it's missing or equal to the dev token. Placeholder in `.env.example` |
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
- **Don't unit-test Server Actions by mocking** auth, the database or Next.js. They're covered by QA (§3). The one exception is §2.1.
- Follow [`coding-standards.md`](coding-standards.md) (TypeScript strict, no `any`, `async`/`await`).

### Setup (decided)

- **Version:** `vitest` 4.1.12. Vitest 5 needs `@types/node` 22+, and the project uses `@types/node` 20.
- **Config:** `vitest.config.mts` at the project root:
  - `test.environment: "node"`: no browser or DOM, since components aren't unit-tested.
  - `test.include: ["src/**/*.test.ts"]`: only `*.test.ts` files under `src/`, so `*.spec.ts` files are never collected.
  - `resolve.tsconfigPaths: true`: Vite 8's built-in tsconfig path resolution, so `@/*` → `src/*` works in tests exactly as in app code. No `vite-tsconfig-paths` plugin.
- **Run:** `npm run test` (`vitest run`). It runs once and exits.
- **Unit tests never touch MongoDB.** Nothing a unit test imports may call `connectToDatabase()`, read `process.env`, or use Mongoose models. Database behaviour is covered by QA (§3, §4).
- **Existing tests (518 in 14 files):** `src/lib/db/database-target.test.ts` (30, 2026-11-07) covers the test-database safety checks (§4: `_test` names, same-database refusal, production refusal, no values in errors) and the log-safe connection error description. Public profile (2026-11-04): `src/lib/validation/profile-picture.test.ts` (type, size, byte signatures, Blob URL check), `src/lib/users/public-profile-mapping.test.ts` (public fields only, link order, unsafe links dropped, handles that 404 without a lookup), `src/lib/storage/blob-token.test.ts`, picture cases in `qa-cleanup.test.ts`, and the mocked tests in §2.1. Earlier: `src/lib/db/qa-cleanup.test.ts` (35) covers the QA clean-up rules (§5). `src/lib/validation/link.test.ts` (87) covers `isHttpUrl` (accepted http/https URLs; rejected `javascript:`, `data:`, `vbscript:`, `file:`, `ftp:`, `mailto:`, no scheme, protocol-relative, whitespace; the 2048/2049 boundary), title rules (trim, 1/100/101, empty), URL messages, id format (including injection-style values), and the create/update/delete/active/footer schemas (field errors, unknown fields such as `userId` dropped, booleans only). `src/lib/links/display.test.ts` (40) covers domains, click labels, live-link filtering (inactive and unsafe URLs hidden) and `applyLinkOverrides` (confirmed adds, deletes, edits and toggles). Data functions and Server Actions touch MongoDB and Next.js, so they are covered by browser QA, not unit tests (§2). `src/lib/onboarding/handle-field-state.test.ts` covers every state of the onboarding handle field (format errors, checking, available, taken, rate limited, failed check, stale replies, rejected claims); `src/lib/auth/home-path.test.ts` covers where signed-in users are sent. `src/lib/validation/handle-rules.test.ts` and `handle.test.ts` cover handle normalization, valid handles, invalid characters (spaces, periods, symbols, uppercase, accents, emoji), length boundaries 2/3/30/31, reserved names, non-string input and the field-level messages; duplicate handles are database behaviour and are covered by QA. `src/lib/validation/auth.test.ts` covers valid input, normalisation (trimming, lowercased email, passwords kept as typed, unknown fields dropped), the first field-level message each form shows, and length limits (including the 72-byte password limit).

**TBD:** coverage tooling and thresholds, and whether CI runs the tests (no CI exists).

### 2.1 Mocked profile picture and Blob tests (exception, decided 2026-11-04)

Real uploads need Vercel Blob credentials, which come with the course's Vercel lesson. Until then, browser QA can't reach a successful upload, replace or remove, so these two files test that logic with **mocks**. They are the only tests that mock modules or stub env vars; don't extend the pattern to other actions without a reason like this one.

| File | Real | Mocked |
| --- | --- | --- |
| `src/lib/storage/avatar-storage.test.ts` (24) | `sharp` image processing (512×512 WebP, EXIF dropped, malformed/truncated/text files and a 10,000×10,000 header rejected); the token check | `put` / `del` from `@vercel/blob`; `BLOB_READ_WRITE_TOKEN` stubbed with a made-up, token-shaped value |
| `src/app/(dashboard)/dashboard/profile-picture-actions.test.ts` (31) | Validation rules (`profile-picture.ts`): declared type, 2 MB limit, real bytes | Session, rate limit, database (`User`), `next/cache`, and `processAvatar` / `storeAvatar` / `deleteAvatar` |

What they cover: successful upload (path `avatars/<userId>/<uuid>.webp`, public WebP, token passed explicitly even when OIDC variables exist); replace (old file deleted only after the new URL is saved); remove (URL read from the user's own record, never from the client); clean-up when saving the URL fails or the account is gone (the new file is deleted); Blob failures and missing or invalid tokens (friendly message, nothing saved, logs show the error name only); signed-out and no-handle requests refused before any database or storage call; user ids and URLs sent with the form ignored; invalid types, malformed, empty and oversized files; the rate limit keyed by the session user.

**Not covered by any test yet (needs Vercel):** a real `put` / `del` against a Blob store, the stored image appearing on the dashboard and `/user/[handle]` through `next/image`, the old file really disappearing from the store, and `qa:cleanup` deleting real QA pictures. See §7, "Pending: real Vercel Blob".

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
- It uses **its own Atlas database user** (e.g. `linkbase_qa`) with `readWrite` on `linkbase_test` only, never the dev user (`linkbase_dev`, `linkbase` only). **State on 2026-11-07:** `.env.test` still holds the old shared user, whose login fails (`bad auth`), so QA is blocked until the user creates the QA user and updates `.env.test` ([`deployment.md`](deployment.md) §10.3).
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
  - **`npm run qa:cleanup -- --confirm`** deletes, in this order: the **links owned by QA users** (`qa+…@linkbase.test`, matched by `QA_EMAIL_PATTERN`), the QA users themselves (by id snapshot *and* QA email), and the test database's `authattempts` (rate-limit records). Clearing those lets repeated QA runs stay under the sign-up limit (5 per hour per IP). Real users and their links are never matched.
  - **Profile pictures:** with `--confirm`, QA users' pictures are deleted from the **test Blob store** first (only URLs that pass `isBlobAvatarUrl`, using `BLOB_READ_WRITE_TOKEN_TEST`). The report adds "N QA pictures".
  - **`--orphaned-links`** (opt-in, with or without `--confirm`) also counts/deletes links whose owner no longer exists in the test database, e.g. left by clean-ups from before links were handled. A real user's link always has an existing owner, so it can't match.
  - The rules live in `src/lib/db/qa-cleanup.ts` (pure, no database). `scripts/qa-cleanup.ts` keeps the safety checks (`loadQaDatabase()` before connecting, `assertTestDatabaseName()` after) and only supplies the MongoDB operations. `src/lib/db/qa-cleanup.test.ts` (35 tests) covers the QA email rule, argument parsing, dry-run protection (no delete calls, nothing changed), ownership isolation (real users' links untouched), links-before-users order, orphaned links only on request, and output without connection strings.
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

### Onboarding (pick your handle): passed on 2026-11-03

The onboarding plan (`plans/feat/onboarding-handle.md`, local only) was run through `run-qa-suite` (run `20261103t1522`, test database `linkbase_test`). **All six planned scenarios passed**, after two fixes found during the run.

| # | Scenario | Result | How it was verified |
| --- | --- | --- | --- |
| 1 | Sign up → `/onboarding`; type `Maya_Ortiz-1` → `maya_ortiz-1`, live preview, "available"; claim → `/dashboard`; persists after refresh | **Pass** | Final URLs, "Checking availability…" then "linkba.se/maya_ortiz-1 is available.", preview pill `linkba.se/maya_ortiz-1`, `/onboarding` → `/dashboard` after claiming and after reload |
| 2 | No handle → `/dashboard` and login go to `/onboarding`; signed out `/onboarding` → `/login` | **Pass** (attempt 2) | `/login?callbackUrl=%2Fonboarding`; signed-in `/dashboard`, `/login` and post-login all ended on `/onboarding` |
| 3 | Taken, uppercase-taken and reserved (`admin`) handles; forced submit; **two users claiming the same handle at once** | **Pass** | "That handle is taken. Try another." live and from the server; the losing user still had no handle; in the simultaneous claim one user got the handle and the other the taken error |
| 4 | `mo`, `maya ortiz!`, `maya.ortiz` → inline errors, Claim disabled; forced 31-character and invalid submits rejected by the server | **Pass** | Messages from the plan, `aria-invalid`, server log showed `claimHandleAction` returning field errors; nothing saved |
| 5 | User with a handle → `/onboarding` redirects to `/dashboard`; handle unchanged (also a second tab submitting a different handle) | **Pass** | Second tab's claim redirected to `/dashboard`; the first handle stayed taken and the second stayed available |
| 6 | 375 px and 1440 px layouts; Log out → `/` | **Pass** | Two columns at 1440 (form 440 px, H1 56 px, brand panel); one column at 375 with no horizontal overflow; geometry matches the v3 design file rendered locally |

**Fixes made during the run:**
- **Redirect loop for a deleted user's cookie:** Proxy sent signed-in cookies from `/login` to `/dashboard`, while the database-backed page check sent the (deleted) user back to `/login`. The signed-in redirect for `/login` and `/signup` moved from Proxy into the pages (`RedirectIfSignedIn`); Proxy's matcher is now `/dashboard/:path*`, `/onboarding/:path*` ([`auth.md`](auth.md) §4).
- **Dev prerender error** `crypto.getRandomValues()` on `/onboarding` and `/signup`: `getCurrentUser()` now starts with `await connection()`.

**Notes:** sign-ups took 3–20 s on this network (remote Atlas), so waits were raised to 60 s. The public IP changed several times between attempts, which blocked the first runs until Atlas Network Access allowed it.

#### Final review run (run `20261103t1606`): passed

After the review fixes (direct redirects from `/login` and `/signup`, single-round-trip rate limiter, failed-check message, caret-preserving lowercasing, `handle: null` claim filter), all six scenarios were run again and **passed on the first attempt**, with no application errors in the server log. Extra checks:

- `/login` and `/signup` while signed in go straight to `/onboarding` (no handle) or `/dashboard` (handle), with no intermediate page.
- **Rate limiter regression:** the 6th sign-up in an hour and the 6th wrong password for an email were refused (the correct password too, while limited); the 11th handle claim in 15 minutes was refused; 61 availability checks spread over two one-minute windows were all allowed, so expired windows reset.
- **Failed availability check:** with the browser offline, the field showed "Couldn't check availability…", Claim stayed disabled, and typing again recovered.
- **Layout:** the heading scales as in the design (56 px at 1440, 52.8 px at 900, 36 px at 375); no horizontal overflow at any width.
- **Latency:** availability checks averaged about 320 ms (87 checks), down from about 650–1,000 ms. Sign-ups make 4 database round trips instead of 7; they still take about 4–6 s on this network, mostly bcrypt (cost 12, pure-JS `bcryptjs`: about 0.8 s to hash plus 0.6 s to verify) and Atlas latency.

### Links dashboard: passed on 2026-11-03

The links dashboard plan (`plans/feat/links-dashboard.md`, local only) was run through `run-qa-suite` (run `20261103t2140`, test database `linkbase_test`). **All six planned scenarios passed**, after two fixes found during the run.

| # | Scenario | Result | How it was verified |
| --- | --- | --- | --- |
| 1 | Add through the dialog → top of the list and preview at once, toast, persists | **Pass** (attempt 2) | Focus starts on URL; at the moment "Link added" shows, the new row is on top and "Live · N links" is updated; values trimmed; order newest first after reload |
| 2 | Invalid add and inline edit (empty title, 101 characters, `javascript:`, `ftp:`, no scheme) | **Pass** | Server field errors under each field, `aria-invalid`, typed values kept, dialog/form stays open, nothing saved (reload) |
| 3 | Inline edit, Cancel, Escape | **Pass** | At "Link updated" the row and preview already show the new title and domain; Cancel and Escape restore; ⋮ menu keyboard (arrows, Escape, focus back to ⋮) |
| 4 | Delete with confirmation | **Pass** | Focus on Cancel; Cancel and Escape keep the link; Delete removes it from list and preview at once and after reload |
| 5 | Ownership and access | **Pass** | User B's forged edit, delete and switch requests with user A's link id (form ids swapped; the switch request rewritten in transit) all got "That link no longer exists."; A's link unchanged; signed out → `/login?callbackUrl=%2Fdashboard`; no handle → `/onboarding` |
| 6 | Link and footer visibility, preview, responsive | **Pass** (attempt 2) | Switches update the preview instantly and persist; all off → "Turn a link on to show it here."; preview settings (theme, banner) not saved; copy puts `…/user/{handle}` on the clipboard; 1440 (rail, phone 300×620, tools), 900 (phone 0.9), 375 (bottom bar, Edit/Preview, no horizontal overflow) |

**Fixes made during the run:**
- **Stale rows after a successful action:** the toast and closed dialog could reach the page a moment before the refreshed list, so a deleted row stayed clickable and an edited row briefly showed old values. The dashboard now applies confirmed changes itself (`applyLinkOverrides` in `src/lib/links/display.ts`; `createLinkAction`/`updateLinkAction` return the saved values).
- **⋮ menu hidden on inactive links:** `opacity` on the whole inactive card trapped the open menu under the next card. Only the card's content is faded now.
- Mobile header: the disabled Enhance icon is hidden below 768 px so the profile URL has room next to the account menu.

**Notes:**
- `qa:cleanup` deleted QA users and rate-limit records but **not links** at the time, so 3 links without an owner were left in `linkbase_test`. **Resolved** in the final pass below: `qa:cleanup` now deletes QA users' links, and `--orphaned-links` removed those 3 (dry run first showed exactly 3).
- The Next.js dev badge (bottom-left, development only) covers the mobile bottom bar's first item, so QA clicks it through the DOM.
- A `TypeError` in `applyLinkOverrides` appeared once in the dev log: Fast Refresh kept old component state while the overrides shape changed during the fix. It doesn't occur on a fresh load.

#### Final verification run (run `20261103t2231`): passed

After the clean-up and review fixes, all six scenarios were run again on `linkbase_test` and **passed**, with **0 application errors** in the server log. Each reset now reported and deleted the scenario's links with its users (e.g. "Deleted 3 QA users, 4 QA links, 7 rate-limit records").

| # | Scenario | Result | Attempts |
| --- | --- | --- | --- |
| 1 | Add through the dialog, immediate list and preview update, persistence | **Pass** | 1 |
| 2 | Validation on add and edit: empty, 101-char title, `javascript:`, `ftp:`, no scheme, 2049-char URL rejected; 100-char title + 2048-char URL accepted | **Pass** | 1 |
| 3 | Inline edit Save/Cancel/Escape (also right after adding), ⋮ menu keyboard | **Pass** | 1 |
| 4 | Delete confirmation (Cancel, Escape, Delete), stale second tab for edit and delete | **Pass** | 2 |
| 5 | Forged edit, delete and switch with another user's link id rejected; owner's link unchanged; signed out → `/login`, no handle → `/onboarding` | **Pass** | 1 |
| 6 | Link and footer visibility persisted, preview, preview settings not saved, copy URL, layouts at 1440/1024/900/780/375 without horizontal overflow | **Pass** | 1 |

**Fixes in this pass:**
- `qa:cleanup` deletes QA users' links (and, with `--orphaned-links`, owner-less links); logic moved to `src/lib/db/qa-cleanup.ts` with 35 tests.
- "That link no longer exists." on edit or delete (link removed in another tab) now closes the form/dialog, removes the row and shows the message as a toast; the actions also call `refresh()` on not-found. Before, the row could linger, and then the edit form vanished without a message.
- The Links tab now controls a `role="tabpanel"` (`aria-controls`/`aria-labelledby`).

**Final state:** 0 QA users, 0 QA links, 0 orphaned links, 0 rate-limit records in `linkbase_test`; QA server stopped; ports 3000 and 3100 free. Unit tests 286/286, lint, `tsc --noEmit` and `npm run build` pass.

### Public profile: passed on 2026-11-04 except real uploads (run `20261104t1250`)

Unit tests 433/433 (new: `profile-picture.test.ts`, `public-profile-mapping.test.ts`, `blob-token.test.ts`, picture cases in `qa-cleanup.test.ts`). Browser QA on `linkbase_test` with `npm run qa:server -- --no-uploads`, because `BLOB_READ_WRITE_TOKEN_TEST` is not set yet. `qa:server` without the flag still refuses, as intended.

- **Passed:** signed-out profile (handle, initials, active links only, newest first, `target="_blank"` + `rel="noopener noreferrer"`, no name/email/inactive link in the HTML); Share toast and clipboard; claim overlay dismiss; Explore Linkbase; 404 status for unknown valid handles (`qa1250two`, `no-such-handle`) and malformed ones (`A!`, `ab`, `%20`, 31 chars, `..%2Fdashboard`, `%3Cscript%3E`); link edit / switch off / delete and footer off reflected on reload; a cached 404 cleared when the handle is claimed; picture checks in the browser (GIF, SVG, > 2 MB, empty) and on the server with the browser checks bypassed (GIF, GIF named `.png`, text named `.png`, 2 MB + 1 byte, corrupt JPEG, 3 MB over the body limit); storage failure message; signed-out action calls refused; 390 / 834 / 1440 px layouts; auth and dashboard regressions.
- **Not tested:** a successful upload, replace and remove (needs the test Blob store token).
- **Fixed during QA:** explicit Blob token (OIDC precedence); friendly message for storage failures and rejected requests (the dashboard used to switch to the error page); `instant = false` on the profile page (dev-only validation errors); the phone preview now uses handle initials like the public page.

### Public profile: final verification on 2026-11-04 (run `20261104t1436` and follow-up)

- **Passed (browser, `linkbase_test`, `npm run qa:server -- --no-uploads`):** `/dashboard` loads with no runtime or dev-overlay error; a 3 MB upload with the browser checks bypassed is rejected by Next.js ("Body exceeded 2.2mb limit", before the action runs) and the panel shows a message instead of crashing; browser checks for GIF, SVG and > 2 MB; server checks (browser bypassed) for text named `.png`, 2 MB of GIF bytes named `.png`, SVG type and an empty file; storage-failure message for a valid JPEG; signed-out upload and remove refused (`/dashboard` → `/login?callbackUrl=%2Fdashboard`; on public routes the action never runs); `/user/<handle>` 200 without name or email; unknown valid and malformed handles 404.
- **Passed (unit, mocked where §2.1 says):** 488/488 in 13 files, including the 55 mocked tests in §2.1. Lint, `tsc --noEmit` and `npm run build` pass.
- **Fixed:** an old upload error no longer shows beside a newer one or comes back after Cancel; the remove dialog shows "Couldn't remove your picture right now…" instead of crashing the dashboard when the request fails; a failed database save after a successful Blob upload deletes the new file (no orphan); the claim overlay's close button is labelled "Dismiss the Linkbase sign-up banner".
- **Clean-up:** 0 QA users, 0 QA pictures, 0 QA links, 0 orphaned links, 0 rate-limit records; QA server stopped; ports 3000 and 3100 free.

### Pending: real Vercel Blob (not passed, needs credentials)

These are **not verified** and must not be read as passed. They need a Vercel account and two Blob stores, which the course covers in its Vercel lesson:

1. Add `BLOB_READ_WRITE_TOKEN` to `.env.local` and `BLOB_READ_WRITE_TOKEN_TEST` (a **second** store) to `.env.test`. **2026-11-07:** the dev token is in `.env.local` and the user verified uploads manually in `npm run dev` (upload, picture still shown after refresh). `BLOB_READ_WRITE_TOKEN_TEST` is **not set yet**, and the QA database login fails (§4), so steps 2–3 are still pending.
2. Run `npm run qa:server` without `--no-uploads`, then plan scenario 3: upload a JPEG, replace it with a PNG (old file gone from the test store), remove it (initials back), and check the picture on the dashboard, phone preview and `/user/<handle>`.
3. Run `npm run qa:cleanup -- --confirm` and check that QA pictures are deleted from the test store.
