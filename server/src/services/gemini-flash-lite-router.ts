import { randomUUID } from "node:crypto";
import path from "node:path";
import type { IssueExecutionPacketArtifactKind } from "@paperclipai/shared";
import {
  ensureCommandResolvable,
  ensurePathInEnv,
  parseObject,
} from "../adapters/utils.js";
import { runChildProcess } from "@paperclipai/adapter-utils/server-utils";
import { parseGeminiJsonl } from "@paperclipai/adapter-gemini-local/server";

type BucketName = "flash" | "pro" | "flash-lite";
type PacketType =
  | "deterministic_tool"
  | "free_api"
  | "premium_model"
  | "local_model";
type TaskClass =
  | "research-light"
  | "bounded-implementation"
  | "heavy-architecture"
  | "benchmark-floor";
type BudgetClass = "small" | "medium" | "large";
type ExecutionIntent =
  | "investigate"
  | "implement"
  | "review"
  | "benchmark"
  | "plan";
type RiskLevel = "low" | "medium" | "high";

export type GeminiFlashLiteParseStatus =
  | "ok"
  | "invalid_json"
  | "schema_invalid"
  | "timeout"
  | "command_error"
  | "not_attempted";

export interface GeminiFlashLiteProposal {
  taskClass: TaskClass;
  budgetClass: BudgetClass;
  executionIntent: ExecutionIntent;
  targetFile: string;
  targetFolder: string;
  artifactKind: IssueExecutionPacketArtifactKind;
  doneWhen: string;
  riskLevel: RiskLevel;
  missingInputs: string[];
  needsApproval: boolean;
  chosenBucket: BucketName;
  chosenModelLane: string;
  fallbackBucket: BucketName;
  allowedSkills: string[];
  rationale: string;
}

export interface GeminiFlashLiteRouterInput {
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  runtimeState?: Record<string, unknown>;
  context: Record<string, unknown>;
  quotaSnapshot: Record<string, unknown>;
  allowedBuckets: BucketName[];
  allowedModelLanes: string[];
  allowedSkillPool: string[];
  manualOverride: Record<string, unknown> | null;
}

export interface GeminiFlashLiteRouterHealth {
  successCount: number;
  fallbackCount: number;
  timeoutCount: number;
  parseFailCount: number;
  commandErrorCount: number;
  cacheHitCount: number;
  circuitOpenCount: number;
  consecutiveFailures: number;
  breakerOpenUntil: string | null;
  lastLatencyMs: number | null;
  lastErrorReason: string | null;
}

export interface GeminiFlashLiteRouterResult {
  attempted: boolean;
  source: "flash_lite_call" | "heuristic_policy";
  proposal: GeminiFlashLiteProposal | null;
  parseStatus: GeminiFlashLiteParseStatus;
  latencyMs: number | null;
  warning: string | null;
  fallbackReason: string | null;
  cacheHit: boolean;
  runtimeStatePatch: Record<string, unknown>;
  routerHealth: GeminiFlashLiteRouterHealth;
}

type RouterRuntimeMetrics = {
  successCount: number;
  fallbackCount: number;
  timeoutCount: number;
  parseFailCount: number;
  commandErrorCount: number;
  cacheHitCount: number;
  circuitOpenCount: number;
  lastLatencyMs: number | null;
  lastErrorReason: string | null;
};

type RouterCacheEntry = {
  key: string;
  createdAt: string;
  hitCount: number;
  proposal: GeminiFlashLiteProposal;
};

type RouterRuntimeState = {
  breaker: {
    consecutiveFailures: number;
    openUntil: string | null;
  };
  cache: {
    entries: RouterCacheEntry[];
  };
  metrics: RouterRuntimeMetrics;
};

