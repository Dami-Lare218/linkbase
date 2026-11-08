# Routing

How Linkbase routes are organised in the App Router. Read this before adding or moving a route, layout, loading/error file, Route Handler or Server Action.

> **Status:** The landing page, auth pages, onboarding, dashboard and public profile `/user/[handle]` exist (§1). Everything else here is **planned**. Undecided details are marked **TBD**. Related: [`architecture.md`](architecture.md) (structure), [`auth.md`](auth.md) (route protection), [`coding-standards.md`](coding-standards.md) (exports and naming).

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
      layout.tsx                # ink shell behind the app canvas (display only)
      dashboard/page.tsx        # /dashboard, calls requireOnboardedUser()
    onboarding/
      page.tsx                  # /onboarding: pick a handle (requireUser(); has a handle → /dashboard)
      actions.ts                # checkHandleAvailability, claimHandleAction
    api/auth/[...nextauth]/
      route.ts                  # Auth.js route handler (GET, POST)
```

- No dynamic segments, `loading.tsx`, `error.tsx` or `not-found.tsx` yet.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`, which affect how loading states and layouts behave (§5). `/`, `/dashboard` and `/onboarding` build as partial prerenders: a static shell, with the signed-in parts streamed behind `<Suspense>`.

## 2. Route map

```
src/app/
  user/
    [handle]/
      page.tsx                  # /user/[handle]  public profile
      not-found.tsx             # branded 404 for unknown handles
  (dashboard)/
    dashboard/
      …                         # add-links and other dashboard pages go here (planned)
```

| Route | Access | Status |
| --- | --- | --- |
| `/` landing page | Public | Exists |
| `/login`, `/signup` in `(auth)` | Public. Signed-in visitors are sent on by the page itself (`RedirectIfSignedIn`), not Proxy: `/dashboard`, or `/onboarding` without a handle | Exists |
| `/onboarding` | Signed-in only, until a handle is set. Then redirects to `/dashboard` | Exists |
| `/dashboard` in `(dashboard)` | Signed-in users with a handle (others go to `/onboarding`) | Exists: links editor (add, inline edit, delete, toggles) with live preview; actions in `dashboard/actions.ts` |
| Add-links page under `/dashboard/…` | Signed-in only | Planned. Exact path TBD |
| `src/app/api/auth/[...nextauth]` | Auth.js endpoints | Exists |
| `/user/[handle]` public profile | Public | Exists |
| `/[handle]` short profile URL (rewrite to `/user/[handle]`) | Public | Exists (`next.config.ts`) |
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
- **Short URL `/<handle>`:** a `fallback` rewrite in `next.config.ts` serves `/user/<handle>` at `/<handle>` (the address bar keeps the short URL). There is no `src/app/[handle]` folder. `fallback` rewrites run only after every page, file and dynamic route has been checked (bundled docs: `rewrites.md`), so existing and future routes always win over a handle. The source only matches one segment in the handle format (`[A-Za-z0-9_-]{3,30}`, upper case allowed because `getPublicProfile()` lowercases). Every top-level route name must also be in `RESERVED_HANDLES` (`src/lib/validation/handle-rules.ts`), or a user could claim a handle that its route then hides. Verified on a production build: `/maryokafor` and `/MaryOkafor` → 200, unknown handle → 404, `/`, `/login`, `/signup`, `/dashboard`, `/onboarding`, `/api/auth/*`, `/favicon.ico` unchanged.
- No sign-in required. Show public data only ([`auth.md`](auth.md) §7).
- For an unknown handle, call `notFound()` (optionally with a `not-found.tsx` in that segment).
- Handle format is decided: `^[a-z0-9_-]{3,30}$` ([`database.md`](database.md) §5.1). The page loads the profile with `getPublicProfile()` ([`database.md`](database.md) §5.4), which returns `null` for unknown or malformed handles → `notFound()`.
- **Decided (rendering and 404 status):** `generateStaticParams` returns one placeholder (`"-"`, which fails the format check, so builds never query the database), and the page exports **`ensureStatic = "navigation"`**. For a handle that wasn't prerendered, Next.js then waits for the complete page instead of serving the App Shell first, so `notFound()` runs before the response starts and unknown handles get a real **404** (verified on a production build: `/user/x`, `/user/ab`, `/user/A!`, `/user/%20` → 404). Without it, Next.js 16.3+ serves the App Shell and the not-found page arrives with a **200**. The page reads only cached data (`"use cache"`, `cacheLife("hours")`), as `ensureStatic` requires. It also exports **`instant = false`**: the page blocks on purpose (it awaits `params` and the lookup outside `<Suspense>`), and this tells Next.js so. Without it, `next dev` logs "URL data outside `<Suspense>`" and "did not produce a static shell" errors for every profile (bundled docs: `instant.md`, "Disabling instant"). `ensureStatic`'s own static-output check still applies.

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
| `src/proxy.ts` and its matcher | Decided: `/dashboard/:path*`, `/onboarding/:path*` (`/login` and `/signup` redirect signed-in users on the page, see [`auth.md`](auth.md) §4) |
| `/user/[handle]` handle validation | Decided: `^[a-z0-9_-]{3,30}$`, unique, set during onboarding |
| `/user/[handle]` prerendering, caching | TBD |
| Which segments get `loading.tsx` / `error.tsx`. `global-error.tsx`, `not-found.tsx` | TBD |
| Auth.js route handler path | Decided: `src/app/api/auth/[...nextauth]/route.ts` |
| Webhooks / third-party callbacks | TBD |
| Server Action file location | TBD in general (auth: `src/app/(auth)/actions.ts`) |
