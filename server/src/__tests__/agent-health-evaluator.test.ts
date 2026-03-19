import { describe, expect, it } from "vitest";
import {
  buildCompanyHealthSummary,
  evaluateAgentHealth,
} from "../services/agent-health.ts";

function runtimeState(
  tokens: {
    input?: number;
    cached?: number;
    output?: number;
    costCents?: number;
  } = {},
) {
  return {
    totalInputTokens: tokens.input ?? 0,
    totalCachedInputTokens: tokens.cached ?? 0,
    totalOutputTokens: tokens.output ?? 0,
    totalCostCents: tokens.costCents ?? 0,
  };
}

describe("evaluateAgentHealth", () => {
  it("returns unknown health when runtimeState is missing", () => {
    const result = evaluateAgentHealth({
      runtimeState: null,
      selectedRouting: null,
      quotaSnapshot: null,
      lastRunStatus: null,
      lastRunErrorCode: null,
    });

    expect(result.healthStatus).toBe("unknown");
    expect(result.budgetStatus).toBe("unknown");
  });

  it("returns running when latest run is queued", () => {
    const result = evaluateAgentHealth({
      runtimeState: runtimeState({ input: 10, output: 10 }),
      selectedRouting: { softCapTokens: 100, hardCapTokens: 200 },
      quotaSnapshot: null,
      lastRunStatus: "queued",
      lastRunErrorCode: null,
    });

    expect(result.healthStatus).toBe("running");
  });

  it("returns warning when soft cap is approaching", () => {
    const result = evaluateAgentHealth({
      runtimeState: runtimeState({ input: 40, output: 40 }),
      selectedRouting: { softCapTokens: 100, hardCapTokens: 200 },
      quotaSnapshot: null,
      lastRunStatus: "succeeded",
      lastRunErrorCode: null,
    });

    expect(result.budgetStatus).toBe("soft_cap_approaching");
    expect(result.healthStatus).toBe("warning");
  });

  it("returns warning when soft cap is exceeded without run error", () => {
    const result = evaluateAgentHealth({
      runtimeState: runtimeState({ input: 120 }),
      selectedRouting: { softCapTokens: 100, hardCapTokens: 200 },
      quotaSnapshot: null,
      lastRunStatus: "succeeded",
      lastRunErrorCode: null,
    });

    expect(result.budgetStatus).toBe("soft_cap_exceeded");
    expect(result.healthStatus).toBe("warning");
  });

  it("returns critical when soft cap is exceeded and non-cancel error exists", () => {
    const result = evaluateAgentHealth({
      runtimeState: runtimeState({ input: 120 }),
      selectedRouting: { softCapTokens: 100, hardCapTokens: 200 },
      quotaSnapshot: null,
      lastRunStatus: "failed",
      lastRunErrorCode: "tool_crash",
    });

    expect(result.budgetStatus).toBe("soft_cap_exceeded");
    expect(result.healthStatus).toBe("critical");
  });

  it("returns critical when hard cap is exceeded", () => {
    const result = evaluateAgentHealth({
      runtimeState: runtimeState({ input: 220 }),
      selectedRouting: { softCapTokens: 100, hardCapTokens: 200 },
      quotaSnapshot: null,
      lastRunStatus: "succeeded",
      lastRunErrorCode: null,
    });

    expect(result.budgetStatus).toBe("hard_cap_exceeded");
    expect(result.healthStatus).toBe("critical");
  });

  it("returns degraded when last run has non-cancel error and budget is ok", () => {
    const result = evaluateAgentHealth({
      runtimeState: runtimeState({ input: 30 }),
      selectedRouting: { softCapTokens: 100, hardCapTokens: 200 },
      quotaSnapshot: null,
      lastRunStatus: "failed",
      lastRunErrorCode: "adapter_timeout",
    });

    expect(result.budgetStatus).toBe("ok");
    expect(result.healthStatus).toBe("degraded");
  });

  it("does not degrade for cancelled errors", () => {
    const result = evaluateAgentHealth({
      runtimeState: runtimeState({ input: 30 }),
      selectedRouting: { softCapTokens: 100, hardCapTokens: 200 },
      quotaSnapshot: null,
      lastRunStatus: "cancelled",
      lastRunErrorCode: "cancelled",
    });

    expect(result.budgetStatus).toBe("ok");
    expect(result.healthStatus).toBe("ok");
  });

  it("returns unknown budget when hard cap is missing", () => {
    const result = evaluateAgentHealth({
      runtimeState: runtimeState({ input: 30 }),
      selectedRouting: { softCapTokens: 100 },
      quotaSnapshot: null,
      lastRunStatus: "succeeded",
      lastRunErrorCode: null,
    });

    expect(result.budgetStatus).toBe("unknown");
  });
});

describe("buildCompanyHealthSummary", () => {
  it("aggregates counts and highestSeverity", () => {
    const summary = buildCompanyHealthSummary([
      {
        agentId: "a1",
        agentName: "Alpha",
        healthStatus: "warning",
        budgetStatus: "soft_cap_approaching",
      },
      {
        agentId: "a2",
        agentName: "Bravo",
        healthStatus: "critical",
        budgetStatus: "hard_cap_exceeded",
      },
      {
        agentId: "a3",
        agentName: "Charlie",
        healthStatus: "ok",
        budgetStatus: "ok",
      },
      {
        agentId: "a4",
        agentName: "Delta",
        healthStatus: "degraded",
        budgetStatus: "soft_cap_exceeded",
      },
    ]);

    expect(summary.countsByHealthStatus.critical).toBe(1);
    expect(summary.countsByHealthStatus.degraded).toBe(1);
    expect(summary.countsByHealthStatus.warning).toBe(1);
    expect(summary.countsByHealthStatus.ok).toBe(1);
    expect(summary.countsByBudgetStatus.hard_cap_exceeded).toBe(1);
    expect(summary.countsByBudgetStatus.soft_cap_exceeded).toBe(1);
    expect(summary.countsByBudgetStatus.soft_cap_approaching).toBe(1);
    expect(summary.highestSeverity).toBe("critical");
  });

  it("returns atRiskAgents in stable severity order", () => {
    const summary = buildCompanyHealthSummary([
      {
        agentId: "a1",
        agentName: "Zulu",
        healthStatus: "warning",
        budgetStatus: "soft_cap_approaching",
      },
      {
        agentId: "a2",
        agentName: "Alpha",
        healthStatus: "critical",
        budgetStatus: "hard_cap_exceeded",
      },
      {
        agentId: "a3",
        agentName: "Beta",
        healthStatus: "degraded",
        budgetStatus: "soft_cap_exceeded",
      },
      {
        agentId: "a4",
        agentName: "Gamma",
        healthStatus: "running",
        budgetStatus: "ok",
      },
    ]);

    expect(summary.atRiskAgents.map((agent) => agent.agentId)).toEqual([
      "a2",
      "a3",
      "a1",
    ]);
  });
});
