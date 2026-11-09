# Data Fetching

How Linkbase reads data, keeps private data private, and caches. Read this before writing a query, a page that loads data, a cached function, or a mutation that must refresh cached data.

> **Status: implemented for the dashboard and public profiles.** Section 1 describes what exists. Everything after it is the convention for new code. Undecided details are marked **TBD**. Related: [`database.md`](database.md) (MongoDB + Mongoose, ownership), [`auth.md`](auth.md) (session → `userId`), [`routing.md`](routing.md) (routes, Suspense/loading), [`errors-and-validation.md`](errors-and-validation.md) (Server Action results).

API guidance was checked against the bundled docs for the installed **Next.js 16.4.3** (`node_modules/next/dist/docs/01-app/`). Caching changed a lot in Next.js 16, so don't rely on older examples.

## 1. What exists today

- `next.config.ts` sets **`cacheComponents: true`** (and `partialPrefetching: true`). This turns on the `"use cache"` model and the rules in §5.
- Data-access functions in `src/lib/` (`src/lib/links/links.ts`, `src/lib/users/handle.ts`, `src/lib/users/public-profile.ts`), each importing `server-only` (installed).
- One cached function: `getPublicProfile()` (`"use cache"`, `cacheTag("profile:{handle}")`, `cacheLife("hours")`), invalidated with `updateTag` by the dashboard, onboarding and profile picture actions (§4).
- No custom `cacheLife` profiles in `next.config.ts`.

## 2. Reading data: Server Components call the data layer directly

- Read data in **Server Components** by calling server-side data-access functions, which use the database layer ([`database.md`](database.md)).
- **Don't `fetch()` the app's own `/api` routes from server code.** It adds a network hop and skips the type-safe data layer. Route Handlers are only for webhooks and third-party callbacks ([`routing.md`](routing.md) §8).
- Reads that use the session or other request data are dynamic. With Cache Components on, wrap them in `<Suspense>` (or rely on a `loading.tsx`), otherwise the build or dev overlay errors with "blocking route" ([`routing.md`](routing.md) §5, §7).
- Use React's `cache()` to deduplicate the same read within one request (e.g. the session helper in [`auth.md`](auth.md) §4). It doesn't persist across requests.

## 3. Where data-access code lives

- Database queries and reusable data-access logic live in **shared server-side modules under `src/lib/`**, never in components.
- The connection helper and models are in `src/lib/db/` ([`database.md`](database.md) §3).
- **Decided:** data-access functions live in a feature folder under `src/lib/` (`src/lib/links/links.ts`, `src/lib/users/handle.ts`), import `server-only`, and return plain objects with string ids.
- Data-access modules should be **server-only**. Whether to add the `server-only` package (`import "server-only"`) as a guard is **TBD**. Until then, never import these modules into a `"use client"` file.
- Return **plain, serializable objects**, not Mongoose documents. Documents and `ObjectId`s are class instances. They can't go into `"use cache"` results or Client Component props without conversion (e.g. `.lean()` plus converting IDs to strings). The exact mapping is TBD.

## 4. Private vs public data

### Private data (dashboard)
- **Every private query is scoped to the signed-in user's `userId`**, taken from the session, never from input ([`database.md`](database.md) §7, [`auth.md`](auth.md) §4).
- The exported data-access function resolves the user itself, then queries with that `userId`. Callers can't pass in a different user.

### Public profiles (`/user/[handle]`)
- Query by `handle` ([`database.md`](database.md) §6). This is the only lookup not scoped to the current user.
- **Return only fields explicitly approved for public display.** Select them in the query (projection) *and* map them to a public-only object. Never return the full document.
- **Decided public fields:** handle, profile picture URL (`image`), footer setting (`showFooter`) and **active** links (id, title, URL), in the dashboard's order (newest first). **Never** name, email, password hash, inactive links or other ids. `getPublicProfile()` selects only those fields and maps them with `toPublicProfile()`.
- **Decided caching:** `getPublicProfile()` is `"use cache"` with `cacheTag("profile:{handle}")` and `cacheLife("hours")`. Actions that change the page call `updateTag(profileTag(handle))`: link create/update/delete/switch, footer switch, picture upload/remove, and handle claim (a cached 404 for a newly claimed handle is cleared).

## 5. Caching

Cache only where it helps and is safe. **Default: don't cache** until a read is slow or frequent enough to justify it.

### Current API: `"use cache"` (Next.js 16 with Cache Components)

