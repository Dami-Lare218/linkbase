import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type IconButtonVariant = "fill" | "ghost" | "white" | "inverse";
type IconButtonSize = "sm" | "md" | "lg";

type IconButtonProps = {
  icon: LucideIcon;
  /** Accessible name (also the tooltip). Icon-only controls always need one. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  shape?: "circle" | "rounded";
  disabled?: boolean;
  onClick?: () => void;
  /** Renders a link instead of a button. */
  href?: string;
  /** With `href`: open in a new tab (`rel="noopener noreferrer"`). */
  newTab?: boolean;
  className?: string;
};

const variants: Record<IconButtonVariant, string> = {
  fill: "bg-surface-fill text-fg-primary hover:bg-surface-fill-hover",
  ghost: "bg-transparent text-fg-primary hover:bg-surface-fill",
  white: "bg-white text-ink shadow-[var(--shadow-xs)] hover:bg-gray-50",
  inverse: "bg-surface-inverse text-fg-inverse hover:bg-surface-inverse-hover",
};

const sizes: Record<IconButtonSize, { box: string; icon: number }> = {
  sm: { box: "h-9 w-9", icon: 16 },
  md: { box: "h-11 w-11", icon: 20 },
  lg: { box: "h-14 w-14", icon: 24 },
};

/** Round (or rounded-square) icon-only button (design system `IconButton`). */
export function IconButton({
  icon: Icon,
  label,
  variant = "fill",
  size = "md",
  shape = "circle",
  disabled = false,
  onClick,
  href,
  newTab = false,
  className = "",
}: IconButtonProps) {
  const s = sizes[size];
  const classes = [
    "inline-flex flex-none cursor-pointer items-center justify-center border-none p-0 no-underline transition-[background-color,transform] duration-[120ms] ease-[var(--ease-standard)] active:scale-[.94]",
    shape === "circle" ? "rounded-full" : "rounded-md",
    s.box,
    disabled
      ? "cursor-not-allowed bg-surface-fill text-fg-disabled shadow-none hover:bg-surface-fill active:scale-100"
      : variants[variant],
    className,
  ].join(" ");

  if (href && !disabled && newTab) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`} title={label} className={classes}>
        <Icon size={s.icon} aria-hidden />
      </a>
    );
  }

  if (href && !disabled) {
    return (
      <Link href={href} aria-label={label} title={label} className={classes}>
        <Icon size={s.icon} aria-hidden />
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={classes}>
      <Icon size={s.icon} aria-hidden />
    </button>
  );
}
