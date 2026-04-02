import { z } from "zod";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_STATUS_TRANSITIONS,
  type IssueStatus,
  type IssuePriority,
} from "../constants.js";

const executionWorkspaceStrategySchema = z
  .object({
    type: z.enum(["project_primary", "git_worktree"]).optional(),
    baseRef: z.string().optional().nullable(),
    branchTemplate: z.string().optional().nullable(),
    worktreeParentDir: z.string().optional().nullable(),
    provisionCommand: z.string().optional().nullable(),
    teardownCommand: z.string().optional().nullable(),
  })
  .strict();

export const issueExecutionWorkspaceSettingsSchema = z
  .object({
    mode: z.enum(["inherit", "project_primary", "isolated", "agent_default"]).optional(),
    workspaceStrategy: executionWorkspaceStrategySchema.optional().nullable(),
    workspaceRuntime: z.record(z.unknown()).optional().nullable(),
  })
  .strict();

export const issueAssigneeAdapterOverridesSchema = z
  .object({
    adapterConfig: z.record(z.unknown()).optional(),
    useProjectWorkspace: z.boolean().optional(),
  })
  .strict();

export const createIssueSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(ISSUE_STATUSES).optional().default("backlog"),
  priority: z.enum(ISSUE_PRIORITIES).optional().default("medium"),
  assigneeAgentId: z.string().uuid().optional().nullable(),
  assigneeUserId: z.string().optional().nullable(),
  requestDepth: z.number().int().nonnegative().optional().default(0),
  billingCode: z.string().optional().nullable(),
  assigneeAdapterOverrides: issueAssigneeAdapterOverridesSchema.optional().nullable(),
  executionWorkspaceSettings: issueExecutionWorkspaceSettingsSchema.optional().nullable(),
  labelIds: z.array(z.string().uuid()).optional(),
});

export type CreateIssue = z.infer<typeof createIssueSchema>;

export const createIssueLabelSchema = z.object({
  name: z.string().trim().min(1).max(48),
  color: z.string().regex(/^#(?:[0-9a-fA-F]{6})$/, "Color must be a 6-digit hex value"),
});

export type CreateIssueLabel = z.infer<typeof createIssueLabelSchema>;

export const updateIssueSchema = createIssueSchema.partial().extend({
  comment: z.string().min(1).optional(),
  hiddenAt: z.string().datetime().nullable().optional(),
});

export type UpdateIssue = z.infer<typeof updateIssueSchema>;
export type IssueExecutionWorkspaceSettings = z.infer<typeof issueExecutionWorkspaceSettingsSchema>;

export const checkoutIssueSchema = z.object({
  agentId: z.string().uuid(),
  expectedStatuses: z.array(z.enum(ISSUE_STATUSES)).nonempty(),
});

export type CheckoutIssue = z.infer<typeof checkoutIssueSchema>;

export const addIssueCommentSchema = z.object({
  body: z.string().min(1),
  reopen: z.boolean().optional(),
  interrupt: z.boolean().optional(),
});

export type AddIssueComment = z.infer<typeof addIssueCommentSchema>;

export const linkIssueApprovalSchema = z.object({
  approvalId: z.string().uuid(),
});

export type LinkIssueApproval = z.infer<typeof linkIssueApprovalSchema>;

export const submitReviewerVerdictSchema = z
  .object({
    verdict: z.enum(["accepted", "changes_requested"]),
    packet: z.string().trim().min(1).max(500).optional().nullable(),
    doneWhenCheck: z
      .string()
      .trim()
      .min(20, "doneWhenCheck must contain a substantive semantic check (min 20 chars)")
      .max(4_000)
      .optional()
      .nullable(),
    evidence: z
      .string()
      .trim()
      .min(20, "evidence must contain substantive validation details (min 20 chars)")
      .max(4_000)
      .optional()
      .nullable(),
    requiredFixes: z
      .array(z.string().trim().min(1).max(500))
      .max(3)
      .optional()
      .default([]),
    next: z.string().trim().min(1).max(2_000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const fixCount = value.requiredFixes.length;
    const hasDoneWhenCheck =
      typeof value.doneWhenCheck === "string" && value.doneWhenCheck.trim().length > 0;
    const hasEvidence = typeof value.evidence === "string" && value.evidence.trim().length > 0;

    if (!hasDoneWhenCheck) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["doneWhenCheck"],
        message: "doneWhenCheck is required for reviewer verdicts",
      });
    }
    if (!hasEvidence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence"],
        message: "evidence is required for reviewer verdicts",
      });
    }

    if (value.verdict === "accepted" && fixCount > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requiredFixes"],
        message: "requiredFixes must be empty when verdict is accepted",
      });
    }
    if (value.verdict === "changes_requested" && fixCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requiredFixes"],
        message:
          "requiredFixes must include 1-3 concrete fixes when verdict is changes_requested",
      });
    }
  });

