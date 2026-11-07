import { describe, expect, it } from "vitest";

import { toPublicProfile } from "@/lib/users/public-profile-mapping";
import { getHandleFormatError, normalizeHandle } from "@/lib/validation/handle-rules";

const AVATAR = "https://abc123store.public.blob.vercel-storage.com/avatars/u1/4b8e1d2a.webp";

type LinkRow = { _id: unknown; title?: unknown; url?: unknown; isActive?: unknown };

// Fresh rows per call, so no test can affect another.
function link(overrides: Partial<LinkRow> = {}): LinkRow {
  return { _id: "l1", title: "Portfolio", url: "https://maya.design", isActive: true, ...overrides };
}

// A full database row, private fields included, as `.lean()` could return it.
function userRow(overrides: Record<string, unknown> = {}) {
  return {
    _id: "u1",
    handle: "maya",
    name: "Maya Ortiz",
    email: "maya@example.com",
    passwordHash: "$2b$12$secretsecretsecretsecretsecret",
    image: AVATAR,
    showFooter: true,
    createdAt: new Date("2026-11-01T00:00:00Z"),
    ...overrides,
  };
}

describe("toPublicProfile: public fields", () => {
  it("returns only handle, image, showFooter and links", () => {
    const profile = toPublicProfile(userRow(), [link()]);

    expect(profile).toEqual({
      handle: "maya",
      image: AVATAR,
      showFooter: true,
      links: [{ id: "l1", title: "Portfolio", url: "https://maya.design" }],
    });
  });

  it("never includes the name, email, password hash or user id", () => {
    const text = JSON.stringify(toPublicProfile(userRow(), [link()]));

    expect(text).not.toContain("Maya Ortiz");
    expect(text).not.toContain("maya@example.com");
    expect(text).not.toContain("$2b$");
    expect(text).not.toContain("u1\"");
    expect(text).not.toMatch(/name|email|password|createdAt|_id/);
  });

  it("drops extra fields on links (no userId, clicks or isActive)", () => {
    const row = { ...link(), userId: "u1", clicks: 99, createdAt: new Date() };
    const profile = toPublicProfile(userRow(), [row]);

    expect(Object.keys(profile?.links[0] ?? {})).toEqual(["id", "title", "url"]);
  });

  it("turns an ObjectId-like link id into a string", () => {
    const id = { toString: () => "665f1c2e9b1d4a0012345678" };
    expect(toPublicProfile(userRow(), [link({ _id: id })])?.links[0]?.id).toBe("665f1c2e9b1d4a0012345678");
  });
});

describe("toPublicProfile: not found", () => {
  it.each([undefined, null, "", 42])("returns null when the handle is %j", (handle) => {
    expect(toPublicProfile(userRow({ handle }), [link()])).toBeNull();
  });

  it("returns null for a user who hasn't picked a handle", () => {
    const withoutHandle: Record<string, unknown> = userRow();
    delete withoutHandle.handle;
    expect(toPublicProfile(withoutHandle, [])).toBeNull();
  });
});

describe("toPublicProfile: profile picture", () => {
  it("is null when the user has none", () => {
    const withoutImage: Record<string, unknown> = userRow();
    delete withoutImage.image;
    expect(toPublicProfile(withoutImage, [])?.image).toBeNull();
  });

  it.each([
    ["an http URL", AVATAR.replace("https://", "http://")],
    ["another host", "https://evil.example.com/avatars/u1/x.webp"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["an empty string", ""],
    ["a number", 7],
  ])("is null for %s (only stored Blob avatars are shown)", (_name, image) => {
    expect(toPublicProfile(userRow({ image }), [])?.image).toBeNull();
  });
});

describe("toPublicProfile: footer", () => {
  it.each([
    [true, true],
    [false, false],
    [undefined, true],
    [null, true],
  ])("showFooter %j → %j (missing counts as on)", (showFooter, expected) => {
    expect(toPublicProfile(userRow({ showFooter }), [])?.showFooter).toBe(expected);
  });
});

describe("toPublicProfile: links", () => {
  it("keeps the order it's given (the query sorts newest first, like the dashboard)", () => {
    const rows = [link({ _id: "c", title: "Newest" }), link({ _id: "b", title: "Middle" }), link({ _id: "a", title: "Oldest" })];

    expect(toPublicProfile(userRow(), rows)?.links.map((l) => l.title)).toEqual(["Newest", "Middle", "Oldest"]);
  });

  it("keeps the order of the remaining links when some are dropped", () => {
    const rows = [
      link({ _id: "1", title: "One" }),
      link({ _id: "2", title: "Off", isActive: false }),
      link({ _id: "3", title: "Three" }),
      link({ _id: "4", title: "Bad", url: "javascript:alert(1)" }),
      link({ _id: "5", title: "Five" }),
    ];

    expect(toPublicProfile(userRow(), rows)?.links.map((l) => l.id)).toEqual(["1", "3", "5"]);
  });

  it.each([false, undefined, null, "true", 1])("drops a link whose isActive is %j", (isActive) => {
    expect(toPublicProfile(userRow(), [link({ isActive })])?.links).toEqual([]);
  });

  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "ftp://files.example.com",
    "maya.design",
    "/relative/path",
    "https://exa mple.com",
    "",
  ])("drops a link with the unsafe or invalid URL %j", (url) => {
    expect(toPublicProfile(userRow(), [link({ url })])?.links).toEqual([]);
  });

  it.each([
    ["a missing title", { title: undefined }],
    ["a non-string title", { title: 5 }],
    ["a missing URL", { url: undefined }],
    ["a non-string URL", { url: { href: "https://x.com" } }],
  ])("drops a link with %s", (_name, overrides) => {
    expect(toPublicProfile(userRow(), [link(overrides)])?.links).toEqual([]);
  });

  it("keeps http and https URLs", () => {
    const rows = [link({ _id: "1", url: "http://example.com" }), link({ _id: "2", url: "https://example.com/a?b=c#d" })];
    expect(toPublicProfile(userRow(), rows)?.links).toHaveLength(2);
  });

  it("passes titles through as text, without changing them (React escapes them)", () => {
    const title = '<img src=x onerror="alert(1)">';
    expect(toPublicProfile(userRow(), [link({ title })])?.links[0]?.title).toBe(title);
  });

  it("returns an empty list when the user has no links", () => {
    expect(toPublicProfile(userRow(), [])?.links).toEqual([]);
  });
});

// `getPublicProfile` (server-only) runs these two pure steps before any database query:
// a handle that fails them is a 404 straight away.
describe("public profile handles: which are a 404 without a lookup", () => {
  const isLookedUp = (raw: string) => getHandleFormatError(normalizeHandle(raw)) === null;

  it.each(["maya", "maya_ortiz", "maya-ortiz", "abc", "a".repeat(30), "no-such-handle", " Maya ", "MAYA"])(
    "looks up %j",
    (raw) => {
      expect(isLookedUp(raw)).toBe(true);
    },
  );

  it.each([
    "-".repeat(1),
    "ab",
    "a".repeat(31),
    "",
    "   ",
    "A!",
    "maya.ortiz",
    "maya ortiz",
    "../dashboard",
    "%2e%2e",
    "<script>",
    "maya$",
    "ma\u0000ya",
    "máya",
  ])("is a 404 without a lookup for %j", (raw) => {
    expect(isLookedUp(raw)).toBe(false);
  });

  it("normalizes case and spaces before the lookup", () => {
    expect(normalizeHandle(" Maya_Ortiz ")).toBe("maya_ortiz");
  });
});
