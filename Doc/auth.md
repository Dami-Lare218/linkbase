# Authentication and Authorization

How Linkbase will sign users in and make sure each user can only reach their own data. Read this before adding a protected route, a Server Action, a public page or any query on user data.

> **Status: implemented (email + password).** Sections 1–2 describe what exists. The layer model in §4 onwards is the rule for all new code. Remaining undecided details are marked **TBD**. Related docs: [`architecture.md`](architecture.md) (structure, naming) and [`database.md`](database.md) (MongoDB + Mongoose, `userId` scoping).

## 1. What exists today

| Piece | Where |
| --- | --- |
| Auth.js setup (Credentials provider), exports `handlers`, `auth`, `signIn`, `signOut` | `src/lib/auth/auth.ts` |
| Database-free settings: pages, session, callbacks, logger. Used alone by Proxy | `src/lib/auth/config.ts` |
| `getCurrentUser()` (React `cache()`, loads the user from the database), `requireUser()`, `requireOnboardedUser()` | `src/lib/auth/session.ts` |
| bcrypt hashing and timing-safe check | `src/lib/auth/password.ts` |
| MongoDB-backed rate limiter | `src/lib/auth/rate-limit.ts` |
| Proxy (optimistic redirects) | `src/proxy.ts` |
| Auth.js route handler | `src/app/api/auth/[...nextauth]/route.ts` |
| Server Actions `signUp`, `logIn`, `logOut` | `src/app/(auth)/actions.ts` |
| Handle onboarding: `checkHandleAvailability`, `claimHandleAction` | `src/app/onboarding/actions.ts`, data layer `src/lib/users/handle.ts` |
| Pages | `/login`, `/signup` in `(auth)`; `/onboarding`; `/dashboard` in `(dashboard)` |
| Header UI | `src/components/auth/header-auth.tsx`, `user-menu.tsx` |
| Session type (`session.user.id`) | `src/lib/types/next-auth.d.ts` |

Not built yet: email verification, password reset, account deletion, changing a handle, OAuth providers.

## 2. Stack (decided)

| Decision | Value |
| --- | --- |
| Auth.js version | `next-auth@5.0.0-beta.32`, pinned exactly. v5 is still beta; check its release notes before upgrading |
| Providers | Credentials (email + password) only |
| Session strategy | JWT (encrypted cookie). Credentials sign-in requires it. No database adapter |
| Session lifetime | `maxAge` 30 days, refreshed at most every 24 hours (`updateAge`) |
| Env vars | `AUTH_SECRET` (required). `AUTH_TRUST_HOST=true` only when self-hosting behind a reverse proxy |
| Passwords | `bcryptjs`, cost 12. 8 characters minimum, 72 **bytes** maximum (bcrypt ignores the rest). No composition rules |
| Sign-in / sign-up URLs | `/login`, `/signup`. Sign-out is the `logOut` action, back to `/` |
| How the session exposes `userId` | `session.user.id`: the user's MongoDB `_id` as a string, copied into the JWT at sign-in |
| Auth helper folder | `src/lib/auth/` |

Because sessions are JWTs, the cookie itself stays valid until it expires, even after its user is deleted. Since onboarding, `getCurrentUser()` loads the user from the database on every request, so pages and Server Actions treat a deleted user as signed out; Proxy (cookie only) does not. See [`security.md`](security.md) §7.1.

## 3. Routes

| File location | URL | Access |
| --- | --- | --- |
| `src/app/(dashboard)/dashboard/…` | `/dashboard` and below | **Signed-in users only** |
| `src/app/(auth)/login`, `(auth)/signup` | `/login`, `/signup` | Public. Signed-in visitors are redirected by the page (`RedirectIfSignedIn`, database-backed), not by Proxy: straight to `/dashboard`, or `/onboarding` if they have no handle |
| `src/app/user/[handle]/page.tsx` | `/user/[handle]` | **Public.** No sign-in needed; unknown handles get a 404 |
| `src/app/page.tsx` | `/` | Public landing page |

- **Route groups don't add a URL segment.** `src/app/(dashboard)/links/page.tsx` would serve `/links`, not `/dashboard/links`. Put every dashboard page under the real `dashboard/` folder inside the group so it gets the protected **`/dashboard` prefix** that Proxy matches.
- Every dashboard page still calls `requireOnboardedUser()` itself (§4). A new public route must be added on purpose.

### 3.1 Onboarding: picking a handle

Every account must pick a handle before using the app. The handle is stored on the `User` record ([`database.md`](database.md) §5.1) and identifies the public profile `/user/[handle]`.

