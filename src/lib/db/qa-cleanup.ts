/**
 * QA data clean-up logic for `npm run qa:cleanup` (`scripts/qa-cleanup.ts`).
 *
 * Pure on purpose: no imports, no database access. The script supplies a `QaCleanupStore`
 * backed by the verified test database; unit tests supply an in-memory one. That keeps the
 * safety rules (dry run by default, QA-owned data only, pictures and links before users) testable without
 * a database. The database-target checks stay in `database-target.ts` and the script.
 */

/** QA sign-up emails (`qa+<run>-<n>@linkbase.test`). `.test` is reserved, so no real user has one. */
export const QA_EMAIL_PATTERN = /^qa\+[a-z0-9-]+@linkbase\.test$/;

/** True only for a QA sign-up email. Emails are stored lowercased, so this is case-sensitive. */
export function isQaEmail(email: unknown): boolean {
  return typeof email === "string" && QA_EMAIL_PATTERN.test(email);
}

export type QaCleanupOptions = {
  /** Without it nothing is deleted (dry run). */
  confirm: boolean;
  /** Also handle links whose owner no longer exists (left by older clean-ups). Off by default. */
  orphanedLinks: boolean;
};

export function parseQaCleanupArgs(argv: readonly string[]): QaCleanupOptions {
  return { confirm: argv.includes("--confirm"), orphanedLinks: argv.includes("--orphaned-links") };
}

/** The database operations the clean-up needs. `Id` is the user id type (ObjectId in the script). */
export type QaCleanupStore<Id> = {
  /** Ids of users whose email matches `QA_EMAIL_PATTERN`. */
  findQaUserIds(): Promise<Id[]>;
  /** Profile picture URLs stored on those users (Vercel Blob, test store). */
  findQaPictureUrls(userIds: Id[]): Promise<string[]>;
  /** Deletes the given picture files from storage; returns how many were deleted. */
  deletePictures(urls: string[]): Promise<number>;
  countLinksOwnedBy(userIds: Id[]): Promise<number>;
  deleteLinksOwnedBy(userIds: Id[]): Promise<number>;
  /** Links whose `userId` matches no existing user. */
  countOrphanedLinks(): Promise<number>;
  deleteOrphanedLinks(): Promise<number>;
  countRateLimitRecords(): Promise<number>;
  deleteRateLimitRecords(): Promise<number>;
  deleteUsers(userIds: Id[]): Promise<number>;
};

export type QaCleanupCounts = {
  qaUsers: number;
  qaPictures: number;
  qaLinks: number;
  /** Null when orphaned links weren't requested. */
  orphanedLinks: number | null;
  rateLimitRecords: number;
};

export type QaCleanupReport = {
  dryRun: boolean;
  found: QaCleanupCounts;
  /** What was deleted; null on a dry run. */
  deleted: QaCleanupCounts | null;
};

/**
 * Counts QA data, then (only with `confirm`) deletes it: QA users' profile pictures and links
 * first, so nothing is left without an owner, then orphaned links (only if requested), then the
 * QA users, then the test database's rate-limit records.
 */
export async function runQaCleanup<Id>(store: QaCleanupStore<Id>, options: QaCleanupOptions): Promise<QaCleanupReport> {
  const qaUserIds = await store.findQaUserIds();
  const pictureUrls = qaUserIds.length > 0 ? await store.findQaPictureUrls(qaUserIds) : [];
  const found: QaCleanupCounts = {
    qaUsers: qaUserIds.length,
    qaPictures: pictureUrls.length,
    qaLinks: qaUserIds.length > 0 ? await store.countLinksOwnedBy(qaUserIds) : 0,
    orphanedLinks: options.orphanedLinks ? await store.countOrphanedLinks() : null,
    rateLimitRecords: await store.countRateLimitRecords(),
  };

  if (!options.confirm) return { dryRun: true, found, deleted: null };

  const qaPictures = pictureUrls.length > 0 ? await store.deletePictures(pictureUrls) : 0;
  const qaLinks = qaUserIds.length > 0 ? await store.deleteLinksOwnedBy(qaUserIds) : 0;
  const orphanedLinks = options.orphanedLinks ? await store.deleteOrphanedLinks() : null;
  const qaUsers = qaUserIds.length > 0 ? await store.deleteUsers(qaUserIds) : 0;
  const rateLimitRecords = await store.deleteRateLimitRecords();

  return { dryRun: false, found, deleted: { qaUsers, qaPictures, qaLinks, orphanedLinks, rateLimitRecords } };
}

function describe(counts: QaCleanupCounts): string {
  const parts = [
    `${counts.qaUsers} QA users`,
    `${counts.qaPictures} QA pictures`,
    `${counts.qaLinks} QA links`,
    ...(counts.orphanedLinks === null ? [] : [`${counts.orphanedLinks} orphaned links`]),
    `${counts.rateLimitRecords} rate-limit records`,
  ];
  return parts.join(", ");
}

/** The lines the script prints. Database name only, never a connection string. */
export function formatQaCleanupReport(report: QaCleanupReport, databaseName: string): string[] {
  const lines = [`[qa] Test database "${databaseName}": ${describe(report.found)}.`];
  if (report.deleted) {
    lines.push(`[qa] Deleted ${describe(report.deleted)}.`);
  } else {
    lines.push("[qa] Dry run: nothing deleted. Run `npm run qa:cleanup -- --confirm` to delete them.");
  }
  return lines;
}
