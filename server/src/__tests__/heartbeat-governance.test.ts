import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyIssuePromptContext,
  applyReviewerPromptContext,
  buildDryRunAdapterResult,
  deriveWorkPacketId,
  evaluateSingleFileBenchmarkPreflight,
  evaluateGovernanceDryRunValidation,
  estimateTotalTokens,
  extractReviewerVerdict,
  extractSingleFileBenchmarkTarget,
  hasPhaseBCheckpointApproval,
  isDryRunExecutionMode,
  isGovernanceTestModeEnabled,
  isPhaseBExecution,
  isTestRunContext,
  determineIssueStatusAfterRun,
  readExecutionMode,
  resolveAdapterCwdForRun,
  requiresGovernedWorkPacket,
  resolveDryRunUsageTotals,
  resolveHardTokenCapTokens,
  retriggerCEOParentIssueAfterReviewerAcceptance,
  shouldPromoteDeferredIssueExecution,
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

  it("extracts single-file benchmark targets and adds issue prompt context", () => {
    const description = [
      "Read only the file:",
      "packages/adapters/gemini-local/src/server/models.ts",
      "",
      "Do not read any other file.",
    ].join("\n");

    expect(extractSingleFileBenchmarkTarget(description)).toBe(
      "packages/adapters/gemini-local/src/server/models.ts",
    );

    expect(
      applyIssuePromptContext(
        {},
        {
          id: "issue-1",
          identifier: "DAV-4",
          title: "Gemini Benchmark #01",
          description,
        },
      ),
    ).toMatchObject({
      paperclipIssue: {
        id: "issue-1",
        identifier: "DAV-4",
        title: "Gemini Benchmark #01",
        description,
      },
      paperclipSingleFileTargetPath:
        "packages/adapters/gemini-local/src/server/models.ts",
      paperclipAbortOnMissingFile: true,
    });
  });

  it("keeps issue prompt output unchanged while adding dry-run-only preflight telemetry", () => {
    const issue = {
      id: "issue-1",
      identifier: "DAV-4",
      title: "Gemini Benchmark #01",
      description:
        "Read only the file:\npackages/adapters/gemini-local/src/server/models.ts",
    };

    const nonDryRun = applyIssuePromptContext({}, issue);
    const dryRun = applyIssuePromptContext(
      {
        executionMode: "dry_run",
        isTestRun: true,
      },
      issue,
    );

    expect(dryRun.paperclipTaskPrompt).toBe(nonDryRun.paperclipTaskPrompt);
    expect(nonDryRun.paperclipPromptResolverPreflight).toBeUndefined();
    expect(dryRun.paperclipPromptResolverPreflight).toMatchObject({
      resolverDecision: "ok",
      reasonCodes: [],
      auditMeta: {
        ruleSetVersion: "stage1-draft",
      },
    });
  });

  it("rewrites reviewer prompts to inspect the latest worker result instead of executing the packet", () => {
    const issue = {
      id: "issue-review-1",
      identifier: "DGD-31",
      title: "Content-Struktur kurz dokumentieren",
      description:
        "Erstelle danach genau eine neue Datei:\n- doc/content-structure-summary.md",
    };

    const context = applyReviewerPromptContext({}, issue, {
      runId: "run-worker-1",
      agentId: "agent-worker-1",
      agentName: "Gemini Arbeiterbiene",
      status: "succeeded",
      finishedAt: "2026-03-21T20:30:00.000Z",
      model: "gemini-3-flash-preview",
      resultSummary: "Created doc/content-structure-summary.md",
      readEvidencePaths: [
        "src/content/settings/site.json",
        "src/content/settings/profile.json",
      ],
      artifactPaths: ["doc/content-structure-summary.md"],
      workerHandoff: [
        "1. Goal",
        "2. Result",
        "3. Files Changed: `doc/content-structure-summary.md`",
      ].join("\n"),
    });

    expect(context.paperclipOriginalTaskPrompt).toContain(
      "Paperclip issue assignment:",
    );
    expect(context.paperclipTaskPrompt).toContain(
      "Paperclip review assignment:",
    );
    expect(context.paperclipTaskPrompt).toContain(
      "Do not implement the original task yourself.",
    );
    expect(context.paperclipTaskPrompt).toContain("Run ID: run-worker-1");
    expect(context.paperclipTaskPrompt).toContain(
      "src/content/settings/site.json",
    );
    expect(context.paperclipTaskPrompt).toContain(
      "Worker produced artifacts:",
    );
    expect(context.paperclipTaskPrompt).toContain(
      "doc/content-structure-summary.md",
    );
    expect(context.paperclipTaskPrompt).toContain("Worker handoff:");
    expect(context.paperclipTaskPrompt).toContain(
      "Verdict: accepted | changes_requested",
    );
    expect(context.paperclipTaskPrompt).toContain(
      "Use accepted only if doneWhen is satisfied, scope was respected, and no unsupported claim or source drift remains.",
    );
    expect(context.paperclipReviewTarget).toMatchObject({
      runId: "run-worker-1",
      agentName: "Gemini Arbeiterbiene",
      artifactPaths: ["doc/content-structure-summary.md"],
    });
  });

  it("blocks reviewer prompts cleanly when no prior worker result exists", () => {
    const issue = {
      id: "issue-review-2",
      identifier: "DGD-32",
      title: "Review target missing",
      description: "Pruefe den letzten Worker-Run.",
    };

    const context = applyReviewerPromptContext({}, issue, null);

    expect(context.paperclipTaskPrompt).toContain(
      "No prior non-reviewer run was found for this issue.",
    );
    expect(context.paperclipTaskPrompt).toContain(
      "Return Verdict: changes_requested.",
    );
    expect(context.paperclipReviewTargetError).toBe(
      "No prior non-reviewer run found for this issue.",
    );
  });

  it("extracts the final reviewer verdict instead of the prompt instruction line", () => {
    const output = [
      "Return exactly these sections:",
      "1. Verdict: accepted | changes_requested",
      "2. Findings",
      "",
      "1. Verdict: changes_requested",
      "2. Findings",
      "- Source drift detected",
    ].join("\n");

    expect(extractReviewerVerdict(output)).toBe("changes_requested");
  });

  it("extracts the reviewer verdict from ndjson stdout excerpts", () => {
    const output = [
      JSON.stringify({
        type: "message",
        role: "user",
        content: [
          "Return exactly these sections:",
          "1. Verdict: accepted | changes_requested",
          "2. Findings",
        ].join("\n"),
      }),
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: "1. Verdict: accepted\n\n2. Findings",
        delta: true,
      }),
    ].join("\n");

    expect(extractReviewerVerdict(output)).toBe("accepted");
  });

  it("extracts the reviewer verdict from streamed assistant delta chunks", () => {
    const output = [
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: "I will now review the worker output.",
        delta: true,
      }),
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: "1. Verdict: accepted\n\n2. Findings",
        delta: true,
      }),
    ].join("\n");

    expect(extractReviewerVerdict(output)).toBe("accepted");
  });

  it("extracts the reviewer verdict when verdict is markdown-formatted", () => {
    const output = [
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: "The task appears complete.\n\n**Verdict:** accepted",
        delta: true,
      }),
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: "\n\n2. **Findings:**\n- doneWhen satisfied",
        delta: true,
      }),
    ].join("\n");

    expect(extractReviewerVerdict(output)).toBe("accepted");
  });

  it("does not auto-transition succeeded worker runs into in_review", () => {
    expect(
      determineIssueStatusAfterRun({
        runStatus: "succeeded",
        issueStatus: "in_progress",
        roleTemplateId: "worker",
        stdoutExcerpt: "done",
      }),
    ).toMatchObject({
      nextStatus: null,
      reason: null,
      reviewerVerdict: null,
    });
  });

  it("does not auto-transition succeeded worker runs from todo in assignment flow", () => {
    expect(
      determineIssueStatusAfterRun({
        runStatus: "succeeded",
        issueStatus: "todo",
        roleTemplateId: "worker",
        stdoutExcerpt: "done",
      }),
    ).toMatchObject({
      nextStatus: null,
      reason: null,
      reviewerVerdict: null,
    });
  });

  it("moves accepted reviewer runs to done", () => {
    expect(
      determineIssueStatusAfterRun({
        runStatus: "succeeded",
        issueStatus: "in_review",
        roleTemplateId: "reviewer",
        stdoutExcerpt: [
          "1. Verdict: accepted",
          "2. Findings",
          "- doneWhen satisfied",
        ].join("\n"),
      }),
    ).toMatchObject({
      nextStatus: "done",
      reason: "reviewer_accepted",
      reviewerVerdict: "accepted",
    });
  });

  it("does not close issues when reviewer requests revision", () => {
    expect(
      determineIssueStatusAfterRun({
        runStatus: "succeeded",
        issueStatus: "in_review",
        roleTemplateId: "reviewer",
        stdoutExcerpt: "1. Verdict: changes_requested",
      }),
    ).toMatchObject({
      nextStatus: null,
      reason: null,
      reviewerVerdict: "changes_requested",
    });
  });

  it("re-triggers a CEO parent issue after an accepted reviewer run", async () => {
    const childIssue = {
      id: "child-issue-1",
      companyId: "company-1",
      parentId: "parent-issue-1",
      status: "in_review",
      assigneeAgentId: null,
      identifier: "DAV-201",
    };
    const parentIssue = {
      id: "parent-issue-1",
      companyId: "company-1",
      parentId: null,
      status: "in_progress",
      assigneeAgentId: "agent-ceo-1",
      identifier: "DAV-200",
    };
    const parentAgent = {
      id: "agent-ceo-1",
      companyId: "company-1",
      adapterConfig: {
        roleTemplateId: "ceo",
      },
    };
    const updateCalls: Array<{ issueId: string; patch: Record<string, unknown> }> = [];
    const wakeupCalls: Array<{ agentId: string; opts: Record<string, unknown> }> = [];
    const activityCalls: Array<Record<string, unknown>> = [];

    const result = await retriggerCEOParentIssueAfterReviewerAcceptance(
      {
        childIssue,
        reviewerRunId: "run-reviewer-1",
        reviewerAgentId: "agent-reviewer-1",
        transitionReason: "reviewer_accepted",
        reviewerVerdict: "accepted",
      },
      {
        getIssueById: async (issueId) =>
          issueId === parentIssue.id ? parentIssue : null,
        getAgentById: async (agentId) =>
          agentId === parentAgent.id ? parentAgent : null,
        updateIssue: async (issueId, patch) => {
          updateCalls.push({ issueId, patch });
          if (issueId !== parentIssue.id) return null;
          if (patch.assigneeAgentId === null) {
            return {
              ...parentIssue,
              assigneeAgentId: null,
            };
          }
          if (patch.assigneeAgentId === parentAgent.id) {
            return parentIssue;
          }
          return null;
        },
        wakeup: async (agentId, opts) => {
          wakeupCalls.push({ agentId, opts });
          return { queued: true };
        },
        recordActivity: async (input) => {
          activityCalls.push(input);
        },
      },
    );

    expect(result).toMatchObject({
      parentIssue,
      parentAssigneeAgentId: parentAgent.id,
      wakeupQueued: true,
    });
    expect(updateCalls).toEqual([
      {
        issueId: parentIssue.id,
        patch: { assigneeAgentId: null },
      },
      {
        issueId: parentIssue.id,
        patch: { assigneeAgentId: parentAgent.id },
      },
    ]);
    expect(wakeupCalls).toHaveLength(1);
    expect(wakeupCalls[0]).toMatchObject({
      agentId: parentAgent.id,
      opts: {
        source: "automation",
        triggerDetail: "system",
        reason: "issue_assigned",
        requestedByActorType: "agent",
        requestedByActorId: "agent-reviewer-1",
        payload: {
          issueId: parentIssue.id,
          childIssueId: childIssue.id,
          mutation: "retrigger",
        },
        contextSnapshot: {
          issueId: parentIssue.id,
          source: "issue.auto_retrigger",
          parentIssueId: parentIssue.id,
          childIssueId: childIssue.id,
          wakeReason: "issue_assigned",
        },
      },
    });
    expect(activityCalls).toHaveLength(1);
    expect(activityCalls[0]).toMatchObject({
      companyId: parentIssue.companyId,
      actorType: "agent",
      actorId: "agent-reviewer-1",
      agentId: "agent-reviewer-1",
      runId: "run-reviewer-1",
      action: "issue.auto_retriggered",
      entityType: "issue",
      entityId: parentIssue.id,
      details: {
        identifier: parentIssue.identifier,
        childIssueId: childIssue.id,
        parentIssueId: parentIssue.id,
        parentAssigneeAgentId: parentAgent.id,
        roleTemplateId: "ceo",
        wakeupQueued: true,
      },
    });
  });

  it("marks loop-detected worker runs as blocked issues", () => {
    expect(
      determineIssueStatusAfterRun({
        runStatus: "blocked",
        issueStatus: "in_progress",
        roleTemplateId: "worker",
        errorCode: "loop_detected",
        stdoutExcerpt: "Loop detected: same command failed 5x.",
      }),
    ).toMatchObject({
      nextStatus: "blocked",
      reason: "worker_loop_detected",
      reviewerVerdict: null,
    });
  });

  it("does not promote deferred issue execution for closed issues", () => {
    expect(shouldPromoteDeferredIssueExecution("done")).toBe(false);
    expect(shouldPromoteDeferredIssueExecution("cancelled")).toBe(false);
    expect(shouldPromoteDeferredIssueExecution("in_review")).toBe(true);
  });

  it("emits reliable dry-run preflight telemetry and keeps it deterministic", () => {
    const issue = {
      id: "issue-2",
      identifier: "DAV-5",
      title: "Preflight telemetry",
      description:
        "Read only the file:\npackages/adapters/gemini-local/src/server/models.ts",
    };

    const first = applyIssuePromptContext(
      {
        executionMode: "dry_run",
        isTestRun: true,
      },
      issue,
    );
    const second = applyIssuePromptContext(
      {
        executionMode: "dry_run",
        isTestRun: true,
      },
      issue,
    );

    expect(first.paperclipPromptResolverPreflight).toEqual(
      second.paperclipPromptResolverPreflight,
    );
    expect(first.paperclipPromptResolverPreflight).toMatchObject({
      resolverDecision: "ok",
      reasonCodes: [],
      auditMeta: {
        normalizedLayerOrder: [
          "companyCore",
          "governanceExecution",
          "taskDelta",
          "roleAddon",
        ],
      },
    });
  });

  it("keeps fail and escalated outcomes distinguishable in dry-run telemetry", () => {
    const issue = {
      id: "issue-3",
      identifier: "DAV-6",
      title: "Preflight outcomes",
      description:
        "Read only the file:\npackages/adapters/gemini-local/src/server/models.ts",
    };

    const escalated = applyIssuePromptContext(
      {
        executionMode: "dry_run",
        isTestRun: true,
        paperclipRequestedTargets: [
          "packages/adapters/gemini-local/src/server/models.ts",
          "server/src/app.ts",
        ],
      },
      issue,
    );

    expect(escalated.paperclipPromptResolverPreflight).toMatchObject({
      resolverDecision: "escalated",
      reasonCodes: ["SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS"],
    });

    const failed = applyIssuePromptContext(
      {
        executionMode: "dry_run",
        isTestRun: true,
        paperclipRequestedTargets: [
          "packages/adapters/gemini-local/src/server/models.ts",
          "server/src/app.ts",
        ],
        paperclipAllowedTools: ["read_file"],
        paperclipBlockedTools: ["read_file"],
      },
      issue,
    );

    expect(failed.paperclipPromptResolverPreflight).toMatchObject({
      resolverDecision: "fail",
    });
    expect(failed.paperclipPromptResolverPreflight).toMatchObject({
      reasonCodes: expect.arrayContaining([
        "TOOL_CONFLICT",
        "SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS",
      ]),
    });
  });

  it("prefers configured cwd for single-file benchmark with agent_home workspace source", () => {
    const resolved = resolveAdapterCwdForRun(
      {
        paperclipAbortOnMissingFile: true,
        paperclipSingleFileTargetPath:
          "packages/adapters/gemini-local/src/server/models.ts",
        paperclipWorkspace: {
          cwd: "C:/Users/holyd/.paperclip-worktrees/instances/codex-work/workspaces/agent-1",
          source: "agent_home",
        },
      },
      {
        cwd: "C:/Users/holyd/DGDH/worktrees/paperclip-codex",
      },
    );

    expect(resolved.effectiveRunCwd).toBe(
      "C:/Users/holyd/DGDH/worktrees/paperclip-codex",
    );
    expect(resolved.rawWorkspaceCwd).toBe(
      "C:/Users/holyd/.paperclip-worktrees/instances/codex-work/workspaces/agent-1",
    );
    expect(resolved.effectiveWorkspaceCwd).toBeNull();
    expect(resolved.resolutionStrategy).toBe("configured");
  });

  it("passes single-file preflight when configured cwd is valid and target exists", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pc-preflight-"));
    const targetPath = path.join(tempRoot, "target.ts");
    await fs.writeFile(targetPath, "export const ok = true;\n", "utf8");

    try {
      const preflight = await evaluateSingleFileBenchmarkPreflight({
        contextSnapshot: {
          paperclipAbortOnMissingFile: true,
          paperclipSingleFileTargetPath: "target.ts",
          paperclipTaskPrompt: "Paperclip issue assignment:\nDAV-5\n",
          paperclipWorkspace: {
            cwd: "C:/Users/holyd/.paperclip-worktrees/instances/codex-work/workspaces/agent-1",
            source: "agent_home",
          },
        },
        resolvedConfig: {
          cwd: tempRoot,
        },
      });

      expect(preflight.ok).toBe(true);
      expect(preflight.reason).toBeNull();
      expect(preflight.adapterCwd).toBe(tempRoot);
      expect(preflight.targetExists).toBe(true);
      expect(preflight.targetWithinEffectiveCwd).toBe(true);
      expect(preflight.configuredCwdExists).toBe(true);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
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
