# Routing

How Linkbase routes are organised in the App Router. Read this before adding or moving a route, layout, loading/error file, Route Handler or Server Action.

> **Status:** The landing page, auth pages and dashboard exist (§1). Everything else here is **planned**. Undecided details are marked **TBD**. Related: [`architecture.md`](architecture.md) (structure), [`auth.md`](auth.md) (route protection), [`coding-standards.md`](coding-standards.md) (exports and naming).

Terms and file conventions here were checked against the bundled docs for the installed Next.js 16.4.3 (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`).

## 1. What exists today

```
src/
  proxy.ts                      # optimistic auth redirects (auth.md §4)
  app/
    layout.tsx                  # root layout: <html>/<body>, fonts, globals.css
    page.tsx                    # /  landing page
    (auth)/
      layout.tsx                # Welcome-style form column, no auth check
      actions.ts                # signUp, logIn, logOut Server Actions
      login/page.tsx            # /login
      signup/page.tsx           # /signup
    (dashboard)/
      layout.tsx                # dashboard shell: SiteNav + user menu (display only)
      dashboard/page.tsx        # /dashboard, calls requireUser()
    api/auth/[...nextauth]/
      route.ts                  # Auth.js route handler (GET, POST)
```

- No dynamic segments, `loading.tsx`, `error.tsx` or `not-found.tsx` yet.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`, which affect how loading states and layouts behave (§5). `/` and `/dashboard` build as partial prerenders: a static shell, with the signed-in parts streamed behind `<Suspense>`.

## 2. Route map

```
src/app/
  user/
    [handle]/
      page.tsx                  # /user/[handle]  public profile (planned)
  (dashboard)/
    dashboard/
      …                         # add-links and other dashboard pages go here (planned)
```

| Route | Access | Status |
| --- | --- | --- |
| `/` landing page | Public | Exists |
| `/login`, `/signup` in `(auth)` | Public. Signed-in visitors are sent to `/dashboard` by Proxy | Exists |
| `/dashboard` in `(dashboard)` | Signed-in only | Exists (placeholder content) |
| Add-links page under `/dashboard/…` | Signed-in only | Planned. Exact path TBD |
| `src/app/api/auth/[...nextauth]` | Auth.js endpoints | Exists |
| `/user/[handle]` public profile | Public | Planned |
| Other `src/app/api/…` Route Handlers | Depends on handler | Planned. None decided |

## 3. Route groups

A folder in parentheses, like `(dashboard)`, is a **route group**. It organises files and can share a layout, but **adds nothing to the URL**.

Consequences for Linkbase:

- `src/app/(dashboard)/page.tsx` would resolve to `/`, which **conflicts** with the existing landing page `src/app/page.tsx`. Two groups that resolve to the same path cause a build error. Dashboard pages must sit under a real URL segment inside the group, e.g. `(dashboard)/<segment>/page.tsx`.
- Proxy matches **URLs, not folders**, so a shared URL prefix for dashboard pages makes protection simpler ([`auth.md`](auth.md) §3).
- The same applies to `(auth)`: its pages need distinct URLs that don't collide with other routes.

**Decided:** dashboard pages live under `(dashboard)/dashboard/`, giving the protected `/dashboard` prefix. Auth pages are `/login` and `/signup`; sign-out is the `logOut` action. **TBD:** the add-links path.

Keep one top-level root layout (`src/app/layout.tsx`). Giving each group its own root layout would force full page reloads when moving between groups. There is no plan for that.

## 4. Public routes

### `/` landing page
- `src/app/page.tsx`: the landing page.
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

> **Next.js 16:** Middleware is now **Proxy**. `src/proxy.ts` exists: it redirects signed-out visitors from `/dashboard/*` to `/login?callbackUrl=…` ([`auth.md`](auth.md) §4).

## 6. Auth pages: `(auth)`

- Holds sign-in and any other auth pages. These are public.
- `/login` and `/signup` exist. Signed-in users visiting them are redirected to `/dashboard` (Proxy).
- Only the credentials provider exists ([`auth.md`](auth.md) §2). Don't add pages for a provider that isn't decided (password reset, email verification and OAuth are not built).

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
| App mutations from Linkbase's own UI (create/update/delete links, profile edits) | **Server Action** (`"use server"`) | Auth actions: `src/app/(auth)/actions.ts`. Others TBD ([`architecture.md`](architecture.md) §4) |
| Reading data for pages | Server Components | Not an API route |

- Route Handlers export named HTTP-method functions (`GET`, `POST`, …), not a default export.
- Don't add `api/` routes for the app's own UI. Use Server Actions.
- Every Server Action checks auth and ownership ([`auth.md`](auth.md) §5). Route Handlers that touch user data respond `401` without a session. Webhook handlers verify the sender (method TBD per service).
- The Auth.js route handler counts as a third-party callback: `src/app/api/auth/[...nextauth]/route.ts`.
- **TBD:** which webhooks or third-party services exist (none decided).

## 9. Open decisions

| Decision | Status |
| --- | --- |
| Dashboard URL prefix and dashboard path | Decided: `/dashboard` |
| Add-links path | TBD |
| Auth page paths, and behaviour for signed-in visitors | Decided: `/login`, `/signup`; signed-in → `/dashboard` |
| `src/proxy.ts` and its matcher | Decided: `/dashboard/:path*`, `/login`, `/signup` |
| `/user/[handle]` prerendering, caching, handle validation | TBD |
| Which segments get `loading.tsx` / `error.tsx`. `global-error.tsx`, `not-found.tsx` | TBD |
| Auth.js route handler path | Decided: `src/app/api/auth/[...nextauth]/route.ts` |
| Webhooks / third-party callbacks | TBD |
| Server Action file location | TBD in general (auth: `src/app/(auth)/actions.ts`) |
