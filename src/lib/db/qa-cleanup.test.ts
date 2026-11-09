import { describe, expect, it } from "vitest";

import {
  formatQaCleanupReport,
  isQaEmail,
  parseQaCleanupArgs,
  runQaCleanup,
} from "@/lib/db/qa-cleanup";
import type { QaCleanupStore } from "@/lib/db/qa-cleanup";

type FakeUser = { id: string; email: string; image?: string };
type FakeLink = { id: string; userId: string };

/**
 * In-memory test database with the same semantics as the script's MongoDB store:
 * QA users by email pattern, links by owner id, orphans = owner missing.
 * Records every call so tests can check order and that a dry run never deletes.
 */
function fakeStore(seed: { users: FakeUser[]; links: FakeLink[]; rateLimits: number }) {
  const db = { users: [...seed.users], links: [...seed.links], rateLimits: seed.rateLimits };
  const calls: string[] = [];
  const ownerExists = (userId: string) => db.users.some((u) => u.id === userId);

  const deletedPictures: string[] = [];
  const store: QaCleanupStore<string> = {
    async findQaUserIds() {
      calls.push("findQaUserIds");
      return db.users.filter((u) => isQaEmail(u.email)).map((u) => u.id);
    },
    async findQaPictureUrls(ids) {
      calls.push("findQaPictureUrls");
      return db.users.flatMap((u) => (ids.includes(u.id) && u.image ? [u.image] : []));
    },
    async deletePictures(urls) {
      calls.push("deletePictures");
      deletedPictures.push(...urls);
      return urls.length;
    },
    async countLinksOwnedBy(ids) {
      calls.push("countLinksOwnedBy");
      return db.links.filter((l) => ids.includes(l.userId)).length;
    },
    async deleteLinksOwnedBy(ids) {
      calls.push("deleteLinksOwnedBy");
      const before = db.links.length;
      db.links = db.links.filter((l) => !ids.includes(l.userId));
      return before - db.links.length;
    },
    async countOrphanedLinks() {
      calls.push("countOrphanedLinks");
      return db.links.filter((l) => !ownerExists(l.userId)).length;
    },
    async deleteOrphanedLinks() {
      calls.push("deleteOrphanedLinks");
      const before = db.links.length;
      db.links = db.links.filter((l) => ownerExists(l.userId));
      return before - db.links.length;
    },
    async countRateLimitRecords() {
      calls.push("countRateLimitRecords");
      return db.rateLimits;
    },
    async deleteRateLimitRecords() {
      calls.push("deleteRateLimitRecords");
      const count = db.rateLimits;
      db.rateLimits = 0;
      return count;
    },
    async deleteUsers(ids) {
      calls.push("deleteUsers");
      const before = db.users.length;
      // Same double restriction as the script: id snapshot AND QA email.
      db.users = db.users.filter((u) => !(ids.includes(u.id) && isQaEmail(u.email)));
      return before - db.users.length;
    },
  };
  return { store, db, calls, deletedPictures };
}

// A mixed test database: two QA users, one real user, one orphaned link. Fresh per call.
function mixedSeed() {
  return {
    users: [
      { id: "qa1", email: "qa+20261103t2140-1@linkbase.test" },
      { id: "qa2", email: "qa+20261103t2140-2@linkbase.test" },
      { id: "real", email: "maya@example.com" },
    ],
    links: [
      { id: "l1", userId: "qa1" },
      { id: "l2", userId: "qa1" },
      { id: "l3", userId: "qa2" },
      { id: "l4", userId: "real" },
      { id: "l5", userId: "real" },
      { id: "orphan", userId: "deleted-user" },
    ],
    rateLimits: 4,
  };
}

const DELETE_CALLS = ["deletePictures", "deleteLinksOwnedBy", "deleteOrphanedLinks", "deleteUsers", "deleteRateLimitRecords"];

describe("isQaEmail", () => {
  it.each(["qa+20261103t2140-1@linkbase.test", "qa+run-12@linkbase.test", "qa+a@linkbase.test"])("accepts %s", (email) => {
    expect(isQaEmail(email)).toBe(true);
  });

  it.each([
    ["a real address", "maya@example.com"],
    ["no plus part", "qa@linkbase.test"],
    ["an empty plus part", "qa+@linkbase.test"],
    ["another domain", "qa+1@example.com"],
    ["a look-alike domain", "qa+1@linkbase.test.evil.com"],
    ["a longer TLD", "qa+1@linkbase.testing"],
    ["a prefix", "xqa+1@linkbase.test"],
    ["uppercase (stored emails are lowercase)", "QA+1@LINKBASE.TEST"],
    ["symbols in the run id", "qa+1$@linkbase.test"],
    ["a trailing newline", "qa+1@linkbase.test\n"],
  ])("rejects %s", (_label, email) => {
    expect(isQaEmail(email)).toBe(false);
  });

  it.each([undefined, null, 42, { $regex: ".*" }])("rejects a non-string (%j)", (value) => {
    expect(isQaEmail(value)).toBe(false);
  });
});

