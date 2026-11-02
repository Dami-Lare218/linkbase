import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "./auth";

/** The only user fields server code passes around. Never the raw document. */
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
};

/**
 * The signed-in user, or null. Reads the session cookie (runtime data), so call it
 * behind a <Suspense> boundary. Cached per request, so repeated calls are free.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return { id: user.id, name: user.name ?? "", email: user.email };
});

/** The signed-in user. Redirects to /login when there is no valid session. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
