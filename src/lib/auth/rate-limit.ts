import "server-only";

import { createHash } from "node:crypto";

import mongoose from "mongoose";

import { AuthAttempt } from "@/lib/db/models/auth-attempt";

const MINUTE = 60 * 1000;

/** Limits per fixed window. Keys are hashed before storage. */
export const RATE_LIMITS = {
  logInEmail: { limit: 5, windowMs: 15 * MINUTE },
  logInIp: { limit: 20, windowMs: 15 * MINUTE },
  signUpIp: { limit: 5, windowMs: 60 * MINUTE },
} as const;

type RateLimitName = keyof typeof RATE_LIMITS;

/** Builds the stored key, e.g. `logInEmail:<sha256>`. The raw value is never stored. */
export function rateLimitKey(name: RateLimitName, value: string): string {
  const digest = createHash("sha256").update(value).digest("hex");
  return `${name}:${digest}`;
}

function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof mongoose.mongo.MongoServerError && err.code === 11000;
}

/**
 * Counts one attempt against a fixed window and reports whether it is still allowed.
 * Atomic per key, so it works across multiple server instances.
 * Call `connectToDatabase()` first.
 */
export async function consumeRateLimit(name: RateLimitName, value: string): Promise<boolean> {
  const { limit, windowMs } = RATE_LIMITS[name];
  const key = rateLimitKey(name, value);
  const now = new Date();
  const nextExpiry = new Date(now.getTime() + windowMs);

  // MongoDB's TTL sweep runs about once a minute, so restart an expired window ourselves.
  await AuthAttempt.updateOne(
    { key, expiresAt: { $lte: now } },
    { $set: { count: 0, expiresAt: nextExpiry } },
  );

  const increment = () =>
    AuthAttempt.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: nextExpiry } },
      { upsert: true, returnDocument: "after", lean: true },
    );

  let attempt;
  try {
    attempt = await increment();
  } catch (err) {
    // Two first attempts at the same moment can both try to insert. Retry once as an update.
    if (!isDuplicateKeyError(err)) throw err;
    attempt = await increment();
  }

  return attempt !== null && attempt.count <= limit;
}

/** Clears a counter, e.g. the per-email login counter after a successful login. */
export async function resetRateLimit(name: RateLimitName, value: string): Promise<void> {
  await AuthAttempt.deleteOne({ key: rateLimitKey(name, value) });
}

/**
 * Best-effort client IP from proxy headers. Only trustworthy behind a proxy that sets
 * `x-forwarded-for` itself (e.g. Vercel). Falls back to one shared bucket.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return headers.get("x-real-ip")?.trim() || "unknown";
}
