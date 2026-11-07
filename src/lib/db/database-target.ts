/**
 * Decides which MongoDB database the app (or a QA script) may use, and refuses unsafe setups.
 *
 * Pure on purpose: no imports, no `server-only`, no I/O. The app (`connect.ts`), the QA scripts in
 * `scripts/` and Vitest all share these exact checks. Error messages name variables and problems,
 * never values, so a connection string can't leak through an error.
 */

/** Database names allowed in test mode must end with this. */
export const TEST_DATABASE_SUFFIX = "_test";

/** `default` uses `MONGODB_URI` (dev/prod). `test` uses `MONGODB_URI_TEST` (QA only). */
export type DatabaseTarget = "default" | "test";

export type DatabaseConfig =
  | { target: "default"; uri: string }
  | { target: "test"; uri: string; database: string };

/** The env variables this module reads. `process.env` fits this type. */
export type DatabaseEnv = Readonly<Record<string, string | undefined>>;

/** A configuration problem. Its message is safe to print: it never contains a value. */
export class DatabaseConfigError extends Error {
  name = "DatabaseConfigError";
}

export type ParsedMongoUri = {
  /** Host list, lowercased, without credentials (e.g. `cluster0.example.mongodb.net`). */
  hosts: string;
  /** Database name from the URI path. Empty when the URI has none. */
  database: string;
};

const MONGO_URI_PATTERN = /^mongodb(?:\+srv)?:\/\/(?:[^@/?]*@)?([^/?]+)(?:\/([^?]*))?(?:\?.*)?$/;

/** Reads the hosts and database name from a MongoDB URI, or returns null if it isn't one. */
export function parseMongoUri(uri: string): ParsedMongoUri | null {
  const match = MONGO_URI_PATTERN.exec(uri.trim());
  if (!match) return null;

  let database: string;
  try {
    database = decodeURIComponent(match[2] ?? "");
  } catch {
    return null;
  }
  return { hosts: match[1].toLowerCase(), database };
}

/** True when a database name is clearly a test database (ends in `_test`, with something before it). */
export function isTestDatabaseName(name: string): boolean {
  return name.length > TEST_DATABASE_SUFFIX.length && name.endsWith(TEST_DATABASE_SUFFIX);
}

/** Throws unless `name` is a test database. Use it on the database actually connected to. */
export function assertTestDatabaseName(name: string): void {
  if (!isTestDatabaseName(name)) {
    throw new DatabaseConfigError(
      `Refusing to continue: the connected database is not a test database (its name must end in "${TEST_DATABASE_SUFFIX}").`,
    );
  }
}

function readTarget(env: DatabaseEnv): DatabaseTarget {
  const value = env.LINKBASE_DB_TARGET?.trim();
  if (!value) return "default";
  if (value === "test") return "test";
  throw new DatabaseConfigError('LINKBASE_DB_TARGET must be "test" or unset.');
}

/**
 * Picks the connection string for this process.
 *
 * - Default (no `LINKBASE_DB_TARGET`): `MONGODB_URI`, unchanged dev/prod behaviour.
 * - `LINKBASE_DB_TARGET=test`: `MONGODB_URI_TEST`, only if it is clearly a separate test database.
 */
export function resolveDatabaseConfig(env: DatabaseEnv): DatabaseConfig {
  if (readTarget(env) === "default") {
    const uri = env.MONGODB_URI;
    if (!uri) {
      throw new DatabaseConfigError("MONGODB_URI is not set. Add it to .env.local (see .env.example).");
    }
    return { target: "default", uri };
  }

  if (env.NODE_ENV === "production") {
    throw new DatabaseConfigError("Test database mode (LINKBASE_DB_TARGET=test) is not allowed in production.");
  }

  const uri = env.MONGODB_URI_TEST?.trim();
  if (!uri) {
    throw new DatabaseConfigError("MONGODB_URI_TEST is not set. Add it to .env.test (see .env.example).");
  }

  const test = parseMongoUri(uri);
  if (!test) {
    throw new DatabaseConfigError("MONGODB_URI_TEST is not a valid MongoDB connection string.");
  }
  if (!isTestDatabaseName(test.database)) {
    throw new DatabaseConfigError(
      `MONGODB_URI_TEST must name a database ending in "${TEST_DATABASE_SUFFIX}" in its path (e.g. /linkbase${TEST_DATABASE_SUFFIX}).`,
    );
  }

  const devUri = env.MONGODB_URI?.trim();
  if (devUri) {
    const dev = parseMongoUri(devUri);
    const sameDatabase = devUri === uri || (dev !== null && dev.hosts === test.hosts && dev.database === test.database);
    if (sameDatabase) {
      throw new DatabaseConfigError(
        "MONGODB_URI_TEST points to the same database as MONGODB_URI. QA needs its own test database.",
      );
    }
  }

  return { target: "test", uri, database: test.database };
}

const MAX_DESCRIPTION_LENGTH = 300;

/**
 * A one-line, log-safe description of a failed connection: the error's name, its code and
 * its message, with connection strings, credentials and Atlas host names removed.
 * For server logs only; the client still gets the generic "Could not connect to MongoDB".
 */
export function describeConnectionError(err: unknown): string {
  if (!(err instanceof Error)) return "UnknownError";

  const fields = err as Error & { code?: unknown; codeName?: unknown };
  const code = [fields.code, fields.codeName]
    .filter((part) => typeof part === "string" || typeof part === "number")
    .join(" ");

  const message = err.message
    .replace(/mongodb(?:\+srv)?:\/\/\S*/gi, "<connection string>")
    .replace(/[^\s/@:]+:[^\s/@]*@/g, "<credentials>@")
    .replace(/[a-z0-9.-]+\.mongodb\.net\b/gi, "<atlas host>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH);

  return `${err.name}${code ? ` (${code})` : ""}${message ? `: ${message}` : ""}`;
}
