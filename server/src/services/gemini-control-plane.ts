import {
  ingestGeminiQuotaSnapshot,
  type GeminiQuotaBucketSnapshot,
} from "./gemini-quota-snapshot.js";
import type { IssueExecutionPacketArtifactKind } from "@paperclipai/shared";

type BucketName = "flash" | "pro" | "flash-lite";
type TaskType =
  | "research-light"
  | "bounded-implementation"
  | "heavy-architecture"
  | "benchmark-floor";
type RoutingMode = "advisory" | "soft_enforced";
type BucketState = "ok" | "cooldown" | "exhausted" | "unknown";

type BudgetClass = "small" | "medium" | "large";
type ExecutionIntent =
  | "investigate"
  | "implement"
  | "review"
  | "benchmark"
  | "plan";
type RiskLevel = "low" | "medium" | "high";
type RouterProposalSource =
  | "flash_lite_call"
  | "heuristic_policy"
  | "manual_override";
type RouterParseStatus =
  | "ok"
  | "invalid_json"
  | "schema_invalid"
  | "timeout"
  | "command_error"
  | "not_attempted";

export interface GeminiRoutingStageOneProposal {
  taskType: TaskType;
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
  rationale: string;
}

export interface GeminiRoutingWorkPacketDiff {
  field:
    | "executionIntent"
    | "targetFile"
    | "targetFolder"
    | "artifactKind"
    | "doneWhen"
    | "riskLevel"
    | "missingInputs"
    | "needsApproval";
  proposed: string | boolean | string[] | null;
  enforced: string | boolean | string[];
  reason: string;
}

export interface GeminiTaskRoutePolicy {
  preferredBucket: BucketName;
  fallbackBucket: BucketName;
  reason: string;
}

export interface GeminiRoutingPolicyLike {
  taskRoutes: Record<TaskType, GeminiTaskRoutePolicy>;
  bucketModels: Record<BucketName, string>;
}

export interface GeminiControlPlaneResolveInput {
  policy: GeminiRoutingPolicyLike;
  policySource: string;
  defaultMode: RoutingMode;
  defaultAccountLabel: string;
  context: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  runtimeState?: Record<string, unknown>;
  configuredModel: string | null;
  snapshotAt: string;
}

export interface GeminiControlPlaneResolveResult {
  taskType: TaskType;
  budgetClass: BudgetClass;
  accountLabel: string;
  mode: RoutingMode;
  routingReason: string;
  advisoryOnly: boolean;
  applyModelLane: boolean;
  policySource: string;
  selected: {
    accountLabel: string;
    selectedBucket: BucketName;
    configuredBucket: BucketName;
    effectiveBucket: BucketName;
    configuredModelLane: string;
    recommendedModelLane: string;
    effectiveModelLane: string;
    laneStrategy: "advisory_keep_configured" | "soft_enforced_use_recommended";
    modelLaneReason: string;
    budgetClass: BudgetClass;
    hardCapTokens: number;
    softCapTokens: number;
    taskType: TaskType;
    executionIntent: ExecutionIntent;
    targetFile: string;
    targetFolder: string;
    artifactKind: IssueExecutionPacketArtifactKind;
    doneWhen: string;
    riskLevel: RiskLevel;
    missingInputs: string[];
    needsApproval: boolean;
    blocked: boolean;
    blockReason: string | null;
  };
  quotaState: {
    bucketState: BucketState;
    snapshotAt: string;
  };
  controlPlane: GeminiControlPlaneState;
}

export interface GeminiControlPlaneState {
  accountLabel: string | null;
  mode: RoutingMode | null;
  policySource: string | null;
  taskType: TaskType | null;
  budgetClass: BudgetClass | null;
  bucket: {
    preferred: BucketName | null;
    fallback: BucketName | null;
    selected: BucketName | null;
    configured: BucketName | null;
    effective: BucketName | null;
    preferredState: BucketState | null;
    selectedState: BucketState | null;
    states: Partial<Record<BucketName, BucketState>>;
    snapshots: Partial<Record<BucketName, GeminiQuotaBucketSnapshot>>;
  };
  modelLane: {
    configured: string | null;
    recommended: string | null;
    effective: string | null;
    strategy:
      | "advisory_keep_configured"
      | "soft_enforced_use_recommended"
      | null;
    reason: string | null;
    apply: boolean | null;
  };
  quota: {
    hardCapTokens: number | null;
    softCapTokens: number | null;
    snapshotAt: string | null;
    capturedAt: string | null;
    resetAt: string | null;
    resetReason: string | null;
    source: "runtime_quota_snapshot" | "runtime_bucket_state" | "none" | null;
    isStale: boolean | null;
    staleReason:
      | "missing_snapshot"
      | "missing_snapshot_at"
      | "snapshot_expired"
      | "missing_bucket_states"
      | null;
    maxAgeSec: number | null;
    ageSec: number | null;
  };
  router: {
    enabled: boolean;
    model: string | null;
    source: RouterProposalSource;
    accepted: boolean;
    correctionReasons: string[];
    parseStatus: RouterParseStatus;
    latencyMs: number | null;
    proposal: GeminiRoutingStageOneProposal | null;
    workPacket: {
      proposed: GeminiRoutingStageOneProposal | null;
      enforced: {
        taskType: TaskType;
        budgetClass: BudgetClass;
        executionIntent: ExecutionIntent;
        targetFile: string;
        targetFolder: string;
        artifactKind: IssueExecutionPacketArtifactKind;
        doneWhen: string;
        riskLevel: RiskLevel;
        missingInputs: string[];
        needsApproval: boolean;
        blocked: boolean;
        blockReason: string | null;
      };
      diff: GeminiRoutingWorkPacketDiff[];
    };
    health: {
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
    };
  };
  warnings: string[];
  manualOverride: {
    enabled: boolean;
    bucket: BucketName | null;
    modelLane: string | null;
    reason: string | null;
  } | null;
}

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

function hasAnyKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

