import Image from "next/image";

type AvatarProps = {
  /** Used for the initials and the accessible name. */
  name: string;
  /** Profile picture URL (Vercel Blob). Initials show when it's missing. */
  src?: string | null;
  size?: number;
  ring?: boolean;
  /** Fallback background colour (any CSS colour). Defaults to grey-300. */
  background?: string;
  /** Initials colour (any CSS colour). Defaults to white. */
  color?: string;
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

/** Circular avatar: the profile picture when there is one, otherwise the person's initials. */
export function Avatar({
  name,
  src,
  size = 96,
  ring = false,
  background = "var(--lb-gray-300)",
  color = "var(--lb-white)",
  className = "",
}: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex flex-none items-center justify-center overflow-hidden rounded-full font-sans font-semibold ${
        ring ? "shadow-[0_0_0_3px_var(--lb-white)]" : ""
      } ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background, color }}
    >
      {src ? (
        <Image src={src} alt="" width={size} height={size} sizes={`${size}px`} className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
