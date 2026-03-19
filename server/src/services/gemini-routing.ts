import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function guessBucketFromModel(model: string | null): BucketName {
  const normalized = (model ?? "").toLowerCase();
  if (normalized.includes("flash-lite")) return "flash-lite";
  if (normalized.includes("pro")) return "pro";
  return "flash";
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
}

export function resolveGeminiRoutingPreflight(
  input: GeminiRoutingPreflightInput,
): GeminiRoutingPreflightResult | null {
  if (input.adapterType !== "gemini_local") return null;

  const { policy, source } = readPolicyFromFile();
  const taskType = detectTaskType(input.context);
  const route =
    policy.taskRoutes[taskType] ??
    DEFAULT_POLICY.taskRoutes["bounded-implementation"];

  const runtimeRouting = asObject(input.runtimeConfig.routingPolicy);
  const mode =
    (asString(runtimeRouting.mode) as RoutingMode | null) ?? policy.defaultMode;
  const accountLabel =
    asString(runtimeRouting.accountLabel) ?? policy.defaultAccountLabel;

  const bucketStateMap = asObject(runtimeRouting.bucketState);
  const preferredStateRaw = asString(bucketStateMap[route.preferredBucket]);
  const preferredState =
    preferredStateRaw === "ok" ||
    preferredStateRaw === "cooldown" ||
    preferredStateRaw === "exhausted"
      ? preferredStateRaw
      : "unknown";

  const selectedBucket =
    preferredState === "exhausted" || preferredState === "cooldown"
      ? route.fallbackBucket
      : route.preferredBucket;

  const selectedBucketStateRaw = asString(bucketStateMap[selectedBucket]);
  const selectedBucketState: BucketState =
    selectedBucketStateRaw === "ok" ||
    selectedBucketStateRaw === "cooldown" ||
    selectedBucketStateRaw === "exhausted"
      ? selectedBucketStateRaw
      : "unknown";

  const configuredModel = asString(input.adapterConfig.model);
  const recommendedModelLane = policy.bucketModels[selectedBucket];
  const configuredModelLane = configuredModel ?? recommendedModelLane;
  const budgetClass = parseBudgetClass(input.context);
  const hardCapTokens = hardCapForBudgetClass(budgetClass);
  const softCapTokens = Math.floor(hardCapTokens * 0.8);

  const applyModelLane =
    mode === "soft_enforced" &&
    recommendedModelLane.length > 0 &&
    selectedBucketState !== "exhausted";

  const effectiveModelLane = applyModelLane
    ? recommendedModelLane
    : configuredModelLane;
  const configuredBucket = guessBucketFromModel(configuredModelLane);
  const effectiveBucket = guessBucketFromModel(effectiveModelLane);

  const routingReason =
    selectedBucket === route.preferredBucket
      ? route.reason
      : `${route.reason}; fallback to ${selectedBucket} because preferred bucket state is ${preferredState}`;

  const result: GeminiRoutingPreflightResult = {
    selected: {
      accountLabel,
      selectedBucket,
      configuredBucket,
      effectiveBucket,
      configuredModelLane,
      recommendedModelLane,
      effectiveModelLane,
      budgetClass,
      hardCapTokens,
      softCapTokens,
      taskType,
    },
    quotaState: {
      bucketState: selectedBucketState,
      snapshotAt: new Date().toISOString(),
    },
    routingReason,
    mode,
    advisoryOnly: mode === "advisory",
    policySource: source,
    applyModelLane,
  };

  input.context.paperclipRoutingPreflight = {
    selected: result.selected,
    quotaState: result.quotaState,
    routingReason: result.routingReason,
    mode: result.mode,
    advisoryOnly: result.advisoryOnly,
    policySource: result.policySource,
  };

  if (!asString(input.context.accountLabel)) {
    input.context.accountLabel = accountLabel;
  }

  if (!asString(input.context.bucket)) {
    input.context.bucket = effectiveBucket;
  }

  if (!asString(input.context.budgetClass)) {
    input.context.budgetClass = budgetClass;
  }

  if (applyModelLane) {
    input.adapterConfig.model = effectiveModelLane;
  }

  return result;
}
