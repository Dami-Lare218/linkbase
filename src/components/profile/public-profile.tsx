import type { ReactNode } from "react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/link-button";
import { Wordmark } from "@/components/ui/wordmark";
import type { PublicProfile } from "@/lib/users/public-profile-mapping";

import { ClaimOverlay } from "./claim-overlay";
import { ShareProfileButton } from "./share-profile-button";

/**
 * The page frame from Gabbasdev Profile.dc.html: backdrop, and a centred profile card
 * (≥640px) that goes full-bleed on small screens.
 */
export function ProfileFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="box-border flex min-h-svh flex-1 justify-center bg-[var(--surface-backdrop)] min-[640px]:px-6 min-[640px]:pt-10">
      <main
        aria-label={label}
        className="relative box-border flex w-full max-w-[580px] flex-col bg-surface-profile px-[clamp(16px,4vw,24px)] pt-4 font-sans text-fg-primary shadow-[var(--shadow-lg)] min-[640px]:rounded-t-[32px]"
      >
        {children}
      </main>
    </div>
  );
}

/** The white Wordmark chip that links home (top-left of the profile). */
export function HomeChip() {
  return (
    <Link
      href="/"
      aria-label="Linkbase home"
      className="inline-flex h-11 items-center rounded-md bg-white px-3.5 no-underline shadow-[var(--shadow-xs)]"
    >
      <Wordmark size={15} />
    </Link>
  );
}

/** A public profile: picture or initials, @handle, active links, footer and claim overlay. */
export function PublicProfileView({ profile }: { profile: PublicProfile }) {
  const { handle, image, links, showFooter } = profile;
  // Initials come from the handle: the name isn't public.
  const avatarName = `@${handle}`;

  return (
    <ProfileFrame label={`@${handle} on Linkbase`}>
      <div className="mb-[clamp(16px,4vw,28px)] flex items-center justify-between">
        <HomeChip />
        <ShareProfileButton handle={handle} />
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <span className="min-[640px]:hidden">
          <Avatar name={avatarName} src={image} size={88} />
        </span>
        <span className="hidden min-[640px]:inline-flex">
          <Avatar name={avatarName} src={image} size={96} />
        </span>
        <h1 className="m-0 text-center text-[length:clamp(20px,5vw,24px)] leading-[1.2] font-bold tracking-[-0.02em] break-all">
          @{handle}
        </h1>

        <div className="mt-2 flex w-full flex-col gap-[clamp(12px,2.5vw,16px)]">
          {links.length > 0 ? (
            links.map((link) => <LinkButton key={link.id} title={link.title} href={link.url} external />)
          ) : (
            <p className="m-0 py-6 text-center text-[15px] text-fg-secondary">No links yet.</p>
          )}
        </div>
      </div>

      <div className="min-h-12 flex-1" />
      <footer className="flex flex-wrap justify-center gap-x-2 gap-y-1.5 pt-6 pb-8 text-[13px]">
        <Link href="/" className="text-fg-primary no-underline hover:text-fg-brand">
          Explore Linkbase
        </Link>
      </footer>

      {showFooter ? <ClaimOverlay handle={handle} /> : null}
    </ProfileFrame>
  );
}
