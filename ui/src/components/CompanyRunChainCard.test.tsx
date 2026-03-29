// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  getParentBlockerTruth,
  getRunContextHealth,
  hasVisibleCompanyRunChainTruth,
  hasRecoverableState,
  getChildRecoveryTruth,
  getRecoveryGuidanceForChain,
  isReviewerWakePassive,
  isReviewerWakeStalled,
  type CompanyRunActiveIdentity,
} from "../lib/company-run-truth";

function makeRun(overrides?: Partial<CompanyRunActiveIdentity>): CompanyRunActiveIdentity {
  return {
    id: "run-12345678",
    status: "running",
    agentId: "agent-1",
    issueId: "issue-1",
    contextSnapshot: {
      companyId: "company-1",
      projectId: "project-1",
      issueId: "issue-1",
      issueIdentifier: "DAV-101",
    },
    ...overrides,
  };
}

describe("getRunContextHealth", () => {
  it("reports full when visible identity and active run context align", () => {
    const health = getRunContextHealth({
      activeRun: makeRun(),
      companyId: "company-1",
      projectId: "project-1",
      issueId: "issue-1",
      issueIdentifier: "DAV-101",
    });

    expect(health.label).toBe("Full");
    expect(health.tone).toBe("full");
    expect(health.note).toContain("matches the visible issue");
  });

  it("reports degraded when run context is missing required identity", () => {
    const health = getRunContextHealth({
      activeRun: makeRun({
        contextSnapshot: {
          companyId: "company-1",
          issueId: "issue-1",
        },
      }),
      companyId: "company-1",
      projectId: "project-1",
      issueId: "issue-1",
      issueIdentifier: "DAV-101",
    });

    expect(health.label).toBe("Degraded");
    expect(health.tone).toBe("degraded");
    expect(health.note).toContain("run project");
    expect(health.note).toContain("run identifier");
  });

  it("reports degraded before a run when base project or issue identity is missing", () => {
    const health = getRunContextHealth({
      activeRun: null,
      companyId: "company-1",
      projectId: null,
      issueId: "issue-1",
      issueIdentifier: null,
    });

    expect(health.label).toBe("Degraded");
    expect(health.note).toContain("project");
    expect(health.note).toContain("issue identifier");
  });
});

describe("company run chain truth helpers", () => {
  it("surfaces parent blocker truth even before any child exists", () => {
    expect(
      hasVisibleCompanyRunChainTruth({
        parentIssueId: "parent-1",
        parentIdentifier: "DAV-97",
        parentTitle: "Resume proof sprint",
        parentStatus: "todo",
        focusIssueId: null,
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
          resumeRunId: null,
          resumeRunStatus: null,
          resumeAt: null,
          sameSessionPath: false,
        },
        children: [],
      }),
    ).toBe(true);
  });

  it("formats same-session scheduler resume proof for the existing card", () => {
    const truth = getParentBlockerTruth({
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
    });

    expect(truth).toEqual({
      blocker: {
        value: "post_tool_capacity_exhausted",
        note: "Post-tool capacity cooldown",
      },
      state: {
        value: "cooldown_pending",
        note: "Known blocker class. David does not need to rediscover it.",
      },
      resume: {
        value: "Scheduler resumed",
        note: "scheduler queued run-resu on the same CEO session path (queued).",
      },
      nextPoint: {
        value: "resume_existing_session_before_child_create",
        note: "Next wake status: deferred_capacity_cooldown",
      },
    });
  });
});

