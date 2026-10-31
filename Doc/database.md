# Database

How Linkbase will store data with **MongoDB + Mongoose**. Read this before adding a model, a query or a Server Action that reads or writes data.

> **Status: planned, not implemented.** No database code exists yet. Section 1 describes the current state. Everything after it is the intended design. Undecided details are marked **TBD**. Do not fill them in without an explicit decision.

## 1. What exists today

- No `mongoose` or `mongodb` package in `package.json`.
- No `src/lib/` folder, no models, no connection helper.
- No `.env` files and no database credentials.
- No authentication yet, so there is no user ID to scope queries by.

## 2. Stack

- **MongoDB** stores the data.
- **Mongoose** manages schemas, validation and the database connection.
- Database code runs on the server only: Server Components, Server Actions and Route Handlers on the Node.js runtime. Never import it into a `"use client"` file.

**TBD:** MongoDB hosting (e.g. local, managed cloud), Mongoose version.

## 3. Folder layout (planned)

```
src/lib/db/
  <connect-helper>.ts    # connection helper (file name TBD)
  models/
    <model-name>.ts      # one file per model, kebab-case
```

- The connection helper lives in `src/lib/db/`.
- Models live in `src/lib/db/models/`, one model per file. File names follow the kebab-case rule in [`architecture.md`](architecture.md). Model names are PascalCase.
- Import through the alias: `@/lib/db/...`.

**TBD:** the helper's file and function names, and whether `models/` has an index file that re-exports models.

## 4. Connection lifecycle

Goal: **one cached connection per server process**, reused by every Server Action and request.

1. Call the connection helper at the start of any server code that touches the database.
2. The helper stores the connection (and the pending connect promise) on `globalThis`.
3. If a connection or pending promise exists, return it. Otherwise start one and cache the promise.
4. If connecting fails, clear the cached promise so the next call can retry.

In development, Next.js hot reload re-runs modules. A plain module-level variable would be reset and open a new connection on every reload. `globalThis` survives reloads, which prevents a pile-up of connections.

Sketch of the pattern (not final code):

```ts
// src/lib/db/<connect-helper>.ts
import mongoose from "mongoose";

const cached = (globalThis as any).mongooseCache ??= { conn: null, promise: null };

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(process.env.<CONNECTION_STRING_ENV_VAR>!);
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
```

Also guard models against re-registration on hot reload:

```ts
export const Example = mongoose.models.Example ?? mongoose.model("Example", exampleSchema);
```

**TBD:** the connection-string env var name, connection options (pool size, timeouts), and whether to fail at startup when the variable is missing.

## 5. Schemas and validation

- **Strict schemas.** Keep Mongoose's `strict: true` (the default) so unknown fields are dropped and never saved. Set `strictQuery: true` explicitly so unknown fields in query filters are dropped too.
- **Timestamps.** Every schema uses `{ timestamps: true }` to get `createdAt` and `updatedAt`.
- **Validation in the schema.** Required fields, types, lengths, enums and formats are declared on the schema so every write path enforces them.
- Validate input again at the Server Action boundary before it reaches Mongoose. Planned: Zod, not yet installed (see [`errors-and-validation.md`](errors-and-validation.md) §3).
- Shared TypeScript types for documents go in the types folder under `src/lib/` (name TBD in [`architecture.md`](architecture.md)).

**TBD:** the collections and their fields. None are decided.

## 6. Indexes

- **`userId`:** index it on every user-owned collection, since every query on those collections filters by it. Use compound indexes (e.g. `{ userId: 1, createdAt: -1 }`) when a query also sorts or filters on other fields.
- **`handle`:** index it on any collection that has a handle field, since handles are used for lookups.
- Declare indexes in the schema (`schema.index(...)`) so they live with the model.

**TBD:** which collections have `userId` or `handle`; whether `handle` is unique, and if so globally or per user; whether `autoIndex` stays on in production or indexes are created another way.

## 7. User data ownership

Users can only read and change their own data. Rules:

1. **Get `userId` from the server-side session, never from client input** (form fields, URL params or request bodies).
2. **Every query on a user-owned collection includes `userId` in the filter.** That covers reads, updates and deletes, for example `findOne({ _id: id, userId })`, not `findById(id)`.
3. **Set `userId` on the server when creating a document.** Do not accept it from the client.
4. Check authentication at the top of every Server Action, because Server Actions can be called by direct POST requests (see [`architecture.md`](architecture.md) §6).
5. When a document isn't found under the user's ID, treat it as "not found". Do not reveal that it belongs to someone else.

**TBD:** the auth provider and how the session exposes the user ID, the type of `userId` (ObjectId or string), and whether any data is public, such as content looked up by `handle`.

## 8. Caching

`cacheComponents` is enabled. Read the bundled Next.js docs (`01-getting-started/08-caching.md`) before wrapping any database query in `"use cache"`. User-scoped data must never be cached in a way that could serve one user's data to another.

**TBD:** caching strategy for database reads.

## 9. Open decisions

| Decision | Status |
| --- | --- |
| MongoDB hosting | TBD |
| Mongoose version | TBD |
| Connection-string env var name | TBD |
| Connection options | TBD |
| Helper file and function names | TBD |
| Collections, schemas and fields | TBD |
| `handle` uniqueness and scope | TBD |
| Production index creation | TBD |
| Auth provider and session → `userId` | TBD |
| `userId` type | TBD |
| Public (non-owner) data access | TBD |
| Input validation library | Planned: Zod, not installed. See [`errors-and-validation.md`](errors-and-validation.md) |
| Caching strategy for DB reads | TBD |
