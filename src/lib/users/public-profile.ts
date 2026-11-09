import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { connectToDatabase } from "@/lib/db/connect";
import { Link } from "@/lib/db/models/link";
import { User } from "@/lib/db/models/user";
import { getHandleFormatError, normalizeHandle } from "@/lib/validation/handle-rules";

import { toPublicProfile } from "./public-profile-mapping";
import type { PublicProfile } from "./public-profile-mapping";

/** Cache tag for one public profile. Invalidate it with `updateTag` after the owner's edits. */
export function profileTag(handle: string): string {
  return `profile:${handle}`;
}

/**
 * The public profile for `/user/[handle]`, or null when no user has that handle.
 * Not scoped to a signed-in user on purpose: it selects and returns public fields only.
 * Cached per handle; actions that change what the page shows call `updateTag(profileTag(handle))`.
 */
export async function getPublicProfile(rawHandle: string): Promise<PublicProfile | null> {
  const handle = normalizeHandle(rawHandle);
  // Values that can never be a stored handle are a 404 without a database query.
  if (getHandleFormatError(handle) !== null) return null;
  return loadPublicProfile(handle);
}

async function loadPublicProfile(handle: string): Promise<PublicProfile | null> {
  "use cache";
  cacheTag(profileTag(handle));
  cacheLife("hours");

  await connectToDatabase();
  const user = await User.findOne({ handle }).select("handle image showFooter").lean();
  if (!user) return null;

  // Active links only, in the order the dashboard shows them (newest first).
  const links = await Link.find({ userId: user._id, isActive: true })
    .sort({ createdAt: -1 })
    .select("title url isActive")
    .lean();

  return toPublicProfile(user, links);
}
