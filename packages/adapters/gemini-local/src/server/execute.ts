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
  runChildProcess,
} from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_GEMINI_LOCAL_MODEL } from "../index.js";
import {
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
    "Do not use bare curl in PowerShell because it resolves to Invoke-WebRequest.",
    "Do not send JSON bodies with curl.exe -d '{...}' from PowerShell; that can produce invalid JSON on the server.",
    "Use run_shell_command with curl.exe or Invoke-RestMethod for Paperclip API requests.",
    "GET example:",
    `  run_shell_command({ command: "Invoke-RestMethod -Uri \"$env:PAPERCLIP_API_URL/api/agents/me\" -Headers @{ Authorization = \"Bearer $env:PAPERCLIP_API_KEY\" } | ConvertTo-Json -Depth 10" })`,
    "Checkout example:",
    `  run_shell_command({ command: "$body = @{ agentId = $env:PAPERCLIP_AGENT_ID; expectedStatuses = @('todo','backlog','blocked') } | ConvertTo-Json -Depth 4; Invoke-RestMethod -Method Post -Uri \"$env:PAPERCLIP_API_URL/api/issues/{id}/checkout\" -Headers @{ Authorization = \"Bearer $env:PAPERCLIP_API_KEY\"; \"X-Paperclip-Run-Id\" = $env:PAPERCLIP_RUN_ID } -ContentType \"application/json\" -Body $body | ConvertTo-Json -Depth 10" })`,
    "POST/PATCH example:",
    `  run_shell_command({ command: "$body = @{ status = \"done\"; comment = \"...\" } | ConvertTo-Json -Depth 4; Invoke-RestMethod -Method Patch -Uri \"$env:PAPERCLIP_API_URL/api/issues/{id}\" -Headers @{ Authorization = \"Bearer $env:PAPERCLIP_API_KEY\"; \"X-Paperclip-Run-Id\" = $env:PAPERCLIP_RUN_ID } -ContentType \"application/json\" -Body $body | ConvertTo-Json -Depth 10" })`,
    "",
    "",
  ].join("\n");
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

function buildPromptHeader(prompt: string, maxLines = 18): string {
  return prompt.split(/\r?\n/).slice(0, maxLines).join("\n").trim();
}

function geminiSkillsHome(): string {
  return path.join(os.homedir(), ".gemini", "skills");
}

/**
 * Inject Paperclip skills directly into `~/.gemini/skills/` via symlinks.
 * This avoids needing GEMINI_CLI_HOME overrides, so the CLI naturally finds
 * both its auth credentials and the injected skills in the real home directory.
 */
async function ensureGeminiSkillsInjected(
  onLog: AdapterExecutionContext["onLog"],
): Promise<void> {
  const skillsEntries = await listPaperclipSkillEntries(__moduleDir);
  if (skillsEntries.length === 0) return;

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

export async function execute(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  const { runId, agent, runtime, config, context, onLog, onMeta, authToken } =
    ctx;

  const benchmarkFamily = asString(context.paperclipBenchmarkFamily, "").trim();
  const strictFloorMode =
    context.paperclipStrictFloorMode === true ||
    benchmarkFamily.toLowerCase().startsWith("t1-floor-v1");

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
        "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.",
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
    await ensureGeminiSkillsInjected(onLog);
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
  if (!strictFloorMode && instructionsFilePath) {
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
    if (!instructionsFilePath) return notes;
    if (strictFloorMode) return notes;
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
    !strictFloorMode && !sessionId && bootstrapPromptTemplate.trim().length > 0
      ? renderTemplate(bootstrapPromptTemplate, templateData).trim()
      : "";
  const sessionHandoffNote = strictFloorMode
    ? ""
    : asString(context.paperclipSessionHandoffMarkdown, "").trim();
  const issueTaskNote = renderIssueTaskNote(context);
  const paperclipEnvNote = strictFloorMode ? "" : renderPaperclipEnvNote(env);
  const apiAccessNote = strictFloorMode ? "" : renderApiAccessNote(env);
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
  const prompt = joinPromptSections([
    strictFloorMode ? "" : instructionsPrefix,
    renderedBootstrapPrompt,
    sessionHandoffNote,
    issueTaskNote,
    floorModeGateNote,
    paperclipEnvNote,
    apiAccessNote,
    renderedPrompt,
  ]);
  const promptMetrics = {
    promptChars: prompt.length,
    instructionsChars: instructionsPrefix.length,
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
    args.push(prompt);
    return args;
  };

  const runAttempt = async (resumeSessionId: string | null) => {
    const args = buildArgs(resumeSessionId);
    if (onMeta) {
      await onMeta({
        adapterType: "gemini_local",
        command,
        invokeSuppressed: false,
        adapterStarted: true,
        cwd,
        commandNotes,
        commandArgs: args.map((value, index) =>
          index === args.length - 1 ? `<prompt ${prompt.length} chars>` : value,
        ),
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
      onLog,
    });
    return {
      proc,
      parsed: parseGeminiJsonl(proc.stdout),
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
    },
    clearSessionOnMissingSession = false,
    isRetry = false,
  ): AdapterExecutionResult => {
    const authMeta = detectGeminiAuthRequired({
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
    const stderrLine = firstNonEmptyLine(attempt.proc.stderr);
    const structuredFailure = attempt.parsed.resultEvent
      ? describeGeminiFailure(attempt.parsed.resultEvent)
      : null;
    const fallbackErrorMessage =
      parsedError ||
      structuredFailure ||
      stderrLine ||
      `Gemini exited with code ${attempt.proc.exitCode ?? -1}`;

    return {
      exitCode: attempt.proc.exitCode,
      signal: attempt.proc.signal,
      timedOut: false,
      errorMessage:
        (attempt.proc.exitCode ?? 0) === 0 ? null : fallbackErrorMessage,
      errorCode:
        (attempt.proc.exitCode ?? 0) !== 0 && authMeta.requiresAuth
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
      resultJson: attempt.parsed.resultEvent ?? {
        stdout: attempt.proc.stdout,
        stderr: attempt.proc.stderr,
      },
      summary: attempt.parsed.summary,
      question: attempt.parsed.question,
      clearSession:
        clearSessionForTurnLimit ||
        Boolean(clearSessionOnMissingSession && !resolvedSessionId),
    };
  };

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
}
