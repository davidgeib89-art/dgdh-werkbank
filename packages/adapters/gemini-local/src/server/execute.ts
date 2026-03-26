import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@paperclipai/adapter-utils";
import {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
  buildPaperclipEnv,
  ensureAbsoluteDirectory,
  ensureCommandResolvable,
  ensurePaperclipSkillSymlink,
  joinPromptSections,
  ensurePathInEnv,
  listPaperclipSkillEntries,
  removeMaintainerOnlySkillSymlinks,
  parseObject,
  redactEnvForLogs,
  renderTemplate,
  runningProcesses,
  runChildProcess,
} from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_GEMINI_LOCAL_MODEL } from "../index.js";
import { parseGeminiStdoutLine } from "../ui/parse-stdout.js";
import {
  detectGeminiCapacityExhausted,
  describeGeminiFailure,
  detectGeminiAuthRequired,
  isGeminiTurnLimitResult,
  isGeminiUnknownSessionError,
  parseGeminiJsonl,
} from "./parse.js";
import {
  buildGeminiDryRunPreflightTelemetry,
  buildGeminiPromptResolverShadowTelemetry,
} from "./prompt-core-shadow.js";
import { firstNonEmptyLine } from "./utils.js";

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));

function hasNonEmptyEnvValue(
  env: Record<string, string>,
  key: string,
): boolean {
  const raw = env[key];
  return typeof raw === "string" && raw.trim().length > 0;
}

function resolveGeminiBillingType(
  env: Record<string, string>,
): "api" | "subscription" {
  return hasNonEmptyEnvValue(env, "GEMINI_API_KEY") ||
    hasNonEmptyEnvValue(env, "GOOGLE_API_KEY")
    ? "api"
    : "subscription";
}

function renderPaperclipEnvNote(env: Record<string, string>): string {
  const paperclipKeys = Object.keys(env)
    .filter((key) => key.startsWith("PAPERCLIP_"))
    .sort();
  if (paperclipKeys.length === 0) return "";
  return [
    "Paperclip runtime note:",
    `The following PAPERCLIP_* environment variables are available in this run: ${paperclipKeys.join(
      ", ",
    )}`,
    "Do not assume these variables are missing without checking your shell environment.",
    "",
    "",
  ].join("\n");
}

function renderApiAccessNote(env: Record<string, string>): string {
  if (
    !hasNonEmptyEnvValue(env, "PAPERCLIP_API_URL") ||
    !hasNonEmptyEnvValue(env, "PAPERCLIP_API_KEY")
  )
    return "";
  return [
    "Paperclip API access note:",
    "This adapter runs in Windows PowerShell.",
    "PAPERCLIP_API_KEY and PAPERCLIP_RUN_ID are already injected into this run's shell environment. Do not ask the user to provide them.",
    "Do not search for a Paperclip CLI for issue management.",
    "Use the exact PAPERCLIP_* environment variables shown here. Do not replace them with guessed titles, slugs, or localhost ports.",
    "For the CEO issue-handoff standard path, use native Paperclip CLI commands instead of generic shell-built HTTP requests.",
    "The four preferred primitives are:",
    "- list child issues: `pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai issue list --company-id $env:PAPERCLIP_COMPANY_ID --parent-id $env:PAPERCLIP_TASK_ID --json`",
    "- list agents: `pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai agent list --company-id $env:PAPERCLIP_COMPANY_ID --json`",
    "- create child issue: `pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai issue create --company-id $env:PAPERCLIP_COMPANY_ID --project-id $env:PAPERCLIP_PROJECT_ID --parent-id $env:PAPERCLIP_TASK_ID --title \"...\" --description \"...\" --status todo --json`",
    "- assign child issue: `pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai issue assign CHILD_ISSUE_ID --agent-id WORKER_AGENT_ID --json`",
    "Use `pnpm --dir $env:PAPERCLIP_CLI_CWD` so pnpm resolves from the canonical repo root even when the current workspace is an isolated worktree.",
    "Only fall back to direct API commands when a required operation has no Paperclip CLI primitive.",
    "For multiline child packet descriptions in PowerShell, do not send literal \\n sequences inside one quoted --description string.",
    "Prefer a here-string or a variable that contains real newlines, then pass that variable to --description.",
    "CLI primitive examples:",
    `  command_execution({ command: "pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai issue list --company-id $env:PAPERCLIP_COMPANY_ID --parent-id $env:PAPERCLIP_TASK_ID --json" })`,
    `  command_execution({ command: "pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai agent list --company-id $env:PAPERCLIP_COMPANY_ID --json" })`,
    `  command_execution({ command: "pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai issue create --company-id $env:PAPERCLIP_COMPANY_ID --project-id $env:PAPERCLIP_PROJECT_ID --parent-id $env:PAPERCLIP_TASK_ID --title \"Example packet\" --description \"Titel: Example packet\npacketType: free_api\nexecutionIntent: implement\nreviewPolicy: required\nneedsReview: true\nstatus: todo\nZiel: ...\nScope: ...\ntargetFile: n/a\ntargetFolder: doc\nartifactKind: doc_update\ndoneWhen: ...\nAnnahmen:\n[NEEDS INPUT]: none\" --status todo --json" })`,
    `  command_execution({ command: "$packet = @'\nTitel: Example packet\npacketType: free_api\nexecutionIntent: implement\nreviewPolicy: required\nneedsReview: true\nstatus: todo\nZiel: ...\nScope: ...\ntargetFile: n/a\ntargetFolder: doc\nartifactKind: doc_update\ndoneWhen: ...\nAnnahmen:\n[NEEDS INPUT]: none\n'@; pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai issue create --company-id $env:PAPERCLIP_COMPANY_ID --project-id $env:PAPERCLIP_PROJECT_ID --parent-id $env:PAPERCLIP_TASK_ID --title \"Example packet\" --description $packet --status todo --json" })`,
    `  command_execution({ command: "pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai issue assign CHILD_ISSUE_ID --agent-id WORKER_AGENT_ID --json" })`,
    "",
    "",
  ].join("\n");
}

