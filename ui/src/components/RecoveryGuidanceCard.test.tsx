// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  hasRecoverableState,
  getRecoveryGuidanceForChain,
  isReviewerWakePassive,
} from "../lib/company-run-truth";
import type { CompanyRunChain } from "@paperclipai/shared";

type ChildOverride = {
  issueId?: string;
  identifier?: string | null;
  title?: string;
  status?: CompanyRunChain["children"][number]["status"];
  assigneeAgentId?: string | null;
  assigneeAgentName?: string | null;
  stages?: CompanyRunChain["children"][number]["stages"];
  triad?: {
    [K in keyof CompanyRunChain["children"][number]["triad"]]?: unknown;
  } & {
    reviewerVerdict?: Partial<CompanyRunChain["children"][number]["triad"]["reviewerVerdict"]>;
  };
};

function makeChain(overrides: any = {}): CompanyRunChain {
  const { children: childrenOverrides, ...chainOverrides } = overrides;
  const baseTriad: CompanyRunChain["children"][number]["triad"] = {
    state: "ready_for_review",
    reviewerWakeStatus: null,
    ceoCut: {
      ceoCutStatus: "ready",
      workerPacket: { source: "explicit", goal: null, scope: null, doneWhen: null },
      reviewerPacket: { source: "explicit", focus: null, acceptWhen: null, changeWhen: null },
    },
    workerExecution: {
      status: "ready_for_review",
      runId: "run-1",
      branch: "feature/test",
      commitHash: "abc123",
      prUrl: "https://github.com/test/repo/pull/1",
      at: new Date(),
    },
    reviewerVerdict: {
      verdict: null,
      approvalStatus: null,
      packet: null,
      doneWhenCheck: null,
      evidence: null,
      requiredFixes: [],
      next: null,
      at: null,
    },
    closeoutBlocker: null,
  };

  const baseChild = (index: number): CompanyRunChain["children"][number] => ({
    issueId: `child-${index}`,
    identifier: `DAV-10${index + 1}`,
    title: `Child issue ${index + 1}`,
    status: "in_review",
    assigneeAgentId: "agent-1",
    assigneeAgentName: "Worker",
    stages: [],
    triad: { ...baseTriad },
  });

  const children = childrenOverrides?.map((c: any, idx: number) => {
    const defaults = baseChild(idx);
    return {
      ...defaults,
      ...c,
      triad: {
        ...defaults.triad,
        ...c.triad,
        // Deep merge nested objects if they exist in override
        ...(c.triad?.reviewerVerdict && {
          reviewerVerdict: { ...defaults.triad.reviewerVerdict, ...c.triad.reviewerVerdict },
        }),
      },
    };
  }) ?? [];

  return {
    parentIssueId: "parent-1",
    parentIdentifier: "DAV-100",
    parentTitle: "Parent",
    parentStatus: "in_progress",
    focusIssueId: null,
    parentBlocker: null,
    children,
    ...chainOverrides,
  };
}

