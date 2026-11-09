/**
 * `npm run qa:cleanup`: removes data created by QA runs, only from a verified test database.
 *
 * - Dry run by default: prints counts only. `npm run qa:cleanup -- --confirm` deletes.
 * - Deletes only users with QA emails (`qa+<run>-<n>@linkbase.test`), their profile pictures in the
 *   **test** Blob store and the links they own (first, so nothing is left without an owner), and the
 *   test database's rate-limit records
 *   (`authattempts`), so repeated QA runs don't hit sign-up limits.
 * - `--orphaned-links` also handles links whose owner no longer exists (left by clean-ups before
 *   links were handled). Real users' links always have an existing owner, so they never match.
 * - Never drops collections or databases. Checks the database name before and after connecting.
 * - The rules live in `src/lib/db/qa-cleanup.ts` (unit-tested); this file only connects.
 */
import { del } from "@vercel/blob";
import mongoose from "mongoose";
import type { ObjectId } from "mongodb";

import { assertTestDatabaseName } from "../src/lib/db/database-target.ts";
import { formatQaCleanupReport, parseQaCleanupArgs, QA_EMAIL_PATTERN, runQaCleanup } from "../src/lib/db/qa-cleanup.ts";
import type { QaCleanupStore } from "../src/lib/db/qa-cleanup.ts";
import { isBlobAvatarUrl } from "../src/lib/validation/profile-picture.ts";

import { loadQaBlobToken, loadQaDatabase, reportSafeError } from "./qa-env.ts";
import type { QaDatabase } from "./qa-env.ts";

const options = parseQaCleanupArgs(process.argv.slice(2));

let qa: QaDatabase;
try {
  qa = loadQaDatabase();
} catch (err) {
  reportSafeError(err);
  process.exit(1);
}

try {
  await mongoose.connect(qa.uri, { serverSelectionTimeoutMS: 5000, bufferCommands: false });
  // Second check, on the database the driver actually selected.
  assertTestDatabaseName(mongoose.connection.name);

  const users = mongoose.connection.collection("users");
  const links = mongoose.connection.collection("links");
  const authAttempts = mongoose.connection.collection("authattempts");

  /** Owner ids referenced by links that match no existing user. */
  async function findMissingOwnerIds(): Promise<ObjectId[]> {
    // `userId` is an ObjectId on every link (Link schema); distinct() returns them untyped.
    const ownerIds = (await links.distinct("userId")) as ObjectId[];
    if (ownerIds.length === 0) return [];
    const existing = await users.find({ _id: { $in: ownerIds } }, { projection: { _id: 1 } }).toArray();
    const existingIds = new Set(existing.map((user) => String(user._id)));
    return ownerIds.filter((id) => !existingIds.has(String(id)));
  }

  const store: QaCleanupStore<ObjectId> = {
    async findQaUserIds() {
      const found = await users.find({ email: { $regex: QA_EMAIL_PATTERN } }, { projection: { _id: 1 } }).toArray();
      return found.map((user) => user._id);
    },
    async findQaPictureUrls(userIds) {
      const found = await users
        .find({ _id: { $in: userIds }, image: { $type: "string" } }, { projection: { image: 1 } })
        .toArray();
      // Only Blob avatar URLs: anything else is never sent to the storage API.
      return found.map((user) => user.image).filter(isBlobAvatarUrl);
    },
    async deletePictures(urls) {
      // The test store's token only (refuses if it's missing or equals the dev token).
      await del(urls, { token: loadQaBlobToken() });
      return urls.length;
    },
    countLinksOwnedBy: (userIds) => links.countDocuments({ userId: { $in: userIds } }),
    async deleteLinksOwnedBy(userIds) {
      return (await links.deleteMany({ userId: { $in: userIds } })).deletedCount;
    },
    async countOrphanedLinks() {
      const missing = await findMissingOwnerIds();
      return missing.length === 0 ? 0 : links.countDocuments({ userId: { $in: missing } });
    },
    async deleteOrphanedLinks() {
      const missing = await findMissingOwnerIds();
      return missing.length === 0 ? 0 : (await links.deleteMany({ userId: { $in: missing } })).deletedCount;
    },
    countRateLimitRecords: () => authAttempts.countDocuments({}),
    async deleteRateLimitRecords() {
      return (await authAttempts.deleteMany({})).deletedCount;
    },
    async deleteUsers(userIds) {
      // By id snapshot and still restricted to QA emails, so nothing else can match.
      return (await users.deleteMany({ _id: { $in: userIds }, email: { $regex: QA_EMAIL_PATTERN } })).deletedCount;
    },
  };

  const report = await runQaCleanup(store, options);
  for (const line of formatQaCleanupReport(report, mongoose.connection.name)) console.info(line);
} catch (err) {
  reportSafeError(err);
} finally {
  await mongoose.disconnect();
}
