import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  activityLog,
  agents,
  agentRuntimeState,
  agentTaskSessions,
  agentWakeupRequests,
  heartbeatRunEvents,
  heartbeatRuns,
  issues,
  projects,
  projectWorkspaces,
} from "@paperclipai/db";
import { conflict, notFound } from "../errors.js";
import { logger } from "../middleware/logger.js";
import { publishLiveEvent } from "./live-events.js";
import { getRunLogStore, type RunLogHandle } from "./run-log-store.js";
import { getServerAdapter, runningProcesses } from "../adapters/index.js";
import type {
  AdapterExecutionResult,
  AdapterInvocationMeta,
  AdapterSessionCodec,
  UsageSummary,
} from "../adapters/index.js";
import { createLocalAgentJwt } from "../agent-auth-jwt.js";
import {
  parseObject,
  asBoolean,
  asNumber,
  appendWithCap,
  MAX_EXCERPT_BYTES,
} from "../adapters/utils.js";
import { costService } from "./costs.js";
import { secretService } from "./secrets.js";
import { resolveDefaultAgentWorkspaceDir } from "../home-paths.js";
import { summarizeHeartbeatRunResultJson } from "./heartbeat-run-summary.js";
import {
  buildWorkspaceReadyComment,
  ensureRuntimeServicesForRun,
  persistAdapterManagedRuntimeServices,
  realizeExecutionWorkspace,
  releaseRuntimeServicesForRun,
} from "./workspace-runtime.js";
import { issueService } from "./issues.js";
import { memoryService } from "./memory.js";
import {
  buildExecutionWorkspaceAdapterConfig,
  parseIssueExecutionWorkspaceSettings,
  parseProjectExecutionWorkspacePolicy,
  resolveExecutionWorkspaceMode,
} from "./execution-workspace-policy.js";
import {
  redactCurrentUserText,
  redactCurrentUserValue,
} from "../log-redaction.js";
import { refreshGeminiRuntimeQuotaSnapshot } from "./gemini-quota-producer.js";
import { fetchLiveGeminiQuota } from "./gemini-quota-api.js";
import { resolveAssignedRoleTemplate } from "./role-templates.js";
import { logActivity } from "./activity-log.js";
import { prepareHeartbeatGeminiRouting } from "./heartbeat-gemini-routing.js";
import {
  applyHeartbeatContextPatch,
  applyIssuePromptContext,
  applyReviewerPromptContext,
  buildHeartbeatIssuePromptContextPatch,
  buildHeartbeatReviewerPromptContextPatch,
  isDryRunExecutionMode,
  isTestRunContext,
  normalizeReviewTargetWorkerHandoff,
  readExecutionMode,
  type IssuePromptContext,
  type ReviewerVerdict,
  type ReviewTargetPromptContext,
} from "./heartbeat-prompt-context.js";
import {
  evaluateSessionCompaction as evaluateSessionCompactionSeam,
  evaluateSingleFileBenchmarkPreflight,
  getAdapterSessionCodec as getAdapterSessionCodecSeam,
  normalizeSessionParams as normalizeSessionParamsSeam,
  prepareHeartbeatWorkspaceSessionPlan,
  resolveNextSessionState as resolveNextSessionStateSeam,
  resolveSessionBeforeForWakeup as resolveSessionBeforeForWakeupSeam,
  resolveWorkspaceForRun as resolveWorkspaceForRunSeam,
  shouldResetTaskSessionForWake,
  truncateDisplayId as truncateDisplayIdSeam,
  type ResolvedWorkspaceForRun,
  type SessionCompactionDecision,
} from "./heartbeat-workspace-session.js";
import {
  determineIssueStatusAfterRun,
  finalizeHeartbeatAgentStatus,
  readAssignedRoleTemplateId,
  resolveNextAgentStatusAfterRun,
  type AgentFinalizationOutcome,
} from "./heartbeat-run-finalization.js";

export {
  extractReviewerVerdict,
  extractSingleFileBenchmarkTarget,
  applyIssuePromptContext,
  applyReviewerPromptContext,
  isDryRunExecutionMode,
  isTestRunContext,
  normalizeReviewTargetWorkerHandoff,
  readExecutionMode,
} from "./heartbeat-prompt-context.js";
export {
  evaluateSingleFileBenchmarkPreflight,
  prepareHeartbeatWorkspaceSessionPlan,
  resolveAdapterCwdForRun,
  resolveRuntimeSessionParamsForWorkspace,
  shouldResetTaskSessionForWake,
  type ResolvedWorkspaceForRun,
} from "./heartbeat-workspace-session.js";
export {
  determineIssueStatusAfterRun,
  resolveNextAgentStatusAfterRun,
  type AgentFinalizationOutcome,
} from "./heartbeat-run-finalization.js";

const MAX_LIVE_LOG_CHUNK_BYTES = 8 * 1024;
const HEARTBEAT_MAX_CONCURRENT_RUNS_DEFAULT = 1;
const HEARTBEAT_MAX_CONCURRENT_RUNS_MAX = 10;
const RUN_KEEPALIVE_INTERVAL_MS = 25_000;
const RUN_KEEPALIVE_MIN_TOUCH_AGE_MS = 60_000;
const ABSOLUTE_RUN_TOKEN_HARD_CAP = 150_000;
const DEFERRED_WAKE_CONTEXT_KEY = "_paperclipWakeContext";
export const POST_TOOL_CAPACITY_ERROR_CODE = "post_tool_capacity_exhausted";
export const POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS =
  "deferred_capacity_cooldown";
const POST_TOOL_CAPACITY_COOLDOWN_SEC_DEFAULT = 180;
const POST_TOOL_CAPACITY_COOLDOWN_SEC_MIN = 30;
const POST_TOOL_CAPACITY_COOLDOWN_SEC_MAX = 900;
const CLOSED_ISSUE_STATUSES = new Set([
  "done",
  "cancelled",
  "reviewer_accepted",
  "merged",
]);
const startLocksByAgent = new Map<string, Promise<void>>();

const heartbeatRunListColumns = {
  id: heartbeatRuns.id,
  companyId: heartbeatRuns.companyId,
  agentId: heartbeatRuns.agentId,
  invocationSource: heartbeatRuns.invocationSource,
  triggerDetail: heartbeatRuns.triggerDetail,
  status: heartbeatRuns.status,
  startedAt: heartbeatRuns.startedAt,
  finishedAt: heartbeatRuns.finishedAt,
  error: heartbeatRuns.error,
  wakeupRequestId: heartbeatRuns.wakeupRequestId,
  exitCode: heartbeatRuns.exitCode,
  signal: heartbeatRuns.signal,
  usageJson: heartbeatRuns.usageJson,
  resultJson: heartbeatRuns.resultJson,
  sessionIdBefore: heartbeatRuns.sessionIdBefore,
  sessionIdAfter: heartbeatRuns.sessionIdAfter,
  logStore: heartbeatRuns.logStore,
  logRef: heartbeatRuns.logRef,
  logBytes: heartbeatRuns.logBytes,
  logSha256: heartbeatRuns.logSha256,
  logCompressed: heartbeatRuns.logCompressed,
  stdoutExcerpt: sql<string | null>`NULL`.as("stdoutExcerpt"),
  stderrExcerpt: sql<string | null>`NULL`.as("stderrExcerpt"),
  errorCode: heartbeatRuns.errorCode,
  externalRunId: heartbeatRuns.externalRunId,
  contextSnapshot: heartbeatRuns.contextSnapshot,
  createdAt: heartbeatRuns.createdAt,
  updatedAt: heartbeatRuns.updatedAt,
} as const;

function appendExcerpt(prev: string, chunk: string) {
  return appendWithCap(prev, chunk, MAX_EXCERPT_BYTES);
}

function normalizeMaxConcurrentRuns(value: unknown) {
  const parsed = Math.floor(
    asNumber(value, HEARTBEAT_MAX_CONCURRENT_RUNS_DEFAULT),
  );
  if (!Number.isFinite(parsed)) return HEARTBEAT_MAX_CONCURRENT_RUNS_DEFAULT;
  return Math.max(
    HEARTBEAT_MAX_CONCURRENT_RUNS_DEFAULT,
    Math.min(HEARTBEAT_MAX_CONCURRENT_RUNS_MAX, parsed),
  );
}

async function withAgentStartLock<T>(agentId: string, fn: () => Promise<T>) {
  const previous = startLocksByAgent.get(agentId) ?? Promise.resolve();
  const run = previous.then(fn);
  const marker = run.then(
    () => undefined,
    () => undefined,
  );
  startLocksByAgent.set(agentId, marker);
  try {
    return await run;
  } finally {
    if (startLocksByAgent.get(agentId) === marker) {
      startLocksByAgent.delete(agentId);
    }
  }
}

interface WakeupOptions {
  source?: WakeupSource;
  triggerDetail?: "manual" | "ping" | "callback" | "system";
  reason?: string | null;
  payload?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
  requestedByActorType?: "user" | "agent" | "system";
  requestedByActorId?: string | null;
  contextSnapshot?: Record<string, unknown>;
}

export type WakeupSource = "timer" | "assignment" | "on_demand" | "automation";

export type UsageTotals = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};

export type PostToolCapacityState = {
  toolCallCount: number;
  toolResultCount: number;
  successfulToolResultCount: number;
  failedToolResultCount: number;
  firstSuccessfulToolName: string | null;
  lastSuccessfulToolName: string | null;
  sessionId: string | null;
  issueId: string | null;
  taskKey: string | null;
  message: string | null;
};

