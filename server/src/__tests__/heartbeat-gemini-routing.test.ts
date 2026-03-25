import { describe, expect, it, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({
  runChildProcessMock: vi.fn(),
}));

vi.mock("@paperclipai/adapter-utils/server-utils", async () => {
  const actual = await vi.importActual(
    "@paperclipai/adapter-utils/server-utils",
  );
  return {
    ...(actual as object),
    runChildProcess: hoisted.runChildProcessMock,
  };
});

import { prepareHeartbeatGeminiRouting } from "../services/heartbeat-gemini-routing.ts";

function buildRuntimeConfig() {
  return {
    routingPolicy: {
      mode: "soft_enforced",
      bucketState: {
        flash: "ok",
        pro: "ok",
        "flash-lite": "ok",
      },
      quotaSnapshot: {
        snapshotAt: "2026-03-25T17:10:00.000Z",
        buckets: {
          flash: { state: "ok", usagePercent: 19 },
          pro: { state: "ok", usagePercent: 1 },
          "flash-lite": { state: "ok", usagePercent: 4 },
        },
      },
      llmRouter: {
        enabled: true,
      },
    },
  };
}

function buildCeoReadyIssue() {
  return {
    id: "issue-ceo-ready",
    identifier: "DAV-91",
    title: "Truth cut: CEO flash-first after ready packet router skip",
    description:
      "Titel: CEO flash-first truth cut after ready packet router skip\n" +
      "packetType: free_api\n" +
      "executionIntent: implement\n" +
      "reviewPolicy: required\n" +
      "needsReview: true\n" +
      "status: todo\n" +
      "Ziel: Prove that the CEO can process a ready packet without an extra flash-lite router call and still move the company path forward.\n" +
      "Scope: Read child status first, then create at most one tiny child packet for a runbook note. If no worker is idle, leave the child unassigned and report [NEEDS WORKER]. No implementation on the parent issue.\n" +
      "targetFile: doc/DGDH-AI-OPERATOR-RUNBOOK.md\n" +
      "targetFolder: doc\n" +
      "artifactKind: doc_update\n" +
      "doneWhen: The CEO starts on flash, skips the extra router call, and either creates one child packet or cleanly reports [NEEDS WORKER] without stalling.\n" +
      "Annahmen:\n" +
      "[NEEDS INPUT]: none",
  };
}

function buildWorkerReadyIssue() {
  return {
    id: "issue-worker-ready",
    identifier: "DAV-89",
    title: "Runbook Update: Paperclip Runtime Environment Visibility",
    description:
      "Titel: Runbook Update: Paperclip Runtime Environment Visibility\n" +
      "Ziel: Verify that the Paperclip runtime environment variables are visible to the CEO agent by creating and assigning a small documentation update task to the Worker Agent.\n" +
      "Scope: The CEO agent will create exactly one child issue for a small documentation update related to the runbook. This issue will be assigned to the Worker Agent. No implementation work is to be done on the parent issue by the CEO agent.\n" +
      "targetFile: doc/DGDH-AI-OPERATOR-RUNBOOK.md\n" +
      "targetFolder: doc\n" +
      "artifactKind: doc_update\n" +
      "doneWhen: The CEO creates one child issue for a tiny runbook note and assigns it to the Worker Agent.\n" +
      "Annahmen:\n" +
      "[NEEDS INPUT]: none",
  };
}

