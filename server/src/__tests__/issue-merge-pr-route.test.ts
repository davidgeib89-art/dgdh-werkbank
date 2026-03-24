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
}));

const mockActivityService = vi.hoisted(() => ({
  forIssue: vi.fn(),
  runsForIssue: vi.fn(),
}));

const mockCeoService = vi.hoisted(() => ({
  mergeIssuePullRequest: vi.fn(),
  maybeRunMergeOrchestratorAfterReviewerVerdict: vi.fn(),
  listChildrenByParentId: vi.fn(),
}));

vi.mock("../services/index.js", () => ({
  accessService: () => ({}),
  activityService: () => mockActivityService,
  agentService: () => mockAgentService,
  ceoService: () => mockCeoService,
  goalService: () => ({}),
  heartbeatService: () => ({}),
  githubPrService: () => ({ createGitHubPR: vi.fn() }),
  issueApprovalService: () => ({}),
  issueService: () => mockIssueService,
  documentService: () => ({}),
  logActivity: vi.fn(),
  projectService: () => ({}),
}));

function createApp(actor: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = actor;
    next();
  });
  app.use("/api", issueRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

describe("issues merge-pr route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIssueService.getById.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-200",
      title: "Merge me",
      status: "reviewer_accepted",
      assigneeAgentId: "agent-ceo-1",
    });
    mockAgentService.getById.mockResolvedValue({
      id: "agent-ceo-1",
      companyId: "company-1",
      role: "ceo",
      adapterConfig: {
        roleTemplateId: "ceo",
      },
    });
    mockCeoService.mergeIssuePullRequest.mockResolvedValue({
      outcome: "merged",
      prNumber: 200,
      prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/200",
      branch: "dgdh/issue-DGD-200-merge",
    });
  });

  it("merges a PR when requested by a CEO agent", async () => {
    const app = createApp({
      type: "agent",
      companyId: "company-1",
      agentId: "agent-ceo-1",
      runId: "run-ceo-1",
    });

    const res = await request(app).post("/api/issues/issue-1/merge-pr").send({
      prNumber: 200,
    });

    expect(res.status).toBe(200);
    expect(mockCeoService.mergeIssuePullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: "issue-1",
        prNumber: 200,
      }),
    );
    expect(res.body.status).toBe("merged");
  });

  it("returns 409 on merge conflict", async () => {
    mockCeoService.mergeIssuePullRequest.mockResolvedValueOnce({
      outcome: "merge_conflict",
      prNumber: 201,
      prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/201",
      branch: "dgdh/issue-DGD-201-conflict",
      message: "Merge conflict",
    });

    const app = createApp({
      type: "agent",
      companyId: "company-1",
      agentId: "agent-ceo-1",
      runId: "run-ceo-1",
    });

    const res = await request(app).post("/api/issues/issue-1/merge-pr").send({
      prNumber: 201,
    });

    expect(res.status).toBe(409);
    expect(res.body.status).toBe("merge_conflict");
  });

  it("returns 409 on merge scope block", async () => {
    mockCeoService.mergeIssuePullRequest.mockResolvedValueOnce({
      outcome: "merge_blocked",
      prNumber: 202,
      prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/202",
      branch: "dgdh/issue-DGD-202-scope",
      message: "Merge blocked: unexpected files would reach main.",
      unexpectedFiles: ["doc/unexpected.md"],
      missingFiles: [],
    });

    const app = createApp({
      type: "agent",
      companyId: "company-1",
      agentId: "agent-ceo-1",
      runId: "run-ceo-1",
    });

    const res = await request(app).post("/api/issues/issue-1/merge-pr").send({
      prNumber: 202,
    });

    expect(res.status).toBe(409);
    expect(res.body.status).toBe("merge_blocked");
    expect(res.body.unexpectedFiles).toEqual(["doc/unexpected.md"]);
  });

  it("rejects non-ceo agents", async () => {
    const app = createApp({
      type: "agent",
      companyId: "company-1",
      agentId: "agent-worker-1",
      runId: "run-worker-1",
    });
    mockAgentService.getById.mockResolvedValueOnce({
      id: "agent-worker-1",
      companyId: "company-1",
      role: "worker",
      adapterConfig: { roleTemplateId: "worker" },
    });

    const res = await request(app).post("/api/issues/issue-1/merge-pr").send({
      prNumber: 202,
    });

    expect(res.status).toBe(403);
    expect(mockCeoService.mergeIssuePullRequest).not.toHaveBeenCalled();
  });
});
