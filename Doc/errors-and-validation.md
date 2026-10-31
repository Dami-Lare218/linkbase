# Errors and Validation

How Linkbase validates input and handles errors. Read this before writing a Server Action, a form, an `error.tsx` boundary or any code that logs or reports errors.

> **Status: planned, not implemented.** No validation, Server Actions, forms, database access, error boundaries or logging exist yet. Section 1 describes the current state. Everything after it is a planned convention. Undecided details are marked **TBD**. Related: [`coding-standards.md`](coding-standards.md) §7–8 (async, `Error` objects), [`routing.md`](routing.md) §7 (`error.tsx`), [`auth.md`](auth.md) §5–6 (Server Action pattern), [`database.md`](database.md) §5 (schema validation).

Checked against the bundled Next.js 16.4.3 docs: `01-getting-started/10-error-handling.md`, `02-guides/forms.md`, `03-api-reference/03-file-conventions/error.md`.

## 1. What exists today

- **Zod is not a project dependency.** It isn't in `package.json`. A copy exists in `node_modules` only because `eslint-plugin-react-hooks` depends on it. **Don't import it** until it's added as a direct dependency.
- No `src/lib/` folder, so no `src/lib/validation/`.
- No Server Actions, forms, `error.tsx`, `global-error.tsx` or logging setup.

## 2. Two kinds of errors

| Kind | Examples | Handling |
| --- | --- | --- |
| **Expected** | Invalid form input, a handle already taken, a link that isn't found or isn't the user's | **Return** a typed result. Never throw |
| **Unexpected** | Database down, a bug, a broken invariant | **Throw** an `Error`. The nearest `error.tsx` catches it |

If you can describe the failure to the user and they can fix it or move on, it's expected.

## 3. Validation with Zod

- **Validate all user input with Zod at the Server Action boundary**, before any database access. That covers form data and every action argument, including IDs.
- Use `safeParse` (returns a result) rather than `parse` (throws), so validation failures stay **expected** errors.
- This is in addition to the Mongoose schema validation in [`database.md`](database.md) §5, not instead of it.
- Never validate `userId` from input, because it never comes from input. It comes from the session ([`auth.md`](auth.md) §5).
- Client-side validation (HTML attributes, etc.) is a UX extra only. The server check is the one that counts.

Order inside a Server Action (extends [`auth.md`](auth.md) §5):

1. Check auth: get `userId` from the session.
2. **Validate input with Zod** (`safeParse`). On failure, return the validation result.
3. Connect to the database and run the `userId`-scoped query.
4. Return a success result, or the expected-error result for "not found".

### Shared schemas: `src/lib/validation/`

- Shared Zod schemas live in `src/lib/validation/` (imported as `@/lib/validation/...`), following the `@/*` → `src/*` alias in [`architecture.md`](architecture.md) §4.
- Derive TypeScript input types from the schemas (`z.infer`) instead of writing them twice.
- **TBD:** file layout inside `validation/` (per feature, per model, …), schema names, and which schemas exist. None are defined yet.

**TBD:** Zod version (add as a direct dependency when needed).

## 4. Returning validation errors to forms

- A Server Action returns a **typed result object** for expected errors. It must carry **messages keyed by field name**, so the form can show each message inline next to its field.
- Forms that show these messages are Client Components that use React's `useActionState`. With `useActionState`, the action receives the previous state as its **first argument**.
- Use `useActionState`'s `pending` value to disable the submit button while the action runs.
- The result must be **serializable** (plain objects, strings, numbers), since it crosses from server to client.
- The type lives in shared code so every action and form uses the same shape.

**TBD:**
- The exact result shape: success vs failure fields, form-level (non-field) messages, whether submitted values are echoed back.
- Where the result type lives under `src/lib/`.
- How Zod issues map to field messages (e.g. Zod's flatten/tree helpers vs custom mapping).
- How form-level errors display ([`ui.md`](ui.md) form field states).

## 5. Unexpected errors

- **Throw an `Error`** (never a string, see [`coding-standards.md`](coding-standards.md) §8). Don't catch it just to return a generic result. Let it reach the boundary.
- When you catch and re-throw to add context, pass the original as `cause`.
- The nearest `error.tsx` catches errors thrown while rendering, and errors from Server Actions run through a form `action` or `startTransition`. **Error boundaries don't catch errors in plain event handlers.** Call actions through a form or `startTransition`, or handle the error yourself.
- `error.tsx` must be a Client Component. It receives `error` (typed `unknown`, so narrow it) and `retry` ([`routing.md`](routing.md) §7).
- `redirect()` and `notFound()` work by throwing. Call them **outside** `try` blocks, and don't swallow them in a `catch`.

**TBD:** which segments get `error.tsx`, whether to add `global-error.tsx`, and the error UI.

## 6. What the client sees

- **Never send raw internal error messages or stack traces to the client.** That includes database errors, Mongoose validation errors and auth library errors.
- Expected-error results contain only messages written for the user.
- In production, Next.js already replaces errors thrown from Server Components with a generic message and an `error.digest`. **Don't rely on this alone.** In development the original message is shown, so don't put sensitive data in error messages.
- `error.tsx` shows a generic message. It may show `error.digest` so support can match it to server logs. Whether to show it is **TBD**.
- "Not yours" and "not found" get the same message ([`auth.md`](auth.md) §6).

## 7. Logging

Log unexpected failures **on the server**, with enough context to diagnose them.

**Log (safe, relevant):**
- Which operation failed (Server Action or route name).
- The error's name, message, stack and `cause` (server-side only).
- `error.digest`, if there is one, to match client reports.
- Internal IDs needed to reproduce it, such as the document ID. Whether `userId` may be logged is **TBD** (privacy decision).

**Never log:**
- Passwords, tokens, session cookies, auth or OAuth secrets.
- The database connection string or any env var values.
- Raw form submissions or request bodies (they may hold personal data). Log field names, not values.
- Email addresses and other personal data.

Expected validation failures are normal. Don't log them as errors.

**TBD:** logging service or library, log levels and format, whether `error.tsx` reports client-side errors to a service, alerting. None are chosen. Don't add one as part of unrelated work.

## 8. Open decisions

| Decision | Status |
| --- | --- |
| Add Zod as a direct dependency, and its version | TBD |
| `src/lib/validation/` file layout and schema names | TBD |
| Result object shape and where its type lives | TBD |
| Mapping Zod issues to field messages | TBD |
| Form-level error display | TBD |
| Error shape when a Server Action has no session | TBD (see [`auth.md`](auth.md) §6) |
| Segments with `error.tsx`, `global-error.tsx`, error UI | TBD (see [`routing.md`](routing.md)) |
| Showing `error.digest` to users | TBD |
| Logging service, levels, format, alerting | TBD |
| Whether `userId` may be logged | TBD |