describe("parseQaCleanupArgs", () => {
  it("is a dry run without --confirm", () => {
    expect(parseQaCleanupArgs([])).toEqual({ confirm: false, orphanedLinks: false });
  });

  it("deletes only with --confirm", () => {
    expect(parseQaCleanupArgs(["--confirm"])).toEqual({ confirm: true, orphanedLinks: false });
  });

  it("handles orphaned links only when asked", () => {
    expect(parseQaCleanupArgs(["--orphaned-links"])).toEqual({ confirm: false, orphanedLinks: true });
    expect(parseQaCleanupArgs(["--confirm", "--orphaned-links"])).toEqual({ confirm: true, orphanedLinks: true });
  });

  it("ignores look-alike flags", () => {
    expect(parseQaCleanupArgs(["--confirmed", "confirm", "-confirm"])).toEqual({ confirm: false, orphanedLinks: false });
  });
});

describe("runQaCleanup: dry run (default)", () => {
  it("counts QA users, their links and rate-limit records", async () => {
    const { store } = fakeStore(mixedSeed());

    const report = await runQaCleanup(store, { confirm: false, orphanedLinks: false });

    expect(report).toEqual({
      dryRun: true,
      found: { qaUsers: 2, qaPictures: 0, qaLinks: 3, orphanedLinks: null, rateLimitRecords: 4 },
      deleted: null,
    });
  });

  it("never calls a delete operation", async () => {
    const { store, calls } = fakeStore(mixedSeed());

    await runQaCleanup(store, { confirm: false, orphanedLinks: true });

    expect(calls.filter((c) => DELETE_CALLS.includes(c))).toEqual([]);
  });

  it("leaves every record in place, even with --orphaned-links", async () => {
    const seed = mixedSeed();
    const { store, db } = fakeStore(seed);

    const report = await runQaCleanup(store, { confirm: false, orphanedLinks: true });

    expect(report.found.orphanedLinks).toBe(1);
    expect(db.users).toEqual(seed.users);
    expect(db.links).toEqual(seed.links);
    expect(db.rateLimits).toBe(4);
  });
});

describe("runQaCleanup: --confirm", () => {
  it("deletes QA users, the links they own and the rate-limit records", async () => {
    const { store, db } = fakeStore(mixedSeed());

    const report = await runQaCleanup(store, { confirm: true, orphanedLinks: false });

    expect(report.deleted).toEqual({ qaUsers: 2, qaPictures: 0, qaLinks: 3, orphanedLinks: null, rateLimitRecords: 4 });
    expect(db.users.map((u) => u.id)).toEqual(["real"]);
    expect(db.rateLimits).toBe(0);
  });

  it("never deletes a real user's links (ownership isolation)", async () => {
    const { store, db } = fakeStore(mixedSeed());

    await runQaCleanup(store, { confirm: true, orphanedLinks: false });

    expect(db.links.filter((l) => l.userId === "real").map((l) => l.id)).toEqual(["l4", "l5"]);
  });

  it("deletes the links before the users, so no QA link is left without an owner", async () => {
    const { store, calls } = fakeStore(mixedSeed());

    await runQaCleanup(store, { confirm: true, orphanedLinks: false });

    expect(calls.indexOf("deleteLinksOwnedBy")).toBeLessThan(calls.indexOf("deleteUsers"));
  });

  it("leaves orphaned links alone unless --orphaned-links is given", async () => {
    const { store, db, calls } = fakeStore(mixedSeed());

    await runQaCleanup(store, { confirm: true, orphanedLinks: false });

    expect(calls).not.toContain("deleteOrphanedLinks");
    expect(db.links.map((l) => l.id)).toEqual(["l4", "l5", "orphan"]);
  });

  it("with --orphaned-links, removes only links whose owner no longer exists", async () => {
    const { store, db } = fakeStore(mixedSeed());

    const report = await runQaCleanup(store, { confirm: true, orphanedLinks: true });

    expect(report.deleted?.orphanedLinks).toBe(1);
    expect(db.links.map((l) => l.id)).toEqual(["l4", "l5"]);
  });

  it("treats QA users' links as QA links, not orphans, because they are removed first", async () => {
    const { store } = fakeStore(mixedSeed());

    const report = await runQaCleanup(store, { confirm: true, orphanedLinks: true });

    expect(report.deleted).toMatchObject({ qaLinks: 3, orphanedLinks: 1 });
  });

  it("with no QA users, deletes no users or links and still clears rate-limit records", async () => {
    const { store, db, calls } = fakeStore({
      users: [{ id: "real", email: "maya@example.com" }],
      links: [{ id: "l4", userId: "real" }],
      rateLimits: 2,
    });

    const report = await runQaCleanup(store, { confirm: true, orphanedLinks: false });

    expect(report.deleted).toEqual({ qaUsers: 0, qaPictures: 0, qaLinks: 0, orphanedLinks: null, rateLimitRecords: 2 });
    expect(calls).not.toContain("deleteLinksOwnedBy");
    expect(calls).not.toContain("deleteUsers");
    expect(db.users).toHaveLength(1);
    expect(db.links).toHaveLength(1);
  });

  it("is safe to run twice", async () => {
    const { store } = fakeStore(mixedSeed());
    await runQaCleanup(store, { confirm: true, orphanedLinks: true });

    const second = await runQaCleanup(store, { confirm: true, orphanedLinks: true });

    expect(second.found).toEqual({ qaUsers: 0, qaPictures: 0, qaLinks: 0, orphanedLinks: 0, rateLimitRecords: 0 });
  });
});

