import { describe, expect, it, vi } from "vitest";
import { maybeRunCeoMergeOrchestratorAfterReviewerVerdict } from "../services/ceo.js";

function buildIssue(input: Partial<{
  id: string;
  companyId: string;
  parentId: string | null;
  status: string;
  title: string;
  description: string | null;
  identifier: string | null;
  issueNumber: number | null;
  createdAt: Date;
  assigneeAgentId: string | null;
}> = {}) {
  return {
    id: input.id ?? "issue-default",
    companyId: input.companyId ?? "company-1",
    parentId: input.parentId ?? null,
    status: input.status ?? "reviewer_accepted",
    title: input.title ?? "title",
    description:
      input.description ??
      "executionIntent: implement\nreviewPolicy: required\nneedsReview: true\ntargetFolder: server/src",
    identifier: input.identifier ?? "DGD-1",
    issueNumber: input.issueNumber ?? 1,
    createdAt: input.createdAt ?? new Date("2026-03-23T10:00:00.000Z"),
    assigneeAgentId: input.assigneeAgentId ?? "agent-ceo-1",
  };
}

describe("maybeRunCeoMergeOrchestratorAfterReviewerVerdict", () => {
  it("waits when not all children are reviewer_accepted", async () => {
    const child = buildIssue({ id: "child-1", parentId: "parent-1" });
    const parent = buildIssue({ id: "parent-1", parentId: null, status: "in_progress" });
    const openChild = buildIssue({
      id: "child-2",
      parentId: "parent-1",
      status: "in_review",
    });

    const result = await maybeRunCeoMergeOrchestratorAfterReviewerVerdict(
      { childIssueId: "child-1", reviewerVerdict: "accepted" },
      {
        getIssueById: vi
          .fn()
          .mockResolvedValueOnce(child)
          .mockResolvedValueOnce(parent),
        listChildrenByParentId: vi.fn().mockResolvedValue([child, openChild]),
        isParentAssignedToCeo: vi.fn().mockResolvedValue(true),
        getPullRequestRefForChildIssue: vi.fn(),
        mergeChildIssuePullRequest: vi.fn(),
        setIssueStatus: vi.fn(),
        postParentSummaryComment: vi.fn(),
        postParentConflictComment: vi.fn(),
        postParentBlockedComment: vi.fn(),
      },
    );

    expect(result.triggered).toBe(false);
    expect(result.reason).toBe("children_not_ready");
  });

  it("treats optional-review done children as already complete", async () => {
    const childAccepted = buildIssue({ id: "child-1", parentId: "parent-1" });
    const childOptionalDone = buildIssue({
      id: "child-2",
      parentId: "parent-1",
      status: "done",
      description:
        "executionIntent: plan\nreviewPolicy: optional\nneedsReview: false\ntargetFolder: n/a",
    });
    const parent = buildIssue({ id: "parent-1", parentId: null, status: "in_progress" });

    const result = await maybeRunCeoMergeOrchestratorAfterReviewerVerdict(
      { childIssueId: "child-1", reviewerVerdict: "accepted" },
      {
        getIssueById: vi
          .fn()
          .mockResolvedValueOnce(childAccepted)
          .mockResolvedValueOnce(parent),
        listChildrenByParentId: vi
          .fn()
          .mockResolvedValue([childAccepted, childOptionalDone]),
        isParentAssignedToCeo: vi.fn().mockResolvedValue(true),
        getPullRequestRefForChildIssue: vi.fn().mockResolvedValue({
          prNumber: 11,
          prUrl: "https://github.com/x/y/pull/11",
          branch: "dgdh/issue-11",
        }),
        mergeChildIssuePullRequest: vi.fn().mockResolvedValue({
          outcome: "merged",
          prNumber: 11,
          prUrl: "https://github.com/x/y/pull/11",
          branch: "dgdh/issue-11",
        }),
        setIssueStatus: vi.fn().mockImplementation(async (issueId, status) =>
          buildIssue({ id: issueId, status }),
        ),
        postParentSummaryComment: vi.fn(),
        postParentConflictComment: vi.fn(),
        postParentBlockedComment: vi.fn(),
      },
    );

    expect(result.triggered).toBe(true);
    expect(result.outcome).toBe("merged_all");
  });

  it("merges reviewer_accepted children in created_at ascending order and posts summary", async () => {
    const childLatest = buildIssue({
      id: "child-late",
      parentId: "parent-1",
      identifier: "DGD-22",
      createdAt: new Date("2026-03-23T10:05:00.000Z"),
      title: "late",
    });
    const childFirst = buildIssue({
      id: "child-first",
      parentId: "parent-1",
      identifier: "DGD-21",
      createdAt: new Date("2026-03-23T10:00:00.000Z"),
      title: "first",
    });
    const parent = buildIssue({ id: "parent-1", status: "in_progress" });
    const mergedOrder: string[] = [];
    const postSummary = vi.fn().mockResolvedValue(undefined);

    const result = await maybeRunCeoMergeOrchestratorAfterReviewerVerdict(
      { childIssueId: "child-first", reviewerVerdict: "accepted" },
      {
        getIssueById: vi
          .fn()
          .mockResolvedValueOnce(childFirst)
          .mockResolvedValueOnce(parent),
        listChildrenByParentId: vi.fn().mockResolvedValue([childLatest, childFirst]),
        isParentAssignedToCeo: vi.fn().mockResolvedValue(true),
        getPullRequestRefForChildIssue: vi
          .fn()
          .mockResolvedValue({ prNumber: 12, prUrl: "https://github.com/x/y/pull/12", branch: "dgdh/issue-1" }),
        mergeChildIssuePullRequest: vi.fn().mockImplementation(async ({ childIssue }) => {
          mergedOrder.push(childIssue.id);
          return {
            outcome: "merged",
            prNumber: childIssue.id === "child-first" ? 11 : 12,
            prUrl: `https://github.com/x/y/pull/${childIssue.id === "child-first" ? 11 : 12}`,
            branch: "dgdh/issue-branch",
          };
        }),
        setIssueStatus: vi.fn().mockImplementation(async (issueId, status) =>
          buildIssue({ id: issueId, status }),
        ),
        postParentSummaryComment: postSummary,
        postParentConflictComment: vi.fn(),
        postParentBlockedComment: vi.fn(),
      },
    );

    expect(result.triggered).toBe(true);
    expect(result.outcome).toBe("merged_all");
    expect(mergedOrder).toEqual(["child-first", "child-late"]);
    expect(postSummary).toHaveBeenCalledOnce();
  });

  it("stops on first merge conflict, marks parent conflict, and posts conflict comment", async () => {
    const child = buildIssue({ id: "child-1", parentId: "parent-1", title: "conflicted child" });
    const parent = buildIssue({ id: "parent-1", status: "in_progress" });
    const setIssueStatus = vi.fn().mockImplementation(async (issueId, status) =>
      buildIssue({ id: issueId, status }),
    );
    const postConflict = vi.fn().mockResolvedValue(undefined);

    const result = await maybeRunCeoMergeOrchestratorAfterReviewerVerdict(
      { childIssueId: "child-1", reviewerVerdict: "accepted" },
      {
        getIssueById: vi
          .fn()
          .mockResolvedValueOnce(child)
          .mockResolvedValueOnce(parent),
        listChildrenByParentId: vi.fn().mockResolvedValue([child]),
        isParentAssignedToCeo: vi.fn().mockResolvedValue(true),
        getPullRequestRefForChildIssue: vi
          .fn()
          .mockResolvedValue({ prNumber: 55, prUrl: "https://github.com/x/y/pull/55", branch: "dgdh/issue-55" }),
        mergeChildIssuePullRequest: vi.fn().mockResolvedValue({
          outcome: "merge_conflict",
          prNumber: 55,
          prUrl: "https://github.com/x/y/pull/55",
          branch: "dgdh/issue-55",
          message: "merge conflict",
        }),
        setIssueStatus,
        postParentSummaryComment: vi.fn(),
        postParentConflictComment: postConflict,
        postParentBlockedComment: vi.fn(),
      },
    );

    expect(result.triggered).toBe(true);
    expect(result.outcome).toBe("merge_conflict");
    expect(setIssueStatus).toHaveBeenCalledWith("parent-1", "merge_conflict");
    expect(postConflict).toHaveBeenCalledOnce();
  });

  it("stops on merge scope block, marks parent blocked, and posts blocked comment", async () => {
    const child = buildIssue({ id: "child-1", parentId: "parent-1", title: "scoped child" });
    const parent = buildIssue({ id: "parent-1", status: "in_progress" });
    const setIssueStatus = vi.fn().mockImplementation(async (issueId, status) =>
      buildIssue({ id: issueId, status }),
    );
    const postBlocked = vi.fn().mockResolvedValue(undefined);

    const result = await maybeRunCeoMergeOrchestratorAfterReviewerVerdict(
      { childIssueId: "child-1", reviewerVerdict: "accepted" },
      {
        getIssueById: vi
          .fn()
          .mockResolvedValueOnce(child)
          .mockResolvedValueOnce(parent),
        listChildrenByParentId: vi.fn().mockResolvedValue([child]),
        isParentAssignedToCeo: vi.fn().mockResolvedValue(true),
        getPullRequestRefForChildIssue: vi
          .fn()
          .mockResolvedValue({ prNumber: 56, prUrl: "https://github.com/x/y/pull/56", branch: "dgdh/issue-56" }),
        mergeChildIssuePullRequest: vi.fn().mockResolvedValue({
          outcome: "merge_blocked",
          prNumber: 56,
          prUrl: "https://github.com/x/y/pull/56",
          branch: "dgdh/issue-56",
          message: "Merge blocked: unexpected files would reach main.",
          unexpectedFiles: ["doc/unexpected.md"],
          missingFiles: [],
        }),
        setIssueStatus,
        postParentSummaryComment: vi.fn(),
        postParentConflictComment: vi.fn(),
        postParentBlockedComment: postBlocked,
      },
    );

    expect(result.triggered).toBe(true);
    expect(result.outcome).toBe("merge_blocked");
    expect(setIssueStatus).toHaveBeenCalledWith("parent-1", "blocked");
    expect(postBlocked).toHaveBeenCalledOnce();
  });
});
