import crypto from "node:crypto";
import { asString, parseObject } from "@paperclipai/adapter-utils/server-utils";

export type PromptResolverDecision = "ok" | "fail" | "escalated";

export type PromptResolverReasonCode =
  | "MISSING_REQUIRED_FIELD"
  | "TOOL_CONFLICT"
  | "NON_OVERRIDABLE_OVERRIDE"
  | "SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS";

export interface DgdhPromptCoreAssemblerInput {
  context: Record<string, unknown>;
  prompt: string;
  renderedPrompt: string;
}

export interface DgdhPromptCoreAssemblerOutput {
  resolvedPrompt: string;
  legacyPrompt: string;
  resolverDecision: PromptResolverDecision;
  reasonCodes: PromptResolverReasonCode[];
  auditMeta: {
    source: "gemini_local.execute";
    mode: "shadow";
    promptChars: number;
    renderedPromptChars: number;
    normalizedLayerOrder: [
      "companyCore",
      "governanceExecution",
      "taskDelta",
      "roleAddon",
    ];
    dryRunObserved: true;
  };
}

export interface GeminiPromptResolverDryRunTelemetry {
  resolverDecision: PromptResolverDecision;
  reasonCodes: PromptResolverReasonCode[];
  auditMeta?: {
    source: "gemini_local.execute";
    promptChars: number;
    dryRunObserved: true;
  };
}

export interface GeminiPromptResolverShadowComparisonTelemetry {
  legacyPromptChars: number;
  resolvedPromptChars: number;
  promptsEquivalent: boolean;
  legacyPromptSha256: string;
  resolvedPromptSha256: string;
  comparedAt: string;
}

export interface GeminiPromptResolverShadowTelemetry {
  legacyPath: {
    promptChars: number;
  };
  resolverPath: {
    promptChars: number;
    resolverDecision: PromptResolverDecision;
    reasonCodes: PromptResolverReasonCode[];
  };
  comparison: GeminiPromptResolverShadowComparisonTelemetry;
  auditMeta: {
    source: "gemini_local.execute";
    mode: "shadow";
    readOnly: true;
  };
}

function readNonEmptyStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function hasNonOverridableOverride(context: Record<string, unknown>): boolean {
  const override = parseObject(context.paperclipRoleOverrideAttempt);
  return Boolean(
    asString(override.approvalMode, "").trim() ||
      asString(override.riskClass, "").trim() ||
      asString(override.budgetClass, "").trim() ||
      readNonEmptyStringArray(override.forbiddenChanges).length > 0 ||
      readNonEmptyStringArray(override.blockedTools).length > 0 ||
      typeof override.decisionTraceRequired === "boolean",
  );
}

function hasScopeExpansionOutsideAllowedTargets(
  context: Record<string, unknown>,
): boolean {
  const singleFileTargetPath = asString(
    context.paperclipSingleFileTargetPath,
    "",
  ).trim();
  const requestedTargets = readNonEmptyStringArray(
    context.paperclipRequestedTargets,
  );
  if (!singleFileTargetPath || requestedTargets.length === 0) return false;

  const allowed = new Set([singleFileTargetPath]);
  return requestedTargets.some((target) => !allowed.has(target));
}

function isDryRunObservationContext(context: Record<string, unknown>): boolean {
  const executionMode = asString(context.executionMode, "")
    .trim()
    .toLowerCase();
  return (
    executionMode === "dry_run" ||
    context.isTestRun === true ||
    context.governanceTest === true
  );
}

function hashPrompt(prompt: string): string {
  return crypto.createHash("sha256").update(prompt, "utf8").digest("hex");
}

export function buildDgdhPromptCoreAssembler(
  input: DgdhPromptCoreAssemblerInput,
): DgdhPromptCoreAssemblerOutput {
  const { context, prompt, renderedPrompt } = input;
  const reasonCodes: PromptResolverReasonCode[] = [];
  if (prompt.trim().length === 0) {
    reasonCodes.push("MISSING_REQUIRED_FIELD");
  }

  const allowedTools = new Set(
    readNonEmptyStringArray(context.paperclipAllowedTools),
  );
  const blockedTools = readNonEmptyStringArray(context.paperclipBlockedTools);
  if (blockedTools.some((tool) => allowedTools.has(tool))) {
    reasonCodes.push("TOOL_CONFLICT");
  }

  if (hasNonOverridableOverride(context)) {
    reasonCodes.push("NON_OVERRIDABLE_OVERRIDE");
  }

  if (hasScopeExpansionOutsideAllowedTargets(context)) {
    reasonCodes.push("SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS");
  }

  const hasHardFail = reasonCodes.some(
    (code) => code !== "SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS",
  );
  const resolverDecision: PromptResolverDecision = hasHardFail
    ? "fail"
    : reasonCodes.includes("SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS")
    ? "escalated"
    : "ok";

  return {
    resolvedPrompt: prompt,
    legacyPrompt: prompt,
    resolverDecision,
    reasonCodes,
    auditMeta: {
      source: "gemini_local.execute",
      mode: "shadow",
      promptChars: prompt.length,
      renderedPromptChars: renderedPrompt.length,
      normalizedLayerOrder: [
        "companyCore",
        "governanceExecution",
        "taskDelta",
        "roleAddon",
      ],
      dryRunObserved: true,
    },
  };
}

export function buildGeminiDryRunPreflightTelemetry(input: {
  context: Record<string, unknown>;
  prompt: string;
}): GeminiPromptResolverDryRunTelemetry | null {
  if (!isDryRunObservationContext(input.context)) return null;

  const assembled = buildDgdhPromptCoreAssembler({
    context: input.context,
    prompt: input.prompt,
    renderedPrompt: input.prompt,
  });
  return {
    resolverDecision: assembled.resolverDecision,
    reasonCodes: assembled.reasonCodes,
    auditMeta: {
      source: "gemini_local.execute",
      promptChars: input.prompt.length,
      dryRunObserved: true,
    },
  };
}

export function buildGeminiPromptResolverShadowTelemetry(input: {
  context: Record<string, unknown>;
  prompt: string;
  renderedPrompt: string;
}): GeminiPromptResolverShadowTelemetry | null {
  if (!isDryRunObservationContext(input.context)) return null;

  const assembled = buildDgdhPromptCoreAssembler({
    context: input.context,
    prompt: input.prompt,
    renderedPrompt: input.renderedPrompt,
  });

  return {
    legacyPath: {
      promptChars: assembled.legacyPrompt.length,
    },
    resolverPath: {
      promptChars: assembled.resolvedPrompt.length,
      resolverDecision: assembled.resolverDecision,
      reasonCodes: assembled.reasonCodes,
    },
    comparison: {
      legacyPromptChars: assembled.legacyPrompt.length,
      resolvedPromptChars: assembled.resolvedPrompt.length,
      promptsEquivalent: assembled.legacyPrompt === assembled.resolvedPrompt,
      legacyPromptSha256: hashPrompt(assembled.legacyPrompt),
      resolvedPromptSha256: hashPrompt(assembled.resolvedPrompt),
      comparedAt: new Date(0).toISOString(),
    },
    auditMeta: {
      source: "gemini_local.execute",
      mode: "shadow",
      readOnly: true,
    },
  };
}
