#!/usr/bin/env node

import { mkdirSync, openSync, readFileSync, closeSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import {
  currentCommandForMode,
  detectKnownRuntimeBlocker,
  detectWindowsElevation,
  parseRuntimeHookArgs,
  stopRuntimePid,
  tailText,
} from "./paperclip-runtime-support.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const runtimeDir = path.join(projectRoot, ".factory", "runtime");
const statusPath = path.join(runtimeDir, "paperclip-runtime-3100.json");
const outLogPath = path.join(runtimeDir, "paperclip-runtime-3100.out.log");
const errLogPath = path.join(runtimeDir, "paperclip-runtime-3100.err.log");

const args = process.argv.slice(2);
const { mode, restart } = parseRuntimeHookArgs(args, process.env);

const healthUrl = process.env.FACTORY_PAPERCLIP_RUNTIME_HEALTH_URL || "http://127.0.0.1:3100/api/health";
const startupTimeoutMs = Number(process.env.FACTORY_PAPERCLIP_RUNTIME_TIMEOUT_MS || 90000);
const diagnosticTimeoutMs = Number(process.env.FACTORY_PAPERCLIP_RUNTIME_DIAGNOSTIC_TIMEOUT_MS || 20000);
const pollIntervalMs = 2000;
const databaseUrl = process.env.DATABASE_URL || "";
const isWindowsElevated = detectWindowsElevation();

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

function createSpawnSpec(targetMode = mode) {
  const scriptName = targetMode === "watch" ? "dev:watch" : "dev:once";

  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", `pnpm.cmd ${scriptName}`],
    };
  }

  return {
    command: "pnpm",
    args: [scriptName],
  };
}

function resetLogs() {
  writeFileSync(outLogPath, "", "utf8");
  writeFileSync(errLogPath, "", "utf8");
}

function readLogTail(filePath, maxLines = 20) {
  if (!existsSync(filePath)) return "";
  try {
    return tailText(readFileSync(filePath, "utf8"), maxLines);
  } catch {
    return "";
  }
}

function renderFailureSummary({
  state,
  pid = null,
  blocker = null,
  childExit = null,
  stdoutTail = "",
  stderrTail = "",
  diagnostic = null,
}) {
  writeStatus({
    observedAt: new Date().toISOString(),
    state,
    mode,
    restartRequested: restart,
    pid,
    command: currentCommandForMode(mode),
    healthUrl,
    outLogPath,
    errLogPath,
    blockerCode: blocker?.code ?? null,
    blockerMessage: blocker?.message ?? null,
    childExitCode: childExit?.code ?? null,
    childExitSignal: childExit?.signal ?? null,
    diagnosticCommand: diagnostic?.command ?? null,
    diagnosticExitCode: diagnostic?.code ?? null,
    diagnosticSignal: diagnostic?.signal ?? null,
  });

  if (blocker) {
    console.error(`[factory] ${blocker.message}`);
  } else if (childExit) {
    console.error(
      `[factory] Paperclip runtime exited before becoming healthy (code=${childExit.code ?? "null"}, signal=${childExit.signal ?? "null"})`,
    );
  } else {
    console.error(`[factory] Paperclip runtime did not become healthy within ${startupTimeoutMs}ms`);
  }

  if (stderrTail) {
    console.error("[factory] stderr tail:");
    console.error(stderrTail);
  }

  if (stdoutTail) {
    console.error("[factory] stdout tail:");
    console.error(stdoutTail);
  }

  if (diagnostic?.combinedOutput) {
    console.error(`[factory] direct ${diagnostic.command} diagnostic tail:`);
    console.error(tailText(diagnostic.combinedOutput, 30));
  }

  console.error(`[factory] stdout: ${outLogPath}`);
  console.error(`[factory] stderr: ${errLogPath}`);
}

async function waitForHealthyExistingProcess(existing) {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (await isHealthy()) {
      writeStatus({
        ...existing,
        observedAt: new Date().toISOString(),
        state: "healthy-after-wait",
        restartRequested: restart,
        healthUrl,
        outLogPath,
        errLogPath,
      });
      console.log(`[factory] Paperclip runtime became healthy after waiting for pid ${existing.pid}`);
      return true;
    }

    if (!isProcessAlive(existing.pid)) {
      return false;
    }

    await sleep(pollIntervalMs);
  }

  return false;
}

async function startRuntimeProcess(targetMode = mode) {
  resetLogs();

  const spawnSpec = createSpawnSpec(targetMode);
  const outFd = openSync(outLogPath, "a");
  const errFd = openSync(errLogPath, "a");
  let childExit = null;

  const child = spawn(spawnSpec.command, spawnSpec.args, {
    cwd: projectRoot,
    detached: true,
    stdio: ["ignore", outFd, errFd],
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
      FACTORY_STARTED_PAPERCLIP_RUNTIME: "true",
    },
  });

  child.on("exit", (code, signal) => {
    childExit = { code, signal };
  });
  child.on("error", (error) => {
    childExit = { code: null, signal: null, errorMessage: error.message };
  });

  child.unref();
  closeSync(outFd);
  closeSync(errFd);

  writeStatus({
    startedAt: new Date().toISOString(),
    state: "starting",
    mode: targetMode,
    restartRequested: restart,
    pid: child.pid,
    command: currentCommandForMode(targetMode),
    healthUrl,
    outLogPath,
    errLogPath,
  });

  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (await isHealthy()) {
      writeStatus({
        observedAt: new Date().toISOString(),
        state: "healthy-started-by-factory",
        mode: targetMode,
        restartRequested: restart,
        pid: child.pid,
        command: currentCommandForMode(targetMode),
        healthUrl,
        outLogPath,
        errLogPath,
      });
      console.log(
        `[factory] Started Paperclip runtime via ${currentCommandForMode(targetMode)} on pid ${child.pid}. Health: ${healthUrl}`,
      );
      return { ok: true };
    }

    if (childExit || !isProcessAlive(child.pid)) {
      break;
    }

    await sleep(pollIntervalMs);
  }

  return {
    ok: false,
    pid: child.pid,
    childExit,
    stdoutTail: readLogTail(outLogPath),
    stderrTail: readLogTail(errLogPath),
  };
}

