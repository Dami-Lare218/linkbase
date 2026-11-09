import "server-only";

import mongoose from "mongoose";

import {
  assertTestDatabaseName,
  DatabaseConfigError,
  describeConnectionError,
  resolveDatabaseConfig,
} from "./database-target";
import type { DatabaseConfig } from "./database-target";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Stored on globalThis so dev hot reloads reuse the connection instead of opening new ones.
const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cached: MongooseCache = (globalForMongoose.mongooseCache ??= {
  conn: null,
  promise: null,
});

// Drop unknown fields from query filters, not just from writes (Doc/database.md §5).
mongoose.set("strictQuery", true);

/**
 * Returns the shared Mongoose connection, opening it on first use.
 * Call this at the start of any server code that touches the database.
 *
 * Uses `MONGODB_URI` by default. Only the QA server (`npm run qa:server`, which sets
 * `LINKBASE_DB_TARGET=test`) uses `MONGODB_URI_TEST`, and only after the checks in `database-target.ts`.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  // Throws a DatabaseConfigError that names the variable, never its value.
  const config = resolveDatabaseConfig(process.env);

  cached.promise ??= openConnection(config);

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Clear the failed attempt so the next call retries.
    cached.promise = null;
    // Safety refusals are already safe to show and must stay visible.
    if (err instanceof DatabaseConfigError) throw err;
    // Server log only, with the connection string, credentials and host removed, so the
    // real cause (bad URI option, failed login, network) is visible without a manual check.
    console.error(`[db] Could not connect to MongoDB: ${describeConnectionError(err)}`);
    // Generic message so the connection string never reaches a client; details stay in `cause`.
    throw new Error("Could not connect to MongoDB", { cause: err });
  }

  return cached.conn;
}

async function openConnection(config: DatabaseConfig): Promise<typeof mongoose> {
  const conn = await mongoose.connect(config.uri, {
    // Fail after 5s instead of the 30s default when the server can't be reached.
    serverSelectionTimeoutMS: 5000,
    // Error immediately instead of queueing queries while disconnected.
    bufferCommands: false,
  });

  if (config.target === "test") {
    // Second check, on the database the driver actually selected.
    try {
      assertTestDatabaseName(conn.connection.name);
    } catch (err) {
      await mongoose.disconnect();
      throw err;
    }
    // The database name only, never the connection string.
    console.info(`[db] Test database mode: connected to "${conn.connection.name}".`);
  }

  return conn;
}
