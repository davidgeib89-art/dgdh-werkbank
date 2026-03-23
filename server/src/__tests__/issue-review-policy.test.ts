import { describe, expect, it } from "vitest";
import {
  isIssueCompleteForParent,
  resolveIssueReviewPolicy,
} from "../services/issue-review-policy.js";

describe("issue review policy", () => {
  it("allows review-optional planning packets to complete at done", () => {
    const description = [
      "executionIntent: plan",
      "reviewPolicy: optional",
      "needsReview: false",
      "targetFolder: n/a",
    ].join("\n");

    const policy = resolveIssueReviewPolicy({ description });

    expect(policy.reviewRequirement).toBe("optional");
    expect(policy.allowsDoneWithoutReview).toBe(true);
    expect(isIssueCompleteForParent({ status: "done", description })).toBe(true);
  });

  it("keeps implementation packets review-required even if optional is requested", () => {
    const description = [
      "executionIntent: implement",
      "reviewPolicy: optional",
      "needsReview: false",
      "targetFolder: server/src",
    ].join("\n");

    const policy = resolveIssueReviewPolicy({ description });

    expect(policy.reviewRequirement).toBe("required");
    expect(policy.source).toBe("execution_intent");
    expect(isIssueCompleteForParent({ status: "done", description })).toBe(false);
  });

  it("treats artifact cues as review-required by default", () => {
    const description = [
      "Titel: Proof artifact",
      "targetFolder: doc/archive",
      "doneWhen: Proof note exists.",
    ].join("\n");

    const policy = resolveIssueReviewPolicy({ description });

    expect(policy.reviewRequirement).toBe("required");
    expect(policy.source).toBe("operational_artifact");
  });
});