describe("formatQaCleanupReport", () => {
  it("prints counts and the dry-run hint", () => {
    const lines = formatQaCleanupReport(
      { dryRun: true, found: { qaUsers: 2, qaPictures: 0, qaLinks: 3, orphanedLinks: null, rateLimitRecords: 4 }, deleted: null },
      "linkbase_test",
    );

    expect(lines).toEqual([
      '[qa] Test database "linkbase_test": 2 QA users, 0 QA pictures, 3 QA links, 4 rate-limit records.',
      "[qa] Dry run: nothing deleted. Run `npm run qa:cleanup -- --confirm` to delete them.",
    ]);
  });

  it("prints what was deleted, including orphaned links when requested", () => {
    const counts = { qaUsers: 1, qaPictures: 0, qaLinks: 2, orphanedLinks: 3, rateLimitRecords: 4 };

    const lines = formatQaCleanupReport({ dryRun: false, found: counts, deleted: counts }, "linkbase_test");

    expect(lines[1]).toBe("[qa] Deleted 1 QA users, 0 QA pictures, 2 QA links, 3 orphaned links, 4 rate-limit records.");
  });

  it("never prints anything that looks like a connection string", () => {
    const counts = { qaUsers: 0, qaPictures: 0, qaLinks: 0, orphanedLinks: null, rateLimitRecords: 0 };

    const text = formatQaCleanupReport({ dryRun: false, found: counts, deleted: counts }, "linkbase_test").join("\n");

    expect(text).not.toMatch(/mongodb(\+srv)?:\/\//);
  });
});

describe("runQaCleanup: profile pictures", () => {
  const QA_PIC = "https://teststore.public.blob.vercel-storage.com/avatars/qa1/a.webp";
  const REAL_PIC = "https://teststore.public.blob.vercel-storage.com/avatars/real/b.webp";

  function seedWithPictures() {
    const seed = mixedSeed();
    return {
      ...seed,
      users: seed.users.map((u) =>
        u.id === "qa1" ? { ...u, image: QA_PIC } : u.id === "real" ? { ...u, image: REAL_PIC } : u,
      ),
    };
  }

  it("counts QA users' pictures in a dry run without deleting them", async () => {
    const { store, deletedPictures } = fakeStore(seedWithPictures());

    const report = await runQaCleanup(store, { confirm: false, orphanedLinks: false });

    expect(report.found.qaPictures).toBe(1);
    expect(deletedPictures).toEqual([]);
  });

  it("deletes only QA users' pictures, never a real user's", async () => {
    const { store, deletedPictures } = fakeStore(seedWithPictures());

    const report = await runQaCleanup(store, { confirm: true, orphanedLinks: false });

    expect(deletedPictures).toEqual([QA_PIC]);
    expect(report.deleted?.qaPictures).toBe(1);
  });

  it("deletes the pictures first, while the users that point to them still exist", async () => {
    const { store, calls } = fakeStore(seedWithPictures());

    await runQaCleanup(store, { confirm: true, orphanedLinks: false });

    const deletes = calls.filter((c) => DELETE_CALLS.includes(c));
    expect(deletes[0]).toBe("deletePictures");
    expect(deletes.indexOf("deletePictures")).toBeLessThan(deletes.indexOf("deleteUsers"));
  });

  it("doesn't call storage when no QA user has a picture", async () => {
    const { store, calls } = fakeStore(mixedSeed());

    await runQaCleanup(store, { confirm: true, orphanedLinks: false });

    expect(calls).not.toContain("deletePictures");
  });

  it("doesn't look for pictures when there are no QA users", async () => {
    const seed = seedWithPictures();
    const { store, calls } = fakeStore({ ...seed, users: seed.users.filter((u) => u.id === "real") });

    const report = await runQaCleanup(store, { confirm: true, orphanedLinks: false });

    expect(calls).not.toContain("findQaPictureUrls");
    expect(report.deleted?.qaPictures).toBe(0);
  });

  it("reports the picture count", () => {
    const counts = { qaUsers: 1, qaPictures: 1, qaLinks: 0, orphanedLinks: null, rateLimitRecords: 0 };
    const text = formatQaCleanupReport({ dryRun: true, found: counts, deleted: null }, "linkbase_test").join("\n");

    expect(text).toContain("1 QA pictures");
    expect(text).not.toContain("vercel-storage.com");
  });
});
