import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";

import { auth } from "./auth";
import { LOGIN_PATH, ONBOARDING_PATH } from "./home-path";

/** The only user fields server code passes around. Never the raw document. */
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  /** Null until the user picks one during onboarding. */
  handle: string | null;
};

/**
 * The user id from the session cookie alone, or null. No database lookup, so it doesn't
 * notice deleted users: use it only for cheap, read-only work on public data (e.g. as a
 * rate-limit key for handle availability checks). Anything that reads or changes the
 * account uses `getCurrentUser()`.
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  // Per-request work: stop prerendering here, before Auth.js or the database driver
  // run (they use crypto randomness, which Cache Components rejects during prerender).
  await connection();
  const session = await auth();
  const id = session?.user?.id;
  return id && mongoose.isValidObjectId(id) ? id : null;
});

/**
 * The signed-in user, or null. Reads the session cookie (runtime data), so call it
 * behind a <Suspense> boundary. Cached per request, so repeated calls are free.
 *
 * The session only carries the user id. Name, email and handle come from the database,
 * so a new handle takes effect immediately, and a deleted user counts as signed out.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const id = await getSessionUserId();
  if (!id) return null;

  await connectToDatabase();
  const user = await User.findById(id).select("name email handle").lean();
  if (!user) return null;

  return { id, name: user.name, email: user.email, handle: user.handle ?? null };
});

/** The signed-in user, onboarded or not. Redirects to /login when there is no valid session. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_PATH);
  return user;
}

/**
 * A signed-in user who has picked a handle. Redirects to /login without a session, and to
 * /onboarding until a handle is set. Use this on every protected page except onboarding.
 */
export async function requireOnboardedUser(): Promise<CurrentUser & { handle: string }> {
  const user = await requireUser();
  if (!user.handle) redirect(ONBOARDING_PATH);
  return { ...user, handle: user.handle };
}