describe("RecoveryGuidanceCard logic", () => {
  it("detects stalled reviewer wake guidance (VAL-UIREC-001)", () => {
    const chain = makeChain({
      children: [
        {
          issueId: "child-stalled",
          identifier: "DAV-102",
          triad: {
            reviewerWakeStatus: "stalled",
            state: "ready_for_review",
          } as NonNullable<ChildOverride["triad"]>,
        },
      ],
    });

    expect(hasRecoverableState(chain)).toBe(true);
    const guidance = getRecoveryGuidanceForChain(chain);
    expect(guidance).not.toBeNull();
    expect(guidance!.type).toBe("stalled_reviewer_wake");
    expect(guidance!.title).toBe("Reviewer closeout stalled");
    expect(guidance!.description).toContain("recovery-oriented follow-up");
  });

  it("detects child closeout blocker guidance (VAL-UIREC-002)", () => {
    const chain = makeChain({
      children: [
        {
          triad: {
            closeoutBlocker: {
              blockerClass: "post_tool_capacity_exhausted",
              blockerState: "cooldown_pending",
              summary: "Post-tool capacity cooldown",
              knownBlocker: true,
              nextResumePoint: "resume_existing_session_worker_closeout",
              nextWakeStatus: "deferred_capacity_cooldown",
              nextWakeNotBefore: new Date("2026-03-25T10:05:00.000Z"),
              resumeStrategy: "reuse_session",
              resumeSource: "scheduler",
              resumeRunId: "run-resume-1234",
              resumeRunStatus: "queued",
              resumeAt: new Date("2026-03-25T10:05:01.000Z"),
              sameSessionPath: true,
            },
          } as NonNullable<ChildOverride["triad"]>,
        },
      ],
    });

    expect(hasRecoverableState(chain)).toBe(true);
    const guidance = getRecoveryGuidanceForChain(chain);
    expect(guidance).not.toBeNull();
    expect(guidance!.type).toBe("child_closeout_blocker");
    expect(guidance!.title).toBe("Closeout paused");
    expect(guidance!.description).toContain("post_tool_capacity_exhausted");
    // Blocker details should be present
    expect(guidance!.blockerDetails).not.toBeNull();
    expect(guidance!.blockerDetails!.blocker.value).toBe("post_tool_capacity_exhausted");
  });

  it("detects parent blocker guidance (VAL-UIREC-003)", () => {
    const chain = makeChain({
      parentBlocker: {
        blockerClass: "post_tool_capacity_exhausted",
        blockerState: "cooldown_pending",
        summary: "Post-tool capacity cooldown",
        knownBlocker: true,
        nextResumePoint: "resume_existing_session_before_child_create",
        nextWakeStatus: "deferred_capacity_cooldown",
        nextWakeNotBefore: new Date("2026-03-25T10:05:00.000Z"),
        resumeStrategy: "reuse_session",
        resumeSource: "scheduler",
        resumeRunId: "run-resume-1234",
        resumeRunStatus: "queued",
        resumeAt: new Date("2026-03-25T10:05:01.000Z"),
        sameSessionPath: true,
      },
      children: [],
    });

    expect(hasRecoverableState(chain)).toBe(true);
    const guidance = getRecoveryGuidanceForChain(chain);
    expect(guidance).not.toBeNull();
    expect(guidance!.type).toBe("parent_blocker");
    expect(guidance!.title).toBe("Parent execution blocked");
    expect(guidance!.blockerDetails).not.toBeNull();
    expect(guidance!.blockerDetails!.blocker.value).toBe("post_tool_capacity_exhausted");
  });

  it("stays passive for queued reviewer wake (VAL-UIREC-004)", () => {
    const chain = makeChain({
      children: [
        {
          triad: {
            reviewerWakeStatus: "queued",
            state: "ready_for_review",
          } as NonNullable<ChildOverride["triad"]>,
        },
      ],
    });

    expect(isReviewerWakePassive("queued")).toBe(true);
    expect(hasRecoverableState(chain)).toBe(false);
    expect(getRecoveryGuidanceForChain(chain)).toBeNull();
  });

  it("stays passive for running reviewer wake (VAL-UIREC-004)", () => {
    const chain = makeChain({
      children: [
        {
          triad: {
            reviewerWakeStatus: "running",
            state: "ready_for_review",
          } as NonNullable<ChildOverride["triad"]>,
        },
      ],
    });

    expect(isReviewerWakePassive("running")).toBe(true);
    expect(hasRecoverableState(chain)).toBe(false);
    expect(getRecoveryGuidanceForChain(chain)).toBeNull();
  });

  it("stays passive for completed reviewer wake (VAL-UIREC-004)", () => {
    const chain = makeChain({
      children: [
        {
          triad: {
            reviewerWakeStatus: "completed",
            state: "ready_to_promote",
          } as NonNullable<ChildOverride["triad"]>,
        },
      ],
    });

    expect(isReviewerWakePassive("completed")).toBe(true);
    expect(hasRecoverableState(chain)).toBe(false);
    expect(getRecoveryGuidanceForChain(chain)).toBeNull();
  });

  it("stays hidden for non-triad/non-recoverable states (VAL-UIREC-005)", () => {
    // No children, no parent blocker - just a regular non-recoverable chain
    const chain = makeChain({
      children: [],
      parentBlocker: null,
    });

    expect(hasRecoverableState(chain)).toBe(false);
    expect(getRecoveryGuidanceForChain(chain)).toBeNull();
  });

  it("does not overclaim recovery for pending review without blocker (VAL-UIREC-006)", () => {
    // Pending review - reviewerVerdict.verdict is null, no stalled wake, no blocker
    const chain = makeChain({
      children: [
        {
          triad: {
            reviewerWakeStatus: null,
            state: "ready_for_review",
            reviewerVerdict: {
              verdict: null,
              approvalStatus: null,
              packet: null,
              doneWhenCheck: null,
              evidence: null,
              requiredFixes: [],
              next: null,
              at: null,
            },
          } as NonNullable<ChildOverride["triad"]>,
        },
      ],
    });

    expect(hasRecoverableState(chain)).toBe(false);
    expect(getRecoveryGuidanceForChain(chain)).toBeNull();
  });

  it("shows guidance for first stalled child when multiple children exist", () => {
    const chain = makeChain({
      children: [
        {
          issueId: "child-1",
          identifier: "DAV-101",
          triad: {
            reviewerWakeStatus: null,
            state: "in_execution",
          } as NonNullable<ChildOverride["triad"]>,
        },
        {
          issueId: "child-2",
          identifier: "DAV-102",
          triad: {
            reviewerWakeStatus: "stalled",
            state: "ready_for_review",
          } as NonNullable<ChildOverride["triad"]>,
        },
      ],
    });

    expect(hasRecoverableState(chain)).toBe(true);
    const guidance = getRecoveryGuidanceForChain(chain);
    expect(guidance).not.toBeNull();
    expect(guidance!.type).toBe("stalled_reviewer_wake");
    expect(guidance!.description).toContain("DAV-102");
  });
});
