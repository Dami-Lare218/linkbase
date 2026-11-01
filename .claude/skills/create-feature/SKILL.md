---
name: create-feature
description: Implement an already-approved Linkbase feature plan. Use when the user asks to start building, implement, code, or "go ahead" with a feature whose plan was approved (e.g. "build it", "implement the approved plan", "start building the link editor", "let's code this feature"), typically right after the plan-feature skill saved the plan to plans/<current-branch>.md. Reads the saved plan and relevant Doc/ files, checks library APIs with Context7, writes application code only, then stops and reports back. Does not write tests, run QA, commit or push. If no approved plan exists, use plan-feature first.
---

# Create Feature

Build a feature exactly as described in its approved plan, then hand control back to the user.

## Hard rules

- Implement **only** what the approved plan describes. If something outside the plan seems needed (extra files, routes, fields, packages, refactors), stop and ask the user first.
- Write application code only. Do **not** write tests, run QA, or invoke the `write-tests` or `run-qa-suite` skills. The user triggers those.
- Do not commit or push.
- Do not edit `.env` or `.env.local` (a hook blocks this). If the feature needs env vars, list them for the user in the final report.
- Install only packages the approved plan lists. Ask before installing anything else.

## Step 1: Find the approved plan

1. Run `git branch --show-current`.
2. Read `plans/<current-branch>.md`. Branch names with a slash map to a subfolder, e.g. `feat/link-editor` → `plans/feat/link-editor.md`.
3. If that file doesn't exist, list what's in `plans/` and ask the user which plan to use. If there is no approved plan at all, stop and suggest running `/plan-feature` first. Don't implement without one.
4. If the plan has unresolved open questions, ask the user to settle them before writing code.

## Step 2: Read the docs

1. Always read `Doc/architecture.md` and `Doc/coding-standards.md`.
2. Read every doc listed in the plan's "Relevant docs" section, plus any that match the work:

   | Work involves… | Read |
   |---|---|
   | Models, queries, persisted data | `Doc/database.md` |
   | Sign-in, sessions, protected pages, ownership | `Doc/auth.md` |
   | Routes, layouts, loading/error files, Route Handlers | `Doc/routing.md` |
   | Loading data into pages, caching | `Doc/data-fetching.md` |
   | Creating/updating/deleting data, Server Actions | `Doc/data-mutations.md` |
   | Forms, Zod schemas, error boundaries, logging | `Doc/errors-and-validation.md` |
   | Secrets, headers, user content/links | `Doc/security.md` |
   | Components and screens | `Doc/ui.md`, `Doc/design-system.md` |
   | React components, pages, Server Components/Actions, data fetching | `vercel-react-best-practices` skill (`SKILL.md` + relevant `rules/` files) |

## Step 3: Check library docs

- Before writing code that uses an external library (Next.js, React, Mongoose, Auth.js, Zod, Tailwind, etc.), fetch its current docs with Context7 (`resolve-library-id`, then `query-docs`). Check the installed version in `package.json` first.
- For Next.js, also read the bundled docs in `node_modules/next/dist/docs/01-app/`. If they disagree with Context7, follow the bundled docs and mention the difference in the report.
- If Context7 has no entry or is unavailable, say so and name the fallback source used.

## Step 4: Implement

- Work through the plan's **Files** section: create and modify exactly those files.
- Follow `CLAUDE.md` conventions: App Router under `src/app/`, `@/*` imports, generated route prop types (`PageProps<...>`, `LayoutProps<...>`), Tailwind v4 via `globals.css` (never add `tailwind.config.js`), the `"use cache"` / Suspense model for data, and server-side auth plus `userId`-scoped queries for user data.
- Apply the `vercel-react-best-practices` CRITICAL/HIGH rules (`async-*`, `bundle-*`, `server-*`) while writing React/Next.js code. Where they conflict with the bundled Next.js docs or `Doc/`, those win.
- Don't touch unrelated files.
- When finished, run `npm run lint` and `npm run build` to catch lint and type errors, and fix any errors in the code you wrote. This is a compile check, not QA.

## Step 5: Stop and report

When the plan is fully implemented:

1. Stop. Don't start tests, QA or any follow-up work.
2. Report what was built in 2–3 lines. Mention any env vars the user must add, any deviation from the plan, and any lint/build issue you couldn't fix.
3. Hand control back to the user. They will run `write-tests` and `run-qa-suite` when ready.
