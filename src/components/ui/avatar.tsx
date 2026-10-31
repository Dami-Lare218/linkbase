type AvatarProps = {
  name: string;
  size?: number;
  ring?: boolean;
  /** Fallback background colour (any CSS colour). Defaults to grey-300. */
  background?: string;
  className?: string;
};

function getInitials(name: string): string {
  return name
    .replace(/^@/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/** Circular avatar showing the person's initials. Photo support comes with profiles. */
export function Avatar({
  name,
  size = 96,
  ring = false,
  background = "var(--lb-gray-300)",
  className = "",
}: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex flex-none items-center justify-center overflow-hidden rounded-full font-sans font-semibold text-white ${
        ring ? "shadow-[0_0_0_3px_var(--lb-white)]" : ""
      } ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background }}
    >
      {getInitials(name)}
    </span>
  );
}
