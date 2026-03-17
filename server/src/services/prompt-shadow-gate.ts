import type { AdapterInvocationMeta } from "@paperclipai/adapter-utils";

export type ControlledLiveGateStatus = "go" | "warning" | "no-go";

export interface PromptShadowGateThresholds {
  minComparedSamples: number;
  minParityRate: number;
  maxFailDecisions: number;
  maxReadOnlyViolations: number;
}

export interface PromptShadowReviewSummary {
  sampleCount: number;
  dryRunPreflightCount: number;
  shadowCount: number;
  comparedCount: number;
  parity: {
    equivalentCount: number;
    mismatchCount: number;
    parityRate: number;
  };
  resolverDecisionDistribution: {
    ok: number;
    fail: number;
    escalated: number;
  };
  preflightDecisionDistribution: {
    ok: number;
    fail: number;
    escalated: number;
  };
  reasonCodeDistribution: Record<string, number>;
  auditSignals: {
    dryRunObservedTrue: number;
    readOnlyTrue: number;
    shadowMode: number;
    sourceGeminiLocalExecute: number;
    readOnlyViolations: number;
  };
}

export interface PromptShadowGateReadiness {
  status: ControlledLiveGateStatus;
  reasons: string[];
  summary: PromptShadowReviewSummary;
  thresholds: PromptShadowGateThresholds;
}

const DEFAULT_THRESHOLDS: PromptShadowGateThresholds = {
  minComparedSamples: 1,
  minParityRate: 1,
  maxFailDecisions: 0,
  maxReadOnlyViolations: 0,
};

function incrementCounter(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function isFiniteRate(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function summarizePromptShadowTelemetry(
  samples: Array<
    Pick<
      AdapterInvocationMeta,
      "promptResolverDryRunPreflight" | "promptResolverShadow"
    >
  >,
): PromptShadowReviewSummary {
  let dryRunPreflightCount = 0;
  let shadowCount = 0;
  let comparedCount = 0;
  let equivalentCount = 0;
  let mismatchCount = 0;
  let preflightOk = 0;
  let preflightFail = 0;
  let preflightEscalated = 0;
  let shadowOk = 0;
  let shadowFail = 0;
  let shadowEscalated = 0;

  const reasonCodeDistribution: Record<string, number> = {};
  const auditSignals = {
    dryRunObservedTrue: 0,
    readOnlyTrue: 0,
    shadowMode: 0,
    sourceGeminiLocalExecute: 0,
    readOnlyViolations: 0,
  };

  for (const sample of samples) {
    const preflight = sample.promptResolverDryRunPreflight;
    if (preflight) {
      dryRunPreflightCount += 1;
      if (preflight.resolverDecision === "ok") preflightOk += 1;
      if (preflight.resolverDecision === "fail") preflightFail += 1;
      if (preflight.resolverDecision === "escalated") preflightEscalated += 1;
      for (const code of preflight.reasonCodes) {
        incrementCounter(reasonCodeDistribution, code);
      }
      if (preflight.auditMeta?.dryRunObserved === true) {
        auditSignals.dryRunObservedTrue += 1;
      }
      if (preflight.auditMeta?.source === "gemini_local.execute") {
        auditSignals.sourceGeminiLocalExecute += 1;
      }
    }

    const shadow = sample.promptResolverShadow;
    if (shadow) {
      shadowCount += 1;
      if (shadow.resolverPath.resolverDecision === "ok") shadowOk += 1;
      if (shadow.resolverPath.resolverDecision === "fail") shadowFail += 1;
      if (shadow.resolverPath.resolverDecision === "escalated")
        shadowEscalated += 1;
      for (const code of shadow.resolverPath.reasonCodes) {
        incrementCounter(reasonCodeDistribution, code);
      }
      if (shadow.auditMeta.readOnly === true) {
        auditSignals.readOnlyTrue += 1;
      } else {
        auditSignals.readOnlyViolations += 1;
      }
      if (shadow.auditMeta.mode === "shadow") {
        auditSignals.shadowMode += 1;
      }
      if (shadow.auditMeta.source === "gemini_local.execute") {
        auditSignals.sourceGeminiLocalExecute += 1;
      }
      comparedCount += 1;
      if (shadow.comparison.promptsEquivalent) {
        equivalentCount += 1;
      } else {
        mismatchCount += 1;
      }
    }
  }

  return {
    sampleCount: samples.length,
    dryRunPreflightCount,
    shadowCount,
    comparedCount,
    parity: {
      equivalentCount,
      mismatchCount,
      parityRate: comparedCount > 0 ? equivalentCount / comparedCount : 0,
    },
    resolverDecisionDistribution: {
      ok: shadowOk,
      fail: shadowFail,
      escalated: shadowEscalated,
    },
    preflightDecisionDistribution: {
      ok: preflightOk,
      fail: preflightFail,
      escalated: preflightEscalated,
    },
    reasonCodeDistribution,
    auditSignals,
  };
}

export function evaluateControlledLiveGateReadiness(input: {
  summary: PromptShadowReviewSummary;
  thresholds?: Partial<PromptShadowGateThresholds>;
}): PromptShadowGateReadiness {
  const thresholds: PromptShadowGateThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(input.thresholds ?? {}),
  };

  if (!isFiniteRate(thresholds.minParityRate)) {
    throw new Error("threshold minParityRate must be within [0,1]");
  }

  const reasons: string[] = [];
  const summary = input.summary;

  if (summary.comparedCount < thresholds.minComparedSamples) {
    reasons.push("insufficient_shadow_samples");
  }
  if (summary.parity.parityRate < thresholds.minParityRate) {
    reasons.push("shadow_parity_below_threshold");
  }
  if (
    summary.resolverDecisionDistribution.fail > thresholds.maxFailDecisions ||
    summary.preflightDecisionDistribution.fail > thresholds.maxFailDecisions
  ) {
    reasons.push("resolver_fail_decisions_detected");
  }
  if (
    summary.auditSignals.readOnlyViolations > thresholds.maxReadOnlyViolations
  ) {
    reasons.push("read_only_violation_detected");
  }

  const hasNoGoReason = reasons.some(
    (reason) =>
      reason === "shadow_parity_below_threshold" ||
      reason === "resolver_fail_decisions_detected" ||
      reason === "read_only_violation_detected",
  );

  const status: ControlledLiveGateStatus = hasNoGoReason
    ? "no-go"
    : reasons.length > 0
    ? "warning"
    : "go";

  return {
    status,
    reasons,
    summary,
    thresholds,
  };
}