type RouterRuntimePolicy = {
  enabled: boolean;
  fallbackOnly: boolean;
  model: string;
  timeoutSec: number;
  breakerThreshold: number;
  breakerCooldownSec: number;
  cacheEnabled: boolean;
  cacheTtlSec: number;
  cacheMaxEntries: number;
};

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Math.floor(asNumber(value) ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function isBucket(value: string | null): value is BucketName {
  return value === "flash" || value === "pro" || value === "flash-lite";
}

function isPacketType(value: string | null): value is PacketType {
  return (
    value === "deterministic_tool" ||
    value === "free_api" ||
    value === "premium_model" ||
    value === "local_model"
  );
}

function readPacketType(context: Record<string, unknown>): PacketType | null {
  const direct = asString(context.packetType) ?? asString(context.packet_type);
  if (isPacketType(direct)) return direct;
  const budget = asObject(context.workPacketBudget);
  const fromBudget =
    asString(budget.packetType) ?? asString(budget.packet_type);
  return isPacketType(fromBudget) ? fromBudget : null;
}

function isTaskClass(value: string | null): value is TaskClass {
  return (
    value === "research-light" ||
    value === "bounded-implementation" ||
    value === "heavy-architecture" ||
    value === "benchmark-floor"
  );
}

function isBudgetClass(value: string | null): value is BudgetClass {
  return value === "small" || value === "medium" || value === "large";
}

function isExecutionIntent(value: string | null): value is ExecutionIntent {
  return (
    value === "investigate" ||
    value === "implement" ||
    value === "review" ||
    value === "benchmark" ||
    value === "plan"
  );
}

function isRiskLevel(value: string | null): value is RiskLevel {
  return value === "low" || value === "medium" || value === "high";
}

function normalizeArtifactKind(
  value: unknown,
): IssueExecutionPacketArtifactKind | null {
  const normalized = asString(value)?.toLowerCase().replace(/[\s-]+/g, "_");
  if (
    normalized === "code_patch" ||
    normalized === "doc_update" ||
    normalized === "config_change" ||
    normalized === "test_update" ||
    normalized === "multi_file_change" ||
    normalized === "folder_operation"
  ) {
    return normalized;
  }
  return null;
}

function normalizeMissingInputs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 8);
}

function defaultExecutionIntent(taskClass: TaskClass): ExecutionIntent {
  if (taskClass === "research-light") return "investigate";
  if (taskClass === "benchmark-floor") return "benchmark";
  if (taskClass === "heavy-architecture") return "plan";
  return "implement";
}

function defaultRiskLevel(input: {
  taskClass: TaskClass;
  budgetClass: BudgetClass;
}): RiskLevel {
  if (
    input.taskClass === "heavy-architecture" ||
    input.budgetClass === "large"
  ) {
    return "high";
  }
  if (input.taskClass === "research-light") return "low";
  return "medium";
}

function normalizeAllowedSkills(
  value: unknown,
  skillPool: string[],
): string[] {
  if (!Array.isArray(value)) return [];
  const pool = new Set(skillPool);
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && pool.has(entry))
    .slice(0, 16);
}

function coalesce(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (raw[key] !== undefined) return raw[key];
  }
  return undefined;
}

