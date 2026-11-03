import { Suspense } from "react";
import type { Metadata } from "next";

import { LinksDashboard } from "@/components/dashboard/links-dashboard";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/links/links";

export const metadata: Metadata = {
  title: "Dashboard · Linkbase",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  // The authoritative check (session + handle). Proxy's redirect is only a shortcut.
  const user = await requireOnboardedUser();
  // Scoped to the signed-in user; uncached, so every request (and refresh()) is current.
  const { links, showFooter } = await getDashboardData(user.id);

  return (
    <LinksDashboard
      name={user.name}
      email={user.email}
      handle={user.handle}
      links={links}
      showFooter={showFooter}
    />
  );
}

/** The canvas outline while the session and links load. */
function DashboardSkeleton() {
  return (
    <div aria-hidden className="flex min-h-svh flex-1 flex-col bg-surface-inverse">
      <div className="h-[var(--banner-height)]" />
      <div className="box-border flex flex-1 justify-center gap-10 rounded-t-3xl bg-surface-app px-4 pt-[88px] min-[768px]:px-8">
        <div className="flex w-full max-w-[600px] flex-col gap-4">
          <div className="h-10 w-40 rounded-md bg-surface-fill" />
          <div className="h-12 rounded-full bg-surface-fill" />
          <div className="h-20 rounded-xl bg-surface-fill" />
          <div className="h-20 rounded-xl bg-surface-fill" />
        </div>
        <div className="hidden h-[620px] w-[300px] flex-none rounded-[36px] bg-surface-fill min-[1100px]:block" />
      </div>
    </div>
  );
}
