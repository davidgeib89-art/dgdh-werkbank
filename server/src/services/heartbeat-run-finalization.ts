import { parseObject } from "../adapters/utils.js";
import { resolveAssignedRoleTemplate } from "./role-templates.js";
import { extractReviewerVerdict, type ReviewerVerdict } from "./heartbeat-prompt-context.js";

const CLOSED_ISSUE_STATUSES = new Set([
  "done",
  "cancelled",
  "reviewer_accepted",
  "merged",
]);

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export type AgentFinalizationOutcome =
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "blocked"
  | "awaiting_approval";

export type HeartbeatRunFinalizationInput = {
  agentId: string;
  outcome: AgentFinalizationOutcome;
  errorCode?: string | null;
};

export function resolveNextAgentStatusAfterRun(input: {
  runningCount: number;
  outcome: AgentFinalizationOutcome;
  errorCode?: string | null;
}) {
  if (input.runningCount > 0) return "running" as const;
  if (input.outcome === "failed" && input.errorCode === "process_lost") {
    return "idle" as const;
  }
  return input.outcome === "succeeded" ||
    input.outcome === "blocked" ||
    input.outcome === "cancelled" ||
    input.outcome === "awaiting_approval"
    ? ("idle" as const)
    : ("error" as const);
}

export async function finalizeHeartbeatAgentStatus(
  input: HeartbeatRunFinalizationInput,
  deps: {
    getAgent: (agentId: string) => Promise<{
      id: string;
      companyId: string;
      status: string;
      lastHeartbeatAt: Date | null;
    } | null>;
    countRunningRunsForAgent: (agentId: string) => Promise<number>;
    updateAgentStatus: (
      agentId: string,
      nextStatus: string,
    ) => Promise<{
      id: string;
      companyId: string;
      status: string;
      lastHeartbeatAt: Date | null;
    } | null>;
    publishAgentStatus: (input: {
      companyId: string;
      agentId: string;
      status: string;
      lastHeartbeatAt: Date | null;
      outcome: AgentFinalizationOutcome;
    }) => void;
  },
) {
  const existing = await deps.getAgent(input.agentId);
  if (!existing) return;

  if (existing.status === "paused" || existing.status === "terminated") {
    return;
  }

  const runningCount = await deps.countRunningRunsForAgent(input.agentId);
  const nextStatus = resolveNextAgentStatusAfterRun({
    runningCount,
    outcome: input.outcome,
    errorCode: input.errorCode ?? null,
  });

  const updated = await deps.updateAgentStatus(input.agentId, nextStatus);
  if (!updated) return;

  deps.publishAgentStatus({
    companyId: updated.companyId,
    agentId: updated.id,
    status: updated.status,
    lastHeartbeatAt: updated.lastHeartbeatAt,
    outcome: input.outcome,
  });
}

export function readAssignedRoleTemplateId(
  contextSnapshot: Record<string, unknown> | null | undefined,
) {
  const roleTemplate = parseObject(contextSnapshot?.paperclipRoleTemplate);
  return readNonEmptyString(roleTemplate.id)?.toLowerCase() ?? null;
}

export function determineIssueStatusAfterRun(input: {
  runStatus: string;
  issueStatus: string | null | undefined;
  roleTemplateId: string | null | undefined;
  errorCode?: string | null | undefined;
  stdoutExcerpt?: string | null | undefined;
}): {
  nextStatus: "blocked" | "in_review" | "done" | null;
  reason: "worker_loop_detected" | "reviewer_accepted" | null;
  reviewerVerdict: ReviewerVerdict | null;
} {
  const normalizedErrorCode =
    readNonEmptyString(input.errorCode)?.toLowerCase() ?? null;
  if (
    input.runStatus !== "succeeded" &&
    !(input.runStatus === "blocked" && normalizedErrorCode === "loop_detected")
  ) {
    return { nextStatus: null, reason: null, reviewerVerdict: null };
  }

  const issueStatus = readNonEmptyString(input.issueStatus)?.toLowerCase();
  if (!issueStatus || CLOSED_ISSUE_STATUSES.has(issueStatus)) {
    return { nextStatus: null, reason: null, reviewerVerdict: null };
  }

  if (input.runStatus === "blocked" && normalizedErrorCode === "loop_detected") {
    return {
      nextStatus: "blocked",
      reason: "worker_loop_detected",
      reviewerVerdict: null,
    };
  }

  const roleTemplateId =
    readNonEmptyString(input.roleTemplateId)?.toLowerCase() ?? null;
  if (roleTemplateId === "reviewer") {
    const reviewerVerdict = extractReviewerVerdict(input.stdoutExcerpt);
    if (reviewerVerdict === "accepted") {
      return {
        nextStatus: "done",
        reason: "reviewer_accepted",
        reviewerVerdict,
      };
    }
    return { nextStatus: null, reason: null, reviewerVerdict };
  }

  const workerLikeRole = roleTemplateId === "worker" || roleTemplateId == null;
  if (workerLikeRole) return { nextStatus: null, reason: null, reviewerVerdict: null };

  return { nextStatus: null, reason: null, reviewerVerdict: null };
}

