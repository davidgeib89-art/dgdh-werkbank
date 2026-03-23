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
}));

const mockHeartbeatService = vi.hoisted(() => ({
  getRun: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  accessService: () => ({}),
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

function createApp(actorRoleTemplateId = "worker", actorRole = "worker") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "agent",
      agentId: "agent-worker-1",
      companyId: "company-1",
      runId: "run-worker-1",
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

  const db = {
    transaction: async <T>(runner: (tx: unknown) => Promise<T>) => runner({}),
  };
  app.use("/api", issueRoutes(db as any, {} as any));
  app.use(errorHandler);
  return app;
}

describe("issues worker done route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIssueService.getById.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-120",
      status: "todo",
      assigneeAgentId: "agent-worker-1",
    });
    mockIssueService.update.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-120",
      status: "in_review",
      assigneeAgentId: "agent-worker-1",
    });
    mockHeartbeatService.getRun.mockResolvedValue(null);
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("records worker done handoff and moves issue into in_review", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-done")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-DGD-120-worker-done",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "Implement worker-done endpoint",
          result: "Endpoint implemented and validated",
          files: ["server/src/routes/issues.ts", "packages/shared/src/validators/issue.ts"],
          blockers: "none",
          next: "handoff to reviewer",
        },
      });

    expect(res.status).toBe(200);
    expect(mockIssueService.update).toHaveBeenCalledWith("issue-1", {
      status: "in_review",
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "issue.worker_done_recorded",
        entityType: "issue",
        entityId: "issue-1",
      }),
    );
    expect(res.body.status).toBe("in_review");
    expect(res.body.handoff.prUrl).toContain("/pull/123");
  });

  it("rejects submissions from non-worker agents", async () => {
    const res = await request(createApp("reviewer", "reviewer"))
      .post("/api/issues/issue-1/worker-done")
      .send({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-DGD-120-worker-done",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "x",
          result: "y",
          files: ["a"],
          blockers: "none",
          next: "review",
        },
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Only worker agents");
    expect(mockIssueService.update).not.toHaveBeenCalled();
  });

  it("validates mandatory prUrl and branch format", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/worker-done")
      .send({
        branch: "feature/invalid-branch",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: {
          goal: "x",
          result: "y",
          files: ["a"],
          blockers: "none",
          next: "review",
        },
      });

    expect(res.status).toBe(400);
    expect(mockIssueService.update).not.toHaveBeenCalled();
  });
});