function normalizeProposalFromRaw(
  raw: Record<string, unknown>,
  skillPool: string[],
): GeminiFlashLiteProposal | null {
  const taskClass = asString(coalesce(raw, "taskClass", "task_class"));
  const budgetClass = asString(coalesce(raw, "budgetClass", "budget_class"));
  const chosenBucket = asString(coalesce(raw, "chosenBucket", "chosen_bucket"));
  const chosenModelLane = asString(coalesce(raw, "chosenModelLane", "chosen_model_lane"));
  const fallbackBucketRaw = asString(coalesce(raw, "fallbackBucket", "fallback_bucket"));
  const rationale = asString(raw.rationale);

  if (
    !isTaskClass(taskClass) ||
    !isBudgetClass(budgetClass) ||
    !isBucket(chosenBucket) ||
    !chosenModelLane ||
    !rationale
  ) {
    return null;
  }

  // fallbackBucket is optional — default to chosenBucket if missing or invalid
  const fallbackBucket: BucketName = isBucket(fallbackBucketRaw)
    ? fallbackBucketRaw
    : chosenBucket;

  const executionIntentRaw = asString(coalesce(raw, "executionIntent", "execution_intent"));
  const targetFileRaw = asString(coalesce(raw, "targetFile", "target_file"));
  const targetFolderRaw = asString(coalesce(raw, "targetFolder", "target_folder"));
  const artifactKindRaw = normalizeArtifactKind(
    coalesce(raw, "artifactKind", "artifact_kind"),
  );
  const doneWhenRaw = asString(coalesce(raw, "doneWhen", "done_when"));
  const riskLevelRaw = asString(coalesce(raw, "riskLevel", "risk_level"));
  const needsApprovalRaw = asBoolean(coalesce(raw, "needsApproval", "needs_approval"));
  const allowedSkillsRaw = coalesce(raw, "allowedSkills", "allowed_skills");

  return {
    taskClass,
    budgetClass,
    executionIntent: isExecutionIntent(executionIntentRaw)
      ? executionIntentRaw
      : defaultExecutionIntent(taskClass),
    targetFile: targetFileRaw ?? "none",
    targetFolder: targetFolderRaw ?? ".",
    artifactKind: artifactKindRaw ?? "multi_file_change",
    doneWhen:
      doneWhenRaw ??
      "Provide a concise completion summary and validation evidence.",
    riskLevel: isRiskLevel(riskLevelRaw)
      ? riskLevelRaw
      : defaultRiskLevel({ taskClass, budgetClass }),
    missingInputs: normalizeMissingInputs(coalesce(raw, "missingInputs", "missing_inputs")),
    needsApproval: needsApprovalRaw ?? false,
    chosenBucket,
    chosenModelLane,
    fallbackBucket,
    allowedSkills: normalizeAllowedSkills(allowedSkillsRaw, skillPool),
    rationale,
  };
}

function normalizeFreeTextTask(context: Record<string, unknown>): string {
  const paperclipIssue = asObject(context.paperclipIssue);
  const issueTitle =
    asString(paperclipIssue.title) ??
    asString(context.issueIdentifier) ??
    asString(context.title) ??
    "";
  const issueDescription = asString(paperclipIssue.description) ?? "";
  const issueTaskText = [issueTitle, issueDescription]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n")
    .slice(0, 1200);
  if (issueTaskText.length > 0) {
    return issueTaskText;
  }

  const prompt = asString(context.paperclipTaskPrompt) ?? "";
  const wakeReason = asString(context.wakeReason) ?? "";
  const title = asString(context.title) ?? "";
  const parts = [prompt, wakeReason, title]
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.join("\n").slice(0, 1200);
}

function hasReadyExecutionPacketTruth(
  context: Record<string, unknown>,
): boolean {
  const packetTruth = asObject(context.paperclipIssueExecutionPacketTruth);
  const ready =
    asBoolean(packetTruth.ready) === true ||
    asString(packetTruth.status) === "ready";
  if (!ready) return false;

  const targetFile =
    asString(packetTruth.targetFile) ??
    asString(context.paperclipExecutionPacketTargetFile);
  const targetFolder =
    asString(packetTruth.targetFolder) ??
    asString(context.paperclipExecutionPacketTargetFolder);
  const artifactKind =
    normalizeArtifactKind(packetTruth.artifactKind) ??
    normalizeArtifactKind(context.paperclipExecutionPacketArtifactKind);
  const doneWhen =
    asString(packetTruth.doneWhen) ??
    asString(context.paperclipExecutionPacketDoneWhen);

  const hasTarget = Boolean(targetFile || targetFolder);
  return hasTarget && Boolean(artifactKind) && Boolean(doneWhen);
}

function normalizeSimilarityKey(input: {
  taskText: string;
  allowedBuckets: BucketName[];
  allowedModelLanes: string[];
  allowedSkillPool: string[];
  manualOverride: Record<string, unknown> | null;
}): string {
  const normalizedTask = input.taskText
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 480);
  const override = input.manualOverride
    ? JSON.stringify(input.manualOverride)
    : "none";
  const signature = JSON.stringify({
    task: normalizedTask,
    buckets: [...input.allowedBuckets].sort(),
    lanes: [...input.allowedModelLanes].sort(),
    skills: [...input.allowedSkillPool].sort(),
    override,
  });
  return signature;
}

