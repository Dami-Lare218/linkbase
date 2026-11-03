import { Link2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/link-button";
import { SocialIcon } from "@/components/ui/social-icon";
import type { SocialNetwork } from "@/components/ui/social-icon";

const socials: SocialNetwork[] = ["instagram", "youtube", "tiktok"];
const sampleLinks = ["Portfolio", "Commission a mural", "Print shop"];

type ProfilePreviewProps = {
  /** The handle being typed, or null to show the grey `yourname` placeholder. */
  handle: string | null;
};

/**
 * The example profile beside the onboarding form ("Welcome Handle v3"). Only the URL pill
 * follows what the user types. The sample profile is decorative and `inert`, so its links
 * can't be focused or clicked.
 */
export function ProfilePreview({ handle }: ProfilePreviewProps) {
  return (
    <aside
      aria-label="Example profile preview"
      className="box-border flex min-w-0 flex-[1_1_400px] flex-col items-center justify-center gap-4 bg-[var(--surface-brand)] px-[clamp(20px,4cqi,40px)] py-[clamp(40px,6cqi,80px)]"
    >
      <div
        inert
        className="box-border flex w-full max-w-[320px] flex-col items-center gap-3.5 rounded-2xl bg-surface-profile px-4 pt-4 pb-6 shadow-[var(--shadow-xl)]"
      >
        <div className="box-border flex h-10 min-w-0 items-center gap-2 self-stretch rounded-full bg-white px-4 text-body-sm shadow-[var(--shadow-xs)]">
          <Link2 size={16} aria-hidden className="flex-none text-fg-secondary" />
          <span className="min-w-0 truncate">
            <span className="text-fg-secondary">linkba.se/</span>
            <span className={`font-semibold ${handle ? "text-fg-primary" : "text-fg-tertiary"}`}>
              {handle ?? "yourname"}
            </span>
          </span>
        </div>

        <div className="mt-2.5 flex flex-col items-center gap-1 text-center">
          <Avatar name="Maya Ortiz" size={80} background="var(--lb-ink-950)" color="var(--lb-tangerine-400)" />
          <span className="mt-2.5 text-heading-sm font-bold tracking-[var(--tracking-heading)]">Maya Ortiz</span>
          <span className="text-body-sm text-fg-secondary">Illustrator and muralist</span>
        </div>

        <div className="flex gap-0.5">
          {socials.map((network) => (
            <SocialIcon key={network} network={network} href="#" size={20} />
          ))}
        </div>

        <div className="mt-1 flex flex-col gap-2.5 self-stretch">
          {sampleLinks.map((title) => (
            <LinkButton key={title} title={title} href="#" />
          ))}
        </div>
      </div>
      <span className="text-body-sm font-semibold text-ink">Example profile</span>
    </aside>
  );
}
