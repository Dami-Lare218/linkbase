import "server-only";

import mongoose from "mongoose";

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
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local (see .env.example).");
  }

  cached.promise ??= mongoose.connect(uri, {
    // Fail after 5s instead of the 30s default when the server can't be reached.
    serverSelectionTimeoutMS: 5000,
    // Error immediately instead of queueing queries while disconnected.
    bufferCommands: false,
  });

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Clear the failed attempt so the next call retries.
    cached.promise = null;
    // Generic message so the connection string never reaches a client; details stay in `cause`.
    throw new Error("Could not connect to MongoDB", { cause: err });
  }

  return cached.conn;
}
