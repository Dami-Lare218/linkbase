# Architecture

How Linkbase code is organised and named. Read this before adding a route, component, shared module or Server Action.

> **Status:** Most of this document describes the **intended** architecture. The project is still a fresh `create-next-app` scaffold. Section 1 lists what exists today; everything else is a convention to follow as code is added. Undecided items are marked **TBD**. Do not fill them in without an explicit decision.

## 1. What exists today

```
src/
  app/
    layout.tsx     # root layout (Geist fonts, globals.css)
    page.tsx       # default starter page
    globals.css    # Tailwind v4 import + theme tokens
    favicon.ico
  lib/
    db/
      connect.ts   # cached MongoDB connection (connectToDatabase)
public/            # starter SVGs
Doc/               # project docs
```

- Next.js 16.4.3, React 19.3.0, Tailwind CSS v4. Database: `mongoose` ^9 and `server-only`.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`.
- Import alias `@/*` → `src/*`.
- `src/lib/db/connect.ts`: the MongoDB connection helper `connectToDatabase()` ([`database.md`](database.md) §4). No models yet.
- **Not present yet:** `src/components/`, Server Actions, database models, authentication, API routes and tests.

## 2. Routing: App Router

- Use the **App Router** only. Do not add a `pages/` directory.
- Routes live under `src/app/`, using Next's file conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`, etc.).
- Type route props with the generated global helpers (`PageProps<"/path">`, `LayoutProps<"/path">`), not hand-written interfaces.
- This Next.js version differs from older releases. Check `node_modules/next/dist/docs/01-app/` before writing Next-specific code.

## 3. Server and Client Components

- **Server Components are the default.** Every component is a Server Component unless it needs to be a Client Component.
- Add `"use client"` only when a component needs interactivity or browser-only features, such as state, effects, event handlers or browser APIs.
- Keep the `"use client"` boundary as low in the tree as possible. Wrap just the interactive part, not the whole page.
- Fetch data in Server Components. With `cacheComponents` on, data fetching follows the `"use cache"` / `<Suspense>` model. Read `01-getting-started/06-fetching-data.md` and `08-caching.md` in the bundled docs before adding any.

## 4. Folder structure (intended)

Paths are relative to `src/`, matching the `@/*` alias (so `/lib` means `src/lib`, imported as `@/lib/...`).

```
src/
  app/                  # routes (exists)
  components/
    ui/                 # UI primitives: generic, feature-agnostic
    [feature]/          # components for one feature only
  lib/
    db/                 # database connection helper + models/ (planned, see database.md)
    <auth>/             # auth helpers (planned, see auth.md; folder name TBD)
    <types>/            # shared TypeScript types
```

| Location | Holds | Rule |
| --- | --- | --- |
| `components/ui/` | Reusable primitives (the base components in [`ui.md`](ui.md)) | No feature or business logic. Styled with tokens from [`design-system.md`](design-system.md). |
| `components/[feature]/` | Components used by one feature | Name the folder after the feature. If a component is used by several features, move it to `ui/` when it is generic, or ask where it should live. |
| `lib/` | Shared non-UI code | Database client, auth helpers and shared types each get **their own folder**. |

**TBD:**
- Auth and types folder names inside `lib/` (`<auth>`, `<types>` above are placeholders). The database folder is planned as `lib/db/`, see [`database.md`](database.md).
- The list of features, which sets the `components/[feature]/` folders.
- Where Server Action files live (for example co-located with routes or in a shared folder).
- Where tests live (no test runner is configured).

## 5. Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Files and folders | kebab-case | `components/ui/icon-button.tsx` |
| React components | PascalCase | `export function IconButton() {}` |
| Server Actions | verb-first camelCase | `createLink`, `updateProfile`, `deleteCollection` |

- Next.js special files keep their required names (`page.tsx`, `layout.tsx`, `route.ts`, …).
- Server Actions start with a verb that says what they do (`create`, `update`, `delete`, `add`, `remove`, …). Avoid noun-first names like `linkCreate`.
- The examples above only show the format. They are not decided features or actions.

## 6. Server Actions

- Mark them with `"use server"` (at the top of the file or inside the function body).
- Server Actions can be called by direct POST requests, not only from the UI. **Check authentication and authorization inside every action** once auth exists. The planned pattern is in [`auth.md`](auth.md) §5. See also `02-guides/` data-security and server-actions docs in the bundled Next.js docs.

## 7. Undecided (TBD)

| Decision | Status |
| --- | --- |
| Database / ORM provider | Planned: MongoDB + Mongoose, not implemented. See [`database.md`](database.md) |
| Authentication provider | Planned: NextAuth (Auth.js), not implemented. See [`auth.md`](auth.md) (providers, session strategy and config still TBD there) |
| API surface (Route Handlers, external APIs) | TBD |
| Validation library | Planned: Zod at the Server Action boundary, schemas in `src/lib/validation/`. Not installed. See [`errors-and-validation.md`](errors-and-validation.md) |
| Test runner and test location | TBD |
| Hosting / deployment target | TBD |
| `lib/` auth/types folder names and Server Action file location | TBD (`lib/db/` is planned, see [`database.md`](database.md)) |

Update this table and the sections above when a decision is made.
