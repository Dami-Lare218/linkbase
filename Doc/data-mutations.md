# Data Mutations

How Linkbase writes data. Read this before writing or changing any Server Action, or anything that creates, updates or deletes data.

> **Status: partly implemented.** The auth actions exist. No data-owning actions or revalidation exist yet. Section 1 describes the current state. Everything after it is the convention to follow. Undecided details are marked **TBD**.
>
> This doc ties together: [`architecture.md`](architecture.md) (naming, location), [`auth.md`](auth.md) (session, ownership), [`database.md`](database.md) (models, `userId` scoping), [`errors-and-validation.md`](errors-and-validation.md) (Zod, results, unexpected errors), [`data-fetching.md`](data-fetching.md) (cache tags, invalidation). If they disagree, fix the docs. Don't pick one silently.

## 1. What exists today

- `src/app/(auth)/actions.ts`: `signUp`, `logIn`, `logOut`. They are public (no session needed), so they skip step 1 below, but follow validate → write → typed result.
- Building blocks: `getCurrentUser()` (`src/lib/auth/session.ts`), Zod schemas (`src/lib/validation/`), `FormState` (`src/lib/types/action-result.ts`), `connectToDatabase()` and the `User` model.
- No data-owning actions (links) and no revalidation yet.

## 2. Server Actions for all writes

- **Every data write goes through a Server Action** (`"use server"`), not a Route Handler / API route.
- The only exception is webhooks and third-party callbacks, which use Route Handlers under `src/app/api/` ([`routing.md`](routing.md) §8). Those follow the same validate → scope → write rules, with their own sender verification (TBD per service).
- Name actions verb-first in camelCase (`createLink`, `deleteLink`, …) ([`architecture.md`](architecture.md) §5). These names show the format only. No actions are defined yet.
- **TBD:** where Server Action files live ([`architecture.md`](architecture.md) §4).

## 3. The required order

Every Server Action that touches private data runs these steps **in this order**. Nothing touches the database until steps 1–3 pass.

| # | Step | On failure | Reference |
| --- | --- | --- | --- |
| 1 | **Authenticate.** Get `userId` from the server-side session (`getCurrentUser()`) | Stop. Return `{ ok: false, message: "Log in to continue." }` | [`auth.md`](auth.md) §4, §6 |
| 2 | **Validate.** Run the matching Zod schema with `safeParse` over all submitted input, including IDs | Return a validation-error result with per-field messages | [`errors-and-validation.md`](errors-and-validation.md) §3–4 |
| 3 | **Check ownership.** The target document must belong to `userId` | Return "not found". Same reply whether it's missing or someone else's | [`database.md`](database.md) §7 |
| 4 | **Write.** Connect (cached connection) and run the `userId`-scoped write | Expected business-rule failure → return an error result. Anything else → throw | [`database.md`](database.md) §4 |
| 5 | **Revalidate.** Refresh affected views | (n/a) | §5 below |
| 6 | **Return** a success result (or redirect) | (n/a) | §6 below |

### Ownership in practice

- **Never trust a `userId` from the client.** Not from form fields, action arguments, bound arguments (`.bind(...)`) or URL params. Ignore any that are sent. `userId` comes only from step 1.
- **Put `userId` in the write filter itself**, so steps 3 and 4 happen in one query: `updateOne({ _id: id, userId }, …)`, `deleteOne({ _id: id, userId })`. If nothing matched, treat it as "not found". This avoids a gap between checking and writing.
- If you must read a document before writing, read it scoped by `userId` too.
- **On create, the server sets `userId`.** Never copy it from input.
- Strict schemas drop unknown fields ([`database.md`](database.md) §5), but don't rely on that alone. Build the write from validated fields only, never spread raw input.

### Sketch (placeholders only)

```ts
"use server";

export async function deleteLink(_prev: FormState<"id">, formData: FormData): Promise<FormState<"id">> {
  const user = await getCurrentUser();                       // 1. authenticate
  if (!user) return { ok: false, message: "Log in to continue." };

  const parsed = deleteLinkSchema.safeParse({ id: formData.get("id") }); // 2. validate
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  await connectToDatabase();
  const res = await Link.deleteOne({ _id: parsed.data.id, userId: user.id }); // 3 + 4
  if (res.deletedCount === 0) return { ok: false, message: "Link not found." };

  /* 5. revalidate (see §5) */
  return { ok: true };
}
```

`getCurrentUser`, `connectToDatabase` and `FormState` exist. `deleteLink`, `deleteLinkSchema` and `Link` are **placeholders**. `prevState` is there because forms call actions through `useActionState` ([`errors-and-validation.md`](errors-and-validation.md) §4).

## 4. Expected vs unexpected failures

