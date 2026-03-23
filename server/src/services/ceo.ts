import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, agents, heartbeatRuns, issues } from "@paperclipai/db";
import { z } from "zod";
import { badRequest } from "../errors.js";
import { logger } from "../middleware/logger.js";
import { parseObject } from "../adapters/utils.js";
import { issueService } from "./issues.js";
import { logActivity } from "./activity-log.js";
import { githubPrService } from "./github-pr.js";
import { isIssueCompleteForParent } from "./issue-review-policy.js";
import { resolveAssignedRoleTemplate } from "./role-templates.js";

const REVIEWER_ACCEPTED_STATUS = "reviewer_accepted";
const MERGED_STATUS = "merged";
const MERGE_CONFLICT_STATUS = "merge_conflict";
const WORKER_PR_ACTIVITY_ACTIONS = [
  "issue.worker_pull_request_created",
  "issue.worker_done_recorded",
] as const;

type ReviewerVerdict = "accepted" | "changes_requested";

type MergeActor = {
  actorType: "agent" | "user" | "system";
  actorId: string;
  agentId?: string | null;
  runId?: string | null;
};

export type CeoIssueRecord = {
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
};

export type PullRequestRef = {
  prNumber: number;
  prUrl: string | null;
  branch: string | null;
};

type MergeChildOutcome = {
  outcome: "merged";
  prNumber: number;
  prUrl: string | null;
  branch: string | null;
};

type MergeChildConflict = {
  outcome: "merge_conflict";
  prNumber: number;
  prUrl: string | null;
  branch: string | null;
  message: string;
};

export type MergeChildResult = MergeChildOutcome | MergeChildConflict;

type OrchestratorNoTriggerReason =
  | "verdict_not_accepted"
  | "child_not_found"
  | "parent_missing"
  | "parent_not_assigned_to_ceo"
  | "children_not_ready";

export type CeoMergeOrchestratorResult =
  | {
      triggered: false;
      reason: OrchestratorNoTriggerReason;
      openChildren?: Array<{ childIssueId: string; status: string }>;
    }
  | {
      triggered: true;
      outcome: "merged_all";
      parentIssueId: string;
      mergedChildren: Array<{
        childIssueId: string;
        identifier: string | null;
        title: string;
        prUrl: string | null;
      }>;
      mergedAt: string;
    }
  | {
      triggered: true;
      outcome: "merge_conflict";
      parentIssueId: string;
      conflict: {
        childIssueId: string;
        identifier: string | null;
        title: string;
        prUrl: string | null;
        branch: string | null;
        message: string;
      };
    };

type CeoMergeOrchestratorDeps = {
  getIssueById: (issueId: string) => Promise<CeoIssueRecord | null>;
  listChildrenByParentId: (parentId: string) => Promise<CeoIssueRecord[]>;
  isParentAssignedToCeo: (parentIssue: CeoIssueRecord) => Promise<boolean>;
  getPullRequestRefForChildIssue: (childIssueId: string) => Promise<PullRequestRef | null>;
  mergeChildIssuePullRequest: (input: {
    childIssue: CeoIssueRecord;
    pr: PullRequestRef;
  }) => Promise<MergeChildResult>;
  setIssueStatus: (issueId: string, status: string) => Promise<CeoIssueRecord | null>;
  postParentSummaryComment: (input: {
    parentIssue: CeoIssueRecord;
    mergedChildren: Array<{
      childIssueId: string;
      identifier: string | null;
      title: string;
      prUrl: string | null;
    }>;
    mergedAt: string;
  }) => Promise<void>;
  postParentConflictComment: (input: {
    parentIssue: CeoIssueRecord;
    conflictChild: CeoIssueRecord;
    conflict: MergeChildConflict;
  }) => Promise<void>;
};

