# Database

How Linkbase will store data with **MongoDB + Mongoose**. Read this before adding a model, a query or a Server Action that reads or writes data.

> **Status: connection and first models exist.** The connection helper (§4) and the `User` and `AuthAttempt` models (§5.1) are implemented. Other collections are still the intended design. Undecided details are marked **TBD**. Do not fill them in without an explicit decision.

## 1. What exists today

- `mongoose` ^9 and `server-only` are dependencies.
- `src/lib/db/connect.ts` exports `connectToDatabase()` (§4). It imports `server-only`, so importing it into a Client Component fails the build.
- `src/lib/db/database-target.ts` decides which connection string the process may use and holds the test-database safety checks (§4.1). It is pure (no `server-only`), so the QA scripts and Vitest can import it too.
- `MONGODB_URI` holds the development connection string (MongoDB Atlas). It lives in the Git-ignored `.env.local`. `.env.example` (committed) lists it with a placeholder.
- Models in `src/lib/db/models/`: `user.ts` (`User`), `link.ts` (`Link`) and `auth-attempt.ts` (`AuthAttempt`, rate limiting). All import `server-only`.
- Link data access in `src/lib/links/links.ts` (`server-only`, §5.3).
- Handle data access in `src/lib/users/handle.ts` (`server-only`): `isHandleAvailable()` and `claimHandle()` (§5.2). Public profile lookup in `src/lib/users/public-profile.ts` (§5.4).
- Authentication exists ([`auth.md`](auth.md)). The signed-in user's ID is `session.user.id`, a string of the user's `_id`.
- `mongoose` and `mongodb` are on Next.js's automatic `serverExternalPackages` list, so `next.config.ts` needs no change.

## 2. Stack

- **MongoDB** stores the data.
- **Mongoose** manages schemas, validation and the database connection.
- Database code runs on the server only: Server Components, Server Actions and Route Handlers on the Node.js runtime. Never import it into a `"use client"` file.

**Decided:** MongoDB Atlas for development; Mongoose 9. **TBD:** production hosting.

## 3. Folder layout (planned)

```
src/lib/db/
  connect.ts             # connection helper: connectToDatabase()
  models/
    <model-name>.ts      # one file per model, kebab-case
```

- The connection helper lives in `src/lib/db/`.
- Models live in `src/lib/db/models/`, one model per file. File names follow the kebab-case rule in [`architecture.md`](architecture.md). Model names are PascalCase.
- Import through the alias: `@/lib/db/...`.

**TBD:** whether `models/` has an index file that re-exports models.

## 4. Connection lifecycle

Goal: **one cached connection per server process**, reused by every Server Action and request.

1. Call the connection helper at the start of any server code that touches the database.
2. The helper stores the connection (and the pending connect promise) on `globalThis`.
3. If a connection or pending promise exists, return it. Otherwise start one and cache the promise.
4. If connecting fails, clear the cached promise so the next call can retry.

In development, Next.js hot reload re-runs modules. A plain module-level variable would be reset and open a new connection on every reload. `globalThis` survives reloads, which prevents a pile-up of connections.

Implemented in `src/lib/db/connect.ts`:

- The cache is typed (`{ conn, promise }`) on `globalThis`, with no `any`.
- `MONGODB_URI` is read **when the helper is first called**, not at import, so `next build` works without it. If it's missing, the helper throws `MONGODB_URI is not set…`, naming the variable but never a value.
- The URI comes from `resolveDatabaseConfig(process.env)` (§4.1). Configuration and safety errors (`DatabaseConfigError`) are re-thrown as they are: their messages are safe to show.
- `mongoose.set("strictQuery", true)` is set once (§5).
- Connect options: `serverSelectionTimeoutMS: 5000` (fail in 5s, not the 30s default) and `bufferCommands: false` (queries error immediately while disconnected). Pool size and other options use driver defaults.
- On failure the cached promise is cleared, a **server-only** log line `[db] Could not connect to MongoDB: <name> (<code>): <message>` is written by `describeConnectionError()` (`database-target.ts`, unit-tested) with connection strings, credentials and Atlas host names removed, and a generic `Could not connect to MongoDB` error is thrown, with the original error as `cause`. The connection string never reaches a client or a log. Added 2026-11-07, after a truncated `w=` option and a rotated password both showed only the generic message.

Also guard models against re-registration on hot reload:

```ts
export const Example = mongoose.models.Example ?? mongoose.model("Example", exampleSchema);
```

**TBD:** tuning connection options (e.g. pool size) for production, once hosting is decided.

### 4.1 Database target: development vs QA

