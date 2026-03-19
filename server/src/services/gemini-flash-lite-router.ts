import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  ensureCommandResolvable,
  ensurePathInEnv,
  parseObject,
} from "../adapters/utils.js";
import { runChildProcess } from "@paperclipai/adapter-utils/server-utils";
import { parseGeminiJsonl } from "@paperclipai/adapter-gemini-local/server";

type BucketName = "flash" | "pro" | "flash-lite";
type TaskClass =
  | "research-light"
  | "bounded-implementation"
  | "heavy-architecture"
  | "benchmark-floor";
type BudgetClass = "small" | "medium" | "large";

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
  chosenBucket: BucketName;
  chosenModelLane: string;
  fallbackBucket: BucketName;
  rationale: string;
}

export interface GeminiFlashLiteRouterInput {
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  context: Record<string, unknown>;
  quotaSnapshot: Record<string, unknown>;
  allowedBuckets: BucketName[];
  allowedModelLanes: string[];
  manualOverride: Record<string, unknown> | null;
}

export interface GeminiFlashLiteRouterResult {
  attempted: boolean;
  source: "flash_lite_call" | "heuristic_policy";
  proposal: GeminiFlashLiteProposal | null;
  parseStatus: GeminiFlashLiteParseStatus;
  latencyMs: number | null;
  warning: string | null;
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

function normalizeFreeTextTask(context: Record<string, unknown>): string {
  const prompt = asString(context.paperclipTaskPrompt) ?? "";
  const wakeReason = asString(context.wakeReason) ?? "";
  const title = asString(context.title) ?? "";
  const parts = [prompt, wakeReason, title]
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.join("\n").slice(0, 1200);
}

function buildStrictPrompt(input: {
  taskText: string;
  quotaSnapshot: Record<string, unknown>;
  allowedBuckets: BucketName[];
  allowedModelLanes: string[];
  manualOverride: Record<string, unknown> | null;
}): string {
  const body = {
    taskText: input.taskText,
    quotaSnapshot: input.quotaSnapshot,
    allowedBuckets: input.allowedBuckets,
    allowedModelLanes: input.allowedModelLanes,
    manualOverride: input.manualOverride,
    outputSchema: {
      taskClass: [
        "research-light",
        "bounded-implementation",
        "heavy-architecture",
        "benchmark-floor",
      ],
      budgetClass: ["small", "medium", "large"],
      chosenBucket: ["flash", "pro", "flash-lite"],
      chosenModelLane: "string (must be one of allowedModelLanes)",
      fallbackBucket: ["flash", "pro", "flash-lite"],
      rationale: "short string",
    },
  };

  return [
    "Return ONLY one JSON object. No markdown, no prose.",
    "Choose values strictly from the provided enums and allowlists.",
    "If uncertain, choose safe conservative defaults.",
    JSON.stringify(body),
  ].join("\n");
}

function tryParseProposal(summary: string): {
  proposal: GeminiFlashLiteProposal | null;
  parseStatus: GeminiFlashLiteParseStatus;
} {
  const trimmed = summary.trim();
  if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    return { proposal: null, parseStatus: "invalid_json" };
  }

  let parsedRaw: Record<string, unknown>;
  try {
    parsedRaw = parseObject(JSON.parse(trimmed));
  } catch {
    return { proposal: null, parseStatus: "invalid_json" };
  }

  const taskClass = asString(parsedRaw.taskClass);
  const budgetClass = asString(parsedRaw.budgetClass);
  const chosenBucket = asString(parsedRaw.chosenBucket);
  const chosenModelLane = asString(parsedRaw.chosenModelLane);
  const fallbackBucket = asString(parsedRaw.fallbackBucket);
  const rationale = asString(parsedRaw.rationale);

  if (
    !isTaskClass(taskClass) ||
    !isBudgetClass(budgetClass) ||
    !isBucket(chosenBucket) ||
    !isBucket(fallbackBucket) ||
    !chosenModelLane ||
    !rationale
  ) {
    return { proposal: null, parseStatus: "schema_invalid" };
  }

  return {
    parseStatus: "ok",
    proposal: {
      taskClass,
      budgetClass,
      chosenBucket,
      chosenModelLane,
      fallbackBucket,
      rationale,
    },
  };
}

export async function produceFlashLiteRoutingProposal(
  input: GeminiFlashLiteRouterInput,
): Promise<GeminiFlashLiteRouterResult> {
  if (input.adapterType !== "gemini_local") {
    return {
      attempted: false,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "not_attempted",
      latencyMs: null,
      warning: null,
    };
  }

  const runtimeRouting = asObject(input.runtimeConfig.routingPolicy);
  const routerConfig = asObject(runtimeRouting.llmRouter);
  const enabled = asBoolean(routerConfig.enabled) ?? true;
  if (!enabled) {
    return {
      attempted: false,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "not_attempted",
      latencyMs: null,
      warning: null,
    };
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

  const model = asString(routerConfig.model) ?? "gemini-2.5-flash-lite";
  const timeoutSec = Math.max(
    2,
    Math.min(20, Math.floor(asNumber(routerConfig.timeoutSec) ?? 8)),
  );
  const prompt = buildStrictPrompt({
    taskText: normalizeFreeTextTask(input.context),
    quotaSnapshot: input.quotaSnapshot,
    allowedBuckets: input.allowedBuckets,
    allowedModelLanes: input.allowedModelLanes,
    manualOverride: input.manualOverride,
  });

  const args = [
    "--output-format",
    "stream-json",
    "--model",
    model,
    "--approval-mode",
    "yolo",
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
    return {
      attempted: true,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "command_error",
      latencyMs: Date.now() - startedAt,
      warning: "flash_lite_router_command_error",
    };
  }
  const latencyMs = Date.now() - startedAt;

  if (proc.timedOut) {
    return {
      attempted: true,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "timeout",
      latencyMs,
      warning: "flash_lite_router_timeout",
    };
  }

  const parsed = parseGeminiJsonl(proc.stdout);
  const parsedProposal = tryParseProposal(parsed.summary);
  if ((proc.exitCode ?? 0) !== 0 && parsedProposal.parseStatus !== "ok") {
    return {
      attempted: true,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "command_error",
      latencyMs,
      warning: "flash_lite_router_non_zero_exit",
    };
  }
  if (parsedProposal.parseStatus !== "ok") {
    return {
      attempted: true,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: parsedProposal.parseStatus,
      latencyMs,
      warning: `flash_lite_router_${parsedProposal.parseStatus}`,
    };
  }

  if (
    !input.allowedBuckets.includes(parsedProposal.proposal!.chosenBucket) ||
    !input.allowedBuckets.includes(parsedProposal.proposal!.fallbackBucket) ||
    !input.allowedModelLanes.includes(parsedProposal.proposal!.chosenModelLane)
  ) {
    return {
      attempted: true,
      source: "heuristic_policy",
      proposal: null,
      parseStatus: "schema_invalid",
      latencyMs,
      warning: "flash_lite_router_disallowed_value",
    };
  }

  return {
    attempted: true,
    source: "flash_lite_call",
    proposal: parsedProposal.proposal,
    parseStatus: "ok",
    latencyMs,
    warning: null,
  };
}
