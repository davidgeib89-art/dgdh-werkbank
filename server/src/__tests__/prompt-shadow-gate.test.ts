import { describe, expect, it } from "vitest";
import {
  evaluateControlledLiveGateReadiness,
  summarizePromptShadowTelemetry,
} from "../services/prompt-shadow-gate.js";

describe("prompt shadow gate review helpers", () => {
  it("summarizes parity, resolver decisions, and reasonCode distribution", () => {
    const summary = summarizePromptShadowTelemetry([
      {
        promptResolverDryRunPreflight: {
          resolverDecision: "ok",
          reasonCodes: [],
          auditMeta: {
            source: "gemini_local.execute",
            promptChars: 42,
            dryRunObserved: true,
          },
        },
        promptResolverShadow: {
          legacyPath: { promptChars: 42 },
          resolverPath: {
            promptChars: 42,
            resolverDecision: "ok",
            reasonCodes: [],
          },
          comparison: {
            legacyPromptChars: 42,
            resolvedPromptChars: 42,
            promptsEquivalent: true,
            legacyPromptSha256: "a",
            resolvedPromptSha256: "a",
            comparedAt: "1970-01-01T00:00:00.000Z",
          },
          auditMeta: {
            source: "gemini_local.execute",
            mode: "shadow",
            readOnly: true,
          },
        },
      },
      {
        promptResolverDryRunPreflight: {
          resolverDecision: "escalated",
          reasonCodes: ["SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS"],
          auditMeta: {
            source: "gemini_local.execute",
            promptChars: 43,
            dryRunObserved: true,
          },
        },
        promptResolverShadow: {
          legacyPath: { promptChars: 43 },
          resolverPath: {
            promptChars: 43,
            resolverDecision: "escalated",
            reasonCodes: ["SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS"],
          },
          comparison: {
            legacyPromptChars: 43,
            resolvedPromptChars: 43,
            promptsEquivalent: true,
            legacyPromptSha256: "b",
            resolvedPromptSha256: "b",
            comparedAt: "1970-01-01T00:00:00.000Z",
          },
          auditMeta: {
            source: "gemini_local.execute",
            mode: "shadow",
            readOnly: true,
          },
        },
      },
    ]);

    expect(summary.sampleCount).toBe(2);
    expect(summary.comparedCount).toBe(2);
    expect(summary.parity.parityRate).toBe(1);
    expect(summary.resolverDecisionDistribution).toEqual({
      ok: 1,
      fail: 0,
      escalated: 1,
    });
    expect(summary.preflightDecisionDistribution).toEqual({
      ok: 1,
      fail: 0,
      escalated: 1,
    });
    expect(summary.reasonCodeDistribution).toEqual({
      SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS: 2,
    });
    expect(summary.auditSignals).toMatchObject({
      dryRunObservedTrue: 2,
      readOnlyTrue: 2,
      shadowMode: 2,
      readOnlyViolations: 0,
    });
  });

  it("returns GO when thresholds are satisfied", () => {
    const summary = summarizePromptShadowTelemetry([
      {
        promptResolverDryRunPreflight: {
          resolverDecision: "ok",
          reasonCodes: [],
          auditMeta: {
            source: "gemini_local.execute",
            promptChars: 42,
            dryRunObserved: true,
          },
        },
        promptResolverShadow: {
          legacyPath: { promptChars: 42 },
          resolverPath: {
            promptChars: 42,
            resolverDecision: "ok",
            reasonCodes: [],
          },
          comparison: {
            legacyPromptChars: 42,
            resolvedPromptChars: 42,
            promptsEquivalent: true,
            legacyPromptSha256: "a",
            resolvedPromptSha256: "a",
            comparedAt: "1970-01-01T00:00:00.000Z",
          },
          auditMeta: {
            source: "gemini_local.execute",
            mode: "shadow",
            readOnly: true,
          },
        },
      },
    ]);

    const gate = evaluateControlledLiveGateReadiness({ summary });
    expect(gate.status).toBe("go");
    expect(gate.reasons).toEqual([]);
  });

  it("returns WARNING for insufficient sample size", () => {
    const summary = summarizePromptShadowTelemetry([]);
    const gate = evaluateControlledLiveGateReadiness({
      summary,
      thresholds: {
        minComparedSamples: 2,
        minParityRate: 0,
      },
    });

    expect(gate.status).toBe("warning");
    expect(gate.reasons).toContain("insufficient_shadow_samples");
  });

  it("returns NO-GO for parity mismatch, fail decision, or read-only violation", () => {
    const summary = summarizePromptShadowTelemetry([
      {
        promptResolverDryRunPreflight: {
          resolverDecision: "fail",
          reasonCodes: ["TOOL_CONFLICT"],
          auditMeta: {
            source: "gemini_local.execute",
            promptChars: 50,
            dryRunObserved: true,
          },
        },
        promptResolverShadow: {
          legacyPath: { promptChars: 50 },
          resolverPath: {
            promptChars: 50,
            resolverDecision: "fail",
            reasonCodes: ["TOOL_CONFLICT"],
          },
          comparison: {
            legacyPromptChars: 50,
            resolvedPromptChars: 50,
            promptsEquivalent: false,
            legacyPromptSha256: "a",
            resolvedPromptSha256: "b",
            comparedAt: "1970-01-01T00:00:00.000Z",
          },
          auditMeta: {
            source: "gemini_local.execute",
            mode: "shadow",
            readOnly: false,
          },
        },
      },
    ]);

    const gate = evaluateControlledLiveGateReadiness({ summary });
    expect(gate.status).toBe("no-go");
    expect(gate.reasons).toEqual(
      expect.arrayContaining([
        "shadow_parity_below_threshold",
        "resolver_fail_decisions_detected",
        "read_only_violation_detected",
      ]),
    );
  });
});