async function runDirectDiagnostic() {
  const diagnosticMode = "once";
  const spawnSpec = createSpawnSpec(diagnosticMode);

  return await new Promise((resolve) => {
    const child = spawn(spawnSpec.command, spawnSpec.args, {
      cwd: projectRoot,
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        FACTORY_STARTED_PAPERCLIP_RUNTIME: "true",
      },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const settle = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        command: currentCommandForMode(diagnosticMode),
        stdout,
        stderr,
        combinedOutput: [stdout, stderr, result?.errorMessage ?? ""].filter(Boolean).join("\n"),
        ...result,
      });
    };

    const timer = setTimeout(() => {
      stopRuntimePid(child.pid);
      settle({ code: null, signal: "timeout", timedOut: true });
    }, diagnosticTimeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      settle({ code: null, signal: null, errorMessage: error.message });
    });
    child.on("exit", (code, signal) => {
      settle({ code, signal });
    });
  });
}

async function failForKnownBlocker(blocker, state, extras = {}) {
  renderFailureSummary({
    state,
    blocker,
    ...extras,
  });
  process.exit(1);
}

async function main() {
  const existing = readStatus();
  const runtimeAlreadyHealthy = await isHealthy();

  if (runtimeAlreadyHealthy && !restart) {
    writeStatus({
      observedAt: new Date().toISOString(),
      state: "healthy-existing",
      mode,
      restartRequested: restart,
      command: currentCommandForMode(mode),
      healthUrl,
      pid: readStatus()?.pid ?? null,
      outLogPath,
      errLogPath,
    });
    console.log(`[factory] Paperclip runtime already healthy on ${healthUrl}`);
    return;
  }

  if (runtimeAlreadyHealthy && restart && (!existing?.pid || !isProcessAlive(existing.pid))) {
    renderFailureSummary({
      state: "restart-requested-but-runtime-untracked",
      blocker: {
        code: "restart_requires_tracked_runtime",
        message:
          "Restart requested but the healthy Paperclip runtime is not tracked by the Factory hook. Stop it manually or remove --restart.",
      },
      pid: existing?.pid ?? null,
    });
    process.exit(1);
  }

  const preStartBlocker = detectKnownRuntimeBlocker({
    platform: process.platform,
    isWindowsElevated,
    databaseUrl,
  });

  if (existing?.pid && isProcessAlive(existing.pid)) {
    if (restart) {
      if (preStartBlocker) {
        await failForKnownBlocker(preStartBlocker, "restart-blocked-prestart", { pid: existing.pid });
      }

      const stopped = stopRuntimePid(existing.pid);
      if (stopped) {
        console.log(`[factory] Restart requested; stopped tracked Paperclip runtime pid ${existing.pid}`);
        await sleep(1500);
      } else {
        renderFailureSummary({
          state: "restart-requested-but-stop-failed",
          blocker: {
            code: "tracked_runtime_not_stoppable",
            message: `Restart requested but tracked Paperclip runtime pid ${existing.pid} could not be stopped cleanly.`,
          },
          pid: existing.pid,
        });
        process.exit(1);
      }
    } else {
      const existingBecameHealthy = await waitForHealthyExistingProcess(existing);
      if (existingBecameHealthy) return;

      if (preStartBlocker) {
        await failForKnownBlocker(preStartBlocker, "existing-runtime-unhealthy-and-prestart-blocked", {
          pid: existing.pid,
        });
      }

      const stopped = stopRuntimePid(existing.pid);
      if (stopped) {
        console.warn(`[factory] Tracked Paperclip runtime pid ${existing.pid} stayed unhealthy; restarting once`);
        await sleep(1500);
      } else {
        renderFailureSummary({
          state: "existing-runtime-unhealthy-but-stop-failed",
          blocker: {
            code: "tracked_runtime_not_stoppable",
            message: `Tracked Paperclip runtime pid ${existing.pid} stayed unhealthy and could not be stopped for a clean restart.`,
          },
          pid: existing.pid,
        });
        process.exit(1);
      }
    }
  }

  if (preStartBlocker) {
    await failForKnownBlocker(preStartBlocker, "prestart-blocked");
  }

  const startResult = await startRuntimeProcess(mode);
  if (startResult.ok) return;

  let blocker = detectKnownRuntimeBlocker({
    platform: process.platform,
    isWindowsElevated,
    databaseUrl,
    diagnosticText: [startResult.stdoutTail, startResult.stderrTail].filter(Boolean).join("\n"),
  });
  let diagnostic = null;

  if (!blocker) {
    diagnostic = await runDirectDiagnostic();
    blocker = detectKnownRuntimeBlocker({
      platform: process.platform,
      isWindowsElevated,
      databaseUrl,
      diagnosticText: diagnostic.combinedOutput,
    });
  }

  renderFailureSummary({
    state: blocker ? "start-blocked-known-failure" : "start-failed-before-health",
    pid: startResult.pid,
    blocker,
    childExit: startResult.childExit,
    stdoutTail: startResult.stdoutTail,
    stderrTail: startResult.stderrTail,
    diagnostic,
  });
  process.exit(1);
}

await main();
