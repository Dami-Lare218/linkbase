# Routing

How Linkbase routes are organised in the App Router. Read this before adding or moving a route, layout, loading/error file, Route Handler or Server Action.

> **Status:** Only the root layout and starter home page exist. Everything else here is **planned**. Undecided details are marked **TBD**. Related: [`architecture.md`](architecture.md) (structure), [`auth.md`](auth.md) (route protection), [`coding-standards.md`](coding-standards.md) (exports and naming).

Terms and file conventions here were checked against the bundled docs for the installed Next.js 16.4.3 (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`).

## 1. What exists today

```
src/app/
  layout.tsx     # root layout: <html>/<body>, Geist fonts, globals.css
  page.tsx       # "/": default create-next-app starter page
  globals.css
  favicon.ico
```

- One route: `/`, still the starter page (not the landing page yet).
- No route groups, dynamic segments, `loading.tsx`, `error.tsx`, `not-found.tsx`, `proxy.ts`, Route Handlers or Server Actions.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`, which affect how loading states and layouts behave (§5).

## 2. Planned route map

```
src/app/
  layout.tsx                    # root layout (exists)
  page.tsx                      # /  landing page (exists as starter; to be replaced)
  user/
    [handle]/
      page.tsx                  # /user/[handle]  public profile
  (auth)/
    layout.tsx                  # optional shared auth-page layout
    …                           # sign-in (and other auth pages): paths TBD
  (dashboard)/
    layout.tsx                  # dashboard shell (nav etc.)
    …                           # dashboard + add-links pages: paths TBD
  api/
    …                           # Route Handlers: webhooks and third-party callbacks only
```

| Route | Access | Status |
| --- | --- | --- |
| `/` landing page | Public | File exists (starter content) |
| `/user/[handle]` public profile | Public | Planned |
| Auth pages in `(auth)` (sign-in, …) | Public | Planned. URLs TBD |
| Dashboard page in `(dashboard)` | Signed-in only | Planned. URL TBD |
| Add-links page in `(dashboard)` | Signed-in only | Planned. URL TBD |
| `src/app/api/…` Route Handlers | Depends on handler | Planned. None decided |

## 3. Route groups

A folder in parentheses, like `(dashboard)`, is a **route group**. It organises files and can share a layout, but **adds nothing to the URL**.

Consequences for Linkbase:

- `src/app/(dashboard)/page.tsx` would resolve to `/`, which **conflicts** with the existing landing page `src/app/page.tsx`. Two groups that resolve to the same path cause a build error. Dashboard pages must sit under a real URL segment inside the group, e.g. `(dashboard)/<segment>/page.tsx`.
- Proxy matches **URLs, not folders**, so a shared URL prefix for dashboard pages makes protection simpler ([`auth.md`](auth.md) §3).
- The same applies to `(auth)`: its pages need distinct URLs that don't collide with other routes.

**TBD:** dashboard URL prefix, dashboard and add-links paths, auth page paths (sign-in, sign-out, others).

Keep one top-level root layout (`src/app/layout.tsx`). Giving each group its own root layout would force full page reloads when moving between groups. There is no plan for that.

## 4. Public routes

### `/` landing page
- `src/app/page.tsx`. Replace the starter content when the landing page is built. Contents TBD.
- Stays outside both route groups.

### `/user/[handle]` public profile
- `src/app/user/[handle]/page.tsx`. `[handle]` is a **dynamic segment**.
- Type props with `PageProps<"/user/[handle]">`. `params` is a Promise: `const { handle } = await props.params`.
- No sign-in required. Show public data only ([`auth.md`](auth.md) §7).
- For an unknown handle, call `notFound()` (optionally with a `not-found.tsx` in that segment).
- **TBD:** handle format and validation, whether profiles are prerendered (`generateStaticParams`) or rendered on demand, and caching ([`database.md`](database.md) §8).

## 5. Authenticated routes: `(dashboard)`

- Holds the dashboard and add-links pages. Every page here requires a signed-in user.
- **Unauthenticated users are redirected to sign-in.** Do the check in each page or its data function, using the auth helper ([`auth.md`](auth.md) §4). An optional `src/proxy.ts` can redirect early, but it is not the security boundary.
- **Don't rely on `(dashboard)/layout.tsx` for the auth check.** Layouts don't re-run on client-side navigation and don't stop child pages from rendering. The layout may *display* user info.
- With Cache Components on, a layout that reads the session (runtime data) must wrap that read in its own `<Suspense>`, or the build errors. Prefer reading the session in pages.

> **Next.js 16:** Middleware is now **Proxy** (`src/proxy.ts`). `middleware.ts` is deprecated. Whether to add it is TBD ([`auth.md`](auth.md) §4).

## 6. Auth pages: `(auth)`

- Holds sign-in and any other auth pages. These are public.
- Signed-in users visiting them: redirect to the dashboard or show the page? **TBD.**
- Which pages exist depends on the Auth.js providers and setup, which are **TBD** ([`auth.md`](auth.md) §2). Don't add pages for a provider that isn't decided.

## 7. `layout.tsx`, `loading.tsx`, `error.tsx`

Add them only where a segment needs them.

| File | Use in Linkbase | Notes (Next.js 16.4) |
| --- | --- | --- |
| `layout.tsx` | Root (exists). `(dashboard)` shell. Optionally `(auth)` | Wraps child segments and persists across navigation. Not re-rendered on navigation, so no auth checks here |
| `loading.tsx` | Segments with slow data: likely `(dashboard)` pages and `/user/[handle]` | Wraps the segment's `page` (and nested layouts) in `<Suspense>`. Does **not** cover the layout in the same segment. Keep it lightweight |
| `error.tsx` | `(dashboard)` and `/user/[handle]`, at minimum | **Must be a Client Component** (`"use client"`). Receives `error` (typed `unknown`, so narrow it) and `retry`. Doesn't catch errors in the same segment's layout. Place it one level up for that |
| `global-error.tsx` | Optional, at `src/app/` | Catches root-layout errors. Must render its own `<html>`/`<body>` and doesn't get global styles. Whether to add it is TBD |
| `not-found.tsx` | Optional, e.g. for unknown handles | Rendered by `notFound()` |

These route files use **default exports** (required by Next.js). That's the one exception in [`coding-standards.md`](coding-standards.md) §6. Give the export a name.

**TBD:** exact segments that get `loading.tsx` / `error.tsx`, and the loading and error UI ([`ui.md`](ui.md)).

## 8. Route Handlers vs Server Actions

| Use | Mechanism | Location |
| --- | --- | --- |
| Webhooks, third-party callbacks (e.g. OAuth callbacks) | **Route Handler** (`route.ts`) | Under `src/app/api/…` only |
| App mutations from Linkbase's own UI (create/update/delete links, profile edits) | **Server Action** (`"use server"`) | Location TBD ([`architecture.md`](architecture.md) §4) |
| Reading data for pages | Server Components | Not an API route |

- Route Handlers export named HTTP-method functions (`GET`, `POST`, …), not a default export.
- Don't add `api/` routes for the app's own UI. Use Server Actions.
- Every Server Action checks auth and ownership ([`auth.md`](auth.md) §5). Route Handlers that touch user data respond `401` without a session. Webhook handlers verify the sender (method TBD per service).
- The Auth.js route handler (if the chosen version needs one) counts as a third-party callback and belongs under `src/app/api/`. Its exact path is **TBD** ([`auth.md`](auth.md) §2).
- **TBD:** which webhooks or third-party services exist (none decided).

## 9. Open decisions

| Decision | Status |
| --- | --- |
| Dashboard URL prefix, dashboard and add-links paths | TBD |
| Auth page paths, and behaviour for signed-in visitors | TBD |
| Whether to add `src/proxy.ts`, and its matcher | TBD |
| `/user/[handle]` prerendering, caching, handle validation | TBD |
| Which segments get `loading.tsx` / `error.tsx`. `global-error.tsx`, `not-found.tsx` | TBD |
| Auth.js route handler path | TBD |
| Webhooks / third-party callbacks | TBD |
| Server Action file location | TBD |
