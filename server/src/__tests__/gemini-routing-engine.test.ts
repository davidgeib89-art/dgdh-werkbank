import { describe, expect, it } from "vitest";
import {
  classifyQuotaHealth,
  computeQuotaConfidence,
  shouldUseGeminiQuota,
  resolveGeminiRoutingPreflight,
} from "../services/gemini-routing.ts";

describe("classifyQuotaHealth", () => {
  it("0-60% usage => healthy", () => {
    expect(classifyQuotaHealth(0, "ok")).toBe("healthy");
    expect(classifyQuotaHealth(30, "ok")).toBe("healthy");
    expect(classifyQuotaHealth(60, "ok")).toBe("healthy");
  });

  it("61-80% usage => watch", () => {
    expect(classifyQuotaHealth(61, "ok")).toBe("watch");
    expect(classifyQuotaHealth(75, "ok")).toBe("watch");
    expect(classifyQuotaHealth(80, "ok")).toBe("watch");
  });

  it("81-95% usage => conserve", () => {
    expect(classifyQuotaHealth(81, "ok")).toBe("conserve");
    expect(classifyQuotaHealth(90, "ok")).toBe("conserve");
    expect(classifyQuotaHealth(95, "ok")).toBe("conserve");
  });

  it(">95% usage => avoid", () => {
    expect(classifyQuotaHealth(96, "ok")).toBe("avoid");
    expect(classifyQuotaHealth(100, "ok")).toBe("avoid");
  });

  it("exhausted state => unavailable regardless of usage", () => {
    expect(classifyQuotaHealth(30, "exhausted")).toBe("unavailable");
    expect(classifyQuotaHealth(null, "exhausted")).toBe("unavailable");
  });

  it("cooldown state => unavailable regardless of usage", () => {
    expect(classifyQuotaHealth(50, "cooldown")).toBe("unavailable");
  });

  it("null usage => watch", () => {
    expect(classifyQuotaHealth(null, "ok")).toBe("watch");
    expect(classifyQuotaHealth(null, null)).toBe("watch");
  });
});

describe("computeQuotaConfidence", () => {
  it("fresh + healthy => high", () => {
    expect(computeQuotaConfidence(false, null, "healthy")).toBe("high");
  });

  it("stale snapshot => low", () => {
    expect(computeQuotaConfidence(true, "snapshot_expired", "healthy")).toBe(
      "low",
    );
  });

  it("unavailable bucket => medium", () => {
    expect(computeQuotaConfidence(false, null, "unavailable")).toBe("medium");
  });

  it("stale + unavailable => low (stale takes priority)", () => {
    expect(
      computeQuotaConfidence(true, "missing_snapshot", "unavailable"),
    ).toBe("low");
  });
});

describe("shouldUseGeminiQuota", () => {
  it("healthy => true", () => {
    expect(shouldUseGeminiQuota("healthy")).toBe(true);
  });

  it("watch => true", () => {
    expect(shouldUseGeminiQuota("watch")).toBe(true);
  });

  it("conserve => true", () => {
    expect(shouldUseGeminiQuota("conserve")).toBe(true);
  });

  it("avoid => false", () => {
    expect(shouldUseGeminiQuota("avoid")).toBe(false);
  });

  it("unavailable => false", () => {
    expect(shouldUseGeminiQuota("unavailable")).toBe(false);
  });
});

