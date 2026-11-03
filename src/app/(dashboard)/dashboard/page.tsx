import { Suspense } from "react";
import type { Metadata } from "next";

import { requireOnboardedUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Dashboard · Linkbase",
};

export default function DashboardPage() {
  return (
    <main className="mx-auto box-border flex w-full max-w-[var(--container-max)] flex-col gap-6 px-[clamp(20px,4vw,32px)] pt-[clamp(104px,14vw,136px)] pb-16">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  // The authoritative check (session + handle). Proxy's redirect is only a shortcut.
  const user = await requireOnboardedUser();

  return (
    <>
      <h1 className="m-0 font-display text-[length:clamp(32px,5vw,48px)] leading-[1.05] font-extrabold tracking-[var(--tracking-display)] text-balance text-fg-primary">
        Welcome, {user.name || "there"}
      </h1>
      <section className="flex flex-col items-start gap-2 rounded-xl border border-border-subtle bg-white p-[clamp(24px,4vw,40px)] shadow-[var(--shadow-card)]">
        <h2 className="m-0 text-heading-sm font-semibold text-fg-primary">Your page is empty</h2>
        <p className="m-0 max-w-[480px] text-body text-fg-secondary">
          Links you add will show up here. Adding links is coming soon.
        </p>
      </section>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="h-12 w-[min(360px,80%)] rounded-md bg-surface-fill" />
      <div className="h-40 rounded-xl bg-surface-fill" />
    </div>
  );
}