export type SubmitReviewerVerdict = z.infer<typeof submitReviewerVerdictSchema>;

export const workerHandoffSummarySchema = z
  .object({
    goal: z.string().trim().min(1).max(2_000),
    result: z.string().trim().min(1).max(4_000),
    files: z.array(z.string().trim().min(1).max(500)).min(1).max(200),
    blockers: z.string().trim().min(1).max(2_000),
    next: z.string().trim().min(1).max(2_000),
  })
  .strict();

export const submitWorkerDoneSchema = z
  .object({
    prUrl: z.string().trim().url().max(2_000),
    branch: z.string().trim().min(1).max(200),
    commitHash: z
      .string()
      .trim()
      .regex(/^[0-9a-f]{7,40}$/i, "commitHash must be a valid git commit hash"),
    summary: workerHandoffSummarySchema,
  })
  .superRefine((value, ctx) => {
    if (!value.prUrl.includes("/pull/")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prUrl"],
        message: "prUrl must point to a pull request URL",
      });
    }
    if (!value.branch.toLowerCase().startsWith("dgdh/issue-")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branch"],
        message: "branch must start with dgdh/issue-",
      });
    }
  });

export type WorkerHandoffSummary = z.infer<typeof workerHandoffSummarySchema>;
export type SubmitWorkerDone = z.infer<typeof submitWorkerDoneSchema>;

export const createIssueAttachmentMetadataSchema = z.object({
  issueCommentId: z.string().uuid().optional().nullable(),
});

export type CreateIssueAttachmentMetadata = z.infer<typeof createIssueAttachmentMetadataSchema>;

export const ISSUE_DOCUMENT_FORMATS = ["markdown"] as const;

export const issueDocumentFormatSchema = z.enum(ISSUE_DOCUMENT_FORMATS);

export const issueDocumentKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "Document key must be lowercase letters, numbers, _ or -");

export const upsertIssueDocumentSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  format: issueDocumentFormatSchema,
  body: z.string().max(524288),
  changeSummary: z.string().trim().max(500).nullable().optional(),
  baseRevisionId: z.string().uuid().nullable().optional(),
});

export type IssueDocumentFormat = z.infer<typeof issueDocumentFormatSchema>;
export type UpsertIssueDocument = z.infer<typeof upsertIssueDocumentSchema>;

/**
 * Input type for validateIssueStatusTransition.
 */
export interface IssueStatusTransition {
  from: IssueStatus;
  to: IssueStatus;
}

/**
 * Result type for validateIssueStatusTransition.
 */
export interface IssueStatusTransitionResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates whether an issue status transition is allowed based on business rules.
 *
 * Business rules:
 * - done and cancelled are terminal states (no outgoing transitions)
 * - Same status transitions are always valid (no-op)
 * - Invalid/unknown statuses are rejected
 *
 * @param transition - Object containing { from, to } IssueStatus values
 * @returns { valid: boolean, reason?: string } - Validation result with optional error reason
 */
