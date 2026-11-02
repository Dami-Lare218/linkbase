# Architecture

How Linkbase code is organised and named. Read this before adding a route, component, shared module or Server Action.

> **Status:** Section 1 lists what exists today. The rest are conventions to follow as code is added. Undecided items are marked **TBD**. Do not fill them in without an explicit decision.

## 1. What exists today

```
src/
  proxy.ts                 # Auth.js optimistic redirects (auth.md §4)
  app/
    layout.tsx             # root layout (Archivo + Geist fonts, globals.css)
    page.tsx               # / landing page
    globals.css            # Tailwind v4 import + theme mappings
    (auth)/                # /login, /signup, layout, actions.ts (signUp, logIn, logOut)
    (dashboard)/           # layout (SiteNav) + dashboard/page.tsx (/dashboard)
    api/auth/[...nextauth]/route.ts   # Auth.js route handler
  components/
    ui/                    # Button, Input, Avatar, Wordmark, SiteNav, MobileMenu, …
    landing/               # landing page sections
    auth/                  # login/signup forms, HeaderAuth, UserMenu
  lib/
    auth/                  # Auth.js config, session helpers, password, rate limit
    db/                    # connect.ts + models/ (User, AuthAttempt)
    validation/            # Zod schemas (auth.ts)
    types/                 # shared types (FormState, Auth.js session type)
  styles/tokens.css        # design tokens
Doc/                       # project docs
```

- Next.js 16.4.3, React 19.3.0, Tailwind CSS v4. Data: `mongoose` ^9, `server-only`. Auth: `next-auth` 5 (beta), `bcryptjs`. Validation: `zod` 4. Icons: `lucide-react`.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`.
- Import alias `@/*` → `src/*`.
- **Not present yet:** tests, links and public profiles.

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
    auth/               # auth helpers (see auth.md)
    validation/         # Zod schemas
    types/              # shared TypeScript types
```

| Location | Holds | Rule |
| --- | --- | --- |
| `components/ui/` | Reusable primitives (the base components in [`ui.md`](ui.md)) | No feature or business logic. Styled with tokens from [`design-system.md`](design-system.md). |
| `components/[feature]/` | Components used by one feature | Name the folder after the feature. If a component is used by several features, move it to `ui/` when it is generic, or ask where it should live. |
| `lib/` | Shared non-UI code | Database client, auth helpers and shared types each get **their own folder**. |

**TBD:**
- The list of features, which sets the `components/[feature]/` folders.
- Where Server Action files live in general. So far they sit beside their route group (`src/app/(auth)/actions.ts`).
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
| Database / ORM provider | Decided: MongoDB + Mongoose. See [`database.md`](database.md) |
| Authentication provider | Decided: NextAuth (Auth.js) v5, email + password, JWT sessions. See [`auth.md`](auth.md) |
| API surface (Route Handlers, external APIs) | TBD |
| Validation library | Decided: Zod 4 at the Server Action boundary, schemas in `src/lib/validation/`. See [`errors-and-validation.md`](errors-and-validation.md) |
| Test runner and test location | TBD |
| Hosting / deployment target | TBD |
| `lib/` folder names | Decided: `auth/`, `db/`, `validation/`, `types/` |
| Server Action file location | TBD in general (auth actions: `src/app/(auth)/actions.ts`) |

Update this table and the sections above when a decision is made.
