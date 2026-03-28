import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueRoutes } from "../routes/issues.js";
import { errorHandler } from "../middleware/index.js";

const mockIssueService = vi.hoisted(() => ({
  getById: vi.fn(),
  getByIdentifier: vi.fn(),
  update: vi.fn(),
  assertCheckoutOwner: vi.fn(),
}));

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
  list: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  getRun: vi.fn(),
  wakeup: vi.fn(),
}));

const mockActivityService = vi.hoisted(() => ({
  forIssue: vi.fn(),
  runsForIssue: vi.fn(),
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
  githubPrService: () => ({ createGitHubPR: vi.fn() }),
  issueApprovalService: () => ({}),
  issueService: () => mockIssueService,
  documentService: () => ({}),
  logActivity: mockLogActivity,
  projectService: () => ({}),
}));

function createApp(actorRoleTemplateId = "operator", actorRole = "operator") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "user",
      userId: "user-operator-1",
      companyId: "company-1",
    };
    next();
  });

  const db = {
    transaction: async <T>(runner: (tx: unknown) => Promise<T>) => runner({}),
  };
  app.use("/api", issueRoutes(db as any, {} as any));
  app.use(errorHandler);
  return app;
}

describe("issues worker rescue route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIssueService.getById.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-120",
      status: "in_progress",
      assigneeAgentId: "agent-worker-1",
    });
    mockIssueService.update.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-120",
      status: "in_review",
      assigneeAgentId: "agent-reviewer-1",
    });
    mockHeartbeatService.getRun.mockResolvedValue(null);
    mockHeartbeatService.wakeup.mockResolvedValue({ queued: true });
    mockLogActivity.mockResolvedValue(undefined);
    mockAgentService.list.mockResolvedValue([
      {
        id: "agent-worker-1",
        companyId: "company-1",
        role: "worker",
        status: "running",
        adapterConfig: { roleTemplateId: "worker" },
      },
      {
        id: "agent-reviewer-1",
        companyId: "company-1",
        role: "reviewer",
        status: "idle",
        adapterConfig: { roleTemplateId: "reviewer" },
      },
    ]);
  });

  it("rescues a stalled issue with valid payload → 200 { success: true }", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-rescue")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-DGD-120-worker-rescue",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "Rescue stalled worker closeout",
          result: "PR created and worker done recorded via rescue API",
          files: ["server/src/routes/issues.ts"],
          blockers: "none",
          next: "handoff to reviewer",
        },
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      issueId: "issue-1",
    });
    expect(mockIssueService.update).toHaveBeenCalledWith("issue-1", {
      status: "in_review",
      assigneeAgentId: "agent-reviewer-1",
    });
    expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith(
      "agent-reviewer-1",
      expect.objectContaining({
        source: "assignment",
        reason: "issue_assigned",
        payload: expect.objectContaining({
          issueId: "issue-1",
          mutation: "worker_rescue_handoff",
        }),
      }),
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "issue.worker_done_recorded",
        entityType: "issue",
        entityId: "issue-1",
      }),
    );
  });

  it("returns 404 for unknown issue ID", async () => {
    mockIssueService.getById.mockResolvedValueOnce(null);

    const res = await request(createApp())
      .post("/api/issues/unknown-issue-id/worker-rescue")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-unknown-worker-rescue",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "Test rescue on unknown issue",
          result: "Should fail",
          files: ["test.ts"],
          blockers: "none",
          next: "none",
        },
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain("Issue not found");
    expect(mockIssueService.update).not.toHaveBeenCalled();
    expect(mockHeartbeatService.wakeup).not.toHaveBeenCalled();
  });

  it("returns 422 when issue status is done", async () => {
    mockIssueService.getById.mockResolvedValueOnce({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-120",
      status: "done",
      assigneeAgentId: "agent-worker-1",
    });

    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-rescue")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-DGD-120-worker-rescue",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "Rescue done issue",
          result: "Should fail",
          files: ["test.ts"],
          blockers: "none",
          next: "none",
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain("terminal state");
    expect(mockIssueService.update).not.toHaveBeenCalled();
    expect(mockHeartbeatService.wakeup).not.toHaveBeenCalled();
  });

  it("returns 422 when issue status is merged", async () => {
    mockIssueService.getById.mockResolvedValueOnce({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-120",
      status: "merged",
      assigneeAgentId: null,
    });

    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-rescue")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-DGD-120-worker-rescue",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "Rescue merged issue",
          result: "Should fail",
          files: ["test.ts"],
          blockers: "none",
          next: "none",
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain("terminal state");
    expect(mockIssueService.update).not.toHaveBeenCalled();
  });

  it("returns 422 when issue status is cancelled", async () => {
    mockIssueService.getById.mockResolvedValueOnce({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-120",
      status: "cancelled",
      assigneeAgentId: null,
    });

    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-rescue")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-DGD-120-worker-rescue",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "Rescue cancelled issue",
          result: "Should fail",
          files: ["test.ts"],
          blockers: "none",
          next: "none",
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain("terminal state");
    expect(mockIssueService.update).not.toHaveBeenCalled();
  });

  it("returns 422 when issue status is reviewer_accepted", async () => {
    mockIssueService.getById.mockResolvedValueOnce({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-120",
      status: "reviewer_accepted",
      assigneeAgentId: "agent-reviewer-1",
    });

    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-rescue")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-DGD-120-worker-rescue",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "Rescue reviewer_accepted issue",
          result: "Should fail",
          files: ["test.ts"],
          blockers: "none",
          next: "none",
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain("terminal state");
    expect(mockIssueService.update).not.toHaveBeenCalled();
  });

  it("returns 400 with Zod validation error when prUrl is missing", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-rescue")
      .send({
        branch: "dgdh/issue-DGD-120-worker-rescue",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "Rescue without prUrl",
          result: "Should fail validation",
          files: ["test.ts"],
          blockers: "none",
          next: "none",
        },
      });

    expect(res.status).toBe(400);
    expect(mockIssueService.update).not.toHaveBeenCalled();
  });

  it("returns 400 with Zod validation error when branch is missing", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-rescue")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "Rescue without branch",
          result: "Should fail validation",
          files: ["test.ts"],
          blockers: "none",
          next: "none",
        },
      });

    expect(res.status).toBe(400);
    expect(mockIssueService.update).not.toHaveBeenCalled();
  });

  it("returns 400 with Zod validation error when commitHash is missing", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-rescue")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-DGD-120-worker-rescue",
        summary: {
          goal: "Rescue without commitHash",
          result: "Should fail validation",
          files: ["test.ts"],
          blockers: "none",
          next: "none",
        },
      });

    expect(res.status).toBe(400);
    expect(mockIssueService.update).not.toHaveBeenCalled();
  });

  it("returns 400 with Zod validation error when summary is missing", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-rescue")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-DGD-120-worker-rescue",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
      });

    expect(res.status).toBe(400);
    expect(mockIssueService.update).not.toHaveBeenCalled();
  });

  it("logs reviewer_wake_deferred activity when no idle reviewer exists", async () => {
    mockIssueService.update.mockResolvedValueOnce({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-120",
      status: "in_review",
      assigneeAgentId: "agent-worker-1",
    });
    mockAgentService.list.mockResolvedValueOnce([
      {
        id: "agent-worker-1",
        companyId: "company-1",
        role: "worker",
        status: "running",
        adapterConfig: { roleTemplateId: "worker" },
      },
    ]);

    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-rescue")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-DGD-120-worker-rescue",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "Rescue stalled issue",
          result: "Worker done recorded but no reviewer available",
          files: ["test.ts"],
          blockers: "none",
          next: "wait for reviewer",
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify that reviewer_wake_deferred activity was logged
    const logCalls = mockLogActivity.mock.calls;
    const deferredLogCall = logCalls.find(
      (call: any[]) => call[1]?.action === "issue.reviewer_wake_deferred"
    );
    expect(deferredLogCall).toBeDefined();
  });
});