export function validateIssueStatusTransition(
  transition: IssueStatusTransition
): IssueStatusTransitionResult {
  const { from, to } = transition;

  // Validate that both statuses are valid IssueStatus values
  const validStatuses = ISSUE_STATUSES as readonly string[];

  if (!validStatuses.includes(from)) {
    return {
      valid: false,
      reason: `Invalid 'from' status: "${from}" is not a valid issue status`,
    };
  }

  if (!validStatuses.includes(to)) {
    return {
      valid: false,
      reason: `Invalid 'to' status: "${to}" is not a valid issue status`,
    };
  }

  // Same status is always valid (no-op transition)
  if (from === to) {
    return { valid: true };
  }

  // Check if transition is allowed based on ISSUE_STATUS_TRANSITIONS
  const allowedTransitions = ISSUE_STATUS_TRANSITIONS[from as IssueStatus];

  if (allowedTransitions.includes(to as IssueStatus)) {
    return { valid: true };
  }

  // Terminal states have special messaging
  if (from === "done") {
    return {
      valid: false,
      reason: `Cannot transition from "done" to "${to}". "done" is a terminal state with no outgoing transitions.`,
    };
  }

  if (from === "cancelled") {
    return {
      valid: false,
      reason: `Cannot transition from "cancelled" to "${to}". "cancelled" is a terminal state with no outgoing transitions.`,
    };
  }

  // General disallowed transition message
  const allowedList = allowedTransitions.join('", "');
  return {
    valid: false,
    reason: `Cannot transition from "${from}" to "${to}". Allowed transitions from "${from}" are: "${allowedList}".`,
  };
}

/**
 * Input type for validateIssuePriority.
 */
export interface IssuePriorityValidation {
  priority: IssuePriority;
}

/**
 * Result type for validateIssuePriority.
 */
export interface IssuePriorityValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates whether a priority value is valid based on ISSUE_PRIORITIES constant.
 *
 * Valid priorities: "critical", "high", "medium", "low"
 *
 * @param validation - Object containing { priority } IssuePriority value
 * @returns { valid: boolean, reason?: string } - Validation result with optional error reason
 */
export function validateIssuePriority(
  validation: IssuePriorityValidation
): IssuePriorityValidationResult {
  const { priority } = validation;

  // Validate that the priority is a valid IssuePriority value
  const validPriorities = ISSUE_PRIORITIES as readonly string[];

  if (!validPriorities.includes(priority)) {
    return {
      valid: false,
      reason: `Invalid priority: "${priority}" is not a valid issue priority. Valid priorities are: "${validPriorities.join('", "')}".`,
    };
  }

  return { valid: true };
}

/**
 * Input type for validateIssueAssignee.
 */
export interface IssueAssigneeValidation {
  assigneeAgentId: string;
}

/**
 * Result type for validateIssueAssignee.
 */
export interface IssueAssigneeValidationResult {
  valid: boolean;
  reason?: string;
}

// UUID format: 8-4-4-4-12 hex pattern (e.g., "550e8400-e29b-41d4-a716-446655440000")
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Validates whether an assignee agent ID is a properly formatted UUID string.
 *
 * UUID format: 8-4-4-4-12 hexadecimal pattern (case-insensitive)
 * Example: "550e8400-e29b-41d4-a716-446655440000"
 *
 * @param validation - Object containing { assigneeAgentId } string value
 * @returns { valid: boolean, reason?: string } - Validation result with optional error reason
 */
export function validateIssueAssignee(
  validation: IssueAssigneeValidation
): IssueAssigneeValidationResult {
  const { assigneeAgentId } = validation;

  // Check for empty string
  if (assigneeAgentId.trim() === "") {
    return {
      valid: false,
      reason: "Invalid assignee agent ID: value is empty.",
    };
  }

  // Validate UUID format
  if (!UUID_REGEX.test(assigneeAgentId)) {
    return {
      valid: false,
      reason: `Invalid assignee agent ID: "${assigneeAgentId}" is not a valid UUID. Expected format: 8-4-4-4-12 hexadecimal pattern (e.g., "550e8400-e29b-41d4-a716-446655440000").`,
    };
  }

  return { valid: true };
}
