import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "md" | "lg";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} & (
  | { href: string; type?: never }
  | { href?: never; type?: "button" | "submit" }
);

const base =
  "items-center justify-center gap-2 rounded-full border border-transparent font-sans text-body font-semibold leading-none tracking-[-0.01em] whitespace-nowrap no-underline cursor-pointer select-none transition-[background-color,border-color,transform] duration-[120ms] ease-[var(--ease-standard)] active:scale-[var(--press-scale)]";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-surface-inverse text-fg-inverse hover:bg-surface-inverse-hover hover:text-fg-inverse",
  secondary:
    "bg-surface-fill text-fg-primary hover:bg-surface-fill-hover hover:text-fg-primary active:bg-surface-fill-active",
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

  if (href !== undefined) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes}>
      {children}
    </button>
  );
}