describe("resolveGeminiRoutingPreflight extended fields", () => {
  it("returns null for non-gemini adapter", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "claude_local",
      adapterConfig: {},
      runtimeConfig: {},
      context: {},
    });
    expect(result).toBeNull();
  });

  it("includes useGeminiQuota, quotaConfidence, quotaHealth for gemini adapter", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          bucketState: { flash: "ok", pro: "ok", "flash-lite": "ok" },
          quotaSnapshot: {
            snapshotAt: new Date().toISOString(),
            buckets: {
              flash: { state: "ok", usagePercent: 30 },
              pro: { state: "ok", usagePercent: 15 },
              "flash-lite": { state: "ok", usagePercent: 5 },
            },
          },
        },
      },
      context: {},
    });
    expect(result).not.toBeNull();
    expect(result!.useGeminiQuota).toBe(true);
    expect(result!.quotaConfidence).toBe("high");
    expect(result!.quotaHealth).toBe("healthy");
  });

  it("sets useGeminiQuota=false when bucket is exhausted", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          bucketState: {
            flash: "exhausted",
            pro: "exhausted",
            "flash-lite": "exhausted",
          },
        },
      },
      context: {},
    });
    expect(result).not.toBeNull();
    expect(result!.useGeminiQuota).toBe(false);
    expect(result!.quotaHealth).toBe("unavailable");
  });

  it("stale snapshot => low confidence", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {},
      },
      context: {},
    });
    expect(result).not.toBeNull();
    expect(result!.quotaConfidence).toBe("low");
  });

  it("light task + flash-lite healthy => flash bucket selected", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: { flash: "ok", pro: "ok", "flash-lite": "ok" },
          quotaSnapshot: {
            snapshotAt: new Date().toISOString(),
            buckets: {
              flash: { state: "ok", usagePercent: 20 },
            },
          },
        },
      },
      context: {
        paperclipTaskPrompt: "review this text file quickly",
        taskType: "research-light",
      },
    });
    expect(result).not.toBeNull();
    expect(result!.selected.selectedBucket).toBe("flash");
    expect(result!.useGeminiQuota).toBe(true);
  });

  it("heavy task + pro healthy => pro bucket selected", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3.1-pro-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: { flash: "ok", pro: "ok", "flash-lite": "ok" },
          quotaSnapshot: {
            snapshotAt: new Date().toISOString(),
            buckets: {
              pro: { state: "ok", usagePercent: 25 },
            },
          },
        },
      },
      context: {
        paperclipTaskPrompt: "design the new architecture for the routing engine",
        taskType: "heavy-architecture",
      },
    });
    expect(result).not.toBeNull();
    expect(result!.selected.selectedBucket).toBe("pro");
  });

  it("heavy task + pro exhausted => flash fallback", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3.1-pro-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: { flash: "ok", pro: "exhausted", "flash-lite": "ok" },
          quotaSnapshot: {
            snapshotAt: new Date().toISOString(),
            buckets: {
              flash: { state: "ok", usagePercent: 40 },
              pro: { state: "exhausted", usagePercent: 100 },
            },
          },
        },
      },
      context: {
        paperclipTaskPrompt: "design the architecture roadmap",
        taskType: "heavy-architecture",
      },
    });
    expect(result).not.toBeNull();
    expect(result!.selected.selectedBucket).toBe("flash");
  });

  it("packetType deterministic_tool hard-blocks the run and disables model-lane apply", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: { flash: "ok", pro: "ok", "flash-lite": "ok" },
        },
      },
      context: {
        packetType: "deterministic_tool",
        role: "worker",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.laneDecision.lane).toBe("deterministic_tool");
    expect(result!.laneDecision.source).toBe("packet_type");
    expect(result!.selected.blocked).toBe(true);
    expect(result!.selected.blockReason).toBe("deterministic_tool_no_llm_call");
    expect(result!.applyModelLane).toBe(false);
    expect(result!.useGeminiQuota).toBe(false);
    expect(result!.routingReason).toContain("lane=deterministic_tool");
  });

  it("packetType free_api prefers flash-lite lane", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3.1-pro-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: { flash: "ok", pro: "ok", "flash-lite": "ok" },
        },
      },
      context: {
        packetType: "free_api",
        role: "worker",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.laneDecision.lane).toBe("free_api");
    expect(result!.selected.selectedBucket).toBe("flash-lite");
    expect(result!.selected.effectiveModelLane).toBe("gemini-2.5-flash-lite");
    expect(result!.applyModelLane).toBe(true);
    expect(result!.routingReason).toContain("lane=free_api");
  });

  it("packetType free_api on ceo prefers flash before flash-lite", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3.1-pro-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: { flash: "ok", pro: "ok", "flash-lite": "ok" },
        },
      },
      context: {
        packetType: "free_api",
        role: "ceo",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.laneDecision.lane).toBe("free_api");
    expect(result!.selected.selectedBucket).toBe("flash");
    expect(result!.selected.effectiveModelLane).toBe("gemini-3-flash-preview");
    expect(result!.routingReason).toContain("role=ceo");
  });

  it("packetType premium_model prefers pro and degrades to flash if pro is exhausted", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: {
            flash: "ok",
            pro: "exhausted",
            "flash-lite": "ok",
          },
        },
      },
      context: {
        packetType: "premium_model",
        role: "ceo",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.laneDecision.lane).toBe("premium_model");
    expect(result!.selected.selectedBucket).toBe("flash");
    expect(result!.selected.effectiveModelLane).toBe("gemini-3-flash-preview");
    expect(result!.routingReason).toContain("lane=premium_model");
  });

  it("role hint ceo prefers premium lane when packetType is absent", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: {
            flash: "ok",
            pro: "ok",
            "flash-lite": "ok",
          },
        },
      },
      context: {
        role: "ceo",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.laneDecision.source).toBe("role_hint");
    expect(result!.laneDecision.lane).toBe("premium_model");
    expect(result!.selected.selectedBucket).toBe("pro");
    expect(result!.selected.effectiveModelLane).toBe("gemini-3.1-pro-preview");
    expect(result!.routingReason).toContain("role=ceo");
  });

  it("raw preflight still prefers CEO premium role hint before heartbeat pins explicit flash lane", () => {
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "auto" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: {
            flash: "ok",
            pro: "ok",
            "flash-lite": "ok",
          },
          quotaSnapshot: {
            snapshotAt: "2026-03-26T19:30:47.391Z",
            buckets: {
              flash: { state: "ok", usagePercent: 34 },
              pro: { state: "ok", usagePercent: 0 },
              "flash-lite": { state: "ok", usagePercent: 9 },
            },
          },
        },
      },
      context: {
        packetType: null,
        role: "ceo",
        paperclipRoutingProposal: {
          taskType: "research-light",
          taskClass: "research-light",
          budgetClass: "small",
          executionIntent: "investigate",
          targetFile: "n/a",
          targetFolder: "n/a",
          artifactKind: "multi_file_change",
          doneWhen:
            "Provide a direct answer on DAV-131's same-session resume capability and the verified skill brief's audit path.",
          riskLevel: "low",
          missingInputs: [],
          needsApproval: false,
          chosenBucket: "flash-lite",
          chosenModelLane: "gemini-2.5-flash-lite",
          fallbackBucket: "flash",
          rationale:
            "research-light task, small budget, uses flash-lite bucket, requires repo-read skill to inspect DAV-131 and heartbeat runs.",
        },
        paperclipRoutingProposalMeta: {
          source: "flash_lite_call",
          parseStatus: "ok",
          latencyMs: 25152,
        },
      },
    });

    expect(result).not.toBeNull();
    expect(result!.advisoryOnly).toBe(true);
    expect(result!.laneDecision.source).toBe("role_hint");
    expect(result!.laneDecision.lane).toBe("premium_model");
    expect(result!.selected.selectedBucket).toBe("pro");
    expect(result!.selected.effectiveModelLane).toBe("gemini-3.1-pro-preview");
  });

  it("keeps adapterConfig.model on auto even when applyModelLane is true", () => {
    const adapterConfig = { model: "auto" };

    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig,
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: {
            flash: "ok",
            pro: "ok",
            "flash-lite": "ok",
          },
        },
      },
      context: {
        role: "ceo",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.applyModelLane).toBe(true);
    expect(result!.selected.effectiveModelLane).toBe("gemini-3.1-pro-preview");
    expect(adapterConfig.model).toBe("auto");
  });

  it("still mutates explicit adapterConfig.model when applyModelLane is true", () => {
    const adapterConfig = { model: "gemini-3-flash-preview" };

    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig,
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: {
            flash: "ok",
            pro: "ok",
            "flash-lite": "ok",
          },
        },
      },
      context: {
        role: "ceo",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.applyModelLane).toBe(true);
    expect(adapterConfig.model).toBe("gemini-3.1-pro-preview");
  });

  it("packetType free_api keeps model: auto", () => {
    const adapterConfig = { model: "auto" };
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig,
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          bucketState: { flash: "ok", pro: "ok", "flash-lite": "ok" },
        },
      },
      context: {
        packetType: "free_api",
        role: "worker",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.laneDecision.lane).toBe("free_api");
    expect(result!.applyModelLane).toBe(true);
    expect(result!.selected.effectiveModelLane).toBe("gemini-2.5-flash-lite");
    expect(adapterConfig.model).toBe("auto");
  });
});
