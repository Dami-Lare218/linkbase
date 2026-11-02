import type { ReactNode } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "md" | "lg";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner, and sets `disabled` and `aria-busy`. The label stays, so the width doesn't change. */
  loading?: boolean;
  disabled?: boolean;
  className?: string;
} & (
  | { href: string; type?: never }
  | { href?: never; type?: "button" | "submit" }
);

const base =
  "items-center justify-center gap-2 rounded-full border border-transparent font-sans text-body font-semibold leading-none tracking-[-0.01em] whitespace-nowrap no-underline cursor-pointer select-none transition-[background-color,border-color,transform] duration-[120ms] ease-[var(--ease-standard)] active:scale-[var(--press-scale)] disabled:cursor-not-allowed disabled:bg-surface-fill disabled:text-fg-disabled disabled:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-surface-inverse text-fg-inverse hover:bg-surface-inverse-hover hover:text-fg-inverse disabled:hover:bg-surface-fill disabled:hover:text-fg-disabled",
  secondary:
    "bg-surface-fill text-fg-primary hover:bg-surface-fill-hover hover:text-fg-primary active:bg-surface-fill-active disabled:hover:bg-surface-fill disabled:hover:text-fg-disabled",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-[var(--control-md)] px-6",
  lg: "h-[var(--control-lg)] px-7",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  className = "",
  href,
  type = "button",
}: ButtonProps) {
  const classes = [
    base,
    fullWidth ? "flex w-full" : "inline-flex",
    variants[variant],
    sizes[size],
    className,
  ].join(" ");

  const isDisabled = disabled || loading;

  // A disabled link renders as a disabled button (ui.md §2.1).
  if (href !== undefined && !isDisabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={href !== undefined ? "button" : type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classes}
    >
      {loading ? (
        <LoaderCircle size={20} aria-hidden className="animate-[lb-spin_800ms_linear_infinite]" />
      ) : null}
      {children}
    </button>
  );
}
