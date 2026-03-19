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
type RouterProposalSource = "context_flash_lite" | "heuristic_policy" | "none";

export interface GeminiRoutingStageOneProposal {
  taskType: TaskType;
  budgetClass: BudgetClass;
  chosenBucket: BucketName;
  chosenModelLane: string;
  fallbackBucket: BucketName;
  rationale: string;
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
    proposal: GeminiRoutingStageOneProposal | null;
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

function readRouterProposalFromContext(
  context: Record<string, unknown>,
): GeminiRoutingStageOneProposal | null {
  const fromContext = asObject(context.paperclipRoutingProposal);
  const fromJson = (() => {
    const rawJson = asString(context.paperclipRoutingProposalJson);
    if (!rawJson) return {};
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      return asObject(parsed);
    } catch {
      return {};
    }
  })();

  const raw = hasAnyKeys(fromContext) ? fromContext : fromJson;
  if (!hasAnyKeys(raw)) return null;

  const taskTypeRaw = asString(raw.taskType);
  const budgetClassRaw = asString(raw.budgetClass);
  const chosenBucketRaw = asString(raw.chosenBucket);
  const fallbackBucketRaw = asString(raw.fallbackBucket);
  const chosenModelLane = asString(raw.chosenModelLane);
  const rationale = asString(raw.rationale);

  if (
    !isTaskType(taskTypeRaw) ||
    !isBudgetClass(budgetClassRaw) ||
    !isBucket(chosenBucketRaw) ||
    !isBucket(fallbackBucketRaw) ||
    !chosenModelLane ||
    !rationale
  ) {
    return null;
  }

  return {
    taskType: taskTypeRaw,
    budgetClass: budgetClassRaw,
    chosenBucket: chosenBucketRaw,
    chosenModelLane,
    fallbackBucket: fallbackBucketRaw,
    rationale,
  };
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

  const stageOneProposal: GeminiRoutingStageOneProposal | null = !routerEnabled
    ? null
    : readRouterProposalFromContext(input.context) ?? {
        taskType: detectedTaskType,
        budgetClass: detectedBudgetClass,
        chosenBucket: heuristicBucket,
        chosenModelLane: input.policy.bucketModels[heuristicBucket],
        fallbackBucket: detectedRoute.fallbackBucket,
        rationale:
          "heuristic policy fallback proposal generated before execution",
      };
  const routerSource: RouterProposalSource = !routerEnabled
    ? "none"
    : readRouterProposalFromContext(input.context)
    ? "context_flash_lite"
    : "heuristic_policy";

  const taskType = stageOneProposal?.taskType ?? detectedTaskType;
  const budgetClass = stageOneProposal?.budgetClass ?? detectedBudgetClass;
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

  const proposalBucket =
    stageOneProposal?.chosenBucket ?? route.preferredBucket;
  const proposalFallbackBucket =
    stageOneProposal?.fallbackBucket ?? route.fallbackBucket;

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
  }

  const selectedBucketState = bucketStates[selectedBucket] ?? "unknown";
  let recommendedModelLane = input.policy.bucketModels[selectedBucket];
  if (stageOneProposal?.chosenModelLane) {
    if (
      stageOneProposal.chosenModelLane ===
      input.policy.bucketModels[selectedBucket]
    ) {
      recommendedModelLane = stageOneProposal.chosenModelLane;
    } else {
      correctionReasons.push(
        `proposed model lane ${stageOneProposal.chosenModelLane} is not allowed for bucket ${selectedBucket}; using ${recommendedModelLane}`,
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
      proposal: stageOneProposal,
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
      ) as RouterProposalSource | null) ?? "none") as RouterProposalSource,
      accepted:
        asBoolean(asObject(controlPlaneFromPreflight.router).accepted) ?? false,
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
        const taskType = asString(raw.taskType);
        const budgetClass = asString(raw.budgetClass);
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
          chosenBucket,
          chosenModelLane,
          fallbackBucket,
          rationale,
        };
      })(),
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
