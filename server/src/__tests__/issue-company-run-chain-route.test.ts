import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueRoutes } from "../routes/issues.js";
import { errorHandler } from "../middleware/index.js";

const mockIssueService = vi.hoisted(() => ({
  getById: vi.fn(),
  getByIdentifier: vi.fn(),
}));

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
  list: vi.fn(),
}));

const mockActivityService = vi.hoisted(() => ({
  forIssue: vi.fn(),
  runsForIssue: vi.fn(),
}));

const mockCeoService = vi.hoisted(() => ({
  listChildrenByParentId: vi.fn(),
  mergeIssuePullRequest: vi.fn(),
  maybeRunMergeOrchestratorAfterReviewerVerdict: vi.fn(),
}));

const mockIssueApprovalService = vi.hoisted(() => ({
  listApprovalsForIssue: vi.fn(),
}));

vi.mock("../services/index.js", () => ({
  accessService: () => ({}),
  activityService: () => mockActivityService,
  agentService: () => mockAgentService,
  ceoService: () => mockCeoService,
  goalService: () => ({}),
  heartbeatService: () => ({ getRun: vi.fn(), wakeup: vi.fn() }),
  githubPrService: () => ({ createGitHubPR: vi.fn() }),
  issueApprovalService: () => mockIssueApprovalService,
  issueService: () => mockIssueService,
  documentService: () => ({}),
  logActivity: vi.fn(),
  projectService: () => ({}),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      source: "local_implicit",
      userId: "user-1",
      companyIds: ["company-1"],
    };
    next();
  });
  app.use("/api", issueRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

describe("issue company run chain route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-40",
          title: "Bounded company run",
          status: "done",
          completedAt: new Date("2026-03-24T15:10:00.000Z"),
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      if (id === "child-1") {
        return {
          id: "child-1",
          companyId: "company-1",
          identifier: "DAV-41",
          title: "Implement bootstrap defaults",
          description: [
            "packetType: free_api",
            "executionIntent: implement",
            "reviewPolicy: required",
            "needsReview: true",
            "Ziel: Implement the bootstrap defaults route cleanly.",
            "Scope: Only touch the bounded bootstrap defaults path.",
            "targetFolder: server/src/routes",
            "targetFile: server/src/routes/issues.ts",
            "artifactKind: code_patch",
            "doneWhen: The bootstrap defaults route is implemented with bounded tests.",
            "reviewerFocus: Verify Ziel, Scope, doneWhen, and file scope.",
            "reviewerAcceptWhen: Accept only when the route and tests fully satisfy the packet.",
            "reviewerChangeWhen: Request changes on any scope drift or missing test proof.",
          ].join("\n"),
          status: "merged",
          completedAt: null,
          createdAt: new Date("2026-03-24T14:00:00.000Z"),
          updatedAt: new Date("2026-03-24T15:00:00.000Z"),
          parentId: "parent-1",
          assigneeAgentId: "agent-reviewer-1",
        };
      }
      return null;
    });

    mockCeoService.listChildrenByParentId.mockResolvedValue([
      {
        id: "child-1",
        companyId: "company-1",
        identifier: "DAV-41",
        title: "Implement bootstrap defaults",
        description: "executionIntent: implement\nreviewPolicy: required\nneedsReview: true\ndoneWhen: The bootstrap defaults route is implemented with bounded tests.",
        status: "merged",
        createdAt: new Date("2026-03-24T14:00:00.000Z"),
        parentId: "parent-1",
        assigneeAgentId: "agent-reviewer-1",
      },
    ]);

    mockAgentService.list.mockResolvedValue([
      {
        id: "agent-worker-1",
        name: "Copilot Worker",
        role: "worker",
        adapterConfig: { roleTemplateId: "worker" },
      },
      {
        id: "agent-reviewer-1",
        name: "Gemini Reviewer",
        role: "reviewer",
        adapterConfig: { roleTemplateId: "reviewer" },
      },
    ]);

    mockActivityService.forIssue.mockResolvedValue([
      {
        id: "evt-review",
        action: "issue.reviewer_verdict_recorded",
        agentId: "agent-reviewer-1",
        runId: "run-review-1",
        details: { verdict: "accepted" },
        createdAt: new Date("2026-03-24T14:40:00.000Z"),
      },
      {
        id: "evt-done",
        action: "issue.worker_done_recorded",
        agentId: "agent-worker-1",
        runId: "run-worker-1",
        details: { reviewerAgentId: "agent-reviewer-1", branch: "dgdh/issue-dav-41" },
        createdAt: new Date("2026-03-24T14:20:00.000Z"),
      },
      {
        id: "evt-pr",
        action: "issue.worker_pull_request_created",
        agentId: "agent-worker-1",
        runId: "run-worker-1",
        details: { prNumber: 15, prUrl: "https://github.com/example/repo/pull/15" },
        createdAt: new Date("2026-03-24T14:18:00.000Z"),
      },
    ]);

    mockActivityService.runsForIssue.mockResolvedValue([
      {
        runId: "run-review-1",
        agentId: "agent-reviewer-1",
        startedAt: new Date("2026-03-24T14:30:00.000Z"),
        createdAt: new Date("2026-03-24T14:30:00.000Z"),
      },
      {
        runId: "run-worker-1",
        agentId: "agent-worker-1",
        startedAt: new Date("2026-03-24T14:05:00.000Z"),
        createdAt: new Date("2026-03-24T14:05:00.000Z"),
      },
    ]);

    mockIssueApprovalService.listApprovalsForIssue.mockResolvedValue([
      {
        id: "approval-1",
        type: "reviewer_packet_verdict",
        status: "approved",
        payload: {
          verdict: "accepted",
          packet: "Bootstrap defaults worker packet",
          doneWhenCheck: "Route behavior and bounded tests both satisfy the packet.",
          evidence: "Reviewed worker handoff, PR metadata, and test proof.",
          requiredFixes: [],
          next: "Promote via CEO merge.",
        },
        decidedAt: new Date("2026-03-24T14:40:00.000Z"),
        updatedAt: new Date("2026-03-24T14:40:00.000Z"),
      },
    ]);
  });

  it("returns the readable company run chain for a parent issue", async () => {
    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.parentIdentifier).toBe("DAV-40");
    expect(res.body.parentBlocker).toBeNull();
    expect(res.body.children).toHaveLength(1);
    expect(res.body.children[0].identifier).toBe("DAV-41");
    expect(res.body.children[0].triad.state).toBe("ready_to_promote");
    expect(res.body.children[0].triad.ceoCut.ceoCutStatus).toBe("ready");
    expect(res.body.children[0].triad.workerExecution.status).toBe("completed");
    expect(res.body.children[0].triad.reviewerVerdict.verdict).toBe("accepted");
    expect(res.body.children[0].triad.closeoutBlocker).toBeNull();
    expect(res.body.children[0].stages.map((stage: { key: string; completed: boolean }) => [stage.key, stage.completed])).toEqual([
      ["assigned", true],
      ["run_started", true],
      ["worker_done", true],
      ["reviewer_assigned", true],
      ["reviewer_run", true],
      ["merged", true],
      ["parent_done", true],
    ]);
    expect(res.body.children[0].stages.find((stage: { key: string; note: string | null }) => stage.key === "merged")?.note).toBe("PR #15");
  });

  it("returns reviewerWakeStatus = null for non-triad issue (no worker_done activity)", async () => {
    // Reset mocks for this test
    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-100",
          title: "Non-triad parent issue",
          status: "in_progress",
          completedAt: null,
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      if (id === "child-1") {
        return {
          id: "child-1",
          companyId: "company-1",
          identifier: "DAV-101",
          title: "Simple task without triad",
          description: "Just a regular task",
          status: "todo",
          completedAt: null,
          createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          parentId: "parent-1",
          assigneeAgentId: "agent-worker-1",
        };
      }
      return null;
    });

    mockCeoService.listChildrenByParentId.mockResolvedValue([
      {
        id: "child-1",
        companyId: "company-1",
        identifier: "DAV-101",
        title: "Simple task without triad",
        description: "Just a regular task",
        status: "todo",
        createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
        parentId: "parent-1",
        assigneeAgentId: "agent-worker-1",
      },
    ]);

    // No worker_done activity - no triad
    mockActivityService.forIssue.mockResolvedValue([]);
    mockActivityService.runsForIssue.mockResolvedValue([]);
    mockIssueApprovalService.listApprovalsForIssue.mockResolvedValue([]);

    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.children).toHaveLength(1);
    expect(res.body.children[0].triad.reviewerWakeStatus).toBeNull();
  });

  it("returns reviewerWakeStatus = 'queued' when wake was queued but no reviewer run yet", async () => {
    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-200",
          title: "Triad parent issue",
          status: "in_progress",
          completedAt: null,
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      if (id === "child-1") {
        return {
          id: "child-1",
          companyId: "company-1",
          identifier: "DAV-201",
          title: "Triad task in review",
          description: [
            "packetType: free_api",
            "executionIntent: implement",
            "reviewPolicy: required",
            "needsReview: true",
            "doneWhen: Implement the feature.",
          ].join("\n"),
          status: "in_review",
          completedAt: null,
          createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          parentId: "parent-1",
          assigneeAgentId: "agent-worker-1",
        };
      }
      return null;
    });

    mockCeoService.listChildrenByParentId.mockResolvedValue([
      {
        id: "child-1",
        companyId: "company-1",
        identifier: "DAV-201",
        title: "Triad task in review",
        description: "packetType: free_api\nexecutionIntent: implement\nreviewPolicy: required\nneedsReview: true",
        status: "in_review",
        createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
        parentId: "parent-1",
        assigneeAgentId: "agent-worker-1",
      },
    ]);

    // Has worker_done with reviewerWakeQueued = true
    const workerDoneTime = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 min ago (< 5 min threshold)
    mockActivityService.forIssue.mockResolvedValue([
      {
        id: "evt-done",
        action: "issue.worker_done_recorded",
        agentId: "agent-worker-1",
        runId: "run-worker-1",
        details: { reviewerAgentId: "agent-reviewer-1", branch: "dgdh/issue-dav-201", reviewerWakeQueued: true },
        createdAt: workerDoneTime,
      },
    ]);
    mockActivityService.runsForIssue.mockResolvedValue([]);
    mockIssueApprovalService.listApprovalsForIssue.mockResolvedValue([]);

    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.children[0].triad.reviewerWakeStatus).toBe("queued");
  });

  it("returns reviewerWakeStatus = 'running' when reviewer run is active", async () => {
    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-300",
          title: "Triad parent issue",
          status: "in_progress",
          completedAt: null,
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      if (id === "child-1") {
        return {
          id: "child-1",
          companyId: "company-1",
          identifier: "DAV-301",
          title: "Triad task being reviewed",
          description: [
            "packetType: free_api",
            "executionIntent: implement",
            "reviewPolicy: required",
            "needsReview: true",
            "doneWhen: Implement the feature.",
          ].join("\n"),
          status: "in_review",
          completedAt: null,
          createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          parentId: "parent-1",
          assigneeAgentId: "agent-worker-1",
        };
      }
      return null;
    });

    mockCeoService.listChildrenByParentId.mockResolvedValue([
      {
        id: "child-1",
        companyId: "company-1",
        identifier: "DAV-301",
        title: "Triad task being reviewed",
        description: "packetType: free_api\nexecutionIntent: implement\nreviewPolicy: required\nneedsReview: true",
        status: "in_review",
        createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
        parentId: "parent-1",
        assigneeAgentId: "agent-worker-1",
      },
    ]);

    mockActivityService.forIssue.mockResolvedValue([
      {
        id: "evt-done",
        action: "issue.worker_done_recorded",
        agentId: "agent-worker-1",
        runId: "run-worker-1",
        details: { reviewerAgentId: "agent-reviewer-1", branch: "dgdh/issue-dav-301" },
        createdAt: new Date("2026-03-24T14:20:00.000Z").toISOString(),
      },
    ]);

    // Has active reviewer run
    mockActivityService.runsForIssue.mockResolvedValue([
      {
        runId: "run-worker-1",
        agentId: "agent-worker-1",
        startedAt: new Date("2026-03-24T14:05:00.000Z").toISOString(),
        createdAt: new Date("2026-03-24T14:05:00.000Z").toISOString(),
      },
      {
        runId: "run-reviewer-1",
        agentId: "agent-reviewer-1",
        startedAt: new Date("2026-03-24T14:30:00.000Z").toISOString(),
        createdAt: new Date("2026-03-24T14:30:00.000Z").toISOString(),
        status: "running",
      },
    ]);
    mockIssueApprovalService.listApprovalsForIssue.mockResolvedValue([]);

    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.children[0].triad.reviewerWakeStatus).toBe("running");
  });

  it("returns reviewerWakeStatus = 'stalled' when in_review time exceeds threshold and no reviewer run", async () => {
    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-400",
          title: "Triad parent issue",
          status: "in_progress",
          completedAt: null,
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      if (id === "child-1") {
        return {
          id: "child-1",
          companyId: "company-1",
          identifier: "DAV-401",
          title: "Triad task stalled",
          description: [
            "packetType: free_api",
            "executionIntent: implement",
            "reviewPolicy: required",
            "needsReview: true",
            "doneWhen: Implement the feature.",
          ].join("\n"),
          status: "in_review",
          completedAt: null,
          createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          parentId: "parent-1",
          assigneeAgentId: "agent-worker-1",
        };
      }
      return null;
    });

    mockCeoService.listChildrenByParentId.mockResolvedValue([
      {
        id: "child-1",
        companyId: "company-1",
        identifier: "DAV-401",
        title: "Triad task stalled",
        description: "packetType: free_api\nexecutionIntent: implement\nreviewPolicy: required\nneedsReview: true",
        status: "in_review",
        createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
        parentId: "parent-1",
        assigneeAgentId: "agent-worker-1",
      },
    ]);

    // Worker done was 10 minutes ago (> 5 min threshold)
    const workerDoneTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    mockActivityService.forIssue.mockResolvedValue([
      {
        id: "evt-done",
        action: "issue.worker_done_recorded",
        agentId: "agent-worker-1",
        runId: "run-worker-1",
        details: { reviewerAgentId: "agent-reviewer-1", branch: "dgdh/issue-dav-401" },
        createdAt: workerDoneTime,
      },
    ]);
    // No reviewer runs
    mockActivityService.runsForIssue.mockResolvedValue([
      {
        runId: "run-worker-1",
        agentId: "agent-worker-1",
        startedAt: new Date("2026-03-24T14:05:00.000Z").toISOString(),
        createdAt: new Date("2026-03-24T14:05:00.000Z").toISOString(),
      },
    ]);
    mockIssueApprovalService.listApprovalsForIssue.mockResolvedValue([]);

    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.children[0].triad.reviewerWakeStatus).toBe("stalled");
  });

  it("returns parent blocker truth when the CEO is waiting on post-tool capacity resume before any child exists", async () => {
    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-97",
          title: "Resume proof sprint",
          status: "todo",
          completedAt: null,
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      return null;
    });
    mockCeoService.listChildrenByParentId.mockResolvedValue([]);
    mockActivityService.forIssue.mockResolvedValue([]);
    mockActivityService.runsForIssue.mockImplementation(async (_companyId: string, issueId: string) => {
      if (issueId !== "parent-1") return [];
      return [
        {
          runId: "run-resume-1",
          status: "queued",
          agentId: "agent-ceo-1",
          startedAt: null,
          finishedAt: null,
          createdAt: new Date("2026-03-25T10:05:01.000Z"),
          invocationSource: "automation",
          sessionIdBefore: "session-1",
          sessionIdAfter: null,
          errorCode: null,
          usageJson: null,
          resultJson: null,
        },
        {
          runId: "run-blocked-1",
          status: "blocked",
          agentId: "agent-ceo-1",
          startedAt: new Date("2026-03-25T10:00:00.000Z"),
          finishedAt: new Date("2026-03-25T10:00:10.000Z"),
          createdAt: new Date("2026-03-25T10:00:00.000Z"),
          invocationSource: "assignment",
          sessionIdBefore: "session-1",
          sessionIdAfter: "session-1",
          errorCode: "post_tool_capacity_exhausted",
          usageJson: null,
          resultJson: {
            type: "post_tool_capacity_exhausted",
            status: "cooldown_pending",
            deferredState: {
              state: "cooldown_pending",
              nextResumePoint: "resume_existing_session_before_child_create",
              cooldownUntil: "2026-03-25T10:05:00.000Z",
            },
            resume: {
              strategy: "reuse_session",
              sessionId: "session-1",
              nextWakeStatus: "deferred_capacity_cooldown",
              nextWakeNotBefore: "2026-03-25T10:05:00.000Z",
            },
          },
        },
      ];
    });

    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.children).toEqual([]);
    expect(res.body.parentBlocker).toEqual({
      blockerClass: "post_tool_capacity_exhausted",
      blockerState: "cooldown_pending",
      summary: "Post-tool capacity cooldown",
      knownBlocker: true,
      nextResumePoint: "resume_existing_session_before_child_create",
      nextWakeStatus: "deferred_capacity_cooldown",
      nextWakeNotBefore: "2026-03-25T10:05:00.000Z",
      resumeStrategy: "reuse_session",
      resumeSource: "scheduler",
      resumeRunId: "run-resume-1",
      resumeRunStatus: "queued",
      resumeAt: "2026-03-25T10:05:01.000Z",
      sameSessionPath: true,
    });
  });

  it("returns child closeout blocker truth when worker closeout is paused by post-tool capacity", async () => {
    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-165",
          title: "Triad closeout mission",
          status: "in_progress",
          completedAt: null,
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      if (id === "child-1") {
        return {
          id: "child-1",
          companyId: "company-1",
          identifier: "DAV-166",
          title: "Worker closeout hardening",
          description: [
            "packetType: free_api",
            "executionIntent: implement",
            "reviewPolicy: required",
            "needsReview: true",
            "doneWhen: Finish worker closeout and reviewer verdict after post-tool capacity.",
          ].join("\n"),
          status: "in_progress",
          completedAt: null,
          createdAt: new Date("2026-03-27T10:00:00.000Z"),
          updatedAt: new Date("2026-03-27T10:10:00.000Z"),
          parentId: "parent-1",
          assigneeAgentId: "agent-worker-1",
        };
      }
      return null;
    });

    mockActivityService.forIssue.mockImplementation(async (issueId: string) => {
      if (issueId !== "child-1") return [];
      return [];
    });

    mockActivityService.runsForIssue.mockImplementation(async (_companyId: string, issueId: string) => {
      if (issueId === "parent-1") return [];
      if (issueId !== "child-1") return [];
      return [
        {
          runId: "run-resume-worker-1",
          status: "queued",
          agentId: "agent-worker-1",
          startedAt: null,
          finishedAt: null,
          createdAt: new Date("2026-03-27T10:15:01.000Z"),
          invocationSource: "automation",
          sessionIdBefore: "session-worker-1",
          sessionIdAfter: null,
          errorCode: null,
          usageJson: null,
          resultJson: null,
        },
        {
          runId: "run-worker-blocked-1",
          status: "blocked",
          agentId: "agent-worker-1",
          startedAt: new Date("2026-03-27T10:10:00.000Z"),
          finishedAt: new Date("2026-03-27T10:10:10.000Z"),
          createdAt: new Date("2026-03-27T10:10:00.000Z"),
          invocationSource: "assignment",
          sessionIdBefore: "session-worker-1",
          sessionIdAfter: "session-worker-1",
          errorCode: "post_tool_capacity_exhausted",
          usageJson: null,
          resultJson: {
            type: "post_tool_capacity_exhausted",
            status: "cooldown_pending",
            deferredState: {
              state: "cooldown_pending",
              nextResumePoint: "resume_existing_session_worker_closeout",
              cooldownUntil: "2026-03-27T10:15:00.000Z",
            },
            resume: {
              strategy: "reuse_session",
              sessionId: "session-worker-1",
              nextWakeStatus: "deferred_capacity_cooldown",
              nextWakeNotBefore: "2026-03-27T10:15:00.000Z",
            },
          },
        },
      ];
    });

    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.parentBlocker).toBeNull();
    expect(res.body.children[0].triad.closeoutBlocker).toEqual({
      blockerClass: "post_tool_capacity_exhausted",
      blockerState: "cooldown_pending",
      summary: "Post-tool capacity cooldown",
      knownBlocker: true,
      nextResumePoint: "resume_existing_session_worker_closeout",
      nextWakeStatus: "deferred_capacity_cooldown",
      nextWakeNotBefore: "2026-03-27T10:15:00.000Z",
      resumeStrategy: "reuse_session",
      resumeSource: "scheduler",
      resumeRunId: "run-resume-worker-1",
      resumeRunStatus: "queued",
      resumeAt: "2026-03-27T10:15:01.000Z",
      sameSessionPath: true,
    });
  });

  it("returns reviewerWakeStatus = null for non-triad issue (no worker_done activity)", async () => {
    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-100",
          title: "Non-triad parent issue",
          status: "in_progress",
          completedAt: null,
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      if (id === "child-1") {
        return {
          id: "child-1",
          companyId: "company-1",
          identifier: "DAV-101",
          title: "Simple task without triad",
          description: "Just a regular task",
          status: "todo",
          completedAt: null,
          createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          parentId: "parent-1",
          assigneeAgentId: "agent-worker-1",
        };
      }
      return null;
    });

    mockCeoService.listChildrenByParentId.mockResolvedValue([
      {
        id: "child-1",
        companyId: "company-1",
        identifier: "DAV-101",
        title: "Simple task without triad",
        description: "Just a regular task",
        status: "todo",
        createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
        parentId: "parent-1",
        assigneeAgentId: "agent-worker-1",
      },
    ]);

    // No worker_done activity - no triad
    mockActivityService.forIssue.mockResolvedValue([]);
    mockActivityService.runsForIssue.mockResolvedValue([]);
    mockIssueApprovalService.listApprovalsForIssue.mockResolvedValue([]);

    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.children).toHaveLength(1);
    expect(res.body.children[0].triad.reviewerWakeStatus).toBeNull();
  });

  it("returns reviewerWakeStatus = 'queued' when wake was queued but no reviewer run yet", async () => {
    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-200",
          title: "Triad parent issue",
          status: "in_progress",
          completedAt: null,
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      if (id === "child-1") {
        return {
          id: "child-1",
          companyId: "company-1",
          identifier: "DAV-201",
          title: "Triad task in review",
          description: [
            "packetType: free_api",
            "executionIntent: implement",
            "reviewPolicy: required",
            "needsReview: true",
            "doneWhen: Implement the feature.",
          ].join("\n"),
          status: "in_review",
          completedAt: null,
          createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          parentId: "parent-1",
          assigneeAgentId: "agent-worker-1",
        };
      }
      return null;
    });

    mockCeoService.listChildrenByParentId.mockResolvedValue([
      {
        id: "child-1",
        companyId: "company-1",
        identifier: "DAV-201",
        title: "Triad task in review",
        description: "packetType: free_api\nexecutionIntent: implement\nreviewPolicy: required\nneedsReview: true",
        status: "in_review",
        createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
        parentId: "parent-1",
        assigneeAgentId: "agent-worker-1",
      },
    ]);

    // Has worker_done with reviewerWakeQueued = true
    const workerDoneTime = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 min ago (< 5 min threshold)
    mockActivityService.forIssue.mockResolvedValue([
      {
        id: "evt-done",
        action: "issue.worker_done_recorded",
        agentId: "agent-worker-1",
        runId: "run-worker-1",
        details: { reviewerAgentId: "agent-reviewer-1", branch: "dgdh/issue-dav-201", reviewerWakeQueued: true },
        createdAt: workerDoneTime,
      },
    ]);
    mockActivityService.runsForIssue.mockResolvedValue([]);
    mockIssueApprovalService.listApprovalsForIssue.mockResolvedValue([]);

    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.children[0].triad.reviewerWakeStatus).toBe("queued");
  });

  it("returns reviewerWakeStatus = 'running' when reviewer run is active", async () => {
    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-300",
          title: "Triad parent issue",
          status: "in_progress",
          completedAt: null,
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      if (id === "child-1") {
        return {
          id: "child-1",
          companyId: "company-1",
          identifier: "DAV-301",
          title: "Triad task being reviewed",
          description: [
            "packetType: free_api",
            "executionIntent: implement",
            "reviewPolicy: required",
            "needsReview: true",
            "doneWhen: Implement the feature.",
          ].join("\n"),
          status: "in_review",
          completedAt: null,
          createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          parentId: "parent-1",
          assigneeAgentId: "agent-worker-1",
        };
      }
      return null;
    });

    mockCeoService.listChildrenByParentId.mockResolvedValue([
      {
        id: "child-1",
        companyId: "company-1",
        identifier: "DAV-301",
        title: "Triad task being reviewed",
        description: "packetType: free_api\nexecutionIntent: implement\nreviewPolicy: required\nneedsReview: true",
        status: "in_review",
        createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
        parentId: "parent-1",
        assigneeAgentId: "agent-worker-1",
      },
    ]);

    mockActivityService.forIssue.mockResolvedValue([
      {
        id: "evt-done",
        action: "issue.worker_done_recorded",
        agentId: "agent-worker-1",
        runId: "run-worker-1",
        details: { reviewerAgentId: "agent-reviewer-1", branch: "dgdh/issue-dav-301" },
        createdAt: new Date("2026-03-24T14:20:00.000Z").toISOString(),
      },
    ]);

    // Has active reviewer run
    mockActivityService.runsForIssue.mockResolvedValue([
      {
        runId: "run-worker-1",
        agentId: "agent-worker-1",
        startedAt: new Date("2026-03-24T14:05:00.000Z").toISOString(),
        createdAt: new Date("2026-03-24T14:05:00.000Z").toISOString(),
      },
      {
        runId: "run-reviewer-1",
        agentId: "agent-reviewer-1",
        startedAt: new Date("2026-03-24T14:30:00.000Z").toISOString(),
        createdAt: new Date("2026-03-24T14:30:00.000Z").toISOString(),
        status: "running",
      },
    ]);
    mockIssueApprovalService.listApprovalsForIssue.mockResolvedValue([]);

    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.children[0].triad.reviewerWakeStatus).toBe("running");
  });

  it("returns reviewerWakeStatus = 'stalled' when in_review time exceeds threshold and no reviewer run", async () => {
    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-400",
          title: "Triad parent issue",
          status: "in_progress",
          completedAt: null,
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      if (id === "child-1") {
        return {
          id: "child-1",
          companyId: "company-1",
          identifier: "DAV-401",
          title: "Triad task stalled",
          description: [
            "packetType: free_api",
            "executionIntent: implement",
            "reviewPolicy: required",
            "needsReview: true",
            "doneWhen: Implement the feature.",
          ].join("\n"),
          status: "in_review",
          completedAt: null,
          createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          parentId: "parent-1",
          assigneeAgentId: "agent-worker-1",
        };
      }
      return null;
    });

    mockCeoService.listChildrenByParentId.mockResolvedValue([
      {
        id: "child-1",
        companyId: "company-1",
        identifier: "DAV-401",
        title: "Triad task stalled",
        description: "packetType: free_api\nexecutionIntent: implement\nreviewPolicy: required\nneedsReview: true",
        status: "in_review",
        createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
        parentId: "parent-1",
        assigneeAgentId: "agent-worker-1",
      },
    ]);

    // Worker done was 10 minutes ago (> 5 min threshold)
    const workerDoneTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    mockActivityService.forIssue.mockResolvedValue([
      {
        id: "evt-done",
        action: "issue.worker_done_recorded",
        agentId: "agent-worker-1",
        runId: "run-worker-1",
        details: { reviewerAgentId: "agent-reviewer-1", branch: "dgdh/issue-dav-401" },
        createdAt: workerDoneTime,
      },
    ]);
    // No reviewer runs
    mockActivityService.runsForIssue.mockResolvedValue([
      {
        runId: "run-worker-1",
        agentId: "agent-worker-1",
        startedAt: new Date("2026-03-24T14:05:00.000Z").toISOString(),
        createdAt: new Date("2026-03-24T14:05:00.000Z").toISOString(),
      },
    ]);
    mockIssueApprovalService.listApprovalsForIssue.mockResolvedValue([]);

    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.children[0].triad.reviewerWakeStatus).toBe("stalled");
  });

  it("returns reviewerWakeStatus = 'completed' when reviewer run succeeded", async () => {
    mockIssueService.getById.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        return {
          id: "parent-1",
          companyId: "company-1",
          identifier: "DAV-500",
          title: "Triad parent issue",
          status: "in_progress",
          completedAt: null,
          parentId: null,
          assigneeAgentId: "agent-ceo-1",
        };
      }
      if (id === "child-1") {
        return {
          id: "child-1",
          companyId: "company-1",
          identifier: "DAV-501",
          title: "Triad task reviewed",
          description: [
            "packetType: free_api",
            "executionIntent: implement",
            "reviewPolicy: required",
            "needsReview: true",
            "doneWhen: Implement the feature.",
          ].join("\n"),
          status: "in_review",
          completedAt: null,
          createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
          parentId: "parent-1",
          assigneeAgentId: "agent-worker-1",
        };
      }
      return null;
    });

    mockCeoService.listChildrenByParentId.mockResolvedValue([
      {
        id: "child-1",
        companyId: "company-1",
        identifier: "DAV-501",
        title: "Triad task reviewed",
        description: "packetType: free_api\nexecutionIntent: implement\nreviewPolicy: required\nneedsReview: true",
        status: "in_review",
        createdAt: new Date("2026-03-24T14:00:00.000Z").toISOString(),
        parentId: "parent-1",
        assigneeAgentId: "agent-worker-1",
      },
    ]);

    mockActivityService.forIssue.mockResolvedValue([
      {
        id: "evt-done",
        action: "issue.worker_done_recorded",
        agentId: "agent-worker-1",
        runId: "run-worker-1",
        details: { reviewerAgentId: "agent-reviewer-1", branch: "dgdh/issue-dav-501" },
        createdAt: new Date("2026-03-24T14:20:00.000Z").toISOString(),
      },
    ]);

    // Has completed reviewer run
    mockActivityService.runsForIssue.mockResolvedValue([
      {
        runId: "run-worker-1",
        agentId: "agent-worker-1",
        startedAt: new Date("2026-03-24T14:05:00.000Z").toISOString(),
        createdAt: new Date("2026-03-24T14:05:00.000Z").toISOString(),
      },
      {
        runId: "run-reviewer-1",
        agentId: "agent-reviewer-1",
        startedAt: new Date("2026-03-24T14:30:00.000Z").toISOString(),
        createdAt: new Date("2026-03-24T14:30:00.000Z").toISOString(),
        status: "completed",
        finishedAt: new Date("2026-03-24T14:35:00.000Z").toISOString(),
      },
    ]);
    mockIssueApprovalService.listApprovalsForIssue.mockResolvedValue([]);

    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.children[0].triad.reviewerWakeStatus).toBe("completed");
  });
});
