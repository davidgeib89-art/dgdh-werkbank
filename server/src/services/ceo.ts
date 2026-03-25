import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, agents, heartbeatRuns, issues, projectWorkspaces, projects } from "@paperclipai/db";
import { z } from "zod";
import { badRequest } from "../errors.js";
import { logger } from "../middleware/logger.js";
import { parseObject } from "../adapters/utils.js";
import { issueService } from "./issues.js";
import { logActivity } from "./activity-log.js";
import { githubPrService } from "./github-pr.js";
import { isIssueCompleteForParent } from "./issue-review-policy.js";
import { resolveAssignedRoleTemplate } from "./role-templates.js";
import {
  buildExecutionWorkspaceAdapterConfig,
  parseIssueExecutionWorkspaceSettings,
  parseProjectExecutionWorkspacePolicy,
  resolveExecutionWorkspaceMode,
} from "./execution-workspace-policy.js";
import { cleanupExecutionWorkspace } from "./workspace-runtime.js";

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
  projectId: string | null;
  parentId: string | null;
  status: string;
  title: string;
  description: string | null;
  identifier: string | null;
  issueNumber: number | null;
  executionWorkspaceSettings: Record<string, unknown> | null;
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
  cleanupWarnings?: string[];
};

type MergeChildConflict = {
  outcome: "merge_conflict";
  prNumber: number;
  prUrl: string | null;
  branch: string | null;
  message: string;
};

type MergeChildBlocked = {
  outcome: "merge_blocked";
  prNumber: number;
  prUrl: string | null;
  branch: string | null;
  message: string;
  unexpectedFiles: string[];
  missingFiles: string[];
};

export type MergeChildResult = MergeChildOutcome | MergeChildConflict | MergeChildBlocked;

function isPullRequestLookupNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes("GitHub pull request lookup failed (404)");
}

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
    }
  | {
      triggered: true;
      outcome: "merge_blocked";
      parentIssueId: string;
      blocked: {
        childIssueId: string;
        identifier: string | null;
        title: string;
        prUrl: string | null;
        branch: string | null;
        message: string;
        unexpectedFiles: string[];
        missingFiles: string[];
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
  postParentBlockedComment: (input: {
    parentIssue: CeoIssueRecord;
    blockedChild: CeoIssueRecord;
    blocked: MergeChildBlocked;
  }) => Promise<void>;
};

function normalizeStatus(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeRepoRelativePath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .toLowerCase();
}

export function evaluateMergeScopeAgainstSummaryFiles(input: {
  expectedFiles: string[];
  actualFiles: string[];
}) {
  const expectedByKey = new Map<string, string>();
  const actualByKey = new Map<string, string>();

  for (const file of input.expectedFiles) {
    const normalized = normalizeRepoRelativePath(file);
    if (normalized) expectedByKey.set(normalized, normalized);
  }
  for (const file of input.actualFiles) {
    const normalized = normalizeRepoRelativePath(file);
    if (normalized) actualByKey.set(normalized, normalized);
  }

  const expected = Array.from(expectedByKey.values()).sort();
  const actual = Array.from(actualByKey.values()).sort();
  const unexpectedFiles = actual.filter((file) => !expectedByKey.has(file));
  const missingFiles = expected.filter((file) => !actualByKey.has(file));

  return {
    matches: unexpectedFiles.length === 0 && missingFiles.length === 0,
    expectedFiles: expected,
    actualFiles: actual,
    unexpectedFiles,
    missingFiles,
  };
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

function buildBlockedComment(input: {
  blockedChild: CeoIssueRecord;
  blocked: MergeChildBlocked;
}) {
  const unexpected =
    input.blocked.unexpectedFiles.length > 0
      ? input.blocked.unexpectedFiles.map((file) => `- ${file}`).join("\n")
      : "- none";
  const missing =
    input.blocked.missingFiles.length > 0
      ? input.blocked.missingFiles.map((file) => `- ${file}`).join("\n")
      : "- none";
  return [
    "## Merge blockiert: Scope weicht vom Worker-Handoff ab",
    `**Packet:** #${input.blockedChild.identifier ?? input.blockedChild.id} ${input.blockedChild.title}`,
    `**Branch:** ${input.blocked.branch ?? "unknown"}`,
    `**PR:** ${input.blocked.prUrl ?? "unknown"}`,
    `**Ursache:** ${input.blocked.message}`,
    "**Unexpected Files:**",
    unexpected,
    "**Missing Expected Files:**",
    missing,
    "**Aktion erforderlich:** Branch auf den kanonischen `worker-done.summary.files`-Scope bereinigen oder den Worker-Handoff mit korrektem Scope neu erzeugen.",
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

    if (mergeResult.outcome === "merge_blocked") {
      await deps.setIssueStatus(parentIssue.id, "blocked");
      await deps.postParentBlockedComment({
        parentIssue,
        blockedChild: child,
        blocked: mergeResult,
      });
      return {
        triggered: true,
        outcome: "merge_blocked",
        parentIssueId: parentIssue.id,
        blocked: {
          childIssueId: child.id,
          identifier: child.identifier,
          title: child.title,
          prUrl: mergeResult.prUrl,
          branch: mergeResult.branch,
          message: mergeResult.message,
          unexpectedFiles: mergeResult.unexpectedFiles,
          missingFiles: mergeResult.missingFiles,
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
      projectId: issue.projectId ?? null,
      parentId: issue.parentId ?? null,
      status: issue.status,
      title: issue.title,
      description: issue.description ?? null,
      identifier: issue.identifier ?? null,
      issueNumber: issue.issueNumber ?? null,
      executionWorkspaceSettings: issue.executionWorkspaceSettings ?? null,
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
        projectId: issues.projectId,
        parentId: issues.parentId,
        status: issues.status,
        title: issues.title,
        description: issues.description,
        identifier: issues.identifier,
        issueNumber: issues.issueNumber,
        executionWorkspaceSettings: issues.executionWorkspaceSettings,
        createdAt: issues.createdAt,
        assigneeAgentId: issues.assigneeAgentId,
      })
      .from(issues)
      .where(and(eq(issues.companyId, parent.companyId), eq(issues.parentId, parentId)))
      .orderBy(asc(issues.createdAt));

    return children.map((child) => ({
      id: child.id,
      companyId: child.companyId,
      projectId: child.projectId ?? null,
      parentId: child.parentId ?? null,
      status: child.status,
      title: child.title,
      description: child.description ?? null,
      identifier: child.identifier ?? null,
      issueNumber: child.issueNumber ?? null,
      executionWorkspaceSettings: child.executionWorkspaceSettings ?? null,
      createdAt: child.createdAt,
      assigneeAgentId: child.assigneeAgentId ?? null,
    }));
  }

  async function getWorkerMergeScopeForIssue(issueId: string): Promise<{
    expectedFiles: string[];
    branch: string | null;
    prUrl: string | null;
    commitHash: string | null;
  } | null> {
    const rows = await db
      .select({ details: activityLog.details })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.entityType, "issue"),
          eq(activityLog.entityId, issueId),
          eq(activityLog.action, "issue.worker_done_recorded"),
        ),
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(12);

    for (const row of rows) {
      const details = parseObject(row.details);
      const summary = parseObject(details.summary);
      const files = Array.isArray(summary.files)
        ? summary.files.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : [];
      if (files.length === 0) continue;
      return {
        expectedFiles: files,
        branch: readStringField(details, "branch"),
        prUrl: readStringField(details, "prUrl"),
        commitHash: readStringField(details, "commitHash"),
      };
    }

    return null;
  }

  async function resolveExecutionWorkspaceCleanupConfig(issue: CeoIssueRecord) {
    if (!issue.projectId) return null;

    const row = await db
      .select({
        executionWorkspacePolicy: projects.executionWorkspacePolicy,
        workspaceCwd: projectWorkspaces.cwd,
      })
      .from(projects)
      .leftJoin(
        projectWorkspaces,
        and(eq(projectWorkspaces.projectId, projects.id), eq(projectWorkspaces.isPrimary, true)),
      )
      .where(eq(projects.id, issue.projectId))
      .then((rows) => rows[0] ?? null);

    if (!row?.workspaceCwd) return null;

    const projectPolicy = parseProjectExecutionWorkspacePolicy(row.executionWorkspacePolicy);
    const issueSettings = parseIssueExecutionWorkspaceSettings(issue.executionWorkspaceSettings);
    const mode = resolveExecutionWorkspaceMode({
      projectPolicy,
      issueSettings,
      legacyUseProjectWorkspace: true,
    });
    if (mode !== "isolated") return null;

    return {
      baseCwd: row.workspaceCwd,
      config: buildExecutionWorkspaceAdapterConfig({
        agentConfig: {},
        projectPolicy,
        issueSettings,
        mode,
        legacyUseProjectWorkspace: true,
      }),
    };
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
    prUrl?: string | null;
    branch?: string | null;
    requestedBy: MergeActor;
  }): Promise<MergeChildResult> {
    if (!Number.isInteger(input.prNumber) || input.prNumber <= 0) {
      throw badRequest("prNumber must be a positive integer");
    }

    const issue = await getIssueById(input.issueId);
    if (!issue) throw badRequest("Issue not found");

    let prDetails: {
      prNumber: number;
      prUrl: string | null;
      branch: string | null;
    };
    try {
      prDetails = await githubSvc.getGitHubPullRequest({
        prNumber: input.prNumber,
      });
    } catch (err) {
      if (!isPullRequestLookupNotFoundError(err)) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
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
            prUrl: input.prUrl ?? null,
            branch: input.branch ?? null,
            message,
            reason: "pull_request_lookup_failed",
          },
          input.requestedBy.runId,
          activityRunId,
        ),
      });
      return {
        outcome: "merge_conflict",
        prNumber: input.prNumber,
        prUrl: input.prUrl ?? null,
        branch: input.branch ?? null,
        message,
      };
    }
    const workerMergeScope = await getWorkerMergeScopeForIssue(issue.id);
    if (!workerMergeScope) {
      const message = "Merge blocked: missing canonical worker-done summary.files metadata for this issue.";
      const activityRunId = await resolvePersistedActivityRunId(input.requestedBy.runId);
      await issuesSvc.update(issue.id, { status: "blocked" });
      await logActivity(db, {
        companyId: issue.companyId,
        actorType: input.requestedBy.actorType,
        actorId: input.requestedBy.actorId,
        agentId: input.requestedBy.agentId ?? null,
        runId: activityRunId,
        action: "issue.merge_scope_blocked",
        entityType: "issue",
        entityId: issue.id,
        details: withApiRunIdFallbackDetails(
          {
            identifier: issue.identifier,
            prNumber: input.prNumber,
            prUrl: prDetails.prUrl,
            branch: prDetails.branch,
            reason: "missing_worker_scope",
            message,
          },
          input.requestedBy.runId,
          activityRunId,
        ),
      });
      return {
        outcome: "merge_blocked",
        prNumber: input.prNumber,
        prUrl: prDetails.prUrl,
        branch: prDetails.branch,
        message,
        unexpectedFiles: [],
        missingFiles: [],
      };
    }

    const changedFiles = await githubSvc.listGitHubPullRequestFiles({
      prNumber: input.prNumber,
    });
    const scopeCheck = evaluateMergeScopeAgainstSummaryFiles({
      expectedFiles: workerMergeScope.expectedFiles,
      actualFiles: changedFiles.map((file) => file.path),
    });
    if (!scopeCheck.matches) {
      const message =
        "Merge blocked: PR file scope does not match worker-done.summary.files. Unexpected files would reach main.";
      const activityRunId = await resolvePersistedActivityRunId(input.requestedBy.runId);
      await issuesSvc.update(issue.id, { status: "blocked" });
      await logActivity(db, {
        companyId: issue.companyId,
        actorType: input.requestedBy.actorType,
        actorId: input.requestedBy.actorId,
        agentId: input.requestedBy.agentId ?? null,
        runId: activityRunId,
        action: "issue.merge_scope_blocked",
        entityType: "issue",
        entityId: issue.id,
        details: withApiRunIdFallbackDetails(
          {
            identifier: issue.identifier,
            prNumber: input.prNumber,
            prUrl: prDetails.prUrl,
            branch: prDetails.branch,
            expectedFiles: scopeCheck.expectedFiles,
            actualFiles: scopeCheck.actualFiles,
            unexpectedFiles: scopeCheck.unexpectedFiles,
            missingFiles: scopeCheck.missingFiles,
            message,
          },
          input.requestedBy.runId,
          activityRunId,
        ),
      });
      return {
        outcome: "merge_blocked",
        prNumber: input.prNumber,
        prUrl: prDetails.prUrl,
        branch: prDetails.branch,
        message,
        unexpectedFiles: scopeCheck.unexpectedFiles,
        missingFiles: scopeCheck.missingFiles,
      };
    }

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

    let cleanupWarnings: string[] = [];
    if (prDetails.branch) {
      await githubSvc.deleteGitHubBranch({
        branch: prDetails.branch,
      });

      const cleanupConfig = await resolveExecutionWorkspaceCleanupConfig(issue);
      if (cleanupConfig) {
        const cleanupResult = await cleanupExecutionWorkspace({
          baseCwd: cleanupConfig.baseCwd,
          config: cleanupConfig.config,
          branchName: prDetails.branch,
        });
        cleanupWarnings = cleanupResult.warnings;
      }
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
          cleanupWarnings,
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
      cleanupWarnings,
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

  async function postParentBlockedComment(input: {
    parentIssue: CeoIssueRecord;
    blockedChild: CeoIssueRecord;
    blocked: MergeChildBlocked;
    ceoAgentId: string | null;
    runId: string | null;
  }) {
    const body = buildBlockedComment({
      blockedChild: input.blockedChild,
      blocked: input.blocked,
    });
    await issuesSvc.addComment(input.parentIssue.id, body, {
      agentId: input.ceoAgentId ?? undefined,
    });

    const activityRunId = await resolvePersistedActivityRunId(input.runId);
    await logActivity(db, {
      companyId: input.parentIssue.companyId,
      actorType: "agent",
      actorId: input.ceoAgentId ?? "system",
      agentId: input.ceoAgentId,
      runId: activityRunId,
      action: "issue.merge_scope_blocked",
      entityType: "issue",
      entityId: input.parentIssue.id,
      details: withApiRunIdFallbackDetails(
        {
          identifier: input.parentIssue.identifier,
          blockedChildIssueId: input.blockedChild.id,
          blockedChildIdentifier: input.blockedChild.identifier,
          prUrl: input.blocked.prUrl,
          branch: input.blocked.branch,
          unexpectedFiles: input.blocked.unexpectedFiles,
          missingFiles: input.blocked.missingFiles,
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
            prUrl: pr.prUrl,
            branch: pr.branch,
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
                  projectId: issue.projectId ?? null,
                  parentId: issue.parentId ?? null,
                  status: issue.status,
                  title: issue.title,
                  description: issue.description ?? null,
                  identifier: issue.identifier ?? null,
                  issueNumber: issue.issueNumber ?? null,
                  executionWorkspaceSettings: issue.executionWorkspaceSettings ?? null,
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
        postParentBlockedComment: ({ parentIssue: parent, blockedChild, blocked }) =>
          postParentBlockedComment({
            parentIssue: parent,
            blockedChild,
            blocked,
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
