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

vi.mock("../services/index.js", () => ({
  accessService: () => ({}),
  activityService: () => mockActivityService,
  agentService: () => mockAgentService,
  ceoService: () => mockCeoService,
  goalService: () => ({}),
  heartbeatService: () => ({ getRun: vi.fn(), wakeup: vi.fn() }),
  githubPrService: () => ({ createGitHubPR: vi.fn() }),
  issueApprovalService: () => ({}),
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
  });

  it("returns the readable company run chain for a parent issue", async () => {
    const res = await request(createApp()).get("/api/issues/parent-1/company-run-chain");

    expect(res.status).toBe(200);
    expect(res.body.parentIdentifier).toBe("DAV-40");
    expect(res.body.parentBlocker).toBeNull();
    expect(res.body.children).toHaveLength(1);
    expect(res.body.children[0].identifier).toBe("DAV-41");
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
});