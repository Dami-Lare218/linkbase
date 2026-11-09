/**
 * `npm run qa:server`: starts the app for end-to-end QA, connected only to the test database.
 *
 * 1. Pre-flight: refuses unless `.env.test` holds a valid, separate `_test` database
 *    (see `qa-env.ts` and `src/lib/db/database-target.ts`) and the QA port is free.
 * 2. Starts `next dev` on port 3100 with `LINKBASE_DB_TARGET=test`, `MONGODB_URI_TEST` and the test
 *    Blob store's token as `BLOB_READ_WRITE_TOKEN` in its environment. Process env beats `.env*`
 *    files, so the app can't fall back to the dev database or the dev Blob store.
 *
 * `npm run qa:server -- --no-uploads` (opt-in) runs QA without a test Blob store: the app gets a
 * placeholder token that fails the token check, so uploads fail with an error message and nothing
 * can reach any store. Without the flag a missing test token still refuses to start.
 */
import { spawn, spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";

import { loadQaBlobToken, loadQaDatabase, PROJECT_ROOT, QA_PID_FILE, QA_PORT, readQaPids, reportSafeError } from "./qa-env.ts";
import type { QaDatabase } from "./qa-env.ts";

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port);
  });
}

// Not a valid Blob token on purpose (see `isBlobReadWriteToken`): storage refuses it locally.
const UPLOADS_DISABLED_TOKEN = "qa-uploads-disabled";
const uploadsDisabled = process.argv.slice(2).includes("--no-uploads");

let qa: QaDatabase;
let blobToken: string;
try {
  qa = loadQaDatabase();
  blobToken = uploadsDisabled ? UPLOADS_DISABLED_TOKEN : loadQaBlobToken();
} catch (err) {
  reportSafeError(err);
  process.exit(1);
}

if (!(await isPortFree(QA_PORT))) {
  console.error(`[qa] Port ${QA_PORT} is already in use. Stop whatever is using it (another QA server?) and try again.`);
  process.exit(1);
}

console.info(`[qa] Test database check passed: "${qa.database}".`);
console.info(
  uploadsDisabled
    ? "[qa] Uploads disabled (--no-uploads): profile picture uploads will fail and reach no Blob store."
    : "[qa] Test Blob store token found (profile pictures go to the QA store).",
);
console.info(`[qa] Starting the QA server at http://localhost:${QA_PORT} (stop it with Ctrl+C).`);

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", "--port", String(QA_PORT)], {
  cwd: PROJECT_ROOT,
  stdio: "inherit",
  env: { ...process.env, LINKBASE_DB_TARGET: "test", MONGODB_URI_TEST: qa.uri, BLOB_READ_WRITE_TOKEN: blobToken },
});

// Lets `npm run qa:stop` find exactly these processes later (PIDs only, no env values).
if (child.pid !== undefined) {
  writeFileSync(QA_PID_FILE, JSON.stringify({ launcherPid: process.pid, childPid: child.pid }));
}

/**
 * Stops `next dev` and the server process it forks. On Windows, `child.kill()` force-ends only the
 * direct child and leaves its server (the one holding the port) running, so end the whole tree.
 */
function stopChild(signal: NodeJS.Signals): void {
  if (child.pid === undefined || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill(signal);
  }
}

for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"] as const) {
  process.on(signal, () => stopChild(signal === "SIGBREAK" ? "SIGTERM" : signal));
}
process.on("exit", () => {
  stopChild("SIGTERM");
  // Remove the PID file only if it is still ours.
  if (readQaPids()?.launcherPid === process.pid) rmSync(QA_PID_FILE, { force: true });
});
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