function readRouterPolicy(
  runtimeConfig: Record<string, unknown>,
): RouterRuntimePolicy {
  const runtimeRouting = asObject(runtimeConfig.routingPolicy);
  const routerConfig = asObject(runtimeRouting.llmRouter);
  const breakerConfig = asObject(routerConfig.circuitBreaker);
  const cacheConfig = asObject(routerConfig.cache);
  const enabled = asBoolean(routerConfig.enabled) ?? true;
  const fallbackOnly =
    asBoolean(routerConfig.fallbackOnly) ??
    asBoolean(routerConfig.fallback_only) ??
    false;
  return {
    enabled,
    fallbackOnly,
    model: asString(routerConfig.model) ?? "gemini-2.5-flash-lite",
    timeoutSec: clampInt(routerConfig.timeoutSec, 30, 2, 90),
    breakerThreshold: clampInt(breakerConfig.threshold, 3, 1, 10),
    breakerCooldownSec: clampInt(breakerConfig.cooldownSec, 90, 10, 900),
    cacheEnabled: asBoolean(cacheConfig.enabled) ?? true,
    cacheTtlSec: clampInt(cacheConfig.ttlSec, 120, 10, 1800),
    cacheMaxEntries: clampInt(cacheConfig.maxEntries, 64, 1, 256),
  };
}

function parseRuntimeState(
  runtimeState: Record<string, unknown> | undefined,
): RouterRuntimeState {
  const controlPlane = asObject(asObject(runtimeState).controlPlane);
  const routerRuntime = asObject(controlPlane.routerRuntime);
  const breaker = asObject(routerRuntime.breaker);
  const cache = asObject(routerRuntime.cache);
  const metrics = asObject(routerRuntime.metrics);

  const entries = Array.isArray(cache.entries)
    ? (cache.entries as unknown[])
        .map((entry) => {
          const raw = asObject(entry);
          const key = asString(raw.key);
          const createdAt = asString(raw.createdAt);
          const proposal = asObject(raw.proposal);
          const normalizedProposal = normalizeProposalFromRaw(proposal, []);
          if (!key || !createdAt || !normalizedProposal) {
            return null;
          }
          return {
            key,
            createdAt,
            hitCount: Math.max(0, Math.floor(asNumber(raw.hitCount) ?? 0)),
            proposal: normalizedProposal,
          } satisfies RouterCacheEntry;
        })
        .filter((entry): entry is RouterCacheEntry => entry !== null)
    : [];

  return {
    breaker: {
      consecutiveFailures: Math.max(
        0,
        Math.floor(asNumber(breaker.consecutiveFailures) ?? 0),
      ),
      openUntil: asString(breaker.openUntil),
    },
    cache: {
      entries,
    },
    metrics: {
      successCount: Math.max(
        0,
        Math.floor(asNumber(metrics.successCount) ?? 0),
      ),
      fallbackCount: Math.max(
        0,
        Math.floor(asNumber(metrics.fallbackCount) ?? 0),
      ),
      timeoutCount: Math.max(
        0,
        Math.floor(asNumber(metrics.timeoutCount) ?? 0),
      ),
      parseFailCount: Math.max(
        0,
        Math.floor(asNumber(metrics.parseFailCount) ?? 0),
      ),
      commandErrorCount: Math.max(
        0,
        Math.floor(asNumber(metrics.commandErrorCount) ?? 0),
      ),
      cacheHitCount: Math.max(
        0,
        Math.floor(asNumber(metrics.cacheHitCount) ?? 0),
      ),
      circuitOpenCount: Math.max(
        0,
        Math.floor(asNumber(metrics.circuitOpenCount) ?? 0),
      ),
      lastLatencyMs: asNumber(metrics.lastLatencyMs),
      lastErrorReason: asString(metrics.lastErrorReason),
    },
  };
}

function isBreakerOpen(openUntil: string | null, nowMs: number): boolean {
  if (!openUntil) return false;
  const openUntilMs = Date.parse(openUntil);
  if (!Number.isFinite(openUntilMs)) return false;
  return nowMs < openUntilMs;
}