`src/lib/db/database-target.ts` picks the connection string from the environment:

| `LINKBASE_DB_TARGET` | Uses | Set by |
| --- | --- | --- |
| unset (normal) | `MONGODB_URI` | `npm run dev`, `npm run build`, production |
| `test` | `MONGODB_URI_TEST` | `npm run qa:server` only ([`testing.md`](testing.md) §4) |

- **Development and production are unchanged:** without `LINKBASE_DB_TARGET`, the helper behaves exactly as before.
- In test mode it refuses unless the `MONGODB_URI_TEST` database name ends in `_test`, it differs from `MONGODB_URI` (host + database), and `NODE_ENV` isn't `production`.
- After connecting in test mode, `connectToDatabase()` checks `connection.name` ends in `_test` (disconnecting if not) and logs the database name, never the URI.
- Any other `LINKBASE_DB_TARGET` value is an error.

## 5. Schemas and validation

- **Strict schemas.** Keep Mongoose's `strict: true` (the default) so unknown fields are dropped and never saved. Set `strictQuery: true` explicitly so unknown fields in query filters are dropped too.
- **Timestamps.** Every schema uses `{ timestamps: true }` to get `createdAt` and `updatedAt`.
- **Validation in the schema.** Required fields, types, lengths, enums and formats are declared on the schema so every write path enforces them.
- Validate input again at the Server Action boundary before it reaches Mongoose, with Zod schemas in `src/lib/validation/` (see [`errors-and-validation.md`](errors-and-validation.md) §3).
- Shared TypeScript types go in `src/lib/types/`. Models export their own document type (`InferSchemaType`).

### 5.1 Existing collections

**`users`** (`User`, `src/lib/db/models/user.ts`):

| Field | Rules |
| --- | --- |
| `name` | String, required, trimmed, 1–50 chars |
| `email` | String, required, trimmed, lowercased, max 254, basic format check. **Unique index** |
| `passwordHash` | String (bcrypt), required, **`select: false`**: only returned when a query asks for `+passwordHash` |
| `handle` | String, optional (picked during onboarding), trimmed, lowercased, 3–30 chars, `^[a-z0-9_-]{3,30}$` (lowercase letters, numbers, hyphens, underscores). Rules live in `src/lib/validation/handle-rules.ts`. **Unique partial index** (`partialFilterExpression: { handle: { $type: "string" } }`): unique only among users who have one, so users without a handle don't collide |
| `createdAt` / `updatedAt` | `timestamps: true` |

Never send a `User` document to the client. Map it to the fields needed (e.g. `{ id, name, email }`).

**`authattempts`** (`AuthAttempt`, `src/lib/db/models/auth-attempt.ts`): rate-limit counters `{ key, count, expiresAt }`. `key` is `<limit-name>:<sha256>` so no raw emails or IPs are stored. Unique index on `key`, TTL index on `expiresAt` (MongoDB deletes expired windows).

### 5.2 Handles and public profile lookups

`src/lib/users/handle.ts` (`server-only`) is the only code that writes or looks up handles:

| Function | What it does |
| --- | --- |
| `isHandleAvailable(handle)` | `false` for reserved names (`RESERVED_HANDLES` in `handle-rules.ts`), otherwise `User.exists({ handle }) === null` |
| `claimHandle(userId, handle)` | `updateOne({ _id: userId, handle: null }, { $set: { handle } }, { runValidators: true })` (`handle: null` matches a missing or null handle). Returns `"claimed"`, `"already-set"` (no matching user without a handle) or `"taken"` (reserved, or duplicate-key error `11000` from the unique index, which also settles two users claiming the same handle at once) |

- Pass handles already normalized and validated (`handleSchema`), and `userId` from the session only.
- Existing users without a handle need no migration: the partial index ignores them, and they're sent to onboarding on their next visit.

### 5.3 Links

**`links`** (`Link`, `src/lib/db/models/link.ts`): the first user-owned collection.

| Field | Rules |
| --- | --- |
| `userId` | ObjectId, `ref: "User"`, required. Set by the server from the session, never from input |
| `title` | String, required, trimmed, 1–100 chars |
| `url` | String, required, trimmed, max 2048, validator `isHttpUrl` (absolute `http:`/`https:` URL with a host) |
| `isActive` | Boolean, default `true`. Only active links show on the profile and in the dashboard preview |
| `clicks` | Number, min 0, default 0. Click tracking isn't built yet |
| `createdAt` / `updatedAt` | `timestamps: true` |

