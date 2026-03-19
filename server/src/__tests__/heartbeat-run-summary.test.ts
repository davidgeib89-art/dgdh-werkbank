import { describe, expect, it } from "vitest";
import { summarizeHeartbeatRunResultJson } from "../services/heartbeat-run-summary.js";

describe("summarizeHeartbeatRunResultJson", () => {
  it("truncates text fields and preserves cost aliases", () => {
    const summary = summarizeHeartbeatRunResultJson({
      summary: "a".repeat(600),
      result: "ok",
      message: "done",
      error: "failed",
      total_cost_usd: 1.23,
      cost_usd: 0.45,
      costUsd: 0.67,
      nested: { ignored: true },
    });

    expect(summary).toEqual({
      summary: "a".repeat(500),
      result: "ok",
      message: "done",
      error: "failed",
      total_cost_usd: 1.23,
      cost_usd: 0.45,
      costUsd: 0.67,
    });
  });

  it("returns null for non-object and irrelevant payloads", () => {
    expect(summarizeHeartbeatRunResultJson(null)).toBeNull();
    expect(summarizeHeartbeatRunResultJson(["nope"] as unknown as Record<string, unknown>)).toBeNull();
    expect(summarizeHeartbeatRunResultJson({ nested: { only: "ignored" } })).toBeNull();
  });

  it("labels routing_blocked resultJson as blocked with reason", () => {
    const summary = summarizeHeartbeatRunResultJson({
      type: "routing_blocked",
      status: "blocked",
      blockReason: "missing_inputs",
      needsApproval: false,
      missingInputs: ["repo path", "acceptance criteria"],
      executionIntent: "implement",
      riskLevel: "medium",
      taskType: "bounded-implementation",
      budgetClass: "medium",
    });

    expect(summary).toEqual({
      result: "blocked",
      summary: "Routing blocked: missing_inputs",
    });
  });

  it("adds operator-approval message when needsApproval is true", () => {
    const summary = summarizeHeartbeatRunResultJson({
      type: "routing_blocked",
      status: "blocked",
      blockReason: "risk_high_large_implementation",
      needsApproval: true,
      missingInputs: [],
      executionIntent: "implement",
      riskLevel: "high",
      taskType: "heavy-architecture",
      budgetClass: "large",
    });

    expect(summary).toEqual({
      result: "blocked",
      summary: "Routing blocked: risk_high_large_implementation",
      message: "Task requires operator approval before execution",
    });
  });

  it("does not overwrite explicit summary with routing blocked label when summary is already set", () => {
    const summary = summarizeHeartbeatRunResultJson({
      type: "routing_blocked",
      status: "blocked",
      blockReason: "missing_inputs",
      needsApproval: false,
      summary: "already detailed summary",
    });

    expect(summary).toEqual({
      result: "blocked",
      summary: "Routing blocked: missing_inputs",
    });
  });
});