function isTaskType(value: string | null): value is TaskType {
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

function isBucket(value: string | null): value is BucketName {
  return value === "flash" || value === "pro" || value === "flash-lite";
}

function guessBucketFromModel(model: string | null): BucketName {
  const normalized = (model ?? "").toLowerCase();
  if (normalized.includes("flash-lite")) return "flash-lite";
  if (normalized.includes("pro")) return "pro";
  return "flash";
}

function parseBudgetClass(
  context: Record<string, unknown>,
): "small" | "medium" | "large" {
  const governance = asObject(context.governanceBudget);
  const packet = asObject(context.workPacketBudget);
  const raw =
    asString(context.budgetClass) ??
    asString(governance.budgetClass) ??
    asString(packet.budgetClass) ??
    "medium";
  const normalized = raw.toLowerCase();
  if (normalized === "small") return "small";
  if (normalized === "large") return "large";
  return "medium";
}

function hardCapForBudgetClass(budgetClass: "small" | "medium" | "large") {
  if (budgetClass === "small") return 35_000;
  if (budgetClass === "large") return 125_000;
  return 75_000;
}

function defaultExecutionIntent(taskType: TaskType): ExecutionIntent {
  if (taskType === "research-light") return "investigate";
  if (taskType === "benchmark-floor") return "benchmark";
  if (taskType === "heavy-architecture") return "plan";
  return "implement";
}

function defaultRiskLevel(input: {
  taskType: TaskType;
  budgetClass: BudgetClass;
}): RiskLevel {
  if (
    input.taskType === "heavy-architecture" ||
    input.budgetClass === "large"
  ) {
    return "high";
  }
  if (input.taskType === "research-light") return "low";
  return "medium";
}

function normalizeRelativeFolder(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/\\/g, "/").trim();
  if (normalized.length === 0) return null;
  if (normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized)) {
    return null;
  }
  const parts = normalized.split("/").filter((part) => part.length > 0);
  if (parts.some((part) => part === "..")) return null;
  return parts.length > 0 ? parts.join("/") : ".";
}

function normalizeMissingInputs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 8);
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

function readWorkPacketFromContext(
  context: Record<string, unknown>,
): Partial<GeminiRoutingStageOneProposal> | null {
  const fromContext = asObject(context.paperclipRoutingProposal);
  const fromJson = (() => {
    const rawJson = asString(context.paperclipRoutingProposalJson);
    if (!rawJson) return {};
    try {
      return asObject(JSON.parse(rawJson));
    } catch {
      return {};
    }
  })();
  const raw = hasAnyKeys(fromContext) ? fromContext : fromJson;
  const packetTruth = asObject(context.paperclipIssueExecutionPacketTruth);
  if (!hasAnyKeys(raw) && !hasAnyKeys(packetTruth)) return null;

  const taskTypeRaw = asString(raw.taskType) ?? asString(raw.taskClass);
  const budgetClassRaw = asString(raw.budgetClass);
  const chosenBucketRaw = asString(raw.chosenBucket);
  const chosenModelLane = asString(raw.chosenModelLane);
  const fallbackBucketRaw = asString(raw.fallbackBucket);
  const rationale = asString(raw.rationale);
  const executionIntentRaw = asString(raw.executionIntent);
  const targetFileRaw =
    asString(raw.targetFile) ?? asString(context.paperclipExecutionPacketTargetFile) ?? asString(packetTruth.targetFile);
  const targetFolderRaw =
    asString(raw.targetFolder) ??
    asString(context.paperclipExecutionPacketTargetFolder) ??
    asString(packetTruth.targetFolder);
  const artifactKindRaw =
    normalizeArtifactKind(raw.artifactKind) ??
    normalizeArtifactKind(context.paperclipExecutionPacketArtifactKind) ??
    normalizeArtifactKind(packetTruth.artifactKind);
  const doneWhenRaw =
    asString(raw.doneWhen) ??
    asString(context.paperclipExecutionPacketDoneWhen) ??
    asString(packetTruth.doneWhen);
  const riskLevelRaw = asString(raw.riskLevel);
  const needsApproval = asBoolean(raw.needsApproval);
  const missingInputsFromContext = normalizeMissingInputs(
    context.paperclipExecutionPacketReasonCodes,
  );
  const missingInputsFromTruth = normalizeMissingInputs(packetTruth.reasonCodes);
  const missingInputs = normalizeMissingInputs(raw.missingInputs);

  return {
    taskType: isTaskType(taskTypeRaw) ? taskTypeRaw : undefined,
    budgetClass: isBudgetClass(budgetClassRaw) ? budgetClassRaw : undefined,
    executionIntent: isExecutionIntent(executionIntentRaw)
      ? executionIntentRaw
      : undefined,
    targetFile: targetFileRaw ?? undefined,
    targetFolder: targetFolderRaw ?? undefined,
    artifactKind: artifactKindRaw ?? undefined,
    doneWhen: doneWhenRaw ?? undefined,
    riskLevel: isRiskLevel(riskLevelRaw) ? riskLevelRaw : undefined,
    missingInputs:
      missingInputs.length > 0
        ? missingInputs
        : missingInputsFromContext.length > 0
          ? missingInputsFromContext
          : missingInputsFromTruth,
    needsApproval: needsApproval ?? undefined,
    chosenBucket: isBucket(chosenBucketRaw) ? chosenBucketRaw : undefined,
    chosenModelLane: chosenModelLane ?? undefined,
    fallbackBucket: isBucket(fallbackBucketRaw) ? fallbackBucketRaw : undefined,
    rationale: rationale ?? undefined,
  };
}

