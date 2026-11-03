/**
 * `npm run qa:stop`: stops a QA server started by `npm run qa:server`, then waits for port 3100 to free up.
 *
 * Only stops processes it can verify: the PIDs `qa:server` recorded, and only if their command line is
 * still this project's QA launcher or its `next dev --port 3100`. It never kills by name or by port, so
 * the normal dev server (port 3000) and other Node.js processes are left alone. Never reads env files.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

import { PROJECT_ROOT, QA_PID_FILE, QA_PORT, readQaPids } from "./qa-env.ts";

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port);
  });
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** The process's command line, or "" if it can't be read. `pid` is always an integer. */
function commandLine(pid: number): string {
  try {
    if (process.platform === "win32") {
      return execFileSync(
        "powershell.exe",
        ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`],
        { encoding: "utf8" },
      ).trim();
    }
    return execFileSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/** True only for this project's QA launcher or the `next dev` it started on the QA port. */
function isOurQaProcess(pid: number, kind: "launcher" | "child"): boolean {
  const cmd = commandLine(pid).replaceAll("\\", "/");
  if (kind === "launcher") return cmd.includes("scripts/qa-server.ts");
  const root = PROJECT_ROOT.replaceAll("\\", "/");
  return cmd.includes(root) && cmd.includes("next") && cmd.includes(" dev") && cmd.includes(String(QA_PORT));
}

/** Ends the process and everything it started. */
function stopTree(pid: number): void {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    // The launcher forwards SIGTERM to `next dev`, which stops its own server.
    process.kill(pid, "SIGTERM");
  }
}

const pids = readQaPids();
if (!pids) {
  if (await isPortFree(QA_PORT)) {
    console.info(`[qa] No QA server is recorded and port ${QA_PORT} is free. Nothing to stop.`);
  } else {
    console.error(
      `[qa] Port ${QA_PORT} is in use, but no QA server is recorded. Not stopping an unknown process: check it manually.`,
    );
    process.exitCode = 1;
  }
} else {
  let stopped = 0;
  // Launcher first (its tree includes `next dev`), then the child in case the launcher was already gone.
  for (const [pid, kind] of [[pids.launcherPid, "launcher"], [pids.childPid, "child"]] as const) {
    if (!isAlive(pid)) continue;
    if (!isOurQaProcess(pid, kind)) {
      console.warn(`[qa] PID ${pid} is no longer the QA ${kind}. Leaving it alone.`);
      continue;
    }
    stopTree(pid);
    stopped++;
  }

  let free = false;
  for (let i = 0; i < 20 && !free; i++) {
    free = await isPortFree(QA_PORT);
    if (!free) await sleep(500);
  }

  if (free) {
    rmSync(QA_PID_FILE, { force: true });
    console.info(
      stopped > 0
        ? `[qa] QA server stopped (${stopped} process tree(s) ended). Port ${QA_PORT} is free.`
        : `[qa] No recorded QA server was running. Port ${QA_PORT} is free.`,
    );
  } else {
    console.error(`[qa] Port ${QA_PORT} is still in use after stopping the recorded QA processes. Check it manually.`);
    process.exitCode = 1;
  }
}
