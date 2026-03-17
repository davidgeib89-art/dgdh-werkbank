import { afterEach, describe, expect, it } from "vitest";
import {
  buildDryRunAdapterResult,
  deriveWorkPacketId,
  evaluateGovernanceDryRunValidation,
  estimateTotalTokens,
  hasPhaseBCheckpointApproval,
  isDryRunExecutionMode,
  isGovernanceTestModeEnabled,
  isPhaseBExecution,
  isTestRunContext,
  readExecutionMode,
  requiresGovernedWorkPacket,
  resolveDryRunUsageTotals,
  resolveHardTokenCapTokens,
} from "../services/heartbeat.ts";

const ORIGINAL_GOVERNANCE_TEST_MODE = process.env.GOVERNANCE_TEST_MODE;

afterEach(() => {
  if (ORIGINAL_GOVERNANCE_TEST_MODE === undefined) {
    delete process.env.GOVERNANCE_TEST_MODE;
  } else {
    process.env.GOVERNANCE_TEST_MODE = ORIGINAL_GOVERNANCE_TEST_MODE;
  }
});

describe("heartbeat governance helpers", () => {
  it("derives work packet ids from context, payload, and task fallback fields", () => {
    expect(
      deriveWorkPacketId(
        {
          workPacketId: "packet-context",
          taskKey: "task-context",
        },
        {
          workPacketId: "packet-payload",
        },
      ),
    ).toBe("packet-context");

    expect(
      deriveWorkPacketId(
        {},
        {
          packetId: "packet-payload",
          taskId: "task-payload",
        },
      ),
    ).toBe("packet-payload");

    expect(
      deriveWorkPacketId(
        {
          issueId: "issue-context",
        },
        null,
      ),
    ).toBe("issue-context");
  });

  it("requires governed work packets for automated, timer, and assignment wakes only", () => {
    expect(requiresGovernedWorkPacket("automation")).toBe(true);
    expect(requiresGovernedWorkPacket("timer")).toBe(true);
    expect(requiresGovernedWorkPacket("assignment")).toBe(true);
    expect(requiresGovernedWorkPacket("on_demand")).toBe(false);
    expect(requiresGovernedWorkPacket(undefined)).toBe(false);
  });

  it("resolves hard token caps from explicit values, budget classes, and the fallback default", () => {
    expect(
      resolveHardTokenCapTokens({
        hardCapTokens: 42_000.9,
        governanceBudget: { hardCapTokens: 10_000 },
      }),
    ).toBe(42_000);

    expect(
      resolveHardTokenCapTokens({
        governanceBudget: { hardCapTokens: 55_000 },
      }),
    ).toBe(55_000);

    expect(
      resolveHardTokenCapTokens({
        workPacketBudget: { budgetClass: "medium" },
      }),
    ).toBe(75_000);

    expect(
      resolveHardTokenCapTokens({
        budgetClass: "large",
      }),
    ).toBe(125_000);

    expect(resolveHardTokenCapTokens({})).toBe(150_000);
  });

  it("estimates total tokens from input, cached input, and output usage", () => {
    expect(
      estimateTotalTokens({
        inputTokens: 10_000.9,
        cachedInputTokens: 5_000.2,
        outputTokens: 2_000.7,
      }),
    ).toBe(17_001);

    expect(estimateTotalTokens(null)).toBeNull();
  });

  it("recognizes phase B execution aliases", () => {
    expect(isPhaseBExecution({ phase: "B" })).toBe(true);
    expect(isPhaseBExecution({ runPhase: "phase_b" })).toBe(true);
    expect(isPhaseBExecution({ executionPhase: "implementation" })).toBe(true);
    expect(isPhaseBExecution({ phase: "planning" })).toBe(false);
  });

  it("detects phase checkpoint approval from flags and ids", () => {
    expect(hasPhaseBCheckpointApproval({ phaseCheckpointApproved: true })).toBe(
      true,
    );
    expect(
      hasPhaseBCheckpointApproval({ phaseBApprovalId: "approval-1" }),
    ).toBe(true);
    expect(hasPhaseBCheckpointApproval({})).toBe(false);
  });

  it("detects dry-run execution markers from context", () => {
    expect(readExecutionMode({ executionMode: "dry_run" })).toBe("dry_run");
    expect(isDryRunExecutionMode("mock")).toBe(true);
    expect(isTestRunContext({ executionMode: "dry_run" })).toBe(true);
    expect(isTestRunContext({ isTestRun: true })).toBe(true);
    expect(isTestRunContext({ governanceTest: true })).toBe(true);
    expect(isTestRunContext({ phase: "planning" })).toBe(false);
  });

  it("reads the governance test mode env flag", () => {
    delete process.env.GOVERNANCE_TEST_MODE;
    expect(isGovernanceTestModeEnabled()).toBe(false);

    process.env.GOVERNANCE_TEST_MODE = "true";
    expect(isGovernanceTestModeEnabled()).toBe(true);
  });

  it("builds dry-run usage and adapter results without model execution", () => {
    expect(
      resolveDryRunUsageTotals({
        dryRunUsage: {
          inputTokens: 11,
          cachedInputTokens: 7,
          outputTokens: 5,
        },
      }),
    ).toEqual({
      inputTokens: 11,
      cachedInputTokens: 7,
      outputTokens: 5,
    });

    expect(
      buildDryRunAdapterResult({
        contextSnapshot: {
          dryRunUsage: {
            inputTokens: 11,
            cachedInputTokens: 7,
            outputTokens: 5,
          },
        },
        safetyReason: "context_test_run",
      }),
    ).toMatchObject({
      exitCode: 0,
      timedOut: false,
      billingType: "unknown",
      costUsd: 0,
      usage: {
        inputTokens: 11,
        cachedInputTokens: 7,
        outputTokens: 5,
      },
      resultJson: {
        mode: "dry_run",
        adapterExecuteBlocked: true,
        safetyReason: "context_test_run",
      },
    });
  });

  it("validates the missing work packet governance case without adapter execution", () => {
    expect(
      evaluateGovernanceDryRunValidation({
        source: "automation",
        contextSnapshot: {
          executionMode: "dry_run",
          isTestRun: true,
        },
      }),
    ).toMatchObject({
      status: "skipped",
      reason: "governance.work_packet_required",
      adapterExecuteBlocked: true,
      adapterResult: null,
    });
  });

  it("validates the missing phase checkpoint governance case without adapter execution", () => {
    expect(
      evaluateGovernanceDryRunValidation({
        source: "automation",
        contextSnapshot: {
          executionMode: "dry_run",
          isTestRun: true,
          workPacketId: "packet-1",
          phase: "phase_b",
        },
      }),
    ).toMatchObject({
      status: "failed",
      reason: "phase_checkpoint_required",
      adapterExecuteBlocked: true,
      adapterResult: null,
    });
  });

  it("validates the hard-cap governance case without adapter execution", () => {
    expect(
      evaluateGovernanceDryRunValidation({
        source: "automation",
        contextSnapshot: {
          executionMode: "dry_run",
          isTestRun: true,
          workPacketId: "packet-1",
          hardCapTokens: 5,
          dryRunUsage: {
            inputTokens: 4,
            cachedInputTokens: 0,
            outputTokens: 3,
          },
        },
      }),
    ).toMatchObject({
      status: "failed",
      reason: "budget_hard_cap_reached",
      adapterExecuteBlocked: true,
      totalTokensUsed: 7,
      hardTokenCap: 5,
    });
  });
});
