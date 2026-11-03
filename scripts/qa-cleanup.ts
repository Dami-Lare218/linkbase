/**
 * `npm run qa:cleanup`: removes data created by QA runs, only from a verified test database.
 *
 * - Dry run by default: prints counts only. `npm run qa:cleanup -- --confirm` deletes.
 * - Deletes only users with QA emails (`qa+<run>-<n>@linkbase.test`) and the test database's
 *   rate-limit records (`authattempts`), so repeated QA runs don't hit sign-up limits.
 * - Never drops collections or databases. Checks the database name before and after connecting.
 */
import mongoose from "mongoose";

import { assertTestDatabaseName } from "../src/lib/db/database-target.ts";

import { loadQaDatabase, reportSafeError } from "./qa-env.ts";
import type { QaDatabase } from "./qa-env.ts";

/** QA sign-up emails. `.test` is a reserved domain, so these can never be real users. */
const QA_EMAIL_REGEX = "^qa\\+[a-z0-9-]+@linkbase\\.test$";

const confirm = process.argv.includes("--confirm");

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
  const authAttempts = mongoose.connection.collection("authattempts");
  const qaUsers = { email: { $regex: QA_EMAIL_REGEX } };

  const userCount = await users.countDocuments(qaUsers);
  const attemptCount = await authAttempts.countDocuments({});
  console.info(
    `[qa] Test database "${mongoose.connection.name}": ${userCount} QA users, ${attemptCount} rate-limit records.`,
  );

  if (!confirm) {
    console.info("[qa] Dry run: nothing deleted. Run `npm run qa:cleanup -- --confirm` to delete them.");
  } else {
    const deletedUsers = await users.deleteMany(qaUsers);
    const deletedAttempts = await authAttempts.deleteMany({});
    console.info(
      `[qa] Deleted ${deletedUsers.deletedCount} QA users and ${deletedAttempts.deletedCount} rate-limit records.`,
    );
  }
} catch (err) {
  reportSafeError(err);
} finally {
  await mongoose.disconnect();
}
