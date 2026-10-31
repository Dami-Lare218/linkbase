---
name: plan-feature
description: Plan and scope a new Linkbase feature before any code is written. Use whenever the user asks to plan, scope, design, spec out, or begin/start/kick off a new feature (e.g. "let's plan the link editor", "scope out sign-in", "I want to start building public profiles", "how should we build X?"). Runs in Plan Mode, reads the relevant Doc/ files, produces a short technical plan listing the files to create or modify and ending with QA Scenarios, waits for explicit approval, then saves the approved plan to plans/<current-branch>.md. Must run before implementing any new feature.
---

# Plan Feature

Plan a new Linkbase feature and get the user's approval before any implementation starts.

## Hard rules

- Do **not** create or modify application code (anything under `src/`, config files, `package.json`, etc.) until the user has explicitly approved the plan.
- Approval must be explicit: the user approves the plan in the Plan Mode prompt, or says something like "approved", "go ahead" or "looks good, build it". Silence, questions or partial comments are not approval.
- If the user asks for changes, revise the plan and ask for approval again. Repeat until approved.
- Do not install packages, commit or push as part of planning.

## Step 1: Enter Plan Mode

Call the `EnterPlanMode` tool (load it with `ToolSearch` using `select:EnterPlanMode,ExitPlanMode` if it is deferred). If Plan Mode is already active, continue. While in Plan Mode, only read and explore: no file edits.

## Step 2: Inspect the project and docs

1. Look at the current project structure (`src/`, `src/app/`, `src/lib/`, `src/components/`) to see what already exists. Linkbase is still close to a fresh scaffold, so check, don't assume.
2. Always read `Doc/architecture.md` (folder structure, Server vs Client Component rules, naming).
3. Read the docs that match the feature area:

   | Feature touches… | Read |
   |---|---|
   | Models, queries, persisted data | `Doc/database.md` |
   | Sign-in, sessions, protected pages, ownership | `Doc/auth.md` |
   | New routes, layouts, loading/error files, Route Handlers | `Doc/routing.md` |
   | Loading data into pages, caching | `Doc/data-fetching.md` |
   | Creating/updating/deleting data, Server Actions | `Doc/data-mutations.md` |
   | Forms, Zod schemas, error boundaries, logging | `Doc/errors-and-validation.md` |
   | Secrets, headers, user content/links, rate limiting | `Doc/security.md` |
   | Components and screens | `Doc/ui.md`, `Doc/design-system.md` |
   | Any TypeScript/React code | `Doc/coding-standards.md` |
   | Tests | `Doc/testing.md` |

4. For Next.js-specific behaviour, check the bundled docs in `node_modules/next/dist/docs/01-app/`. For external libraries (Next.js, Mongoose, Auth.js, Zod, etc.), follow the Context7 rule in `CLAUDE.md`.
5. If something the feature needs is marked "planned" or "TBD" in the docs (e.g. MongoDB, Auth.js, Zod are not installed yet), call that out in the plan as a prerequisite or open question.

## Step 3: Write the plan

Keep it short and technical. Use this structure:

```markdown
# Feature: <name>

## Goal
One or two sentences on what the user gets.

## Relevant docs
- `Doc/architecture.md`: <what applies>
- `Doc/<area>.md`: <what applies>

## Approach
Short bullets: routes, Server vs Client Components, data flow, auth checks, validation, caching/revalidation.

## Files
**Create**
- `path/to/file.ts`: purpose
**Modify**
- `path/to/file.ts`: what changes

## Prerequisites and open questions
- Packages or env vars needed (to be installed only after approval), decisions the user must make.

## QA Scenarios
1. <User does X> → <what should happen>.
2. ...
```

### QA Scenarios rules

- Always the last section, titled exactly `QA Scenarios`.
- 3–6 scenarios, each a single line: what the user does → what should happen.
- Cover: the happy path, auth boundaries (signed-out user, user accessing someone else's data), validation (invalid or missing input), and relevant edge cases (empty state, duplicates, long input, etc.).

## Step 4: Ask for approval

Present the plan with `ExitPlanMode`. This shows it to the user for approval.

- **Approved:** go to Step 5.
- **Changes requested or rejected:** stay in planning, revise the plan, and present it again with `ExitPlanMode`. Do not touch application code in between.

## Step 5: Save the approved plan (before implementation)

1. Get the branch: `git branch --show-current`.
   - If it prints nothing (detached HEAD), ask the user which name to use.
2. Save the approved plan exactly as approved to `./plans/<current-branch>.md`.
   - Create the `plans/` directory if it doesn't exist.
   - Branch names like `feat/link-editor` contain a slash, so the file goes to `plans/feat/link-editor.md`. Create the parent folder too.
   - If the file already exists, ask the user whether to overwrite it or append the new plan.
3. Tell the user where the plan was saved.
4. Only then start implementation, following the saved plan.