function buildRuntimePatch(next: RouterRuntimeState): Record<string, unknown> {
  return {
    controlPlane: {
      routerRuntime: {
        breaker: next.breaker,
        cache: {
          entries: next.cache.entries,
        },
        metrics: next.metrics,
      },
    },
  };
}

function toRouterHealth(
  runtimeState: RouterRuntimeState,
): GeminiFlashLiteRouterHealth {
  return {
    successCount: runtimeState.metrics.successCount,
    fallbackCount: runtimeState.metrics.fallbackCount,
    timeoutCount: runtimeState.metrics.timeoutCount,
    parseFailCount: runtimeState.metrics.parseFailCount,
    commandErrorCount: runtimeState.metrics.commandErrorCount,
    cacheHitCount: runtimeState.metrics.cacheHitCount,
    circuitOpenCount: runtimeState.metrics.circuitOpenCount,
    consecutiveFailures: runtimeState.breaker.consecutiveFailures,
    breakerOpenUntil: runtimeState.breaker.openUntil,
    lastLatencyMs: runtimeState.metrics.lastLatencyMs,
    lastErrorReason: runtimeState.metrics.lastErrorReason,
  };
}

function updateRuntimeStateWithOutcome(input: {
  current: RouterRuntimeState;
  policy: RouterRuntimePolicy;
  nowIso: string;
  parseStatus: GeminiFlashLiteParseStatus;
  warning: string | null;
  latencyMs: number | null;
  cacheKey: string | null;
  proposal: GeminiFlashLiteProposal | null;
  cacheHit: boolean;
  attempted: boolean;
}): RouterRuntimeState {
  const next: RouterRuntimeState = {
    breaker: {
      ...input.current.breaker,
    },
    cache: {
      entries: [...input.current.cache.entries],
    },
    metrics: {
      ...input.current.metrics,
    },
  };

  const failedStatuses: GeminiFlashLiteParseStatus[] = [
    "invalid_json",
    "schema_invalid",
    "timeout",
    "command_error",
  ];

  const isFailure =
    input.attempted && failedStatuses.includes(input.parseStatus);
  const isSuccess = input.parseStatus === "ok" && input.proposal !== null;
  const isFallback = !isSuccess;

  if (isSuccess) {
    next.metrics.successCount += 1;
    next.breaker.consecutiveFailures = 0;
    next.breaker.openUntil = null;
    if (input.cacheHit) {
      next.metrics.cacheHitCount += 1;
    }
  }

  if (isFallback) {
    next.metrics.fallbackCount += 1;
  }

  if (input.parseStatus === "timeout") {
    next.metrics.timeoutCount += 1;
  }
  if (
    input.parseStatus === "invalid_json" ||
    input.parseStatus === "schema_invalid"
  ) {
    next.metrics.parseFailCount += 1;
  }
  if (input.parseStatus === "command_error") {
    next.metrics.commandErrorCount += 1;
  }

  if (isFailure) {
    next.breaker.consecutiveFailures += 1;
    if (next.breaker.consecutiveFailures >= input.policy.breakerThreshold) {
      next.breaker.openUntil = new Date(
        Date.parse(input.nowIso) + input.policy.breakerCooldownSec * 1000,
      ).toISOString();
      next.metrics.circuitOpenCount += 1;
    }
  }

  if (input.latencyMs !== null && Number.isFinite(input.latencyMs)) {
    next.metrics.lastLatencyMs = Math.max(0, Math.floor(input.latencyMs));
  }
  next.metrics.lastErrorReason = isSuccess ? null : input.warning;

  if (
    input.policy.cacheEnabled &&
    input.cacheKey &&
    input.proposal &&
    input.parseStatus === "ok" &&
    !input.cacheHit
  ) {
    const nowMs = Date.parse(input.nowIso);
    const ttlMs = input.policy.cacheTtlSec * 1000;
    const freshEntries = next.cache.entries.filter((entry) => {
      const entryMs = Date.parse(entry.createdAt);
      return Number.isFinite(entryMs) && nowMs - entryMs <= ttlMs;
    });
    const withoutSameKey = freshEntries.filter(
      (entry) => entry.key !== input.cacheKey,
    );
    next.cache.entries = [
      {
        key: input.cacheKey,
        createdAt: input.nowIso,
        hitCount: 0,
        proposal: input.proposal,
      },
      ...withoutSameKey,
    ].slice(0, input.policy.cacheMaxEntries);
  }

  if (input.cacheHit && input.cacheKey) {
    next.cache.entries = next.cache.entries.map((entry) =>
      entry.key === input.cacheKey
        ? {
            ...entry,
            hitCount: entry.hitCount + 1,
          }
        : entry,
    );
  }

  return next;
}