| Who | Visits | Result |
| --- | --- | --- |
| Just signed up | — | `signUp` signs them in and redirects to `/onboarding` |
| Signed in, no handle | `/dashboard` (or any page using `requireOnboardedUser()`), or logs in | Redirected to `/onboarding` |
| Signed in, has a handle | `/onboarding` | Redirected to `/dashboard` |
| Signed out | `/onboarding` | Proxy redirects to `/login?callbackUrl=/onboarding` |

- Claiming a handle redirects to `/dashboard`. A handle is set once; changing it isn't built.
- The handle check is server-side only (database), never in Proxy: a handle claim in the JWT could go stale and loop between Proxy and the page.

## 4. How the layers work together

Each request passes up to three checks. Each one does a different job, and **none of them replaces the next.**

```
Request
  │
  ▼
1. Proxy (src/proxy.ts)       optimistic: no session cookie on a dashboard URL → redirect to sign-in
  │
  ▼
2. Server code                authoritative: page / Server Action calls the auth helper,
   (pages, Server Actions,    gets the verified userId from the session or stops
    Route Handlers)
  │
  ▼
3. Database query             ownership: every query on user data filters by that userId
```

### Layer 1: Proxy (optimistic, optional)

- In Next.js 16, **Middleware is called Proxy**. The file is `src/proxy.ts`, next to `src/app/`. Only one is allowed per project.
- It redirects signed-out visitors away from dashboard URLs early, for a better experience.
- Keep it fast. **Don't query the database in Proxy.** Check only for a session.
- It is **not a security boundary.** Matchers can miss routes, and Server Actions are POST requests to the page they're used on. Layers 2 and 3 still apply.
- **Implemented:** `src/proxy.ts` builds Auth.js from `authConfig` alone (no Mongoose) and exports its `auth` as `proxy`. The `authorized` callback in `config.ts` decides: no session on `/dashboard/*` or `/onboarding` → `/login?callbackUrl=<path>`; Matcher: `/dashboard/:path*`, `/onboarding/:path*`. It never checks the handle.
- **Not in Proxy (on purpose):** "signed in on `/login` or `/signup` → `/dashboard`". Proxy only sees the cookie, so a deleted user's still-valid cookie looped forever between `/login` (Proxy: signed in) and `/dashboard` (page: no such user); found in onboarding QA on 2026-11-03. Those pages render `RedirectIfSignedIn` (`src/components/auth/redirect-if-signed-in.tsx`), which uses `getCurrentUser()` instead. It redirects with `homePathFor(user)` (`src/lib/auth/home-path.ts`), so a signed-in user without a handle goes to `/onboarding` in one hop.

### Layer 2: Auth helper in server code (required)

`src/lib/auth/session.ts` provides:

- `getSessionUserId()`: the user id from the session cookie only, or `null`. **No database lookup**, so it doesn't notice deleted users. Use it only for cheap, read-only work on public data (today: the rate-limit key of the handle availability check).
- `getCurrentUser()`: `getSessionUserId()`, then loads `name`, `email` and `handle` from the database by `session.user.id`. Returns `{ id, name, email, handle }` (`handle` is `null` before onboarding), or `null` without a session, with an invalid id, or when the user no longer exists. Wrapped in React's `cache()`, so a request does this only once. It costs one indexed `_id` read per request. It starts with `await connection()`, so Cache Components stops prerendering before Auth.js or the database driver run (they use crypto randomness, which is rejected during prerender).
- `requireUser()`: the same user (onboarded or not), or `redirect("/login")` when there is no valid session. Use it only on `/onboarding`.
- `requireOnboardedUser()`: `requireUser()`, then `redirect("/onboarding")` when there's no handle. **Use it on every other protected page.**

Use `requireOnboardedUser()` in pages (`requireUser()` on `/onboarding` only). In Server Actions, call `getCurrentUser()` and return an error result when it's `null` (a redirect from an action is fine too, but must sit outside `try`).

Call it in:
- **Every dashboard page** (or the data functions those pages use).
- **Every Server Action**, as the first line, including actions used only from dashboard pages.
- **Every Route Handler** that touches user data.

**Don't rely on a layout for the auth check.** Layouts don't re-run on client-side navigation, and they don't stop child segments from rendering. Do the check in the page or data function. A layout may *display* user info.

### Layer 3: Database ownership (required)

This follows the rules in [`database.md`](database.md) §7:

- Every query on a user-owned collection filters by the `userId` from layer 2: `findOne({ _id: id, userId })`, not `findById(id)`.
- Updates and deletes filter by `userId` too. If the update or delete matched nothing, treat it as "not found".
- `userId` is set by the server on create. It is never read from client input.

## 5. Server Action pattern

Every Server Action that touches user data follows these steps:

```ts
"use server";

export async function deleteLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();                         // 1. auth: stop if signed out
  if (!user) return { ok: false, message: "Log in to continue." };
  // 2. validate formData with Zod safeParse, giving linkId (see errors-and-validation.md)
  await connectToDatabase();                                    // 3. cached connection (database.md §4)
  const result = await Link.deleteOne({ _id: linkId, userId: user.id }); // 4. ownership in the filter
  if (result.deletedCount === 0) return { ok: false, message: "Not found." }; // 5. same reply for missing and not-yours
  // 6. revalidate affected data (strategy TBD)
  return { ok: true };
}
```

`getCurrentUser` (`src/lib/auth/session.ts`), `connectToDatabase` and `FormState` (`src/lib/types/action-result.ts`) exist. `Link` and `deleteLink` are placeholders.

Rules:
- **Never accept `userId` as an argument or a form field.** It always comes from the session.
- **Treat every argument as untrusted.** Actions can be called directly by POST, with any input.
- Users can change **only their own** links and identity data. There are no admin or cross-user actions unless one is decided later.

## 6. Handling unauthenticated requests

| Where | No valid session → |
| --- | --- |
| Proxy, on a dashboard URL | Redirect to `/login?callbackUrl=<path>`. After login the user returns there. `logIn` only accepts same-site paths (`/…`, not `//…`), otherwise `/dashboard` |
| Dashboard page / Server Component | `requireOnboardedUser()` → `redirect("/login")` (no session) or `redirect("/onboarding")` (no handle) |
| Server Action | Stop before any database work. Return `{ ok: false, message }` (`FormState`). Never return partial data |
| Route Handler | Respond `401` |
| Signed in, but the document isn't theirs | Respond as "not found". Don't reveal that it exists |

`unauthorized()` and `forbidden()` from `next/navigation` are **experimental** in this Next.js version (they need the `authInterrupts` flag). Whether to use them is **TBD**. Default to `redirect()`.

## 7. Public profiles (`/user/[handle]`)

- **No auth check.** Anyone can view the page, signed in or not.
- Look the profile up by `handle` (indexed, see [`database.md`](database.md) §6). This is the one place a query isn't scoped to the current user's `userId`.
- **Return only public fields.** Select the fields explicitly or map the result to a public-only object before rendering or passing it to a Client Component. Never send the raw document. Internal IDs, emails and session data must not reach the page.
- **Decided public fields:** handle, profile picture URL (`image`), footer setting (`showFooter`) and **active** links (id, title, URL), in the dashboard's order (newest first). **Never** name, email, password hash, inactive links or other ids. Implemented by `getPublicProfile()` (`src/lib/users/public-profile.ts`, query projection) and the pure `toPublicProfile()` mapper. The avatar's initials come from the handle, so the name never reaches the page.
- A public page must not trigger mutations. Edits happen only in dashboard Server Actions, which follow §5.
- It is cached with `"use cache"` (public-only object, keyed by `handle`, tag `profile:{handle}`). Dashboard and onboarding actions that change what the page shows call `updateTag(profileTag(handle))`.
- Profile pictures are managed only from the dashboard (Header section) by their owner; see [`security.md`](security.md) §5.1.

## 8. Caching and sessions

`cacheComponents` is on. From the bundled Next.js guide (`02-guides/authentication-with-cache-components.md`):

- A session is read at request time. Authenticated UI streams behind `<Suspense>`.
- **Don't read the session inside a `"use cache"` function.** Read it outside, then pass only the `userId` into a cached function.
- Keep such cached functions **unexported**, so no caller can pass another user's ID.
- Cache keys and tags are stored as plain text. Use IDs, never tokens or emails.
- Client Components can't call the auth helper. Read the session in a Server Component and pass down only what's needed.

## 9. Open decisions

| Decision | Status |
| --- | --- |
| Auth.js version, providers, session strategy, adapter | Decided (§2) |
| Env var names, config file location, Auth.js route handler path | Decided (§1–2) |
| Sign-in / sign-out URLs, return-URL behaviour | Decided (§2, §6) |
| Dashboard route group name and protected URL prefix | Decided: `(dashboard)`, `/dashboard` (§3) |
| `src/proxy.ts` and its Auth.js integration | Decided (§4, layer 1) |
| Auth helper names and folder | Decided: `getCurrentUser` / `requireUser` / `requireOnboardedUser` in `src/lib/auth/` |
| How the session exposes `userId`, and its type | Decided: `session.user.id`, a string of the MongoDB `_id` |
| Server Action error shape | Decided: `FormState` (`src/lib/types/action-result.ts`) |
| Email verification, password reset, account deletion, OAuth | TBD (not built) |
| Session revocation (ending sessions of deleted or changed users) | TBD: known limitation ([`security.md`](security.md) §7.1) |
| Use of experimental `unauthorized()` / `forbidden()` | TBD |
| Public profile fields | Decided (§7) |
| Revalidation after mutations | TBD |