function renderPowerShellNote(): string {
  if (os.platform() !== "win32") return "";
  return [
    "Windows PowerShell note:",
    "- This run is executed in Windows PowerShell.",
    "- Do not use '&&' to chain commands; use ';' instead.",
    "- WRONG: 'npm install && npm test'",
    "- CORRECT: 'npm install; npm test'",
    "- Example: 'npm install; npm test' (not 'npm install && npm test').",
    "- Be careful with backslashes and double quotes in JSON arguments.",
    "",
    "",
  ].join("\n");
}

export function rewriteWindowsPowerShellCommand(
  command: string,
  platform: NodeJS.Platform = os.platform(),
): { command: string; rewritten: boolean } {
  if (platform !== "win32" || !command.includes("&&")) {
    return { command, rewritten: false };
  }
  return {
    command: command.replace(/\s*&&\s*/g, "; "),
    rewritten: true,
  };
}

function parseExitCodeFromToolResultContent(content: string): number | null {
  const match = content.match(/(?:^|\r?\n)exit\s+(-?\d+)(?:\r?\n|$)/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function emitShellLoopWarningLine(message: string): string {
  return `${JSON.stringify({
    type: "tool_result",
    tool_id: "paperclip-shell-loop-guard",
    output: message,
    status: "error",
    is_error: true,
  })}\n`;
}

function createShellLoopMonitor(params: {
  runId: string;
  onLog: AdapterExecutionContext["onLog"];
  platform?: NodeJS.Platform;
}) {
  const platform = params.platform ?? os.platform();
  const pendingCommands = new Map<string, string>();
  let stdoutBuffer = "";
  let lastFailedCommand: string | null = null;
  let consecutiveFailureCount = 0;
  let loopDetectedMessage: string | null = null;

  const resetFailureStreak = () => {
    lastFailedCommand = null;
    consecutiveFailureCount = 0;
  };

  const handleParsedLine = async (line: string) => {
    const entries = parseGeminiStdoutLine(line, new Date().toISOString());
    for (const entry of entries) {
      if (entry.kind === "tool_call" && entry.name === "command_execution") {
        const commandInput =
          typeof entry.input === "object" && entry.input !== null
            ? asString((entry.input as Record<string, unknown>).command, "").trim()
            : "";
        if (!commandInput) continue;
        const normalized = rewriteWindowsPowerShellCommand(commandInput, platform);
        if (normalized.rewritten) {
          await params.onLog(
            "stderr",
            "[paperclip] PowerShell &&→; rewrite applied\n",
          );
        }
        pendingCommands.set(
          entry.toolUseId ?? normalized.command,
          normalized.command,
        );
        continue;
      }

      if (entry.kind !== "tool_result") continue;
      const toolUseId = entry.toolUseId ?? "";
      if (!toolUseId) continue;
      const command = pendingCommands.get(toolUseId);
      if (!command) continue;
      pendingCommands.delete(toolUseId);

      const exitCode = parseExitCodeFromToolResultContent(entry.content);
      if (exitCode == null) continue;
      if (exitCode === 0) {
        resetFailureStreak();
        continue;
      }

      if (lastFailedCommand === command) {
        consecutiveFailureCount += 1;
      } else {
        lastFailedCommand = command;
        consecutiveFailureCount = 1;
      }

      if (consecutiveFailureCount === 3) {
        await params.onLog(
          "stdout",
          emitShellLoopWarningLine(
            "[paperclip] Same command failed 3 times. Do not retry. Adapt your approach or report blocked.",
          ),
        );
      }

      if (consecutiveFailureCount < 5 || loopDetectedMessage) continue;

      loopDetectedMessage =
        "Loop detected: same command failed 5x. Stopping to prevent token waste.";
      await params.onLog(
        "stdout",
        emitShellLoopWarningLine(`[paperclip] ${loopDetectedMessage}`),
      );
      await params.onLog("stderr", `[paperclip] ${loopDetectedMessage}\n`);
      runningProcesses.get(params.runId)?.child.kill("SIGTERM");
    }
  };

  const flushStdoutBuffer = async () => {
    const remaining = stdoutBuffer.trim();
    stdoutBuffer = "";
    if (remaining.length > 0) {
      await handleParsedLine(remaining);
    }
  };

  return {
    getLoopDetectedMessage: () => loopDetectedMessage,
    flushStdoutBuffer,
    onLog: async (stream: "stdout" | "stderr", chunk: string) => {
      if (stream === "stdout") {
        stdoutBuffer += chunk;
        let newlineIndex = stdoutBuffer.indexOf("\n");
        while (newlineIndex >= 0) {
          const line = stdoutBuffer.slice(0, newlineIndex).replace(/\r$/, "");
          stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
          if (line.trim().length > 0) {
            await handleParsedLine(line);
          }
          newlineIndex = stdoutBuffer.indexOf("\n");
        }
      }
      await params.onLog(stream, chunk);
    },
  };
}

async function cleanupWorkspaceAfterLoopStop(input: {
  runId: string;
  cwd: string;
  env: Record<string, string>;
}) {
  const cleanupRunId = `${input.runId}:loop-cleanup`;
  try {
    const cleanup = await runChildProcess(
      cleanupRunId,
      "git",
      ["checkout", "--", "."],
      {
        cwd: input.cwd,
        env: input.env,
        timeoutSec: 30,
        graceSec: 5,
        onLog: async () => {},
      },
    );

    const workspaceReset = (cleanup.exitCode ?? 0) === 0;
    return {
      workspaceReset,
      cleanupExitCode: cleanup.exitCode,
      cleanupSignal: cleanup.signal,
      cleanupError: null as string | null,
    };
  } catch (error) {
    return {
      workspaceReset: false,
      cleanupExitCode: null as number | null,
      cleanupSignal: null as string | null,
      cleanupError: error instanceof Error ? error.message : String(error),
    };
  }
}

function renderIssueTaskNote(context: Record<string, unknown>): string {
  const taskPrompt = asString(context.paperclipTaskPrompt, "").trim();
  if (!taskPrompt) return "";

  const lines = [taskPrompt];
  const singleFileTargetPath = asString(
    context.paperclipSingleFileTargetPath,
    "",
  ).trim();
  if (
    singleFileTargetPath.length > 0 &&
    context.paperclipAbortOnMissingFile === true
  ) {
    lines.push(
      "",
      "Single-file benchmark guard:",
      `Read only this file: ${singleFileTargetPath}`,
      "If the file is missing or unreadable in the current workspace, stop immediately and report that the benchmark is blocked because the target file is unavailable.",
      "Do not list directories, search the repository, inspect imports in other files, run commands, or read any other file.",
    );
  }

  lines.push("", "");
  return lines.join("\n");
}

function renderEngineDirectiveNote(context: Record<string, unknown>): string {
  const proposal = context.paperclipRoutingProposal;
  if (typeof proposal !== "object" || proposal === null) return "";

  const p = proposal as Record<string, unknown>;
  const intent = asString(p.executionIntent, "").trim();
  const doneWhen = asString(p.doneWhen, "").trim();
  const targetFolder = asString(p.targetFolder, "").trim();

  if (!intent && !doneWhen) return "";

  const lines = ["Engine directive:"];
  if (intent) lines.push(`- Intent: ${intent}`);
  if (targetFolder && targetFolder !== ".") lines.push(`- Scope: ${targetFolder}`);
  if (doneWhen) lines.push(`- Done when: ${doneWhen}`);
  lines.push("", "");
  return lines.join("\n");
}

function renderRoleTemplateNote(context: Record<string, unknown>): string {
  const roleTemplatePrompt = asString(context.paperclipRoleTemplatePrompt, "").trim();
  if (!roleTemplatePrompt) return "";
  return `${roleTemplatePrompt}\n\n`;
}

function isThinReadySmallDefaultContext(
  context: Record<string, unknown>,
): boolean {
  return (
    asString(context.paperclipDefaultExecutionPath, "").trim() ===
    "ready_small_default"
  );
}

function buildPromptHeader(prompt: string, maxLines = 18): string {
  return prompt.split(/\r?\n/).slice(0, maxLines).join("\n").trim();
}

function geminiSkillsHome(): string {
  return path.join(os.homedir(), ".gemini", "skills");
}

function geminiSystemSettingsPath(
  platform: NodeJS.Platform = os.platform(),
): string {
  if (platform === "win32") return "C:\\ProgramData\\gemini-cli\\settings.json";
  if (platform === "darwin") {
    return "/Library/Application Support/GeminiCli/settings.json";
  }
  return "/etc/gemini-cli/settings.json";
}

function sanitizeRunIdForFileName(runId: string): string {
  return runId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function ensureWindowsGeminiSystemSettingsOverride(input: {
  runId: string;
  env: Record<string, string>;
  onLog: AdapterExecutionContext["onLog"];
  platform?: NodeJS.Platform;
}): Promise<null | { cleanup: () => Promise<void> }> {
  const platform = input.platform ?? os.platform();
  if (platform !== "win32") return null;

  const configuredSettingsPath = asString(
    input.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH,
    "",
  ).trim();
  const baseSettingsPath =
    configuredSettingsPath || geminiSystemSettingsPath(platform);
  let baseSettings: Record<string, unknown> = {};

  try {
    const raw = await fs.readFile(baseSettingsPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      baseSettings = parsed as Record<string, unknown>;
    } else {
      await input.onLog(
        "stderr",
        `[paperclip] Gemini system settings at ${baseSettingsPath} were not a JSON object; continuing with a Paperclip override only.\n`,
      );
    }
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : null;
    if (code !== "ENOENT") {
      await input.onLog(
        "stderr",
        `[paperclip] Failed to read Gemini system settings ${baseSettingsPath}: ${
          error instanceof Error ? error.message : String(error)
        }\n`,
      );
    }
  }

  const mergedSettings: Record<string, unknown> = {
    ...baseSettings,
    tools: {
      ...parseObject(baseSettings.tools),
      shell: {
        ...parseObject(parseObject(baseSettings.tools).shell),
        enableInteractiveShell: false,
      },
    },
  };

  const overrideDir = path.join(os.tmpdir(), "paperclip-gemini-cli");
  const overridePath = path.join(
    overrideDir,
    `${sanitizeRunIdForFileName(input.runId)}-system-settings.json`,
  );
  await fs.mkdir(overrideDir, { recursive: true });
  await fs.writeFile(
    overridePath,
    JSON.stringify(mergedSettings, null, 2),
    "utf8",
  );
  input.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH = overridePath;
  await input.onLog(
    "stderr",
    `[paperclip] Windows Gemini shell override active: tools.shell.enableInteractiveShell=false (${overridePath})\n`,
  );

  return {
    cleanup: async () => {
      try {
        await fs.rm(overridePath, { force: true });
      } catch {
        // Best-effort cleanup only.
      }
    },
  };
}

/**
 * Inject Paperclip skills directly into `~/.gemini/skills/` via symlinks.
 * This avoids needing GEMINI_CLI_HOME overrides, so the CLI naturally finds
 * both its auth credentials and the injected skills in the real home directory.
 */
async function ensureGeminiSkillsInjected(
  onLog: AdapterExecutionContext["onLog"],
  includeSkills?: string[],
): Promise<void> {
  let skillsEntries = await listPaperclipSkillEntries(__moduleDir);
  if (skillsEntries.length === 0) return;

  if (includeSkills && includeSkills.length > 0) {
    const allowed = new Set(includeSkills);
    skillsEntries = skillsEntries.filter((entry) => allowed.has(entry.name));
    if (skillsEntries.length === 0) return;
  }

  const skillsHome = geminiSkillsHome();
  try {
    await fs.mkdir(skillsHome, { recursive: true });
  } catch (err) {
    await onLog(
      "stderr",
      `[paperclip] Failed to prepare Gemini skills directory ${skillsHome}: ${
        err instanceof Error ? err.message : String(err)
      }\n`,
    );
    return;
  }
  const removedSkills = await removeMaintainerOnlySkillSymlinks(
    skillsHome,
    skillsEntries.map((entry) => entry.name),
  );
  for (const skillName of removedSkills) {
    await onLog(
      "stderr",
      `[paperclip] Removed maintainer-only Gemini skill "${skillName}" from ${skillsHome}\n`,
    );
  }

  for (const entry of skillsEntries) {
    const target = path.join(skillsHome, entry.name);

    try {
      const result = await ensurePaperclipSkillSymlink(entry.source, target);
      if (result === "skipped") continue;
      await onLog(
        "stderr",
        `[paperclip] ${
          result === "repaired" ? "Repaired" : "Linked"
        } Gemini skill: ${entry.name}\n`,
      );
    } catch (err) {
      await onLog(
        "stderr",
        `[paperclip] Failed to link Gemini skill "${entry.name}": ${
          err instanceof Error ? err.message : String(err)
        }\n`,
      );
    }
  }
}

async function removeGeminiPaperclipSkillSymlinksForFloor(
  onLog: AdapterExecutionContext["onLog"],
): Promise<void> {
  const skillsEntries = await listPaperclipSkillEntries(__moduleDir);
  if (skillsEntries.length === 0) return;

  const skillsHome = geminiSkillsHome();
  for (const entry of skillsEntries) {
    const target = path.join(skillsHome, entry.name);
    try {
      const stats = await fs.lstat(target);
      if (!stats.isSymbolicLink()) continue;
      await fs.unlink(target);
      await onLog(
        "stderr",
        `[paperclip] Strict floor mode removed Gemini skill symlink: ${entry.name}\n`,
      );
    } catch {
      // Ignore missing entries and non-fatal filesystem errors.
    }
  }
}

function isStrictFloorRawJsonObjectText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("```") || trimmed.includes("```")) return false;
  if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) return false;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return (
      typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    );
  } catch {
    return false;
  }
}