- **Index:** `{ userId: 1, createdAt: -1 }` (the dashboard lists a user's links newest first).
- **`User.showFooter`:** Boolean, default `true` (missing on older users counts as `true`). Controls the "Join … on Linkbase" footer.
- **Data access** (`src/lib/links/links.ts`): `getDashboardData(userId)` (links + footer setting, as plain objects with string ids), `createLink`, `updateLink`, `deleteLink`, `setLinkActive`, `setShowFooter`. Every write puts `{ _id: id, userId }` in the filter; a match/delete count of 0 is reported as `"not-found"`.

### 5.4 Profile pictures and the public profile

- **`User.image`:** optional String, the URL of a processed WebP in **Vercel Blob** (validator `isBlobAvatarUrl`: `https://<store>.public.blob.vercel-storage.com/avatars/…`). Image bytes are never stored in MongoDB.
- Files live at `avatars/{userId}/{uuid}.webp` (`src/lib/storage/avatar-storage.ts`). Replacing or removing a picture deletes the previous file (best-effort).
- **`getPublicProfile(handle)`** (`src/lib/users/public-profile.ts`, `server-only`, `"use cache"`): selects `handle image showFooter` from the user and `title url isActive` from **active** links sorted `createdAt: -1`, then maps them with the pure `toPublicProfile()` (`public-profile-mapping.ts`). Returns `null` for unknown or malformed handles. It replaces the earlier `findPublicProfileByHandle`.

**TBD:** further collections and their fields.

## 6. Indexes

- **`userId`:** index it on every user-owned collection, since every query on those collections filters by it. Use compound indexes (e.g. `{ userId: 1, createdAt: -1 }`) when a query also sorts or filters on other fields.
- **`handle`:** index it on any collection that has a handle field, since handles are used for lookups.
- Declare indexes in the schema (`schema.index(...)`) so they live with the model.

**Decided:** `handle` lives on `users` and is globally unique (partial index, since it's optional).

**Decided:** `links` has `userId` with a compound index (§5.3).

**TBD:** further collections with `userId`; whether `autoIndex` stays on in production or indexes are created another way.

## 7. User data ownership

Users can only read and change their own data. Rules:

1. **Get `userId` from the server-side session, never from client input** (form fields, URL params or request bodies).
2. **Every query on a user-owned collection includes `userId` in the filter.** That covers reads, updates and deletes, for example `findOne({ _id: id, userId })`, not `findById(id)`.
3. **Set `userId` on the server when creating a document.** Do not accept it from the client.
4. Check authentication at the top of every Server Action, because Server Actions can be called by direct POST requests (see [`architecture.md`](architecture.md) §6).
5. When a document isn't found under the user's ID, treat it as "not found". Do not reveal that it belongs to someone else.

**Decided:** the session exposes the user ID as the string `session.user.id` ([`auth.md`](auth.md) §2).

**Decided:** `userId` is stored as an ObjectId with `ref: "User"` (`links`); Mongoose casts the session's string id in filters.

**TBD:** which data is public, such as content looked up by `handle`.

## 8. Caching

`cacheComponents` is enabled. Read the bundled Next.js docs (`01-getting-started/08-caching.md`) before wrapping any database query in `"use cache"`. User-scoped data must never be cached in a way that could serve one user's data to another.

**TBD:** caching strategy for database reads.

## 9. Open decisions

| Decision | Status |
| --- | --- |
| MongoDB hosting | Development: MongoDB Atlas. Production: TBD |
| Mongoose version | Decided: ^9 |
| Connection-string env var name | Decided: `MONGODB_URI` (test: `MONGODB_URI_TEST`, see [`testing.md`](testing.md) §4) |
| Selecting the test database | Decided: `LINKBASE_DB_TARGET=test` (set by `npm run qa:server`) + `resolveDatabaseConfig()` (§4.1) |
| Connection options | Decided: `serverSelectionTimeoutMS: 5000`, `bufferCommands: false`, `strictQuery: true`. Production tuning TBD |
| Missing `MONGODB_URI` | Decided: fail on first use, not at startup or build |
| Helper file and function names | Decided: `src/lib/db/connect.ts`, `connectToDatabase()` |
| Collections, schemas and fields | `users`, `authattempts` decided (§5.1). Others TBD |
| `handle` uniqueness and scope | Decided: optional, globally unique on `users` |
| Production index creation | TBD |
| Auth provider and session → `userId` | Decided: Auth.js credentials, `session.user.id` (string) |
| `userId` storage type on owned collections | TBD |
| Public (non-owner) data access | TBD |
| Input validation library | Decided: Zod 4 at the Server Action boundary. See [`errors-and-validation.md`](errors-and-validation.md) |
| Caching strategy for DB reads | TBD |
