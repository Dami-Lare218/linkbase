import { Suspense } from "react";
import { redirect } from "next/navigation";

import { homePathFor } from "@/lib/auth/home-path";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * On /login and /signup: sends visitors who are already signed in straight to where they
 * belong (/dashboard, or /onboarding until they have a handle), in one redirect.
 *
 * This runs on the page, not in Proxy, because it needs the database-backed check.
 * Proxy only sees the cookie, so a deleted user's leftover cookie would bounce between
 * /login (Proxy: "signed in") and /dashboard (page: "no such user") forever.
 * Renders nothing; it streams in behind Suspense so the form still prerenders.
 */
export function RedirectIfSignedIn() {
  return (
    <Suspense fallback={null}>
      <RedirectIfSignedInContent />
    </Suspense>
  );
}

async function RedirectIfSignedInContent() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user));
  return null;
}
