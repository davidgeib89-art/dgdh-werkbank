import { spawnSync } from "node:child_process";

const WINDOWS_EMBEDDED_POSTGRES_ELEVATED_MESSAGE =
  "Embedded PostgreSQL cannot start from an elevated Windows shell. Start Paperclip from a non-elevated terminal or set DATABASE_URL for external PostgreSQL.";

const EMBEDDED_POSTGRES_ADMIN_PATTERN =
  /Execution of PostgreSQL by a user with administrative permissions is not permitted\./i;

export function parseRuntimeHookArgs(args, env = process.env) {
  const modeArgIndex = args.findIndex((arg) => arg === "--mode");
  const requestedMode =
    modeArgIndex >= 0 && args[modeArgIndex + 1]
      ? args[modeArgIndex + 1]
      : env.FACTORY_PAPERCLIP_RUNTIME_MODE || "watch";

  return {
    mode: requestedMode === "once" ? "once" : "watch",
    restart: args.includes("--restart") || env.FACTORY_PAPERCLIP_RUNTIME_RESTART === "true",
  };
}

export function currentCommandForMode(mode) {
  return mode === "watch" ? "pnpm dev:watch" : "pnpm dev:once";
}

export function tailText(text, maxLines = 20) {
  if (!text) return "";
  return text
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .slice(-maxLines)
    .join("\n");
}

export function detectKnownRuntimeBlocker({
  platform,
  isWindowsElevated = false,
  databaseUrl = "",
  diagnosticText = "",
}) {
  if (platform === "win32" && !databaseUrl && isWindowsElevated) {
    return {
      code: "windows_elevated_embedded_postgres",
      message: WINDOWS_EMBEDDED_POSTGRES_ELEVATED_MESSAGE,
    };
  }

  if (EMBEDDED_POSTGRES_ADMIN_PATTERN.test(diagnosticText)) {
    return {
      code: "embedded_postgres_admin_permissions",
      message: WINDOWS_EMBEDDED_POSTGRES_ELEVATED_MESSAGE,
    };
  }

  return null;
}

export function detectWindowsElevation() {
  if (process.platform !== "win32") return false;

  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "$p = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent()); if ($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { 'true' } else { 'false' }",
    ],
    {
      encoding: "utf8",
      windowsHide: true,
    },
  );

  if (result.status !== 0) return false;
  return result.stdout.trim().toLowerCase() === "true";
}

export function stopRuntimePid(pid) {
  if (!pid || typeof pid !== "number") return false;

  try {
    if (process.platform === "win32") {
      const result = spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true,
      });
      return result.status === 0;
    }

    process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}
