import "server-only";

import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { getHandleFormatError, isReservedHandle, normalizeHandle } from "@/lib/validation/handle-rules";

export type ClaimHandleResult = "claimed" | "taken" | "already-set";

/** Public profile fields only. Never email, password hash or ids. */
export type PublicProfile = {
  handle: string;
  name: string;
};

function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof mongoose.mongo.MongoServerError && err.code === 11000;
}

/** True when nobody has the (normalized, format-valid) handle and it isn't reserved. */
export async function isHandleAvailable(handle: string): Promise<boolean> {
  if (isReservedHandle(handle)) return false;
  await connectToDatabase();
  return (await User.exists({ handle })) === null;
}

/**
 * Sets the handle on the user's own record, once. Pass a normalized, validated handle and the
 * session user id. The unique index decides races: if two users claim the same handle at once,
 * one of them gets "taken".
 */
export async function claimHandle(userId: string, handle: string): Promise<ClaimHandleResult> {
  if (isReservedHandle(handle)) return "taken";
  await connectToDatabase();

  try {
    const result = await User.updateOne(
      // Only users without a handle (field missing or null): a handle can't be changed here.
      { _id: userId, handle: null },
      { $set: { handle } },
      { runValidators: true },
    );
    return result.matchedCount === 0 ? "already-set" : "claimed";
  } catch (err) {
    if (isDuplicateKeyError(err)) return "taken";
    throw new Error("Failed to save handle", { cause: err });
  }
}

/**
 * Looks up a public profile by handle, for the planned /user/[handle] page.
 * Not scoped to the current user on purpose: it returns public fields only.
 */
export async function findPublicProfileByHandle(rawHandle: string): Promise<PublicProfile | null> {
  const handle = normalizeHandle(rawHandle);
  // Skip the query for values that can never match a stored handle.
  if (getHandleFormatError(handle) !== null) return null;

  await connectToDatabase();
  const user = await User.findOne({ handle }).select("name handle").lean();
  if (!user?.handle) return null;
  return { handle: user.handle, name: user.name };
}
