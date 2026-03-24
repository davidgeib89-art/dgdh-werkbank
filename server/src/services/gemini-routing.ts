import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveGeminiControlPlane,
  type GeminiControlPlaneState,
} from "./gemini-control-plane.js";

type BucketName = "flash" | "pro" | "flash-lite";
type PacketType =
  | "deterministic_tool"
  | "free_api"
  | "premium_model"
  | "local_model";
type RoleHint = "ceo" | "worker" | "reviewer";
type TaskType =
  | "research-light"
  | "bounded-implementation"
  | "heavy-architecture"
  | "benchmark-floor";
type RoutingMode = "advisory" | "soft_enforced";
type BucketState = "ok" | "cooldown" | "exhausted" | "unknown";

interface TaskRoutePolicy {
  preferredBucket: BucketName;
  fallbackBucket: BucketName;
  reason: string;
}

interface PacketTypeRoutePolicy {
  lane: PacketType;
  hardBlockLlm: boolean;
  reason: string;
}

interface RoleHintPolicy {
  preferredLane: PacketType;
  reason: string;
}

interface GeminiRoutingPolicy {
  version: string;
  defaultAccountLabel: string;
  defaultMode: RoutingMode;
  taskRoutes: Record<TaskType, TaskRoutePolicy>;
  packetTypeRoutes: Record<PacketType, PacketTypeRoutePolicy>;
  roleHints: Record<RoleHint, RoleHintPolicy>;
  bucketModels: Record<BucketName, string>;
}

