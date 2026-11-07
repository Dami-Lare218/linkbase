type LinkButtonLayout = "classic" | "featured";
type LinkButtonShape = "rounded" | "pill" | "square";

type LinkButtonProps = {
  title: string;
  href: string;
  layout?: LinkButtonLayout;
  shape?: LinkButtonShape;
  /** Opens in a new tab with `rel="noopener noreferrer"` (outbound user links). */
  external?: boolean;
};

const shapes: Record<LinkButtonShape, string> = {
  rounded: "rounded-[var(--radius-link)]",
  pill: "rounded-full",
  square: "rounded-xs",
};

const base =
  "relative box-border block w-full bg-white font-sans text-ink no-underline transition-transform duration-200 ease-[var(--ease-spring)] hover:scale-[1.015] hover:text-ink active:scale-[.98]";

/** A link on a public profile: a full-width white button, optionally with a featured image. */
export function LinkButton({
  title,
  href,
  layout = "classic",
  shape = "rounded",
  external = false,
}: LinkButtonProps) {
  const target = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const newTabHint = external ? <span className="sr-only"> (opens in a new tab)</span> : null;

  if (layout === "featured") {
    return (
      <a href={href} {...target} className={`${base} rounded-xl p-2.5`}>
        <span className="block aspect-video overflow-hidden rounded-lg bg-[repeating-linear-gradient(135deg,var(--lb-gray-200)_0_12px,var(--lb-gray-150)_12px_24px)]" />
        <span className="block px-11 pt-3 pb-1.5 text-center text-body-sm leading-[1.35] font-semibold text-pretty">
          {title}
          {newTabHint}
        </span>
      </a>
    );
  }

  return (
    <a
      href={href}
      {...target}
      className={`${base} ${shapes[shape]} flex min-h-[var(--control-lg)] items-center justify-center px-[52px] py-2`}
    >
      <span className="text-center text-body leading-[1.3] font-semibold">
        {title}
        {newTabHint}
      </span>
    </a>
  );
}
