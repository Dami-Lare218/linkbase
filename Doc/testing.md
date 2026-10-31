# Testing

How Linkbase is tested: Vitest unit tests for pure logic, and Playwright MCP-driven QA for end-to-end behaviour against an isolated test database. Read this before writing a test, running QA, or touching test environment config.

> **Status: planned, mostly not set up.** Section 1 lists what is actually available. Everything else is a planned convention. Undecided details are marked **TBD**. Related: [`errors-and-validation.md`](errors-and-validation.md) (Zod schemas), [`data-mutations.md`](data-mutations.md) (Server Actions), [`database.md`](database.md), [`security.md`](security.md) (secrets, env files).

## 1. What exists today (verified)

| Item | State |
| --- | --- |
| **Vitest** | **Not installed.** Not in `package.json` or `node_modules`, no config |
| `test` script in `package.json` | None |
| Test files (`*.test.ts`, `*.spec.ts`) | None |
| **Playwright MCP** | **Available to Claude Code** as a user-level plugin (`playwright@claude-plugins-official`). Not configured in this repo: no `.mcp.json`, and nothing in `.claude/settings.json` |
| **`run-qa-suite` skill** | **Does not exist.** Not in `.claude/`, not in user skills, not among loaded skills |
| `.env.test` | Does not exist. If created, it is Git-ignored by the `.env*` rule in `.gitignore` |
| Test database | None. No database code exists yet ([`database.md`](database.md)) |
| Zod | Not installed ([`errors-and-validation.md`](errors-and-validation.md) §1) |

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

**TBD:** Vitest version and install, config file and settings (environment, resolving the `@/*` → `src/*` alias), `test` script name, coverage tooling, and whether CI runs it (no CI exists).

## 3. End-to-end QA: Playwright MCP

- End-to-end QA is done by **Claude Code driving a browser through the Playwright MCP** against a running Linkbase app.
- QA is run through the **`run-qa-suite` skill**. **It doesn't exist yet.** Creating it, and deciding what flows it covers and how it reports results, is **TBD**.
- **Server Actions are tested here**, through the real UI: sign-in, ownership rules, validation messages, revalidation. They aren't mocked in unit tests.

**Do not create:**
- an `e2e/` (or `/e2e`) folder,
- a `playwright.config.ts`,
- committed `*.spec.ts` files.

QA lives in the skill and MCP sessions, not in a Playwright test-runner setup.

**TBD:**
- How the app is started for QA (dev server vs production build, port).
- How QA signs in (auth providers are TBD, [`auth.md`](auth.md)).
- Test user accounts.
- Whether the Playwright MCP should be declared at project level.

## 4. Test database isolation (security requirement)

- QA runs against a **separate test database**, never the development or production database.
- The test connection string lives in **`MONGODB_URI_TEST`**, in **`.env.test`**.
- **Never commit `.env.test` with real credentials.** The Next.js docs suggest committing `.env.test`, but in Linkbase it holds a database credential, so it stays Git-ignored (the current `.env*` rule already does this). If it's ever documented for others, use placeholder values only, as with `.env.example` ([`security.md`](security.md) §2).
- **Never print, log or paste** the value of `MONGODB_URI_TEST` or any other connection string, including in QA output, screenshots or chat.

### How the app picks the test database

⚠️ **This is not solved yet.** Next.js loads `.env.test` **only when `NODE_ENV=test`**. `next dev` sets `NODE_ENV=development` and won't read `.env.test`. Also, when `NODE_ENV=test`, `.env.local` is not loaded. So a QA run against a normal `next dev` server would use the **development** database.

Before any QA touches data, decide:
- how the server under QA is started so it reads `.env.test`, and
- how the connection helper ([`database.md`](database.md) §4) uses `MONGODB_URI_TEST` in that mode. The dev variable name is still TBD.

Both are **TBD**.

### Fail safely

Test and QA setup must **refuse to run**, before connecting, when:
- `MONGODB_URI_TEST` is missing or empty,
- it is the same as the development or production connection string, or
- it doesn't point to an allowed test database. The rule for recognising one (e.g. a required database-name pattern or a host allow-list) is **TBD**.

The error message must name the problem **without printing the value**.

## 5. Test independence (all tests)

- **Every test or QA scenario runs on its own.** It creates the data it needs and doesn't rely on another test having run first.
- **No shared mutable state** between tests: no module-level variables, no reused records modified by several tests.
- **Order doesn't matter.** Tests pass in any order, alone or together.
- **Clean up** data a test created, in the **test database only**. Clean-up must never be able to touch dev or production data, so it's protected by the same safety checks as §4.
- **TBD:** clean-up approach (per-test deletion, unique per-run data, or reset between runs), and how test data is marked.

## 6. Open decisions

| Decision | Status |
| --- | --- |
| Install Vitest, version, config file, `test` script | TBD |
| Coverage tooling and thresholds | TBD |
| Create the `run-qa-suite` skill, its flows and reporting | TBD |
| Declare Playwright MCP at project level or keep user-level | TBD |
| How the QA server is started and made to read `.env.test` | TBD (**safety-critical**) |
| How the connection helper selects `MONGODB_URI_TEST` | TBD (**safety-critical**) |
| Rule for recognising a safe test database | TBD (**safety-critical**) |
| Test data clean-up strategy | TBD |
| QA sign-in method and test accounts | TBD |
| CI for tests | TBD (no CI exists) |
