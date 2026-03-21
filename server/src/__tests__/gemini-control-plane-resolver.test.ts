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

  it("uses ingested quota snapshot state as source of truth for bucket selection", () => {
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
          // Legacy state says flash is ok, but quota snapshot says flash exhausted.
          bucketState: {
            flash: "ok",
            pro: "ok",
          },
          quotaSnapshot: {
            accountLabel: "account-live",
            snapshotAt: "2026-03-19T16:40:00.000Z",
            buckets: {
              flash: { state: "exhausted", usagePercent: 100 },
              pro: { state: "ok", usagePercent: 40 },
            },
          },
        },
      },
      configuredModel: "gemini-configured",
      snapshotAt: "2026-03-19T16:41:00.000Z",
    });

    expect(result.accountLabel).toBe("account-live");
    expect(result.selected.selectedBucket).toBe("pro");
    expect(result.controlPlane.bucket.preferredState).toBe("exhausted");
    expect(result.controlPlane.bucket.selectedState).toBe("ok");
    expect(result.controlPlane.quota.source).toBe("runtime_quota_snapshot");
    expect(result.controlPlane.bucket.snapshots.flash?.usagePercent).toBe(100);
  });

  it("forces advisory fallback and emits warning when snapshot is stale", () => {
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
          mode: "soft_enforced",
          quotaStaleness: {
            maxAgeSec: 60,
          },
          quotaSnapshot: {
            accountLabel: "account-live",
            snapshotAt: "2026-03-19T16:00:00.000Z",
            buckets: {
              flash: { state: "ok", usagePercent: 30 },
              pro: { state: "ok", usagePercent: 20 },
            },
          },
        },
      },
      configuredModel: "gemini-configured",
      snapshotAt: "2026-03-19T16:10:00.000Z",
    });

    expect(result.mode).toBe("advisory");
    expect(result.advisoryOnly).toBe(true);
    expect(result.applyModelLane).toBe(false);
    expect(result.controlPlane.quota.isStale).toBe(true);
    expect(result.controlPlane.quota.staleReason).toBe("snapshot_expired");
    expect(result.controlPlane.warnings).toContain(
      "quota_snapshot_stale:snapshot_expired",
    );
    expect(result.controlPlane.warnings).toContain(
      "quota_snapshot_stale_forced_advisory: soft_enforced disabled until quota snapshot is fresh",
    );
  });

  it("accepts context flash-lite proposal when proposal matches server policy", () => {
    const result = resolveGeminiControlPlane({
      policy,
      policySource: "test-policy",
      defaultMode: "advisory",
      defaultAccountLabel: "account-1",
      context: {
        paperclipRoutingProposal: {
          taskType: "bounded-implementation",
          budgetClass: "medium",
          executionIntent: "implement",
          targetFolder: "server/src",
          doneWhen: "All acceptance criteria are met with passing tests.",
          riskLevel: "medium",
          missingInputs: [],
          needsApproval: false,
          chosenBucket: "pro",
          chosenModelLane: "gemini-3.1-pro-preview",
          fallbackBucket: "flash",
          rationale: "proposed by flash-lite router",
        },
        paperclipRoutingProposalMeta: {
          source: "flash_lite_call",
          parseStatus: "ok",
          latencyMs: 42,
          routerHealth: {
            successCount: 7,
            fallbackCount: 2,
            timeoutCount: 1,
            parseFailCount: 1,
            commandErrorCount: 0,
            cacheHitCount: 3,
            circuitOpenCount: 1,
            consecutiveFailures: 0,
            breakerOpenUntil: null,
            lastLatencyMs: 42,
            lastErrorReason: null,
          },
        },
      },
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
            model: "gemini-2.5-flash-lite",
          },
          bucketState: {
            flash: "ok",
            pro: "ok",
          },
        },
      },
      configuredModel: "gemini-configured",
      snapshotAt: "2026-03-19T18:30:00.000Z",
    });

    expect(result.selected.selectedBucket).toBe("pro");
    expect(result.controlPlane.router.source).toBe("flash_lite_call");
    expect(result.controlPlane.router.parseStatus).toBe("ok");
    expect(result.controlPlane.router.latencyMs).toBe(42);
    expect(result.controlPlane.router.accepted).toBe(true);
    expect(result.controlPlane.router.correctionReasons).toHaveLength(0);
    expect(result.controlPlane.router.health.successCount).toBe(7);
    expect(result.controlPlane.router.health.cacheHitCount).toBe(3);
  });

  it("corrects invalid flash-lite proposal using server guardrails", () => {
    const result = resolveGeminiControlPlane({
      policy,
      policySource: "test-policy",
      defaultMode: "advisory",
      defaultAccountLabel: "account-1",
      context: {
        paperclipRoutingProposal: {
          taskType: "bounded-implementation",
          budgetClass: "medium",
          chosenBucket: "flash",
          chosenModelLane: "gemini-3.1-pro-preview",
          fallbackBucket: "pro",
          rationale: "prefer flash but lane mismatched",
        },
      },
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
          quotaSnapshot: {
            snapshotAt: "2026-03-19T18:30:00.000Z",
            buckets: {
              flash: { state: "exhausted", usagePercent: 100 },
              pro: { state: "ok", usagePercent: 20 },
            },
          },
        },
      },
      configuredModel: "gemini-configured",
      snapshotAt: "2026-03-19T18:30:30.000Z",
    });

    expect(result.selected.selectedBucket).toBe("pro");
    expect(result.controlPlane.router.accepted).toBe(false);
    expect(result.controlPlane.router.correctionReasons.length).toBeGreaterThan(
      0,
    );
  });

  it("accepts valid work-packet proposal and keeps it enforced", () => {
    const result = resolveGeminiControlPlane({
      policy,
      policySource: "test-policy",
      defaultMode: "advisory",
      defaultAccountLabel: "account-1",
      context: {
        paperclipRoutingProposal: {
          taskClass: "bounded-implementation",
          budgetClass: "medium",
          executionIntent: "implement",
          targetFolder: "server/src/services",
          doneWhen: "All tests pass and route behavior is documented.",
          riskLevel: "medium",
          missingInputs: [],
          needsApproval: false,
          chosenBucket: "flash",
          chosenModelLane: "gemini-3-flash-preview",
          fallbackBucket: "pro",
          rationale: "safe default route",
        },
      },
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
        },
      },
      configuredModel: "gemini-configured",
      snapshotAt: "2026-03-19T20:10:00.000Z",
    });

    expect(result.controlPlane.router.workPacket.enforced.targetFolder).toBe(
      "server/src/services",
    );
    expect(result.controlPlane.router.workPacket.enforced.needsApproval).toBe(
      false,
    );
    expect(result.controlPlane.router.workPacket.diff).toHaveLength(0);
  });

  it("falls back to safe defaults when work-packet fields are missing", () => {
    const result = resolveGeminiControlPlane({
      policy,
      policySource: "test-policy",
      defaultMode: "advisory",
      defaultAccountLabel: "account-1",
      context: {
        paperclipRoutingProposal: {
          taskClass: "bounded-implementation",
          budgetClass: "medium",
          chosenBucket: "flash",
          chosenModelLane: "gemini-3-flash-preview",
          fallbackBucket: "pro",
          rationale: "sparse packet",
        },
      },
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
        },
      },
      configuredModel: "gemini-configured",
      snapshotAt: "2026-03-19T20:11:00.000Z",
    });

    expect(result.selected.executionIntent).toBe("implement");
    expect(result.selected.targetFolder).toBe(".");
    expect(result.selected.doneWhen.length).toBeGreaterThan(10);
    expect(result.controlPlane.router.workPacket.diff.length).toBeGreaterThan(
      0,
    );
  });

  it("escalates and blocks risky large implementation work-packets", () => {
    const result = resolveGeminiControlPlane({
      policy,
      policySource: "test-policy",
      defaultMode: "advisory",
      defaultAccountLabel: "account-1",
      context: {
        paperclipRoutingProposal: {
          taskClass: "heavy-architecture",
          budgetClass: "large",
          executionIntent: "implement",
          targetFolder: "../unsafe",
          doneWhen: "done",
          riskLevel: "low",
          missingInputs: [],
          needsApproval: false,
          chosenBucket: "pro",
          chosenModelLane: "gemini-3.1-pro-preview",
          fallbackBucket: "flash",
          rationale: "ship big migration now",
        },
      },
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
        },
      },
      configuredModel: "gemini-configured",
      snapshotAt: "2026-03-19T20:12:00.000Z",
    });

    expect(result.selected.riskLevel).toBe("high");
    expect(result.selected.needsApproval).toBe(false);
    expect(result.selected.blocked).toBe(true);
    expect(result.selected.blockReason).toBe("risk_high_large_implementation");
  });

  it("propagates missingInputs and blocks when inputs are missing", () => {
    const result = resolveGeminiControlPlane({
      policy,
      policySource: "test-policy",
      defaultMode: "advisory",
      defaultAccountLabel: "account-1",
      context: {
        paperclipRoutingProposal: {
          taskClass: "bounded-implementation",
          budgetClass: "medium",
          executionIntent: "implement",
          targetFolder: "server/src",
          doneWhen: "Implement with tests and report.",
          riskLevel: "medium",
          missingInputs: ["repo path", "acceptance criteria"],
          needsApproval: false,
          chosenBucket: "flash",
          chosenModelLane: "gemini-3-flash-preview",
          fallbackBucket: "pro",
          rationale: "needs clarifications",
        },
      },
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
        },
      },
      configuredModel: "gemini-configured",
      snapshotAt: "2026-03-19T20:13:00.000Z",
    });

    expect(result.selected.missingInputs).toEqual([
      "repo path",
      "acceptance criteria",
    ]);
    expect(result.selected.needsApproval).toBe(false);
    expect(result.selected.blocked).toBe(true);
    expect(result.selected.blockReason).toBe("missing_inputs");
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
    expect(derived.router.health.successCount).toBe(0);
    expect(derived.router.health.lastErrorReason).toBeNull();
  });
});
