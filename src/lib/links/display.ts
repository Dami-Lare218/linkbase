import { isHttpUrl } from "@/lib/validation/link";

/** A link as the dashboard and its preview see it. Plain data, safe to pass to Client Components. */
export type DashboardLink = {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  clicks: number;
};

/** The host shown under a link title, without `www.` (e.g. `maya.design`). Empty for invalid URLs. */
export function getLinkDomain(url: string): string {
  if (!isHttpUrl(url)) return "";
  return new URL(url).hostname.replace(/^www\./, "");
}

/** "1 click", "128 clicks". */
export function formatClicks(clicks: number): string {
  const count = Number.isFinite(clicks) && clicks > 0 ? Math.floor(clicks) : 0;
  return `${count} ${count === 1 ? "click" : "clicks"}`;
}

/** The links the public profile (and the dashboard preview) shows: active ones with a safe URL. */
export function getLiveLinks<T extends Pick<DashboardLink, "isActive" | "url">>(links: T[]): T[] {
  return links.filter((link) => link.isActive && isHttpUrl(link.url));
}

/**
 * Changes the server has confirmed but the page may not show yet. A Server Action's
 * success reply (toast, closed dialog) can reach the UI a moment before the refreshed
 * list, so the dashboard applies confirmed changes itself. Once the refreshed data
 * arrives it already matches, so nothing flickers back.
 */
export type LinkOverrides = {
  /** Newly created links, newest first. Shown until the server list includes them. */
  added: readonly DashboardLink[];
  removed: ReadonlySet<string>;
  changes: Readonly<Record<string, Partial<Pick<DashboardLink, "title" | "url" | "isActive">>>>;
};

export const NO_LINK_OVERRIDES: LinkOverrides = { added: [], removed: new Set(), changes: {} };

/**
 * The links with confirmed new links on top (unless the server list already has them),
 * confirmed deletions hidden and confirmed edits/toggles applied.
 */
export function applyLinkOverrides(links: DashboardLink[], overrides: LinkOverrides): DashboardLink[] {
  const serverIds = new Set(links.map((link) => link.id));
  const pendingNew = overrides.added.filter((link) => !serverIds.has(link.id));
  return [...pendingNew, ...links]
    .filter((link) => !overrides.removed.has(link.id))
    .map((link) => {
      const change = overrides.changes[link.id];
      return change ? { ...link, ...change } : link;
    });
}

/** "Live · 1 link", "Live · 3 links". */
export function formatLiveCount(count: number): string {
  return `${count} ${count === 1 ? "link" : "links"}`;
}
