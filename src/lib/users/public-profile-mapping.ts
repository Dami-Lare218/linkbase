import { isHttpUrl } from "@/lib/validation/link";
import { isBlobAvatarUrl } from "@/lib/validation/profile-picture";

/**
 * The only data `/user/[handle]` receives. Decided public fields: handle, picture URL,
 * footer setting and active links (title, URL). Never name, email, password hash or
 * inactive links (Doc/data-fetching.md §4).
 */
export type PublicProfile = {
  handle: string;
  image: string | null;
  showFooter: boolean;
  links: PublicLink[];
};

export type PublicLink = { id: string; title: string; url: string };

/** Loosely typed database rows: only the listed fields are ever read. */
type UserRow = { handle?: unknown; image?: unknown; showFooter?: unknown };
type LinkRow = { _id: unknown; title?: unknown; url?: unknown; isActive?: unknown };

/**
 * Builds the public profile from database rows, picking fields one by one so nothing else
 * can leak, and dropping inactive links and links whose URL isn't a safe http(s) URL.
 * Keeps the links' order (the caller sorts them as the dashboard shows them).
 */
export function toPublicProfile(user: UserRow, links: LinkRow[]): PublicProfile | null {
  if (typeof user.handle !== "string" || user.handle.length === 0) return null;
  return {
    handle: user.handle,
    image: isBlobAvatarUrl(user.image) ? user.image : null,
    // Missing on older users counts as on.
    showFooter: user.showFooter !== false,
    links: links.flatMap((link) =>
      link.isActive === true && typeof link.title === "string" && typeof link.url === "string" && isHttpUrl(link.url)
        ? [{ id: String(link._id), title: link.title, url: link.url }]
        : [],
    ),
  };
}
