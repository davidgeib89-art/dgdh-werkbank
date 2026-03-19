import {
  ingestGeminiQuotaSnapshot,
  type GeminiQuotaBucketSnapshot,
} from "./gemini-quota-snapshot.js";

type BucketName = "flash" | "pro" | "flash-lite";
type TaskType =
  | "research-light"
  | "bounded-implementation"
  | "heavy-architecture"
  | "benchmark-floor";
type RoutingMode = "advisory" | "soft_enforced";
type BucketState = "ok" | "cooldown" | "exhausted" | "unknown";

type BudgetClass = "small" | "medium" | "large";

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
  };
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

export function resolveGeminiControlPlane(
  input: GeminiControlPlaneResolveInput,
): GeminiControlPlaneResolveResult {
  const taskType = detectTaskType(input.context);
  const route =
    input.policy.taskRoutes[taskType] ??
    input.policy.taskRoutes["bounded-implementation"];

  const runtimeRouting = asObject(input.runtimeConfig.routingPolicy);
  const ingestedQuotaSnapshot = ingestGeminiQuotaSnapshot(
    input.runtimeConfig,
    input.snapshotAt,
  );
  const mode =
    (asString(runtimeRouting.mode) as RoutingMode | null) ?? input.defaultMode;
  const accountLabel =
    ingestedQuotaSnapshot.accountLabel ??
    asString(runtimeRouting.accountLabel) ??
    input.defaultAccountLabel;

  const bucketStateMap = asObject(runtimeRouting.bucketState);
  const preferredState =
    ingestedQuotaSnapshot.buckets[route.preferredBucket]?.state ??
    normalizeBucketState(bucketStateMap[route.preferredBucket]);

  let selectedBucket: BucketName =
    preferredState === "exhausted" || preferredState === "cooldown"
      ? route.fallbackBucket
      : route.preferredBucket;

  const manualOverride = readManualOverride(runtimeRouting);
  if (manualOverride?.enabled && manualOverride.bucket) {
    selectedBucket = manualOverride.bucket;
  }

  const selectedBucketState =
    ingestedQuotaSnapshot.buckets[selectedBucket]?.state ??
    normalizeBucketState(bucketStateMap[selectedBucket]);
  const recommendedModelLane = input.policy.bucketModels[selectedBucket];
  const configuredModelLane = input.configuredModel ?? recommendedModelLane;
  const budgetClass = parseBudgetClass(input.context);
  const hardCapTokens = hardCapForBudgetClass(budgetClass);
  const softCapTokens = Math.floor(hardCapTokens * 0.8);

  const applyModelLane =
    mode === "soft_enforced" &&
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

  const controlPlane: GeminiControlPlaneState = {
    accountLabel,
    mode,
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
      states: {
        flash:
          ingestedQuotaSnapshot.buckets.flash?.state ??
          normalizeBucketState(bucketStateMap.flash),
        pro:
          ingestedQuotaSnapshot.buckets.pro?.state ??
          normalizeBucketState(bucketStateMap.pro),
        "flash-lite":
          ingestedQuotaSnapshot.buckets["flash-lite"]?.state ??
          normalizeBucketState(bucketStateMap["flash-lite"]),
      },
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
    },
    manualOverride,
  };

  return {
    taskType,
    budgetClass,
    accountLabel,
    mode,
    routingReason,
    advisoryOnly: mode === "advisory",
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
    },
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
