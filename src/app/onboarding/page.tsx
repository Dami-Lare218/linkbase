import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logOut } from "@/app/(auth)/actions";
import { HandleOnboarding } from "@/components/onboarding/handle-onboarding";
import { ProfilePreview } from "@/components/onboarding/profile-preview";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { DASHBOARD_PATH } from "@/lib/auth/home-path";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Choose your handle · Linkbase",
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingContent />
    </Suspense>
  );
}

async function OnboardingContent() {
  // The authoritative check. Proxy only redirects signed-out visitors early.
  const user = await requireUser();
  // Onboarding happens once: users with a handle go straight to the dashboard.
  if (user.handle) redirect(DASHBOARD_PATH);

  return <HandleOnboarding header={<OnboardingHeader />} />;
}

function OnboardingHeader() {
  return (
    <header className="flex items-center justify-between gap-3 px-[clamp(20px,4cqi,40px)] pt-[clamp(16px,2.5cqi,28px)]">
      <Wordmark size={24} />
      <form action={logOut}>
        <Button type="submit" variant="ghost" size="sm">
          Log out
        </Button>
      </form>
    </header>
  );
}

/** Same layout as the real screen, so nothing jumps when the session check finishes. */
function OnboardingSkeleton() {
  return (
    <div className="@container box-border flex min-h-svh flex-1 flex-wrap overflow-x-hidden bg-surface-page">
      <div aria-hidden className="flex min-w-0 flex-[1_1_440px] flex-col">
        <div className="flex items-center justify-between gap-3 px-[clamp(20px,4cqi,40px)] pt-[clamp(16px,2.5cqi,28px)]">
          <Wordmark size={24} />
          <div className="h-[var(--control-sm)] w-[84px] rounded-full bg-surface-fill" />
        </div>
        <div className="box-border flex flex-1 flex-col px-[clamp(20px,4cqi,40px)] pt-[clamp(40px,7cqi,64px)] pb-[clamp(48px,7cqi,80px)]">
          <div className="m-auto flex w-full max-w-[440px] flex-col gap-[clamp(32px,3.5cqi,40px)]">
            <div className="h-[clamp(72px,6.4cqi+48px,112px)] w-full rounded-md bg-surface-fill" />
            <div className="h-[82px] w-full rounded-md bg-surface-fill" />
            <div className="h-[var(--control-lg)] w-full rounded-full bg-surface-fill" />
          </div>
        </div>
      </div>
      <ProfilePreview handle={null} />
    </div>
  );
}