const DEFAULT_POLICY: GeminiRoutingPolicy = {
  version: "v1",
  defaultAccountLabel: "account-1",
  defaultMode: "advisory",
  taskRoutes: {
    "research-light": {
      preferredBucket: "flash",
      fallbackBucket: "pro",
      reason: "light research should favor lower-cost flash models",
    },
    "bounded-implementation": {
      preferredBucket: "flash",
      fallbackBucket: "pro",
      reason:
        "bounded implementation defaults to flash and escalates to pro if needed",
    },
    "heavy-architecture": {
      preferredBucket: "pro",
      fallbackBucket: "flash",
      reason: "hard architecture tasks prioritize stronger pro models",
    },
    "benchmark-floor": {
      preferredBucket: "flash",
      fallbackBucket: "flash",
      reason: "floor benchmarks stay in the cheapest stable lane",
    },
  },
  packetTypeRoutes: {
    deterministic_tool: {
      lane: "deterministic_tool",
      hardBlockLlm: true,
      reason: "deterministic packets must run in tool lane and never call an LLM",
    },
    free_api: {
      lane: "free_api",
      hardBlockLlm: false,
      reason: "free_api packets prefer the cheapest stable flash-lite lane",
    },
    premium_model: {
      lane: "premium_model",
      hardBlockLlm: false,
      reason: "premium packets prioritize stronger lanes and degrade by quota availability",
    },
    local_model: {
      lane: "local_model",
      hardBlockLlm: false,
      reason: "local_model is a placeholder lane until a local adapter is activated",
    },
  },
  roleHints: {
    ceo: {
      preferredLane: "premium_model",
      reason: "ceo planning and aggregation favors stronger premium reasoning",
    },
    worker: {
      preferredLane: "free_api",
      reason: "worker runs default to the cheapest useful execution lane",
    },
    reviewer: {
      preferredLane: "free_api",
      reason: "reviewer defaults to free_api and can escalate by packet stakes",
    },
  },
  bucketModels: {
    flash: "gemini-3-flash-preview",
    pro: "gemini-3.1-pro-preview",
    "flash-lite": "gemini-2.5-flash-lite",
  },
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

function isRoleHint(value: string | null): value is RoleHint {
  return value === "ceo" || value === "worker" || value === "reviewer";
}

function bucketAvailable(state: string | null): boolean {
  return state !== "exhausted" && state !== "cooldown";
}

function normalizePacketType(context: Record<string, unknown>): PacketType | null {
  const direct = asString(context.packetType) ?? asString(context.packet_type);
  if (isPacketType(direct)) return direct;

  const workPacketBudget = asObject(context.workPacketBudget);
  const fromBudget =
    asString(workPacketBudget.packetType) ??
    asString(workPacketBudget.packet_type);
  if (isPacketType(fromBudget)) return fromBudget;

  return null;
}

function normalizeRoleHint(context: Record<string, unknown>): RoleHint | null {
  const roleValue =
    asString(context.role) ??
    asString(context.roleName) ??
    asString(context.agentRole) ??
    asString(context.issueRole);
  const normalized = roleValue?.toLowerCase() ?? null;
  return isRoleHint(normalized) ? normalized : null;
}

type LaneDecisionSource = "packet_type" | "role_hint" | "control_plane_default";

export interface GeminiRoutingLaneDecision {
  lane: PacketType;
  source: LaneDecisionSource;
  packetType: PacketType | null;
  roleHint: RoleHint | null;
  reason: string;
  hardBlockLlm: boolean;
}

export function getGeminiRoutingPolicy(): {
  policy: GeminiRoutingPolicy;
  source: string;
} {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const policyPath = path.resolve(
    serviceDir,
    "../../config/gemini-routing-policy.v1.json",
  );
  if (!fs.existsSync(policyPath)) {
    return { policy: DEFAULT_POLICY, source: "default-fallback" };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(policyPath, "utf8")) as unknown;
    const raw = asObject(parsed);
    const rawTaskRoutes = asObject(raw.taskRoutes);
    const mergedTaskRoutes: GeminiRoutingPolicy["taskRoutes"] = {
      ...DEFAULT_POLICY.taskRoutes,
    };
    const taskKeys: TaskType[] = [
      "research-light",
      "bounded-implementation",
      "heavy-architecture",
      "benchmark-floor",
    ];
    for (const taskKey of taskKeys) {
      const candidate = asObject(rawTaskRoutes[taskKey]);
      const preferredBucket = asString(candidate.preferredBucket);
      const fallbackBucket = asString(candidate.fallbackBucket);
      const reason = asString(candidate.reason);
      if (isBucket(preferredBucket) && isBucket(fallbackBucket) && reason) {
        mergedTaskRoutes[taskKey] = {
          preferredBucket,
          fallbackBucket,
          reason,
        };
      }
    }

    const rawPacketTypeRoutes = asObject(raw.packetTypeRoutes);
    const mergedPacketTypeRoutes: GeminiRoutingPolicy["packetTypeRoutes"] = {
      ...DEFAULT_POLICY.packetTypeRoutes,
    };
    const packetTypeKeys: PacketType[] = [
      "deterministic_tool",
      "free_api",
      "premium_model",
      "local_model",
    ];
    for (const packetTypeKey of packetTypeKeys) {
      const candidate = asObject(rawPacketTypeRoutes[packetTypeKey]);
      const lane = asString(candidate.lane);
      const reason = asString(candidate.reason);
      const hardBlockLlm = asBoolean(candidate.hardBlockLlm);
      if (isPacketType(lane) && reason) {
        mergedPacketTypeRoutes[packetTypeKey] = {
          lane,
          hardBlockLlm:
            hardBlockLlm ??
            DEFAULT_POLICY.packetTypeRoutes[packetTypeKey].hardBlockLlm,
          reason,
        };
      }
    }

    const rawRoleHints = asObject(raw.roleHints);
    const mergedRoleHints: GeminiRoutingPolicy["roleHints"] = {
      ...DEFAULT_POLICY.roleHints,
    };
    const roleKeys: RoleHint[] = ["ceo", "worker", "reviewer"];
    for (const roleKey of roleKeys) {
      const candidate = asObject(rawRoleHints[roleKey]);
      const preferredLane = asString(candidate.preferredLane);
      const reason = asString(candidate.reason);
      if (isPacketType(preferredLane) && reason) {
        mergedRoleHints[roleKey] = {
          preferredLane,
          reason,
        };
      }
    }

    const rawBucketModels = asObject(raw.bucketModels);
    const mergedBucketModels: GeminiRoutingPolicy["bucketModels"] = {
      ...DEFAULT_POLICY.bucketModels,
    };
    const bucketKeys: BucketName[] = ["flash", "pro", "flash-lite"];
    for (const bucket of bucketKeys) {
      const candidateModel = asString(rawBucketModels[bucket]);
      if (candidateModel) {
        mergedBucketModels[bucket] = candidateModel;
      }
    }

    const policy: GeminiRoutingPolicy = {
      version: asString(raw.version) ?? DEFAULT_POLICY.version,
      defaultAccountLabel:
        asString(raw.defaultAccountLabel) ?? DEFAULT_POLICY.defaultAccountLabel,
      defaultMode:
        (asString(raw.defaultMode) as RoutingMode | null) ??
        DEFAULT_POLICY.defaultMode,
      taskRoutes: mergedTaskRoutes,
      packetTypeRoutes: mergedPacketTypeRoutes,
      roleHints: mergedRoleHints,
      bucketModels: mergedBucketModels,
    };
    return { policy, source: policyPath };
  } catch {
    return { policy: DEFAULT_POLICY, source: "default-fallback" };
  }
}

