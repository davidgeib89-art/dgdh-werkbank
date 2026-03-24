import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueRoutes } from "../routes/issues.js";
import { errorHandler } from "../middleware/index.js";

const mockIssueService = vi.hoisted(() => ({
  getById: vi.fn(),
  getByIdentifier: vi.fn(),
  assertCheckoutOwner: vi.fn(),
}));

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockGithubPrService = vi.hoisted(() => ({
  createGitHubPR: vi.fn(),
}));

const mockActivityService = vi.hoisted(() => ({
  forIssue: vi.fn(),
  runsForIssue: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  getRun: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  accessService: () => ({}),
  activityService: () => mockActivityService,
  agentService: () => mockAgentService,
  ceoService: () => ({
    mergeIssuePullRequest: vi.fn(),
    maybeRunMergeOrchestratorAfterReviewerVerdict: vi.fn(),
    listChildrenByParentId: vi.fn(),
  }),
  goalService: () => ({}),
  heartbeatService: () => mockHeartbeatService,
  githubPrService: () => mockGithubPrService,
  issueApprovalService: () => ({}),
  issueService: () => mockIssueService,
  documentService: () => ({}),
  logActivity: mockLogActivity,
  projectService: () => ({}),
}));

function createApp(actorRoleTemplateId = "worker", actorRole = "worker") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "agent",
      agentId: "agent-worker-1",
      companyId: "company-1",
      runId: "run-worker-pr-1",
    };
    next();
  });

  mockAgentService.getById.mockResolvedValue({
    id: "agent-worker-1",
    companyId: "company-1",
    role: actorRole,
    adapterConfig: {
      roleTemplateId: actorRoleTemplateId,
    },
  });

  app.use("/api", issueRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

describe("issues worker PR route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIssueService.getById.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-120",
      status: "in_progress",
      assigneeAgentId: "agent-worker-1",
    });
    mockIssueService.assertCheckoutOwner.mockResolvedValue({
      adoptedFromRunId: null,
    });
    mockGithubPrService.createGitHubPR.mockResolvedValue({
      prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/456",
      prNumber: 456,
      owner: "davidgeib89-art",
      repo: "dgdh-werkbank",
      branch: "dgdh/issue-DGD-120-worker-pr",
      base: "main",
    });
    mockHeartbeatService.getRun.mockResolvedValue(null);
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("creates a worker pull request and returns prUrl", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-pr")
      .send({
        owner: "davidgeib89-art",
        repo: "dgdh-werkbank",
        branch: "dgdh/issue-DGD-120-worker-pr",
        title: "[DGD-120] Worker PR smoke",
        body: "Goal: do x\nResult: done y\nFiles Changed: a,b\nBlockers: none\nNext: reviewer",
      });

    expect(res.status).toBe(201);
    expect(mockGithubPrService.createGitHubPR).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "davidgeib89-art",
        repo: "dgdh-werkbank",
        branch: "dgdh/issue-DGD-120-worker-pr",
      }),
    );
    expect(res.body.prUrl).toContain("/pull/456");
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "issue.worker_pull_request_created",
        entityType: "issue",
        entityId: "issue-1",
        runId: null,
        details: expect.objectContaining({
          apiRunId: "run-worker-pr-1",
        }),
      }),
    );
  });

  it("rejects submissions from non-worker agents", async () => {
    const res = await request(createApp("reviewer", "reviewer"))
      .post("/api/issues/issue-1/worker-pr")
      .send({
        owner: "davidgeib89-art",
        repo: "dgdh-werkbank",
        branch: "dgdh/issue-DGD-120-worker-pr",
        title: "[DGD-120] Worker PR smoke",
        body: "Goal: do x\nResult: done y\nFiles Changed: a,b\nBlockers: none\nNext: reviewer",
      });

    expect(res.status).toBe(403);
    expect(mockGithubPrService.createGitHubPR).not.toHaveBeenCalled();
  });

  it("validates required PR body sections", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-pr")
      .send({
        owner: "davidgeib89-art",
        repo: "dgdh-werkbank",
        branch: "dgdh/issue-DGD-120-worker-pr",
        title: "[DGD-120] Worker PR smoke",
        body: "Goal: do x\nResult: done y\nBlockers: none\nNext: reviewer",
      });

    expect(res.status).toBe(400);
    expect(mockGithubPrService.createGitHubPR).not.toHaveBeenCalled();
  });
});
