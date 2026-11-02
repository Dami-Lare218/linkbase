---
name: write-tests
description: Write unit tests for a Linkbase feature following Doc/testing.md. Use when the user asks to write, add or create tests for a feature or a file (e.g. "write tests for auth", "add tests for the link editor", "write the unit tests", "test the signup validation"), typically after create-feature has built it. Reads Doc/testing.md first, then writes Vitest `*.test.ts` files next to the code under test, for pure functions and Zod schemas only. Writes tests only: does not run them, run QA, or commit. Then stops and reports back.
---

# Write Tests

Write the unit tests for a feature exactly as `Doc/testing.md` defines them, then hand control back to the user.

## Hard rules

- Write test files only. Do **not** change application code, configs, `package.json` or docs. If code looks untestable or buggy, note it in the report instead of fixing it.
- Do **not** run the tests, run QA, start the dev server, or invoke the `run-qa-suite` skill. The user triggers those.
- Do not commit or push.
- Do not install packages. If Vitest isn't set up (see Step 1), stop and ask.
- Never read, print or copy env files or connection strings. Unit tests never touch a database.
- Follow `Doc/testing.md` over this skill if they disagree.

## Step 1: Read the testing doc and check the setup

1. Read `Doc/testing.md` in full. It defines what gets unit-tested, where tests live and how they're written.
2. Check that Vitest is actually set up: `vitest` in `package.json`, a config file and a `test` script. If it isn't, **stop**. Tell the user Vitest must be installed and configured first (an open decision in `Doc/testing.md` §6) and ask how to proceed. Don't install it yourself.
3. Look at any existing `*.test.ts` files and match their style.

## Step 2: Find the feature's code

1. Run `git branch --show-current` and read the feature's plan if there is one: `plans/<current-branch>.md` (a slash maps to a subfolder, e.g. `feat/auth` → `plans/feat/auth.md`) or `plans/feature-<name>.md`. Use its Files section to find the feature's code.
2. If there is no plan, ask the user which feature or files to test.
3. Read `Doc/coding-standards.md`, plus `Doc/errors-and-validation.md` when testing Zod schemas.

## Step 3: Choose what to test

Per `Doc/testing.md` §2, unit tests cover **only**:
- pure functions (no database, network, session, cookies or Next.js runtime),
- Zod validation schemas.

**Do not** unit-test Server Actions, Route Handlers, Mongoose models, pages or components by mocking auth, the database or Next.js. They're covered by QA. Skip `server-only` modules unless the function under test is pure and importable without the Next.js runtime; if it can't be imported, list it as skipped in the report.

## Step 4: Check library docs

Before writing Vitest or Zod code, fetch current docs with Context7 (`resolve-library-id`, then `query-docs`) for the versions in `package.json`. If Context7 has no entry or is unavailable, say so and name the fallback source used.

## Step 5: Write the tests

- **Location and name:** next to the file under test, as `<file>.test.ts` (e.g. `src/lib/validation/auth.ts` → `src/lib/validation/auth.test.ts`).
- **Schemas:** test valid and invalid input, and assert the field-level error messages the forms show.
- **Pure functions:** cover normal cases, edge cases and boundary values (e.g. min/max lengths).
- **Independent:** each test builds its own data. No shared mutable state, no reliance on run order. Reset mocks or timers in the test or in `beforeEach`/`afterEach`.
- **Standards:** TypeScript strict, no `any`, no `@ts-ignore`, `@/*` imports, `async`/`await`.
- Never create an `e2e/` folder, a `playwright.config.ts` or `*.spec.ts` files.

## Step 6: Stop and report

1. Stop. Don't run the tests or start QA.
2. Report what was added in 2–3 lines: the test files created and what they cover. Mention anything skipped and why, and any likely bug you noticed.
3. Hand control back to the user. They will run the tests and `run-qa-suite` when ready.