describe("prepareHeartbeatGeminiRouting", () => {
  beforeEach(() => {
    hoisted.runChildProcessMock.mockReset();
  });

  it("routes CEO ready free_api packets to flash and pins the flash lane", async () => {
    const plan = await prepareHeartbeatGeminiRouting({
      agent: { adapterType: "gemini_local" },
      resolvedConfig: {
        model: "auto",
        roleTemplateId: "ceo",
      },
      runtimeConfig: buildRuntimeConfig(),
      runtimeState: {},
      issueRef: buildCeoReadyIssue(),
      context: {},
    });

    expect(plan.routingPreflight).not.toBeNull();
    expect(plan.routingPreflight?.laneDecision.roleHint).toBe("ceo");
    expect(plan.routingPreflight?.selected.selectedBucket).toBe("flash");
    expect(plan.routingPreflight?.selected.effectiveModelLane).toBe(
      "gemini-3-flash-preview",
    );
    expect(plan.resolvedConfigPatch.model).toBe("gemini-3-flash-preview");
    expect(plan.routingProposalMeta?.parseStatus).toBe("not_attempted");
    expect(plan.routingProposalMeta?.fallbackReason).toBe("ready_packet_truth");
    expect(plan.contextPatch.paperclipDefaultExecutionPath).toBe(
      "ready_small_default",
    );
    expect(plan.contextPatch.forceFreshSession).toBe(true);
    expect(plan.contextPatch.paperclipFixedModelLane).toBe(
      "gemini-3-flash-preview",
    );
    expect(plan.resolvedConfigPatch.includeSkills).toEqual([
      "repo-read",
      "repo-write",
    ]);
    expect(plan.resolvedConfigPatch.model).toBe("gemini-3-flash-preview");
    expect(plan.contextPatch.paperclipSkillSelection).toEqual({
      allowedSkills: ["repo-read", "repo-write"],
      source: "ready_packet_truth",
    });
  });

  it("keeps worker ready packets on the worker flash-lite lane", async () => {
    const plan = await prepareHeartbeatGeminiRouting({
      agent: { adapterType: "gemini_local" },
      resolvedConfig: {
        model: "auto",
        roleTemplateId: "worker",
      },
      runtimeConfig: buildRuntimeConfig(),
      runtimeState: {},
      issueRef: buildWorkerReadyIssue(),
      context: {},
    });

    expect(plan.routingPreflight).not.toBeNull();
    expect(plan.routingPreflight?.laneDecision.roleHint).toBe("worker");
    expect(plan.routingPreflight?.selected.selectedBucket).toBe("flash-lite");
    expect(plan.routingPreflight?.selected.effectiveModelLane).toBe(
      "gemini-2.5-flash-lite",
    );
    expect(plan.resolvedConfigPatch.model).toBe("gemini-2.5-flash-lite");
    expect(plan.resolvedConfigPatch.includeSkills).toBeUndefined();
    expect(plan.contextPatch.paperclipSkillSelection).toBeNull();
  });

  it("skips the extra router call for ready packets before any classifier process starts", async () => {
    const plan = await prepareHeartbeatGeminiRouting({
      agent: { adapterType: "gemini_local" },
      resolvedConfig: {
        model: "auto",
        roleTemplateId: "ceo",
      },
      runtimeConfig: buildRuntimeConfig(),
      runtimeState: {},
      issueRef: buildCeoReadyIssue(),
      context: {},
    });

    expect(plan.routingProposalMeta?.attempted).toBe(false);
    expect(plan.routingProposalMeta?.parseStatus).toBe("not_attempted");
    expect(hoisted.runChildProcessMock).not.toHaveBeenCalled();
  });

  it("makes missing CEO role hints visible by falling back to flash-lite-first", async () => {
    const plan = await prepareHeartbeatGeminiRouting({
      agent: { adapterType: "gemini_local" },
      resolvedConfig: {
        model: "auto",
      },
      runtimeConfig: buildRuntimeConfig(),
      runtimeState: {},
      issueRef: buildCeoReadyIssue(),
      context: {},
    });

    expect(plan.routingPreflight).not.toBeNull();
    expect(plan.routingPreflight?.laneDecision.roleHint).toBeNull();
    expect(plan.routingPreflight?.selected.selectedBucket).toBe("flash-lite");
    expect(plan.routingPreflight?.selected.effectiveModelLane).toBe(
      "gemini-2.5-flash-lite",
    );
  });
});