export interface GeminiRoutingPreflightInput {
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  runtimeState?: Record<string, unknown>;
  context: Record<string, unknown>;
}

export interface GeminiRoutingPreflightResult {
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
    budgetClass: "small" | "medium" | "large";
    hardCapTokens: number;
    softCapTokens: number;
    taskType: TaskType;
    executionIntent:
      | "investigate"
      | "implement"
      | "review"
      | "benchmark"
      | "plan";
    targetFolder: string;
    doneWhen: string;
    riskLevel: "low" | "medium" | "high";
    missingInputs: string[];
    needsApproval: boolean;
    blocked: boolean;
    blockReason: string | null;
  };
  quotaState: {
    bucketState: BucketState;
    snapshotAt: string;
  };
  routingReason: string;
  mode: RoutingMode;
  advisoryOnly: boolean;
  policySource: string;
  applyModelLane: boolean;
  controlPlane: GeminiControlPlaneState;
  laneDecision: GeminiRoutingLaneDecision;
  useGeminiQuota: boolean;
  quotaConfidence: "high" | "medium" | "low";
  quotaHealth: QuotaHealthLevel;
}

type QuotaHealthLevel = "healthy" | "watch" | "conserve" | "avoid" | "unavailable";

function resolveLaneDecision(input: {
  policy: GeminiRoutingPolicy;
  packetType: PacketType | null;
  roleHint: RoleHint | null;
}): GeminiRoutingLaneDecision {
  if (input.packetType) {
    const route =
      input.policy.packetTypeRoutes[input.packetType] ??
      DEFAULT_POLICY.packetTypeRoutes[input.packetType];
    return {
      lane: route.lane,
      source: "packet_type",
      packetType: input.packetType,
      roleHint: input.roleHint,
      reason: route.reason,
      hardBlockLlm: route.hardBlockLlm,
    };
  }

  if (input.roleHint) {
    const roleRoute =
      input.policy.roleHints[input.roleHint] ?? DEFAULT_POLICY.roleHints[input.roleHint];
    return {
      lane: roleRoute.preferredLane,
      source: "role_hint",
      packetType: null,
      roleHint: input.roleHint,
      reason: roleRoute.reason,
      hardBlockLlm: roleRoute.preferredLane === "deterministic_tool",
    };
  }

  return {
    lane: "free_api",
    source: "control_plane_default",
    packetType: null,
    roleHint: null,
    reason: "no packetType/role hint; keep control-plane default bucket routing",
    hardBlockLlm: false,
  };
}

export function classifyQuotaHealth(
  usagePercent: number | null,
  state: string | null,
): QuotaHealthLevel {
  if (state === "exhausted" || state === "cooldown") return "unavailable";
  if (usagePercent === null) return "watch";
  if (usagePercent <= 60) return "healthy";
  if (usagePercent <= 80) return "watch";
  if (usagePercent <= 95) return "conserve";
  return "avoid";
}

export function computeQuotaConfidence(
  isStale: boolean | null,
  staleReason: string | null,
  bucketHealth: QuotaHealthLevel,
): "high" | "medium" | "low" {
  if (isStale) return "low";
  if (staleReason) return "low";
  if (bucketHealth === "unavailable") return "medium";
  return "high";
}

export function shouldUseGeminiQuota(bucketHealth: QuotaHealthLevel): boolean {
  return bucketHealth !== "unavailable" && bucketHealth !== "avoid";
}

