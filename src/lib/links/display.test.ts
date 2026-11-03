import { describe, expect, it } from "vitest";

import {
  applyLinkOverrides,
  formatClicks,
  formatLiveCount,
  getLinkDomain,
  getLiveLinks,
  NO_LINK_OVERRIDES,
} from "@/lib/links/display";
import type { DashboardLink } from "@/lib/links/display";

// Fresh link per call, so no test can affect another.
function link(overrides: Partial<DashboardLink> = {}): DashboardLink {
  return { id: "1", title: "Portfolio", url: "https://maya.design", isActive: true, clicks: 0, ...overrides };
}

describe("getLinkDomain", () => {
  it.each([
    ["https://maya.design/work", "maya.design"],
    ["https://www.instagram.com/maya", "instagram.com"],
    ["http://Example.COM/Path", "example.com"],
    ["https://sub.www.example.com", "sub.www.example.com"],
    ["https://cal.com/maya/review?x=1#top", "cal.com"],
    ["http://localhost:3000/page", "localhost"],
  ])("%s → %s", (url, domain) => {
    expect(getLinkDomain(url)).toBe(domain);
  });

  it.each(["javascript:alert(1)", "maya.design", "", "ftp://x.com"])("returns an empty string for %j", (url) => {
    expect(getLinkDomain(url)).toBe("");
  });
});

describe("formatClicks", () => {
  it.each([
    [0, "0 clicks"],
    [1, "1 click"],
    [2, "2 clicks"],
    [128, "128 clicks"],
  ])("%i → %s", (clicks, label) => {
    expect(formatClicks(clicks)).toBe(label);
  });

  it.each([
    ["negative", -5, "0 clicks"],
    ["NaN", Number.NaN, "0 clicks"],
    ["Infinity", Number.POSITIVE_INFINITY, "0 clicks"],
    ["a fraction", 2.7, "2 clicks"],
    ["a fraction just above one", 1.5, "1 click"],
  ])("treats %s safely", (_label, clicks, expected) => {
    expect(formatClicks(clicks)).toBe(expected);
  });
});

describe("getLiveLinks", () => {
  it("keeps only active links, in their original order", () => {
    const links = [
      link({ id: "a", isActive: true }),
      link({ id: "b", isActive: false }),
      link({ id: "c", isActive: true }),
    ];

    expect(getLiveLinks(links).map((l) => l.id)).toEqual(["a", "c"]);
  });

  it("drops active links whose stored URL is no longer safe (re-checked at render)", () => {
    const links = [
      link({ id: "ok" }),
      link({ id: "js", url: "javascript:alert(1)" }),
      link({ id: "bare", url: "maya.design" }),
    ];

    expect(getLiveLinks(links).map((l) => l.id)).toEqual(["ok"]);
  });

  it("returns an empty list when every link is off", () => {
    expect(getLiveLinks([link({ isActive: false }), link({ id: "2", isActive: false })])).toEqual([]);
  });

  it("returns an empty list for no links", () => {
    expect(getLiveLinks([])).toEqual([]);
  });

  it("doesn't change the input", () => {
    const links = [link({ id: "a" }), link({ id: "b", isActive: false })];
    const snapshot = structuredClone(links);

    getLiveLinks(links);

    expect(links).toEqual(snapshot);
  });
});

describe("applyLinkOverrides", () => {
  it("returns the links unchanged when nothing is pending", () => {
    const links = [link({ id: "a" }), link({ id: "b" })];

    expect(applyLinkOverrides(links, NO_LINK_OVERRIDES)).toEqual(links);
  });

  it("hides a link whose deletion was confirmed, even if the server list still has it", () => {
    const links = [link({ id: "a" }), link({ id: "b" })];

    const result = applyLinkOverrides(links, { added: [], removed: new Set(["a"]), changes: {} });

    expect(result.map((l) => l.id)).toEqual(["b"]);
  });

  it("shows confirmed edits instead of the stale server values", () => {
    const links = [link({ id: "a", title: "Old", url: "https://old.example.com" })];

    const result = applyLinkOverrides(links, {
      added: [],
      removed: new Set(),
      changes: { a: { title: "New", url: "https://new.example.com" } },
    });

    expect(result[0]).toMatchObject({ id: "a", title: "New", url: "https://new.example.com" });
  });

  it("applies a confirmed switch change without touching other fields", () => {
    const links = [link({ id: "a", title: "Keep", isActive: true, clicks: 7 })];

    const result = applyLinkOverrides(links, { added: [], removed: new Set(), changes: { a: { isActive: false } } });

    expect(result[0]).toEqual({ ...links[0], isActive: false });
  });

  it("is a no-op once the server data already matches", () => {
    const links = [link({ id: "a", title: "New" })];

    const result = applyLinkOverrides(links, { added: [], removed: new Set(["gone"]), changes: { a: { title: "New" } } });

    expect(result).toEqual(links);
  });

  it("ignores changes for links that no longer exist", () => {
    const links = [link({ id: "a" })];

    const result = applyLinkOverrides(links, { added: [], removed: new Set(), changes: { zzz: { title: "Ghost" } } });

    expect(result).toEqual(links);
  });

  it("shows a confirmed new link on top before the server list includes it", () => {
    const links = [link({ id: "old" })];
    const fresh = link({ id: "new", title: "Fresh" });

    const result = applyLinkOverrides(links, { added: [fresh], removed: new Set(), changes: {} });

    expect(result.map((l) => l.id)).toEqual(["new", "old"]);
  });

  it("doesn't show a new link twice once the server list includes it", () => {
    const fresh = link({ id: "new" });
    const links = [fresh, link({ id: "old" })];

    const result = applyLinkOverrides(links, { added: [fresh], removed: new Set(), changes: {} });

    expect(result.map((l) => l.id)).toEqual(["new", "old"]);
  });

  it("keeps several new links newest first", () => {
    const result = applyLinkOverrides([], {
      added: [link({ id: "second" }), link({ id: "first" })],
      removed: new Set(),
      changes: {},
    });

    expect(result.map((l) => l.id)).toEqual(["second", "first"]);
  });

  it("applies an edit or switch to a new link the server list doesn't include yet", () => {
    const fresh = link({ id: "new", title: "Draft", isActive: true });

    const result = applyLinkOverrides([], {
      added: [fresh],
      removed: new Set(),
      changes: { new: { title: "Final", isActive: false } },
    });

    expect(result).toEqual([{ ...fresh, title: "Final", isActive: false }]);
  });

  it("hides a new link that was then deleted", () => {
    const result = applyLinkOverrides([], { added: [link({ id: "new" })], removed: new Set(["new"]), changes: {} });

    expect(result).toEqual([]);
  });

  it("keeps the order and doesn't change the input", () => {
    const links = [link({ id: "a" }), link({ id: "b" }), link({ id: "c" })];
    const snapshot = structuredClone(links);

    const result = applyLinkOverrides(links, { added: [], removed: new Set(["b"]), changes: { c: { title: "C" } } });

    expect(result.map((l) => l.id)).toEqual(["a", "c"]);
    expect(links).toEqual(snapshot);
  });
});

describe("formatLiveCount", () => {
  it.each([
    [0, "0 links"],
    [1, "1 link"],
    [2, "2 links"],
    [12, "12 links"],
  ])("%i → %s", (count, label) => {
    expect(formatLiveCount(count)).toBe(label);
  });
});