type AutoRetriggerIssueRecord = {
  id: string;
  companyId: string;
  parentId: string | null;
  status: string;
  assigneeAgentId: string | null;
  identifier: string | null;
};

type AutoRetriggerAgentRecord = {
  id: string;
  companyId: string;
  adapterConfig: Record<string, unknown> | null;
};

type AutoRetriggerActivityInput = {
  companyId: string;
  actorType: "agent";
  actorId: string;
  agentId: string | null;
  runId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
};

type AutoRetriggerWakeupOptions = {
  source?: "timer" | "assignment" | "on_demand" | "automation";
  triggerDetail?: "manual" | "ping" | "callback" | "system";
  reason?: string | null;
  payload?: Record<string, unknown> | null;
  requestedByActorType?: "user" | "agent" | "system";
  requestedByActorId?: string | null;
  contextSnapshot?: Record<string, unknown>;
};

type AutoRetriggerDeps = {
  getIssueById: (issueId: string) => Promise<AutoRetriggerIssueRecord | null>;
  getAgentById: (agentId: string) => Promise<AutoRetriggerAgentRecord | null>;
  updateIssue: (
    issueId: string,
    patch: { assigneeAgentId?: string | null },
  ) => Promise<AutoRetriggerIssueRecord | null>;
  wakeup: (
    agentId: string,
    opts: AutoRetriggerWakeupOptions,
  ) => Promise<unknown>;
  recordActivity: (input: AutoRetriggerActivityInput) => Promise<void>;
};

export async function retriggerCEOParentIssueAfterReviewerAcceptance(input: {
  childIssue: AutoRetriggerIssueRecord;
  reviewerRunId: string;
  reviewerAgentId: string;
  transitionReason: string | null;
  reviewerVerdict: ReviewerVerdict | null;
}, deps: AutoRetriggerDeps) {
  if (
    input.transitionReason !== "reviewer_accepted" ||
    input.reviewerVerdict !== "accepted"
  ) {
    return null;
  }

  const parentId = input.childIssue.parentId;
  if (!parentId) return null;

  const parentIssue = await deps.getIssueById(parentId);
  if (!parentIssue || parentIssue.companyId !== input.childIssue.companyId) {
    return null;
  }

  const parentStatus = readNonEmptyString(parentIssue.status)?.toLowerCase();
  if (!parentStatus || CLOSED_ISSUE_STATUSES.has(parentStatus)) {
    return null;
  }

  const parentAssigneeAgentId = parentIssue.assigneeAgentId;
  if (!parentAssigneeAgentId) return null;

  const parentAssignee = await deps.getAgentById(parentAssigneeAgentId);
  if (!parentAssignee || parentAssignee.companyId !== parentIssue.companyId) {
    return null;
  }

  const roleTemplateResolution = resolveAssignedRoleTemplate(
    parentAssignee.adapterConfig,
  );
  if (roleTemplateResolution.assigned?.template.id !== "ceo") {
    return null;
  }

  const unassigned = await deps.updateIssue(parentIssue.id, {
    assigneeAgentId: null,
  });
  if (!unassigned) return null;

  const retriggered = await deps.updateIssue(parentIssue.id, {
    assigneeAgentId: parentAssigneeAgentId,
  });
  if (!retriggered) return null;

  const wakeupResult = await deps.wakeup(parentAssigneeAgentId, {
    source: "automation",
    triggerDetail: "system",
    reason: "issue_assigned",
    payload: {
      issueId: retriggered.id,
      childIssueId: input.childIssue.id,
      mutation: "retrigger",
    },
    requestedByActorType: "agent",
    requestedByActorId: input.reviewerAgentId,
    contextSnapshot: {
      issueId: retriggered.id,
      source: "issue.auto_retrigger",
      parentIssueId: retriggered.id,
      childIssueId: input.childIssue.id,
      wakeReason: "issue_assigned",
    },
  });

  await deps.recordActivity({
    companyId: retriggered.companyId,
    actorType: "agent",
    actorId: input.reviewerAgentId,
    agentId: input.reviewerAgentId,
    runId: input.reviewerRunId,
    action: "issue.auto_retriggered",
    entityType: "issue",
    entityId: retriggered.id,
    details: {
      identifier: retriggered.identifier,
      childIssueId: input.childIssue.id,
      parentIssueId: retriggered.id,
      parentAssigneeAgentId,
      roleTemplateId: roleTemplateResolution.assigned?.template.id ?? null,
      wakeupQueued: wakeupResult != null,
      _previous: {
        assigneeAgentId: unassigned.assigneeAgentId,
      },
    },
  });

  return {
    parentIssue: retriggered,
    parentAssigneeAgentId,
    wakeupQueued: wakeupResult != null,
  };
}

export function shouldPromoteDeferredIssueExecution(
  issueStatus: string | null | undefined,
) {
  const normalized = readNonEmptyString(issueStatus)?.toLowerCase();
  return normalized == null || !CLOSED_ISSUE_STATUSES.has(normalized);
}
