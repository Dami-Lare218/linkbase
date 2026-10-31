# Data Mutations

How Linkbase writes data. Read this before writing or changing any Server Action, or anything that creates, updates or deletes data.

> **Status: planned, not implemented.** No Server Actions, auth, database models, Zod schemas or revalidation exist yet. Section 1 describes the current state. Everything after it is a planned convention. Undecided details are marked **TBD**.
>
> This doc ties together: [`architecture.md`](architecture.md) (naming, location), [`auth.md`](auth.md) (session, ownership), [`database.md`](database.md) (models, `userId` scoping), [`errors-and-validation.md`](errors-and-validation.md) (Zod, results, unexpected errors), [`data-fetching.md`](data-fetching.md) (cache tags, invalidation). If they disagree, fix the docs. Don't pick one silently.

## 1. What exists today

- No `"use server"` code anywhere in `src/`.
- No `next-auth`, `mongoose` or `zod` in `package.json`.
- No `src/lib/`, no models, no validation schemas, no forms.

## 2. Server Actions for all writes

- **Every data write goes through a Server Action** (`"use server"`), not a Route Handler / API route.
- The only exception is webhooks and third-party callbacks, which use Route Handlers under `src/app/api/` ([`routing.md`](routing.md) §8). Those follow the same validate → scope → write rules, with their own sender verification (TBD per service).
- Name actions verb-first in camelCase (`createLink`, `deleteLink`, …) ([`architecture.md`](architecture.md) §5). These names show the format only. No actions are defined yet.
- **TBD:** where Server Action files live ([`architecture.md`](architecture.md) §4).

## 3. The required order

Every Server Action that touches private data runs these steps **in this order**. Nothing touches the database until steps 1–3 pass.

| # | Step | On failure | Reference |
| --- | --- | --- | --- |
| 1 | **Authenticate.** Get `userId` from the server-side session | Stop. Return the unauthenticated result (shape TBD) | [`auth.md`](auth.md) §4, §6 |
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

export async function deleteLink(prevState: unknown, formData: FormData) {
  const userId = await requireUser();                       // 1. authenticate
  const parsed = deleteLinkSchema.safeParse(/* fields */);  // 2. validate
  if (!parsed.success) return /* validation-error result */;

  await connectToDatabase();
  const res = await Link.deleteOne({ _id: parsed.data.id, userId }); // 3 + 4
  if (res.deletedCount === 0) return /* not-found result */;

  /* 5. revalidate (see §5) */
  return /* success result */;
}
```

`requireUser`, `deleteLinkSchema`, `connectToDatabase`, `Link` and the result shapes are **placeholders**. None are decided. `prevState` is there because forms call actions through `useActionState` ([`errors-and-validation.md`](errors-and-validation.md) §4).

## 4. Expected vs unexpected failures

| Failure | Kind | Handling |
| --- | --- | --- |
| Not signed in | Expected | Return the unauthenticated result (shape TBD, [`auth.md`](auth.md) §6) |
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

**TBD:** tag naming scheme, which mutations invalidate which tags and paths, and when `revalidatePath` or `refresh()` is preferred over tags.

## 6. Typed results

- Every action returns a **typed, serializable result** that tells apart:
  - **success**, with any data the UI needs,
  - **validation errors**, keyed by field for inline display,
  - **business-rule / not-found / unauthenticated errors**, with a user-facing message.
- One shared result type is used by all actions and forms ([`errors-and-validation.md`](errors-and-validation.md) §4).
- Success data returns only the fields the client needs, as plain objects, never Mongoose documents ([`data-fetching.md`](data-fetching.md) §3).

**TBD:** the exact result shape and where its type lives. Don't invent one per action.

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
| Server Action file location | TBD |
| Result type shape and location | TBD |
| Unauthenticated result shape | TBD |
| Business rules and their error messages | TBD |
| Tag naming, and which mutations invalidate which tags/paths | TBD |
| `updateTag` vs `revalidateTag` vs `revalidatePath` per mutation | TBD (default for own edits: `updateTag`, per [`data-fetching.md`](data-fetching.md)) |
| Webhook sender verification | TBD |