```ts
import { cacheLife, cacheTag } from "next/cache";

async function getSomethingCached(id: string) {
  "use cache";
  cacheLife("<profile>");   // TBD per read
  cacheTag("<tag>");        // TBD naming
  // query + map to a plain object
}
```

- **Arguments and captured variables become the cache key.** Different arguments give separate entries.
- **Arguments and return values must be serializable.** No class instances, so no raw Mongoose documents.
- **Don't read `cookies()` / `headers()` / the session inside a `"use cache"` scope.** Read them outside and pass the values in as arguments.
- Set `cacheLife` explicitly in every cached scope. If it's left out, the `default` profile applies (stale 5 min, revalidate 15 min, never expires).
- Cache keys and tags are stored as **plain text**. Use IDs or handles, never tokens, emails or other personal data.
- `"use cache: private"` (cached in the browser only) and `"use cache: remote"` (durable shared storage) exist. Whether to use either is **TBD**.

### `unstable_cache`: not for this project

The Next.js 16 docs say `unstable_cache` **has been replaced by `"use cache"`**, and recommend Cache Components with `"use cache"` instead. This project has Cache Components on, so **don't use `unstable_cache`**. Use `"use cache"` + `cacheTag` + `cacheLife`.

### Caching private data

- Only cache private data in an **unexported** `"use cache"` function that takes `userId` as an argument, called by an exported function that resolves `userId` from the session ([`auth.md`](auth.md) §8). That way the cache key always includes the user, and no caller can request another user's entry.
- Whether any private data is cached at all is **TBD**.

### Caching public profiles

- A public profile read may be cached, keyed by `handle`, **returning only the public-only object**.
- Whether to cache profiles, and their `cacheLife`, are **TBD**.

## 6. Invalidating after mutations

Tags are attached with `cacheTag(...)` inside `"use cache"` scopes. After a **successful** mutation (not on validation failure), invalidate the affected tags.

| API | Where it can run | Behaviour | Use in Linkbase |
| --- | --- | --- | --- |
| `updateTag(tag)` | **Server Actions only** | Expires the tag immediately. The next request waits for fresh data (read-your-own-writes) | **Default after a user edits their own data**, so they see the change right away |
| `revalidateTag(tag, profile)` | Server Actions and Route Handlers | Marks the tag stale. The next request gets stale data while it refreshes. `"max"` is the recommended profile | Webhooks / Route Handlers, or Server Actions where a short delay is fine |
| `revalidatePath(path)` | Server Actions and Route Handlers | Invalidates a page or layout path | Only when there's no suitable tag |
| `refresh()` | Server Actions only | Refreshes the client router | If needed after a mutation. TBD |

**Next.js 16 changes to note:**
- **`revalidateTag` needs two arguments:** `revalidateTag(tag, "max")`. The one-argument form is **deprecated** (behaves like `{ expire: 0 }` and may be removed).
- `updateTag` cannot run in Route Handlers. Use `revalidateTag` there.
- Tags are case-sensitive, max 256 characters, and at most 128 per `cacheTag()` call. Longer tags are silently never applied.
- Revalidation happens on the next request, not at the moment of the call.

A mutation that changes public profile data must also invalidate the cached public profile for that handle.

**Decided:** the dashboard read (`getDashboardData`) is **not cached**: it runs per request behind `<Suspense>`, and dashboard actions call `refresh()` so the page re-renders with fresh data.

**TBD:** tag naming scheme, which reads are tagged, which mutations invalidate which tags, and whether to define custom `cacheLife` profiles in `next.config.ts` (if so, document them here).

## 7. Client Components

- **Client Components never access the database**, and never import data-access modules or models.
- They get data **as props from a Server Component**. Pass only the fields the component needs.
- Props crossing to the client must be serializable (plain objects, strings, numbers, …).
- To change data, Client Components call **Server Actions** ([`auth.md`](auth.md) §5). They don't call `/api` routes for the app's own data.

## 8. Open decisions

| Decision | Status |
| --- | --- |
| Data-access function location, names and grouping | TBD |
| Adding the `server-only` package | TBD |
| Document → plain object mapping (`.lean()`, ID conversion) | TBD |
| Approved public profile fields | TBD |
| Which reads are cached, and their `cacheLife` profiles | TBD |
| Custom `cacheLife` profiles in `next.config.ts` | TBD |
| Cache tag naming scheme, and which mutations invalidate which tags | TBD |
| Whether private data is cached at all | TBD |
| Use of `"use cache: private"` / `"use cache: remote"` | TBD |
| Use of `refresh()` / `revalidatePath` after mutations | TBD |
