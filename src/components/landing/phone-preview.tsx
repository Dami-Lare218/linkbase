import { Lock } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/link-button";
import { SocialIcon } from "@/components/ui/social-icon";
import type { SocialNetwork } from "@/components/ui/social-icon";

const socials: SocialNetwork[] = ["instagram", "youtube", "pinterest"];

const profileLinks = [
  { title: "Spring collection — shop the drop", layout: "classic" },
  { title: "Watch: glazing a bowl in 60 seconds", layout: "featured" },
  { title: "Book a wheel-throwing class", layout: "classic" },
  { title: "Studio journal", layout: "classic" },
] as const;

/**
 * Decorative phone mockup of a sample profile. It is hidden from assistive tech
 * and made inert, so its sample links can't be focused or clicked.
 */
export function PhonePreview() {
  return (
    <div aria-hidden="true" inert className="w-[min(312px,100%)] box-border rounded-[48px] bg-ink p-2.5 shadow-[var(--shadow-xl)]">
      <div className="relative box-border flex h-[clamp(440px,58vw_+_290px,620px)] flex-col items-center gap-3.5 overflow-hidden rounded-[38px] bg-surface-profile px-4 pt-5">
        <div className="h-6 w-[88px] flex-none rounded-full bg-ink" />

        <div className="flex h-7 items-center gap-1.5 rounded-full bg-white px-3 text-caption font-medium text-fg-secondary shadow-[var(--shadow-xs)]">
          <Lock size={12} />
          <span>
            linkba.se/<span className="text-fg-primary">mayaokafor</span>
          </span>
        </div>

        <Avatar name="Maya Okafor" size={76} ring background="var(--lb-tangerine-400)" className="mt-1.5" />

        <div className="flex flex-col items-center gap-1 text-center">
          <div className="text-[17px] font-bold tracking-[-0.02em]">Maya Okafor</div>
          <div className="max-w-[220px] text-[13px] leading-[1.4] text-fg-secondary">
            Ceramicist and teacher. Small-batch tableware from a studio in Lisbon.
          </div>
        </div>

        <div className="-mt-1 flex gap-0.5">
          {socials.map((network) => (
            <SocialIcon key={network} network={network} href="#" size={18} />
          ))}
        </div>

        <div className="flex w-full flex-col gap-2.5">
          {profileLinks.map((link) => (
            <LinkButton key={link.title} title={link.title} layout={link.layout} href="#" />
          ))}
        </div>
      </div>
    </div>
  );
}