export function resolveGeminiRoutingPreflight(
  input: GeminiRoutingPreflightInput,
): GeminiRoutingPreflightResult | null {
  if (input.adapterType !== "gemini_local") return null;

  const { policy, source } = getGeminiRoutingPolicy();
  const resolver = resolveGeminiControlPlane({
    policy,
    policySource: source,
    defaultMode: policy.defaultMode,
    defaultAccountLabel: policy.defaultAccountLabel,
    context: input.context,
    runtimeConfig: input.runtimeConfig,
    runtimeState: input.runtimeState,
    configuredModel: asString(input.adapterConfig.model),
    snapshotAt: new Date().toISOString(),
  });
  const packetType = normalizePacketType(input.context);
  const roleHint = normalizeRoleHint(input.context);
  const laneDecision = resolveLaneDecision({
    policy,
    packetType,
    roleHint,
  });
  const shouldApplyLaneOverride = laneDecision.source !== "control_plane_default";

  const selected = { ...resolver.selected };
  let applyModelLane = resolver.applyModelLane;

  const bucketStates = resolver.controlPlane.bucket.states;
  const chooseBucket = (candidates: BucketName[]): BucketName => {
    for (const candidate of candidates) {
      if (bucketAvailable(bucketStates[candidate] ?? null)) {
        return candidate;
      }
    }
    return selected.selectedBucket;
  };

  if (shouldApplyLaneOverride && laneDecision.lane === "free_api") {
    const nextBucket = chooseBucket(["flash-lite", "flash", "pro"]);
    selected.selectedBucket = nextBucket;
    selected.effectiveBucket = nextBucket;
    selected.recommendedModelLane = policy.bucketModels[nextBucket];
    selected.effectiveModelLane = policy.bucketModels[nextBucket];
    selected.modelLaneReason = `lane free_api selected ${nextBucket}`;
    selected.laneStrategy = "soft_enforced_use_recommended";
    applyModelLane = true;
  }

  if (shouldApplyLaneOverride && laneDecision.lane === "premium_model") {
    const nextBucket = chooseBucket(["pro", "flash", "flash-lite"]);
    selected.selectedBucket = nextBucket;
    selected.effectiveBucket = nextBucket;
    selected.recommendedModelLane = policy.bucketModels[nextBucket];
    selected.effectiveModelLane = policy.bucketModels[nextBucket];
    selected.modelLaneReason = `lane premium_model selected ${nextBucket}`;
    selected.laneStrategy = "soft_enforced_use_recommended";
    applyModelLane = true;
  }

  if (shouldApplyLaneOverride && laneDecision.lane === "local_model") {
    selected.modelLaneReason = "lane local_model placeholder is not active; keeping control-plane lane";
  }

  if (shouldApplyLaneOverride && laneDecision.lane === "deterministic_tool") {
    applyModelLane = false;
    selected.blocked = true;
    selected.blockReason = "deterministic_tool_no_llm_call";
    selected.modelLaneReason = "deterministic_tool requires non-LLM tool execution lane";
  }

  const effectiveBucketSnapshot =
    resolver.controlPlane.bucket.snapshots[selected.effectiveBucket];
  const bucketHealth = classifyQuotaHealth(
    effectiveBucketSnapshot?.usagePercent ?? null,
    bucketStates[selected.effectiveBucket] ?? null,
  );
  const quotaConfidence = computeQuotaConfidence(
    resolver.controlPlane.quota.isStale,
    resolver.controlPlane.quota.staleReason,
    bucketHealth,
  );
  const useGeminiQuota =
    laneDecision.lane === "deterministic_tool"
      ? false
      : shouldUseGeminiQuota(bucketHealth);

  const laneReason = [
    `lane=${laneDecision.lane}`,
    `lane_source=${laneDecision.source}`,
    `packetType=${laneDecision.packetType ?? "none"}`,
    `role=${laneDecision.roleHint ?? "none"}`,
    `bucket=${selected.effectiveBucket}`,
    `model=${selected.effectiveModelLane}`,
    `reason=${laneDecision.reason}`,
  ].join(", ");

  const result: GeminiRoutingPreflightResult = {
    selected,
    quotaState: resolver.quotaState,
    routingReason: `${resolver.routingReason}; ${laneReason}`,
    mode: resolver.mode,
    advisoryOnly: resolver.advisoryOnly,
    policySource: resolver.policySource,
    applyModelLane,
    controlPlane: resolver.controlPlane,
    laneDecision,
    useGeminiQuota,
    quotaConfidence,
    quotaHealth: bucketHealth,
  };

  input.context.paperclipRoutingPreflight = {
    selected: result.selected,
    quotaState: result.quotaState,
    routingReason: result.routingReason,
    mode: result.mode,
    advisoryOnly: result.advisoryOnly,
    policySource: result.policySource,
    applyModelLane: result.applyModelLane,
    controlPlane: result.controlPlane,
    laneDecision: result.laneDecision,
    useGeminiQuota: result.useGeminiQuota,
    quotaConfidence: result.quotaConfidence,
    quotaHealth: result.quotaHealth,
  };

  if (!asString(input.context.accountLabel)) {
    input.context.accountLabel = result.selected.accountLabel;
  }

  if (!asString(input.context.bucket)) {
    input.context.bucket = result.selected.effectiveBucket;
  }

  if (!asString(input.context.budgetClass)) {
    input.context.budgetClass = result.selected.budgetClass;
  }

  const configuredModel = asString(input.adapterConfig.model);
  const shouldMutateAdapterModel =
    result.applyModelLane && configuredModel !== null && configuredModel !== "auto";

  if (shouldMutateAdapterModel) {
    input.adapterConfig.model = result.selected.effectiveModelLane;
  }

  return result;
}
