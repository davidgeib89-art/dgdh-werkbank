import { describe, expect, it } from "vitest";
import {
  deriveGeminiControlPlaneState,
  resolveGeminiControlPlane,
} from "../services/gemini-control-plane.ts";

const policy = {
  taskRoutes: {
    "research-light": {
      preferredBucket: "flash",
      fallbackBucket: "pro",
      reason: "research-light route",
    },
    "bounded-implementation": {
      preferredBucket: "flash",
      fallbackBucket: "pro",
      reason: "bounded route",
    },
    "heavy-architecture": {
      preferredBucket: "pro",
      fallbackBucket: "flash",
      reason: "architecture route",
    },
    "benchmark-floor": {
      preferredBucket: "flash",
      fallbackBucket: "flash",
      reason: "benchmark route",
    },
  },
  bucketModels: {
    flash: "gemini-3-flash-preview",
    pro: "gemini-3.1-pro-preview",
    "flash-lite": "gemini-2.5-flash-lite",
  },
} as const;

describe("resolveGeminiControlPlane", () => {
  it("resolves task->budget->bucket->model lane in soft_enforced mode", () => {
    const result = resolveGeminiControlPlane({
      policy,
      policySource: "test-policy",
      defaultMode: "advisory",
      defaultAccountLabel: "account-1",
      context: {
        paperclipTaskPrompt: "architecture redesign",
        budgetClass: "large",
      },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          accountLabel: "account-2",
          bucketState: {
            flash: "ok",
            pro: "ok",
            "flash-lite": "cooldown",
          },
        },
      },
      configuredModel: "gemini-custom-model",
      snapshotAt: "2026-03-19T16:20:00.000Z",
    });

    expect(result.taskType).toBe("heavy-architecture");
    expect(result.budgetClass).toBe("large");
    expect(result.selected.selectedBucket).toBe("pro");
    expect(result.selected.effectiveModelLane).toBe("gemini-3.1-pro-preview");
    expect(result.applyModelLane).toBe(true);
    expect(result.controlPlane.accountLabel).toBe("account-2");
  });

  it("honors manual override for bucket and model lane", () => {
    const result = resolveGeminiControlPlane({
      policy,
      policySource: "test-policy",
      defaultMode: "advisory",
      defaultAccountLabel: "account-1",
      context: {
        taskType: "bounded-implementation",
      },
      runtimeConfig: {
        routingPolicy: {
          mode: "advisory",
          bucketState: {
            flash: "ok",
            pro: "ok",
            "flash-lite": "ok",
          },
          manualOverride: {
            enabled: true,
            bucket: "flash-lite",
            modelLane: "gemini-manual-lane",
            reason: "operator override",
          },
        },
      },
      configuredModel: "gemini-configured",
      snapshotAt: "2026-03-19T16:20:00.000Z",
    });

    expect(result.selected.selectedBucket).toBe("flash-lite");
    expect(result.selected.effectiveModelLane).toBe("gemini-manual-lane");
    expect(result.controlPlane.manualOverride?.enabled).toBe(true);
    expect(result.controlPlane.modelLane.reason).toContain("manual override");
  });
});

describe("deriveGeminiControlPlaneState", () => {
  it("builds canonical state from preflight and quota snapshot fallback", () => {
    const derived = deriveGeminiControlPlaneState(
      {
        selected: {
          accountLabel: "account-1",
          selectedBucket: "flash",
          configuredBucket: "flash",
          effectiveBucket: "flash",
          configuredModelLane: "gemini-configured",
          recommendedModelLane: "gemini-recommended",
          effectiveModelLane: "gemini-effective",
          laneStrategy: "advisory_keep_configured",
          modelLaneReason: "advisory",
          budgetClass: "medium",
          hardCapTokens: 75000,
          softCapTokens: 60000,
          taskType: "bounded-implementation",
        },
        quotaState: {
          bucketState: "ok",
          snapshotAt: "2026-03-19T16:20:00.000Z",
        },
        mode: "advisory",
        policySource: "test-policy",
        applyModelLane: false,
      },
      {
        laneStrategy: "advisory_keep_configured",
        modelLaneReason: "advisory",
      },
    );

    expect(derived.accountLabel).toBe("account-1");
    expect(derived.bucket.selected).toBe("flash");
    expect(derived.bucket.selectedState).toBe("ok");
    expect(derived.modelLane.effective).toBe("gemini-effective");
    expect(derived.quota.hardCapTokens).toBe(75000);
  });
});