function buildStrictPrompt(input: {
  taskText: string;
  quotaSnapshot: Record<string, unknown>;
  allowedBuckets: BucketName[];
  allowedModelLanes: string[];
  allowedSkillPool: string[];
  manualOverride: Record<string, unknown> | null;
}): string {
  const body = {
    taskText: input.taskText,
    quotaSnapshot: input.quotaSnapshot,
    allowedBuckets: input.allowedBuckets,
    allowedModelLanes: input.allowedModelLanes,
    allowedSkillPool: input.allowedSkillPool,
    manualOverride: input.manualOverride,
    outputSchema: {
      taskClass: [
        "research-light",
        "bounded-implementation",
        "heavy-architecture",
        "benchmark-floor",
      ],
      budgetClass: ["small", "medium", "large"],
      executionIntent: [
        "investigate",
        "implement",
        "review",
        "benchmark",
        "plan",
      ],
      targetFile: "string (repo-relative file path or 'n/a')",
      targetFolder: "string (relative folder path)",
      artifactKind: [
        "code_patch",
        "doc_update",
        "config_change",
        "test_update",
        "multi_file_change",
        "folder_operation",
      ],
      doneWhen: "string (clear done-condition)",
      riskLevel: ["low", "medium", "high"],
      missingInputs: "string[] — only list genuinely ABSENT required inputs from the task description (e.g. 'target_file_not_specified', 'no_repository_url'). Do NOT list skills here. Leave empty [] if the task has all needed inputs.",
      needsApproval: "boolean",
      chosenBucket: ["flash", "pro", "flash-lite"],
      chosenModelLane: "string (must be one of allowedModelLanes)",
      fallbackBucket: ["flash", "pro", "flash-lite"],
      allowedSkills:
        "string[] (subset of allowedSkillPool — only include skills genuinely needed for this task)",
      rationale: "short string (founder-readable: task type, chosen bucket, why these skills)",
    },
  };

  return [
    "ROUTING CLASSIFIER MODE.",
    "You are a routing metadata classifier. Your ONLY job is to output a JSON routing decision.",
    "DO NOT call any tools. DO NOT read files. DO NOT search the web. DO NOT execute the task.",
    "Return ONLY one JSON object. No markdown, no prose, no explanation.",
    "Base your classification solely on the taskText description — do not look up any files.",
    "Choose values strictly from the provided enums and allowlists.",
    "allowedSkills must be a subset of allowedSkillPool. Omit skills not needed for this task.",
    "If uncertain, choose safe conservative defaults.",
    JSON.stringify(body),
  ].join("\n");
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function tryParseProposal(
  summary: string,
  skillPool: string[],
): {
  proposal: GeminiFlashLiteProposal | null;
  parseStatus: GeminiFlashLiteParseStatus;
} {
  const candidate = extractJsonObject(summary.trim());
  if (!candidate) {
    return { proposal: null, parseStatus: "invalid_json" };
  }

  let parsedRaw: Record<string, unknown>;
  try {
    parsedRaw = parseObject(JSON.parse(candidate));
  } catch {
    return { proposal: null, parseStatus: "invalid_json" };
  }

  const proposal = normalizeProposalFromRaw(parsedRaw, skillPool);
  if (!proposal) {
    return { proposal: null, parseStatus: "schema_invalid" };
  }

  return {
    parseStatus: "ok",
    proposal,
  };
}

export async function produceFlashLiteRoutingProposal(
  input: GeminiFlashLiteRouterInput,
): Promise<GeminiFlashLiteRouterResult> {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const policy = readRouterPolicy(input.runtimeConfig);
  const runtimeState = parseRuntimeState(input.runtimeState);

  const finalize = (result: {
    attempted: boolean;
    source: "flash_lite_call" | "heuristic_policy";
    proposal: GeminiFlashLiteProposal | null;
    parseStatus: GeminiFlashLiteParseStatus;
    latencyMs: number | null;
    warning: string | null;
    fallbackReason: string | null;
    cacheHit: boolean;
    cacheKey: string | null;
  }): GeminiFlashLiteRouterResult => {
    const nextRuntime = updateRuntimeStateWithOutcome({
      current: runtimeState,
      policy,
      nowIso,
      parseStatus: result.parseStatus,
      warning: result.warning,
      latencyMs: result.latencyMs,
      cacheKey: result.cacheKey,
      proposal: result.proposal,
      cacheHit: result.cacheHit,
      attempted: result.attempted,
    });
    return {
      attempted: result.attempted,
      source: result.source,
      proposal: result.proposal,
      parseStatus: result.parseStatus,
      latencyMs: result.latencyMs,
      warning: result.warning,
      fallbackReason: result.fallbackReason,
      cacheHit: result.cacheHit,
      runtimeStatePatch: buildRuntimePatch(nextRuntime),
      routerHealth: toRouterHealth(nextRuntime),
    };
  };

  if (input.adapterType !== "gemini_local") {
    return finalize({
      attempted: false,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "not_attempted",
      latencyMs: null,
      warning: null,
      fallbackReason: "adapter_not_gemini_local",
      cacheHit: false,
      cacheKey: null,
    });
  }

  const packetType = readPacketType(input.context);
  if (packetType === "deterministic_tool") {
    return finalize({
      attempted: false,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "not_attempted",
      latencyMs: null,
      warning: "flash_lite_router_skipped_deterministic_tool",
      fallbackReason: "deterministic_tool_no_llm_call",
      cacheHit: false,
      cacheKey: null,
    });
  }

  if (!policy.enabled) {
    return finalize({
      attempted: false,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "not_attempted",
      latencyMs: null,
      warning: "flash_lite_router_disabled",
      fallbackReason: "router_disabled",
      cacheHit: false,
      cacheKey: null,
    });
  }

  if (policy.fallbackOnly) {
    return finalize({
      attempted: false,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "not_attempted",
      latencyMs: null,
      warning: "flash_lite_router_fallback_only",
      fallbackReason: "router_fallback_only",
      cacheHit: false,
      cacheKey: null,
    });
  }

  if (hasReadyExecutionPacketTruth(input.context)) {
    return finalize({
      attempted: false,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "not_attempted",
      latencyMs: null,
      warning: "flash_lite_router_skipped_ready_packet_truth",
      fallbackReason: "ready_packet_truth",
      cacheHit: false,
      cacheKey: null,
    });
  }

  const taskText = normalizeFreeTextTask(input.context);
  const skillPool = input.allowedSkillPool;
  const cacheKey = normalizeSimilarityKey({
    taskText,
    allowedBuckets: input.allowedBuckets,
    allowedModelLanes: input.allowedModelLanes,
    allowedSkillPool: skillPool,
    manualOverride: input.manualOverride,
  });

  if (policy.cacheEnabled) {
    const ttlMs = policy.cacheTtlSec * 1000;
    const matchingEntry = runtimeState.cache.entries.find((entry) => {
      if (entry.key !== cacheKey) return false;
      const createdAtMs = Date.parse(entry.createdAt);
      if (!Number.isFinite(createdAtMs)) return false;
      return nowMs - createdAtMs <= ttlMs;
    });
    if (matchingEntry) {
      return finalize({
        attempted: false,
        source: "flash_lite_call",
        proposal: matchingEntry.proposal,
        parseStatus: "ok",
        latencyMs: 0,
        warning: null,
        fallbackReason: null,
        cacheHit: true,
        cacheKey,
      });
    }
  }

  if (isBreakerOpen(runtimeState.breaker.openUntil, nowMs)) {
    return finalize({
      attempted: false,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "not_attempted",
      latencyMs: null,
      warning: "flash_lite_router_circuit_open",
      fallbackReason: "circuit_open",
      cacheHit: false,
      cacheKey,
    });
  }

  const command = asString(input.adapterConfig.command) ?? "gemini";
  const cwd = asString(input.adapterConfig.cwd) ?? process.cwd();
  const envFromConfig = Object.fromEntries(
    Object.entries(parseObject(input.adapterConfig.env)).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const runtimeEnvWithPath = ensurePathInEnv({
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    ...envFromConfig,
  });
  const runtimeEnv: Record<string, string> = Object.fromEntries(
    Object.entries(runtimeEnvWithPath).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

  const model = policy.model;
  const timeoutSec = policy.timeoutSec;
  const prompt = buildStrictPrompt({
    taskText,
    quotaSnapshot: input.quotaSnapshot,
    allowedBuckets: input.allowedBuckets,
    allowedModelLanes: input.allowedModelLanes,
    allowedSkillPool: skillPool,
    manualOverride: input.manualOverride,
  });

  // Router calls must NEVER execute tasks — no tool approval, no yolo.
  // With piped stdin (prompt then EOF), any tool call attempt will fail immediately.
  const args = [
    "--output-format",
    "stream-json",
    "--model",
    model,
    "--sandbox=none",
  ];

  const startedAt = Date.now();
  let proc;
  try {
    await ensureCommandResolvable(command, cwd, runtimeEnv);
    proc = await runChildProcess(`routing-${randomUUID()}`, command, args, {
      cwd: path.resolve(cwd),
      env: runtimeEnv,
      timeoutSec,
      graceSec: 5,
      stdin: prompt,
      onLog: async () => {
        // Router call is intentionally silent in logs; only structured metadata is persisted.
      },
    });
  } catch {
    return finalize({
      attempted: true,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "command_error",
      latencyMs: Date.now() - startedAt,
      warning: "flash_lite_router_command_error",
      fallbackReason: "command_error",
      cacheHit: false,
      cacheKey,
    });
  }
  const latencyMs = Date.now() - startedAt;

  if (proc.timedOut) {
    return finalize({
      attempted: true,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "timeout",
      latencyMs,
      warning: "flash_lite_router_timeout",
      fallbackReason: "timeout",
      cacheHit: false,
      cacheKey,
    });
  }

  const parsed = parseGeminiJsonl(proc.stdout);
  const parsedProposal = tryParseProposal(parsed.summary, skillPool);
  if ((proc.exitCode ?? 0) !== 0 && parsedProposal.parseStatus !== "ok") {
    return finalize({
      attempted: true,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "command_error",
      latencyMs,
      warning: "flash_lite_router_non_zero_exit",
      fallbackReason: "command_error",
      cacheHit: false,
      cacheKey,
    });
  }
  if (parsedProposal.parseStatus !== "ok") {
    return finalize({
      attempted: true,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: parsedProposal.parseStatus,
      latencyMs,
      warning: `flash_lite_router_${parsedProposal.parseStatus}`,
      fallbackReason: parsedProposal.parseStatus,
      cacheHit: false,
      cacheKey,
    });
  }

  if (
    !input.allowedBuckets.includes(parsedProposal.proposal!.chosenBucket) ||
    !input.allowedBuckets.includes(parsedProposal.proposal!.fallbackBucket) ||
    !input.allowedModelLanes.includes(parsedProposal.proposal!.chosenModelLane)
  ) {
    return finalize({
      attempted: true,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "schema_invalid",
      latencyMs,
      warning: "flash_lite_router_disallowed_value",
      fallbackReason: "schema_invalid",
      cacheHit: false,
      cacheKey,
    });
  }

  return finalize({
    attempted: true,
    source: "flash_lite_call",
    proposal: parsedProposal.proposal,
    parseStatus: "ok",
    latencyMs,
    warning: null,
    fallbackReason: null,
    cacheHit: false,
    cacheKey,
  });
}