function enforceWorkPacket(input: {
  proposed: Partial<GeminiRoutingStageOneProposal> | null;
  detectedTaskType: TaskType;
  detectedBudgetClass: BudgetClass;
}): {
  proposed: GeminiRoutingStageOneProposal | null;
  enforced: {
    taskType: TaskType;
    budgetClass: BudgetClass;
    executionIntent: ExecutionIntent;
    targetFile: string;
    targetFolder: string;
    artifactKind: IssueExecutionPacketArtifactKind;
    doneWhen: string;
    riskLevel: RiskLevel;
    missingInputs: string[];
    needsApproval: boolean;
    blocked: boolean;
    blockReason: string | null;
  };
  diff: GeminiRoutingWorkPacketDiff[];
  correctionReasons: string[];
} {
  const proposedTaskType = input.proposed?.taskType ?? input.detectedTaskType;
  const proposedBudgetClass =
    input.proposed?.budgetClass ?? input.detectedBudgetClass;
  const proposedExecutionIntent =
    input.proposed?.executionIntent ?? defaultExecutionIntent(proposedTaskType);
  const proposedTargetFile =
    (input.proposed?.targetFile ?? "").trim().length > 0
      ? (input.proposed?.targetFile as string).trim()
      : "none";
  const normalizedTargetFolder = normalizeRelativeFolder(
    input.proposed?.targetFolder ?? null,
  );
  const proposedArtifactKind = input.proposed?.artifactKind ?? "multi_file_change";
  const proposedDoneWhen =
    (input.proposed?.doneWhen ?? "").trim().length >= 12
      ? (input.proposed?.doneWhen as string).trim()
      : "Deliver validated changes and a concise completion summary.";
  const proposedRiskLevel =
    input.proposed?.riskLevel ??
    defaultRiskLevel({
      taskType: proposedTaskType,
      budgetClass: proposedBudgetClass,
    });
  const proposedMissingInputs = input.proposed?.missingInputs ?? [];
  const proposedNeedsApproval = input.proposed?.needsApproval ?? false;

  let enforcedRiskLevel: RiskLevel = proposedRiskLevel;
  if (
    proposedBudgetClass === "large" ||
    proposedTaskType === "heavy-architecture"
  ) {
    enforcedRiskLevel = "high";
  }

  const hasMissingInputs = proposedMissingInputs.length > 0;
  const enforcedNeedsApproval = false;

  let blocked = false;
  let blockReason: string | null = null;
  if (hasMissingInputs) {
    blocked = true;
    blockReason = "missing_inputs";
  } else if (
    enforcedRiskLevel === "high" &&
    proposedBudgetClass === "large" &&
    proposedExecutionIntent === "implement"
  ) {
    blocked = true;
    blockReason = "risk_high_large_implementation";
  }

  const enforced = {
    taskType: proposedTaskType,
    budgetClass: proposedBudgetClass,
    executionIntent: proposedExecutionIntent,
    targetFile: proposedTargetFile,
    targetFolder: normalizedTargetFolder ?? ".",
    artifactKind: proposedArtifactKind,
    doneWhen: proposedDoneWhen,
    riskLevel: enforcedRiskLevel,
    missingInputs: proposedMissingInputs,
    needsApproval: enforcedNeedsApproval,
    blocked,
    blockReason,
  };

  const diff: GeminiRoutingWorkPacketDiff[] = [];
  const correctionReasons: string[] = [];
  const pushDiff = (
    field: GeminiRoutingWorkPacketDiff["field"],
    proposed: string | boolean | string[] | null,
    next: string | boolean | string[],
    reason: string,
  ) => {
    const same =
      Array.isArray(proposed) && Array.isArray(next)
        ? JSON.stringify(proposed) === JSON.stringify(next)
        : proposed === next;
    if (same) return;
    diff.push({ field, proposed, enforced: next, reason });
    correctionReasons.push(reason);
  };

  pushDiff(
    "targetFolder",
    input.proposed?.targetFolder ?? null,
    enforced.targetFolder,
    "invalid or missing targetFolder; defaulted to safe relative folder",
  );
  pushDiff(
    "doneWhen",
    input.proposed?.doneWhen ?? null,
    enforced.doneWhen,
    "missing or weak doneWhen; replaced with enforceable completion criterion",
  );
  pushDiff(
    "riskLevel",
    input.proposed?.riskLevel ?? null,
    enforced.riskLevel,
    "risk level escalated by server safety policy",
  );
  pushDiff(
    "needsApproval",
    input.proposed?.needsApproval ?? null,
    enforced.needsApproval,
    "needsApproval routing gate is currently disabled by policy",
  );
  pushDiff(
    "missingInputs",
    input.proposed?.missingInputs ?? null,
    enforced.missingInputs,
    "missingInputs normalized to bounded string list",
  );

  if (!isExecutionIntent(asString(input.proposed?.executionIntent))) {
    pushDiff(
      "executionIntent",
      input.proposed?.executionIntent ?? null,
      enforced.executionIntent,
      "executionIntent defaulted by task class",
    );
  }

  return {
    proposed:
      input.proposed &&
      isTaskType(asString(input.proposed.taskType)) &&
      isBudgetClass(asString(input.proposed.budgetClass)) &&
      isBucket(asString(input.proposed.chosenBucket)) &&
      isBucket(asString(input.proposed.fallbackBucket)) &&
      asString(input.proposed.chosenModelLane) !== null &&
      asString(input.proposed.rationale) !== null
        ? {
            taskType: input.proposed.taskType as TaskType,
            budgetClass: input.proposed.budgetClass as BudgetClass,
            executionIntent: (isExecutionIntent(
              asString(input.proposed.executionIntent),
            )
              ? input.proposed.executionIntent
              : defaultExecutionIntent(
                  input.proposed.taskType as TaskType,
                )) as ExecutionIntent,
            targetFile: input.proposed.targetFile ?? "none",
            targetFolder: input.proposed.targetFolder ?? ".",
            artifactKind: input.proposed.artifactKind ?? "multi_file_change",
            doneWhen:
              input.proposed.doneWhen ??
              "Deliver validated changes and a concise completion summary.",
            riskLevel: (isRiskLevel(asString(input.proposed.riskLevel))
              ? input.proposed.riskLevel
              : defaultRiskLevel({
                  taskType: input.proposed.taskType as TaskType,
                  budgetClass: input.proposed.budgetClass as BudgetClass,
                })) as RiskLevel,
            missingInputs: input.proposed.missingInputs ?? [],
            needsApproval: input.proposed.needsApproval ?? false,
            chosenBucket: input.proposed.chosenBucket as BucketName,
            chosenModelLane: input.proposed.chosenModelLane as string,
            fallbackBucket: input.proposed.fallbackBucket as BucketName,
            rationale: input.proposed.rationale as string,
          }
        : null,
    enforced,
    diff,
    correctionReasons,
  };
}

function detectTaskType(context: Record<string, unknown>): TaskType {
  const benchmarkFamily =
    asString(context.paperclipBenchmarkFamily)?.toLowerCase() ?? "";
  if (
    context.paperclipStrictFloorMode === true ||
    benchmarkFamily.includes("floor")
  ) {
    return "benchmark-floor";
  }

  const explicitTaskType = asString(context.taskType)?.toLowerCase();
  if (explicitTaskType === "research-light") return "research-light";
  if (explicitTaskType === "heavy-architecture") return "heavy-architecture";
  if (explicitTaskType === "bounded-implementation") {
    return "bounded-implementation";
  }

  const promptText = `${asString(context.paperclipTaskPrompt) ?? ""} ${
    asString(context.wakeReason) ?? ""
  }`.toLowerCase();
  if (
    promptText.includes("architecture") ||
    promptText.includes("roadmap") ||
    promptText.includes("design")
  ) {
    return "heavy-architecture";
  }
  if (promptText.includes("research") || promptText.includes("analyze")) {
    return "research-light";
  }
  return "bounded-implementation";
}

function normalizeBucketState(value: unknown): BucketState {
  const normalized = asString(value);
  if (
    normalized === "ok" ||
    normalized === "cooldown" ||
    normalized === "exhausted"
  ) {
    return normalized;
  }
  return "unknown";
}

function parseBucketState(value: unknown): BucketState | null {
  const normalized = asString(value);
  if (
    normalized === "ok" ||
    normalized === "cooldown" ||
    normalized === "exhausted" ||
    normalized === "unknown"
  ) {
    return normalized;
  }
  return null;
}

function readManualOverride(runtimeRouting: Record<string, unknown>) {
  const raw = asObject(runtimeRouting.manualOverride);
  const enabled = asBoolean(raw.enabled) ?? false;
  const rawBucket = asString(raw.bucket);
  const bucket = isBucket(rawBucket) ? rawBucket : null;
  const modelLane = asString(raw.modelLane);
  const reason = asString(raw.reason);
  if (!enabled && !bucket && !modelLane && !reason) return null;
  return { enabled, bucket, modelLane, reason };
}