describe("recovery truth helpers", () => {
  it("detects recoverable state for stalled reviewer wake", () => {
    const chain = {
      parentIssueId: "parent-1",
      parentIdentifier: "DAV-100",
      parentTitle: "Parent",
      parentStatus: "in_progress" as const,
      focusIssueId: null,
      parentBlocker: null,
      children: [
        {
          issueId: "child-1",
          identifier: "DAV-101",
          title: "Child issue",
          status: "in_review" as const,
          assigneeAgentId: "agent-1",
          assigneeAgentName: "Worker",
          stages: [],
          triad: {
            state: "ready_for_review" as const,
            reviewerWakeStatus: "stalled" as const,
            ceoCut: {
              ceoCutStatus: "ready" as const,
              workerPacket: { source: "explicit" as const, goal: null, scope: null, doneWhen: null },
              reviewerPacket: { source: "explicit" as const, focus: null, acceptWhen: null, changeWhen: null },
            },
            workerExecution: {
              status: "ready_for_review" as const,
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
          },
        },
      ],
    };

    expect(hasRecoverableState(chain)).toBe(true);
    expect(getRecoveryGuidanceForChain(chain)?.type).toBe("stalled_reviewer_wake");
  });

  it("detects recoverable state for child closeout blocker", () => {
    const chain = {
      parentIssueId: "parent-1",
      parentIdentifier: "DAV-100",
      parentTitle: "Parent",
      parentStatus: "in_progress" as const,
      focusIssueId: null,
      parentBlocker: null,
      children: [
        {
          issueId: "child-1",
          identifier: "DAV-101",
          title: "Child issue",
          status: "in_progress" as const,
          assigneeAgentId: "agent-1",
          assigneeAgentName: "Worker",
          stages: [],
          triad: {
            state: "in_execution" as const,
            reviewerWakeStatus: null,
            ceoCut: {
              ceoCutStatus: "ready" as const,
              workerPacket: { source: "explicit" as const, goal: null, scope: null, doneWhen: null },
              reviewerPacket: { source: "explicit" as const, focus: null, acceptWhen: null, changeWhen: null },
            },
            workerExecution: {
              status: "in_execution" as const,
              runId: "run-1",
              branch: "feature/test",
              commitHash: "abc123",
              prUrl: null,
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
          },
        },
      ],
    };

    expect(hasRecoverableState(chain)).toBe(true);
    expect(getRecoveryGuidanceForChain(chain)?.type).toBe("child_closeout_blocker");
  });

  it("detects recoverable state for parent blocker", () => {
    const chain = {
      parentIssueId: "parent-1",
      parentIdentifier: "DAV-100",
      parentTitle: "Parent",
      parentStatus: "todo" as const,
      focusIssueId: null,
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
    };

    expect(hasRecoverableState(chain)).toBe(true);
    expect(getRecoveryGuidanceForChain(chain)?.type).toBe("parent_blocker");
  });

  it("returns no recoverable state for passive reviewer wake statuses", () => {
    const baseChild = {
      issueId: "child-1",
      identifier: "DAV-101",
      title: "Child issue",
      status: "in_review" as const,
      assigneeAgentId: "agent-1",
      assigneeAgentName: "Worker",
      stages: [],
      triad: {
        state: "ready_for_review" as const,
        ceoCut: {
          ceoCutStatus: "ready" as const,
          workerPacket: { source: "explicit" as const, goal: null, scope: null, doneWhen: null },
          reviewerPacket: { source: "explicit" as const, focus: null, acceptWhen: null, changeWhen: null },
        },
        workerExecution: {
          status: "ready_for_review" as const,
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
      },
    };

    // Queued, running, completed, and null are all passive
    expect(isReviewerWakePassive("queued")).toBe(true);
    expect(isReviewerWakePassive("running")).toBe(true);
    expect(isReviewerWakePassive("completed")).toBe(true);
    expect(isReviewerWakePassive(null)).toBe(true);
    expect(isReviewerWakeStalled("stalled")).toBe(true);

    const chainQueued = {
      parentIssueId: "parent-1",
      parentIdentifier: "DAV-100",
      parentTitle: "Parent",
      parentStatus: "in_progress" as const,
      focusIssueId: null,
      parentBlocker: null,
      children: [{ ...baseChild, triad: { ...baseChild.triad, reviewerWakeStatus: "queued" as const } }],
    };
    expect(hasRecoverableState(chainQueued)).toBe(false);
    expect(getRecoveryGuidanceForChain(chainQueued)).toBeNull();

    const chainRunning = {
      parentIssueId: "parent-1",
      parentIdentifier: "DAV-100",
      parentTitle: "Parent",
      parentStatus: "in_progress" as const,
      focusIssueId: null,
      parentBlocker: null,
      children: [{ ...baseChild, triad: { ...baseChild.triad, reviewerWakeStatus: "running" as const } }],
    };
    expect(hasRecoverableState(chainRunning)).toBe(false);

    const chainCompleted = {
      parentIssueId: "parent-1",
      parentIdentifier: "DAV-100",
      parentTitle: "Parent",
      parentStatus: "in_progress" as const,
      focusIssueId: null,
      parentBlocker: null,
      children: [{ ...baseChild, triad: { ...baseChild.triad, reviewerWakeStatus: "completed" as const } }],
    };
    expect(hasRecoverableState(chainCompleted)).toBe(false);
  });

  it("returns none recovery type for child without recoverable state", () => {
    const child = {
      issueId: "child-1",
      identifier: "DAV-101",
      title: "Child issue",
      status: "in_progress" as const,
      assigneeAgentId: "agent-1",
      assigneeAgentName: "Worker",
      stages: [],
      triad: {
        state: "in_execution" as const,
        reviewerWakeStatus: null,
        ceoCut: {
          ceoCutStatus: "ready" as const,
          workerPacket: { source: "explicit" as const, goal: null, scope: null, doneWhen: null },
          reviewerPacket: { source: "explicit" as const, focus: null, acceptWhen: null, changeWhen: null },
        },
        workerExecution: {
          status: "in_execution" as const,
          runId: "run-1",
          branch: "feature/test",
          commitHash: "abc123",
          prUrl: null,
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
      },
    };

    const result = getChildRecoveryTruth(child);
    expect(result.type).toBe("none");
    expect(result.title).toBe("");
    expect(result.description).toBe("");
  });
});