import { Copy, Link2 } from "lucide-react";

type UrlPillProps = {
  /** Shown text, e.g. `linkba.se/maya`. */
  url: string;
  onCopy: () => void;
};

/** Grey pill showing the profile address with a copy action (design system `UrlPill`, `fill` + `copy`). */
export function UrlPill({ url, onCopy }: UrlPillProps) {
  return (
    <div className="box-border flex h-12 max-w-full min-w-0 items-center gap-1.5 rounded-full bg-surface-fill pr-2 pl-3.5 text-body font-medium text-fg-primary min-[375px]:gap-2.5 min-[375px]:pl-5">
      <Link2 size={18} aria-hidden className="hidden flex-none min-[375px]:block" />
      <span className="min-w-0 truncate">{url}</span>
      <button
        type="button"
        aria-label="Copy link"
        title="Copy link"
        onClick={onCopy}
        className="inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-fg-primary hover:bg-surface-fill-hover"
      >
        <Copy size={18} aria-hidden />
      </button>
    </div>
  );
}
