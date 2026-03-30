#!/usr/bin/env node

import { mkdirSync, openSync, readFileSync, closeSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const runtimeDir = path.join(projectRoot, ".factory", "runtime");
const statusPath = path.join(runtimeDir, "paperclip-runtime-3100.json");
const outLogPath = path.join(runtimeDir, "paperclip-runtime-3100.out.log");
const errLogPath = path.join(runtimeDir, "paperclip-runtime-3100.err.log");

const args = process.argv.slice(2);
const modeArgIndex = args.findIndex((arg) => arg === "--mode");
const requestedMode =
  modeArgIndex >= 0 && args[modeArgIndex + 1]
    ? args[modeArgIndex + 1]
    : process.env.FACTORY_PAPERCLIP_RUNTIME_MODE || "watch";
const mode = requestedMode === "once" ? "once" : "watch";

const healthUrl = process.env.FACTORY_PAPERCLIP_RUNTIME_HEALTH_URL || "http://127.0.0.1:3100/api/health";
const startupTimeoutMs = Number(process.env.FACTORY_PAPERCLIP_RUNTIME_TIMEOUT_MS || 90000);
const pollIntervalMs = 2000;

mkdirSync(runtimeDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isHealthy() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(healthUrl, { signal: controller.signal });
    if (!res.ok) return false;
    const payload = await res.json().catch(() => null);
    return payload?.status === "ok";
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function readStatus() {
  if (!existsSync(statusPath)) return null;
  try {
    return JSON.parse(readFileSync(statusPath, "utf8"));
  } catch {
    return null;
  }
}

function writeStatus(status) {
  writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

function isProcessAlive(pid) {
  if (!pid || typeof pid !== "number") return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function currentCommandForMode() {
  return mode === "watch" ? "pnpm dev:watch" : "pnpm dev:once";
}

async function main() {
  if (await isHealthy()) {
    writeStatus({
      observedAt: new Date().toISOString(),
      state: "healthy-existing",
      mode,
      command: currentCommandForMode(),
      healthUrl,
      pid: readStatus()?.pid ?? null,
      outLogPath,
      errLogPath,
    });
    console.log(`[factory] Paperclip runtime already healthy on ${healthUrl}`);
    return;
  }

  const existing = readStatus();
  if (existing?.pid && isProcessAlive(existing.pid)) {
    const deadline = Date.now() + startupTimeoutMs;
    while (Date.now() < deadline) {
      if (await isHealthy()) {
        writeStatus({
          ...existing,
          observedAt: new Date().toISOString(),
          state: "healthy-after-wait",
          healthUrl,
          outLogPath,
          errLogPath,
        });
        console.log(`[factory] Paperclip runtime became healthy after waiting for pid ${existing.pid}`);
        return;
      }
      await sleep(pollIntervalMs);
    }
  }

  const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const commandArgs = [mode === "watch" ? "dev:watch" : "dev:once"];
  const outFd = openSync(outLogPath, "a");
  const errFd = openSync(errLogPath, "a");

  const child = spawn(pnpmBin, commandArgs, {
    cwd: projectRoot,
    detached: true,
    stdio: ["ignore", outFd, errFd],
    shell: false,
    env: {
      ...process.env,
      FACTORY_STARTED_PAPERCLIP_RUNTIME: "true",
    },
  });

  child.unref();
  closeSync(outFd);
  closeSync(errFd);

  writeStatus({
    startedAt: new Date().toISOString(),
    state: "starting",
    mode,
    pid: child.pid,
    command: currentCommandForMode(),
    healthUrl,
    outLogPath,
    errLogPath,
  });

  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (await isHealthy()) {
      writeStatus({
        startedAt: new Date().toISOString(),
        state: "healthy-started-by-factory",
        mode,
        pid: child.pid,
        command: currentCommandForMode(),
        healthUrl,
        outLogPath,
        errLogPath,
      });
      console.log(
        `[factory] Started Paperclip runtime via ${currentCommandForMode()} on pid ${child.pid}. Health: ${healthUrl}`,
      );
      return;
    }
    await sleep(pollIntervalMs);
  }

  writeStatus({
    startedAt: new Date().toISOString(),
    state: "start-timeout",
    mode,
    pid: child.pid,
    command: currentCommandForMode(),
    healthUrl,
    outLogPath,
    errLogPath,
  });

  console.error(`[factory] Paperclip runtime did not become healthy within ${startupTimeoutMs}ms`);
  console.error(`[factory] stdout: ${outLogPath}`);
  console.error(`[factory] stderr: ${errLogPath}`);
  process.exit(1);
}

await main();
