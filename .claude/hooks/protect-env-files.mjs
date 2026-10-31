// PreToolUse hook: blocks Claude from editing protected environment files.
// Claude Code sends the pending tool call as JSON on stdin.

import path from "node:path";

const PROTECTED_FILES = new Set([".env", ".env.local"]);

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // Unreadable input: don't block unrelated work.
  }

  const toolInput = input?.tool_input ?? {};
  const target = toolInput.file_path ?? toolInput.notebook_path ?? "";
  // Normalise Windows backslashes so basename works for any path style.
  const fileName = path.posix.basename(String(target).replace(/\\/g, "/")).toLowerCase();

  if (PROTECTED_FILES.has(fileName)) {
    console.error(
      `Blocked: ${target} is a protected environment file. Ask the user for permission before editing it.`
    );
    // Exit code 2 tells Claude Code to block the tool call; stderr is shown to Claude as the reason.
    process.exit(2);
  }

  process.exit(0);
});
