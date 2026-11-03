import { Link2, Share } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/link-button";
import { formatLiveCount, getLiveLinks } from "@/lib/links/display";
import type { DashboardLink } from "@/lib/links/display";

export type PreviewTheme = "mist" | "lilac" | "mint" | "peach";

export const PREVIEW_THEMES: { value: PreviewTheme; label: string; background: string }[] = [
  { value: "mist", label: "Mist", background: "var(--surface-profile)" },
  { value: "lilac", label: "Lilac", background: "var(--lb-lilac-200)" },
  { value: "mint", label: "Mint", background: "var(--lb-mint-100)" },
  { value: "peach", label: "Peach", background: "var(--lb-tangerine-50)" },
];

type ProfilePreviewPhoneProps = {
  name: string;
  handle: string;
  links: DashboardLink[];
  showFooter: boolean;
  theme: PreviewTheme;
};

/**
 * The live phone preview from the design: what the public profile will show (active links
 * with a safe URL, and the footer when it's on). It mirrors the editor, so it is `inert`
 * and hidden from assistive tech; the "Live · N links" line below it is announced instead.
 *
 * Scale follows the design's breakpoints through `--phone-scale` (300×620 at 1).
 */
export function ProfilePreviewPhone({ name, handle, links, showFooter, theme }: ProfilePreviewPhoneProps) {
  const live = getLiveLinks(links);
  const background = PREVIEW_THEMES.find((t) => t.value === theme)?.background ?? PREVIEW_THEMES[0].background;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-[calc(620px*var(--phone-scale))] w-[calc(300px*var(--phone-scale))] [--phone-scale:1] max-[339px]:[--phone-scale:0.88] min-[768px]:[--phone-scale:0.8] min-[800px]:[--phone-scale:0.9] min-[1100px]:[--phone-scale:1]">
        <div
          aria-hidden
          inert
          className="absolute top-0 left-0 flex h-[620px] w-[300px] origin-top-left scale-[var(--phone-scale)] flex-col overflow-hidden rounded-[36px] shadow-[var(--shadow-preview)]"
          style={{ background }}
        >
          <div className="flex flex-1 flex-col overflow-y-auto px-3.5 pt-4">
            <div className="mb-3 flex justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white shadow-[var(--shadow-xs)]">
                <Link2 size={16} />
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white shadow-[var(--shadow-xs)]">
                <Share size={16} />
              </span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Avatar name={name || handle} size={80} />
              <div className="text-[18px] font-bold tracking-[-0.02em]">@{handle}</div>
              <div className="mt-1.5 flex w-full flex-col gap-2.5 [&_a]:min-h-11 [&_a]:px-10 [&_span]:text-[13px]">
                {live.map((link) => (
                  <LinkButton key={link.id} title={link.title} href={link.url} />
                ))}
                {live.length === 0 ? (
                  <div className="px-3 py-5 text-center text-[13px] text-fg-secondary">Turn a link on to show it here.</div>
                ) : null}
              </div>
            </div>
            <div className="min-h-6 flex-1" />
          </div>
          {showFooter ? (
            <div className="flex justify-center pt-3 pb-[18px]">
              <div className="rounded-full bg-white px-4 py-2.5 text-caption font-semibold shadow-[var(--shadow-sm)]">
                Join {handle} on Linkbase
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <p className="m-0 flex items-center gap-1.5 text-[13px] text-fg-secondary">
        <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--status-success)]" />
        Live · {formatLiveCount(live.length)}
      </p>
    </div>
  );
}
