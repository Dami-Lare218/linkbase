import { CircleAlert, CircleCheck, X } from "lucide-react";

export type ToastTone = "success" | "error";

type ToastProps = {
  message: string;
  tone?: ToastTone;
  onClose?: () => void;
};

/** Dark pill notification (design system `Toast`). Place it inside a `role="status"` region. */
export function Toast({ message, tone = "success", onClose }: ToastProps) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <div className="flex min-h-[52px] animate-[lb-fade-up_var(--duration-slow)_var(--ease-out)] items-center gap-3 rounded-full bg-surface-inverse py-2 pr-2 pl-[18px] text-body-sm font-medium text-fg-inverse shadow-[var(--shadow-lg)]">
      <Icon
        size={20}
        aria-hidden
        className={`flex-none ${tone === "error" ? "text-[var(--lb-peach-300)]" : "text-[var(--lb-mint-200)]"}`}
      />
      <span className="pr-1">{message}</span>
      {onClose ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          className="inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-fg-inverse hover:bg-white/10"
        >
          <X size={18} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
