import { beforeEach, describe, expect, it, vi } from "vitest";
import { ceoService } from "../services/ceo.js";

const mockIssueService = vi.hoisted(() => ({
  getById: vi.fn(),
  update: vi.fn(),
}));

const mockGitHubPrService = vi.hoisted(() => ({
  getGitHubPullRequest: vi.fn(),
  listGitHubPullRequestFiles: vi.fn(),
  mergeGitHubPullRequest: vi.fn(),
  deleteGitHubBranch: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/issues.js", () => ({
  issueService: () => mockIssueService,
}));

vi.mock("../services/github-pr.js", () => ({
  githubPrService: () => mockGitHubPrService,
}));

vi.mock("../services/activity-log.js", () => ({
  logActivity: mockLogActivity,
}));

vi.mock("../services/workspace-runtime.js", () => ({
  cleanupExecutionWorkspace: vi.fn(),
}));

function createDb() {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: "run-1" }]),
      }),
    }),
  };
}

describe("ceoService mergeIssuePullRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIssueService.getById.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      projectId: null,
      parentId: "parent-1",
      status: "reviewer_accepted",
      title: "Merge me",
      description: "executionIntent: implement\nreviewPolicy: required\nneedsReview: true\ntargetFolder: doc",
      identifier: "DGD-300",
      issueNumber: 300,
      executionWorkspaceSettings: null,
      createdAt: new Date("2026-03-25T07:40:00.000Z"),
      assigneeAgentId: "agent-worker-1",
    });
    mockIssueService.update.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      status: "merge_conflict",
    });
  });

  it("returns merge_conflict when recorded PR metadata cannot be reconciled with GitHub", async () => {
    mockGitHubPrService.getGitHubPullRequest.mockRejectedValue(
      new Error("GitHub pull request lookup failed (404): Not Found"),
    );

    const svc = ceoService(createDb() as any);
    const result = await svc.mergeIssuePullRequest({
      issueId: "issue-1",
      prNumber: 62,
      prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/62",
      branch: "dgdh/issue-DGD-300-merge",
      requestedBy: {
        actorType: "agent",
        actorId: "agent-ceo-1",
        agentId: "agent-ceo-1",
        runId: "run-1",
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        outcome: "merge_conflict",
        prNumber: 62,
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/62",
        branch: "dgdh/issue-DGD-300-merge",
        message: "GitHub pull request lookup failed (404): Not Found",
      }),
    );
    expect(mockIssueService.update).toHaveBeenCalledWith("issue-1", {
      status: "merge_conflict",
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "issue.merge_conflict_detected",
        entityId: "issue-1",
      }),
    );
  });

  it("rethrows non-404 pull request lookup failures", async () => {
    mockGitHubPrService.getGitHubPullRequest.mockRejectedValue(
      new Error("GitHub pull request lookup failed (500): Internal Server Error"),
    );

    const svc = ceoService(createDb() as any);

    await expect(
      svc.mergeIssuePullRequest({
        issueId: "issue-1",
        prNumber: 62,
        requestedBy: {
          actorType: "agent",
          actorId: "agent-ceo-1",
          agentId: "agent-ceo-1",
          runId: "run-1",
        },
      }),
    ).rejects.toThrow(
      "GitHub pull request lookup failed (500): Internal Server Error",
    );

    expect(mockIssueService.update).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });
});