function normalizeStatus(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parsePrNumberFromUrl(prUrl: string | null | undefined): number | null {
  if (!prUrl) return null;
  const match = prUrl.match(/\/pull\/(\d+)(?:[/?#]|$)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function readNumberField(record: Record<string, unknown>, key: string): number | null {
  const raw = record[key];
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw.trim());
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function readStringField(record: Record<string, unknown>, key: string): string | null {
  const raw = record[key];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveGitHubIssueNumber(issue: { issueNumber: number | null; identifier: string | null }): number | null {
  if (typeof issue.issueNumber === "number" && Number.isInteger(issue.issueNumber) && issue.issueNumber > 0) {
    return issue.issueNumber;
  }
  const identifier = issue.identifier?.trim() ?? "";
  const match = identifier.match(/-(\d+)$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildSummaryComment(input: {
  parentIssue: CeoIssueRecord;
  mergedChildren: Array<{
    childIssueId: string;
    identifier: string | null;
    title: string;
    prUrl: string | null;
  }>;
  mergedAt: string;
}) {
  const mergedList = input.mergedChildren
    .map((entry) => {
      const childLabel = entry.identifier ?? entry.childIssueId;
      const prPart = entry.prUrl ? ` - ${entry.prUrl}` : "";
      return `- ${childLabel} ${entry.title}${prPart}`;
    })
    .join("\n");

  return [
    "## Mission abgeschlossen",
    `**Parent:** #${input.parentIssue.identifier ?? input.parentIssue.id} ${input.parentIssue.title}`,
    "**Gemergte Packets:**",
    mergedList.length > 0 ? mergedList : "- none",
    "**Ergebnis:** Alle review-pflichtigen Packets wurden in Reihenfolge gemergt; review-optionale Packets waren bereits abgeschlossen.",
    `**Merge-Zeitpunkt:** ${input.mergedAt}`,
  ].join("\n");
}

function buildConflictComment(input: {
  conflictChild: CeoIssueRecord;
  conflict: MergeChildConflict;
}) {
  return [
    "## Merge-Konflikt erkannt",
    `**Packet:** #${input.conflictChild.identifier ?? input.conflictChild.id} ${input.conflictChild.title}`,
    `**Branch:** ${input.conflict.branch ?? "unknown"}`,
    `**PR:** ${input.conflict.prUrl ?? "unknown"}`,
    "**Aktion erforderlich:** David muss manuell entscheiden - Auto-Retry ist nicht aktiviert.",
  ].join("\n");
}

export async function maybeRunCeoMergeOrchestratorAfterReviewerVerdict(
  input: {
    childIssueId: string;
    reviewerVerdict: ReviewerVerdict;
  },
  deps: CeoMergeOrchestratorDeps,
): Promise<CeoMergeOrchestratorResult> {
  if (input.reviewerVerdict !== "accepted") {
    return { triggered: false, reason: "verdict_not_accepted" };
  }

  const childIssue = await deps.getIssueById(input.childIssueId);
  if (!childIssue || !childIssue.parentId) {
    return { triggered: false, reason: "child_not_found" };
  }

  const parentIssue = await deps.getIssueById(childIssue.parentId);
  if (!parentIssue) {
    return { triggered: false, reason: "parent_missing" };
  }

  const parentAssignedToCeo = await deps.isParentAssignedToCeo(parentIssue);
  if (!parentAssignedToCeo) {
    return { triggered: false, reason: "parent_not_assigned_to_ceo" };
  }

  const children = (await deps.listChildrenByParentId(parentIssue.id)).sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  );

  const openChildren = children.filter((child) => {
    return !isIssueCompleteForParent({
      status: child.status,
      description: child.description,
    });
  });

  if (openChildren.length > 0) {
    return {
      triggered: false,
      reason: "children_not_ready",
      openChildren: openChildren.map((child) => ({
        childIssueId: child.id,
        status: child.status,
      })),
    };
  }

  const mergeCandidates = children.filter(
    (child) => normalizeStatus(child.status) === REVIEWER_ACCEPTED_STATUS,
  );
  const mergedChildren: Array<{
    childIssueId: string;
    identifier: string | null;
    title: string;
    prUrl: string | null;
  }> = [];

  for (const child of mergeCandidates) {
    const pr = await deps.getPullRequestRefForChildIssue(child.id);
    if (!pr) {
      const conflict: MergeChildConflict = {
        outcome: "merge_conflict",
        prNumber: 0,
        prUrl: null,
        branch: null,
        message: "Missing PR metadata for child issue",
      };
      await deps.setIssueStatus(child.id, MERGE_CONFLICT_STATUS);
      await deps.setIssueStatus(parentIssue.id, MERGE_CONFLICT_STATUS);
      await deps.postParentConflictComment({
        parentIssue,
        conflictChild: child,
        conflict,
      });
      return {
        triggered: true,
        outcome: "merge_conflict",
        parentIssueId: parentIssue.id,
        conflict: {
          childIssueId: child.id,
          identifier: child.identifier,
          title: child.title,
          prUrl: conflict.prUrl,
          branch: conflict.branch,
          message: conflict.message,
        },
      };
    }

    const mergeResult = await deps.mergeChildIssuePullRequest({
      childIssue: child,
      pr,
    });

    if (mergeResult.outcome === "merge_conflict") {
      // Sprint X: Auto-retry is intentionally NOT implemented yet.
      await deps.setIssueStatus(parentIssue.id, MERGE_CONFLICT_STATUS);
      await deps.postParentConflictComment({
        parentIssue,
        conflictChild: child,
        conflict: mergeResult,
      });
      return {
        triggered: true,
        outcome: "merge_conflict",
        parentIssueId: parentIssue.id,
        conflict: {
          childIssueId: child.id,
          identifier: child.identifier,
          title: child.title,
          prUrl: mergeResult.prUrl,
          branch: mergeResult.branch,
          message: mergeResult.message,
        },
      };
    }

    mergedChildren.push({
      childIssueId: child.id,
      identifier: child.identifier,
      title: child.title,
      prUrl: mergeResult.prUrl,
    });
  }

  const mergedAt = new Date().toISOString();
  await deps.setIssueStatus(parentIssue.id, "done");
  await deps.postParentSummaryComment({
    parentIssue,
    mergedChildren,
    mergedAt,
  });

  return {
    triggered: true,
    outcome: "merged_all",
    parentIssueId: parentIssue.id,
    mergedChildren,
    mergedAt,
  };
}

export function ceoService(db: Db) {
  const issuesSvc = issueService(db);
  const githubSvc = githubPrService();

  async function resolvePersistedActivityRunId(
    actorRunId: string | null | undefined,
  ): Promise<string | null> {
    const runId = actorRunId?.trim();
    if (!runId) return null;
    const parsed = z.string().uuid().safeParse(runId);
    if (!parsed.success) return null;
    const run = await db
      .select({ id: heartbeatRuns.id })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, parsed.data))
      .then((rows) => rows[0] ?? null)
      .catch(() => null);
    return run?.id ?? null;
  }

  function withApiRunIdFallbackDetails(
    details: Record<string, unknown>,
    actorRunId: string | null | undefined,
    activityRunId: string | null,
  ) {
    const runId = actorRunId?.trim();
    if (!runId || runId === activityRunId) return details;
    return {
      ...details,
      apiRunId: runId,
    };
  }

  async function getIssueById(issueId: string): Promise<CeoIssueRecord | null> {
    const issue = await issuesSvc.getById(issueId);
    if (!issue) return null;
    return {
      id: issue.id,
      companyId: issue.companyId,
      parentId: issue.parentId ?? null,
      status: issue.status,
      title: issue.title,
      description: issue.description ?? null,
      identifier: issue.identifier ?? null,
      issueNumber: issue.issueNumber ?? null,
      createdAt: issue.createdAt,
      assigneeAgentId: issue.assigneeAgentId ?? null,
    };
  }

  async function listChildrenByParentId(parentId: string) {
    const parent = await getIssueById(parentId);
    if (!parent) return [];

    const children = await db
      .select({
        id: issues.id,
        companyId: issues.companyId,
        parentId: issues.parentId,
        status: issues.status,
        title: issues.title,
        description: issues.description,
        identifier: issues.identifier,
        issueNumber: issues.issueNumber,
        createdAt: issues.createdAt,
        assigneeAgentId: issues.assigneeAgentId,
      })
      .from(issues)
      .where(and(eq(issues.companyId, parent.companyId), eq(issues.parentId, parentId)))
      .orderBy(asc(issues.createdAt));

    return children.map((child) => ({
      id: child.id,
      companyId: child.companyId,
      parentId: child.parentId ?? null,
      status: child.status,
      title: child.title,
      description: child.description ?? null,
      identifier: child.identifier ?? null,
      issueNumber: child.issueNumber ?? null,
      createdAt: child.createdAt,
      assigneeAgentId: child.assigneeAgentId ?? null,
    }));
  }

  async function getPullRequestRefForChildIssue(childIssueId: string): Promise<PullRequestRef | null> {
    const rows = await db
      .select({
        action: activityLog.action,
        details: activityLog.details,
      })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.entityType, "issue"),
          eq(activityLog.entityId, childIssueId),
          inArray(activityLog.action, [...WORKER_PR_ACTIVITY_ACTIONS]),
        ),
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(12);

    for (const row of rows) {
      const details = parseObject(row.details);
      const prNumber =
        readNumberField(details, "prNumber") ??
        parsePrNumberFromUrl(readStringField(details, "prUrl"));
      if (!prNumber) continue;
      return {
        prNumber,
        prUrl: readStringField(details, "prUrl"),
        branch: readStringField(details, "branch"),
      };
    }
    return null;
  }

  async function mergeIssuePullRequest(input: {
    issueId: string;
    prNumber: number;
    requestedBy: MergeActor;
  }): Promise<MergeChildResult> {
    if (!Number.isInteger(input.prNumber) || input.prNumber <= 0) {
      throw badRequest("prNumber must be a positive integer");
    }

    const issue = await getIssueById(input.issueId);
    if (!issue) throw badRequest("Issue not found");

    const prDetails = await githubSvc.getGitHubPullRequest({
      prNumber: input.prNumber,
    });
    const mergeResult = await githubSvc.mergeGitHubPullRequest({
      prNumber: input.prNumber,
      commitTitle: `[${issue.identifier ?? issue.id}] ${issue.title}`,
    });

    if (mergeResult.outcome === "merge_conflict") {
      const activityRunId = await resolvePersistedActivityRunId(
        input.requestedBy.runId,
      );
      await issuesSvc.update(issue.id, { status: MERGE_CONFLICT_STATUS });
      await logActivity(db, {
        companyId: issue.companyId,
        actorType: input.requestedBy.actorType,
        actorId: input.requestedBy.actorId,
        agentId: input.requestedBy.agentId ?? null,
        runId: activityRunId,
        action: "issue.merge_conflict_detected",
        entityType: "issue",
        entityId: issue.id,
        details: withApiRunIdFallbackDetails(
          {
            identifier: issue.identifier,
            prNumber: input.prNumber,
            prUrl: prDetails.prUrl,
            branch: prDetails.branch,
            message: mergeResult.message,
          },
          input.requestedBy.runId,
          activityRunId,
        ),
      });
      return {
        outcome: "merge_conflict",
        prNumber: input.prNumber,
        prUrl: prDetails.prUrl,
        branch: prDetails.branch,
        message: mergeResult.message,
      };
    }

    if (prDetails.branch) {
      await githubSvc.deleteGitHubBranch({
        branch: prDetails.branch,
      });
    }
    const activityRunId = await resolvePersistedActivityRunId(
      input.requestedBy.runId,
    );
    await issuesSvc.update(issue.id, { status: MERGED_STATUS });
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: input.requestedBy.actorType,
      actorId: input.requestedBy.actorId,
      agentId: input.requestedBy.agentId ?? null,
      runId: activityRunId,
      action: "issue.pr_merged",
      entityType: "issue",
      entityId: issue.id,
      details: withApiRunIdFallbackDetails(
        {
          identifier: issue.identifier,
          prNumber: input.prNumber,
          prUrl: prDetails.prUrl,
          branch: prDetails.branch,
          mergeMethod: "squash",
          mergeSha: mergeResult.sha,
        },
        input.requestedBy.runId,
        activityRunId,
      ),
    });

    return {
      outcome: "merged",
      prNumber: input.prNumber,
      prUrl: prDetails.prUrl,
      branch: prDetails.branch,
    };
  }

  async function postParentSummaryComment(input: {
    parentIssue: CeoIssueRecord;
    mergedChildren: Array<{
      childIssueId: string;
      identifier: string | null;
      title: string;
      prUrl: string | null;
    }>;
    mergedAt: string;
    ceoAgentId: string | null;
    runId: string | null;
  }) {
    const body = buildSummaryComment({
      parentIssue: input.parentIssue,
      mergedChildren: input.mergedChildren,
      mergedAt: input.mergedAt,
    });
    await issuesSvc.addComment(input.parentIssue.id, body, {
      agentId: input.ceoAgentId ?? undefined,
    });

    const githubIssueNumber = resolveGitHubIssueNumber(input.parentIssue);
    if (githubIssueNumber) {
      try {
        await githubSvc.createGitHubIssueComment({
          issueNumber: githubIssueNumber,
          body,
        });
      } catch (err) {
        logger.warn(
          {
            event: "ceo_merge_summary_comment_failed",
            parentIssueId: input.parentIssue.id,
            issueNumber: githubIssueNumber,
            error: err instanceof Error ? err.message : String(err),
          },
          "Failed to post CEO merge summary to GitHub issue; kept Paperclip comment",
        );
      }
    }

    const activityRunId = await resolvePersistedActivityRunId(input.runId);
    await logActivity(db, {
      companyId: input.parentIssue.companyId,
      actorType: "agent",
      actorId: input.ceoAgentId ?? "system",
      agentId: input.ceoAgentId,
      runId: activityRunId,
      action: "issue.merge_summary_posted",
      entityType: "issue",
      entityId: input.parentIssue.id,
      details: withApiRunIdFallbackDetails(
        {
          identifier: input.parentIssue.identifier,
          mergedChildrenCount: input.mergedChildren.length,
          mergedAt: input.mergedAt,
        },
        input.runId,
        activityRunId,
      ),
    });
  }

  async function postParentConflictComment(input: {
    parentIssue: CeoIssueRecord;
    conflictChild: CeoIssueRecord;
    conflict: MergeChildConflict;
    ceoAgentId: string | null;
    runId: string | null;
  }) {
    const body = buildConflictComment({
      conflictChild: input.conflictChild,
      conflict: input.conflict,
    });
    await issuesSvc.addComment(input.parentIssue.id, body, {
      agentId: input.ceoAgentId ?? undefined,
    });

    const githubIssueNumber = resolveGitHubIssueNumber(input.parentIssue);
    if (githubIssueNumber) {
      try {
        await githubSvc.createGitHubIssueComment({
          issueNumber: githubIssueNumber,
          body,
        });
      } catch (err) {
        logger.warn(
          {
            event: "ceo_merge_conflict_comment_failed",
            parentIssueId: input.parentIssue.id,
            issueNumber: githubIssueNumber,
            error: err instanceof Error ? err.message : String(err),
          },
          "Failed to post CEO merge conflict to GitHub issue; kept Paperclip comment",
        );
      }
    }

    const activityRunId = await resolvePersistedActivityRunId(input.runId);
    await logActivity(db, {
      companyId: input.parentIssue.companyId,
      actorType: "agent",
      actorId: input.ceoAgentId ?? "system",
      agentId: input.ceoAgentId,
      runId: activityRunId,
      action: "issue.merge_conflict_detected",
      entityType: "issue",
      entityId: input.parentIssue.id,
      details: withApiRunIdFallbackDetails(
        {
          identifier: input.parentIssue.identifier,
          conflictChildIssueId: input.conflictChild.id,
          conflictChildIdentifier: input.conflictChild.identifier,
          prUrl: input.conflict.prUrl,
          branch: input.conflict.branch,
        },
        input.runId,
        activityRunId,
      ),
    });
  }

  async function isParentAssignedToCeo(parentIssue: CeoIssueRecord) {
    if (!parentIssue.assigneeAgentId) return false;
    const assignee = await db
      .select({
        id: agents.id,
        companyId: agents.companyId,
        role: agents.role,
        adapterConfig: agents.adapterConfig,
      })
      .from(agents)
      .where(eq(agents.id, parentIssue.assigneeAgentId))
      .then((rows) => rows[0] ?? null);
    if (!assignee || assignee.companyId !== parentIssue.companyId) return false;
    const roleTemplate = resolveAssignedRoleTemplate(
      parseObject(assignee.adapterConfig),
    );
    if (roleTemplate.assigned?.template.id === "ceo") return true;
    return assignee.role.toLowerCase() === "ceo";
  }

  async function maybeRunMergeOrchestratorAfterReviewerVerdict(input: {
    childIssueId: string;
    reviewerVerdict: ReviewerVerdict;
    reviewerAgentId: string;
    reviewerRunId: string | null;
  }) {
    const childIssue = await getIssueById(input.childIssueId);
    const parentIssue =
      childIssue?.parentId ? await getIssueById(childIssue.parentId) : null;
    const ceoAgentId = parentIssue?.assigneeAgentId ?? null;

    return maybeRunCeoMergeOrchestratorAfterReviewerVerdict(
      {
        childIssueId: input.childIssueId,
        reviewerVerdict: input.reviewerVerdict,
      },
      {
        getIssueById,
        listChildrenByParentId,
        isParentAssignedToCeo,
        getPullRequestRefForChildIssue,
        mergeChildIssuePullRequest: ({ childIssue: targetChildIssue, pr }) =>
          mergeIssuePullRequest({
            issueId: targetChildIssue.id,
            prNumber: pr.prNumber,
            requestedBy: {
              actorType: "agent",
              actorId: ceoAgentId ?? input.reviewerAgentId,
              agentId: ceoAgentId,
              runId: input.reviewerRunId,
            },
          }),
        setIssueStatus: (issueId, status) =>
          issuesSvc.update(issueId, { status }).then((issue) =>
            issue
              ? {
                  id: issue.id,
                  companyId: issue.companyId,
                  parentId: issue.parentId ?? null,
                  status: issue.status,
                  title: issue.title,
                  description: issue.description ?? null,
                  identifier: issue.identifier ?? null,
                  issueNumber: issue.issueNumber ?? null,
                  createdAt: issue.createdAt,
                  assigneeAgentId: issue.assigneeAgentId ?? null,
                }
              : null,
          ),
        postParentSummaryComment: ({ parentIssue: parent, mergedChildren, mergedAt }) =>
          postParentSummaryComment({
            parentIssue: parent,
            mergedChildren,
            mergedAt,
            ceoAgentId,
            runId: input.reviewerRunId,
          }),
        postParentConflictComment: ({ parentIssue: parent, conflictChild, conflict }) =>
          postParentConflictComment({
            parentIssue: parent,
            conflictChild,
            conflict,
            ceoAgentId,
            runId: input.reviewerRunId,
          }),
      },
    );
  }

  return {
    mergeIssuePullRequest,
    maybeRunMergeOrchestratorAfterReviewerVerdict,
    listChildrenByParentId,
  };
}
