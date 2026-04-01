#!/usr/bin/env node

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stopRuntimePid } from "./paperclip-runtime-support.mjs";

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

const status = readStatus();
const stopped = stopRuntimePid(status?.pid);

if (existsSync(statusPath)) {
  unlinkSync(statusPath);
}

if (stopped) {
  console.log(`[factory] Stopped tracked Paperclip runtime pid ${status.pid}`);
} else {
  console.log("[factory] No tracked Paperclip runtime pid was stoppable; removed status file only");
}
