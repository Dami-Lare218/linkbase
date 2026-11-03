# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

Linkbase has a landing page (`/`), a MongoDB connection with `User` and `AuthAttempt` models, and email + password authentication (NextAuth v5): `/login`, `/signup`, a protected placeholder `/dashboard`, and a user menu in the header. Links and public profiles are not built yet. Vitest unit tests cover the auth validation schemas; end-to-end QA runs through the `run-qa-suite` skill against an isolated test database.

## Commands

- `npm run dev` — dev server at http://localhost:3000 (Turbopack)
- `npm run build` — production build (also the main type-check, since there is no separate `tsc` script)
- `npm run start` — serve the production build
- `npm run lint` — ESLint 9 flat config (`eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript)
- `npm run test` — Vitest unit tests (`vitest run`, single run). Config in `vitest.config.mts`; tests are `src/**/*.test.ts` beside the file they test. Unit tests only: no database access.
- `npm run qa:server` — QA server on http://localhost:3100, connected **only** to the test database (`MONGODB_URI_TEST` in `.env.test`). Refuses to start if the safety checks fail (`Doc/testing.md` §4). Stop `npm run dev` first.
- `npm run qa:cleanup` — dry run of QA-data clean-up on the test database; add `-- --confirm` to delete QA users (`qa+…@linkbase.test`) and rate-limit records.
- `npm run qa:stop` — stops the QA server started by `qa:server` (the launcher and its `next dev`, verified by PID and command line) and waits for port 3100 to be free. Use it instead of killing the background task, which on Windows leaves `next dev` running. Never touches other processes or the database.

## Stack and conventions

- **Next.js 16.4 / React 19.3, App Router only**, source under `src/app/`. Import alias `@/*` → `src/*`.
- **Next.js has breaking changes vs. older versions** (see AGENTS.md above). Before writing Next-specific code, check the bundled docs in `node_modules/next/dist/docs/` (`01-app/` is the relevant section) rather than relying on memory.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`. With Cache Components on, data fetching/caching follows the `"use cache"` / Suspense model — read the docs on this before adding data fetching.
- Route props use the generated global types (e.g. `LayoutProps<"/">` in `layout.tsx`, likewise `PageProps<...>`), not hand-written prop interfaces.
- **Tailwind CSS v4**, CSS-first config: no `tailwind.config.js`. Theme tokens live in `src/app/globals.css` via `@theme inline`; CSS is processed through the `@tailwindcss/turbopack` loader configured in `next.config.ts` (not PostCSS). Light/dark colors are CSS variables (`--background`, `--foreground`) switched by `prefers-color-scheme`. The design docs in `Doc/` contain legacy Tailwind v3 config examples; never add a `tailwind.config.js`. See the v4 compatibility note in `Doc/design-system.md` §0.
- Fonts: Geist / Geist Mono via `next/font/google`, exposed as `--font-geist-sans` / `--font-geist-mono`.
- **Database:** MongoDB + Mongoose 9. Connection helper `connectToDatabase()` in `src/lib/db/connect.ts`, models in `src/lib/db/models/`, `MONGODB_URI` in `.env.local`. Test-database selection and safety checks in `src/lib/db/database-target.ts` (QA only, via `LINKBASE_DB_TARGET=test`). See `Doc/database.md` for the connection, schema, index and user-ownership rules before writing any data code.
- **Auth:** NextAuth (Auth.js) `5.0.0-beta.32`, credentials provider, JWT sessions, `AUTH_SECRET` in `.env.local`. Helpers in `src/lib/auth/` (`getCurrentUser()`, `requireUser()`), Proxy in `src/proxy.ts`. Validation with Zod 4 in `src/lib/validation/`. See `Doc/auth.md` before adding a protected page or Server Action.

## Live Docs (Context7)

- **Before writing code that uses Next.js, Mongoose, NextAuth (Auth.js), Zod or any other external library, fetch that library's current documentation through Context7 first.**
- Use Context7 to verify API signatures, configuration options and version-specific behavior for the version this project uses (check `package.json`).
- Do not rely on training data alone for these details.
- If Context7 has no documentation entry for a library (or the Context7 server is unavailable), say so clearly before proceeding, and name the fallback source used.
- For Next.js, this is in addition to the bundled docs in `node_modules/next/dist/docs/` (see **Stack and conventions**). Those match the installed version exactly; if they disagree with Context7, follow the bundled docs and point out the difference.

## Skills

Project skills live in `.claude/skills/`. Use them at these moments:

- **`plan-feature`**: before building any new feature (plans, scopes, gets approval).
- **`create-feature`**: only after a plan has been explicitly approved.
- **`write-tests`**: when asked to write or add tests for a feature. Writes Vitest unit tests per `Doc/testing.md`; doesn't run them, run QA or commit. Vitest is installed; run the tests with `npm run test`.
- **`run-qa-suite`**: when asked to run QA or test a feature end to end. Starts `npm run qa:server` (test database only), runs the plan's QA Scenarios through the Playwright MCP with throwaway `qa+…@linkbase.test` accounts, fixes failing application code and retries (max 3 attempts per failure, then stops and reports the blocker), reports Pass/Fail/Blocked, cleans up QA data and stops the server with `npm run qa:stop`. Never commits or pushes.
- **`vercel-react-best-practices`**: whenever writing, reviewing or refactoring React components, Next.js pages/layouts, Server Components, Server Actions or data fetching, and for any performance or bundle-size work. Read its `SKILL.md`, then only the `rules/*.md` files relevant to the task (not the full `AGENTS.md`). Prioritise the CRITICAL/HIGH rules (`async-*`, `bundle-*`, `server-*`).
  - **Precedence:** bundled Next.js docs → `Doc/` files → this skill. If the skill suggests a pattern the project doesn't use (e.g. SWR, LRU caches, older caching APIs), follow `Doc/data-fetching.md` and the `"use cache"` model instead, and point out the difference.
  - **Sync:** the skill was installed with `npx skills` into `.agents/skills/` (tracked in `skills-lock.json`) and mirrored to `.claude/skills/vercel-react-best-practices/`, which is the copy Claude Code loads. After updating the skill, re-copy the folder.

## Doc Convention

Project documentation lives in `Doc/`. Whenever a new file is added to `Doc/`, add it to **Project Docs** below with one line on what it covers and when to read it. Keep the list in sync if a doc is renamed or removed.

## Project Docs

- [`Doc/design-system.md`](Doc/design-system.md) — Design tokens and visual foundations (colour, typography, spacing, radii, shadows, motion) with Tailwind mappings and confidence labels. Read before choosing any colour, font, spacing or other styling value. Its Tailwind examples are legacy v3; follow its §0 "Tailwind CSS v4 compatibility" note instead, and note that its source files are not in this repo (values unverified).
- [`Doc/ui.md`](Doc/ui.md) — The 23 UI components, their states and props, the shared interaction model (hover/press/focus/disabled) and screen layout patterns. Read before building or changing any component or screen.
- [`Doc/architecture.md`](Doc/architecture.md) — Intended folder structure (`src/lib`, `src/components/ui`, `src/components/[feature]`), Server vs Client Component rules, naming conventions and open (TBD) technical decisions, separated from what exists today. Read before adding a route, component, shared module or Server Action.
- [`Doc/database.md`](Doc/database.md) — MongoDB + Mongoose. Implemented: the cached `connectToDatabase()` helper, the dev vs QA database target with test-database safety checks (`database-target.ts`), and the `User` and `AuthAttempt` models. Planned: other collections and how `userId` is stored on user-owned data. Also defines the `src/lib/db/` layout and the strict-schema, index and user-data ownership rules every new model must follow. Read before adding a model, a query or a Server Action that touches data.
- [`Doc/auth.md`](Doc/auth.md) — NextAuth (Auth.js) v5. Implemented: email + password sign-up/sign-in/sign-out, JWT sessions, the protected `(dashboard)` route group, `src/proxy.ts` (optimistic redirects only) and `getCurrentUser()`/`requireUser()`. Planned: public `/user/[handle]` profiles. Also defines the Proxy → server auth check → `userId`-scoped query layers, the Server Action pattern and unauthenticated handling, and notes the session-revocation limitation. Read before adding a protected route, a public page, a Server Action or any query on user data.
- [`Doc/coding-standards.md`](Doc/coding-standards.md) — TypeScript, linting/formatting, import order, component, export, async and error-handling standards, marking which are enforced by current config (strict TS, no `any`, no `@ts-ignore`) and which are not yet (Prettier is not installed). Read before writing or reviewing any TypeScript or React code.
- [`Doc/routing.md`](Doc/routing.md) — Existing vs planned routes: public `/` and `/user/[handle]`, the `(dashboard)` and `(auth)` route groups, where to use `layout`/`loading`/`error` files, and Route Handlers (`src/app/api/` for webhooks/callbacks only) vs Server Actions. Read before adding or moving a route, layout, loading/error file, Route Handler or Server Action.
- [`Doc/errors-and-validation.md`](Doc/errors-and-validation.md) — Planned Zod validation at the Server Action boundary (`src/lib/validation/`), typed results for inline field errors, throwing unexpected errors to `error.tsx`, safe logging and keeping internal errors off the client. Zod is not yet a project dependency. Read before writing a Server Action, a form, an error boundary or any error logging.
- [`Doc/data-fetching.md`](Doc/data-fetching.md) — Planned data reads: Server Components call the data layer directly (no self-`fetch` to `/api`), `userId`-scoped private queries, public-only profile fields, Next.js 16 caching (`"use cache"`/`cacheTag`/`cacheLife`; `unstable_cache` is replaced) and invalidation (`updateTag`, two-argument `revalidateTag`). Read before writing a query, a data-loading page, a cached function or a mutation that refreshes cached data.
- [`Doc/data-mutations.md`](Doc/data-mutations.md) — Planned write path: all writes via Server Actions in a fixed order (authenticate → Zod validate → `userId` ownership → write → revalidate → typed result), expected vs unexpected failures, revalidation choices and a new-action checklist. Read before writing or changing any Server Action or code that creates, updates or deletes data.
- [`Doc/security.md`](Doc/security.md) — Verified current protections vs planned conventions: env vars and `.env.example` (note `.gitignore`'s `.env*` also ignores it), security headers via `next.config.ts` and the CSP strategy trade-off with Cache Components (none configured yet), rate limiting (implemented for sign-in and sign-up; other actions TBD), untrusted content and URL validation, `noopener noreferrer`, server-side auth checks, the known JWT session-revocation limitation (§7.1, not fixed), and safe logs/responses. Read before handling secrets, changing headers, rendering user content or links, or adding sign-in or link-creation flows.
- [`Doc/git-conventions.md`](Doc/git-conventions.md) — Branch naming (`<type>/<feature>`), Conventional Commits (`feat`/`fix`/`docs`/`refactor`/`test`/`chore`), PR-only changes to `main`, human review required (Claude Code never approves or merges its own work), what never gets committed, and which GitHub settings are still unverified. Read before creating a branch, committing, opening a PR or merging.
- [`Doc/testing.md`](Doc/testing.md) — Testing: Vitest unit tests (`*.test.ts` beside the file) for pure functions and Zod schemas, Playwright MCP QA via the `run-qa-suite` skill (no `e2e/`, no `playwright.config.ts`, no committed `.spec.ts`), isolated test database via `MONGODB_URI_TEST` in `.env.test` with fail-safe checks, and test independence. Vitest 4.1.12 is set up (`vitest.config.mts`, `npm run test`) with passing auth validation tests. The `write-tests` and `run-qa-suite` skills exist; QA uses `npm run qa:server` / `npm run qa:stop` / `npm run qa:cleanup` with `MONGODB_URI_TEST` in `.env.test` and the `_test` safety checks in `src/lib/db/database-target.ts`. §7 records the QA infrastructure verification (all six plan scenarios passed on 2026-11-03). Read before writing a test, running QA or changing test env config.