interface ParsedIssueAssigneeAdapterOverrides {
  adapterConfig: Record<string, unknown> | null;
  useProjectWorkspace: boolean | null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNonEmptyStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function safeParseJsonLine(line: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(line);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function normalizeRelativeReadPath(value: unknown): string | null {
  const raw = readNonEmptyString(value);
  if (!raw) return null;
  const normalized = raw.replace(/\\/g, "/").trim();
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[a-zA-Z]:\//.test(normalized)
  ) {
    return null;
  }
  const parts = normalized.split("/").filter((part) => part.length > 0);
  if (parts.some((part) => part === "..")) return null;
  return parts.length > 0 ? parts.join("/") : null;
}

function buildReadFileEvidencePreview(content: string, maxChars = 220): string {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}...`;
}

async function collectReadFileEvidence(input: {
  workspaceCwd: string;
  relativePath: string;
}) {
  const absolutePath = path.resolve(input.workspaceCwd, input.relativePath);
  const normalizedWorkspace = path.resolve(input.workspaceCwd);
  if (!absolutePath.startsWith(normalizedWorkspace)) return null;

  const stat = await fs.stat(absolutePath);
  if (!stat.isFile()) return null;

  const content = await fs.readFile(absolutePath, "utf8");
  const sha256 = createHash("sha256").update(content, "utf8").digest("hex");

  return {
    relativePath: input.relativePath,
    byteCount: Buffer.byteLength(content, "utf8"),
    sha256,
    preview: buildReadFileEvidencePreview(content),
  };
}

function normalizeUsageTotals(
  usage: UsageSummary | null | undefined,
): UsageTotals | null {
  if (!usage) return null;
  return {
    inputTokens: Math.max(0, Math.floor(asNumber(usage.inputTokens, 0))),
    cachedInputTokens: Math.max(
      0,
      Math.floor(asNumber(usage.cachedInputTokens, 0)),
    ),
    outputTokens: Math.max(0, Math.floor(asNumber(usage.outputTokens, 0))),
  };
}

function readRawUsageTotals(usageJson: unknown): UsageTotals | null {
  const parsed = parseObject(usageJson);
  if (Object.keys(parsed).length === 0) return null;

  const inputTokens = Math.max(
    0,
    Math.floor(
      asNumber(parsed.rawInputTokens, asNumber(parsed.inputTokens, 0)),
    ),
  );
  const cachedInputTokens = Math.max(
    0,
    Math.floor(
      asNumber(
        parsed.rawCachedInputTokens,
        asNumber(parsed.cachedInputTokens, 0),
      ),
    ),
  );
  const outputTokens = Math.max(
    0,
    Math.floor(
      asNumber(parsed.rawOutputTokens, asNumber(parsed.outputTokens, 0)),
    ),
  );

  if (inputTokens <= 0 && cachedInputTokens <= 0 && outputTokens <= 0) {
    return null;
  }

  return {
    inputTokens,
    cachedInputTokens,
    outputTokens,
  };
}

function deriveNormalizedUsageDelta(
  current: UsageTotals | null,
  previous: UsageTotals | null,
): UsageTotals | null {
  if (!current) return null;
  if (!previous) return { ...current };

  const inputTokens =
    current.inputTokens >= previous.inputTokens
      ? current.inputTokens - previous.inputTokens
      : current.inputTokens;
  const cachedInputTokens =
    current.cachedInputTokens >= previous.cachedInputTokens
      ? current.cachedInputTokens - previous.cachedInputTokens
      : current.cachedInputTokens;
  const outputTokens =
    current.outputTokens >= previous.outputTokens
      ? current.outputTokens - previous.outputTokens
      : current.outputTokens;

  return {
    inputTokens: Math.max(0, inputTokens),
    cachedInputTokens: Math.max(0, cachedInputTokens),
    outputTokens: Math.max(0, outputTokens),
  };
}

function formatCount(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US");
}

function parseIssueAssigneeAdapterOverrides(
  raw: unknown,
): ParsedIssueAssigneeAdapterOverrides | null {
  const parsed = parseObject(raw);
  const parsedAdapterConfig = parseObject(parsed.adapterConfig);
  const adapterConfig =
    Object.keys(parsedAdapterConfig).length > 0 ? parsedAdapterConfig : null;
  const useProjectWorkspace =
    typeof parsed.useProjectWorkspace === "boolean"
      ? parsed.useProjectWorkspace
      : null;
  if (!adapterConfig && useProjectWorkspace === null) return null;
  return {
    adapterConfig,
    useProjectWorkspace,
  };
}

function deriveTaskKey(
  contextSnapshot: Record<string, unknown> | null | undefined,
  payload: Record<string, unknown> | null | undefined,
) {
  return (
    readNonEmptyString(contextSnapshot?.taskKey) ??
    readNonEmptyString(contextSnapshot?.taskId) ??
    readNonEmptyString(contextSnapshot?.issueId) ??
    readNonEmptyString(payload?.taskKey) ??
    readNonEmptyString(payload?.taskId) ??
    readNonEmptyString(payload?.issueId) ??
    null
  );
}

export function deriveWorkPacketId(
  contextSnapshot: Record<string, unknown> | null | undefined,
  payload: Record<string, unknown> | null | undefined,
) {
  return (
    readNonEmptyString(contextSnapshot?.workPacketId) ??
    readNonEmptyString(contextSnapshot?.packetId) ??
    readNonEmptyString(contextSnapshot?.taskPacketId) ??
    readNonEmptyString(payload?.workPacketId) ??
    readNonEmptyString(payload?.packetId) ??
    deriveTaskKey(contextSnapshot, payload)
  );
}

export function requiresGovernedWorkPacket(source: WakeupSource | undefined) {
  return (
    source === "automation" || source === "timer" || source === "assignment"
  );
}

function parseBudgetClassDefaultHardCapTokens(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "small") return 35_000;
  if (normalized === "medium") return 75_000;
  if (normalized === "large") return 125_000;
  return null;
}

export function resolveHardTokenCapTokens(context: Record<string, unknown>) {
  const governanceBudget = parseObject(context.governanceBudget);
  const packetBudget = parseObject(context.workPacketBudget);
  const explicit =
    asNumber(context.hardCapTokens, Number.NaN) ||
    asNumber(governanceBudget.hardCapTokens, Number.NaN) ||
    asNumber(packetBudget.hardCapTokens, Number.NaN);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.max(1, Math.floor(explicit));
  }

  const budgetClass =
    readNonEmptyString(context.budgetClass) ??
    readNonEmptyString(governanceBudget.budgetClass) ??
    readNonEmptyString(packetBudget.budgetClass);
  const classCap = parseBudgetClassDefaultHardCapTokens(budgetClass);
  if (classCap) return classCap;

  return ABSOLUTE_RUN_TOKEN_HARD_CAP;
}

export function estimateTotalTokens(usage: UsageTotals | null) {
  if (!usage) return null;
  return Math.max(
    0,
    Math.floor(
      usage.inputTokens + usage.cachedInputTokens + usage.outputTokens,
    ),
  );
}

export function resolveHeartbeatModelOverride(input: {
  adapterType: string;
  configuredModel?: string | null;
  applyModelLane: boolean;
  effectiveModelLane?: string | null;
}) {
  const configuredModel = input.configuredModel?.trim() || null;
  const effectiveModelLane = input.effectiveModelLane?.trim() || null;
  if (!input.applyModelLane || !effectiveModelLane) return configuredModel;
  if (input.adapterType !== "gemini_local") return effectiveModelLane;
  if (configuredModel && configuredModel !== "auto") return effectiveModelLane;

  const normalizedLane = effectiveModelLane.toLowerCase();
  // Live probes showed `auto` stalling on `auto-gemini-3` while explicit flash
  // lanes recover and reach the first tool call. Keep only pro-style lanes on auto.
  if (normalizedLane.includes("flash")) return effectiveModelLane;
  return configuredModel;
}

export function isPhaseBExecution(context: Record<string, unknown>) {
  const phase =
    readNonEmptyString(context.phase) ??
    readNonEmptyString(context.runPhase) ??
    readNonEmptyString(context.executionPhase);
  if (!phase) return false;

  const normalized = phase.trim().toLowerCase();
  return (
    normalized === "b" ||
    normalized === "phase_b" ||
    normalized === "phase-b" ||
    normalized === "phase2" ||
    normalized === "phase_2" ||
    normalized === "implementation"
  );
}

export function hasPhaseBCheckpointApproval(context: Record<string, unknown>) {
  if (
    context.phaseCheckpointApproved === true ||
    context.phaseBApproved === true ||
    context.checkpointApproved === true ||
    context.approvalGranted === true
  ) {
    return true;
  }

  return Boolean(
    readNonEmptyString(context.phaseCheckpointId) ??
      readNonEmptyString(context.phaseBApprovalId) ??
      readNonEmptyString(context.approvalId),
  );
}

export function isGovernanceTestModeEnabled() {
  return process.env.GOVERNANCE_TEST_MODE === "true";
}

const LEGACY_DB_ASCII_REPLACEMENTS: Record<string, string> = {
  "\u00a0": " ",
  "\u2013": "-",
  "\u2014": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u2022": "*",
  "\u2026": "...",
  "\u2190": "<-",
  "\u2192": "->",
  "\u21d0": "<=",
  "\u21d2": "=>",
  "\u0394": "Delta",
  "\u03b4": "delta",
  "\u2713": "[ok]",
  "\u2714": "[ok]",
  "\u2717": "x",
  "\u2718": "x",
};

export function isLegacyDatabaseEncodingError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "22P05"
  );
}

export function sanitizeLegacyDatabaseValue<T>(value: T): T {
  if (typeof value === "string") {
    const replaced = Array.from(value, (char) => {
      return LEGACY_DB_ASCII_REPLACEMENTS[char] ?? char;
    }).join("");

    return replaced
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?")
      .replace(/\?{2,}/g, "?") as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLegacyDatabaseValue(item)) as T;
  }

  if (
    value &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    !(value instanceof Uint8Array)
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sanitizeLegacyDatabaseValue(nestedValue),
      ]),
    ) as T;
  }

  return value;
}

function resolveAdapterExecutionSafety(
  contextSnapshot: Record<string, unknown> | null | undefined,
) {
  const executionMode = readExecutionMode(contextSnapshot);
  if (isGovernanceTestModeEnabled()) {
    return {
      blockAdapterExecute: true,
      reason: "env_governance_test_mode" as const,
      executionMode,
    };
  }
  if (isTestRunContext(contextSnapshot)) {
    return {
      blockAdapterExecute: true,
      reason: "context_test_run" as const,
      executionMode,
    };
  }
  return {
    blockAdapterExecute: false,
    reason: null,
    executionMode,
  };
}

export function resolveDryRunUsageTotals(
  contextSnapshot: Record<string, unknown> | null | undefined,
): UsageTotals | null {
  if (!contextSnapshot) return null;
  const parsed = parseObject(
    contextSnapshot.dryRunUsage ??
      contextSnapshot.testUsage ??
      contextSnapshot.governanceTestUsage,
  );
  if (Object.keys(parsed).length === 0) return null;

  return {
    inputTokens: Math.max(0, Math.floor(asNumber(parsed.inputTokens, 0))),
    cachedInputTokens: Math.max(
      0,
      Math.floor(asNumber(parsed.cachedInputTokens, 0)),
    ),
    outputTokens: Math.max(0, Math.floor(asNumber(parsed.outputTokens, 0))),
  };
}

export function buildDryRunAdapterResult(input: {
  contextSnapshot: Record<string, unknown> | null | undefined;
  safetyReason: "env_governance_test_mode" | "context_test_run" | string;
}): AdapterExecutionResult {
  const usage = resolveDryRunUsageTotals(input.contextSnapshot);
  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    usage: usage ?? undefined,
    billingType: "unknown",
    costUsd: 0,
    resultJson: {
      mode: "dry_run",
      adapterExecuteBlocked: true,
      safetyReason: input.safetyReason,
      dryRunUsage: usage,
    },
    summary: "Dry-run safety barrier blocked adapter.execute",
  };
}

export function evaluateGovernanceDryRunValidation(input: {
  source?: WakeupSource;
  contextSnapshot?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
}) {
  const source = input.source;
  const contextSnapshot = parseObject(input.contextSnapshot);
  const payload = parseObject(input.payload);
  const workPacketId = deriveWorkPacketId(contextSnapshot, payload);

  if (requiresGovernedWorkPacket(source) && !workPacketId) {
    return {
      status: "skipped" as const,
      reason: "governance.work_packet_required" as const,
      adapterExecuteBlocked: true,
      workPacketId: null,
      hardTokenCap: resolveHardTokenCapTokens(contextSnapshot),
      totalTokensUsed: null,
      adapterResult: null,
    };
  }

  if (
    isPhaseBExecution(contextSnapshot) &&
    !hasPhaseBCheckpointApproval(contextSnapshot)
  ) {
    return {
      status: "failed" as const,
      reason: "phase_checkpoint_required" as const,
      adapterExecuteBlocked: true,
      workPacketId,
      hardTokenCap: resolveHardTokenCapTokens(contextSnapshot),
      totalTokensUsed: null,
      adapterResult: null,
    };
  }

  const adapterResult = buildDryRunAdapterResult({
    contextSnapshot,
    safetyReason: "context_test_run",
  });
  const totalTokensUsed = estimateTotalTokens(
    normalizeUsageTotals(adapterResult.usage),
  );
  const hardTokenCap = resolveHardTokenCapTokens(contextSnapshot);

  return {
    status:
      totalTokensUsed != null && totalTokensUsed > hardTokenCap
        ? ("failed" as const)
        : ("succeeded" as const),
    reason:
      totalTokensUsed != null && totalTokensUsed > hardTokenCap
        ? ("budget_hard_cap_reached" as const)
        : ("dry_run_validation_ok" as const),
    adapterExecuteBlocked: true,
    workPacketId,
    hardTokenCap,
    totalTokensUsed,
    adapterResult,
  };
}

function deriveCommentId(
  contextSnapshot: Record<string, unknown> | null | undefined,
  payload: Record<string, unknown> | null | undefined,
) {
  return (
    readNonEmptyString(contextSnapshot?.wakeCommentId) ??
    readNonEmptyString(contextSnapshot?.commentId) ??
    readNonEmptyString(payload?.commentId) ??
    null
  );
}

type AutoRetriggerIssueRecord = {
  id: string;
  companyId: string;
  parentId: string | null;
  status: string;
  assigneeAgentId: string | null;
  identifier: string | null;
};

type AutoRetriggerAgentRecord = {
  id: string;
  companyId: string;
  adapterConfig: Record<string, unknown> | null;
};

type AutoRetriggerActivityInput = {
  companyId: string;
  actorType: "agent";
  actorId: string;
  agentId: string | null;
  runId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
};

type AutoRetriggerDeps = {
  getIssueById: (issueId: string) => Promise<AutoRetriggerIssueRecord | null>;
  getAgentById: (agentId: string) => Promise<AutoRetriggerAgentRecord | null>;
  updateIssue: (
    issueId: string,
    patch: { assigneeAgentId?: string | null },
  ) => Promise<AutoRetriggerIssueRecord | null>;
  wakeup: (agentId: string, opts: WakeupOptions) => Promise<unknown>;
  recordActivity: (input: AutoRetriggerActivityInput) => Promise<void>;
};

export async function retriggerCEOParentIssueAfterReviewerAcceptance(input: {
  childIssue: AutoRetriggerIssueRecord;
  reviewerRunId: string;
  reviewerAgentId: string;
  transitionReason: string | null;
  reviewerVerdict: ReviewerVerdict | null;
}, deps: AutoRetriggerDeps) {
  if (
    input.transitionReason !== "reviewer_accepted" ||
    input.reviewerVerdict !== "accepted"
  ) {
    return null;
  }

  const parentId = input.childIssue.parentId;
  if (!parentId) return null;

  const parentIssue = await deps.getIssueById(parentId);
  if (!parentIssue || parentIssue.companyId !== input.childIssue.companyId) {
    return null;
  }

  const parentStatus = readNonEmptyString(parentIssue.status)?.toLowerCase();
  if (!parentStatus || CLOSED_ISSUE_STATUSES.has(parentStatus)) {
    return null;
  }

  const parentAssigneeAgentId = parentIssue.assigneeAgentId;
  if (!parentAssigneeAgentId) return null;

  const parentAssignee = await deps.getAgentById(parentAssigneeAgentId);
  if (!parentAssignee || parentAssignee.companyId !== parentIssue.companyId) {
    return null;
  }

  const roleTemplateResolution = resolveAssignedRoleTemplate(
    parentAssignee.adapterConfig,
  );
  if (roleTemplateResolution.assigned?.template.id !== "ceo") {
    return null;
  }

  const unassigned = await deps.updateIssue(parentIssue.id, {
    assigneeAgentId: null,
  });
  if (!unassigned) return null;

  const retriggered = await deps.updateIssue(parentIssue.id, {
    assigneeAgentId: parentAssigneeAgentId,
  });
  if (!retriggered) return null;

  const wakeupResult = await deps.wakeup(parentAssigneeAgentId, {
    source: "automation",
    triggerDetail: "system",
    reason: "issue_assigned",
    payload: {
      issueId: retriggered.id,
      childIssueId: input.childIssue.id,
      mutation: "retrigger",
    },
    requestedByActorType: "agent",
    requestedByActorId: input.reviewerAgentId,
    contextSnapshot: {
      issueId: retriggered.id,
      source: "issue.auto_retrigger",
      parentIssueId: retriggered.id,
      childIssueId: input.childIssue.id,
      wakeReason: "issue_assigned",
    },
  });

  await deps.recordActivity({
    companyId: retriggered.companyId,
    actorType: "agent",
    actorId: input.reviewerAgentId,
    agentId: input.reviewerAgentId,
    runId: input.reviewerRunId,
    action: "issue.auto_retriggered",
    entityType: "issue",
    entityId: retriggered.id,
    details: {
      identifier: retriggered.identifier,
      childIssueId: input.childIssue.id,
      parentIssueId: retriggered.id,
      parentAssigneeAgentId,
      roleTemplateId: roleTemplateResolution.assigned?.template.id ?? null,
      wakeupQueued: wakeupResult != null,
      _previous: {
        assigneeAgentId: unassigned.assigneeAgentId,
      },
    },
  });

  return {
    parentIssue: retriggered,
    parentAssigneeAgentId,
    wakeupQueued: wakeupResult != null,
  };
}

export function shouldPromoteDeferredIssueExecution(
  issueStatus: string | null | undefined,
) {
  const normalized = readNonEmptyString(issueStatus)?.toLowerCase();
  return normalized == null || !CLOSED_ISSUE_STATUSES.has(normalized);
}

export function resolvePostToolCapacityCooldownSec(runtimeConfig: unknown) {
  const parsedRuntime = parseObject(runtimeConfig);
  const heartbeat = parseObject(parsedRuntime.heartbeat);
  const configured = Math.floor(
    asNumber(
      heartbeat.postToolCapacityCooldownSec,
      asNumber(
        parsedRuntime.postToolCapacityCooldownSec,
        POST_TOOL_CAPACITY_COOLDOWN_SEC_DEFAULT,
      ),
    ),
  );
  if (!Number.isFinite(configured)) {
    return POST_TOOL_CAPACITY_COOLDOWN_SEC_DEFAULT;
  }
  return Math.max(
    POST_TOOL_CAPACITY_COOLDOWN_SEC_MIN,
    Math.min(POST_TOOL_CAPACITY_COOLDOWN_SEC_MAX, configured),
  );
}

export function readPostToolCapacityState(input: {
  errorCode?: unknown;
  resultJson?: unknown;
  sessionId?: string | null;
  issueId?: string | null;
  taskKey?: string | null;
}): PostToolCapacityState | null {
  const errorCode = readNonEmptyString(input.errorCode);
  const resultJson = parseObject(input.resultJson);
  const type = readNonEmptyString(resultJson.type);
  if (
    errorCode !== POST_TOOL_CAPACITY_ERROR_CODE &&
    type !== POST_TOOL_CAPACITY_ERROR_CODE
  ) {
    return null;
  }

  const capacity = parseObject(resultJson.capacity);
  return {
    toolCallCount: Math.max(0, Math.floor(asNumber(capacity.toolCallCount, 0))),
    toolResultCount: Math.max(
      0,
      Math.floor(asNumber(capacity.toolResultCount, 0)),
    ),
    successfulToolResultCount: Math.max(
      0,
      Math.floor(asNumber(capacity.successfulToolResultCount, 0)),
    ),
    failedToolResultCount: Math.max(
      0,
      Math.floor(asNumber(capacity.failedToolResultCount, 0)),
    ),
    firstSuccessfulToolName:
      readNonEmptyString(capacity.firstSuccessfulToolName) ?? null,
    lastSuccessfulToolName:
      readNonEmptyString(capacity.lastSuccessfulToolName) ?? null,
    sessionId: input.sessionId ?? null,
    issueId: input.issueId ?? null,
    taskKey: input.taskKey ?? null,
    message:
      readNonEmptyString(resultJson.message) ??
      readNonEmptyString(resultJson.summary) ??
      null,
  };
}

export function isPostToolCapacityWakeReady(
  payload: unknown,
  now = new Date(),
) {
  const parsed = parseObject(payload);
  if (readNonEmptyString(parsed.resumeKind) !== "post_tool_capacity") {
    return false;
  }
  const notBefore = readNonEmptyString(parsed.notBefore);
  if (!notBefore) return true;
  const parsedTs = Date.parse(notBefore);
  if (!Number.isFinite(parsedTs)) return true;
  return parsedTs <= now.getTime();
}

export function buildPostToolCapacityDeferredContextSnapshot(input: {
  contextSnapshot: Record<string, unknown>;
  source?: WakeupSource;
  triggerDetail?: WakeupOptions["triggerDetail"] | null;
  cooldownUntil?: string | null;
}) {
  const next = { ...input.contextSnapshot };
  delete next.forceFreshSession;
  next.wakeReason = "post_tool_capacity_resume";
  next.postToolCapacityResume = true;
  if (input.source) {
    next.wakeSource = input.source;
  }
  if (input.triggerDetail) {
    next.wakeTriggerDetail = input.triggerDetail;
  }
  if (input.cooldownUntil) {
    next.postToolCapacityCooldownUntil = input.cooldownUntil;
  }
  return next;
}

export function buildPostToolCapacityResumeWakeMetadata(input: {
  source?: WakeupSource;
  triggerDetail?: WakeupOptions["triggerDetail"] | null;
}) {
  return {
    source: "automation" as const,
    triggerDetail: "system" as const,
    originalSource: input.source ?? null,
    originalTriggerDetail: input.triggerDetail ?? null,
  };
}

export function shouldRetryFailedPostToolCapacityWake(input: {
  wakeStatus: string | null | undefined;
  payload: unknown;
  runErrorCode: string | null | undefined;
  issueStatus: string | null | undefined;
  executionRunId?: string | null;
}) {
  if (input.wakeStatus !== "failed") return false;
  if (parseObject(input.payload).resumeKind !== "post_tool_capacity") {
    return false;
  }
  if (input.runErrorCode !== "process_lost") return false;
  if (input.executionRunId) return false;
  return typeof input.issueStatus === "string"
    ? shouldPromoteDeferredIssueExecution(input.issueStatus)
    : false;
}

export function resolvePostToolCapacityResumeSessionId(input: {
  resolvedSessionBefore: string | null;
  payload: unknown;
}) {
  return (
    input.resolvedSessionBefore ??
    readNonEmptyString(parseObject(input.payload).sessionId)
  );
}

export function resolveRunStartSessionIdBefore(input: {
  existingSessionIdBefore: string | null | undefined;
  runtimeSessionDisplayId: string | null | undefined;
  runtimeSessionId: string | null | undefined;
}) {
  return (
    input.runtimeSessionDisplayId ??
    input.runtimeSessionId ??
    input.existingSessionIdBefore ??
    null
  );
}

function buildPostToolCapacityResultJson(input: {
  baseResultJson: unknown;
  state: PostToolCapacityState;
  cooldownSec: number;
  cooldownUntil: string;
}) {
  const base = parseObject(input.baseResultJson);
  const resume = parseObject(base.resume);
  return {
    ...base,
    type: POST_TOOL_CAPACITY_ERROR_CODE,
    status: "cooldown_pending",
    result: "deferred",
    message:
      input.state.message ??
      "Model capacity exhausted after successful tool calls.",
    deferredState: {
      kind: "post_tool_capacity_cooldown",
      state: "cooldown_pending",
      issueId: input.state.issueId,
      childIssueCreated: false,
      parentDelegationPath: "active",
      nextResumePoint: "resume_existing_session_before_child_create",
      cooldownSec: input.cooldownSec,
      cooldownUntil: input.cooldownUntil,
      taskKey: input.state.taskKey,
    },
    resume: {
      ...resume,
      strategy: "reuse_session",
      state: "cooldown_pending",
      sessionId: input.state.sessionId,
      issueId: input.state.issueId,
      taskKey: input.state.taskKey,
      nextWakeStatus: POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS,
      nextWakeNotBefore: input.cooldownUntil,
    },
  };
}

function enrichWakeContextSnapshot(input: {
  contextSnapshot: Record<string, unknown>;
  reason: string | null;
  source: WakeupOptions["source"];
  triggerDetail: WakeupOptions["triggerDetail"] | null;
  payload: Record<string, unknown> | null;
}) {
  const { contextSnapshot, reason, source, triggerDetail, payload } = input;
  const issueIdFromPayload = readNonEmptyString(payload?.["issueId"]);
  const commentIdFromPayload = readNonEmptyString(payload?.["commentId"]);
  const taskKey = deriveTaskKey(contextSnapshot, payload);
  const workPacketId = deriveWorkPacketId(contextSnapshot, payload);
  const wakeCommentId = deriveCommentId(contextSnapshot, payload);

  if (!readNonEmptyString(contextSnapshot["wakeReason"]) && reason) {
    contextSnapshot.wakeReason = reason;
  }
  if (!readNonEmptyString(contextSnapshot["issueId"]) && issueIdFromPayload) {
    contextSnapshot.issueId = issueIdFromPayload;
  }
  if (!readNonEmptyString(contextSnapshot["taskId"]) && issueIdFromPayload) {
    contextSnapshot.taskId = issueIdFromPayload;
  }
  if (!readNonEmptyString(contextSnapshot["taskKey"]) && taskKey) {
    contextSnapshot.taskKey = taskKey;
  }
  if (!readNonEmptyString(contextSnapshot["workPacketId"]) && workPacketId) {
    contextSnapshot.workPacketId = workPacketId;
  }
  if (
    !readNonEmptyString(contextSnapshot["commentId"]) &&
    commentIdFromPayload
  ) {
    contextSnapshot.commentId = commentIdFromPayload;
  }
  if (!readNonEmptyString(contextSnapshot["wakeCommentId"]) && wakeCommentId) {
    contextSnapshot.wakeCommentId = wakeCommentId;
  }
  if (!readNonEmptyString(contextSnapshot["wakeSource"]) && source) {
    contextSnapshot.wakeSource = source;
  }
  if (
    !readNonEmptyString(contextSnapshot["wakeTriggerDetail"]) &&
    triggerDetail
  ) {
    contextSnapshot.wakeTriggerDetail = triggerDetail;
  }

  return {
    contextSnapshot,
    issueIdFromPayload,
    commentIdFromPayload,
    taskKey,
    workPacketId,
    wakeCommentId,
  };
}

function mergeCoalescedContextSnapshot(
  existingRaw: unknown,
  incoming: Record<string, unknown>,
) {
  const existing = parseObject(existingRaw);
  const merged: Record<string, unknown> = {
    ...existing,
    ...incoming,
  };
  const commentId = deriveCommentId(incoming, null);
  if (commentId) {
    merged.commentId = commentId;
    merged.wakeCommentId = commentId;
  }
  return merged;
}

function runTaskKey(run: typeof heartbeatRuns.$inferSelect) {
  return deriveTaskKey(
    run.contextSnapshot as Record<string, unknown> | null,
    null,
  );
}

function isSameTaskScope(left: string | null, right: string | null) {
  return (left ?? null) === (right ?? null);
}

function truncateDisplayId(value: string | null | undefined, max = 128) {
  return truncateDisplayIdSeam(value, max);
}

function normalizeAgentNameKey(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function getAdapterSessionCodec(adapterType: string) {
  return getAdapterSessionCodecSeam(adapterType);
}

function normalizeSessionParams(
  params: Record<string, unknown> | null | undefined,
) {
  return normalizeSessionParamsSeam(params);
}

function resolveNextSessionState(input: {
  codec: AdapterSessionCodec;
  adapterResult: AdapterExecutionResult;
  previousParams: Record<string, unknown> | null;
  previousDisplayId: string | null;
  previousLegacySessionId: string | null;
}) {
  return resolveNextSessionStateSeam(input);
}

export function heartbeatService(db: Db) {
  const runLogStore = getRunLogStore();
  const secretsSvc = secretService(db);
  const issuesSvc = issueService(db);
  const memorySvc = memoryService(db);
  const activeRunExecutions = new Set<string>();

  async function loadReviewTargetForIssue(input: {
    companyId: string;
    issueId: string;
    currentRunId: string;
  }): Promise<ReviewTargetPromptContext | null> {
    const candidates = await db
      .select({
        id: heartbeatRuns.id,
        agentId: heartbeatRuns.agentId,
        status: heartbeatRuns.status,
        finishedAt: heartbeatRuns.finishedAt,
        resultJson: heartbeatRuns.resultJson,
        stdoutExcerpt: heartbeatRuns.stdoutExcerpt,
        contextSnapshot: heartbeatRuns.contextSnapshot,
        agentName: agents.name,
      })
      .from(heartbeatRuns)
      .innerJoin(agents, eq(agents.id, heartbeatRuns.agentId))
      .where(
        and(
          eq(heartbeatRuns.companyId, input.companyId),
          sql`${heartbeatRuns.contextSnapshot} ->> 'issueId' = ${input.issueId}`,
          inArray(heartbeatRuns.status, [
            "succeeded",
            "failed",
            "timed_out",
            "cancelled",
            "blocked",
          ]),
        ),
      )
      .orderBy(desc(heartbeatRuns.finishedAt), desc(heartbeatRuns.updatedAt))
      .limit(12);

    const target =
      candidates.find((candidate) => {
        if (candidate.id === input.currentRunId) return false;
        const roleTemplate = parseObject(
          parseObject(candidate.contextSnapshot).paperclipRoleTemplate,
        );
        return (
          readNonEmptyString(roleTemplate.id)?.toLowerCase() !== "reviewer" &&
          candidate.status === "succeeded"
        );
      }) ??
      candidates.find((candidate) => {
        if (candidate.id === input.currentRunId) return false;
        const roleTemplate = parseObject(
          parseObject(candidate.contextSnapshot).paperclipRoleTemplate,
        );
        return readNonEmptyString(roleTemplate.id)?.toLowerCase() !== "reviewer";
      });

    if (!target) return null;

    const resultSummaryRecord = summarizeHeartbeatRunResultJson(
      parseObject(target.resultJson),
    );
    const targetStdoutExcerpt = readNonEmptyString(target.stdoutExcerpt);
    const targetContext = parseObject(target.contextSnapshot);
    const targetPreflight = parseObject(targetContext.paperclipRoutingPreflight);
    const targetSelected = parseObject(targetPreflight.selected);

    const evidenceRows = await db
      .select({
        payload: heartbeatRunEvents.payload,
      })
      .from(heartbeatRunEvents)
      .where(
        and(
          eq(heartbeatRunEvents.runId, target.id),
          eq(heartbeatRunEvents.eventType, "tool.evidence"),
        ),
      )
      .orderBy(asc(heartbeatRunEvents.seq));

    const readEvidencePaths = [
      ...new Set(
        evidenceRows
          .map((row) => {
            const payload = parseObject(row.payload);
            if (readNonEmptyString(payload.toolName) !== "read_file") {
              return null;
            }
            return readNonEmptyString(payload.path);
          })
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const handoffRows = await db
      .select({
        action: activityLog.action,
        details: activityLog.details,
        runId: activityLog.runId,
      })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.companyId, input.companyId),
          eq(activityLog.entityType, "issue"),
          eq(activityLog.entityId, input.issueId),
          inArray(activityLog.action, [
            "issue.worker_pull_request_created",
            "issue.worker_done_recorded",
          ]),
        ),
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(12);

    const parsedHandoffRows = handoffRows.map((row) => ({
      action: row.action,
      runId: row.runId,
      details: parseObject(row.details),
    }));
    const matchesTargetRun = (row: {
      runId: string | null;
      details: Record<string, unknown>;
    }) => row.runId === target.id || readNonEmptyString(row.details.apiRunId) === target.id;

    const workerDoneRow =
      parsedHandoffRows.find(
        (row) => row.action === "issue.worker_done_recorded" && matchesTargetRun(row),
      ) ??
      parsedHandoffRows.find(
        (row) => row.action === "issue.worker_done_recorded",
      ) ??
      null;
    const workerPrRow =
      parsedHandoffRows.find(
        (row) => row.action === "issue.worker_pull_request_created" && matchesTargetRun(row),
      ) ??
      parsedHandoffRows.find(
        (row) => row.action === "issue.worker_pull_request_created",
      ) ??
      null;

    const normalizedHandoff = normalizeReviewTargetWorkerHandoff({
      workerDoneDetails: workerDoneRow?.details ?? null,
      workerPrDetails: workerPrRow?.details ?? null,
      targetStdoutExcerpt,
      fallbackResultSummary:
        readNonEmptyString(resultSummaryRecord?.summary) ??
        readNonEmptyString(resultSummaryRecord?.result) ??
        readNonEmptyString(resultSummaryRecord?.message),
    });

    return {
      runId: target.id,
      agentId: target.agentId,
      agentName: target.agentName,
      status: target.status,
      finishedAt: target.finishedAt
        ? new Date(target.finishedAt).toISOString()
        : null,
      model:
        readNonEmptyString(targetSelected.effectiveModelLane) ??
        readNonEmptyString(parseObject(target.resultJson).model),
      resultSummary: normalizedHandoff.resultSummary,
      readEvidencePaths,
      artifactPaths: normalizedHandoff.artifactPaths,
      workerHandoff: normalizedHandoff.workerHandoff,
    };
  }

  async function maybeAdvanceIssueStatusAfterRun(
    run: typeof heartbeatRuns.$inferSelect,
  ) {
    const context = parseObject(run.contextSnapshot);
    const issueId = readNonEmptyString(context.issueId);
    if (!issueId) return null;

    const issue = await issuesSvc.getById(issueId);
    if (!issue || issue.companyId !== run.companyId) return null;

    const roleTemplateId = readAssignedRoleTemplateId(context);
    const transition = determineIssueStatusAfterRun({
      runStatus: run.status,
      issueStatus: issue.status,
      roleTemplateId,
      errorCode: run.errorCode,
      stdoutExcerpt: run.stdoutExcerpt,
    });
    if (!transition.nextStatus || transition.nextStatus === issue.status) {
      return null;
    }

    const updatedIssue = await issuesSvc.update(issue.id, {
      status: transition.nextStatus,
    });
    if (!updatedIssue) return null;

    const retriggerResult =
      transition.reason === "reviewer_accepted" &&
      transition.reviewerVerdict === "accepted"
        ? await retriggerCEOParentIssueAfterReviewerAcceptance(
            {
              childIssue: updatedIssue,
              reviewerRunId: run.id,
              reviewerAgentId: run.agentId,
              transitionReason: transition.reason,
              reviewerVerdict: transition.reviewerVerdict,
            },
            {
              getIssueById: (issueId) => issuesSvc.getById(issueId),
              getAgentById: getAgent,
              updateIssue: (issueId, patch) => issuesSvc.update(issueId, patch),
              wakeup: enqueueWakeup,
              recordActivity: (input) => logActivity(db, input),
            },
          )
        : null;

    await logActivity(db, {
      companyId: updatedIssue.companyId,
      actorType: "agent",
      actorId: run.agentId,
      agentId: run.agentId,
      runId: run.id,
      action: "issue.updated",
      entityType: "issue",
      entityId: updatedIssue.id,
        details: {
          identifier: updatedIssue.identifier,
          status: updatedIssue.status,
          autoTransition: true,
        transitionReason: transition.reason,
        roleTemplateId,
        reviewerVerdict: transition.reviewerVerdict,
        _previous: {
          status: issue.status,
        },
      },
    });

    return {
      issue: updatedIssue,
      previousStatus: issue.status,
      roleTemplateId,
      reviewerVerdict: transition.reviewerVerdict,
      reason: transition.reason,
      parentRetrigger: retriggerResult
        ? {
            parentIssueId: retriggerResult.parentIssue.id,
            parentAssigneeAgentId: retriggerResult.parentAssigneeAgentId,
            wakeupQueued: retriggerResult.wakeupQueued,
          }
        : null,
    };
  }

  async function getAgent(agentId: string) {
    return db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .then((rows) => rows[0] ?? null);
  }

  async function getRun(runId: string) {
    return db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, runId))
      .then((rows) => rows[0] ?? null);
  }

  async function getRuntimeState(agentId: string) {
    return db
      .select()
      .from(agentRuntimeState)
      .where(eq(agentRuntimeState.agentId, agentId))
      .then((rows) => rows[0] ?? null);
  }

  async function getTaskSession(
    companyId: string,
    agentId: string,
    adapterType: string,
    taskKey: string,
  ) {
    return db
      .select()
      .from(agentTaskSessions)
      .where(
        and(
          eq(agentTaskSessions.companyId, companyId),
          eq(agentTaskSessions.agentId, agentId),
          eq(agentTaskSessions.adapterType, adapterType),
          eq(agentTaskSessions.taskKey, taskKey),
        ),
      )
      .then((rows) => rows[0] ?? null);
  }

  async function getLatestRunForSession(
    agentId: string,
    sessionId: string,
    opts?: { excludeRunId?: string | null },
  ) {
    const conditions = [
      eq(heartbeatRuns.agentId, agentId),
      eq(heartbeatRuns.sessionIdAfter, sessionId),
    ];
    if (opts?.excludeRunId) {
      conditions.push(sql`${heartbeatRuns.id} <> ${opts.excludeRunId}`);
    }
    return db
      .select()
      .from(heartbeatRuns)
      .where(and(...conditions))
      .orderBy(desc(heartbeatRuns.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  async function getOldestRunForSession(agentId: string, sessionId: string) {
    return db
      .select({
        id: heartbeatRuns.id,
        createdAt: heartbeatRuns.createdAt,
      })
      .from(heartbeatRuns)
      .where(
        and(
          eq(heartbeatRuns.agentId, agentId),
          eq(heartbeatRuns.sessionIdAfter, sessionId),
        ),
      )
      .orderBy(asc(heartbeatRuns.createdAt), asc(heartbeatRuns.id))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  async function resolveNormalizedUsageForSession(input: {
    agentId: string;
    runId: string;
    sessionId: string | null;
    rawUsage: UsageTotals | null;
  }) {
    const { agentId, runId, sessionId, rawUsage } = input;
    if (!sessionId || !rawUsage) {
      return {
        normalizedUsage: rawUsage,
        previousRawUsage: null as UsageTotals | null,
        derivedFromSessionTotals: false,
      };
    }

    const previousRun = await getLatestRunForSession(agentId, sessionId, {
      excludeRunId: runId,
    });
    const previousRawUsage = readRawUsageTotals(previousRun?.usageJson);
    return {
      normalizedUsage: deriveNormalizedUsageDelta(rawUsage, previousRawUsage),
      previousRawUsage,
      derivedFromSessionTotals: previousRawUsage !== null,
    };
  }

  async function evaluateSessionCompaction(input: {
    agent: typeof agents.$inferSelect;
    sessionId: string | null;
    issueId: string | null;
  }): Promise<SessionCompactionDecision> {
    return evaluateSessionCompactionSeam({
      db,
      ...input,
    });
  }

  async function resolveSessionBeforeForWakeup(
    agent: typeof agents.$inferSelect,
    taskKey: string | null,
  ) {
    return resolveSessionBeforeForWakeupSeam(
      { agent, taskKey },
      {
        getTaskSession,
        getRuntimeState: async (agentId) => {
          const runtime = await getRuntimeState(agentId);
          return { sessionId: runtime?.sessionId ?? null };
        },
      },
    );
  }

  async function resolveWorkspaceForRun(
    agent: typeof agents.$inferSelect,
    context: Record<string, unknown>,
    previousSessionParams: Record<string, unknown> | null,
    opts?: { useProjectWorkspace?: boolean | null },
  ): Promise<ResolvedWorkspaceForRun> {
    return resolveWorkspaceForRunSeam({
      db,
      agent,
      context,
      previousSessionParams,
      useProjectWorkspace: opts?.useProjectWorkspace,
    });
  }

  async function upsertTaskSession(input: {
    companyId: string;
    agentId: string;
    adapterType: string;
    taskKey: string;
    sessionParamsJson: Record<string, unknown> | null;
    sessionDisplayId: string | null;
    lastRunId: string | null;
    lastError: string | null;
  }) {
    const existing = await getTaskSession(
      input.companyId,
      input.agentId,
      input.adapterType,
      input.taskKey,
    );
    if (existing) {
      return db
        .update(agentTaskSessions)
        .set({
          sessionParamsJson: input.sessionParamsJson,
          sessionDisplayId: input.sessionDisplayId,
          lastRunId: input.lastRunId,
          lastError: input.lastError,
          updatedAt: new Date(),
        })
        .where(eq(agentTaskSessions.id, existing.id))
        .returning()
        .then((rows) => rows[0] ?? null);
    }

    return db
      .insert(agentTaskSessions)
      .values({
        companyId: input.companyId,
        agentId: input.agentId,
        adapterType: input.adapterType,
        taskKey: input.taskKey,
        sessionParamsJson: input.sessionParamsJson,
        sessionDisplayId: input.sessionDisplayId,
        lastRunId: input.lastRunId,
        lastError: input.lastError,
      })
      .returning()
      .then((rows) => rows[0] ?? null);
  }

  async function clearTaskSessions(
    companyId: string,
    agentId: string,
    opts?: { taskKey?: string | null; adapterType?: string | null },
  ) {
    const conditions = [
      eq(agentTaskSessions.companyId, companyId),
      eq(agentTaskSessions.agentId, agentId),
    ];
    if (opts?.taskKey) {
      conditions.push(eq(agentTaskSessions.taskKey, opts.taskKey));
    }
    if (opts?.adapterType) {
      conditions.push(eq(agentTaskSessions.adapterType, opts.adapterType));
    }

    return db
      .delete(agentTaskSessions)
      .where(and(...conditions))
      .returning()
      .then((rows) => rows.length);
  }

  async function ensureRuntimeState(agent: typeof agents.$inferSelect) {
    const existing = await getRuntimeState(agent.id);
    if (existing) return existing;

    return db
      .insert(agentRuntimeState)
      .values({
        agentId: agent.id,
        companyId: agent.companyId,
        adapterType: agent.adapterType,
        stateJson: {},
      })
      .returning()
      .then((rows) => rows[0]);
  }

  async function persistRuntimeStatePatch(
    agentId: string,
    statePatch: Record<string, unknown>,
  ) {
    const existing = await getRuntimeState(agentId);
    const baseState = parseObject(existing?.stateJson);
    const patchControlPlane = parseObject(statePatch.controlPlane);
    const mergedState = {
      ...baseState,
      ...statePatch,
      ...(Object.keys(patchControlPlane).length > 0
        ? {
            controlPlane: {
              ...parseObject(baseState.controlPlane),
              ...patchControlPlane,
            },
          }
        : {}),
    };
    await db
      .update(agentRuntimeState)
      .set({
        stateJson: mergedState,
        updatedAt: new Date(),
      })
      .where(eq(agentRuntimeState.agentId, agentId));
  }

  async function setRunStatus(
    runId: string,
    status: string,
    patch?: Partial<typeof heartbeatRuns.$inferInsert>,
  ) {
    const buildUpdatePatch = () => ({
      status,
      ...patch,
      updatedAt: new Date(),
    });
    const updateStatus = (
      updatePatch: Partial<typeof heartbeatRuns.$inferInsert> & {
        status: string;
        updatedAt: Date;
      },
    ) => {
      return db
        .update(heartbeatRuns)
        .set(updatePatch)
        .where(eq(heartbeatRuns.id, runId))
        .returning()
        .then((rows) => rows[0] ?? null);
    };

    let updated;
    try {
      updated = await updateStatus(buildUpdatePatch());
    } catch (err) {
      if (!isLegacyDatabaseEncodingError(err)) {
        throw err;
      }

      const sanitizedPatch = sanitizeLegacyDatabaseValue(buildUpdatePatch());
      logger.warn(
        { err, runId, status },
        "heartbeat run status hit legacy database encoding limits; retrying with sanitized payload",
      );
      updated = await updateStatus(sanitizedPatch);
    }

    if (updated) {
      publishLiveEvent({
        companyId: updated.companyId,
        type: "heartbeat.run.status",
        payload: {
          runId: updated.id,
          agentId: updated.agentId,
          status: updated.status,
          invocationSource: updated.invocationSource,
          triggerDetail: updated.triggerDetail,
          error: updated.error ?? null,
          errorCode: updated.errorCode ?? null,
          startedAt: updated.startedAt
            ? new Date(updated.startedAt).toISOString()
            : null,
          finishedAt: updated.finishedAt
            ? new Date(updated.finishedAt).toISOString()
            : null,
        },
      });
    }

    return updated;
  }

  async function setWakeupStatus(
    wakeupRequestId: string | null | undefined,
    status: string,
    patch?: Partial<typeof agentWakeupRequests.$inferInsert>,
  ) {
    if (!wakeupRequestId) return;
    await db
      .update(agentWakeupRequests)
      .set({ status, ...patch, updatedAt: new Date() })
      .where(eq(agentWakeupRequests.id, wakeupRequestId));
  }

  async function appendRunEvent(
    run: typeof heartbeatRuns.$inferSelect,
    seq: number,
    event: {
      eventType: string;
      stream?: "system" | "stdout" | "stderr";
      level?: "info" | "warn" | "error";
      color?: string;
      message?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    const sanitizedMessage = event.message
      ? redactCurrentUserText(event.message)
      : event.message;
    const sanitizedPayload = event.payload
      ? redactCurrentUserValue(event.payload)
      : event.payload;

    await db.insert(heartbeatRunEvents).values({
      companyId: run.companyId,
      runId: run.id,
      agentId: run.agentId,
      seq,
      eventType: event.eventType,
      stream: event.stream,
      level: event.level,
      color: event.color,
      message: sanitizedMessage,
      payload: sanitizedPayload,
    });

    publishLiveEvent({
      companyId: run.companyId,
      type: "heartbeat.run.event",
      payload: {
        runId: run.id,
        agentId: run.agentId,
        seq,
        eventType: event.eventType,
        stream: event.stream ?? null,
        level: event.level ?? null,
        color: event.color ?? null,
        message: sanitizedMessage ?? null,
        payload: sanitizedPayload ?? null,
      },
    });
  }

  type ParsedHeartbeatPolicy = {
    enabled: boolean;
    intervalSec: number;
    wakeOnAssignment: boolean;
    wakeOnOnDemand: boolean;
    wakeOnAutomation: boolean;
    maxConcurrentRuns: number;
  };

  function parseHeartbeatPolicy(
    agent: typeof agents.$inferSelect,
  ): ParsedHeartbeatPolicy {
    const runtimeConfig = parseObject(agent.runtimeConfig);
    const heartbeat = parseObject(runtimeConfig.heartbeat);
    const legacyWakeOnDemand = asBoolean(heartbeat.wakeOnDemand, false);

    return {
      enabled: asBoolean(heartbeat.enabled, true),
      intervalSec: Math.max(0, asNumber(heartbeat.intervalSec, 0)),
      wakeOnAssignment: asBoolean(
        heartbeat.wakeOnAssignment,
        legacyWakeOnDemand,
      ),
      wakeOnOnDemand: asBoolean(
        heartbeat.wakeOnOnDemand,
        legacyWakeOnDemand,
      ),
      wakeOnAutomation: asBoolean(
        heartbeat.wakeOnAutomation,
        legacyWakeOnDemand,
      ),
      maxConcurrentRuns: normalizeMaxConcurrentRuns(
        heartbeat.maxConcurrentRuns,
      ),
    };
  }

  function resolveWakeupDisabledReason(
    source: WakeupSource | undefined,
  ): string {
    if (source === "timer") return "heartbeat.disabled";
    if (source === "assignment") return "heartbeat.wakeOnAssignment.disabled";
    if (source === "automation") return "heartbeat.wakeOnAutomation.disabled";
    return "heartbeat.wakeOnOnDemand.disabled";
  }

  function isWakeSourceEnabled(
    policy: Pick<
      ParsedHeartbeatPolicy,
      "enabled" | "wakeOnAssignment" | "wakeOnOnDemand" | "wakeOnAutomation"
    >,
    source: WakeupSource | undefined,
  ) {
    if (source === "timer") return policy.enabled;
    if (source === "assignment") return policy.wakeOnAssignment;
    if (source === "automation") return policy.wakeOnAutomation;
    return policy.wakeOnOnDemand;
  }

  async function countRunningRunsForAgent(agentId: string) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(heartbeatRuns)
      .where(
        and(
          eq(heartbeatRuns.agentId, agentId),
          inArray(heartbeatRuns.status, ["running", "recovering"]),
        ),
      );
    return Number(count ?? 0);
  }

  async function claimQueuedRun(run: typeof heartbeatRuns.$inferSelect) {
    if (run.status !== "queued") return run;
    const claimedAt = new Date();
    const claimed = await db
      .update(heartbeatRuns)
      .set({
        status: "running",
        startedAt: run.startedAt ?? claimedAt,
        updatedAt: claimedAt,
      })
      .where(
        and(eq(heartbeatRuns.id, run.id), eq(heartbeatRuns.status, "queued")),
      )
      .returning()
      .then((rows) => rows[0] ?? null);
    if (!claimed) return null;

    publishLiveEvent({
      companyId: claimed.companyId,
      type: "heartbeat.run.status",
      payload: {
        runId: claimed.id,
        agentId: claimed.agentId,
        status: claimed.status,
        invocationSource: claimed.invocationSource,
        triggerDetail: claimed.triggerDetail,
        error: claimed.error ?? null,
        errorCode: claimed.errorCode ?? null,
        startedAt: claimed.startedAt
          ? new Date(claimed.startedAt).toISOString()
          : null,
        finishedAt: claimed.finishedAt
          ? new Date(claimed.finishedAt).toISOString()
          : null,
      },
    });

    await setWakeupStatus(claimed.wakeupRequestId, "claimed", { claimedAt });
    return claimed;
  }

  async function finalizeAgentStatus(
    agentId: string,
    outcome: AgentFinalizationOutcome,
    opts?: { errorCode?: string | null },
  ) {
    await finalizeHeartbeatAgentStatus(
      {
        agentId,
        outcome,
        errorCode: opts?.errorCode ?? null,
      },
      {
        getAgent,
        countRunningRunsForAgent,
        updateAgentStatus: async (targetAgentId, nextStatus) =>
          db
            .update(agents)
            .set({
              status: nextStatus,
              lastHeartbeatAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(agents.id, targetAgentId))
            .returning()
            .then((rows) => rows[0] ?? null),
        publishAgentStatus: (statusUpdate) => {
          publishLiveEvent({
            companyId: statusUpdate.companyId,
            type: "agent.status",
            payload: {
              agentId: statusUpdate.agentId,
              status: statusUpdate.status,
              lastHeartbeatAt: statusUpdate.lastHeartbeatAt
                ? new Date(statusUpdate.lastHeartbeatAt).toISOString()
                : null,
              outcome: statusUpdate.outcome,
            },
          });
        },
      },
    );
  }

  async function reapOrphanedRuns(opts?: {
    staleThresholdMs?: number;
    recoveringGracePeriodMs?: number;
  }) {
    const staleThresholdMs = opts?.staleThresholdMs ?? 0;
    const recoveringGracePeriodMs =
      opts?.recoveringGracePeriodMs ?? 5 * 60 * 1000;
    const now = new Date();

    // Phase 1: transition orphaned "running" runs to "recovering".
    // At startup the in-memory execution maps are empty, so every DB-persisted
    // "running" run is a candidate. Instead of failing them immediately we give
    // them a grace period — this prevents dev-server hot-reloads from destroying
    // in-flight runs before the finalization path can run.
    const runningRuns = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.status, "running"));

    const transitioned: string[] = [];

    for (const run of runningRuns) {
      if (runningProcesses.has(run.id) || activeRunExecutions.has(run.id))
        continue;

      // Apply staleness threshold to avoid touching recently-started runs on periodic checks
      if (staleThresholdMs > 0) {
        const refTime = run.updatedAt ? new Date(run.updatedAt).getTime() : 0;
        if (now.getTime() - refTime < staleThresholdMs) continue;
      }

      await setRunStatus(run.id, "recovering", {});
      const updatedRun = await getRun(run.id);
      if (updatedRun) {
        await appendRunEvent(updatedRun, 1, {
          eventType: "lifecycle",
          stream: "system",
          level: "warn",
          message: "Server restarted — run entered recovery period",
        });
      }
      runningProcesses.delete(run.id);
      transitioned.push(run.id);
    }

    if (transitioned.length > 0) {
      logger.warn(
        { count: transitioned.length, runIds: transitioned },
        "orphaned running runs transitioned to recovering",
      );
    }

    // Phase 2: finalize "recovering" runs whose grace period has expired.
    // These had no process reattach within the window — they are truly lost.
    const recoveringRuns = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.status, "recovering"));

    const reaped: string[] = [];

    for (const run of recoveringRuns) {
      const refTime = run.updatedAt ? new Date(run.updatedAt).getTime() : 0;
      if (now.getTime() - refTime < recoveringGracePeriodMs) continue;

      await setRunStatus(run.id, "failed", {
        error: "Process lost -- server may have restarted",
        errorCode: "process_lost",
        finishedAt: now,
      });
      await setWakeupStatus(run.wakeupRequestId, "failed", {
        finishedAt: now,
        error: "Process lost -- server may have restarted",
      });
      const updatedRun = await getRun(run.id);
      if (updatedRun) {
        await appendRunEvent(updatedRun, 1, {
          eventType: "lifecycle",
          stream: "system",
          level: "error",
          message: "Process lost -- server may have restarted",
        });
        await releaseIssueExecutionAndPromote(updatedRun);
      }
      await finalizeAgentStatus(run.agentId, "failed", {
        errorCode: "process_lost",
      });
      await startNextQueuedRunForAgent(run.agentId);
      reaped.push(run.id);
    }

    if (reaped.length > 0) {
      logger.warn(
        { reapedCount: reaped.length, runIds: reaped },
        "reaped orphaned heartbeat runs",
      );
    }
    return { reaped: reaped.length, runIds: reaped };
  }

  async function promoteDuePostToolCapacityWakeups(now = new Date()) {
    const deferredWakeups = await db
      .select()
      .from(agentWakeupRequests)
      .where(eq(agentWakeupRequests.status, POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS))
      .orderBy(asc(agentWakeupRequests.requestedAt));

    for (const deferred of deferredWakeups) {
      if (!isPostToolCapacityWakeReady(deferred.payload, now)) continue;

      const promotedRun = await db.transaction(async (tx) => {
        const liveDeferred = await tx
          .select()
          .from(agentWakeupRequests)
          .where(eq(agentWakeupRequests.id, deferred.id))
          .then((rows) => rows[0] ?? null);
        if (
          !liveDeferred ||
          liveDeferred.status !== POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS ||
          !isPostToolCapacityWakeReady(liveDeferred.payload, now)
        ) {
          return null;
        }

        const payload = parseObject(liveDeferred.payload);
        const issueId = readNonEmptyString(payload.issueId);
        if (!issueId) {
          await tx
            .update(agentWakeupRequests)
            .set({
              status: "failed",
              finishedAt: now,
              error: "Deferred capacity wake missing issueId",
              updatedAt: now,
            })
            .where(eq(agentWakeupRequests.id, liveDeferred.id));
          return null;
        }

        const deferredAgent = await tx
          .select()
          .from(agents)
          .where(eq(agents.id, liveDeferred.agentId))
          .then((rows) => rows[0] ?? null);
        if (
          !deferredAgent ||
          deferredAgent.companyId !== liveDeferred.companyId ||
          deferredAgent.status === "paused" ||
          deferredAgent.status === "terminated" ||
          deferredAgent.status === "pending_approval"
        ) {
          await tx
            .update(agentWakeupRequests)
            .set({
              status: "failed",
              finishedAt: now,
              error:
                "Deferred capacity wake could not be promoted: agent is not invokable",
              updatedAt: now,
            })
            .where(eq(agentWakeupRequests.id, liveDeferred.id));
          return null;
        }

        const issue = await tx
          .select({
            id: issues.id,
            companyId: issues.companyId,
            status: issues.status,
            executionRunId: issues.executionRunId,
          })
          .from(issues)
          .where(
            and(eq(issues.id, issueId), eq(issues.companyId, deferredAgent.companyId)),
          )
          .then((rows) => rows[0] ?? null);
        if (!issue) {
          await tx
            .update(agentWakeupRequests)
            .set({
              status: "failed",
              finishedAt: now,
              error: "Deferred capacity wake issue not found",
              updatedAt: now,
            })
            .where(eq(agentWakeupRequests.id, liveDeferred.id));
          return null;
        }
        if (!shouldPromoteDeferredIssueExecution(issue.status)) {
          await tx
            .update(agentWakeupRequests)
            .set({
              status: "failed",
              finishedAt: now,
              error: `Deferred capacity wake skipped: issue is ${issue.status}`,
              updatedAt: now,
            })
            .where(eq(agentWakeupRequests.id, liveDeferred.id));
          return null;
        }
        if (issue.executionRunId) {
          return null;
        }

        const deferredContextSeed = parseObject(payload[DEFERRED_WAKE_CONTEXT_KEY]);
        const promotedPayload = { ...payload };
        delete promotedPayload[DEFERRED_WAKE_CONTEXT_KEY];
        const promotedReason =
          readNonEmptyString(liveDeferred.reason) ?? "post_tool_capacity_resume";
        const promotedSource =
          (readNonEmptyString(liveDeferred.source) as WakeupOptions["source"]) ??
          "automation";
        const promotedTriggerDetail =
          (readNonEmptyString(
            liveDeferred.triggerDetail,
          ) as WakeupOptions["triggerDetail"]) ?? null;
        const {
          contextSnapshot: promotedContextSnapshot,
          taskKey: promotedTaskKey,
        } = enrichWakeContextSnapshot({
          contextSnapshot: deferredContextSeed,
          reason: promotedReason,
          source: promotedSource,
          triggerDetail: promotedTriggerDetail,
          payload: promotedPayload,
        });
        const sessionBefore = resolvePostToolCapacityResumeSessionId({
          resolvedSessionBefore: await resolveSessionBeforeForWakeup(
            deferredAgent,
            promotedTaskKey,
          ),
          payload,
        });
        const newRun = await tx
          .insert(heartbeatRuns)
          .values({
            companyId: deferredAgent.companyId,
            agentId: deferredAgent.id,
            invocationSource: promotedSource,
            triggerDetail: promotedTriggerDetail,
            status: "queued",
            wakeupRequestId: liveDeferred.id,
            contextSnapshot: promotedContextSnapshot,
            sessionIdBefore: sessionBefore,
          })
          .returning()
          .then((rows) => rows[0]);

        await tx
          .update(agentWakeupRequests)
          .set({
            status: "queued",
            reason: "post_tool_capacity_resume",
            runId: newRun.id,
            claimedAt: null,
            finishedAt: null,
            error: null,
            updatedAt: now,
          })
          .where(eq(agentWakeupRequests.id, liveDeferred.id));

        await tx
          .update(issues)
          .set({
            executionRunId: newRun.id,
            executionAgentNameKey: normalizeAgentNameKey(deferredAgent.name),
            executionLockedAt: now,
            updatedAt: now,
          })
          .where(eq(issues.id, issue.id));

        return newRun;
      });

      if (!promotedRun) continue;
      publishLiveEvent({
        companyId: promotedRun.companyId,
        type: "heartbeat.run.queued",
        payload: {
          runId: promotedRun.id,
          agentId: promotedRun.agentId,
          invocationSource: promotedRun.invocationSource,
          triggerDetail: promotedRun.triggerDetail,
          wakeupRequestId: promotedRun.wakeupRequestId,
        },
      });
    }
  }

  async function repairFailedPostToolCapacityWakeups(now = new Date()) {
    const failedWakeups = await db
      .select()
      .from(agentWakeupRequests)
      .where(eq(agentWakeupRequests.status, "failed"))
      .orderBy(desc(agentWakeupRequests.updatedAt));

    for (const failedWake of failedWakeups) {
      const payload = parseObject(failedWake.payload);
      const issueId = readNonEmptyString(payload.issueId);
      if (!issueId) continue;

      const failedRun = failedWake.runId
        ? await db
            .select({
              errorCode: heartbeatRuns.errorCode,
            })
            .from(heartbeatRuns)
            .where(eq(heartbeatRuns.id, failedWake.runId))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : null;
      const issue = await db
        .select({
          id: issues.id,
          status: issues.status,
          executionRunId: issues.executionRunId,
        })
        .from(issues)
        .where(eq(issues.id, issueId))
        .limit(1)
        .then((rows) => rows[0] ?? null);
      if (!issue) continue;

      if (
        !shouldRetryFailedPostToolCapacityWake({
          wakeStatus: failedWake.status,
          payload,
          runErrorCode: failedRun?.errorCode ?? null,
          issueStatus: issue.status,
          executionRunId: issue.executionRunId,
        })
      ) {
        continue;
      }

      const competingWake = await db
        .select({ id: agentWakeupRequests.id })
        .from(agentWakeupRequests)
        .where(
          and(
            eq(agentWakeupRequests.companyId, failedWake.companyId),
            eq(agentWakeupRequests.agentId, failedWake.agentId),
            inArray(agentWakeupRequests.status, [
              "queued",
              "claimed",
              POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS,
            ]),
            sql`${agentWakeupRequests.payload} ->> 'issueId' = ${issueId}`,
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null);
      if (competingWake) continue;

      const resumeWake = buildPostToolCapacityResumeWakeMetadata({
        source:
          (readNonEmptyString(failedWake.source) as WakeupSource | undefined) ??
          undefined,
        triggerDetail:
          (readNonEmptyString(
            failedWake.triggerDetail,
          ) as WakeupOptions["triggerDetail"] | null) ?? null,
      });
      const repairedContextSnapshot = buildPostToolCapacityDeferredContextSnapshot(
        {
          contextSnapshot: parseObject(payload[DEFERRED_WAKE_CONTEXT_KEY]),
          source: resumeWake.source,
          triggerDetail: resumeWake.triggerDetail,
          cooldownUntil: readNonEmptyString(payload.notBefore),
        },
      );

      await db
        .update(agentWakeupRequests)
        .set({
          status: POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS,
          source: resumeWake.source,
          triggerDetail: resumeWake.triggerDetail,
          reason: "post_tool_capacity_cooldown",
          payload: {
            ...payload,
            originalWakeSource:
              readNonEmptyString(payload.originalWakeSource) ??
              resumeWake.originalSource,
            originalWakeTriggerDetail:
              readNonEmptyString(payload.originalWakeTriggerDetail) ??
              resumeWake.originalTriggerDetail,
            [DEFERRED_WAKE_CONTEXT_KEY]: repairedContextSnapshot,
          },
          runId: null,
          claimedAt: null,
          finishedAt: null,
          error: null,
          updatedAt: now,
        })
        .where(eq(agentWakeupRequests.id, failedWake.id));
    }
  }

  async function resumeQueuedRuns() {
    await repairFailedPostToolCapacityWakeups();
    await promoteDuePostToolCapacityWakeups();

    const queuedRuns = await db
      .select({ agentId: heartbeatRuns.agentId })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.status, "queued"));

    const agentIds = [...new Set(queuedRuns.map((r) => r.agentId))];
    for (const agentId of agentIds) {
      await startNextQueuedRunForAgent(agentId);
    }
  }

  async function schedulePostToolCapacityResume(input: {
    run: typeof heartbeatRuns.$inferSelect;
    agent: typeof agents.$inferSelect;
    issueId: string;
    contextSnapshot: Record<string, unknown>;
    source: WakeupSource | undefined;
    triggerDetail: WakeupOptions["triggerDetail"] | null;
    cooldownUntil: string;
    cooldownSec: number;
    state: PostToolCapacityState;
  }) {
    const resumeWake = buildPostToolCapacityResumeWakeMetadata({
      source: input.source,
      triggerDetail: input.triggerDetail,
    });
    const deferredContextSnapshot = buildPostToolCapacityDeferredContextSnapshot(
      {
        contextSnapshot: input.contextSnapshot,
        source: resumeWake.source,
        triggerDetail: resumeWake.triggerDetail,
        cooldownUntil: input.cooldownUntil,
      },
    );
    const deferredPayload = {
      issueId: input.issueId,
      resumeKind: "post_tool_capacity",
      notBefore: input.cooldownUntil,
      cooldownSec: input.cooldownSec,
      deferredFromRunId: input.run.id,
      sessionId: input.state.sessionId,
      toolCallCount: input.state.toolCallCount,
      successfulToolResultCount: input.state.successfulToolResultCount,
      failedToolResultCount: input.state.failedToolResultCount,
      firstSuccessfulToolName: input.state.firstSuccessfulToolName,
      lastSuccessfulToolName: input.state.lastSuccessfulToolName,
      originalWakeSource: resumeWake.originalSource,
      originalWakeTriggerDetail: resumeWake.originalTriggerDetail,
      [DEFERRED_WAKE_CONTEXT_KEY]: deferredContextSnapshot,
    };

    const existingDeferred = await db
      .select()
      .from(agentWakeupRequests)
      .where(
        and(
          eq(agentWakeupRequests.companyId, input.agent.companyId),
          eq(agentWakeupRequests.agentId, input.agent.id),
          eq(
            agentWakeupRequests.status,
            POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS,
          ),
          sql`${agentWakeupRequests.payload} ->> 'issueId' = ${input.issueId}`,
        ),
      )
      .orderBy(asc(agentWakeupRequests.requestedAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (existingDeferred) {
      await db
        .update(agentWakeupRequests)
        .set({
          source: resumeWake.source,
          triggerDetail: resumeWake.triggerDetail,
          reason: "post_tool_capacity_cooldown",
          payload: {
            ...parseObject(existingDeferred.payload),
            ...deferredPayload,
          },
          coalescedCount: (existingDeferred.coalescedCount ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(agentWakeupRequests.id, existingDeferred.id));
      return existingDeferred.id;
    }

    const created = await db
      .insert(agentWakeupRequests)
      .values({
        companyId: input.agent.companyId,
        agentId: input.agent.id,
        source: resumeWake.source,
        triggerDetail: resumeWake.triggerDetail,
        reason: "post_tool_capacity_cooldown",
        payload: deferredPayload,
        status: POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS,
      })
      .returning()
      .then((rows) => rows[0] ?? null);
    return created?.id ?? null;
  }

  async function updateRuntimeState(
    agent: typeof agents.$inferSelect,
    run: typeof heartbeatRuns.$inferSelect,
    result: AdapterExecutionResult,
    session: { legacySessionId: string | null },
    normalizedUsage?: UsageTotals | null,
    runtimeStatePatch?: Record<string, unknown> | null,
  ) {
    const ensuredState = await ensureRuntimeState(agent);
    const usage = normalizedUsage ?? normalizeUsageTotals(result.usage);
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;
    const cachedInputTokens = usage?.cachedInputTokens ?? 0;
    const additionalCostCents = Math.max(
      0,
      Math.round((result.costUsd ?? 0) * 100),
    );
    const hasTokenUsage =
      inputTokens > 0 || outputTokens > 0 || cachedInputTokens > 0;

    const nextStateJson = runtimeStatePatch
      ? {
          ...parseObject(ensuredState.stateJson),
          ...runtimeStatePatch,
        }
      : ensuredState.stateJson;

    await db
      .update(agentRuntimeState)
      .set({
        adapterType: agent.adapterType,
        stateJson: nextStateJson,
        sessionId: session.legacySessionId,
        lastRunId: run.id,
        lastRunStatus: run.status,
        lastError: result.errorMessage ?? null,
        totalInputTokens: sql`${agentRuntimeState.totalInputTokens} + ${inputTokens}`,
        totalOutputTokens: sql`${agentRuntimeState.totalOutputTokens} + ${outputTokens}`,
        totalCachedInputTokens: sql`${agentRuntimeState.totalCachedInputTokens} + ${cachedInputTokens}`,
        totalCostCents: sql`${agentRuntimeState.totalCostCents} + ${additionalCostCents}`,
        updatedAt: new Date(),
      })
      .where(eq(agentRuntimeState.agentId, agent.id));

    if (additionalCostCents > 0 || hasTokenUsage) {
      const costs = costService(db);
      await costs.createEvent(agent.companyId, {
        agentId: agent.id,
        provider: result.provider ?? "unknown",
        model: result.model ?? "unknown",
        inputTokens,
        outputTokens,
        costCents: additionalCostCents,
        occurredAt: new Date(),
      });
    }
  }

  async function startNextQueuedRunForAgent(agentId: string) {
    return withAgentStartLock(agentId, async () => {
      const agent = await getAgent(agentId);
      if (!agent) return [];
      const policy = parseHeartbeatPolicy(agent);
      const runningCount = await countRunningRunsForAgent(agentId);
      const availableSlots = Math.max(
        0,
        policy.maxConcurrentRuns - runningCount,
      );
      if (availableSlots <= 0) return [];

      const queuedRuns = await db
        .select()
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.agentId, agentId),
            eq(heartbeatRuns.status, "queued"),
          ),
        )
        .orderBy(asc(heartbeatRuns.createdAt))
        .limit(availableSlots);
      if (queuedRuns.length === 0) return [];

      const claimedRuns: Array<typeof heartbeatRuns.$inferSelect> = [];
      for (const queuedRun of queuedRuns) {
        const claimed = await claimQueuedRun(queuedRun);
        if (claimed) claimedRuns.push(claimed);
      }
      if (claimedRuns.length === 0) return [];

      for (const claimedRun of claimedRuns) {
        void executeRun(claimedRun.id).catch((err) => {
          logger.error(
            { err, runId: claimedRun.id },
            "queued heartbeat execution failed",
          );
        });
      }
      return claimedRuns;
    });
  }

  async function executeRun(runId: string) {
    let run = await getRun(runId);
    if (!run) return;
    if (run.status !== "queued" && run.status !== "running") return;

    if (run.status === "queued") {
      const claimed = await claimQueuedRun(run);
      if (!claimed) {
        // Another worker has already claimed or finalized this run.
        return;
      }
      run = claimed;
    }

    activeRunExecutions.add(run.id);
    let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
    let keepaliveInFlight = false;
    let lastRunTouchAt = Date.now();

    const stopKeepalive = () => {
      if (!keepaliveTimer) return;
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    };

    const touchRunKeepalive = async () => {
      const nowMs = Date.now();
      if (nowMs - lastRunTouchAt < RUN_KEEPALIVE_MIN_TOUCH_AGE_MS) return;
      await db
        .update(heartbeatRuns)
        .set({ updatedAt: new Date() })
        .where(eq(heartbeatRuns.id, run.id));
      lastRunTouchAt = nowMs;
    };

    try {
      const agent = await getAgent(run.agentId);
      if (!agent) {
        await setRunStatus(runId, "failed", {
          error: "Agent not found",
          errorCode: "agent_not_found",
          finishedAt: new Date(),
        });
        await setWakeupStatus(run.wakeupRequestId, "failed", {
          finishedAt: new Date(),
          error: "Agent not found",
        });
        const failedRun = await getRun(runId);
        if (failedRun) await releaseIssueExecutionAndPromote(failedRun);
        return;
      }

      const runtime = await ensureRuntimeState(agent);
      const context = parseObject(run.contextSnapshot);
      const taskKey = deriveTaskKey(context, null);
      if (isPhaseBExecution(context) && !hasPhaseBCheckpointApproval(context)) {
        const message =
          "Phase B execution blocked: missing phase checkpoint approval";
        await setRunStatus(run.id, "failed", {
          error: message,
          errorCode: "phase_checkpoint_required",
          finishedAt: new Date(),
        });
        await setWakeupStatus(run.wakeupRequestId, "failed", {
          finishedAt: new Date(),
          error: message,
        });
        const failedRun = await getRun(run.id);
        if (failedRun) {
          await appendRunEvent(failedRun, 1, {
            eventType: "lifecycle",
            stream: "system",
            level: "error",
            message,
          });
          await releaseIssueExecutionAndPromote(failedRun);
        }
        await finalizeAgentStatus(agent.id, "failed");
        return;
      }
      // Heartbeat Gate: no run without an assigned issue.
      // Per DGDH operating model: a heartbeat is an execution slice for one
      // authorized work packet — not a generic autonomy loop.
      // Exception: approval follow-ups (wakeReason="approval_approved") carry
      // their own packet context via the approval record and are allowed through.
      const gateIssueId = readNonEmptyString(context.issueId);
      const gateWakeReason = readNonEmptyString(context.wakeReason);
      if (!gateIssueId && gateWakeReason !== "approval_approved") {
        const isTimerSource = run.invocationSource === "timer";
        const gateMessage = isTimerSource
          ? "Heartbeat gate: timer wake with no assigned issue — agent is idle."
          : "Heartbeat gate: no issue assigned. Assign an issue before waking the agent.";
        const gatedRun = await getRun(run.id);
        if (gatedRun) {
          await appendRunEvent(gatedRun, 1, {
            eventType: "lifecycle",
            stream: "system",
            level: isTimerSource ? "info" : "warn",
            message: gateMessage,
          });
        }
        if (isTimerSource) {
          // Timer with no work: quietly cancel, agent stays idle.
          await setRunStatus(run.id, "cancelled", {
            error: gateMessage,
            errorCode: "no_assigned_issue",
            finishedAt: new Date(),
          });
          await setWakeupStatus(run.wakeupRequestId, "cancelled", {
            finishedAt: new Date(),
            error: gateMessage,
          });
          await finalizeAgentStatus(agent.id, "cancelled");
        } else {
          // Non-timer wake without issue: policy stop — operator must assign an issue first.
          await setRunStatus(run.id, "blocked", {
            error: gateMessage,
            errorCode: "no_assigned_issue",
            finishedAt: new Date(),
          });
          await setWakeupStatus(run.wakeupRequestId, "blocked", {
            finishedAt: new Date(),
            error: gateMessage,
          });
          await finalizeAgentStatus(agent.id, "blocked");
        }
        return;
      }

      const sessionCodec = getAdapterSessionCodec(agent.adapterType);
      const issueId = readNonEmptyString(context.issueId);
      const issueAssigneeConfig = issueId
        ? await db
            .select({
              projectId: issues.projectId,
              assigneeAgentId: issues.assigneeAgentId,
              assigneeAdapterOverrides: issues.assigneeAdapterOverrides,
              executionWorkspaceSettings: issues.executionWorkspaceSettings,
            })
            .from(issues)
            .where(
              and(
                eq(issues.id, issueId),
                eq(issues.companyId, agent.companyId),
              ),
            )
            .then((rows) => rows[0] ?? null)
        : null;
      const issueAssigneeOverrides =
        issueAssigneeConfig && issueAssigneeConfig.assigneeAgentId === agent.id
          ? parseIssueAssigneeAdapterOverrides(
              issueAssigneeConfig.assigneeAdapterOverrides,
            )
          : null;
      const issueExecutionWorkspaceSettings =
        parseIssueExecutionWorkspaceSettings(
          issueAssigneeConfig?.executionWorkspaceSettings,
        );
      const contextProjectId = readNonEmptyString(context.projectId);
      const executionProjectId =
        issueAssigneeConfig?.projectId ?? contextProjectId;
      try {
        const memoryContext = await memorySvc.hydrateRunContext({
          companyId: agent.companyId,
          agentId: agent.id,
          projectId: executionProjectId,
          text: issueId ?? readNonEmptyString(context.taskKey) ?? "",
        });
        context.paperclipMemory = memorySvc.asReflectionOutput(memoryContext);
      } catch (err) {
        logger.warn(
          {
            err,
            companyId: agent.companyId,
            agentId: agent.id,
            runId: run.id,
          },
          "Failed to hydrate memory context for heartbeat run",
        );
      }
      const projectExecutionWorkspacePolicy = executionProjectId
        ? await db
            .select({
              executionWorkspacePolicy: projects.executionWorkspacePolicy,
            })
            .from(projects)
            .where(
              and(
                eq(projects.id, executionProjectId),
                eq(projects.companyId, agent.companyId),
              ),
            )
            .then((rows) =>
              parseProjectExecutionWorkspacePolicy(
                rows[0]?.executionWorkspacePolicy,
              ),
            )
        : null;
      const taskSession = taskKey
        ? await getTaskSession(
            agent.companyId,
            agent.id,
            agent.adapterType,
            taskKey,
          )
        : null;
      const resetTaskSession = shouldResetTaskSessionForWake(context);
      const taskSessionForRun = resetTaskSession ? null : taskSession;
      const previousSessionParams = normalizeSessionParams(
        sessionCodec.deserialize(taskSessionForRun?.sessionParamsJson ?? null),
      );
      const config = parseObject(agent.adapterConfig);
      const executionWorkspaceMode = resolveExecutionWorkspaceMode({
        projectPolicy: projectExecutionWorkspacePolicy,
        issueSettings: issueExecutionWorkspaceSettings,
        legacyUseProjectWorkspace:
          issueAssigneeOverrides?.useProjectWorkspace ?? null,
      });
      const resolvedWorkspace = await resolveWorkspaceForRun(
        agent,
        context,
        previousSessionParams,
        { useProjectWorkspace: executionWorkspaceMode !== "agent_default" },
      );
      const workspaceManagedConfig = buildExecutionWorkspaceAdapterConfig({
        agentConfig: config,
        projectPolicy: projectExecutionWorkspacePolicy,
        issueSettings: issueExecutionWorkspaceSettings,
        mode: executionWorkspaceMode,
        legacyUseProjectWorkspace:
          issueAssigneeOverrides?.useProjectWorkspace ?? null,
      });
      const mergedConfig = issueAssigneeOverrides?.adapterConfig
        ? { ...workspaceManagedConfig, ...issueAssigneeOverrides.adapterConfig }
        : workspaceManagedConfig;
      const { config: configWithSecrets, secretKeys } =
        await secretsSvc.resolveAdapterConfigForRuntime(
          agent.companyId,
          mergedConfig,
        );
      const resolvedConfig = { ...configWithSecrets };
      const roleTemplateResolution = resolveAssignedRoleTemplate(resolvedConfig);
      delete context.agentRole;
      delete context.roleName;
      delete context.paperclipRoleTemplate;
      delete context.paperclipRoleTemplatePrompt;
      delete context.paperclipRoleTemplateError;
      const issueRef = issueId
        ? await db
            .select({
              id: issues.id,
              companyId: issues.companyId,
              projectId: issues.projectId,
              goalId: issues.goalId,
              parentId: issues.parentId,
              identifier: issues.identifier,
              title: issues.title,
              description: issues.description,
            })
            .from(issues)
            .where(
              and(
                eq(issues.id, issueId),
                eq(issues.companyId, agent.companyId),
              ),
            )
            .then((rows) => rows[0] ?? null)
        : null;
      applyHeartbeatContextPatch(
        context,
        buildHeartbeatIssuePromptContextPatch({
          contextSnapshot: context,
          issue: issueRef,
        }),
      );
      if (roleTemplateResolution.assigned?.template.id === "reviewer" && issueRef) {
        const reviewTarget = await loadReviewTargetForIssue({
          companyId: agent.companyId,
          issueId: issueRef.id,
          currentRunId: run.id,
        });
        applyHeartbeatContextPatch(
          context,
          buildHeartbeatReviewerPromptContextPatch({
            contextSnapshot: context,
            issue: issueRef,
            reviewTarget,
          }),
        );
      }

      let runtimeConfigForRouting = parseObject(agent.runtimeConfig);
      let runtimeStateForRouting = parseObject(runtime.stateJson);

      // For gemini_local agents, inject live quota data from the API before
      // the preflight refresh so the control plane sees fresh usage percentages.
      if (agent.adapterType === "gemini_local") {
        const liveQuota = await fetchLiveGeminiQuota().catch(() => null);
        if (liveQuota && Object.keys(liveQuota.buckets).length > 0) {
          logger.info(
            {
              snapshotAt: liveQuota.snapshotAt,
              buckets: Object.fromEntries(
                Object.entries(liveQuota.buckets).map(([k, v]) => [
                  k,
                  { usagePercent: v?.usagePercent, state: v?.state, resetAt: v?.resetAt },
                ]),
              ),
            },
            "[paperclip:quota-api] live quota injected",
          );
          const routing = parseObject(
            runtimeConfigForRouting.routingPolicy,
          );
          runtimeConfigForRouting = {
            ...runtimeConfigForRouting,
            routingPolicy: {
              ...routing,
              quotaFeed: {
                ...parseObject(routing.quotaFeed),
                ...liveQuota,
              },
            },
          };
        } else {
          logger.warn(
            "[paperclip:quota-api] live quota fetch returned nothing — falling back to static config",
          );
        }
      }

      const routingPlan = await prepareHeartbeatGeminiRouting({
        agent,
        resolvedConfig,
        runtimeConfig: runtimeConfigForRouting,
        runtimeState: runtimeStateForRouting,
        issueRef,
        context,
      });
      if (Object.keys(routingPlan.runtimeStatePatch).length > 0) {
        await persistRuntimeStatePatch(agent.id, routingPlan.runtimeStatePatch);
        runtimeStateForRouting = {
          ...runtimeStateForRouting,
          ...routingPlan.runtimeStatePatch,
          controlPlane: {
            ...parseObject(runtimeStateForRouting.controlPlane),
            ...parseObject(routingPlan.runtimeStatePatch.controlPlane),
          },
        };
      }
      for (const [key, value] of Object.entries(routingPlan.contextPatch)) {
        if (value === null) {
          delete context[key];
          continue;
        }
        context[key] = value;
      }
      Object.assign(resolvedConfig, routingPlan.resolvedConfigPatch);
      const routingRoleTemplateError = readNonEmptyString(
        routingPlan.contextPatch.paperclipRoleTemplateError,
      );
      if (routingRoleTemplateError) {
        logger.warn(
          {
            companyId: agent.companyId,
            agentId: agent.id,
            roleTemplateId: roleTemplateResolution.requestedRoleTemplateId,
            error: routingRoleTemplateError,
          },
          "[paperclip:role-template] failed to resolve assigned role template",
        );
      }
      const routingPreflight = routingPlan.routingPreflight;
      const routingWarnings = [...routingPlan.warnings];
      const workspacePlan = await prepareHeartbeatWorkspaceSessionPlan({
        db,
        agent,
        context,
        previousSessionParams,
        runtimeSessionId: runtime.sessionId ?? null,
        taskKey,
        taskSessionForRun: taskSessionForRun
          ? { sessionDisplayId: taskSessionForRun.sessionDisplayId }
          : null,
        resetTaskSession,
        resolvedConfig,
        executionWorkspaceMode,
        useProjectWorkspace: executionWorkspaceMode !== "agent_default",
        issueId,
        issueRef,
        sessionCodec,
        baseWarnings: routingWarnings,
        realizeExecutionWorkspace,
      });
      applyHeartbeatContextPatch(context, workspacePlan.contextPatch);
      if (issueRef && roleTemplateResolution.assigned?.template.id !== "reviewer") {
        applyHeartbeatContextPatch(
          context,
          buildHeartbeatIssuePromptContextPatch({
            contextSnapshot: context,
            issue: issueRef,
          }),
        );
      }
      const executionWorkspace = workspacePlan.executionWorkspace;
      const runtimeWorkspaceWarnings = [...workspacePlan.warnings];
      const sessionCompaction = workspacePlan.sessionCompaction;
      const runtimeForAdapter = workspacePlan.runtimeForAdapter;
      const singleFileBenchmarkPreflight =
        workspacePlan.singleFileBenchmarkPreflight;

      const runtimeStatePatch = routingPreflight
        ? {
            quotaSnapshot: {
              ...routingPreflight.selected,
              ...routingPreflight.quotaState,
              routingReason: routingPreflight.routingReason,
              mode: routingPreflight.mode,
              advisoryOnly: routingPreflight.advisoryOnly,
              policySource: routingPreflight.policySource,
              snapshotSource: routingPreflight.controlPlane.quota.source,
              controlPlane: routingPreflight.controlPlane,
              capturedAt: new Date().toISOString(),
            },
          }
        : null;

      let seq = 1;
      let handle: RunLogHandle | null = null;
      let stdoutExcerpt = "";
      let stderrExcerpt = "";
      let stdoutJsonLineBuffer = "";
      const pendingReadFileToolUses = new Map<string, string>();

      try {
        const startedAt = run.startedAt ?? new Date();
        const runningWithSession = await db
          .update(heartbeatRuns)
          .set({
            startedAt,
            sessionIdBefore: resolveRunStartSessionIdBefore({
              existingSessionIdBefore: run.sessionIdBefore,
              runtimeSessionDisplayId: runtimeForAdapter.sessionDisplayId,
              runtimeSessionId: runtimeForAdapter.sessionId,
            }),
            contextSnapshot: context,
            updatedAt: new Date(),
          })
          .where(eq(heartbeatRuns.id, run.id))
          .returning()
          .then((rows) => rows[0] ?? null);
        if (runningWithSession) run = runningWithSession;
        lastRunTouchAt = Date.now();

        const runningAgent = await db
          .update(agents)
          .set({ status: "running", updatedAt: new Date() })
          .where(eq(agents.id, agent.id))
          .returning()
          .then((rows) => rows[0] ?? null);

        if (runningAgent) {
          publishLiveEvent({
            companyId: runningAgent.companyId,
            type: "agent.status",
            payload: {
              agentId: runningAgent.id,
              status: runningAgent.status,
              outcome: "running",
            },
          });
        }

        const currentRun = run;
        await appendRunEvent(currentRun, seq++, {
          eventType: "lifecycle",
          stream: "system",
          level: "info",
          message: "run started",
        });

        handle = await runLogStore.begin({
          companyId: run.companyId,
          agentId: run.agentId,
          runId,
        });

        await db
          .update(heartbeatRuns)
          .set({
            logStore: handle.store,
            logRef: handle.logRef,
            updatedAt: new Date(),
          })
          .where(eq(heartbeatRuns.id, runId));
        lastRunTouchAt = Date.now();

        const onLog = async (stream: "stdout" | "stderr", chunk: string) => {
          const sanitizedChunk = redactCurrentUserText(chunk);
          if (stream === "stdout")
            stdoutExcerpt = appendExcerpt(stdoutExcerpt, sanitizedChunk);
          if (stream === "stderr")
            stderrExcerpt = appendExcerpt(stderrExcerpt, sanitizedChunk);
          const ts = new Date().toISOString();

          if (handle) {
            await runLogStore.append(handle, {
              stream,
              chunk: sanitizedChunk,
              ts,
            });
          }

          const payloadChunk =
            sanitizedChunk.length > MAX_LIVE_LOG_CHUNK_BYTES
              ? sanitizedChunk.slice(
                  sanitizedChunk.length - MAX_LIVE_LOG_CHUNK_BYTES,
                )
              : sanitizedChunk;

          publishLiveEvent({
            companyId: run.companyId,
            type: "heartbeat.run.log",
            payload: {
              runId: run.id,
              agentId: run.agentId,
              ts,
              stream,
              chunk: payloadChunk,
              truncated: payloadChunk.length !== sanitizedChunk.length,
            },
          });

          if (stream !== "stdout") return;

          stdoutJsonLineBuffer += sanitizedChunk;
          const completeLines = stdoutJsonLineBuffer.split(/\r?\n/);
          stdoutJsonLineBuffer = completeLines.pop() ?? "";

          for (const line of completeLines) {
            const parsed = safeParseJsonLine(line.trim());
            if (!parsed) continue;

            if (readNonEmptyString(parsed.type) === "tool_use") {
              const toolName =
                readNonEmptyString(parsed.tool_name) ??
                readNonEmptyString(parsed.name) ??
                readNonEmptyString(parsed.tool);
              const toolUseId =
                readNonEmptyString(parsed.tool_use_id) ??
                readNonEmptyString(parsed.tool_id) ??
                readNonEmptyString(parsed.toolUseId) ??
                readNonEmptyString(parsed.call_id) ??
                readNonEmptyString(parsed.id);
              const parameters =
                typeof parsed.parameters === "object" &&
                parsed.parameters !== null
                  ? (parsed.parameters as Record<string, unknown>)
                  : {};
              const filePath =
                normalizeRelativeReadPath(parameters.file_path) ??
                normalizeRelativeReadPath(parameters.path);
              if (
                toolName?.trim().toLowerCase() === "read_file" &&
                toolUseId &&
                filePath
              ) {
                pendingReadFileToolUses.set(toolUseId, filePath);
              }
              continue;
            }

            if (readNonEmptyString(parsed.type) !== "tool_result") continue;

            const toolUseId =
              readNonEmptyString(parsed.tool_use_id) ??
              readNonEmptyString(parsed.tool_id) ??
              readNonEmptyString(parsed.toolUseId) ??
              readNonEmptyString(parsed.call_id) ??
              readNonEmptyString(parsed.id);
            if (!toolUseId) continue;

            const readPath = pendingReadFileToolUses.get(toolUseId);
            if (!readPath) continue;
            pendingReadFileToolUses.delete(toolUseId);

            if (readNonEmptyString(parsed.output)) continue;

            try {
              const evidence = await collectReadFileEvidence({
                workspaceCwd: executionWorkspace.cwd,
                relativePath: readPath,
              });
              if (!evidence) continue;

              await appendRunEvent(currentRun, seq++, {
                eventType: "tool.evidence",
                stream: "system",
                level: "info",
                message: `Captured read_file evidence for ${evidence.relativePath}`,
                payload: {
                  toolName: "read_file",
                  toolUseId,
                  path: evidence.relativePath,
                  byteCount: evidence.byteCount,
                  sha256: evidence.sha256,
                  preview: evidence.preview,
                },
              });
            } catch (err) {
              await appendRunEvent(currentRun, seq++, {
                eventType: "tool.evidence",
                stream: "system",
                level: "warn",
                message: `Failed to capture read_file evidence for ${readPath}`,
                payload: {
                  toolName: "read_file",
                  toolUseId,
                  path: readPath,
                  error: err instanceof Error ? err.message : String(err),
                },
              });
            }
          }
        };
        for (const warning of runtimeWorkspaceWarnings) {
          await onLog("stderr", `[paperclip] ${warning}\n`);
        }
        if (routingPreflight) {
          const selected = routingPreflight.selected;
          await appendRunEvent(currentRun, seq++, {
            eventType: "routing.preflight",
            stream: "system",
            level: "info",
            message: `Routing selected ${selected.accountLabel}/${selected.selectedBucket}/${selected.effectiveModelLane} (${selected.budgetClass})`,
            payload: {
              selected,
              quotaState: routingPreflight.quotaState,
              routingReason: routingPreflight.routingReason,
              advisoryOnly: routingPreflight.advisoryOnly,
              mode: routingPreflight.mode,
              policySource: routingPreflight.policySource,
              applyModelLane: routingPreflight.applyModelLane,
              controlPlane: routingPreflight.controlPlane,
            },
          });
        }
        // Gate 1: Hard routing block — missing inputs or enforced policy stop.
        // Run is terminal. Operator must fix the task spec and re-submit.
        const routingHardBlocked =
          routingPreflight && routingPreflight.selected.blocked === true;
        if (routingHardBlocked) {
          const blockReason =
            routingPreflight.selected.blockReason ?? "policy_gate";
          const needsApproval = routingPreflight.selected.needsApproval;
          const missingInputs = routingPreflight.selected.missingInputs;
          const message = `Routing preflight blocked: ${blockReason}`;
          await appendRunEvent(currentRun, seq++, {
            eventType: "lifecycle",
            stream: "system",
            level: "error",
            message,
            payload: {
              stage: "routing.blocked",
              blockReason,
              needsApproval,
              missingInputs,
              executionIntent: routingPreflight.selected.executionIntent,
              riskLevel: routingPreflight.selected.riskLevel,
              budgetClass: routingPreflight.selected.budgetClass,
              taskType: routingPreflight.selected.taskType,
              controlPlane: routingPreflight.controlPlane,
            },
          });
          await setRunStatus(run.id, "blocked", {
            error: message,
            errorCode: blockReason,
            finishedAt: new Date(),
            resultJson: {
              type: "routing_blocked",
              status: "blocked",
              blockReason,
              needsApproval,
              missingInputs,
              executionIntent: routingPreflight.selected.executionIntent,
              riskLevel: routingPreflight.selected.riskLevel,
              taskType: routingPreflight.selected.taskType,
              budgetClass: routingPreflight.selected.budgetClass,
            },
          });
          await finalizeAgentStatus(agent.id, "blocked");
          return;
        }

        // Gate 2: Approval required — task is valid but needs operator sign-off.
        // Run is parked. An approval record is created so the operator can act.
        // On approval, heartbeat.wakeup() queues a follow-up run that re-enters routing.
        // Bypass: if this run was already approved, skip Gate 2 to avoid infinite loop.
        // Gate 2 (routine operator approval) is intentionally disabled for now.
        // Valid runs should continue unless they hit the hard block above.
        // Apply routed model lanes. For gemini_local, keep pro-style auto selection,
        // but pin flash/flash-lite explicitly because live CEO runs otherwise default
        // to auto-gemini-3 and can stall before the first tool call.
        const routedModelOverride = resolveHeartbeatModelOverride({
          adapterType: agent.adapterType,
          configuredModel: readNonEmptyString(resolvedConfig.model),
          applyModelLane: Boolean(routingPreflight?.applyModelLane),
          effectiveModelLane:
            routingPreflight?.selected.effectiveModelLane ?? null,
        });
        if (routedModelOverride) {
          resolvedConfig.model = routedModelOverride;
        }

        if (singleFileBenchmarkPreflight.required) {
          await appendRunEvent(currentRun, seq++, {
            eventType: "lifecycle",
            stream: "system",
            level: singleFileBenchmarkPreflight.ok ? "info" : "error",
            message: singleFileBenchmarkPreflight.ok
              ? "single-file benchmark preflight passed"
              : "single-file benchmark preflight blocked run",
            payload: {
              stage: "single_file.preflight",
              preflightExecuted: true,
              preflightResult: singleFileBenchmarkPreflight.ok
                ? "ok"
                : "blocked",
              required: singleFileBenchmarkPreflight.required,
              ok: singleFileBenchmarkPreflight.ok,
              reason: singleFileBenchmarkPreflight.reason,
              adapterCwd: singleFileBenchmarkPreflight.adapterCwd,
              rawWorkspaceCwd: singleFileBenchmarkPreflight.rawWorkspaceCwd,
              effectiveWorkspaceCwd:
                singleFileBenchmarkPreflight.effectiveWorkspaceCwd,
              workspaceSource: singleFileBenchmarkPreflight.workspaceSource,
              configuredCwd: singleFileBenchmarkPreflight.configuredCwd,
              configuredCwdExists:
                singleFileBenchmarkPreflight.configuredCwdExists,
              resolutionStrategy:
                singleFileBenchmarkPreflight.resolutionStrategy,
              issueTaskPromptPresent:
                singleFileBenchmarkPreflight.issueTaskPromptPresent,
              issueTaskPromptPreview:
                singleFileBenchmarkPreflight.issueTaskPromptPreview,
              singleFileTargetPath:
                singleFileBenchmarkPreflight.singleFileTargetPath,
              singleFileTargetResolvedPath:
                singleFileBenchmarkPreflight.singleFileTargetResolvedPath,
              targetExists: singleFileBenchmarkPreflight.targetExists,
              targetWithinEffectiveCwd:
                singleFileBenchmarkPreflight.targetWithinEffectiveCwd,
              abortOnMissingFile:
                singleFileBenchmarkPreflight.abortOnMissingFile,
            },
          });
        }
        const adapterEnv = Object.fromEntries(
          Object.entries(parseObject(resolvedConfig.env)).filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === "string" && typeof entry[1] === "string",
          ),
        );
        const adapterExecutionSafety = resolveAdapterExecutionSafety(context);
        const runtimeServices: Awaited<
          ReturnType<typeof ensureRuntimeServicesForRun>
        > =
          adapterExecutionSafety.blockAdapterExecute ||
          (singleFileBenchmarkPreflight.required &&
            !singleFileBenchmarkPreflight.ok)
            ? []
            : await ensureRuntimeServicesForRun({
                db,
                runId: run.id,
                agent: {
                  id: agent.id,
                  name: agent.name,
                  companyId: agent.companyId,
                },
                issue: issueRef,
                workspace: executionWorkspace,
                config: resolvedConfig,
                adapterEnv,
                onLog,
              });
        if (runtimeServices.length > 0) {
          context.paperclipRuntimeServices = runtimeServices;
          context.paperclipRuntimePrimaryUrl =
            runtimeServices.find((service) => readNonEmptyString(service.url))
              ?.url ?? null;
          await db
            .update(heartbeatRuns)
            .set({
              contextSnapshot: context,
              updatedAt: new Date(),
            })
            .where(eq(heartbeatRuns.id, run.id));
        }
        if (
          issueId &&
          (executionWorkspace.created ||
            runtimeServices.some((service) => !service.reused))
        ) {
          try {
            await issuesSvc.addComment(
              issueId,
              buildWorkspaceReadyComment({
                workspace: executionWorkspace,
                runtimeServices,
              }),
              { agentId: agent.id },
            );
          } catch (err) {
            await onLog(
              "stderr",
              `[paperclip] Failed to post workspace-ready comment: ${
                err instanceof Error ? err.message : String(err)
              }\n`,
            );
          }
        }
        const onAdapterMeta = async (meta: AdapterInvocationMeta) => {
          if (meta.env && secretKeys.size > 0) {
            for (const key of secretKeys) {
              if (key in meta.env) meta.env[key] = "***REDACTED***";
            }
          }
          const invokeSuppressed =
            meta.invokeSuppressed ??
            meta.command.trim().toLowerCase() === "adapter.execute suppressed";
          const adapterStarted = meta.adapterStarted ?? !invokeSuppressed;
          await appendRunEvent(currentRun, seq++, {
            eventType: "adapter.invoke",
            stream: "system",
            level: "info",
            message: "adapter invocation",
            payload: {
              ...meta,
              invokeSuppressed,
              adapterStarted,
            } as unknown as Record<string, unknown>,
          });
        };

        let adapterResult: AdapterExecutionResult;
        if (adapterExecutionSafety.blockAdapterExecute) {
          const safetyReason =
            adapterExecutionSafety.reason ?? "context_test_run";
          await onLog(
            "stderr",
            `[paperclip] Dry-run safety active (${safetyReason}); adapter.execute suppressed.\n`,
          );
          await onAdapterMeta({
            adapterType: agent.adapterType,
            command: "adapter.execute suppressed",
            invokeSuppressed: true,
            adapterStarted: false,
            suppressionReason: safetyReason,
            commandNotes: [
              `Safety reason: ${safetyReason}`,
              `Execution mode: ${
                adapterExecutionSafety.executionMode ?? "default"
              }`,
            ],
            context: {
              executionMode: adapterExecutionSafety.executionMode,
              safetyReason,
            },
          });
          adapterResult = buildDryRunAdapterResult({
            contextSnapshot: context,
            safetyReason,
          });
        } else if (
          singleFileBenchmarkPreflight.required &&
          !singleFileBenchmarkPreflight.ok
        ) {
          const reason =
            singleFileBenchmarkPreflight.reason ??
            "single_file_preflight_failed";
          await onLog(
            "stderr",
            `[paperclip] Single-file benchmark preflight blocked adapter execution (${reason}).\n`,
          );
          await onAdapterMeta({
            adapterType: agent.adapterType,
            command: "adapter.execute suppressed",
            invokeSuppressed: true,
            adapterStarted: false,
            suppressionReason: reason,
            commandNotes: [
              `Single-file benchmark preflight failed: ${reason}`,
              `Adapter cwd: ${singleFileBenchmarkPreflight.adapterCwd}`,
              `Workspace cwd (raw): ${
                singleFileBenchmarkPreflight.rawWorkspaceCwd ?? "(none)"
              }`,
              `Workspace cwd (effective): ${
                singleFileBenchmarkPreflight.effectiveWorkspaceCwd ?? "(none)"
              }`,
              `Target path: ${
                singleFileBenchmarkPreflight.singleFileTargetPath ?? "(none)"
              }`,
            ],
            context: {
              preflight: {
                required: singleFileBenchmarkPreflight.required,
                ok: singleFileBenchmarkPreflight.ok,
                reason,
                adapterCwd: singleFileBenchmarkPreflight.adapterCwd,
                rawWorkspaceCwd: singleFileBenchmarkPreflight.rawWorkspaceCwd,
                effectiveWorkspaceCwd:
                  singleFileBenchmarkPreflight.effectiveWorkspaceCwd,
                workspaceSource: singleFileBenchmarkPreflight.workspaceSource,
                configuredCwd: singleFileBenchmarkPreflight.configuredCwd,
                configuredCwdExists:
                  singleFileBenchmarkPreflight.configuredCwdExists,
                resolutionStrategy:
                  singleFileBenchmarkPreflight.resolutionStrategy,
                issueTaskPromptPresent:
                  singleFileBenchmarkPreflight.issueTaskPromptPresent,
                issueTaskPromptPreview:
                  singleFileBenchmarkPreflight.issueTaskPromptPreview,
                singleFileTargetPath:
                  singleFileBenchmarkPreflight.singleFileTargetPath,
                singleFileTargetResolvedPath:
                  singleFileBenchmarkPreflight.singleFileTargetResolvedPath,
                targetExists: singleFileBenchmarkPreflight.targetExists,
                targetWithinEffectiveCwd:
                  singleFileBenchmarkPreflight.targetWithinEffectiveCwd,
                abortOnMissingFile:
                  singleFileBenchmarkPreflight.abortOnMissingFile,
              },
            },
          });
          adapterResult = {
            exitCode: 1,
            signal: null,
            timedOut: false,
            errorCode: "single_file_preflight_failed",
            errorMessage: `Single-file benchmark preflight blocked adapter execution: ${reason}`,
            resultJson: {
              type: "single_file_preflight",
              status: "blocked",
              reason,
              adapterCwd: singleFileBenchmarkPreflight.adapterCwd,
              rawWorkspaceCwd: singleFileBenchmarkPreflight.rawWorkspaceCwd,
              effectiveWorkspaceCwd:
                singleFileBenchmarkPreflight.effectiveWorkspaceCwd,
              workspaceSource: singleFileBenchmarkPreflight.workspaceSource,
              configuredCwd: singleFileBenchmarkPreflight.configuredCwd,
              configuredCwdExists:
                singleFileBenchmarkPreflight.configuredCwdExists,
              resolutionStrategy:
                singleFileBenchmarkPreflight.resolutionStrategy,
              issueTaskPromptPresent:
                singleFileBenchmarkPreflight.issueTaskPromptPresent,
              issueTaskPromptPreview:
                singleFileBenchmarkPreflight.issueTaskPromptPreview,
              singleFileTargetPath:
                singleFileBenchmarkPreflight.singleFileTargetPath,
              singleFileTargetResolvedPath:
                singleFileBenchmarkPreflight.singleFileTargetResolvedPath,
              targetExists: singleFileBenchmarkPreflight.targetExists,
              targetWithinEffectiveCwd:
                singleFileBenchmarkPreflight.targetWithinEffectiveCwd,
              abortOnMissingFile:
                singleFileBenchmarkPreflight.abortOnMissingFile,
            },
          };
        } else {
          const adapter = getServerAdapter(agent.adapterType);
          const authToken = adapter.supportsLocalAgentJwt
            ? createLocalAgentJwt(
                agent.id,
                agent.companyId,
                agent.adapterType,
                run.id,
              )
            : null;
          if (adapter.supportsLocalAgentJwt && !authToken) {
            logger.warn(
              {
                companyId: agent.companyId,
                agentId: agent.id,
                runId: run.id,
                adapterType: agent.adapterType,
              },
              "local agent jwt secret missing or invalid; running without injected PAPERCLIP_API_KEY",
            );
          }

          keepaliveTimer = setInterval(() => {
            if (keepaliveInFlight) return;
            keepaliveInFlight = true;
            void touchRunKeepalive()
              .catch((err) => {
                logger.warn(
                  { err, runId: run.id },
                  "heartbeat run keepalive update failed",
                );
              })
              .finally(() => {
                keepaliveInFlight = false;
              });
          }, RUN_KEEPALIVE_INTERVAL_MS);

          adapterResult = await adapter.execute({
            runId: run.id,
            agent,
            runtime: runtimeForAdapter,
            config: resolvedConfig,
            context,
            onLog,
            onMeta: onAdapterMeta,
            authToken: authToken ?? undefined,
          });
        }
        const adapterManagedRuntimeServices = adapterResult.runtimeServices
          ? await persistAdapterManagedRuntimeServices({
              db,
              adapterType: agent.adapterType,
              runId: run.id,
              agent: {
                id: agent.id,
                name: agent.name,
                companyId: agent.companyId,
              },
              issue: issueRef,
              workspace: executionWorkspace,
              reports: adapterResult.runtimeServices,
            })
          : [];
        if (adapterManagedRuntimeServices.length > 0) {
          const combinedRuntimeServices = [
            ...runtimeServices,
            ...adapterManagedRuntimeServices,
          ];
          context.paperclipRuntimeServices = combinedRuntimeServices;
          context.paperclipRuntimePrimaryUrl =
            combinedRuntimeServices.find((service) =>
              readNonEmptyString(service.url),
            )?.url ?? null;
          await db
            .update(heartbeatRuns)
            .set({
              contextSnapshot: context,
              updatedAt: new Date(),
            })
            .where(eq(heartbeatRuns.id, run.id));
          if (issueId) {
            try {
              await issuesSvc.addComment(
                issueId,
                buildWorkspaceReadyComment({
                  workspace: executionWorkspace,
                  runtimeServices: adapterManagedRuntimeServices,
                }),
                { agentId: agent.id },
              );
            } catch (err) {
              await onLog(
                "stderr",
                `[paperclip] Failed to post adapter-managed runtime comment: ${
                  err instanceof Error ? err.message : String(err)
                }\n`,
              );
            }
          }
        }
        const postRunQuotaRefresh = refreshGeminiRuntimeQuotaSnapshot({
          runtimeConfig: runtimeConfigForRouting,
          runtimeState: runtimeStateForRouting,
          trigger: "after_run",
          adapterResultJson: adapterResult.resultJson,
        });
        if (postRunQuotaRefresh.runtimeStateChanged) {
          await persistRuntimeStatePatch(
            agent.id,
            postRunQuotaRefresh.runtimeStatePatch,
          );
          runtimeStateForRouting = {
            ...runtimeStateForRouting,
            ...postRunQuotaRefresh.runtimeStatePatch,
            controlPlane: {
              ...parseObject(runtimeStateForRouting.controlPlane),
              ...parseObject(
                postRunQuotaRefresh.runtimeStatePatch.controlPlane,
              ),
            },
          };
        }
        await appendRunEvent(currentRun, seq++, {
          eventType: "routing.quota_refresh",
          stream: "system",
          level: postRunQuotaRefresh.snapshot.isStale ? "warn" : "info",
          message: postRunQuotaRefresh.refreshed
            ? "quota snapshot refreshed after run"
            : "quota snapshot refresh checked after run",
          payload: {
            trigger: "after_run",
            refreshSource: postRunQuotaRefresh.refreshSource,
            refreshed: postRunQuotaRefresh.refreshed,
            runtimeStateChanged: postRunQuotaRefresh.runtimeStateChanged,
            warnings: postRunQuotaRefresh.warnings,
            snapshot: {
              source: postRunQuotaRefresh.snapshot.source,
              snapshotAt: postRunQuotaRefresh.snapshot.snapshotAt,
              resetAt: postRunQuotaRefresh.snapshot.resetAt,
              staleReason: postRunQuotaRefresh.snapshot.staleReason,
              isStale: postRunQuotaRefresh.snapshot.isStale,
              ageSec: postRunQuotaRefresh.snapshot.ageSec,
              maxAgeSec: postRunQuotaRefresh.snapshot.maxAgeSec,
            },
          },
        });

        const nextSessionState = resolveNextSessionState({
          codec: sessionCodec,
          adapterResult,
          previousParams: previousSessionParams,
          previousDisplayId: runtimeForAdapter.sessionDisplayId,
          previousLegacySessionId: runtimeForAdapter.sessionId,
        });
        const rawUsage = normalizeUsageTotals(adapterResult.usage);
        const sessionUsageResolution = await resolveNormalizedUsageForSession({
          agentId: agent.id,
          runId: run.id,
          sessionId:
            nextSessionState.displayId ?? nextSessionState.legacySessionId,
          rawUsage,
        });
        const normalizedUsage = sessionUsageResolution.normalizedUsage;
        const postToolCapacityState = readPostToolCapacityState({
          errorCode: adapterResult.errorCode,
          resultJson: adapterResult.resultJson,
          sessionId:
            nextSessionState.displayId ?? nextSessionState.legacySessionId,
          issueId,
          taskKey,
        });
        const postToolCapacityCooldownSec = postToolCapacityState
          ? resolvePostToolCapacityCooldownSec(agent.runtimeConfig)
          : null;
        const postToolCapacityCooldownUntil = postToolCapacityState
          ? new Date(
              Date.now() + postToolCapacityCooldownSec! * 1000,
            ).toISOString()
          : null;
        const finalResultJson = postToolCapacityState
          ? buildPostToolCapacityResultJson({
              baseResultJson: adapterResult.resultJson,
              state: postToolCapacityState,
              cooldownSec: postToolCapacityCooldownSec!,
              cooldownUntil: postToolCapacityCooldownUntil!,
            })
          : adapterResult.resultJson ?? null;

        let outcome: "succeeded" | "failed" | "cancelled" | "timed_out" | "blocked" | "awaiting_approval";
        const latestRun = await getRun(run.id);
        if (latestRun?.status === "cancelled") {
          outcome = "cancelled";
        } else if (latestRun?.status === "blocked") {
          outcome = "blocked";
        } else if (latestRun?.status === "awaiting_approval") {
          outcome = "awaiting_approval";
        } else if (adapterResult.timedOut) {
          outcome = "timed_out";
        } else if (adapterResult.errorCode === "loop_detected") {
          outcome = "blocked";
        } else if (postToolCapacityState) {
          outcome = "blocked";
        } else if (
          (adapterResult.exitCode ?? 0) === 0 &&
          !adapterResult.errorMessage
        ) {
          outcome = "succeeded";
        } else {
          outcome = "failed";
        }

        const effectiveUsage = normalizedUsage ?? rawUsage;
        const totalTokensUsed = estimateTotalTokens(effectiveUsage);
        const hardTokenCap = resolveHardTokenCapTokens(context);
        const exceededHardTokenCap =
          totalTokensUsed != null && totalTokensUsed > hardTokenCap;
        const budgetExceededMessage = exceededHardTokenCap
          ? `Hard token cap exceeded: used ${formatCount(
              totalTokensUsed,
            )} > cap ${formatCount(hardTokenCap)}`
          : null;
        if (exceededHardTokenCap) {
          // Token cap is orientation only — Google quota is the real hard cap.
          // Log a warning but do not override a successful run outcome.
          await appendRunEvent(currentRun, seq++, {
            eventType: "lifecycle",
            stream: "system",
            level: "warn",
            message: budgetExceededMessage ?? undefined,
          });
        } else if (
          totalTokensUsed !== null &&
          totalTokensUsed >= hardTokenCap * 0.8
        ) {
          // Soft-cap threshold warning: 80% of hard cap consumed.
          // Emitted once at run finalization — no keepalive spam.
          const pct = Math.round((totalTokensUsed / hardTokenCap) * 100);
          await appendRunEvent(currentRun, seq++, {
            eventType: "lifecycle",
            stream: "system",
            level: "warn",
            message: `Budget warning: used ${formatCount(totalTokensUsed)} tokens (${pct}% of ${formatCount(hardTokenCap)} cap)`,
          });
          publishLiveEvent({
            companyId: agent.companyId,
            type: "heartbeat.run.budget_warning",
            payload: {
              runId: run.id,
              agentId: agent.id,
              totalTokensUsed,
              hardTokenCap,
              softCapThreshold: Math.round(hardTokenCap * 0.8),
              percentOfCap: pct,
            },
          });
        }

        let logSummary: {
          bytes: number;
          sha256?: string;
          compressed: boolean;
        } | null = null;
        if (handle) {
          logSummary = await runLogStore.finalize(handle);
        }

        const status =
          outcome === "succeeded"
            ? "succeeded"
            : outcome === "cancelled"
            ? "cancelled"
            : outcome === "timed_out"
            ? "timed_out"
            : outcome === "blocked"
            ? "blocked"
            : "failed";

        const usageJson =
          normalizedUsage || adapterResult.costUsd != null
            ? ({
                ...(normalizedUsage ?? {}),
                ...(rawUsage
                  ? {
                      rawInputTokens: rawUsage.inputTokens,
                      rawCachedInputTokens: rawUsage.cachedInputTokens,
                      rawOutputTokens: rawUsage.outputTokens,
                    }
                  : {}),
                ...(sessionUsageResolution.derivedFromSessionTotals
                  ? { usageSource: "session_delta" }
                  : {}),
                ...(nextSessionState.displayId ??
                nextSessionState.legacySessionId
                  ? {
                      persistedSessionId:
                        nextSessionState.displayId ??
                        nextSessionState.legacySessionId,
                    }
                  : {}),
                sessionReused:
                  runtimeForAdapter.sessionId != null ||
                  runtimeForAdapter.sessionDisplayId != null,
                taskSessionReused: taskSessionForRun != null,
                freshSession:
                  runtimeForAdapter.sessionId == null &&
                  runtimeForAdapter.sessionDisplayId == null,
                sessionRotated: sessionCompaction.rotate,
                sessionRotationReason: sessionCompaction.reason,
                ...(adapterResult.costUsd != null
                  ? { costUsd: adapterResult.costUsd }
                  : {}),
                ...(adapterResult.billingType
                  ? { billingType: adapterResult.billingType }
                  : {}),
              } as Record<string, unknown>)
            : null;

        await setRunStatus(run.id, status, {
          finishedAt: new Date(),
          error:
            outcome === "succeeded"
              ? null
              : postToolCapacityState
              ? redactCurrentUserText(
                  adapterResult.errorMessage ??
                    postToolCapacityState.message ??
                    "Model capacity exhausted after successful tool calls.",
                )
              : budgetExceededMessage
              ? budgetExceededMessage
              : redactCurrentUserText(
                  adapterResult.errorMessage ??
                    (outcome === "timed_out" ? "Timed out" : "Adapter failed"),
                ),
          errorCode: postToolCapacityState
            ? POST_TOOL_CAPACITY_ERROR_CODE
            : budgetExceededMessage
            ? "budget_hard_cap_reached"
            : outcome === "timed_out"
            ? "timeout"
            : outcome === "cancelled"
            ? "cancelled"
            : outcome === "failed"
            ? adapterResult.errorCode ?? "adapter_failed"
            : null,
          exitCode: adapterResult.exitCode,
          signal: adapterResult.signal,
          usageJson,
          resultJson: finalResultJson,
          sessionIdAfter:
            nextSessionState.displayId ?? nextSessionState.legacySessionId,
          stdoutExcerpt,
          stderrExcerpt,
          logBytes: logSummary?.bytes,
          logSha256: logSummary?.sha256,
          logCompressed: logSummary?.compressed ?? false,
        });

        await setWakeupStatus(
          run.wakeupRequestId,
          outcome === "succeeded" ? "completed" : status,
          {
            finishedAt: new Date(),
            error: postToolCapacityState
              ? adapterResult.errorMessage ?? postToolCapacityState.message ?? null
              : budgetExceededMessage ?? adapterResult.errorMessage ?? null,
          },
        );

        const finalizedRun = await getRun(run.id);
        if (finalizedRun) {
          if (
            postToolCapacityState &&
            issueId &&
            postToolCapacityCooldownUntil &&
            postToolCapacityCooldownSec
          ) {
            const deferredWakeId = await schedulePostToolCapacityResume({
              run: finalizedRun,
              agent,
              issueId,
              contextSnapshot: context,
              source: run.invocationSource as WakeupSource | undefined,
              triggerDetail: run.triggerDetail as WakeupOptions["triggerDetail"] | null,
              cooldownUntil: postToolCapacityCooldownUntil,
              cooldownSec: postToolCapacityCooldownSec,
              state: postToolCapacityState,
            });
            await appendRunEvent(finalizedRun, seq++, {
              eventType: "lifecycle",
              stream: "system",
              level: "warn",
              message: `post-tool capacity deferred until ${postToolCapacityCooldownUntil}`,
              payload: {
                issueId,
                deferredWakeId,
                cooldownSec: postToolCapacityCooldownSec,
                cooldownUntil: postToolCapacityCooldownUntil,
                sessionId: postToolCapacityState.sessionId,
                taskKey,
                toolResultCount: postToolCapacityState.toolResultCount,
                successfulToolResultCount:
                  postToolCapacityState.successfulToolResultCount,
                lastSuccessfulToolName:
                  postToolCapacityState.lastSuccessfulToolName,
              },
            });
          }
          await appendRunEvent(finalizedRun, seq++, {
            eventType: "lifecycle",
            stream: "system",
            level: outcome === "succeeded" ? "info" : "error",
            message: `run ${outcome}`,
            payload: {
              status,
              exitCode: adapterResult.exitCode,
            },
          });
          try {
            const issueTransition =
              await maybeAdvanceIssueStatusAfterRun(finalizedRun);
            if (issueTransition) {
              await appendRunEvent(finalizedRun, seq++, {
                eventType: "lifecycle",
                stream: "system",
                level: "info",
                message: `issue auto-transitioned to ${issueTransition.issue.status}`,
                payload: {
                  issueId: issueTransition.issue.id,
                  previousStatus: issueTransition.previousStatus,
                  status: issueTransition.issue.status,
                  roleTemplateId: issueTransition.roleTemplateId,
                  reviewerVerdict: issueTransition.reviewerVerdict,
                  reason: issueTransition.reason,
                  parentRetrigger: issueTransition.parentRetrigger,
                },
              });
            }
          } catch (err) {
            logger.warn(
              { err, runId: finalizedRun.id },
              "Failed to auto-transition issue after run completion",
            );
          }
          await releaseIssueExecutionAndPromote(finalizedRun);
        }

        if (finalizedRun) {
          try {
            await memorySvc.recordRunEpisode({
              companyId: finalizedRun.companyId,
              agentId: finalizedRun.agentId,
              runId: finalizedRun.id,
              outcome,
              issueId,
              projectId: executionProjectId,
              resultSummary: summarizeHeartbeatRunResultJson(
                finalResultJson,
              ),
            });
          } catch (err) {
            logger.warn(
              {
                err,
                companyId: finalizedRun.companyId,
                agentId: finalizedRun.agentId,
                runId: finalizedRun.id,
                finalResultJson,
              },
              "Failed to persist heartbeat episode memory",
            );
          }

          await updateRuntimeState(
            agent,
            finalizedRun,
            adapterResult,
            {
              legacySessionId: nextSessionState.legacySessionId,
            },
            normalizedUsage,
            runtimeStatePatch,
          );
          if (taskKey) {
            if (
              adapterResult.clearSession ||
              (!nextSessionState.params && !nextSessionState.displayId)
            ) {
              await clearTaskSessions(agent.companyId, agent.id, {
                taskKey,
                adapterType: agent.adapterType,
              });
            } else {
              await upsertTaskSession({
                companyId: agent.companyId,
                agentId: agent.id,
                adapterType: agent.adapterType,
                taskKey,
                sessionParamsJson: nextSessionState.params,
                sessionDisplayId: nextSessionState.displayId,
                lastRunId: finalizedRun.id,
                lastError:
                  outcome === "succeeded"
                    ? null
                    : adapterResult.errorMessage ?? "run_failed",
              });
            }
          }
        }
        await finalizeAgentStatus(agent.id, outcome);
      } catch (err) {
        const message = redactCurrentUserText(
          err instanceof Error ? err.message : "Unknown adapter failure",
        );
        logger.error({ err, runId }, "heartbeat execution failed");

        let logSummary: {
          bytes: number;
          sha256?: string;
          compressed: boolean;
        } | null = null;
        if (handle) {
          try {
            logSummary = await runLogStore.finalize(handle);
          } catch (finalizeErr) {
            logger.warn(
              { err: finalizeErr, runId },
              "failed to finalize run log after error",
            );
          }
        }

        const failedRun = await setRunStatus(run.id, "failed", {
          error: message,
          errorCode: "adapter_failed",
          finishedAt: new Date(),
          stdoutExcerpt,
          stderrExcerpt,
          logBytes: logSummary?.bytes,
          logSha256: logSummary?.sha256,
          logCompressed: logSummary?.compressed ?? false,
        });
        await setWakeupStatus(run.wakeupRequestId, "failed", {
          finishedAt: new Date(),
          error: message,
        });

        if (failedRun) {
          await appendRunEvent(failedRun, seq++, {
            eventType: "error",
            stream: "system",
            level: "error",
            message,
          });
          await releaseIssueExecutionAndPromote(failedRun);

          await updateRuntimeState(
            agent,
            failedRun,
            {
              exitCode: null,
              signal: null,
              timedOut: false,
              errorMessage: message,
            },
            {
              legacySessionId: runtimeForAdapter.sessionId,
            },
            undefined,
            runtimeStatePatch,
          );

          if (
            taskKey &&
            (
              previousSessionParams ||
              runtimeForAdapter.sessionDisplayId ||
              taskSession
            )
          ) {
            await upsertTaskSession({
              companyId: agent.companyId,
              agentId: agent.id,
              adapterType: agent.adapterType,
              taskKey,
              sessionParamsJson: previousSessionParams,
              sessionDisplayId: runtimeForAdapter.sessionDisplayId,
              lastRunId: failedRun.id,
              lastError: message,
            });
          }
        }

        await finalizeAgentStatus(agent.id, "failed");
      }
    } catch (outerErr) {
      // Setup code before adapter.execute threw (e.g. ensureRuntimeState, resolveWorkspaceForRun).
      // The inner catch did not fire, so we must record the failure here.
      const message =
        outerErr instanceof Error ? outerErr.message : "Unknown setup failure";
      logger.error(
        { err: outerErr, runId },
        "heartbeat execution setup failed",
      );
      await setRunStatus(runId, "failed", {
        error: message,
        errorCode: "adapter_failed",
        finishedAt: new Date(),
      }).catch(() => undefined);
      await setWakeupStatus(run.wakeupRequestId, "failed", {
        finishedAt: new Date(),
        error: message,
      }).catch(() => undefined);
      const failedRun = await getRun(runId).catch(() => null);
      if (failedRun) {
        // Emit a run-log event so the failure is visible in the run timeline,
        // consistent with what the inner catch block does for adapter failures.
        await appendRunEvent(failedRun, 1, {
          eventType: "error",
          stream: "system",
          level: "error",
          message,
        }).catch(() => undefined);
        await releaseIssueExecutionAndPromote(failedRun).catch(() => undefined);
      }
      // Ensure the agent is not left stuck in "running" if the inner catch handler's
      // DB calls threw (e.g. a transient DB error in finalizeAgentStatus).
      await finalizeAgentStatus(run.agentId, "failed").catch(() => undefined);
    } finally {
      stopKeepalive();
      await releaseRuntimeServicesForRun(run.id).catch(() => undefined);
      activeRunExecutions.delete(run.id);
      await startNextQueuedRunForAgent(run.agentId);
    }
  }

  async function releaseIssueExecutionAndPromote(
    run: typeof heartbeatRuns.$inferSelect,
  ) {
    const promotedRun = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from issues where company_id = ${run.companyId} and execution_run_id = ${run.id} for update`,
      );

      const issue = await tx
        .select({
          id: issues.id,
          companyId: issues.companyId,
          status: issues.status,
        })
        .from(issues)
        .where(
          and(
            eq(issues.companyId, run.companyId),
            eq(issues.executionRunId, run.id),
          ),
        )
        .then((rows) => rows[0] ?? null);

      if (!issue) return;

      await tx
        .update(issues)
        .set({
          executionRunId: null,
          executionAgentNameKey: null,
          executionLockedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(issues.id, issue.id));

      if (!shouldPromoteDeferredIssueExecution(issue.status)) {
        await tx
          .update(agentWakeupRequests)
          .set({
            status: "failed",
            finishedAt: new Date(),
            error: `Deferred wake skipped: issue is ${issue.status}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(agentWakeupRequests.companyId, issue.companyId),
              eq(agentWakeupRequests.status, "deferred_issue_execution"),
              sql`${agentWakeupRequests.payload} ->> 'issueId' = ${issue.id}`,
            ),
          );
        return null;
      }

      while (true) {
        const deferred = await tx
          .select()
          .from(agentWakeupRequests)
          .where(
            and(
              eq(agentWakeupRequests.companyId, issue.companyId),
              eq(agentWakeupRequests.status, "deferred_issue_execution"),
              sql`${agentWakeupRequests.payload} ->> 'issueId' = ${issue.id}`,
            ),
          )
          .orderBy(asc(agentWakeupRequests.requestedAt))
          .limit(1)
          .then((rows) => rows[0] ?? null);

        if (!deferred) return null;

        const deferredAgent = await tx
          .select()
          .from(agents)
          .where(eq(agents.id, deferred.agentId))
          .then((rows) => rows[0] ?? null);

        if (
          !deferredAgent ||
          deferredAgent.companyId !== issue.companyId ||
          deferredAgent.status === "paused" ||
          deferredAgent.status === "terminated" ||
          deferredAgent.status === "pending_approval"
        ) {
          await tx
            .update(agentWakeupRequests)
            .set({
              status: "failed",
              finishedAt: new Date(),
              error:
                "Deferred wake could not be promoted: agent is not invokable",
              updatedAt: new Date(),
            })
            .where(eq(agentWakeupRequests.id, deferred.id));
          continue;
        }

        const deferredPayload = parseObject(deferred.payload);
        const deferredContextSeed = parseObject(
          deferredPayload[DEFERRED_WAKE_CONTEXT_KEY],
        );
        const promotedContextSeed: Record<string, unknown> = {
          ...deferredContextSeed,
        };
        const promotedReason =
          readNonEmptyString(deferred.reason) ?? "issue_execution_promoted";
        const promotedSource =
          (readNonEmptyString(deferred.source) as WakeupOptions["source"]) ??
          "automation";
        const promotedTriggerDetail =
          (readNonEmptyString(
            deferred.triggerDetail,
          ) as WakeupOptions["triggerDetail"]) ?? null;
        const promotedPayload = deferredPayload;
        delete promotedPayload[DEFERRED_WAKE_CONTEXT_KEY];

        const {
          contextSnapshot: promotedContextSnapshot,
          taskKey: promotedTaskKey,
        } = enrichWakeContextSnapshot({
          contextSnapshot: promotedContextSeed,
          reason: promotedReason,
          source: promotedSource,
          triggerDetail: promotedTriggerDetail,
          payload: promotedPayload,
        });

        const sessionBefore = await resolveSessionBeforeForWakeup(
          deferredAgent,
          promotedTaskKey,
        );
        const now = new Date();
        const newRun = await tx
          .insert(heartbeatRuns)
          .values({
            companyId: deferredAgent.companyId,
            agentId: deferredAgent.id,
            invocationSource: promotedSource,
            triggerDetail: promotedTriggerDetail,
            status: "queued",
            wakeupRequestId: deferred.id,
            contextSnapshot: promotedContextSnapshot,
            sessionIdBefore: sessionBefore,
          })
          .returning()
          .then((rows) => rows[0]);

        await tx
          .update(agentWakeupRequests)
          .set({
            status: "queued",
            reason: "issue_execution_promoted",
            runId: newRun.id,
            claimedAt: null,
            finishedAt: null,
            error: null,
            updatedAt: now,
          })
          .where(eq(agentWakeupRequests.id, deferred.id));

        await tx
          .update(issues)
          .set({
            executionRunId: newRun.id,
            executionAgentNameKey: normalizeAgentNameKey(deferredAgent.name),
            executionLockedAt: now,
            updatedAt: now,
          })
          .where(eq(issues.id, issue.id));

        return newRun;
      }
    });

    if (!promotedRun) return;

    publishLiveEvent({
      companyId: promotedRun.companyId,
      type: "heartbeat.run.queued",
      payload: {
        runId: promotedRun.id,
        agentId: promotedRun.agentId,
        invocationSource: promotedRun.invocationSource,
        triggerDetail: promotedRun.triggerDetail,
        wakeupRequestId: promotedRun.wakeupRequestId,
      },
    });

    await startNextQueuedRunForAgent(promotedRun.agentId);
  }

  async function enqueueWakeup(agentId: string, opts: WakeupOptions = {}) {
    const source = opts.source ?? "on_demand";
    const triggerDetail = opts.triggerDetail ?? null;
    const contextSnapshot: Record<string, unknown> = {
      ...(opts.contextSnapshot ?? {}),
    };
    const reason = opts.reason ?? null;
    const payload = opts.payload ?? null;
    const {
      contextSnapshot: enrichedContextSnapshot,
      issueIdFromPayload,
      taskKey,
      workPacketId,
      wakeCommentId,
    } = enrichWakeContextSnapshot({
      contextSnapshot,
      reason,
      source,
      triggerDetail,
      payload,
    });
    const issueId =
      readNonEmptyString(enrichedContextSnapshot.issueId) ?? issueIdFromPayload;

    const agent = await getAgent(agentId);
    if (!agent) throw notFound("Agent not found");

    const issueContext = issueId
      ? await db
          .select({
            id: issues.id,
            companyId: issues.companyId,
            projectId: issues.projectId,
            goalId: issues.goalId,
            parentId: issues.parentId,
            identifier: issues.identifier,
            title: issues.title,
            description: issues.description,
          })
          .from(issues)
          .where(
            and(eq(issues.id, issueId), eq(issues.companyId, agent.companyId)),
          )
          .then((rows) => rows[0] ?? null)
      : null;

    applyIssuePromptContext(enrichedContextSnapshot, issueContext);

    try {
      const memoryContext = await memorySvc.hydrateRunContext({
        companyId: agent.companyId,
        agentId: agent.id,
        projectId: readNonEmptyString(enrichedContextSnapshot.projectId),
        text: issueId ?? taskKey ?? "",
      });
      enrichedContextSnapshot.paperclipMemory =
        memorySvc.asReflectionOutput(memoryContext);
    } catch (err) {
      logger.warn(
        {
          err,
          companyId: agent.companyId,
          agentId: agent.id,
          issueId,
        },
        "Failed to hydrate wake memory context",
      );
    }

    if (
      agent.status === "paused" ||
      agent.status === "terminated" ||
      agent.status === "pending_approval"
    ) {
      throw conflict("Agent is not invokable in its current state", {
        status: agent.status,
      });
    }

    const policy = parseHeartbeatPolicy(agent);
    const writeSkippedRequest = async (reason: string) => {
      await db.insert(agentWakeupRequests).values({
        companyId: agent.companyId,
        agentId,
        source,
        triggerDetail,
        reason,
        payload,
        status: "skipped",
        requestedByActorType: opts.requestedByActorType ?? null,
        requestedByActorId: opts.requestedByActorId ?? null,
        idempotencyKey: opts.idempotencyKey ?? null,
        finishedAt: new Date(),
      });
    };

    if (!isWakeSourceEnabled(policy, source)) {
      await writeSkippedRequest(resolveWakeupDisabledReason(source));
      return null;
    }

    if (requiresGovernedWorkPacket(source) && !workPacketId) {
      await writeSkippedRequest("governance.work_packet_required");
      return null;
    }

    const bypassIssueExecutionLock =
      reason === "issue_comment_mentioned" ||
      readNonEmptyString(enrichedContextSnapshot.wakeReason) ===
        "issue_comment_mentioned";

    if (issueId && !bypassIssueExecutionLock) {
      const agentNameKey = normalizeAgentNameKey(agent.name);
      const sessionBefore = await resolveSessionBeforeForWakeup(agent, taskKey);

      const outcome = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select id from issues where id = ${issueId} and company_id = ${agent.companyId} for update`,
        );

        const issue = await tx
          .select({
            id: issues.id,
            companyId: issues.companyId,
            executionRunId: issues.executionRunId,
            executionAgentNameKey: issues.executionAgentNameKey,
          })
          .from(issues)
          .where(
            and(eq(issues.id, issueId), eq(issues.companyId, agent.companyId)),
          )
          .then((rows) => rows[0] ?? null);

        if (!issue) {
          await tx.insert(agentWakeupRequests).values({
            companyId: agent.companyId,
            agentId,
            source,
            triggerDetail,
            reason: "issue_execution_issue_not_found",
            payload,
            status: "skipped",
            requestedByActorType: opts.requestedByActorType ?? null,
            requestedByActorId: opts.requestedByActorId ?? null,
            idempotencyKey: opts.idempotencyKey ?? null,
            finishedAt: new Date(),
          });
          return { kind: "skipped" as const };
        }

        let activeExecutionRun = issue.executionRunId
          ? await tx
              .select()
              .from(heartbeatRuns)
              .where(eq(heartbeatRuns.id, issue.executionRunId))
              .then((rows) => rows[0] ?? null)
          : null;

        if (
          activeExecutionRun &&
          activeExecutionRun.status !== "queued" &&
          activeExecutionRun.status !== "running" &&
          activeExecutionRun.status !== "recovering"
        ) {
          activeExecutionRun = null;
        }

        if (!activeExecutionRun && issue.executionRunId) {
          await tx
            .update(issues)
            .set({
              executionRunId: null,
              executionAgentNameKey: null,
              executionLockedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(issues.id, issue.id));
        }

        if (!activeExecutionRun) {
          const legacyRun = await tx
            .select()
            .from(heartbeatRuns)
            .where(
              and(
                eq(heartbeatRuns.companyId, issue.companyId),
                inArray(heartbeatRuns.status, [
                  "queued",
                  "running",
                  "recovering",
                ]),
                sql`${heartbeatRuns.contextSnapshot} ->> 'issueId' = ${issue.id}`,
              ),
            )
            .orderBy(
              sql`case when ${heartbeatRuns.status} in ('running', 'recovering') then 0 else 1 end`,
              asc(heartbeatRuns.createdAt),
            )
            .limit(1)
            .then((rows) => rows[0] ?? null);

          if (legacyRun) {
            activeExecutionRun = legacyRun;
            const legacyAgent = await tx
              .select({ name: agents.name })
              .from(agents)
              .where(eq(agents.id, legacyRun.agentId))
              .then((rows) => rows[0] ?? null);
            await tx
              .update(issues)
              .set({
                executionRunId: legacyRun.id,
                executionAgentNameKey: normalizeAgentNameKey(legacyAgent?.name),
                executionLockedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(issues.id, issue.id));
          }
        }

        if (activeExecutionRun) {
          const executionAgent = await tx
            .select({ name: agents.name })
            .from(agents)
            .where(eq(agents.id, activeExecutionRun.agentId))
            .then((rows) => rows[0] ?? null);
          const executionAgentNameKey =
            normalizeAgentNameKey(issue.executionAgentNameKey) ??
            normalizeAgentNameKey(executionAgent?.name);
          const isSameExecutionAgent =
            Boolean(executionAgentNameKey) &&
            executionAgentNameKey === agentNameKey;
          const shouldQueueFollowupForCommentWake =
            Boolean(wakeCommentId) &&
            activeExecutionRun.status === "running" &&
            isSameExecutionAgent;

          if (isSameExecutionAgent && !shouldQueueFollowupForCommentWake) {
            const mergedContextSnapshot = mergeCoalescedContextSnapshot(
              activeExecutionRun.contextSnapshot,
              enrichedContextSnapshot,
            );
            const mergedRun = await tx
              .update(heartbeatRuns)
              .set({
                contextSnapshot: mergedContextSnapshot,
                updatedAt: new Date(),
              })
              .where(eq(heartbeatRuns.id, activeExecutionRun.id))
              .returning()
              .then((rows) => rows[0] ?? activeExecutionRun);

            await tx.insert(agentWakeupRequests).values({
              companyId: agent.companyId,
              agentId,
              source,
              triggerDetail,
              reason: "issue_execution_same_name",
              payload,
              status: "coalesced",
              coalescedCount: 1,
              requestedByActorType: opts.requestedByActorType ?? null,
              requestedByActorId: opts.requestedByActorId ?? null,
              idempotencyKey: opts.idempotencyKey ?? null,
              runId: mergedRun.id,
              finishedAt: new Date(),
            });

            return { kind: "coalesced" as const, run: mergedRun };
          }

          const deferredPayload = {
            ...(payload ?? {}),
            issueId,
            [DEFERRED_WAKE_CONTEXT_KEY]: enrichedContextSnapshot,
          };

          const existingDeferred = await tx
            .select()
            .from(agentWakeupRequests)
            .where(
              and(
                eq(agentWakeupRequests.companyId, agent.companyId),
                eq(agentWakeupRequests.agentId, agentId),
                eq(agentWakeupRequests.status, "deferred_issue_execution"),
                sql`${agentWakeupRequests.payload} ->> 'issueId' = ${issue.id}`,
              ),
            )
            .orderBy(asc(agentWakeupRequests.requestedAt))
            .limit(1)
            .then((rows) => rows[0] ?? null);

          if (existingDeferred) {
            const existingDeferredPayload = parseObject(
              existingDeferred.payload,
            );
            const existingDeferredContext = parseObject(
              existingDeferredPayload[DEFERRED_WAKE_CONTEXT_KEY],
            );
            const mergedDeferredContext = mergeCoalescedContextSnapshot(
              existingDeferredContext,
              enrichedContextSnapshot,
            );
            const mergedDeferredPayload = {
              ...existingDeferredPayload,
              ...(payload ?? {}),
              issueId,
              [DEFERRED_WAKE_CONTEXT_KEY]: mergedDeferredContext,
            };

            await tx
              .update(agentWakeupRequests)
              .set({
                payload: mergedDeferredPayload,
                coalescedCount: (existingDeferred.coalescedCount ?? 0) + 1,
                updatedAt: new Date(),
              })
              .where(eq(agentWakeupRequests.id, existingDeferred.id));

            return { kind: "deferred" as const };
          }

          await tx.insert(agentWakeupRequests).values({
            companyId: agent.companyId,
            agentId,
            source,
            triggerDetail,
            reason: "issue_execution_deferred",
            payload: deferredPayload,
            status: "deferred_issue_execution",
            requestedByActorType: opts.requestedByActorType ?? null,
            requestedByActorId: opts.requestedByActorId ?? null,
            idempotencyKey: opts.idempotencyKey ?? null,
          });

          return { kind: "deferred" as const };
        }

        const wakeupRequest = await tx
          .insert(agentWakeupRequests)
          .values({
            companyId: agent.companyId,
            agentId,
            source,
            triggerDetail,
            reason,
            payload,
            status: "queued",
            requestedByActorType: opts.requestedByActorType ?? null,
            requestedByActorId: opts.requestedByActorId ?? null,
            idempotencyKey: opts.idempotencyKey ?? null,
          })
          .returning()
          .then((rows) => rows[0]);

        const newRun = await tx
          .insert(heartbeatRuns)
          .values({
            companyId: agent.companyId,
            agentId,
            invocationSource: source,
            triggerDetail,
            status: "queued",
            wakeupRequestId: wakeupRequest.id,
            contextSnapshot: enrichedContextSnapshot,
            sessionIdBefore: sessionBefore,
          })
          .returning()
          .then((rows) => rows[0]);

        await tx
          .update(agentWakeupRequests)
          .set({
            runId: newRun.id,
            updatedAt: new Date(),
          })
          .where(eq(agentWakeupRequests.id, wakeupRequest.id));

        await tx
          .update(issues)
          .set({
            executionRunId: newRun.id,
            executionAgentNameKey: agentNameKey,
            executionLockedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(issues.id, issue.id));

        return { kind: "queued" as const, run: newRun };
      });

      if (outcome.kind === "deferred" || outcome.kind === "skipped")
        return null;
      if (outcome.kind === "coalesced") return outcome.run;

      const newRun = outcome.run;
      publishLiveEvent({
        companyId: newRun.companyId,
        type: "heartbeat.run.queued",
        payload: {
          runId: newRun.id,
          agentId: newRun.agentId,
          invocationSource: newRun.invocationSource,
          triggerDetail: newRun.triggerDetail,
          wakeupRequestId: newRun.wakeupRequestId,
        },
      });

      await startNextQueuedRunForAgent(agent.id);
      return newRun;
    }

    const activeRuns = await db
      .select()
      .from(heartbeatRuns)
      .where(
        and(
          eq(heartbeatRuns.agentId, agentId),
          inArray(heartbeatRuns.status, ["queued", "running"]),
        ),
      )
      .orderBy(desc(heartbeatRuns.createdAt));

    const sameScopeQueuedRun = activeRuns.find(
      (candidate) =>
        candidate.status === "queued" &&
        isSameTaskScope(runTaskKey(candidate), taskKey),
    );
    const sameScopeRunningRun = activeRuns.find(
      (candidate) =>
        candidate.status === "running" &&
        isSameTaskScope(runTaskKey(candidate), taskKey),
    );
    const shouldQueueFollowupForCommentWake =
      Boolean(wakeCommentId) &&
      Boolean(sameScopeRunningRun) &&
      !sameScopeQueuedRun;

    const coalescedTargetRun =
      sameScopeQueuedRun ??
      (shouldQueueFollowupForCommentWake ? null : sameScopeRunningRun ?? null);

    if (coalescedTargetRun) {
      const mergedContextSnapshot = mergeCoalescedContextSnapshot(
        coalescedTargetRun.contextSnapshot,
        contextSnapshot,
      );
      const mergedRun = await db
        .update(heartbeatRuns)
        .set({
          contextSnapshot: mergedContextSnapshot,
          updatedAt: new Date(),
        })
        .where(eq(heartbeatRuns.id, coalescedTargetRun.id))
        .returning()
        .then((rows) => rows[0] ?? coalescedTargetRun);

      await db.insert(agentWakeupRequests).values({
        companyId: agent.companyId,
        agentId,
        source,
        triggerDetail,
        reason,
        payload,
        status: "coalesced",
        coalescedCount: 1,
        requestedByActorType: opts.requestedByActorType ?? null,
        requestedByActorId: opts.requestedByActorId ?? null,
        idempotencyKey: opts.idempotencyKey ?? null,
        runId: mergedRun.id,
        finishedAt: new Date(),
      });
      return mergedRun;
    }

    const wakeupRequest = await db
      .insert(agentWakeupRequests)
      .values({
        companyId: agent.companyId,
        agentId,
        source,
        triggerDetail,
        reason,
        payload,
        status: "queued",
        requestedByActorType: opts.requestedByActorType ?? null,
        requestedByActorId: opts.requestedByActorId ?? null,
        idempotencyKey: opts.idempotencyKey ?? null,
      })
      .returning()
      .then((rows) => rows[0]);

    const sessionBefore = await resolveSessionBeforeForWakeup(agent, taskKey);

    const newRun = await db
      .insert(heartbeatRuns)
      .values({
        companyId: agent.companyId,
        agentId,
        invocationSource: source,
        triggerDetail,
        status: "queued",
        wakeupRequestId: wakeupRequest.id,
        contextSnapshot: enrichedContextSnapshot,
        sessionIdBefore: sessionBefore,
      })
      .returning()
      .then((rows) => rows[0]);

    await db
      .update(agentWakeupRequests)
      .set({
        runId: newRun.id,
        updatedAt: new Date(),
      })
      .where(eq(agentWakeupRequests.id, wakeupRequest.id));

    publishLiveEvent({
      companyId: newRun.companyId,
      type: "heartbeat.run.queued",
      payload: {
        runId: newRun.id,
        agentId: newRun.agentId,
        invocationSource: newRun.invocationSource,
        triggerDetail: newRun.triggerDetail,
        wakeupRequestId: newRun.wakeupRequestId,
      },
    });

    await startNextQueuedRunForAgent(agent.id);

    return newRun;
  }

  return {
    list: async (companyId: string, agentId?: string, limit?: number) => {
      const query = db
        .select(heartbeatRunListColumns)
        .from(heartbeatRuns)
        .where(
          agentId
            ? and(
                eq(heartbeatRuns.companyId, companyId),
                eq(heartbeatRuns.agentId, agentId),
              )
            : eq(heartbeatRuns.companyId, companyId),
        )
        .orderBy(desc(heartbeatRuns.createdAt));

      const rows = limit ? await query.limit(limit) : await query;
      return rows.map((row) => ({
        ...row,
        resultJson: summarizeHeartbeatRunResultJson(row.resultJson),
      }));
    },

    getRun,

    getRuntimeState: async (agentId: string) => {
      const state = await getRuntimeState(agentId);
      const agent = await getAgent(agentId);
      if (!agent) return null;
      const ensured = state ?? (await ensureRuntimeState(agent));
      const latestTaskSession = await db
        .select()
        .from(agentTaskSessions)
        .where(
          and(
            eq(agentTaskSessions.companyId, agent.companyId),
            eq(agentTaskSessions.agentId, agent.id),
          ),
        )
        .orderBy(desc(agentTaskSessions.updatedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null);
      return {
        ...ensured,
        sessionDisplayId:
          latestTaskSession?.sessionDisplayId ?? ensured.sessionId,
        sessionParamsJson: latestTaskSession?.sessionParamsJson ?? null,
      };
    },

    refreshQuotaSnapshot: async (
      agentId: string,
      opts?: { trigger?: "manual"; adapterResultJson?: unknown },
    ) => {
      const agent = await getAgent(agentId);
      if (!agent) throw notFound("Agent not found");

      const runtime = await ensureRuntimeState(agent);
      const runtimeState = parseObject(runtime.stateJson);
      const latestRun =
        opts?.adapterResultJson !== undefined
          ? null
          : await db
              .select({
                id: heartbeatRuns.id,
                resultJson: heartbeatRuns.resultJson,
              })
              .from(heartbeatRuns)
              .where(
                and(
                  eq(heartbeatRuns.companyId, agent.companyId),
                  eq(heartbeatRuns.agentId, agent.id),
                ),
              )
              .orderBy(desc(heartbeatRuns.createdAt))
              .limit(1)
              .then((rows) => rows[0] ?? null);

      const refresh = refreshGeminiRuntimeQuotaSnapshot({
        runtimeConfig: parseObject(agent.runtimeConfig),
        runtimeState,
        trigger: opts?.trigger ?? "manual",
        adapterResultJson: opts?.adapterResultJson ?? latestRun?.resultJson,
      });

      if (refresh.runtimeStateChanged) {
        await persistRuntimeStatePatch(agent.id, refresh.runtimeStatePatch);
      }

      return {
        ...refresh,
        latestRunId: latestRun?.id ?? null,
      };
    },

    listTaskSessions: async (agentId: string) => {
      const agent = await getAgent(agentId);
      if (!agent) throw notFound("Agent not found");

      return db
        .select()
        .from(agentTaskSessions)
        .where(
          and(
            eq(agentTaskSessions.companyId, agent.companyId),
            eq(agentTaskSessions.agentId, agentId),
          ),
        )
        .orderBy(
          desc(agentTaskSessions.updatedAt),
          desc(agentTaskSessions.createdAt),
        );
    },

    resetRuntimeSession: async (
      agentId: string,
      opts?: { taskKey?: string | null },
    ) => {
      const agent = await getAgent(agentId);
      if (!agent) throw notFound("Agent not found");
      await ensureRuntimeState(agent);
      const taskKey = readNonEmptyString(opts?.taskKey);
      const clearedTaskSessions = await clearTaskSessions(
        agent.companyId,
        agent.id,
        taskKey ? { taskKey, adapterType: agent.adapterType } : undefined,
      );
      const runtimePatch: Partial<typeof agentRuntimeState.$inferInsert> = {
        sessionId: null,
        lastError: null,
        updatedAt: new Date(),
      };
      if (!taskKey) {
        runtimePatch.stateJson = {};
      }

      const updated = await db
        .update(agentRuntimeState)
        .set(runtimePatch)
        .where(eq(agentRuntimeState.agentId, agentId))
        .returning()
        .then((rows) => rows[0] ?? null);

      if (!updated) return null;
      return {
        ...updated,
        sessionDisplayId: null,
        sessionParamsJson: null,
        clearedTaskSessions,
      };
    },

    listEvents: (runId: string, afterSeq = 0, limit = 200) =>
      db
        .select()
        .from(heartbeatRunEvents)
        .where(
          and(
            eq(heartbeatRunEvents.runId, runId),
            gt(heartbeatRunEvents.seq, afterSeq),
          ),
        )
        .orderBy(asc(heartbeatRunEvents.seq))
        .limit(Math.max(1, Math.min(limit, 1000))),

    readLog: async (
      runId: string,
      opts?: { offset?: number; limitBytes?: number },
    ) => {
      const run = await getRun(runId);
      if (!run) throw notFound("Heartbeat run not found");
      if (!run.logStore || !run.logRef) throw notFound("Run log not found");

      const result = await runLogStore.read(
        {
          store: run.logStore as "local_file",
          logRef: run.logRef,
        },
        opts,
      );

      return {
        runId,
        store: run.logStore,
        logRef: run.logRef,
        ...result,
        content: redactCurrentUserText(result.content),
      };
    },

    invoke: async (
      agentId: string,
      source: "timer" | "assignment" | "on_demand" | "automation" = "on_demand",
      contextSnapshot: Record<string, unknown> = {},
      triggerDetail: "manual" | "ping" | "callback" | "system" = "manual",
      actor?: {
        actorType?: "user" | "agent" | "system";
        actorId?: string | null;
      },
    ) =>
      enqueueWakeup(agentId, {
        source,
        triggerDetail,
        contextSnapshot,
        requestedByActorType: actor?.actorType,
        requestedByActorId: actor?.actorId ?? null,
      }),

    wakeup: enqueueWakeup,

    reapOrphanedRuns,

    resumeQueuedRuns,

    tickTimers: async (now = new Date()) => {
      const allAgents = await db.select().from(agents);
      let checked = 0;
      let enqueued = 0;
      let skipped = 0;

      for (const agent of allAgents) {
        if (
          agent.status === "paused" ||
          agent.status === "terminated" ||
          agent.status === "pending_approval"
        )
          continue;
        const policy = parseHeartbeatPolicy(agent);
        if (!policy.enabled || policy.intervalSec <= 0) continue;

        checked += 1;
        const baseline = new Date(
          agent.lastHeartbeatAt ?? agent.createdAt,
        ).getTime();
        const elapsedMs = now.getTime() - baseline;
        if (elapsedMs < policy.intervalSec * 1000) continue;

        const run = await enqueueWakeup(agent.id, {
          source: "timer",
          triggerDetail: "system",
          reason: "heartbeat_timer",
          requestedByActorType: "system",
          requestedByActorId: "heartbeat_scheduler",
          contextSnapshot: {
            workPacketId: `timer:${agent.id}:${now.toISOString()}`,
            source: "scheduler",
            reason: "interval_elapsed",
            now: now.toISOString(),
          },
        });
        if (run) enqueued += 1;
        else skipped += 1;
      }

      return { checked, enqueued, skipped };
    },

    cancelRun: async (runId: string) => {
      const run = await getRun(runId);
      if (!run) throw notFound("Heartbeat run not found");
      if (
        run.status !== "running" &&
        run.status !== "queued" &&
        run.status !== "recovering"
      ) {
        return run;
      }

      const running = runningProcesses.get(run.id);
      if (running) {
        running.child.kill("SIGTERM");
        const graceMs = Math.max(1, running.graceSec) * 1000;
        setTimeout(() => {
          if (!running.child.killed) {
            running.child.kill("SIGKILL");
          }
        }, graceMs);
      }

      const cancelled = await setRunStatus(run.id, "cancelled", {
        finishedAt: new Date(),
        error: "Cancelled by control plane",
        errorCode: "cancelled",
      });

      await setWakeupStatus(run.wakeupRequestId, "cancelled", {
        finishedAt: new Date(),
        error: "Cancelled by control plane",
      });

      if (cancelled) {
        await appendRunEvent(cancelled, 1, {
          eventType: "lifecycle",
          stream: "system",
          level: "warn",
          message: "run cancelled",
        });
        await releaseIssueExecutionAndPromote(cancelled);
      }

      runningProcesses.delete(run.id);
      await finalizeAgentStatus(run.agentId, "cancelled");
      await startNextQueuedRunForAgent(run.agentId);
      return cancelled;
    },

    cancelActiveForAgent: async (agentId: string) => {
      const runs = await db
        .select()
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.agentId, agentId),
            inArray(heartbeatRuns.status, ["queued", "running"]),
          ),
        );

      for (const run of runs) {
        await setRunStatus(run.id, "cancelled", {
          finishedAt: new Date(),
          error: "Cancelled due to agent pause",
          errorCode: "cancelled",
        });

        await setWakeupStatus(run.wakeupRequestId, "cancelled", {
          finishedAt: new Date(),
          error: "Cancelled due to agent pause",
        });

        const running = runningProcesses.get(run.id);
        if (running) {
          running.child.kill("SIGTERM");
          runningProcesses.delete(run.id);
        }
        await releaseIssueExecutionAndPromote(run);
      }

      return runs.length;
    },

    getActiveRunForAgent: async (agentId: string) => {
      const [run] = await db
        .select()
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.agentId, agentId),
            eq(heartbeatRuns.status, "running"),
          ),
        )
        .orderBy(desc(heartbeatRuns.startedAt))
        .limit(1);
      return run ?? null;
    },
  };
}
