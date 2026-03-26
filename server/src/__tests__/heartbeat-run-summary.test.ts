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

  it("handles routing_awaiting_approval resultJson as awaiting_approval", () => {
    // Verifies the resultJson shape written by the awaiting_approval gate
    // when needsApproval=true and blocked=false.
    const summary = summarizeHeartbeatRunResultJson({
      type: "routing_awaiting_approval",
      status: "awaiting_approval",
      blockReason: "needs_operator_approval",
      needsApproval: true,
      missingInputs: [],
      executionIntent: "implement",
      riskLevel: "high",
      taskType: "heavy-architecture",
      budgetClass: "medium",
    });

    expect(summary).toEqual({
      result: "awaiting_approval",
      summary: "Awaiting operator approval",
      message: "Task requires operator approval before execution",
    });
  });

  it("labels loop_detected resultJson as blocked with cleanup message", () => {
    const summary = summarizeHeartbeatRunResultJson({
      type: "loop_detected",
      status: "blocked",
      result: "blocked",
      summary: "Loop detected: same command failed 5x. Stopping to prevent token waste.",
      message: "Workspace reset with git checkout -- .",
      workspaceReset: true,
    });

    expect(summary).toEqual({
      result: "blocked",
      summary: "Loop detected: same command failed 5x. Stopping to prevent token waste.",
      message: "Workspace reset with git checkout -- .",
    });
  });

  it("labels post_tool_capacity_exhausted resultJson as deferred with cooldown message", () => {
    const summary = summarizeHeartbeatRunResultJson({
      type: "post_tool_capacity_exhausted",
      status: "cooldown_pending",
      result: "deferred",
      message: "You have exhausted your capacity on this model. Try again later.",
      deferredState: {
        state: "cooldown_pending",
        issueId: "issue-1",
        nextResumePoint: "resume_existing_session_before_child_create",
        cooldownUntil: "2026-03-25T10:05:00.000Z",
      },
      resume: {
        state: "cooldown_pending",
        sessionId: "session-1",
        taskKey: "issue:issue-1",
        nextWakeStatus: "deferred_capacity_cooldown",
        nextWakeNotBefore: "2026-03-25T10:05:00.000Z",
      },
    });

    expect(summary).toEqual({
      result: "deferred",
      blockerClass: "post_tool_capacity_exhausted",
      blockerState: "cooldown_pending",
      knownBlocker: true,
      nextResumePoint: "resume_existing_session_before_child_create",
      nextWakeStatus: "deferred_capacity_cooldown",
      nextWakeNotBefore: "2026-03-25T10:05:00.000Z",
      summary: "Post-tool capacity cooldown",
      message: "Resume after cooldown: 2026-03-25T10:05:00.000Z",
      deferredState: {
        state: "cooldown_pending",
        issueId: "issue-1",
        nextResumePoint: "resume_existing_session_before_child_create",
        cooldownUntil: "2026-03-25T10:05:00.000Z",
      },
      resume: {
        state: "cooldown_pending",
        sessionId: "session-1",
        taskKey: "issue:issue-1",
        nextWakeStatus: "deferred_capacity_cooldown",
        nextWakeNotBefore: "2026-03-25T10:05:00.000Z",
      },
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
