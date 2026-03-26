// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  getParentBlockerTruth,
  getRunContextHealth,
  hasVisibleCompanyRunChainTruth,
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