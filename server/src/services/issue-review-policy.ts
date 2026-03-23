export type IssueReviewRequirement = "optional" | "required";

export interface IssueReviewPolicy {
  executionIntent: string | null;
  reviewRequirement: IssueReviewRequirement;
  source:
    | "explicit_review_policy"
    | "explicit_needs_review"
    | "execution_intent"
    | "operational_artifact"
    | "safe_default";
  allowsDoneWithoutReview: boolean;
  targetFolder: string | null;
}

const OPTIONAL_EXECUTION_INTENTS = new Set([
  "answer",
  "aggregate",
  "classify",
  "decide",
  "plan",
  "prioritize",
  "triage",
]);

const REQUIRED_EXECUTION_INTENTS = new Set([
  "execute",
  "git",
  "implement",
  "merge",
  "operate",
  "review",
]);

const REVIEW_COMPLETION_STATUSES = new Set(["merged", "reviewer_accepted"]);

function normalizeLineValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function readMetadataField(
  description: string | null | undefined,
  field: string,
): string | null {
  if (typeof description !== "string" || description.trim().length === 0) return null;
  const match = description.match(
    new RegExp(`(?:^|\\n)\\s*${field}\\s*:\\s*([^\\n]+)`, "i"),
  );
  return normalizeLineValue(match?.[1] ?? null);
}

function parseReviewRequirement(raw: string | null): IssueReviewRequirement | null {
  if (!raw) return null;
  if (["false", "no", "optional"].includes(raw)) return "optional";
  if (["true", "yes", "required"].includes(raw)) return "required";
  return null;
}

function hasOperationalArtifactCue(description: string | null | undefined): boolean {
  if (typeof description !== "string" || description.trim().length === 0) return false;
  const targetFolder = readMetadataField(description, "targetFolder");
  if (targetFolder && targetFolder !== "n/a") return true;
  return /(?:^|\n)\s*(?:files changed|branch|prurl|commithash)\s*:/im.test(description);
}

export function resolveIssueReviewPolicy(input: {
  description?: string | null;
}): IssueReviewPolicy {
  const description = input.description ?? null;
  const executionIntent = readMetadataField(description, "executionIntent");
  const explicitReviewPolicy = parseReviewRequirement(
    readMetadataField(description, "reviewPolicy"),
  );
  const explicitNeedsReview = parseReviewRequirement(
    readMetadataField(description, "needsReview"),
  );
  const targetFolder = readMetadataField(description, "targetFolder");
  const operationalArtifact = hasOperationalArtifactCue(description);

  if (explicitReviewPolicy === "required") {
    return {
      executionIntent,
      reviewRequirement: "required",
      source: "explicit_review_policy",
      allowsDoneWithoutReview: false,
      targetFolder,
    };
  }

  if (explicitNeedsReview === "required") {
    return {
      executionIntent,
      reviewRequirement: "required",
      source: "explicit_needs_review",
      allowsDoneWithoutReview: false,
      targetFolder,
    };
  }

  if (executionIntent && REQUIRED_EXECUTION_INTENTS.has(executionIntent)) {
    return {
      executionIntent,
      reviewRequirement: "required",
      source: "execution_intent",
      allowsDoneWithoutReview: false,
      targetFolder,
    };
  }

  if (operationalArtifact) {
    return {
      executionIntent,
      reviewRequirement: "required",
      source: "operational_artifact",
      allowsDoneWithoutReview: false,
      targetFolder,
    };
  }

  if (explicitReviewPolicy === "optional") {
    return {
      executionIntent,
      reviewRequirement: "optional",
      source: "explicit_review_policy",
      allowsDoneWithoutReview: true,
      targetFolder,
    };
  }

  if (explicitNeedsReview === "optional") {
    return {
      executionIntent,
      reviewRequirement: "optional",
      source: "explicit_needs_review",
      allowsDoneWithoutReview: true,
      targetFolder,
    };
  }

  if (executionIntent && OPTIONAL_EXECUTION_INTENTS.has(executionIntent)) {
    return {
      executionIntent,
      reviewRequirement: "optional",
      source: "execution_intent",
      allowsDoneWithoutReview: true,
      targetFolder,
    };
  }

  return {
    executionIntent,
    reviewRequirement: "required",
    source: "safe_default",
    allowsDoneWithoutReview: false,
    targetFolder,
  };
}

export function isIssueCompleteForParent(input: {
  status?: string | null;
  description?: string | null;
}): boolean {
  const status = normalizeLineValue(input.status);
  if (!status) return false;
  if (REVIEW_COMPLETION_STATUSES.has(status)) return true;
  if (status !== "done") return false;
  return resolveIssueReviewPolicy({
    description: input.description ?? null,
  }).allowsDoneWithoutReview;
}