export async function execute(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  const { runId, agent, runtime, config, context, onLog, onMeta, authToken } =
    ctx;

  const benchmarkFamily = asString(context.paperclipBenchmarkFamily, "").trim();
  const strictFloorMode =
    context.paperclipStrictFloorMode === true ||
    benchmarkFamily.toLowerCase().startsWith("t1-floor-v") ||
    benchmarkFamily.toLowerCase().startsWith("t1-floor-normalized-v");
  const thinDefaultExecution =
    !strictFloorMode && isThinReadySmallDefaultContext(context);

  const promptTemplate = strictFloorMode
    ? asString(
        config.floorPromptTemplate,
        [
          "You are a strict benchmark executor.",
          "Execute only the benchmark contract.",
          "Do not activate skills.",
          "Do not run shell commands.",
          "Do not perform API workflow behavior.",
          "Return raw JSON only.",
        ].join(" "),
      )
    : asString(
        config.promptTemplate,
        "Du bist Agent {{agent.id}} ({{agent.name}}) in der DGDH Werkbank. Arbeite die zugewiesene Aufgabe strukturiert ab. Melde Ergebnis oder Blocker.",
      );
  const command = asString(config.command, "gemini");
  const model = asString(config.model, DEFAULT_GEMINI_LOCAL_MODEL).trim();
  const sandbox = asBoolean(config.sandbox, false);

  const workspaceContext = parseObject(context.paperclipWorkspace);
  const workspaceCwd = asString(workspaceContext.cwd, "");
  const workspaceSource = asString(workspaceContext.source, "");
  const workspaceId = asString(workspaceContext.workspaceId, "");
  const workspaceRepoUrl = asString(workspaceContext.repoUrl, "");
  const workspaceRepoRef = asString(workspaceContext.repoRef, "");
  const agentHome = asString(workspaceContext.agentHome, "");
  const workspaceHints = Array.isArray(context.paperclipWorkspaces)
    ? context.paperclipWorkspaces.filter(
        (value): value is Record<string, unknown> =>
          typeof value === "object" && value !== null,
      )
    : [];
  const configuredCwd = asString(config.cwd, "");
  const singleFileTargetPath = asString(
    context.paperclipSingleFileTargetPath,
    "",
  ).trim();
  const prefersConfiguredCwdForSingleFile =
    context.paperclipAbortOnMissingFile === true ||
    singleFileTargetPath.length > 0;
  const useConfiguredCwd =
    configuredCwd.length > 0 &&
    (prefersConfiguredCwdForSingleFile || workspaceSource === "agent_home");
  const effectiveWorkspaceCwd =
    useConfiguredCwd &&
    (workspaceSource === "agent_home" || workspaceSource === "fallback")
      ? ""
      : workspaceCwd;
  const cwd = useConfiguredCwd
    ? configuredCwd
    : effectiveWorkspaceCwd || configuredCwd || process.cwd();
  await ensureAbsoluteDirectory(cwd, { createIfMissing: true });
  if (strictFloorMode) {
    await removeGeminiPaperclipSkillSymlinksForFloor(onLog);
    await onLog(
      "stderr",
      "[paperclip] Strict floor mode active: Gemini skill injection disabled.\n",
    );
  } else {
    const includeSkills = asStringArray(config.includeSkills);
    await ensureGeminiSkillsInjected(onLog, includeSkills.length > 0 ? includeSkills : undefined);
  }

  const envConfig = parseObject(config.env);
  const hasExplicitApiKey =
    typeof envConfig.PAPERCLIP_API_KEY === "string" &&
    envConfig.PAPERCLIP_API_KEY.trim().length > 0;
  const env: Record<string, string> = { ...buildPaperclipEnv(agent) };
  env.PAPERCLIP_RUN_ID = runId;
  const wakeTaskId =
    (typeof context.taskId === "string" &&
      context.taskId.trim().length > 0 &&
      context.taskId.trim()) ||
    (typeof context.issueId === "string" &&
      context.issueId.trim().length > 0 &&
      context.issueId.trim()) ||
    null;
  const wakeReason =
    typeof context.wakeReason === "string" &&
    context.wakeReason.trim().length > 0
      ? context.wakeReason.trim()
      : null;
  const wakeCommentId =
    (typeof context.wakeCommentId === "string" &&
      context.wakeCommentId.trim().length > 0 &&
      context.wakeCommentId.trim()) ||
    (typeof context.commentId === "string" &&
      context.commentId.trim().length > 0 &&
      context.commentId.trim()) ||
    null;
  const approvalId =
    typeof context.approvalId === "string" &&
    context.approvalId.trim().length > 0
      ? context.approvalId.trim()
      : null;
  const approvalStatus =
    typeof context.approvalStatus === "string" &&
    context.approvalStatus.trim().length > 0
      ? context.approvalStatus.trim()
      : null;
  const linkedIssueIds = Array.isArray(context.issueIds)
    ? context.issueIds.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
    : [];
  if (wakeTaskId) env.PAPERCLIP_TASK_ID = wakeTaskId;
  if (wakeReason) env.PAPERCLIP_WAKE_REASON = wakeReason;
  if (wakeCommentId) env.PAPERCLIP_WAKE_COMMENT_ID = wakeCommentId;
  if (approvalId) env.PAPERCLIP_APPROVAL_ID = approvalId;
  if (approvalStatus) env.PAPERCLIP_APPROVAL_STATUS = approvalStatus;
  if (linkedIssueIds.length > 0)
    env.PAPERCLIP_LINKED_ISSUE_IDS = linkedIssueIds.join(",");
  const contextProjectId =
    typeof context.projectId === "string" && context.projectId.trim().length > 0
      ? context.projectId.trim()
      : "";
  if (contextProjectId) env.PAPERCLIP_PROJECT_ID = contextProjectId;
  if (effectiveWorkspaceCwd)
    env.PAPERCLIP_WORKSPACE_CWD = effectiveWorkspaceCwd;
  if (workspaceSource) env.PAPERCLIP_WORKSPACE_SOURCE = workspaceSource;
  if (workspaceId) env.PAPERCLIP_WORKSPACE_ID = workspaceId;
  if (workspaceRepoUrl) env.PAPERCLIP_WORKSPACE_REPO_URL = workspaceRepoUrl;
  if (workspaceRepoRef) env.PAPERCLIP_WORKSPACE_REPO_REF = workspaceRepoRef;
  if (agentHome) env.AGENT_HOME = agentHome;
  if (workspaceHints.length > 0)
    env.PAPERCLIP_WORKSPACES_JSON = JSON.stringify(workspaceHints);
  if (strictFloorMode) {
    env.PAPERCLIP_BENCHMARK_FLOOR_MODE = "true";
    if (benchmarkFamily.length > 0) {
      env.PAPERCLIP_BENCHMARK_FAMILY = benchmarkFamily;
    }
  }

  for (const [key, value] of Object.entries(envConfig)) {
    if (typeof value === "string") env[key] = value;
  }
  if (!hasExplicitApiKey && authToken) {
    env.PAPERCLIP_API_KEY = authToken;
  }
  const geminiSystemSettingsOverride =
    await ensureWindowsGeminiSystemSettingsOverride({
      runId,
      env,
      onLog,
    });
  const billingType = resolveGeminiBillingType(env);
  const runtimeEnv = ensurePathInEnv({ ...process.env, ...env });
  await ensureCommandResolvable(command, cwd, runtimeEnv);

  const timeoutSec = asNumber(config.timeoutSec, 0);
  const graceSec = asNumber(config.graceSec, 20);
  const extraArgs = (() => {
    const fromExtraArgs = asStringArray(config.extraArgs);
    if (fromExtraArgs.length > 0) return fromExtraArgs;
    return asStringArray(config.args);
  })();

  const runtimeSessionParams = parseObject(runtime.sessionParams);
  const runtimeSessionId = asString(
    runtimeSessionParams.sessionId,
    runtime.sessionId ?? "",
  );
  const runtimeSessionCwd = asString(runtimeSessionParams.cwd, "");
  const canResumeSession =
    runtimeSessionId.length > 0 &&
    (runtimeSessionCwd.length === 0 ||
      path.resolve(runtimeSessionCwd) === path.resolve(cwd));
  const sessionId = strictFloorMode
    ? null
    : thinDefaultExecution
    ? null
    : canResumeSession
    ? runtimeSessionId
    : null;
  if (runtimeSessionId && !canResumeSession) {
    await onLog(
      "stderr",
      `[paperclip] Gemini session "${runtimeSessionId}" was saved for cwd "${runtimeSessionCwd}" and will not be resumed in "${cwd}".\n`,
    );
  }

  const instructionsFilePath = asString(config.instructionsFilePath, "").trim();
  const instructionsDir = instructionsFilePath
    ? `${path.dirname(instructionsFilePath)}/`
    : "";
  let instructionsPrefix = "";
  if (!strictFloorMode && !thinDefaultExecution && instructionsFilePath) {
    try {
      const instructionsContents = await fs.readFile(
        instructionsFilePath,
        "utf8",
      );
      instructionsPrefix =
        `${instructionsContents}\n\n` +
        `The above agent instructions were loaded from ${instructionsFilePath}. ` +
        `Resolve any relative file references from ${instructionsDir}.\n\n`;
      await onLog(
        "stderr",
        `[paperclip] Loaded agent instructions file: ${instructionsFilePath}\n`,
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await onLog(
        "stderr",
        `[paperclip] Warning: could not read agent instructions file "${instructionsFilePath}": ${reason}\n`,
      );
    }
  }
  const commandNotes = (() => {
    const notes: string[] = [
      "Prompt is passed to Gemini as the final positional argument.",
    ];
    notes.push("Added --approval-mode yolo for unattended execution.");
    if (strictFloorMode) {
      notes.push(
        "Strict floor mode: no skill injection, no instruction prefix, no session handoff note, and no Paperclip API access note.",
      );
    }
    if (thinDefaultExecution) {
      notes.push(
        "Thin ready-small default execution active: no resume, no session handoff note, no API/env note, and no instructions prefix.",
      );
    }
    if (!instructionsFilePath) return notes;
    if (strictFloorMode) return notes;
    if (thinDefaultExecution) return notes;
    if (instructionsPrefix.length > 0) {
      notes.push(
        `Loaded agent instructions from ${instructionsFilePath}`,
        `Prepended instructions + path directive to prompt (relative references from ${instructionsDir}).`,
      );
      return notes;
    }
    notes.push(
      `Configured instructionsFilePath ${instructionsFilePath}, but file could not be read; continuing without injected instructions.`,
    );
    return notes;
  })();

  const bootstrapPromptTemplate = asString(config.bootstrapPromptTemplate, "");
  const templateData = {
    agentId: agent.id,
    companyId: agent.companyId,
    runId,
    company: { id: agent.companyId },
    agent,
    run: { id: runId, source: "on_demand" },
    context,
  };
  const renderedPrompt = renderTemplate(promptTemplate, templateData);
  const renderedBootstrapPrompt =
    !strictFloorMode &&
    !thinDefaultExecution &&
    !sessionId &&
    bootstrapPromptTemplate.trim().length > 0
      ? renderTemplate(bootstrapPromptTemplate, templateData).trim()
      : "";
  const roleTemplateNote = strictFloorMode ? "" : renderRoleTemplateNote(context);
  const roleTemplateId = strictFloorMode
    ? ""
    : asString(
        parseObject(agent.adapterConfig).roleTemplateId ??
          parseObject(config).roleTemplateId,
        "",
      )
        .trim()
        .toLowerCase();
  const sessionHandoffNote = strictFloorMode
    ? ""
    : thinDefaultExecution
    ? ""
    : asString(context.paperclipSessionHandoffMarkdown, "").trim();
  const issueTaskNote = renderIssueTaskNote(context);
  const engineDirectiveNote = strictFloorMode ? "" : renderEngineDirectiveNote(context);
  const includePaperclipEnvNote =
    !strictFloorMode &&
    !thinDefaultExecution &&
    asBoolean(config.includePaperclipEnvNote, false);
  const includeApiAccessNote =
    !strictFloorMode &&
    !thinDefaultExecution &&
    (roleTemplateId === "ceo" || asBoolean(config.includeApiAccessNote, false));
  const paperclipEnvNote = includePaperclipEnvNote || includeApiAccessNote
    ? renderPaperclipEnvNote(env)
    : "";
  const apiAccessNote = includeApiAccessNote ? renderApiAccessNote(env) : "";
  const floorModeGateNote = strictFloorMode
    ? [
        "Strict floor gate:",
        "- Do not activate skills.",
        "- Do not run shell commands.",
        "- Do not perform API/task workflow actions.",
        "- Read only the benchmark target file.",
        "- Output raw JSON only.",
        "",
      ].join("\n")
    : "";
  const powerShellNote = thinDefaultExecution ? "" : renderPowerShellNote();
  const prompt = joinPromptSections([
    strictFloorMode ? "" : instructionsPrefix,
    roleTemplateNote,
    renderedBootstrapPrompt,
    sessionHandoffNote,
    issueTaskNote,
    engineDirectiveNote,
    floorModeGateNote,
    paperclipEnvNote,
    apiAccessNote,
    powerShellNote,
    renderedPrompt,
  ]);
  const promptMetrics = {
    promptChars: prompt.length,
    instructionsChars: instructionsPrefix.length,
    roleTemplateChars: roleTemplateNote.length,
    bootstrapPromptChars: renderedBootstrapPrompt.length,
    sessionHandoffChars: sessionHandoffNote.length,
    issueTaskChars: issueTaskNote.length,
    runtimeNoteChars: paperclipEnvNote.length + apiAccessNote.length,
    heartbeatPromptChars: renderedPrompt.length,
  };
  const promptHeader = buildPromptHeader(prompt);
  const promptResolverDryRunPreflight = buildGeminiDryRunPreflightTelemetry({
    context,
    prompt,
  });
  const promptResolverShadow = buildGeminiPromptResolverShadowTelemetry({
    context,
    prompt,
    renderedPrompt,
  });

  const buildArgs = (resumeSessionId: string | null) => {
    const args = ["--output-format", "stream-json"];
    if (resumeSessionId) args.push("--resume", resumeSessionId);
    if (model && model !== DEFAULT_GEMINI_LOCAL_MODEL)
      args.push("--model", model);
    args.push("--approval-mode", "yolo");
    if (sandbox) {
      args.push("--sandbox");
    } else {
      args.push("--sandbox=none");
    }
    if (extraArgs.length > 0) args.push(...extraArgs);
    return args;
  };

  const runAttempt = async (resumeSessionId: string | null) => {
    const args = buildArgs(resumeSessionId);
    const shellLoopMonitor = createShellLoopMonitor({ runId, onLog });
    if (onMeta) {
      await onMeta({
        adapterType: "gemini_local",
        command,
        invokeSuppressed: false,
        adapterStarted: true,
        cwd,
        commandNotes,
        commandArgs: args,
        env: redactEnvForLogs(env),
        prompt,
        promptHeader,
        promptMetrics,
        ...(promptResolverDryRunPreflight
          ? { promptResolverDryRunPreflight }
          : {}),
        ...(promptResolverShadow ? { promptResolverShadow } : {}),
        context,
      });
    }

    const proc = await runChildProcess(runId, command, args, {
      cwd,
      env,
      timeoutSec,
      graceSec,
      onLog: shellLoopMonitor.onLog,
      stdin: prompt,
    });
    await shellLoopMonitor.flushStdoutBuffer();
    const loopDetectedMessage = shellLoopMonitor.getLoopDetectedMessage();
    const loopAbortCleanup = loopDetectedMessage
      ? await cleanupWorkspaceAfterLoopStop({
          runId,
          cwd,
          env,
        })
      : null;
    return {
      proc,
      parsed: parseGeminiJsonl(proc.stdout),
      loopDetectedMessage,
      loopAbortCleanup,
    };
  };

  const toResult = (
    attempt: {
      proc: {
        exitCode: number | null;
        signal: string | null;
        timedOut: boolean;
        stdout: string;
        stderr: string;
      };
      parsed: ReturnType<typeof parseGeminiJsonl>;
      loopDetectedMessage: string | null;
      loopAbortCleanup: {
        workspaceReset: boolean;
        cleanupExitCode: number | null;
        cleanupSignal: string | null;
        cleanupError: string | null;
      } | null;
    },
    clearSessionOnMissingSession = false,
    isRetry = false,
  ): AdapterExecutionResult => {
    const authMeta = detectGeminiAuthRequired({
      parsed: attempt.parsed.resultEvent,
      stdout: attempt.proc.stdout,
      stderr: attempt.proc.stderr,
    });
    const capacityMeta = detectGeminiCapacityExhausted({
      parsed: attempt.parsed.resultEvent,
      stdout: attempt.proc.stdout,
      stderr: attempt.proc.stderr,
    });

    if (attempt.proc.timedOut) {
      return {
        exitCode: attempt.proc.exitCode,
        signal: attempt.proc.signal,
        timedOut: true,
        errorMessage: `Timed out after ${timeoutSec}s`,
        errorCode: authMeta.requiresAuth ? "gemini_auth_required" : null,
        clearSession: clearSessionOnMissingSession,
      };
    }

    const clearSessionForTurnLimit = isGeminiTurnLimitResult(
      attempt.parsed.resultEvent,
      attempt.proc.exitCode,
    );

    // On retry, don't fall back to old session ID — the old session was stale
    const canFallbackToRuntimeSession = !isRetry;
    const resolvedSessionId =
      attempt.parsed.sessionId ??
      (canFallbackToRuntimeSession
        ? runtimeSessionId ?? runtime.sessionId ?? null
        : null);
    const resolvedSessionParams = resolvedSessionId
      ? ({
          sessionId: resolvedSessionId,
          cwd,
          ...(workspaceId ? { workspaceId } : {}),
          ...(workspaceRepoUrl ? { repoUrl: workspaceRepoUrl } : {}),
          ...(workspaceRepoRef ? { repoRef: workspaceRepoRef } : {}),
        } as Record<string, unknown>)
      : null;
    const parsedError =
      typeof attempt.parsed.errorMessage === "string"
        ? attempt.parsed.errorMessage.trim()
        : "";
    const strictFloorOutputValid =
      !strictFloorMode ||
      isStrictFloorRawJsonObjectText(attempt.parsed.summary);
    const strictFloorOutputError =
      strictFloorMode && !strictFloorOutputValid
        ? "Strict floor output was not raw JSON"
        : "";
    const stderrLine = firstNonEmptyLine(attempt.proc.stderr);
    const structuredFailure = attempt.parsed.resultEvent
      ? describeGeminiFailure(attempt.parsed.resultEvent)
      : null;
    const loopAbortMessage = attempt.loopDetectedMessage
      ? attempt.loopAbortCleanup?.workspaceReset
        ? `${attempt.loopDetectedMessage} Workspace reset with git checkout -- .`
        : attempt.loopAbortCleanup?.cleanupError
        ? `${attempt.loopDetectedMessage} Workspace cleanup failed: ${attempt.loopAbortCleanup.cleanupError}`
        : `${attempt.loopDetectedMessage} Workspace cleanup not attempted.`
      : null;
    const fallbackErrorMessage =
      loopAbortMessage ||
      strictFloorOutputError ||
      parsedError ||
      structuredFailure ||
      stderrLine ||
      `Gemini exited with code ${attempt.proc.exitCode ?? -1}`;
    const postToolCapacityExhausted =
      capacityMeta.exhausted &&
      attempt.parsed.toolActivity.successfulToolResultCount > 0 &&
      !attempt.loopDetectedMessage &&
      !strictFloorOutputError &&
      !authMeta.requiresAuth;
    const baseResultJson = attempt.loopDetectedMessage
      ? {
          type: "loop_detected",
          status: "blocked",
          result: "blocked",
          summary: attempt.loopDetectedMessage,
          message: attempt.loopAbortCleanup?.workspaceReset
            ? "Workspace reset with git checkout -- ."
            : attempt.loopAbortCleanup?.cleanupError
            ? `Workspace cleanup failed: ${attempt.loopAbortCleanup.cleanupError}`
            : "Workspace cleanup not attempted.",
          handoff: {
            title: "Blocked handoff",
            goal: "Stop the worker safely after loop detection.",
            result: "blocked",
            blocker: attempt.loopDetectedMessage,
            workspaceReset: attempt.loopAbortCleanup?.workspaceReset ?? false,
            next: "Reassess the prompt, scope, or command strategy before reassigning.",
          },
          workspaceReset: attempt.loopAbortCleanup?.workspaceReset ?? false,
          cleanupExitCode: attempt.loopAbortCleanup?.cleanupExitCode ?? null,
          cleanupSignal: attempt.loopAbortCleanup?.cleanupSignal ?? null,
        }
      : attempt.parsed.resultEvent ?? {
          stdout: attempt.proc.stdout,
          stderr: attempt.proc.stderr,
        };
    const resultJson = postToolCapacityExhausted
      ? {
          ...(typeof baseResultJson === "object" &&
          baseResultJson !== null &&
          !Array.isArray(baseResultJson)
            ? baseResultJson
            : {}),
          type: "post_tool_capacity_exhausted",
          status: "blocked",
          result: "deferred",
          summary:
            attempt.parsed.summary ||
            "Model capacity exhausted after successful tool calls.",
          message: capacityMeta.message ?? fallbackErrorMessage,
          capacity: {
            toolCallCount: attempt.parsed.toolActivity.toolCallCount,
            toolResultCount: attempt.parsed.toolActivity.toolResultCount,
            successfulToolResultCount:
              attempt.parsed.toolActivity.successfulToolResultCount,
            failedToolResultCount:
              attempt.parsed.toolActivity.failedToolResultCount,
            firstSuccessfulToolName:
              attempt.parsed.toolActivity.firstSuccessfulToolName,
            lastSuccessfulToolName:
              attempt.parsed.toolActivity.lastSuccessfulToolName,
          },
          resume: {
            strategy: "reuse_session",
            sessionId: resolvedSessionId,
            sessionDisplayId: resolvedSessionId,
            clearSession: false,
          },
        }
      : baseResultJson;

    return {
      exitCode: attempt.proc.exitCode,
      signal: attempt.proc.signal,
      timedOut: false,
      errorMessage:
        postToolCapacityExhausted
          ? capacityMeta.message ?? fallbackErrorMessage
          :
        (attempt.proc.exitCode ?? 0) === 0 &&
        !strictFloorOutputError &&
        !attempt.loopDetectedMessage
          ? null
          : fallbackErrorMessage,
      errorCode: strictFloorOutputError
        ? "non_json_output"
        : attempt.loopDetectedMessage
        ? "loop_detected"
        : postToolCapacityExhausted
        ? "post_tool_capacity_exhausted"
        : (attempt.proc.exitCode ?? 0) !== 0 && authMeta.requiresAuth
        ? "gemini_auth_required"
        : null,
      usage: attempt.parsed.usage,
      sessionId: resolvedSessionId,
      sessionParams: resolvedSessionParams,
      sessionDisplayId: resolvedSessionId,
      provider: "google",
      model,
      billingType,
      costUsd: attempt.parsed.costUsd,
      resultJson,
      summary: attempt.parsed.summary,
      question: attempt.parsed.question,
      clearSession:
        clearSessionForTurnLimit ||
        Boolean(clearSessionOnMissingSession && !resolvedSessionId),
    };
  };

  try {
    const initial = await runAttempt(sessionId);
    if (
      sessionId &&
      !initial.proc.timedOut &&
      (initial.proc.exitCode ?? 0) !== 0 &&
      isGeminiUnknownSessionError(initial.proc.stdout, initial.proc.stderr)
    ) {
      await onLog(
        "stderr",
        `[paperclip] Gemini resume session "${sessionId}" is unavailable; retrying with a fresh session.\n`,
      );
      const retry = await runAttempt(null);
      return toResult(retry, true, true);
    }

    return toResult(initial);
  } finally {
    await geminiSystemSettingsOverride?.cleanup();
  }
}
