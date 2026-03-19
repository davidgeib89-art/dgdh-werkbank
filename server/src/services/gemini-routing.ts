import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveGeminiControlPlane,
  type GeminiControlPlaneState,
} from "./gemini-control-plane.js";

type BucketName = "flash" | "pro" | "flash-lite";
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

interface GeminiRoutingPolicy {
  version: string;
  defaultAccountLabel: string;
  defaultMode: RoutingMode;
  taskRoutes: Record<TaskType, TaskRoutePolicy>;
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

function isBucket(value: string | null): value is BucketName {
  return value === "flash" || value === "pro" || value === "flash-lite";
}

function readPolicyFromFile(): { policy: GeminiRoutingPolicy; source: string } {
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
}

export function resolveGeminiRoutingPreflight(
  input: GeminiRoutingPreflightInput,
): GeminiRoutingPreflightResult | null {
  if (input.adapterType !== "gemini_local") return null;

  const { policy, source } = readPolicyFromFile();
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

  const result: GeminiRoutingPreflightResult = {
    selected: resolver.selected,
    quotaState: resolver.quotaState,
    routingReason: resolver.routingReason,
    mode: resolver.mode,
    advisoryOnly: resolver.advisoryOnly,
    policySource: resolver.policySource,
    applyModelLane: resolver.applyModelLane,
    controlPlane: resolver.controlPlane,
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

  if (result.applyModelLane) {
    input.adapterConfig.model = result.selected.effectiveModelLane;
  }

  return result;
}