function readRouterProposalFromContext(
  context: Record<string, unknown>,
): Partial<GeminiRoutingStageOneProposal> | null {
  return readWorkPacketFromContext(context);
}

export function resolveGeminiControlPlane(
  input: GeminiControlPlaneResolveInput,
): GeminiControlPlaneResolveResult {
  const runtimeRouting = asObject(input.runtimeConfig.routingPolicy);
  const routerConfig = asObject(runtimeRouting.llmRouter);
  const routerEnabled = asBoolean(routerConfig.enabled) ?? true;
  const routerModel = asString(routerConfig.model) ?? "gemini-2.5-flash-lite";

  const runtimeState = asObject(input.runtimeState);
  const runtimeControlPlane = asObject(runtimeState.controlPlane);
  const operationalQuotaSnapshot = asObject(runtimeControlPlane.quotaSnapshot);
  const operationalStaleness = asObject(runtimeControlPlane.staleness);

  const runtimeConfigForQuotaIngestion: Record<string, unknown> = {
    ...input.runtimeConfig,
    routingPolicy: {
      ...runtimeRouting,
      ...(hasAnyKeys(operationalQuotaSnapshot)
        ? { quotaSnapshot: operationalQuotaSnapshot }
        : {}),
      ...(hasAnyKeys(operationalStaleness)
        ? {
            quotaStaleness: {
              ...asObject(runtimeRouting.quotaStaleness),
              ...operationalStaleness,
            },
          }
        : {}),
    },
  };
  const ingestedQuotaSnapshot = ingestGeminiQuotaSnapshot(
    runtimeConfigForQuotaIngestion,
    input.snapshotAt,
  );

  const detectedTaskType = detectTaskType(input.context);
  const detectedBudgetClass = parseBudgetClass(input.context);

  const detectedRoute =
    input.policy.taskRoutes[detectedTaskType] ??
    input.policy.taskRoutes["bounded-implementation"];

  const bucketStateMap = asObject(runtimeRouting.bucketState);
  const bucketStates: Partial<Record<BucketName, BucketState>> = {
    flash:
      ingestedQuotaSnapshot.buckets.flash?.state ??
      normalizeBucketState(bucketStateMap.flash),
    pro:
      ingestedQuotaSnapshot.buckets.pro?.state ??
      normalizeBucketState(bucketStateMap.pro),
    "flash-lite":
      ingestedQuotaSnapshot.buckets["flash-lite"]?.state ??
      normalizeBucketState(bucketStateMap["flash-lite"]),
  };

  const heuristicPreferredState =
    bucketStates[detectedRoute.preferredBucket] ?? "unknown";
  const heuristicBucket: BucketName =
    heuristicPreferredState === "exhausted" ||
    heuristicPreferredState === "cooldown"
      ? detectedRoute.fallbackBucket
      : detectedRoute.preferredBucket;

  const stageOneRaw = !routerEnabled
    ? null
    : readRouterProposalFromContext(input.context);
  const enforcedWorkPacket = enforceWorkPacket({
    proposed: stageOneRaw,
    detectedTaskType,
    detectedBudgetClass,
  });
  const stageOneProposalForRouting: GeminiRoutingStageOneProposal = {
    taskType: enforcedWorkPacket.enforced.taskType,
    budgetClass: enforcedWorkPacket.enforced.budgetClass,
    executionIntent: enforcedWorkPacket.enforced.executionIntent,
    targetFile: enforcedWorkPacket.enforced.targetFile,
    targetFolder: enforcedWorkPacket.enforced.targetFolder,
    artifactKind: enforcedWorkPacket.enforced.artifactKind,
    doneWhen: enforcedWorkPacket.enforced.doneWhen,
    riskLevel: enforcedWorkPacket.enforced.riskLevel,
    missingInputs: enforcedWorkPacket.enforced.missingInputs,
    needsApproval: enforcedWorkPacket.enforced.needsApproval,
    chosenBucket: stageOneRaw?.chosenBucket ?? heuristicBucket,
    chosenModelLane:
      stageOneRaw?.chosenModelLane ??
      input.policy.bucketModels[heuristicBucket],
    fallbackBucket: stageOneRaw?.fallbackBucket ?? detectedRoute.fallbackBucket,
    rationale:
      stageOneRaw?.rationale ??
      "heuristic policy fallback proposal generated before execution",
  };
  const stageOneProposal: GeminiRoutingStageOneProposal | null = routerEnabled
    ? stageOneProposalForRouting
    : null;
  const routerMeta = asObject(input.context.paperclipRoutingProposalMeta);
  const routerMetaHealth = asObject(routerMeta.routerHealth);
  const runtimeRouterRuntime = asObject(runtimeControlPlane.routerRuntime);
  const runtimeRouterBreaker = asObject(runtimeRouterRuntime.breaker);
  const runtimeRouterMetrics = asObject(runtimeRouterRuntime.metrics);
  const routerParseStatus = ((asString(
    routerMeta.parseStatus,
  ) as RouterParseStatus | null) ?? "not_attempted") as RouterParseStatus;
  const routerLatencyMs = asNumber(routerMeta.latencyMs);
  let routerSource: RouterProposalSource = !routerEnabled
    ? "heuristic_policy"
    : (asString(routerMeta.source) as RouterProposalSource | null) ??
      "heuristic_policy";

  const taskType = enforcedWorkPacket.enforced.taskType;
  const budgetClass = enforcedWorkPacket.enforced.budgetClass;
  const route =
    input.policy.taskRoutes[taskType] ??
    input.policy.taskRoutes["bounded-implementation"];
  const mode =
    (asString(runtimeRouting.mode) as RoutingMode | null) ?? input.defaultMode;
  const staleSnapshot = ingestedQuotaSnapshot.isStale === true;
  const enforcedAdvisory = staleSnapshot && mode === "soft_enforced";
  const effectiveMode = enforcedAdvisory ? "advisory" : mode;
  const accountLabel =
    ingestedQuotaSnapshot.accountLabel ??
    asString(runtimeRouting.accountLabel) ??
    input.defaultAccountLabel;

  const preferredState = bucketStates[route.preferredBucket] ?? "unknown";
  const correctionReasons: string[] = [];
  correctionReasons.push(...enforcedWorkPacket.correctionReasons);

  const proposalBucket =
    stageOneProposalForRouting.chosenBucket ?? route.preferredBucket;
  const proposalFallbackBucket =
    stageOneProposalForRouting.fallbackBucket ?? route.fallbackBucket;

  let selectedBucket: BucketName = proposalBucket;

  const selectedBucketInitialState = bucketStates[selectedBucket] ?? "unknown";
  if (
    selectedBucketInitialState === "exhausted" ||
    selectedBucketInitialState === "cooldown"
  ) {
    correctionReasons.push(
      `proposed bucket ${selectedBucket} is ${selectedBucketInitialState}; falling back to ${proposalFallbackBucket}`,
    );
    selectedBucket = proposalFallbackBucket;
  }

  const manualOverride = readManualOverride(runtimeRouting);
  if (manualOverride?.enabled && manualOverride.bucket) {
    correctionReasons.push(
      `manual override enforced bucket ${manualOverride.bucket}`,
    );
    selectedBucket = manualOverride.bucket;
    routerSource = "manual_override";
  }

  const selectedBucketState = bucketStates[selectedBucket] ?? "unknown";
  let recommendedModelLane = input.policy.bucketModels[selectedBucket];
  if (stageOneProposalForRouting.chosenModelLane) {
    if (
      stageOneProposalForRouting.chosenModelLane ===
      input.policy.bucketModels[selectedBucket]
    ) {
      recommendedModelLane = stageOneProposalForRouting.chosenModelLane;
    } else {
      correctionReasons.push(
        `proposed model lane ${stageOneProposalForRouting.chosenModelLane} is not allowed for bucket ${selectedBucket}; using ${recommendedModelLane}`,
      );
    }
  }

  const configuredModelLane = input.configuredModel ?? recommendedModelLane;
  const hardCapTokens = hardCapForBudgetClass(budgetClass);
  const softCapTokens = Math.floor(hardCapTokens * 0.8);

  const applyModelLane =
    effectiveMode === "soft_enforced" &&
    recommendedModelLane.length > 0 &&
    selectedBucketState !== "exhausted";

  const overrideModelLane =
    manualOverride?.enabled && manualOverride.modelLane
      ? manualOverride.modelLane
      : null;

  const effectiveModelLane = overrideModelLane
    ? overrideModelLane
    : applyModelLane
    ? recommendedModelLane
    : configuredModelLane;
  const configuredBucket = guessBucketFromModel(configuredModelLane);
  const effectiveBucket = guessBucketFromModel(effectiveModelLane);
  const laneStrategy = applyModelLane
    ? ("soft_enforced_use_recommended" as const)
    : ("advisory_keep_configured" as const);
  const modelLaneReason = overrideModelLane
    ? `manual override selected model lane ${overrideModelLane}`
    : applyModelLane
    ? `soft_enforced selected recommended model lane ${recommendedModelLane}`
    : input.configuredModel
    ? `advisory mode kept configured model lane ${configuredModelLane}`
    : `no configured model; using recommended model lane ${recommendedModelLane}`;

  const routingReason =
    selectedBucket === route.preferredBucket
      ? route.reason
      : `${route.reason}; fallback to ${selectedBucket} because preferred bucket state is ${preferredState}`;

  const warnings: string[] = [];
  if (staleSnapshot && ingestedQuotaSnapshot.staleReason) {
    warnings.push(`quota_snapshot_stale:${ingestedQuotaSnapshot.staleReason}`);
  }
  if (enforcedAdvisory) {
    warnings.push(
      "quota_snapshot_stale_forced_advisory: soft_enforced disabled until quota snapshot is fresh",
    );
  }
  if (enforcedWorkPacket.enforced.blocked) {
    warnings.push(
      `execution_blocked:${
        enforcedWorkPacket.enforced.blockReason ?? "policy_gate"
      }`,
    );
  }

  const controlPlane: GeminiControlPlaneState = {
    accountLabel,
    mode: effectiveMode,
    policySource: input.policySource,
    taskType,
    budgetClass,
    bucket: {
      preferred: route.preferredBucket,
      fallback: route.fallbackBucket,
      selected: selectedBucket,
      configured: configuredBucket,
      effective: effectiveBucket,
      preferredState,
      selectedState: selectedBucketState,
      states: bucketStates,
      snapshots: ingestedQuotaSnapshot.buckets,
    },
    modelLane: {
      configured: configuredModelLane,
      recommended: recommendedModelLane,
      effective: effectiveModelLane,
      strategy: laneStrategy,
      reason: modelLaneReason,
      apply: applyModelLane,
    },
    quota: {
      hardCapTokens,
      softCapTokens,
      snapshotAt: ingestedQuotaSnapshot.snapshotAt,
      capturedAt: input.snapshotAt,
      resetAt: ingestedQuotaSnapshot.resetAt,
      resetReason: ingestedQuotaSnapshot.resetReason,
      source: ingestedQuotaSnapshot.source,
      isStale: ingestedQuotaSnapshot.isStale,
      staleReason: ingestedQuotaSnapshot.staleReason,
      maxAgeSec: ingestedQuotaSnapshot.maxAgeSec,
      ageSec: ingestedQuotaSnapshot.ageSec,
    },
    router: {
      enabled: routerEnabled,
      model: routerModel,
      source: routerSource,
      accepted: correctionReasons.length === 0,
      correctionReasons,
      parseStatus: routerParseStatus,
      latencyMs: routerLatencyMs,
      proposal: stageOneProposal,
      workPacket: {
        proposed: enforcedWorkPacket.proposed,
        enforced: enforcedWorkPacket.enforced,
        diff: enforcedWorkPacket.diff,
      },
      health: {
        successCount: Math.max(
          0,
          Math.floor(
            asNumber(routerMetaHealth.successCount) ??
              asNumber(runtimeRouterMetrics.successCount) ??
              0,
          ),
        ),
        fallbackCount: Math.max(
          0,
          Math.floor(
            asNumber(routerMetaHealth.fallbackCount) ??
              asNumber(runtimeRouterMetrics.fallbackCount) ??
              0,
          ),
        ),
        timeoutCount: Math.max(
          0,
          Math.floor(
            asNumber(routerMetaHealth.timeoutCount) ??
              asNumber(runtimeRouterMetrics.timeoutCount) ??
              0,
          ),
        ),
        parseFailCount: Math.max(
          0,
          Math.floor(
            asNumber(routerMetaHealth.parseFailCount) ??
              asNumber(runtimeRouterMetrics.parseFailCount) ??
              0,
          ),
        ),
        commandErrorCount: Math.max(
          0,
          Math.floor(
            asNumber(routerMetaHealth.commandErrorCount) ??
              asNumber(runtimeRouterMetrics.commandErrorCount) ??
              0,
          ),
        ),
        cacheHitCount: Math.max(
          0,
          Math.floor(
            asNumber(routerMetaHealth.cacheHitCount) ??
              asNumber(runtimeRouterMetrics.cacheHitCount) ??
              0,
          ),
        ),
        circuitOpenCount: Math.max(
          0,
          Math.floor(
            asNumber(routerMetaHealth.circuitOpenCount) ??
              asNumber(runtimeRouterMetrics.circuitOpenCount) ??
              0,
          ),
        ),
        consecutiveFailures: Math.max(
          0,
          Math.floor(
            asNumber(routerMetaHealth.consecutiveFailures) ??
              asNumber(runtimeRouterBreaker.consecutiveFailures) ??
              0,
          ),
        ),
        breakerOpenUntil:
          asString(routerMetaHealth.breakerOpenUntil) ??
          asString(runtimeRouterBreaker.openUntil) ??
          null,
        lastLatencyMs:
          asNumber(routerMetaHealth.lastLatencyMs) ??
          asNumber(runtimeRouterMetrics.lastLatencyMs) ??
          null,
        lastErrorReason:
          asString(routerMetaHealth.lastErrorReason) ??
          asString(runtimeRouterMetrics.lastErrorReason) ??
          null,
      },
    },
    warnings,
    manualOverride,
  };

  return {
    taskType,
    budgetClass,
    accountLabel,
    mode: effectiveMode,
    routingReason:
      [...warnings, ...correctionReasons].length > 0
        ? `${routingReason}; ${[...warnings, ...correctionReasons].join("; ")}`
        : routingReason,
    advisoryOnly: effectiveMode === "advisory",
    applyModelLane,
    policySource: input.policySource,
    selected: {
      accountLabel,
      selectedBucket,
      configuredBucket,
      effectiveBucket,
      configuredModelLane,
      recommendedModelLane,
      effectiveModelLane,
      laneStrategy,
      modelLaneReason,
      budgetClass,
      hardCapTokens,
      softCapTokens,
      taskType,
      executionIntent: enforcedWorkPacket.enforced.executionIntent,
      targetFile: enforcedWorkPacket.enforced.targetFile,
      targetFolder: enforcedWorkPacket.enforced.targetFolder,
      artifactKind: enforcedWorkPacket.enforced.artifactKind,
      doneWhen: enforcedWorkPacket.enforced.doneWhen,
      riskLevel: enforcedWorkPacket.enforced.riskLevel,
      missingInputs: enforcedWorkPacket.enforced.missingInputs,
      needsApproval: enforcedWorkPacket.enforced.needsApproval,
      blocked: enforcedWorkPacket.enforced.blocked,
      blockReason: enforcedWorkPacket.enforced.blockReason,
    },
    quotaState: {
      bucketState: selectedBucketState,
      snapshotAt: input.snapshotAt,
    },
    controlPlane,
  };
}

