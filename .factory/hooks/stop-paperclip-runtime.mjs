#!/usr/bin/env node

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const statusPath = path.join(projectRoot, ".factory", "runtime", "paperclip-runtime-3100.json");

function readStatus() {
  if (!existsSync(statusPath)) return null;
  try {
    return JSON.parse(readFileSync(statusPath, "utf8"));
  } catch {
    return null;
  }
}

function stopPid(pid) {
  if (!pid || typeof pid !== "number") return false;
  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}

const status = readStatus();
const stopped = stopPid(status?.pid);

if (existsSync(statusPath)) {
  unlinkSync(statusPath);
}

if (stopped) {
  console.log(`[factory] Stopped tracked Paperclip runtime pid ${status.pid}`);
} else {
  console.log("[factory] No tracked Paperclip runtime pid was stoppable; removed status file only");
}
