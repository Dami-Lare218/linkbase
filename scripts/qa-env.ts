/**
 * Shared, safety-critical setup for the QA scripts (`qa-server.ts`, `qa-cleanup.ts`).
 *
 * Reads env files without loading them into this process, then runs the same checks the app uses
 * (`src/lib/db/database-target.ts`). Nothing here prints a connection string: only database names
 * and messages that name variables.
 */
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

import { DatabaseConfigError, resolveDatabaseConfig } from "../src/lib/db/database-target.ts";

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Port for the QA server, kept apart from normal dev on 3000. */
export const QA_PORT = 3100;

/** Where `qa:server` records its own PID and its `next dev` child's PID, for `qa:stop`. */
export const QA_PID_FILE = path.join(os.tmpdir(), "linkbase-qa-server.json");

export type QaPids = { launcherPid: number; childPid: number };

/** Reads the QA server's PID file, or null if it is missing or malformed. */
export function readQaPids(): QaPids | null {
  try {
    const data: unknown = JSON.parse(readFileSync(QA_PID_FILE, "utf8"));
    if (
      typeof data === "object" && data !== null &&
      "launcherPid" in data && Number.isInteger(data.launcherPid) &&
      "childPid" in data && Number.isInteger(data.childPid)
    ) {
      return { launcherPid: data.launcherPid as number, childPid: data.childPid as number };
    }
  } catch {
    // Missing or unreadable: treat as "no QA server recorded".
  }
  return null;
}

export type QaDatabase = {
  /** Connection string for the test database. Pass it on, never print it. */
  uri: string;
  /** Database name, safe to print (e.g. `linkbase_test`). */
  database: string;
};

function readEnvFile(name: string): Record<string, string | undefined> | null {
  const file = path.join(PROJECT_ROOT, name);
  if (!existsSync(file)) return null;
  return parseEnv(readFileSync(file, "utf8"));
}

/**
 * Returns the verified test database, or throws a DatabaseConfigError with a printable message.
 * Runs before anything connects, so a bad setup never reaches a database.
 */
export function loadQaDatabase(): QaDatabase {
  if (existsSync(path.join(PROJECT_ROOT, ".env.development.local"))) {
    throw new DatabaseConfigError(
      ".env.development.local exists. It overrides MONGODB_URI for every `next dev`, which hides mistakes. " +
        "Move its connection string into .env.test as MONGODB_URI_TEST, delete .env.development.local, then try again.",
    );
  }

  const testEnv = readEnvFile(".env.test");
  if (!testEnv) {
    throw new DatabaseConfigError(".env.test not found. Create it with MONGODB_URI_TEST (see .env.example).");
  }

  // The dev URI as `next dev` would see it: the shell wins, then .env.local, .env.development, .env.
  const devUri =
    process.env.MONGODB_URI ??
    readEnvFile(".env.local")?.MONGODB_URI ??
    readEnvFile(".env.development")?.MONGODB_URI ??
    readEnvFile(".env")?.MONGODB_URI;

  const config = resolveDatabaseConfig({
    LINKBASE_DB_TARGET: "test",
    NODE_ENV: "development",
    MONGODB_URI_TEST: testEnv.MONGODB_URI_TEST,
    MONGODB_URI: devUri,
  });
  if (config.target !== "test") {
    throw new DatabaseConfigError("Internal error: expected the test database target.");
  }
  return { uri: config.uri, database: config.database };
}

/**
 * The read-write token of the separate **test** Vercel Blob store (`BLOB_READ_WRITE_TOKEN_TEST`
 * in `.env.test`), so QA uploads never land in the development store. Refuses when it's missing
 * or is the same token as the development `BLOB_READ_WRITE_TOKEN`. Never printed.
 */
export function loadQaBlobToken(): string {
  const token = readEnvFile(".env.test")?.BLOB_READ_WRITE_TOKEN_TEST?.trim();
  if (!token) {
    throw new DatabaseConfigError(
      "BLOB_READ_WRITE_TOKEN_TEST is not set in .env.test. Create a separate Vercel Blob store for QA and add its token.",
    );
  }
  const devToken =
    process.env.BLOB_READ_WRITE_TOKEN ?? readEnvFile(".env.local")?.BLOB_READ_WRITE_TOKEN ?? readEnvFile(".env")?.BLOB_READ_WRITE_TOKEN;
  if (devToken && devToken.trim() === token) {
    throw new DatabaseConfigError(
      "BLOB_READ_WRITE_TOKEN_TEST is the same as BLOB_READ_WRITE_TOKEN. QA needs its own Blob store.",
    );
  }
  return token;
}

/**
 * Prints an error without risking a connection string: safety messages in full, anything else by
 * error name only (driver messages can include host names). Sets a failing exit code.
 */
export function reportSafeError(err: unknown): void {
  if (err instanceof DatabaseConfigError) {
    console.error(`[qa] ${err.message}`);
  } else {
    const name = err instanceof Error ? err.name : "UnknownError";
    console.error(`[qa] Failed with ${name}. Check network access to the test database and try again.`);
  }
  process.exitCode = 1;
}