export function deriveGeminiControlPlaneState(
  runRoutingPreflight: Record<string, unknown> | null,
  quotaSnapshot: Record<string, unknown> | null,
): GeminiControlPlaneState {
  const preflight = runRoutingPreflight ?? {};
  const selected = asObject(preflight.selected);
  const quotaState = asObject(preflight.quotaState);
  const snapshot = quotaSnapshot ?? {};
  const controlPlaneFromPreflight = asObject(preflight.controlPlane);

  const readBucket = (value: unknown): BucketName | null => {
    const parsed = asString(value);
    return isBucket(parsed) ? parsed : null;
  };

  return {
    accountLabel:
      asString(controlPlaneFromPreflight.accountLabel) ??
      asString(selected.accountLabel) ??
      asString(snapshot.accountLabel) ??
      null,
    mode:
      ((asString(controlPlaneFromPreflight.mode) ??
        asString(preflight.mode) ??
        asString(snapshot.mode)) as RoutingMode | null) ?? null,
    policySource:
      asString(controlPlaneFromPreflight.policySource) ??
      asString(preflight.policySource) ??
      asString(snapshot.policySource) ??
      null,
    taskType:
      ((asString(controlPlaneFromPreflight.taskType) ??
        asString(selected.taskType)) as TaskType | null) ?? null,
    budgetClass:
      ((asString(controlPlaneFromPreflight.budgetClass) ??
        asString(selected.budgetClass) ??
        asString(snapshot.budgetClass)) as BudgetClass | null) ?? null,
    bucket: {
      preferred: readBucket(
        asObject(controlPlaneFromPreflight.bucket).preferred,
      ),
      fallback: readBucket(asObject(controlPlaneFromPreflight.bucket).fallback),
      selected:
        readBucket(asObject(controlPlaneFromPreflight.bucket).selected) ??
        readBucket(selected.selectedBucket) ??
        readBucket(snapshot.selectedBucket),
      configured:
        readBucket(asObject(controlPlaneFromPreflight.bucket).configured) ??
        readBucket(selected.configuredBucket),
      effective:
        readBucket(asObject(controlPlaneFromPreflight.bucket).effective) ??
        readBucket(selected.effectiveBucket) ??
        readBucket(snapshot.bucket),
      preferredState: parseBucketState(
        asObject(controlPlaneFromPreflight.bucket).preferredState,
      ),
      selectedState:
        parseBucketState(
          asObject(controlPlaneFromPreflight.bucket).selectedState,
        ) ??
        parseBucketState(quotaState.bucketState) ??
        parseBucketState(snapshot.bucketState),
      states: {
        flash:
          parseBucketState(
            asObject(asObject(controlPlaneFromPreflight.bucket).states).flash,
          ) ?? undefined,
        pro:
          parseBucketState(
            asObject(asObject(controlPlaneFromPreflight.bucket).states).pro,
          ) ?? undefined,
        "flash-lite":
          parseBucketState(
            asObject(asObject(controlPlaneFromPreflight.bucket).states)[
              "flash-lite"
            ],
          ) ?? undefined,
      },
      snapshots: {
        flash:
          (asObject(asObject(controlPlaneFromPreflight.bucket).snapshots)
            .flash as GeminiQuotaBucketSnapshot | undefined) ?? undefined,
        pro:
          (asObject(asObject(controlPlaneFromPreflight.bucket).snapshots)
            .pro as GeminiQuotaBucketSnapshot | undefined) ?? undefined,
        "flash-lite":
          (asObject(asObject(controlPlaneFromPreflight.bucket).snapshots)[
            "flash-lite"
          ] as GeminiQuotaBucketSnapshot | undefined) ?? undefined,
      },
    },
    modelLane: {
      configured:
        asString(asObject(controlPlaneFromPreflight.modelLane).configured) ??
        asString(selected.configuredModelLane) ??
        asString(snapshot.configuredModelLane) ??
        null,
      recommended:
        asString(asObject(controlPlaneFromPreflight.modelLane).recommended) ??
        asString(selected.recommendedModelLane) ??
        asString(snapshot.recommendedModelLane) ??
        null,
      effective:
        asString(asObject(controlPlaneFromPreflight.modelLane).effective) ??
        asString(selected.effectiveModelLane) ??
        asString(snapshot.effectiveModelLane) ??
        asString(snapshot.modelLane) ??
        null,
      strategy:
        ((asString(asObject(controlPlaneFromPreflight.modelLane).strategy) ??
          asString(selected.laneStrategy) ??
          asString(snapshot.laneStrategy)) as
          | "advisory_keep_configured"
          | "soft_enforced_use_recommended"
          | null) ?? null,
      reason:
        asString(asObject(controlPlaneFromPreflight.modelLane).reason) ??
        asString(selected.modelLaneReason) ??
        asString(snapshot.modelLaneReason) ??
        null,
      apply:
        asBoolean(asObject(controlPlaneFromPreflight.modelLane).apply) ??
        asBoolean(preflight.applyModelLane) ??
        null,
    },
    quota: {
      hardCapTokens:
        asNumber(asObject(controlPlaneFromPreflight.quota).hardCapTokens) ??
        asNumber(selected.hardCapTokens) ??
        asNumber(snapshot.hardCapTokens) ??
        null,
      softCapTokens:
        asNumber(asObject(controlPlaneFromPreflight.quota).softCapTokens) ??
        asNumber(selected.softCapTokens) ??
        asNumber(snapshot.softCapTokens) ??
        null,
      snapshotAt:
        asString(asObject(controlPlaneFromPreflight.quota).snapshotAt) ??
        asString(quotaState.snapshotAt) ??
        asString(snapshot.snapshotAt) ??
        null,
      capturedAt:
        asString(asObject(controlPlaneFromPreflight.quota).capturedAt) ??
        asString(snapshot.capturedAt) ??
        null,
      resetAt:
        asString(asObject(controlPlaneFromPreflight.quota).resetAt) ??
        asString(snapshot.resetAt) ??
        null,
      resetReason:
        asString(asObject(controlPlaneFromPreflight.quota).resetReason) ??
        asString(snapshot.resetReason) ??
        null,
      source:
        ((asString(asObject(controlPlaneFromPreflight.quota).source) ??
          asString(snapshot.snapshotSource)) as
          | "runtime_quota_snapshot"
          | "runtime_bucket_state"
          | "none"
          | null) ?? null,
      isStale:
        asBoolean(asObject(controlPlaneFromPreflight.quota).isStale) ??
        asBoolean(snapshot.isStale) ??
        null,
      staleReason:
        ((asString(asObject(controlPlaneFromPreflight.quota).staleReason) ??
          asString(snapshot.staleReason)) as
          | "missing_snapshot"
          | "missing_snapshot_at"
          | "snapshot_expired"
          | "missing_bucket_states"
          | null) ?? null,
      maxAgeSec:
        asNumber(asObject(controlPlaneFromPreflight.quota).maxAgeSec) ??
        asNumber(snapshot.maxAgeSec) ??
        null,
      ageSec:
        asNumber(asObject(controlPlaneFromPreflight.quota).ageSec) ??
        asNumber(snapshot.ageSec) ??
        null,
    },
    router: {
      enabled:
        asBoolean(asObject(controlPlaneFromPreflight.router).enabled) ?? false,
      model: asString(asObject(controlPlaneFromPreflight.router).model),
      source: ((asString(
        asObject(controlPlaneFromPreflight.router).source,
      ) as RouterProposalSource | null) ??
        "heuristic_policy") as RouterProposalSource,
      accepted:
        asBoolean(asObject(controlPlaneFromPreflight.router).accepted) ?? false,
      parseStatus: ((asString(
        asObject(controlPlaneFromPreflight.router).parseStatus,
      ) as RouterParseStatus | null) ?? "not_attempted") as RouterParseStatus,
      latencyMs:
        asNumber(asObject(controlPlaneFromPreflight.router).latencyMs) ?? null,
      correctionReasons: Array.isArray(
        asObject(controlPlaneFromPreflight.router).correctionReasons,
      )
        ? (
            asObject(controlPlaneFromPreflight.router)
              .correctionReasons as unknown[]
          )
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
        : [],
      proposal: (() => {
        const raw = asObject(
          asObject(controlPlaneFromPreflight.router).proposal,
        );
        const taskType = asString(raw.taskType) ?? asString(raw.taskClass);
        const budgetClass = asString(raw.budgetClass);
        const executionIntent = asString(raw.executionIntent);
        const targetFile = asString(raw.targetFile);
        const targetFolder = asString(raw.targetFolder);
        const artifactKind = normalizeArtifactKind(raw.artifactKind);
        const doneWhen = asString(raw.doneWhen);
        const riskLevel = asString(raw.riskLevel);
        const missingInputs = normalizeMissingInputs(raw.missingInputs);
        const needsApproval = asBoolean(raw.needsApproval);
        const chosenBucket = asString(raw.chosenBucket);
        const chosenModelLane = asString(raw.chosenModelLane);
        const fallbackBucket = asString(raw.fallbackBucket);
        const rationale = asString(raw.rationale);
        if (
          !isTaskType(taskType) ||
          !isBudgetClass(budgetClass) ||
          !isBucket(chosenBucket) ||
          !isBucket(fallbackBucket) ||
          !chosenModelLane ||
          !rationale
        ) {
          return null;
        }
        return {
          taskType,
          budgetClass,
          executionIntent: isExecutionIntent(executionIntent)
            ? executionIntent
            : defaultExecutionIntent(taskType),
          targetFile: targetFile ?? "none",
          targetFolder: normalizeRelativeFolder(targetFolder) ?? ".",
          artifactKind: artifactKind ?? "multi_file_change",
          doneWhen:
            doneWhen ??
            "Deliver validated changes and a concise completion summary.",
          riskLevel: isRiskLevel(riskLevel)
            ? riskLevel
            : defaultRiskLevel({ taskType, budgetClass }),
          missingInputs,
          needsApproval: needsApproval ?? false,
          chosenBucket,
          chosenModelLane,
          fallbackBucket,
          rationale,
        };
      })(),
      workPacket: (() => {
        const raw = asObject(
          asObject(controlPlaneFromPreflight.router).workPacket,
        );
        const rawProposed = asObject(raw.proposed);
        const rawEnforced = asObject(raw.enforced);
        const selectedTaskType = isTaskType(asString(selected.taskType))
          ? (asString(selected.taskType) as TaskType)
          : "bounded-implementation";
        const selectedBudgetClass = isBudgetClass(
          asString(selected.budgetClass),
        )
          ? (asString(selected.budgetClass) as BudgetClass)
          : "medium";
        const proposed = (() => {
          const proposal = asObject(rawProposed);
          if (Object.keys(proposal).length === 0) return null;
          const taskType =
            asString(proposal.taskType) ?? asString(proposal.taskClass);
          const budgetClass = asString(proposal.budgetClass);
          const chosenBucket = asString(proposal.chosenBucket);
          const chosenModelLane = asString(proposal.chosenModelLane);
          const fallbackBucket = asString(proposal.fallbackBucket);
          const rationale = asString(proposal.rationale);
          if (
            !isTaskType(taskType) ||
            !isBudgetClass(budgetClass) ||
            !isBucket(chosenBucket) ||
            !isBucket(fallbackBucket) ||
            !chosenModelLane ||
            !rationale
          ) {
            return null;
          }
          return {
            taskType,
            budgetClass,
            executionIntent: isExecutionIntent(
              asString(proposal.executionIntent),
            )
              ? (asString(proposal.executionIntent) as ExecutionIntent)
              : defaultExecutionIntent(taskType),
            targetFile: asString(proposal.targetFile) ?? "none",
            targetFolder:
              normalizeRelativeFolder(asString(proposal.targetFolder)) ?? ".",
            artifactKind:
              normalizeArtifactKind(proposal.artifactKind) ??
              "multi_file_change",
            doneWhen:
              asString(proposal.doneWhen) ??
              "Deliver validated changes and a concise completion summary.",
            riskLevel: isRiskLevel(asString(proposal.riskLevel))
              ? (asString(proposal.riskLevel) as RiskLevel)
              : defaultRiskLevel({ taskType, budgetClass }),
            missingInputs: normalizeMissingInputs(proposal.missingInputs),
            needsApproval: asBoolean(proposal.needsApproval) ?? false,
            chosenBucket,
            chosenModelLane,
            fallbackBucket,
            rationale,
          };
        })();

        const enforcedTaskType = isTaskType(asString(rawEnforced.taskType))
          ? (asString(rawEnforced.taskType) as TaskType)
          : selectedTaskType;
        const enforcedBudgetClass = isBudgetClass(
          asString(rawEnforced.budgetClass),
        )
          ? (asString(rawEnforced.budgetClass) as BudgetClass)
          : selectedBudgetClass;
        const enforced = {
          taskType: enforcedTaskType,
          budgetClass: enforcedBudgetClass,
          executionIntent: isExecutionIntent(
            asString(rawEnforced.executionIntent),
          )
            ? (asString(rawEnforced.executionIntent) as ExecutionIntent)
            : defaultExecutionIntent(enforcedTaskType),
          targetFile: asString(rawEnforced.targetFile) ?? "none",
          targetFolder:
            normalizeRelativeFolder(asString(rawEnforced.targetFolder)) ?? ".",
          artifactKind:
            normalizeArtifactKind(rawEnforced.artifactKind) ??
            "multi_file_change",
          doneWhen:
            asString(rawEnforced.doneWhen) ??
            "Deliver validated changes and a concise completion summary.",
          riskLevel: isRiskLevel(asString(rawEnforced.riskLevel))
            ? (asString(rawEnforced.riskLevel) as RiskLevel)
            : defaultRiskLevel({
                taskType: enforcedTaskType,
                budgetClass: enforcedBudgetClass,
              }),
          missingInputs: normalizeMissingInputs(rawEnforced.missingInputs),
          needsApproval: asBoolean(rawEnforced.needsApproval) ?? false,
          blocked: asBoolean(rawEnforced.blocked) ?? false,
          blockReason: asString(rawEnforced.blockReason),
        };
        const diff: GeminiRoutingWorkPacketDiff[] = Array.isArray(raw.diff)
          ? (raw.diff as unknown[])
              .map((entry) => asObject(entry))
              .map((entry) => {
                const field = asString(entry.field) as
                  | GeminiRoutingWorkPacketDiff["field"]
                  | null;
                const reason = asString(entry.reason);
                if (
                  !field ||
                  ![
                    "executionIntent",
                    "targetFile",
                    "targetFolder",
                    "artifactKind",
                    "doneWhen",
                    "riskLevel",
                    "missingInputs",
                    "needsApproval",
                  ].includes(field) ||
                  !reason
                ) {
                  return null;
                }
                return {
                  field,
                  proposed:
                    (entry.proposed as string | boolean | string[] | null) ??
                    null,
                  enforced:
                    (entry.enforced as string | boolean | string[]) ?? "",
                  reason,
                } as GeminiRoutingWorkPacketDiff;
              })
              .filter(
                (entry): entry is GeminiRoutingWorkPacketDiff => entry !== null,
              )
          : [];
        return {
          proposed,
          enforced,
          diff,
        };
      })(),
      health: {
        successCount: Math.max(
          0,
          Math.floor(
            asNumber(
              asObject(asObject(controlPlaneFromPreflight.router).health)
                .successCount,
            ) ?? 0,
          ),
        ),
        fallbackCount: Math.max(
          0,
          Math.floor(
            asNumber(
              asObject(asObject(controlPlaneFromPreflight.router).health)
                .fallbackCount,
            ) ?? 0,
          ),
        ),
        timeoutCount: Math.max(
          0,
          Math.floor(
            asNumber(
              asObject(asObject(controlPlaneFromPreflight.router).health)
                .timeoutCount,
            ) ?? 0,
          ),
        ),
        parseFailCount: Math.max(
          0,
          Math.floor(
            asNumber(
              asObject(asObject(controlPlaneFromPreflight.router).health)
                .parseFailCount,
            ) ?? 0,
          ),
        ),
        commandErrorCount: Math.max(
          0,
          Math.floor(
            asNumber(
              asObject(asObject(controlPlaneFromPreflight.router).health)
                .commandErrorCount,
            ) ?? 0,
          ),
        ),
        cacheHitCount: Math.max(
          0,
          Math.floor(
            asNumber(
              asObject(asObject(controlPlaneFromPreflight.router).health)
                .cacheHitCount,
            ) ?? 0,
          ),
        ),
        circuitOpenCount: Math.max(
          0,
          Math.floor(
            asNumber(
              asObject(asObject(controlPlaneFromPreflight.router).health)
                .circuitOpenCount,
            ) ?? 0,
          ),
        ),
        consecutiveFailures: Math.max(
          0,
          Math.floor(
            asNumber(
              asObject(asObject(controlPlaneFromPreflight.router).health)
                .consecutiveFailures,
            ) ?? 0,
          ),
        ),
        breakerOpenUntil:
          asString(
            asObject(asObject(controlPlaneFromPreflight.router).health)
              .breakerOpenUntil,
          ) ?? null,
        lastLatencyMs:
          asNumber(
            asObject(asObject(controlPlaneFromPreflight.router).health)
              .lastLatencyMs,
          ) ?? null,
        lastErrorReason:
          asString(
            asObject(asObject(controlPlaneFromPreflight.router).health)
              .lastErrorReason,
          ) ?? null,
      },
    },
    warnings: Array.isArray(controlPlaneFromPreflight.warnings)
      ? controlPlaneFromPreflight.warnings
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      : [],
    manualOverride: (() => {
      const manual = asObject(controlPlaneFromPreflight.manualOverride);
      const bucket = readBucket(manual.bucket);
      const modelLane = asString(manual.modelLane);
      const reason = asString(manual.reason);
      const enabled = asBoolean(manual.enabled);
      if (enabled === null && bucket === null && !modelLane && !reason)
        return null;
      return {
        enabled: enabled ?? false,
        bucket,
        modelLane,
        reason,
      };
    })(),
  };
}
