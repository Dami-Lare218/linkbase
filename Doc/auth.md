# Authentication and Authorization

How Linkbase will sign users in and make sure each user can only reach their own data. Read this before adding a protected route, a Server Action, a public page or any query on user data.

> **Status: planned, not implemented.** No auth code, packages, routes or config exist yet. Section 1 describes the current state. Everything after it is the intended design. Undecided details are marked **TBD**. Related docs: [`architecture.md`](architecture.md) (structure, naming) and [`database.md`](database.md) (MongoDB + Mongoose, `userId` scoping).

## 1. What exists today

- No `next-auth` / Auth.js package in `package.json`.
- No auth config, sign-in page, session handling or `proxy.ts`.
- Routes in `src/app/`: only the starter `layout.tsx` and `page.tsx` (`/`).
- **Not present yet:** the dashboard route group, `/user/[handle]`, Server Actions and database code.

## 2. Stack

- **NextAuth (Auth.js)** handles sign-in, sessions and auth security (cookies, CSRF, token signing).
- Auth helpers live under `src/lib/` in the auth folder from [`architecture.md`](architecture.md) §4. The folder name is still TBD and written `src/lib/<auth>/` here.

**TBD:**

| Decision | Status |
| --- | --- |
| Auth.js version | TBD |
| Sign-in providers (OAuth, email, credentials, …) | TBD |
| Session strategy (JWT or database sessions) | TBD |
| Database adapter, if database sessions are used | TBD. Must work with the MongoDB setup in [`database.md`](database.md) |
| Environment variable names (secret, provider keys) | TBD. Follow the Auth.js docs for the chosen version |
| Auth config file location and Auth.js route handler path | TBD. Follow the Auth.js docs for the chosen version |
| Sign-in / sign-out page URLs | TBD |
| How the session exposes `userId` | TBD |

Once installed, check the Auth.js docs for that exact version. Its setup differs between major versions.

## 3. Routes (proposed)

| Proposed file location | URL | Access |
| --- | --- | --- |
| `src/app/(dashboard)/…` | TBD (see note) | **Signed-in users only.** Protected by default |
| `src/app/user/[handle]/page.tsx` | `/user/[handle]` | **Public.** No sign-in needed |
| `src/app/page.tsx` (exists) | `/` | Public. Contents TBD |

- `(dashboard)` is a proposed **route group**. The group name is TBD.
- **Route groups don't add a URL segment.** `src/app/(dashboard)/links/page.tsx` serves `/links`, not `/dashboard/links`. Proxy matches URLs, not folders, so the protected **URL prefix** must be decided (e.g. a real `dashboard/` folder inside the group). URL prefix: **TBD**.
- Every new route inside the dashboard group is protected without extra work (see §4). A new public route must be added on purpose.

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
- How Auth.js plugs into Proxy depends on the version: **TBD**.

### Layer 2: Auth helper in server code (required)

Create one helper in `src/lib/<auth>/` (name TBD; `requireUser` below is a placeholder). It:

1. Reads the Auth.js session on the server.
2. If there is no valid session, stops the request: redirect for pages, error result for actions (see §6).
3. Returns the verified `userId`.

Wrap it in React's `cache()` so a request reads the session only once.

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

export async function deleteLink(linkId: string) {
  const userId = await requireUser();        // 1. auth: stop if signed out
  // 2. validate input with Zod safeParse (planned, see errors-and-validation.md)
  await connectToDatabase();                 // 3. cached connection (database.md §4)
  const result = await Link.deleteOne({ _id: linkId, userId }); // 4. ownership in the filter
  if (result.deletedCount === 0) return { error: "Not found" }; // 5. same reply for missing and not-yours
  // 6. revalidate affected data (strategy TBD)
}
```

`requireUser`, `connectToDatabase`, `Link` and the return shape are placeholders. The real names, model and fields are TBD. Validation (Zod, not yet installed) and the typed result follow [`errors-and-validation.md`](errors-and-validation.md) §3–4. The result shape is still TBD there.

Rules:
- **Never accept `userId` as an argument or a form field.** It always comes from the session.
- **Treat every argument as untrusted.** Actions can be called directly by POST, with any input.
- Users can change **only their own** links and identity data. There are no admin or cross-user actions unless one is decided later.

## 6. Handling unauthenticated requests

| Where | No valid session → |
| --- | --- |
| Proxy, on a dashboard URL | Redirect to the sign-in page (URL TBD). Whether to keep a return URL is TBD |
| Dashboard page / Server Component | `redirect()` to sign-in from `next/navigation` |
| Server Action | Stop before any database work. Return an error result or throw (shape TBD). Never return partial data |
| Route Handler | Respond `401` |
| Signed in, but the document isn't theirs | Respond as "not found". Don't reveal that it exists |

`unauthorized()` and `forbidden()` from `next/navigation` are **experimental** in this Next.js version (they need the `authInterrupts` flag). Whether to use them is **TBD**. Default to `redirect()`.

## 7. Public profiles (`/user/[handle]`)

- **No auth check.** Anyone can view the page, signed in or not.
- Look the profile up by `handle` (indexed, see [`database.md`](database.md) §6). This is the one place a query isn't scoped to the current user's `userId`.
- **Return only public fields.** Select the fields explicitly or map the result to a public-only object before rendering or passing it to a Client Component. Never send the raw document. Internal IDs, emails and session data must not reach the page.
- Which fields and links count as public is **TBD**.
- A public page must not trigger mutations. Edits happen only in dashboard Server Actions, which follow §5.
- If it's cached with `"use cache"`, cache only the public-only object, keyed by `handle`.

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
| Auth.js version, providers, session strategy, adapter | TBD |
| Env var names, config file location, Auth.js route handler path | TBD |
| Sign-in / sign-out URLs, return-URL behaviour | TBD |
| Dashboard route group name and protected URL prefix | TBD |
| Whether to add `src/proxy.ts`, and its Auth.js integration | TBD |
| Auth helper name and `src/lib/` auth folder name | TBD |
| How the session exposes `userId`, and its type | TBD (see [`database.md`](database.md)) |
| Server Action error shape | TBD |
| Use of experimental `unauthorized()` / `forbidden()` | TBD |
| Public profile fields | TBD |
| Revalidation after mutations | TBD |
