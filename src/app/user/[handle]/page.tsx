import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicProfileView } from "@/components/profile/public-profile";
import { getPublicProfile } from "@/lib/users/public-profile";

/**
 * Complete static output only: for a handle not prerendered yet, Next.js waits for the full
 * page instead of serving the App Shell first. That way `notFound()` runs before the response
 * starts, so unknown handles get a real 404 status (a streamed shell would lock in a 200).
 * Allowed because the page reads only cached data (`getPublicProfile`) and no request data.
 */
export const ensureStatic = "navigation";

/**
 * The page blocks on purpose (it awaits `params` and the lookup outside <Suspense> so the
 * 404 status is set in time). This tells Next.js that's intended, which stops the dev-only
 * "URL data outside <Suspense>" and empty static shell reports (instant.md, "Disabling instant").
 * The complete static-output check from `ensureStatic` still applies.
 */
export const instant = false;

/**
 * With Cache Components, a dynamic route needs at least one sample param to await `params`
 * outside <Suspense> (bundled docs: generate-static-params, "With Cache Components").
 * The sample fails the handle format check, so the build never queries the database.
 * Real handles render on their first request and stay cached until `updateTag`.
 */
export async function generateStaticParams() {
  return [{ handle: "-" }];
}

export async function generateMetadata({ params }: PageProps<"/user/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) return { title: "Profile not found · Linkbase" };
  return { title: `@${profile.handle} · Linkbase`, description: `@${profile.handle}’s links on Linkbase.` };
}

/** Public profile. No sign-in: it reads only the cached public fields for the handle. */
export default async function PublicProfilePage({ params }: PageProps<"/user/[handle]">) {
  const { handle } = await params;
  // Resolved before anything streams, so an unknown handle gets a real 404 status.
  const profile = await getPublicProfile(handle);
  if (!profile) notFound();

  return <PublicProfileView profile={profile} />;
}
