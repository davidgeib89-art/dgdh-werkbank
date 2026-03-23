import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueRoutes } from "../routes/issues.js";
import { errorHandler } from "../middleware/index.js";

const mockIssueService = vi.hoisted(() => ({
  getById: vi.fn(),
  getByIdentifier: vi.fn(),
  update: vi.fn(),
}));

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockIssueApprovalService = vi.hoisted(() => ({
  recordReviewerVerdictForIssue: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  getRun: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());
const mockCeoService = vi.hoisted(() => ({
  maybeRunMergeOrchestratorAfterReviewerVerdict: vi.fn(),
  mergeIssuePullRequest: vi.fn(),
  listChildrenByParentId: vi.fn(),
}));

vi.mock("../services/index.js", () => ({
  accessService: () => ({}),
  agentService: () => mockAgentService,
  ceoService: () => mockCeoService,
  goalService: () => ({}),
  heartbeatService: () => mockHeartbeatService,
  githubPrService: () => ({ createGitHubPR: vi.fn() }),
  issueApprovalService: () => mockIssueApprovalService,
  issueService: () => mockIssueService,
  documentService: () => ({}),
  logActivity: mockLogActivity,
  projectService: () => ({}),
}));

function createApp(actorRoleTemplateId = "reviewer", actorRole = "reviewer") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "agent",
      agentId: "agent-reviewer-1",
      companyId: "company-1",
      runId: "run-1",
    };
    next();
  });
  mockAgentService.getById.mockResolvedValue({
    id: "agent-reviewer-1",
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

describe("issues reviewer verdict route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIssueService.getById.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-77",
    });
    mockIssueApprovalService.recordReviewerVerdictForIssue.mockResolvedValue({
      id: "approval-1",
      status: "changes_requested",
      type: "reviewer_packet_verdict",
    });
    mockIssueService.update.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      identifier: "DGD-77",
      status: "reviewer_accepted",
    });
    mockCeoService.maybeRunMergeOrchestratorAfterReviewerVerdict.mockResolvedValue({
      triggered: false,
      reason: "verdict_not_accepted",
    });
    mockHeartbeatService.getRun.mockResolvedValue(null);
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("records changes_requested verdicts and persists approval consequence", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/reviewer-verdict")
      .send({
        verdict: "changes_requested",
        packet: "Schema Fill Worker",
        doneWhenCheck: "Gallery image refs mismatch in 2 files.",
        evidence: "manifest.json and site-output diff checked.",
        requiredFixes: [
          "Fix gallery image path in showcase section.",
          "Fix thumbnail fallback path in profile section.",
        ],
        next: "Worker should patch and resubmit for review.",
      });

    expect(res.status).toBe(200);
    expect(mockIssueApprovalService.recordReviewerVerdictForIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: "issue-1",
        reviewerAgentId: "agent-reviewer-1",
        reviewerRunId: "run-1",
        verdict: "changes_requested",
      }),
    );
    expect(res.body.approval.status).toBe("changes_requested");
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "issue.reviewer_verdict_recorded",
        entityType: "issue",
        entityId: "issue-1",
      }),
    );
  });

  it("rejects verdict submission from non-reviewer agents", async () => {
    const res = await request(createApp("worker", "worker"))
      .post("/api/issues/issue-1/reviewer-verdict")
      .send({
        verdict: "accepted",
        doneWhenCheck: "All criteria met according to semantic checks.",
        evidence: "Artifacts verified with substantive results.",
        requiredFixes: [],
        next: "Mark packet complete.",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Only reviewer agents");
    expect(mockIssueApprovalService.recordReviewerVerdictForIssue).not.toHaveBeenCalled();
  });

  it("rejects superficial semantic validation (less than 20 characters) for doneWhenCheck or evidence", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/reviewer-verdict")
      .send({
        verdict: "accepted",
        doneWhenCheck: "Looks good.",
        evidence: "File read.",
        requiredFixes: [],
        next: "Done.",
      });

    expect(res.status).toBe(400);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).toContain("doneWhenCheck must contain a substantive semantic check");
    expect(bodyStr).toContain("evidence must contain substantive validation details");
    expect(mockIssueApprovalService.recordReviewerVerdictForIssue).not.toHaveBeenCalled();
  });

  it("requires doneWhenCheck and evidence for accepted verdicts", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/reviewer-verdict")
      .send({
        verdict: "accepted",
        requiredFixes: [],
        next: "Done.",
      });

    expect(res.status).toBe(400);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).toContain("doneWhenCheck is required for reviewer verdicts");
    expect(bodyStr).toContain("evidence is required for reviewer verdicts");
    expect(mockIssueApprovalService.recordReviewerVerdictForIssue).not.toHaveBeenCalled();
  });

  it("requires doneWhenCheck and evidence for changes_requested verdicts", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/reviewer-verdict")
      .send({
        verdict: "changes_requested",
        requiredFixes: ["Add the missing mission point."],
        next: "Worker should patch and resubmit.",
      });

    expect(res.status).toBe(400);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).toContain("doneWhenCheck is required for reviewer verdicts");
    expect(bodyStr).toContain("evidence is required for reviewer verdicts");
    expect(mockIssueApprovalService.recordReviewerVerdictForIssue).not.toHaveBeenCalled();
  });

  it("validates requiredFixes contract for accepted verdict", async () => {
    const res = await request(createApp())
      .post("/api/issues/issue-1/reviewer-verdict")
      .send({
        verdict: "accepted",
        doneWhenCheck: "All criteria met according to semantic checks.",
        evidence: "Artifacts verified with substantive results.",
        requiredFixes: ["This should not be present."],
        next: "Done.",
      });

    expect(res.status).toBe(400);
    expect(mockIssueApprovalService.recordReviewerVerdictForIssue).not.toHaveBeenCalled();
  });
});