| Failure | Kind | Handling |
| --- | --- | --- |
| Not signed in | Expected | Return `{ ok: false, message }` ([`auth.md`](auth.md) §6) |
| Invalid input | Expected | Return per-field validation errors |
| Business-rule failure (e.g. a value that must be unique is taken) | Expected | Return an error result with a user-facing message |
| Not found / not the user's | Expected | Return "not found" |
| Database down, bug, broken invariant | **Unexpected** | **Throw an `Error`.** It reaches `error.tsx`. Log safely on the server |

- **Don't throw for expected failures.** Don't catch unexpected errors just to return a generic result ([`errors-and-validation.md`](errors-and-validation.md) §2, §5).
- **Never return raw internal errors** (Mongoose, MongoDB or auth library messages, stack traces) to the client ([`errors-and-validation.md`](errors-and-validation.md) §6).
- A database unique-index violation is a **business-rule** error only when it maps to a known rule. Translate it to a user-facing message, never the raw error. Which rules exist is **TBD**.
- `redirect()` throws by design. Call it **after** the write and revalidation, **outside** any `try` block.

## 5. Revalidating after success

Revalidate **only after the write succeeds**. Never after validation or ownership failures.

| Call | Use when | Next.js 16.4 notes |
| --- | --- | --- |
| `updateTag(tag)` | The data is cached with `cacheTag` and **the user must see their own change immediately** | Server Actions only. Expires the tag now. [`data-fetching.md`](data-fetching.md) §6 makes this the default for a user's own edits |
| `revalidateTag(tag, "max")` | Tagged data where serving stale content briefly is fine | **Two arguments required.** The one-argument form is deprecated |
| `revalidatePath(path)` | The affected view isn't covered by a tag, or a whole page/layout must refresh | Works in Server Actions and Route Handlers |

- Invalidate **every** view the write affects. For example, an edit to data shown on the public profile also invalidates the cached `/user/[handle]` data for that handle ([`data-fetching.md`](data-fetching.md) §6).
- Tag and path values are stored as plain text. Use IDs or handles, never personal data.

**Decided (dashboard):** link actions in `src/app/(dashboard)/dashboard/actions.ts` call `refresh()` (`next/cache`, Server Actions only) after a successful write. The dashboard data is uncached, so refreshing the client router re-renders it with the change in the same response. No tags yet. The action's success reply can reach the page a moment before the refreshed list, so the dashboard applies confirmed changes itself until the refreshed data matches (`applyLinkOverrides` in `src/lib/links/display.ts`): `createLinkAction` and `updateLinkAction` return the saved values in `FormState.values`.

**Decided (public profile):** every action above, the profile picture actions (`src/app/(dashboard)/dashboard/profile-picture-actions.ts`) and `claimHandleAction` also call `updateTag(profileTag(handle))` so `/user/[handle]` shows the change on the next request.

**TBD:** tag naming scheme once something is cached (e.g. public profiles), and which mutations invalidate which tags and paths.

## 6. Typed results

- Every action returns a **typed, serializable result** that tells apart:
  - **success**, with any data the UI needs,
  - **validation errors**, keyed by field for inline display,
  - **business-rule / not-found / unauthenticated errors**, with a user-facing message.
- One shared result type is used by all actions and forms ([`errors-and-validation.md`](errors-and-validation.md) §4).
- Success data returns only the fields the client needs, as plain objects, never Mongoose documents ([`data-fetching.md`](data-fetching.md) §3).

**Decided:** `FormState` in `src/lib/types/action-result.ts` ([`errors-and-validation.md`](errors-and-validation.md) §4). Use it for every action. Don't invent one per action.

## 7. Checklist for a new Server Action

- [ ] `"use server"`, verb-first name
- [ ] Session checked first. `userId` taken only from the session
- [ ] Every input validated with the matching Zod schema (`safeParse`)
- [ ] Every query and write filtered by `userId`. `userId` set by the server on create
- [ ] Write built from validated fields only
- [ ] Expected failures returned as typed results. Unexpected ones thrown
- [ ] No raw internal errors returned. Safe server-side logging only
- [ ] Affected tags/paths revalidated after success only
- [ ] `redirect()` (if any) outside `try`, after the write

## 8. Open decisions

| Decision | Status |
| --- | --- |
| Server Action file location | TBD in general (auth: `src/app/(auth)/actions.ts`) |
| Result type shape and location | Decided: `FormState`, `src/lib/types/action-result.ts` |
| Unauthenticated result shape | Decided: `{ ok: false, message }` |
| Business rules and their error messages | TBD |
| Tag naming, and which mutations invalidate which tags/paths | TBD |
| `updateTag` vs `revalidateTag` vs `revalidatePath` per mutation | TBD (default for own edits: `updateTag`, per [`data-fetching.md`](data-fetching.md)) |
| Webhook sender verification | TBD |
