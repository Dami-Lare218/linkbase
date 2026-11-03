import { X, Zap } from "lucide-react";

type AnnouncementBarProps = {
  message: string;
  actionLabel?: string;
  /** Omit to show the action as unavailable (disabled). */
  onAction?: () => void;
  onDismiss?: () => void;
};

/** Full-width ink band for an upsell or notice (design system `AnnouncementBar`, `inverse` tone). */
export function AnnouncementBar({ message, actionLabel, onAction, onDismiss }: AnnouncementBarProps) {
  return (
    <div
      role="region"
      aria-label="Announcement"
      className="relative box-border flex min-h-[var(--banner-height)] flex-wrap items-center justify-center gap-3 bg-surface-inverse py-2 pr-12 pl-4 text-center text-body-sm font-medium text-fg-inverse min-[768px]:px-12"
    >
      <span>{message}</span>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          disabled={!onAction}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-[var(--lb-tangerine-500)] bg-transparent px-3.5 font-sans font-semibold text-[var(--lb-tangerine-400)] hover:bg-[var(--lb-tangerine-500)] hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-[var(--lb-tangerine-400)]"
        >
          <Zap size={16} aria-hidden />
          {actionLabel}
        </button>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="absolute top-1/2 right-3 inline-flex -translate-y-1/2 cursor-pointer border-none bg-transparent p-1.5 text-fg-inverse"
        >
          <X size={18} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
