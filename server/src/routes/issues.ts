import { Router, type Request, type Response } from "express";
import multer from "multer";
import type { Db } from "@paperclipai/db";
import { z } from "zod";
import {
  addIssueCommentSchema,
  createIssueAttachmentMetadataSchema,
  createIssueLabelSchema,
  checkoutIssueSchema,
  createIssueSchema,
  linkIssueApprovalSchema,
  submitReviewerVerdictSchema,
  submitWorkerDoneSchema,
  issueDocumentKeySchema,
  upsertIssueDocumentSchema,
  updateIssueSchema,
} from "@paperclipai/shared";
import type { StorageService } from "../storage/types.js";
import { validate } from "../middleware/validate.js";
import {
  activityService,
  accessService,
  agentService,
  ceoService,
  goalService,
  heartbeatService,
  githubPrService,
  issueApprovalService,
  issueService,
  documentService,
  logActivity,
  projectService,
} from "../services/index.js";
import { logger } from "../middleware/logger.js";
import { forbidden, HttpError, unauthorized } from "../errors.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { shouldWakeAssigneeOnCheckout } from "./issues-checkout-wakeup.js";
import { isAllowedContentType, MAX_ATTACHMENT_BYTES } from "../attachment-types.js";
import { resolveIssueExecutionPacketTruth } from "../services/issue-execution-packet.js";
import { summarizeHeartbeatRunResultJson } from "../services/heartbeat-run-summary.js";

const MAX_ISSUE_COMMENT_LIMIT = 500;
const WORKER_BRANCH_PREFIX = "dgdh/issue-";
const REQUIRED_PR_BODY_SECTIONS = [
  "Goal",
  "Result",
  "Files Changed",
  "Blockers",
  "Next",
] as const;

const createWorkerPullRequestSchema = z
  .object({
    owner: z.string().trim().min(1).max(120).optional(),
    repo: z.string().trim().min(1).max(200).optional(),
    branch: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(300),
    body: z.string().trim().min(1).max(20_000),
    base: z.string().trim().min(1).max(200).optional(),
    draft: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.branch.toLowerCase().startsWith(WORKER_BRANCH_PREFIX)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branch"],
        message: `branch must start with ${WORKER_BRANCH_PREFIX}`,
      });
    }

    const body = value.body;
    for (const section of REQUIRED_PR_BODY_SECTIONS) {
      if (new RegExp(`(^|\\n)\\s*${section}\\s*:`, "i").test(body)) continue;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: `body must include section: ${section}:`,
      });
    }
  });

const mergeIssuePullRequestSchema = z.object({
  prNumber: z.number().int().positive(),
});

export function issueRoutes(db: Db, storage: StorageService) {
  const router = Router();
  const svc = issueService(db);
  const activitySvc = activityService(db);
  const access = accessService(db);
  const heartbeat = heartbeatService(db);
  const agentsSvc = agentService(db);
  const projectsSvc = projectService(db);
  const goalsSvc = goalService(db);
  const githubPrSvc = githubPrService();
  const ceoSvc = ceoService(db);
  const issueApprovalsSvc = issueApprovalService(db);
  const documentsSvc = documentService(db);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
  });

  function withContentPath<T extends { id: string }>(attachment: T) {
    return {
      ...attachment,
      contentPath: `/api/attachments/${attachment.id}/content`,
    };
  }

  async function runSingleFileUpload(req: Request, res: Response) {
    await new Promise<void>((resolve, reject) => {
      upload.single("file")(req, res, (err: unknown) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async function assertCanManageIssueApprovalLinks(req: Request, res: Response, companyId: string) {
    assertCompanyAccess(req, companyId);
    if (req.actor.type === "board") return true;
    if (!req.actor.agentId) {
      res.status(403).json({ error: "Agent authentication required" });
      return false;
    }
    const actorAgent = await agentsSvc.getById(req.actor.agentId);
    if (!actorAgent || actorAgent.companyId !== companyId) {
      res.status(403).json({ error: "Forbidden" });
      return false;
    }
    if (actorAgent.role === "ceo" || Boolean(actorAgent.permissions?.canCreateAgents)) return true;
    res.status(403).json({ error: "Missing permission to link approvals" });
    return false;
  }

  function canCreateAgentsLegacy(agent: { permissions: Record<string, unknown> | null | undefined; role: string }) {
    if (agent.role === "ceo") return true;
    if (!agent.permissions || typeof agent.permissions !== "object") return false;
    return Boolean((agent.permissions as Record<string, unknown>).canCreateAgents);
  }

  function hasRoleTemplateLegacy(
    agent: { adapterConfig: Record<string, unknown> | null | undefined },
    expectedRoleTemplateId: string,
  ) {
    if (!agent.adapterConfig || typeof agent.adapterConfig !== "object") return false;
    const raw = (agent.adapterConfig as Record<string, unknown>).roleTemplateId;
    return typeof raw === "string" && raw.trim().toLowerCase() === expectedRoleTemplateId;
  }

  async function assertCanAssignTasks(req: Request, companyId: string) {
    assertCompanyAccess(req, companyId);
    if (req.actor.type === "board") {
      if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) return;
      const allowed = await access.canUser(companyId, req.actor.userId, "tasks:assign");
      if (!allowed) throw forbidden("Missing permission: tasks:assign");
      return;
    }
    if (req.actor.type === "agent") {
      if (!req.actor.agentId) throw forbidden("Agent authentication required");
      const allowedByGrant = await access.hasPermission(companyId, "agent", req.actor.agentId, "tasks:assign");
      if (allowedByGrant) return;
      const actorAgent = await agentsSvc.getById(req.actor.agentId);
      if (
        actorAgent &&
        actorAgent.companyId === companyId &&
        (canCreateAgentsLegacy(actorAgent) || hasRoleTemplateLegacy(actorAgent, "ceo"))
      ) {
        return;
      }
      throw forbidden("Missing permission: tasks:assign");
    }
    throw unauthorized();
  }

  function requireAgentRunId(req: Request, res: Response) {
    if (req.actor.type !== "agent") return null;
    const runId = req.actor.runId?.trim();
    if (runId) return runId;
    res.status(401).json({ error: "Agent run id required" });
    return null;
  }

  async function resolvePersistedActivityRunId(
    actorRunId: string | null | undefined,
  ): Promise<string | null> {
    const runId = actorRunId?.trim();
    if (!runId) return null;
    const parsed = z.string().uuid().safeParse(runId);
    if (!parsed.success) return null;
    const run = await heartbeat.getRun(parsed.data).catch(() => null);
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

  function asDetailsRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  function readNonEmptyString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  function readStageDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value !== "string") return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function issueCompletedAt(issue: { completedAt?: Date | null; status: string }) {
    return issue.status === "done" || issue.status === "merged"
      ? readStageDate(issue.completedAt ?? null)
      : null;
  }

  function isReviewerAgent(
    agentById: Map<string, Awaited<ReturnType<typeof agentsSvc.list>>[number]>,
    agentId: string | null | undefined,
  ) {
    if (!agentId) return false;
    const agent = agentById.get(agentId);
    if (!agent) return false;
    return agent.role.toLowerCase() === "reviewer" || hasRoleTemplateLegacy(agent, "reviewer");
  }

  function stageShape(input: {
    key: "assigned" | "run_started" | "worker_done" | "reviewer_assigned" | "reviewer_run" | "merged" | "parent_done";
    label: string;
    at?: Date | null;
    agentId?: string | null;
    agentName?: string | null;
    runId?: string | null;
    note?: string | null;
  }) {
    return {
      key: input.key,
      label: input.label,
      completed: Boolean(input.at),
      at: input.at ?? null,
      agentId: input.agentId ?? null,
      agentName: input.agentName ?? null,
      runId: input.runId ?? null,
      note: input.note ?? null,
    };
  }

  function buildCompanyRunChainParentBlocker(
    runs: Awaited<ReturnType<typeof activitySvc.runsForIssue>>,
  ) {
    const orderedRuns = [...runs].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
    const blockedRun = orderedRuns.find((run) => {
      const resultJson = asDetailsRecord(run.resultJson);
      return (
        readNonEmptyString(run.errorCode) === "post_tool_capacity_exhausted" ||
        readNonEmptyString(resultJson?.type) === "post_tool_capacity_exhausted"
      );
    });
    if (!blockedRun) return null;

    const blockedResultJson = asDetailsRecord(blockedRun.resultJson);
    const blockedSummary = summarizeHeartbeatRunResultJson(blockedResultJson);
    const deferredState = asDetailsRecord(blockedResultJson?.deferredState);
    const resume = asDetailsRecord(blockedResultJson?.resume);
    const blockedCreatedAt = readStageDate(blockedRun.createdAt);
    const blockedSessionId =
      readNonEmptyString(resume?.sessionId) ?? readNonEmptyString(blockedRun.sessionIdAfter);

    const resumedRun = orderedRuns.find((run) => {
      if (run.runId === blockedRun.runId) return false;
      const resumedAt = readStageDate(run.startedAt ?? run.createdAt ?? null);
      if (
        blockedCreatedAt &&
        resumedAt &&
        resumedAt.getTime() <= blockedCreatedAt.getTime()
      ) {
        return false;
      }
      if (!blockedSessionId) return false;
      return readNonEmptyString(run.sessionIdBefore) === blockedSessionId;
    });

    return {
      blockerClass:
        readNonEmptyString(blockedSummary?.blockerClass) ??
        readNonEmptyString(blockedRun.errorCode) ??
        readNonEmptyString(blockedResultJson?.type),
      blockerState:
        readNonEmptyString(blockedSummary?.blockerState) ??
        readNonEmptyString(deferredState?.state) ??
        readNonEmptyString(blockedResultJson?.status),
      summary:
        readNonEmptyString(blockedSummary?.summary) ??
        readNonEmptyString(blockedSummary?.message) ??
        readNonEmptyString(blockedRun.status),
      knownBlocker: blockedSummary?.knownBlocker === true,
      nextResumePoint:
        readNonEmptyString(blockedSummary?.nextResumePoint) ??
        readNonEmptyString(deferredState?.nextResumePoint),
      nextWakeStatus:
        readNonEmptyString(blockedSummary?.nextWakeStatus) ??
        readNonEmptyString(resume?.nextWakeStatus),
      nextWakeNotBefore: readStageDate(
        blockedSummary?.nextWakeNotBefore ?? resume?.nextWakeNotBefore ?? null,
      ),
      resumeStrategy: readNonEmptyString(resume?.strategy),
      resumeSource: resumedRun
        ? resumedRun.invocationSource === "automation"
          ? "scheduler"
          : resumedRun.invocationSource
        : readNonEmptyString(resume?.nextWakeStatus)
          ? "scheduler"
          : null,
      resumeRunId: resumedRun?.runId ?? null,
      resumeRunStatus: resumedRun?.status ?? null,
      resumeAt: readStageDate(resumedRun?.startedAt ?? resumedRun?.createdAt ?? null),
      sameSessionPath: Boolean(
        blockedSessionId &&
          resumedRun &&
          readNonEmptyString(resumedRun.sessionIdBefore) === blockedSessionId,
      ),
    };
  }

  function buildIssueContextSnapshot(
    issue: {
      id: string;
      companyId: string;
      projectId?: string | null;
      goalId?: string | null;
      parentId?: string | null;
      identifier?: string | null;
      title?: string | null;
      description?: string | null;
    },
    source: string,
    extras?: Record<string, unknown>,
  ) {
    const executionPacketTruth = resolveIssueExecutionPacketTruth({
      title: issue.title ?? null,
      description: issue.description ?? null,
    });
    return {
      issueId: issue.id,
      taskId: issue.id,
      taskKey: issue.identifier ?? issue.id,
      workPacketId: issue.id,
      companyId: issue.companyId,
      projectId: issue.projectId ?? null,
      goalId: issue.goalId ?? null,
      parentId: issue.parentId ?? null,
      issueIdentifier: issue.identifier ?? null,
      packetType: executionPacketTruth.packetType,
      executionIntent: executionPacketTruth.executionIntent,
      reviewPolicy: executionPacketTruth.reviewPolicy,
      needsReview: executionPacketTruth.needsReview,
      targetFile: executionPacketTruth.targetFile,
      targetFolder: executionPacketTruth.targetFolder,
      doneWhen: executionPacketTruth.doneWhen,
      artifactKind: executionPacketTruth.artifactKind,
      executionHeavy: executionPacketTruth.executionHeavy,
      packetReadinessStatus: executionPacketTruth.status,
      packetReadinessReasonCodes: executionPacketTruth.reasonCodes,
      issueExecutionPacketTruth: executionPacketTruth,
      source,
      ...(extras ?? {}),
    };
  }

  function withIssueExecutionPacketTruth<T extends { title: string; description?: string | null }>(
    issue: T,
  ) {
    return {
      ...issue,
      executionPacketTruth: resolveIssueExecutionPacketTruth({
        title: issue.title,
        description: issue.description ?? null,
      }),
    };
  }

  function getIssueExecutionPacketBlock(issue: {
    title: string;
    description?: string | null;
  }) {
    const truth = resolveIssueExecutionPacketTruth({
      title: issue.title,
      description: issue.description ?? null,
    });
    return truth.executionHeavy && !truth.ready ? truth : null;
  }

  async function assertAgentRunCheckoutOwnership(
    req: Request,
    res: Response,
    issue: { id: string; companyId: string; status: string; assigneeAgentId: string | null },
  ) {
    if (req.actor.type !== "agent") return true;
    const actorAgentId = req.actor.agentId;
    if (!actorAgentId) {
      res.status(403).json({ error: "Agent authentication required" });
      return false;
    }
    if (issue.status !== "in_progress" || issue.assigneeAgentId !== actorAgentId) {
      return true;
    }
    const runId = requireAgentRunId(req, res);
    if (!runId) return false;
    const ownership = await svc.assertCheckoutOwner(issue.id, actorAgentId, runId);
    if (ownership.adoptedFromRunId) {
      const actor = getActorInfo(req);
      const activityRunId = await resolvePersistedActivityRunId(actor.runId);
      await logActivity(db, {
        companyId: issue.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: activityRunId,
        action: "issue.checkout_lock_adopted",
        entityType: "issue",
        entityId: issue.id,
        details: withApiRunIdFallbackDetails(
          {
            previousCheckoutRunId: ownership.adoptedFromRunId,
            checkoutRunId: runId,
            reason: "stale_checkout_run",
          },
          actor.runId,
          activityRunId,
        ),
      });
    }
    return true;
  }

  async function normalizeIssueIdentifier(rawId: string): Promise<string> {
    if (/^[A-Z]+-\d+$/i.test(rawId)) {
      const issue = await svc.getByIdentifier(rawId);
      if (issue) {
        return issue.id;
      }
    }
    return rawId;
  }

  // Resolve issue identifiers (e.g. "PAP-39") to UUIDs for all /issues/:id routes
  router.param("id", async (req, res, next, rawId) => {
    try {
      req.params.id = await normalizeIssueIdentifier(rawId);
      next();
    } catch (err) {
      next(err);
    }
  });

  // Resolve issue identifiers (e.g. "PAP-39") to UUIDs for company-scoped attachment routes.
  router.param("issueId", async (req, res, next, rawId) => {
    try {
      req.params.issueId = await normalizeIssueIdentifier(rawId);
      next();
    } catch (err) {
      next(err);
    }
  });

  // Common malformed path when companyId is empty in "/api/companies/{companyId}/issues".
  router.get("/issues", (_req, res) => {
    res.status(400).json({
      error: "Missing companyId in path. Use /api/companies/{companyId}/issues.",
    });
  });

  router.get("/companies/:companyId/issues", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const assigneeUserFilterRaw = req.query.assigneeUserId as string | undefined;
    const touchedByUserFilterRaw = req.query.touchedByUserId as string | undefined;
    const unreadForUserFilterRaw = req.query.unreadForUserId as string | undefined;
    const assigneeUserId =
      assigneeUserFilterRaw === "me" && req.actor.type === "board"
        ? req.actor.userId
        : assigneeUserFilterRaw;
    const touchedByUserId =
      touchedByUserFilterRaw === "me" && req.actor.type === "board"
        ? req.actor.userId
        : touchedByUserFilterRaw;
    const unreadForUserId =
      unreadForUserFilterRaw === "me" && req.actor.type === "board"
        ? req.actor.userId
        : unreadForUserFilterRaw;

    if (assigneeUserFilterRaw === "me" && (!assigneeUserId || req.actor.type !== "board")) {
      res.status(403).json({ error: "assigneeUserId=me requires board authentication" });
      return;
    }
    if (touchedByUserFilterRaw === "me" && (!touchedByUserId || req.actor.type !== "board")) {
      res.status(403).json({ error: "touchedByUserId=me requires board authentication" });
      return;
    }
    if (unreadForUserFilterRaw === "me" && (!unreadForUserId || req.actor.type !== "board")) {
      res.status(403).json({ error: "unreadForUserId=me requires board authentication" });
      return;
    }

    const result = await svc.list(companyId, {
      status: req.query.status as string | undefined,
      assigneeAgentId: req.query.assigneeAgentId as string | undefined,
      assigneeUserId,
      touchedByUserId,
      unreadForUserId,
      projectId: req.query.projectId as string | undefined,
      parentId: req.query.parentId as string | undefined,
      labelId: req.query.labelId as string | undefined,
      q: req.query.q as string | undefined,
    });
    res.json(result);
  });

  router.get("/companies/:companyId/labels", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.listLabels(companyId);
    res.json(result);
  });

  router.post("/companies/:companyId/labels", validate(createIssueLabelSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const label = await svc.createLabel(companyId, req.body);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "label.created",
      entityType: "label",
      entityId: label.id,
      details: { name: label.name, color: label.color },
    });
    res.status(201).json(label);
  });

  router.delete("/labels/:labelId", async (req, res) => {
    const labelId = req.params.labelId as string;
    const existing = await svc.getLabelById(labelId);
    if (!existing) {
      res.status(404).json({ error: "Label not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const removed = await svc.deleteLabel(labelId);
    if (!removed) {
      res.status(404).json({ error: "Label not found" });
      return;
    }
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: removed.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "label.deleted",
      entityType: "label",
      entityId: removed.id,
      details: { name: removed.name, color: removed.color },
    });
    res.json(removed);
  });

  router.get("/issues/:id", async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    const [ancestors, project, goal, mentionedProjectIds, documentPayload] = await Promise.all([
      svc.getAncestors(issue.id),
      issue.projectId ? projectsSvc.getById(issue.projectId) : null,
      issue.goalId
        ? goalsSvc.getById(issue.goalId)
        : !issue.projectId
          ? goalsSvc.getDefaultCompanyGoal(issue.companyId)
          : null,
      svc.findMentionedProjectIds(issue.id),
      documentsSvc.getIssueDocumentPayload(issue),
    ]);
    const mentionedProjects = mentionedProjectIds.length > 0
      ? await projectsSvc.listByIds(issue.companyId, mentionedProjectIds)
      : [];
    res.json({
      ...withIssueExecutionPacketTruth(issue),
      goalId: goal?.id ?? issue.goalId,
      ancestors,
      ...documentPayload,
      project: project ?? null,
      goal: goal ?? null,
      mentionedProjects,
    });
  });

  router.get("/issues/:id/heartbeat-context", async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);

    const wakeCommentId =
      typeof req.query.wakeCommentId === "string" && req.query.wakeCommentId.trim().length > 0
        ? req.query.wakeCommentId.trim()
        : null;

    const [ancestors, project, goal, commentCursor, wakeComment] = await Promise.all([
      svc.getAncestors(issue.id),
      issue.projectId ? projectsSvc.getById(issue.projectId) : null,
      issue.goalId
        ? goalsSvc.getById(issue.goalId)
        : !issue.projectId
          ? goalsSvc.getDefaultCompanyGoal(issue.companyId)
          : null,
      svc.getCommentCursor(issue.id),
      wakeCommentId ? svc.getComment(wakeCommentId) : null,
    ]);

    res.json({
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        projectId: issue.projectId,
        goalId: goal?.id ?? issue.goalId,
        parentId: issue.parentId,
        assigneeAgentId: issue.assigneeAgentId,
        assigneeUserId: issue.assigneeUserId,
        updatedAt: issue.updatedAt,
        executionPacketTruth: resolveIssueExecutionPacketTruth({
          title: issue.title,
          description: issue.description ?? null,
        }),
      },
      ancestors: ancestors.map((ancestor) => ({
        id: ancestor.id,
        identifier: ancestor.identifier,
        title: ancestor.title,
        status: ancestor.status,
        priority: ancestor.priority,
      })),
      project: project
        ? {
            id: project.id,
            name: project.name,
            status: project.status,
            targetDate: project.targetDate,
          }
        : null,
      goal: goal
        ? {
            id: goal.id,
            title: goal.title,
            status: goal.status,
            level: goal.level,
            parentId: goal.parentId,
          }
        : null,
      commentCursor,
      wakeComment:
        wakeComment && wakeComment.issueId === issue.id
          ? wakeComment
          : null,
    });
  });

  router.get("/issues/:id/documents", async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    const docs = await documentsSvc.listIssueDocuments(issue.id);
    res.json(docs);
  });

  router.get("/issues/:id/documents/:key", async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    const keyParsed = issueDocumentKeySchema.safeParse(String(req.params.key ?? "").trim().toLowerCase());
    if (!keyParsed.success) {
      res.status(400).json({ error: "Invalid document key", details: keyParsed.error.issues });
      return;
    }
    const doc = await documentsSvc.getIssueDocumentByKey(issue.id, keyParsed.data);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json(doc);
  });

  router.put("/issues/:id/documents/:key", validate(upsertIssueDocumentSchema), async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    const keyParsed = issueDocumentKeySchema.safeParse(String(req.params.key ?? "").trim().toLowerCase());
    if (!keyParsed.success) {
      res.status(400).json({ error: "Invalid document key", details: keyParsed.error.issues });
      return;
    }

    const actor = getActorInfo(req);
    const result = await documentsSvc.upsertIssueDocument({
      issueId: issue.id,
      key: keyParsed.data,
      title: req.body.title ?? null,
      format: req.body.format,
      body: req.body.body,
      changeSummary: req.body.changeSummary ?? null,
      baseRevisionId: req.body.baseRevisionId ?? null,
      createdByAgentId: actor.agentId ?? null,
      createdByUserId: actor.actorType === "user" ? actor.actorId : null,
    });
    const doc = result.document;

    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: result.created ? "issue.document_created" : "issue.document_updated",
      entityType: "issue",
      entityId: issue.id,
      details: {
        key: doc.key,
        documentId: doc.id,
        title: doc.title,
        format: doc.format,
        revisionNumber: doc.latestRevisionNumber,
      },
    });

    res.status(result.created ? 201 : 200).json(doc);
  });

  router.get("/issues/:id/documents/:key/revisions", async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    const keyParsed = issueDocumentKeySchema.safeParse(String(req.params.key ?? "").trim().toLowerCase());
    if (!keyParsed.success) {
      res.status(400).json({ error: "Invalid document key", details: keyParsed.error.issues });
      return;
    }
    const revisions = await documentsSvc.listIssueDocumentRevisions(issue.id, keyParsed.data);
    res.json(revisions);
  });

  router.delete("/issues/:id/documents/:key", async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    if (req.actor.type !== "board") {
      res.status(403).json({ error: "Board authentication required" });
      return;
    }
    const keyParsed = issueDocumentKeySchema.safeParse(String(req.params.key ?? "").trim().toLowerCase());
    if (!keyParsed.success) {
      res.status(400).json({ error: "Invalid document key", details: keyParsed.error.issues });
      return;
    }
    const removed = await documentsSvc.deleteIssueDocument(issue.id, keyParsed.data);
    if (!removed) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.document_deleted",
      entityType: "issue",
      entityId: issue.id,
      details: {
        key: removed.key,
        documentId: removed.id,
        title: removed.title,
      },
    });
    res.json({ ok: true });
  });

  router.post("/issues/:id/read", async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    if (req.actor.type !== "board") {
      res.status(403).json({ error: "Board authentication required" });
      return;
    }
    if (!req.actor.userId) {
      res.status(403).json({ error: "Board user context required" });
      return;
    }
    const readState = await svc.markRead(issue.companyId, issue.id, req.actor.userId, new Date());
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.read_marked",
      entityType: "issue",
      entityId: issue.id,
      details: { userId: req.actor.userId, lastReadAt: readState.lastReadAt },
    });
    res.json(readState);
  });

  router.get("/issues/:id/approvals", async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    const approvals = await issueApprovalsSvc.listApprovalsForIssue(id);
    res.json(approvals);
  });

  router.get("/issues/:id/children", async (req, res) => {
    const id = req.params.id as string;
    const parentIssue = await svc.getById(id);
    if (!parentIssue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, parentIssue.companyId);

    const children = await ceoSvc.listChildrenByParentId(parentIssue.id);
    res.json(
      children.sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      ),
    );
  });

  router.get("/issues/:id/company-run-chain", async (req, res) => {
    const id = req.params.id as string;
    const currentIssue = await svc.getById(id);
    if (!currentIssue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, currentIssue.companyId);

    const rootIssue = currentIssue.parentId ? await svc.getById(currentIssue.parentId) : currentIssue;
    if (!rootIssue) {
      res.status(404).json({ error: "Parent issue not found" });
      return;
    }

    const [listedChildren, parentRuns] = await Promise.all([
      ceoSvc.listChildrenByParentId(rootIssue.id),
      activitySvc.runsForIssue(rootIssue.companyId, rootIssue.id),
    ]);
    const childIssues = listedChildren.length > 0
      ? await Promise.all(
          listedChildren.map(async (child) => (await svc.getById(child.id)) ?? child),
        )
      : currentIssue.parentId
        ? [currentIssue]
        : [];

    const companyAgents = await agentsSvc.list(rootIssue.companyId);
    const agentById = new Map(companyAgents.map((agent) => [agent.id, agent]));
    const parentDoneAt = issueCompletedAt(rootIssue);
    const parentBlocker = buildCompanyRunChainParentBlocker(parentRuns);

    const children = await Promise.all(
      childIssues.map(async (child) => {
        const [activity, runs] = await Promise.all([
          activitySvc.forIssue(child.id),
          activitySvc.runsForIssue(rootIssue.companyId, child.id),
        ]);
        const activityAsc = [...activity].sort(
          (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        );
        const runsAsc = [...runs].sort(
          (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        );

        const latestWorkerDone = [...activityAsc]
          .reverse()
          .find((event) => event.action === "issue.worker_done_recorded");
        const latestReviewerVerdict = [...activityAsc]
          .reverse()
          .find((event) => event.action === "issue.reviewer_verdict_recorded");
        const latestWorkerPr = [...activityAsc]
          .reverse()
          .find((event) => event.action === "issue.worker_pull_request_created");

        const workerDoneDetails = asDetailsRecord(latestWorkerDone?.details);
        const reviewerVerdictDetails = asDetailsRecord(latestReviewerVerdict?.details);
        const workerPrDetails = asDetailsRecord(latestWorkerPr?.details);

        const workerAgentId =
          latestWorkerDone?.agentId ??
          runsAsc.find((run) => !isReviewerAgent(agentById, run.agentId))?.agentId ??
          child.assigneeAgentId ??
          null;
        const workerAgent = workerAgentId ? agentById.get(workerAgentId) ?? null : null;
        const reviewerAgentId =
          readNonEmptyString(workerDoneDetails?.reviewerAgentId) ??
          latestReviewerVerdict?.agentId ??
          runsAsc.find((run) => isReviewerAgent(agentById, run.agentId))?.agentId ??
          null;
        const reviewerAgent = reviewerAgentId ? agentById.get(reviewerAgentId) ?? null : null;

        const workerRun = workerAgentId
          ? runsAsc.find((run) => run.agentId === workerAgentId)
          : runsAsc.find((run) => !isReviewerAgent(agentById, run.agentId));
        const reviewerRun = reviewerAgentId
          ? runsAsc.find((run) => run.agentId === reviewerAgentId)
          : runsAsc.find((run) => isReviewerAgent(agentById, run.agentId));

        const assignedAt = workerAgentId ? readStageDate(child.createdAt) : null;
        const workerRunAt = readStageDate(workerRun?.startedAt ?? workerRun?.createdAt ?? null);
        const workerDoneAt = readStageDate(latestWorkerDone?.createdAt ?? null);
        const reviewerAssignedAt = reviewerAgentId ? workerDoneAt : null;
        const reviewerRunAt = readStageDate(reviewerRun?.startedAt ?? reviewerRun?.createdAt ?? null);
        const mergedIssueTimestamps = child as {
          completedAt?: Date | string | null;
          updatedAt?: Date | string | null;
        };
        const mergedAt = child.status === "merged"
          ? readStageDate(
              mergedIssueTimestamps.completedAt ??
              mergedIssueTimestamps.updatedAt ??
              latestWorkerPr?.createdAt ??
              null,
            )
          : null;
        const prNumber = workerPrDetails && typeof workerPrDetails.prNumber === "number"
          ? workerPrDetails.prNumber
          : null;

        return {
          issueId: child.id,
          identifier: child.identifier ?? null,
          title: child.title,
          status: child.status,
          assigneeAgentId: child.assigneeAgentId ?? null,
          assigneeAgentName: child.assigneeAgentId
            ? (agentById.get(child.assigneeAgentId)?.name ?? null)
            : null,
          stages: [
            stageShape({
              key: "assigned",
              label: "assigned",
              at: assignedAt,
              agentId: workerAgentId,
              agentName: workerAgent?.name ?? null,
            }),
            stageShape({
              key: "run_started",
              label: "run started",
              at: workerRunAt,
              agentId: workerAgentId,
              agentName: workerAgent?.name ?? null,
              runId: workerRun?.runId ?? null,
            }),
            stageShape({
              key: "worker_done",
              label: "worker done",
              at: workerDoneAt,
              agentId: workerAgentId,
              agentName: workerAgent?.name ?? null,
              runId: latestWorkerDone?.runId ?? workerRun?.runId ?? null,
              note: readNonEmptyString(workerDoneDetails?.branch),
            }),
            stageShape({
              key: "reviewer_assigned",
              label: "reviewer assigned",
              at: reviewerAssignedAt,
              agentId: reviewerAgentId,
              agentName: reviewerAgent?.name ?? null,
            }),
            stageShape({
              key: "reviewer_run",
              label: "reviewer run",
              at: reviewerRunAt,
              agentId: reviewerAgentId,
              agentName: reviewerAgent?.name ?? null,
              runId: reviewerRun?.runId ?? latestReviewerVerdict?.runId ?? null,
              note: readNonEmptyString(reviewerVerdictDetails?.verdict),
            }),
            stageShape({
              key: "merged",
              label: "merged",
              at: mergedAt,
              note: prNumber ? `PR #${prNumber}` : readNonEmptyString(workerPrDetails?.prUrl),
            }),
            stageShape({
              key: "parent_done",
              label: "parent done",
              at: parentDoneAt,
              note: rootIssue.identifier ?? rootIssue.id,
            }),
          ],
        };
      }),
    );

    res.json({
      parentIssueId: rootIssue.id,
      parentIdentifier: rootIssue.identifier ?? null,
      parentTitle: rootIssue.title,
      parentStatus: rootIssue.status,
      focusIssueId: currentIssue.parentId ? currentIssue.id : null,
      parentBlocker,
      children,
    });
  });

  router.post(
    "/issues/:id/merge-pr",
    validate(mergeIssuePullRequestSchema),
    async (req, res) => {
      const id = req.params.id as string;
      const issue = await svc.getById(id);
      if (!issue) {
        res.status(404).json({ error: "Issue not found" });
        return;
      }
      assertCompanyAccess(req, issue.companyId);

      let actorAgentId: string | null = null;
      if (req.actor.type === "board") {
        if (!req.actor.userId) {
          res.status(403).json({ error: "Board user context required" });
          return;
        }
      } else if (req.actor.type === "agent") {
        if (!req.actor.agentId) {
          res.status(403).json({ error: "Agent authentication required" });
          return;
        }
        const actorAgent = await agentsSvc.getById(req.actor.agentId);
        if (!actorAgent || actorAgent.companyId !== issue.companyId) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
        const isCeo =
          actorAgent.role.toLowerCase() === "ceo" ||
          hasRoleTemplateLegacy(actorAgent, "ceo");
        if (!isCeo) {
          res.status(403).json({ error: "Only CEO agents can trigger issue merges" });
          return;
        }
        actorAgentId = actorAgent.id;
      } else {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const actor = getActorInfo(req);
      const mergeResult = await ceoSvc.mergeIssuePullRequest({
        issueId: issue.id,
        prNumber: req.body.prNumber,
        requestedBy: {
          actorType: req.actor.type === "board" ? "user" : "agent",
          actorId: actor.actorId,
          agentId: actorAgentId,
          runId: actor.runId,
        },
      });

      if (mergeResult.outcome === "merge_conflict") {
        res.status(409).json({
          issueId: issue.id,
          issueIdentifier: issue.identifier,
          status: "merge_conflict",
          prNumber: mergeResult.prNumber,
          prUrl: mergeResult.prUrl,
          branch: mergeResult.branch,
          message: mergeResult.message,
        });
        return;
      }

      if (mergeResult.outcome === "merge_blocked") {
        res.status(409).json({
          issueId: issue.id,
          issueIdentifier: issue.identifier,
          status: "merge_blocked",
          prNumber: mergeResult.prNumber,
          prUrl: mergeResult.prUrl,
          branch: mergeResult.branch,
          message: mergeResult.message,
          unexpectedFiles: mergeResult.unexpectedFiles,
          missingFiles: mergeResult.missingFiles,
        });
        return;
      }

      res.status(200).json({
        issueId: issue.id,
        issueIdentifier: issue.identifier,
        status: "merged",
        prNumber: mergeResult.prNumber,
        prUrl: mergeResult.prUrl,
        branch: mergeResult.branch,
        cleanupWarnings: mergeResult.cleanupWarnings ?? [],
      });
    },
  );

  router.post(
    "/issues/:id/worker-pr",
    validate(createWorkerPullRequestSchema),
    async (req, res) => {
      const id = req.params.id as string;
      const issue = await svc.getById(id);
      if (!issue) {
        res.status(404).json({ error: "Issue not found" });
        return;
      }
      assertCompanyAccess(req, issue.companyId);

      if (req.actor.type !== "agent" || !req.actor.agentId) {
        res.status(403).json({ error: "Worker agent authentication required" });
        return;
      }

      const workerRunId = requireAgentRunId(req, res);
      if (!workerRunId) return;

      const workerAgent = await agentsSvc.getById(req.actor.agentId);
      if (!workerAgent || workerAgent.companyId !== issue.companyId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const isWorker =
        workerAgent.role.toLowerCase() === "worker" ||
        hasRoleTemplateLegacy(workerAgent, "worker");
      if (!isWorker) {
        res.status(403).json({ error: "Only worker agents can create worker PR handoffs" });
        return;
      }

      if (issue.status === "done" || issue.status === "cancelled") {
        res.status(409).json({ error: `Cannot create worker PR for ${issue.status} issues` });
        return;
      }

      if (!issue.assigneeAgentId || issue.assigneeAgentId !== workerAgent.id) {
        res.status(409).json({ error: "Issue must be assigned to the submitting worker" });
        return;
      }

      if (!(await assertAgentRunCheckoutOwnership(req, res, issue))) return;

      const createdPr = await githubPrSvc.createGitHubPR({
        owner: req.body.owner ?? null,
        repo: req.body.repo ?? null,
        branch: req.body.branch,
        title: req.body.title,
        body: req.body.body,
        base: req.body.base ?? null,
        draft: req.body.draft ?? false,
      });

      const actor = getActorInfo(req);
      const activityRunId = await resolvePersistedActivityRunId(actor.runId);
      await logActivity(db, {
        companyId: issue.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: activityRunId,
        action: "issue.worker_pull_request_created",
        entityType: "issue",
        entityId: issue.id,
        details: withApiRunIdFallbackDetails(
          {
            identifier: issue.identifier,
            prUrl: createdPr.prUrl,
            prNumber: createdPr.prNumber,
            owner: createdPr.owner,
            repo: createdPr.repo,
            branch: createdPr.branch,
            base: createdPr.base,
            roleTemplateId: "worker",
          },
          actor.runId,
          activityRunId,
        ),
      });

      res.status(201).json({
        issueId: issue.id,
        issueIdentifier: issue.identifier,
        prUrl: createdPr.prUrl,
        prNumber: createdPr.prNumber,
        owner: createdPr.owner,
        repo: createdPr.repo,
        branch: createdPr.branch,
        base: createdPr.base,
        workerRunId,
      });
    },
  );

  router.post(
    "/issues/:id/worker-done",
    validate(submitWorkerDoneSchema),
    async (req, res) => {
      const id = req.params.id as string;
      const issue = await svc.getById(id);
      if (!issue) {
        res.status(404).json({ error: "Issue not found" });
        return;
      }
      assertCompanyAccess(req, issue.companyId);

      if (req.actor.type !== "agent" || !req.actor.agentId) {
        res.status(403).json({ error: "Worker agent authentication required" });
        return;
      }

      const workerRunId = requireAgentRunId(req, res);
      if (!workerRunId) return;

      const workerAgent = await agentsSvc.getById(req.actor.agentId);
      if (!workerAgent || workerAgent.companyId !== issue.companyId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const isWorker =
        workerAgent.role.toLowerCase() === "worker" ||
        hasRoleTemplateLegacy(workerAgent, "worker");
      if (!isWorker) {
        res.status(403).json({ error: "Only worker agents can submit worker handoffs" });
        return;
      }

      if (issue.status === "done" || issue.status === "cancelled") {
        res.status(409).json({ error: `Cannot record worker handoff for ${issue.status} issues` });
        return;
      }

      if (!issue.assigneeAgentId || issue.assigneeAgentId !== workerAgent.id) {
        res.status(409).json({ error: "Issue must be assigned to the submitting worker" });
        return;
      }

      if (!(await assertAgentRunCheckoutOwnership(req, res, issue))) return;

      const actor = getActorInfo(req);
      const activityRunId = await resolvePersistedActivityRunId(actor.runId);
      const companyAgents = await agentsSvc.list(issue.companyId);
      const reviewerAgent =
        companyAgents.find(
          (agent) =>
            agent.id !== workerAgent.id &&
            agent.status === "idle" &&
            (
              agent.role.toLowerCase() === "reviewer" ||
              hasRoleTemplateLegacy(agent, "reviewer")
            ),
        ) ??
        null;

      const updatedIssue = await db.transaction(async (tx) => {
        const txIssueSvc = issueService(tx as unknown as Db);
        const nextIssue = await txIssueSvc.update(issue.id, {
          status: "in_review",
          assigneeAgentId: reviewerAgent?.id ?? issue.assigneeAgentId,
        });
        if (!nextIssue) return null;

        await logActivity(tx as unknown as Db, {
          companyId: nextIssue.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          runId: activityRunId,
          action: "issue.worker_done_recorded",
          entityType: "issue",
          entityId: nextIssue.id,
          details: withApiRunIdFallbackDetails(
            {
              identifier: nextIssue.identifier,
              autoTransition: true,
              transitionReason: "worker_done_handoff",
              roleTemplateId: "worker",
              prUrl: req.body.prUrl,
              branch: req.body.branch,
              commitHash: req.body.commitHash,
              summary: req.body.summary,
              reviewerAgentId: reviewerAgent?.id ?? null,
              _previous: {
                status: issue.status,
                assigneeAgentId: issue.assigneeAgentId,
              },
            },
            actor.runId,
            activityRunId,
          ),
        });
        return nextIssue;
      });
      if (!updatedIssue) {
        res.status(404).json({ error: "Issue not found" });
        return;
      }

      let reviewerWakeQueued = false;
      if (reviewerAgent) {
        try {
          await heartbeat.wakeup(reviewerAgent.id, {
            source: "assignment",
            triggerDetail: "system",
            reason: "issue_assigned",
            payload: {
              issueId: updatedIssue.id,
              mutation: "worker_done_handoff",
            },
            requestedByActorType: actor.actorType,
            requestedByActorId: actor.actorId,
            contextSnapshot: buildIssueContextSnapshot(updatedIssue, "issue.worker_done", {
              wakeReason: "issue_assigned",
              workerRunId,
            }),
          });
          reviewerWakeQueued = true;
        } catch (err) {
          logger.warn(
            { err, issueId: updatedIssue.id, reviewerAgentId: reviewerAgent.id },
            "failed to wake reviewer on worker handoff",
          );
        }
      }

      res.status(200).json({
        issueId: updatedIssue.id,
        issueIdentifier: updatedIssue.identifier,
        status: updatedIssue.status,
        handoff: req.body,
        workerRunId,
        reviewerAgentId: reviewerAgent?.id ?? null,
        reviewerWakeQueued,
      });
    },
  );

  router.post(
    "/issues/:id/reviewer-verdict",
    validate(submitReviewerVerdictSchema),
    async (req, res) => {
      const id = req.params.id as string;
      const issue = await svc.getById(id);
      if (!issue) {
        res.status(404).json({ error: "Issue not found" });
        return;
      }
      assertCompanyAccess(req, issue.companyId);

      if (req.actor.type !== "agent" || !req.actor.agentId) {
        res.status(403).json({ error: "Reviewer agent authentication required" });
        return;
      }

      const reviewerAgent = await agentsSvc.getById(req.actor.agentId);
      if (!reviewerAgent || reviewerAgent.companyId !== issue.companyId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const isReviewer =
        reviewerAgent.role.toLowerCase() === "reviewer" ||
        hasRoleTemplateLegacy(reviewerAgent, "reviewer");
      if (!isReviewer) {
        res.status(403).json({ error: "Only reviewer agents can submit reviewer verdicts" });
        return;
      }

      const actor = getActorInfo(req);
      const activityRunId = await resolvePersistedActivityRunId(actor.runId);
      const reviewerRunId = req.actor.runId ?? null;
      const { approval, issueStatusAfterVerdict } = await db.transaction(async (tx) => {
        const txIssueSvc = issueService(tx as unknown as Db);
        const txIssueApprovalsSvc = issueApprovalService(tx as unknown as Db);
        const approvalRecord = await txIssueApprovalsSvc.recordReviewerVerdictForIssue({
          issueId: id,
          reviewerAgentId: reviewerAgent.id,
          reviewerRunId,
          verdict: req.body.verdict,
          packet: req.body.packet ?? null,
          doneWhenCheck: req.body.doneWhenCheck ?? null,
          evidence: req.body.evidence ?? null,
          requiredFixes: req.body.requiredFixes,
          next: req.body.next ?? null,
        });

        await logActivity(tx as unknown as Db, {
          companyId: issue.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          runId: activityRunId,
          action: "issue.reviewer_verdict_recorded",
          entityType: "issue",
          entityId: issue.id,
          details: withApiRunIdFallbackDetails(
            {
              identifier: issue.identifier,
              verdict: req.body.verdict,
              approvalId: approvalRecord.id,
              approvalStatus: approvalRecord.status,
              requiredFixesCount: (req.body.requiredFixes ?? []).length,
            },
            actor.runId,
            activityRunId,
          ),
        });

        let nextIssueStatus = issue.status;
        if (req.body.verdict === "accepted") {
          const updatedIssue = await txIssueSvc.update(issue.id, {
            status: "reviewer_accepted",
          });
          if (updatedIssue) {
            nextIssueStatus = updatedIssue.status;
            await logActivity(tx as unknown as Db, {
              companyId: issue.companyId,
              actorType: actor.actorType,
              actorId: actor.actorId,
              agentId: actor.agentId,
              runId: activityRunId,
              action: "issue.updated",
              entityType: "issue",
              entityId: issue.id,
              details: withApiRunIdFallbackDetails(
                {
                  identifier: issue.identifier,
                  status: updatedIssue.status,
                  autoTransition: true,
                  transitionReason: "reviewer_verdict_accepted",
                  _previous: {
                    status: issue.status,
                  },
                },
                actor.runId,
                activityRunId,
              ),
            });
          }
        }

        return {
          approval: approvalRecord,
          issueStatusAfterVerdict: nextIssueStatus,
        };
      });

      const ceoMerge = await ceoSvc.maybeRunMergeOrchestratorAfterReviewerVerdict({
        childIssueId: issue.id,
        reviewerVerdict: req.body.verdict,
        reviewerAgentId: reviewerAgent.id,
        reviewerRunId,
      });

      res.status(200).json({
        issueId: issue.id,
        issueIdentifier: issue.identifier,
        issueStatus: issueStatusAfterVerdict,
        verdict: req.body.verdict,
        approval,
        ceoMerge,
      });
    },
  );

  router.post("/issues/:id/approvals", validate(linkIssueApprovalSchema), async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    if (!(await assertCanManageIssueApprovalLinks(req, res, issue.companyId))) return;

    const actor = getActorInfo(req);
    await issueApprovalsSvc.link(id, req.body.approvalId, {
      agentId: actor.agentId,
      userId: actor.actorType === "user" ? actor.actorId : null,
    });

    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.approval_linked",
      entityType: "issue",
      entityId: issue.id,
      details: { approvalId: req.body.approvalId },
    });

    const approvals = await issueApprovalsSvc.listApprovalsForIssue(id);
    res.status(201).json(approvals);
  });

  router.delete("/issues/:id/approvals/:approvalId", async (req, res) => {
    const id = req.params.id as string;
    const approvalId = req.params.approvalId as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    if (!(await assertCanManageIssueApprovalLinks(req, res, issue.companyId))) return;

    await issueApprovalsSvc.unlink(id, approvalId);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.approval_unlinked",
      entityType: "issue",
      entityId: issue.id,
      details: { approvalId },
    });

    res.json({ ok: true });
  });

  router.post("/companies/:companyId/issues", validate(createIssueSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (req.body.assigneeAgentId || req.body.assigneeUserId) {
      await assertCanAssignTasks(req, companyId);
    }

    const actor = getActorInfo(req);
    const issue = await svc.create(companyId, {
      ...req.body,
      createdByAgentId: actor.agentId,
      createdByUserId: actor.actorType === "user" ? actor.actorId : null,
    });

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.created",
      entityType: "issue",
      entityId: issue.id,
      details: { title: issue.title, identifier: issue.identifier },
    });

    const createWakeupBlock = getIssueExecutionPacketBlock(issue);

    if (issue.assigneeAgentId && issue.status !== "backlog") {
      if (createWakeupBlock) {
        await logActivity(db, {
          companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          runId: actor.runId,
          action: "issue.execution_packet_not_ready",
          entityType: "issue",
          entityId: issue.id,
          details: {
            identifier: issue.identifier,
            reasonCodes: createWakeupBlock.reasonCodes,
            targetFile: createWakeupBlock.targetFile,
            targetFolder: createWakeupBlock.targetFolder,
            artifactKind: createWakeupBlock.artifactKind,
            doneWhen: createWakeupBlock.doneWhen,
            source: "issue.create",
          },
        });
      } else {
        void heartbeat
          .wakeup(issue.assigneeAgentId, {
            source: "assignment",
            triggerDetail: "system",
            reason: "issue_assigned",
            payload: { issueId: issue.id, mutation: "create" },
            requestedByActorType: actor.actorType,
            requestedByActorId: actor.actorId,
            contextSnapshot: buildIssueContextSnapshot(issue, "issue.create"),
          })
          .catch((err) => logger.warn({ err, issueId: issue.id }, "failed to wake assignee on issue create"));
      }
    }

    res.status(201).json(withIssueExecutionPacketTruth(issue));
  });

  router.patch("/issues/:id", validate(updateIssueSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const assigneeWillChange =
      (req.body.assigneeAgentId !== undefined && req.body.assigneeAgentId !== existing.assigneeAgentId) ||
      (req.body.assigneeUserId !== undefined && req.body.assigneeUserId !== existing.assigneeUserId);

    const isAgentReturningIssueToCreator =
      req.actor.type === "agent" &&
      !!req.actor.agentId &&
      existing.assigneeAgentId === req.actor.agentId &&
      req.body.assigneeAgentId === null &&
      typeof req.body.assigneeUserId === "string" &&
      !!existing.createdByUserId &&
      req.body.assigneeUserId === existing.createdByUserId;

    if (assigneeWillChange) {
      if (!isAgentReturningIssueToCreator) {
        await assertCanAssignTasks(req, existing.companyId);
      }
    }
    if (!(await assertAgentRunCheckoutOwnership(req, res, existing))) return;

    const { comment: commentBody, hiddenAt: hiddenAtRaw, ...updateFields } = req.body;
    if (hiddenAtRaw !== undefined) {
      updateFields.hiddenAt = hiddenAtRaw ? new Date(hiddenAtRaw) : null;
    }
    let issue;
    try {
      issue = await svc.update(id, updateFields);
    } catch (err) {
      if (err instanceof HttpError && err.status === 422) {
        logger.warn(
          {
            issueId: id,
            companyId: existing.companyId,
            assigneePatch: {
              assigneeAgentId:
                req.body.assigneeAgentId === undefined ? "__omitted__" : req.body.assigneeAgentId,
              assigneeUserId:
                req.body.assigneeUserId === undefined ? "__omitted__" : req.body.assigneeUserId,
            },
            currentAssignee: {
              assigneeAgentId: existing.assigneeAgentId,
              assigneeUserId: existing.assigneeUserId,
            },
            error: err.message,
            details: err.details,
          },
          "issue update rejected with 422",
        );
      }
      throw err;
    }
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    // Build activity details with previous values for changed fields
    const previous: Record<string, unknown> = {};
    for (const key of Object.keys(updateFields)) {
      if (key in existing && (existing as Record<string, unknown>)[key] !== (updateFields as Record<string, unknown>)[key]) {
        previous[key] = (existing as Record<string, unknown>)[key];
      }
    }

    const actor = getActorInfo(req);
    const hasFieldChanges = Object.keys(previous).length > 0;
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.updated",
      entityType: "issue",
      entityId: issue.id,
      details: {
        ...updateFields,
        identifier: issue.identifier,
        ...(commentBody ? { source: "comment" } : {}),
        _previous: hasFieldChanges ? previous : undefined,
      },
    });

    let comment = null;
    if (commentBody) {
      comment = await svc.addComment(id, commentBody, {
        agentId: actor.agentId ?? undefined,
        userId: actor.actorType === "user" ? actor.actorId : undefined,
      });

      await logActivity(db, {
        companyId: issue.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "issue.comment_added",
        entityType: "issue",
        entityId: issue.id,
        details: {
          commentId: comment.id,
          bodySnippet: comment.body.slice(0, 120),
          identifier: issue.identifier,
          issueTitle: issue.title,
          ...(hasFieldChanges ? { updated: true } : {}),
        },
      });

    }

    const assigneeChanged = assigneeWillChange;
    const statusChangedFromBacklog =
      existing.status === "backlog" &&
      issue.status !== "backlog" &&
      req.body.status !== undefined;

    // Merge all wakeups from this update into one enqueue per agent to avoid duplicate runs.
    void (async () => {
      const wakeups = new Map<string, Parameters<typeof heartbeat.wakeup>[1]>();
      const wakeupBlock = getIssueExecutionPacketBlock(issue);

      if (
        wakeupBlock &&
        ((assigneeChanged && issue.assigneeAgentId && issue.status !== "backlog") ||
          (!assigneeChanged && statusChangedFromBacklog && issue.assigneeAgentId))
      ) {
        await logActivity(db, {
          companyId: issue.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          runId: actor.runId,
          action: "issue.execution_packet_not_ready",
          entityType: "issue",
          entityId: issue.id,
          details: {
            identifier: issue.identifier,
            reasonCodes: wakeupBlock.reasonCodes,
            targetFile: wakeupBlock.targetFile,
            targetFolder: wakeupBlock.targetFolder,
            artifactKind: wakeupBlock.artifactKind,
            doneWhen: wakeupBlock.doneWhen,
            source: assigneeChanged ? "issue.update.assignment" : "issue.update.status_change",
          },
        });
      }

      if (!wakeupBlock && assigneeChanged && issue.assigneeAgentId && issue.status !== "backlog") {
        wakeups.set(issue.assigneeAgentId, {
          source: "assignment",
          triggerDetail: "system",
          reason: "issue_assigned",
          payload: { issueId: issue.id, mutation: "update" },
          requestedByActorType: actor.actorType,
          requestedByActorId: actor.actorId,
          contextSnapshot: buildIssueContextSnapshot(issue, "issue.update"),
        });
      }

      if (!wakeupBlock && !assigneeChanged && statusChangedFromBacklog && issue.assigneeAgentId) {
        wakeups.set(issue.assigneeAgentId, {
          source: "automation",
          triggerDetail: "system",
          reason: "issue_status_changed",
          payload: { issueId: issue.id, mutation: "update" },
          requestedByActorType: actor.actorType,
          requestedByActorId: actor.actorId,
          contextSnapshot: buildIssueContextSnapshot(issue, "issue.status_change"),
        });
      }

      if (commentBody && comment) {
        let mentionedIds: string[] = [];
        try {
          mentionedIds = await svc.findMentionedAgents(issue.companyId, commentBody);
        } catch (err) {
          logger.warn({ err, issueId: id }, "failed to resolve @-mentions");
        }

        for (const mentionedId of mentionedIds) {
          if (wakeups.has(mentionedId)) continue;
          if (actor.actorType === "agent" && actor.actorId === mentionedId) continue;
          wakeups.set(mentionedId, {
            source: "automation",
            triggerDetail: "system",
            reason: "issue_comment_mentioned",
            payload: { issueId: id, commentId: comment.id },
            requestedByActorType: actor.actorType,
            requestedByActorId: actor.actorId,
            contextSnapshot: {
              issueId: id,
              taskId: id,
              commentId: comment.id,
              wakeCommentId: comment.id,
              wakeReason: "issue_comment_mentioned",
              source: "comment.mention",
            },
          });
        }
      }

      for (const [agentId, wakeup] of wakeups.entries()) {
        heartbeat
          .wakeup(agentId, wakeup)
          .catch((err) => logger.warn({ err, issueId: issue.id, agentId }, "failed to wake agent on issue update"));
      }
    })();

    res.json({ ...withIssueExecutionPacketTruth(issue), comment });
  });

  router.delete("/issues/:id", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const attachments = await svc.listAttachments(id);

    const issue = await svc.remove(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    for (const attachment of attachments) {
      try {
        await storage.deleteObject(attachment.companyId, attachment.objectKey);
      } catch (err) {
        logger.warn({ err, issueId: id, attachmentId: attachment.id }, "failed to delete attachment object during issue delete");
      }
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.deleted",
      entityType: "issue",
      entityId: issue.id,
    });

    res.json(issue);
  });

  router.post("/issues/:id/checkout", validate(checkoutIssueSchema), async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);

    if (req.actor.type === "agent" && req.actor.agentId !== req.body.agentId) {
      res.status(403).json({ error: "Agent can only checkout as itself" });
      return;
    }

    const checkoutRunId = requireAgentRunId(req, res);
    if (req.actor.type === "agent" && !checkoutRunId) return;
    const updated = await svc.checkout(id, req.body.agentId, req.body.expectedStatuses, checkoutRunId);
    const actor = getActorInfo(req);

    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.checked_out",
      entityType: "issue",
      entityId: issue.id,
      details: { agentId: req.body.agentId },
    });

    if (
      shouldWakeAssigneeOnCheckout({
        actorType: req.actor.type,
        actorAgentId: req.actor.type === "agent" ? req.actor.agentId ?? null : null,
        checkoutAgentId: req.body.agentId,
        checkoutRunId,
      })
    ) {
      void heartbeat
        .wakeup(req.body.agentId, {
          source: "assignment",
          triggerDetail: "system",
          reason: "issue_checked_out",
          payload: { issueId: issue.id, mutation: "checkout" },
          requestedByActorType: actor.actorType,
          requestedByActorId: actor.actorId,
          contextSnapshot: buildIssueContextSnapshot(issue, "issue.checkout"),
        })
        .catch((err) => logger.warn({ err, issueId: issue.id }, "failed to wake assignee on issue checkout"));
    }

    res.json(updated);
  });

  router.post("/issues/:id/release", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    if (!(await assertAgentRunCheckoutOwnership(req, res, existing))) return;
    const actorRunId = requireAgentRunId(req, res);
    if (req.actor.type === "agent" && !actorRunId) return;

    const released = await svc.release(
      id,
      req.actor.type === "agent" ? req.actor.agentId : undefined,
      actorRunId,
    );
    if (!released) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: released.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.released",
      entityType: "issue",
      entityId: released.id,
    });

    res.json(released);
  });

  router.get("/issues/:id/comments", async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    const afterCommentId =
      typeof req.query.after === "string" && req.query.after.trim().length > 0
        ? req.query.after.trim()
        : typeof req.query.afterCommentId === "string" && req.query.afterCommentId.trim().length > 0
          ? req.query.afterCommentId.trim()
          : null;
    const order =
      typeof req.query.order === "string" && req.query.order.trim().toLowerCase() === "asc"
        ? "asc"
        : "desc";
    const limitRaw =
      typeof req.query.limit === "string" && req.query.limit.trim().length > 0
        ? Number(req.query.limit)
        : null;
    const limit =
      limitRaw && Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(Math.floor(limitRaw), MAX_ISSUE_COMMENT_LIMIT)
        : null;
    const comments = await svc.listComments(id, {
      afterCommentId,
      order,
      limit,
    });
    res.json(comments);
  });

  router.get("/issues/:id/comments/:commentId", async (req, res) => {
    const id = req.params.id as string;
    const commentId = req.params.commentId as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    const comment = await svc.getComment(commentId);
    if (!comment || comment.issueId !== id) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    res.json(comment);
  });

  router.post("/issues/:id/comments", validate(addIssueCommentSchema), async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    if (!(await assertAgentRunCheckoutOwnership(req, res, issue))) return;

    const actor = getActorInfo(req);
    const reopenRequested = req.body.reopen === true;
    const interruptRequested = req.body.interrupt === true;
    const isClosed = issue.status === "done" || issue.status === "cancelled";
    let reopened = false;
    let reopenFromStatus: string | null = null;
    let interruptedRunId: string | null = null;
    let currentIssue = issue;

    if (reopenRequested && isClosed) {
      const reopenedIssue = await svc.update(id, { status: "todo" });
      if (!reopenedIssue) {
        res.status(404).json({ error: "Issue not found" });
        return;
      }
      reopened = true;
      reopenFromStatus = issue.status;
      currentIssue = reopenedIssue;

      await logActivity(db, {
        companyId: currentIssue.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "issue.updated",
        entityType: "issue",
        entityId: currentIssue.id,
        details: {
          status: "todo",
          reopened: true,
          reopenedFrom: reopenFromStatus,
          source: "comment",
          identifier: currentIssue.identifier,
        },
      });
    }

    if (interruptRequested) {
      if (req.actor.type !== "board") {
        res.status(403).json({ error: "Only board users can interrupt active runs from issue comments" });
        return;
      }

      let runToInterrupt = currentIssue.executionRunId
        ? await heartbeat.getRun(currentIssue.executionRunId)
        : null;

      if (
        (!runToInterrupt || runToInterrupt.status !== "running") &&
        currentIssue.assigneeAgentId
      ) {
        const activeRun = await heartbeat.getActiveRunForAgent(currentIssue.assigneeAgentId);
        const activeIssueId =
          activeRun &&
            activeRun.contextSnapshot &&
            typeof activeRun.contextSnapshot === "object" &&
            typeof (activeRun.contextSnapshot as Record<string, unknown>).issueId === "string"
            ? ((activeRun.contextSnapshot as Record<string, unknown>).issueId as string)
            : null;
        if (activeRun && activeRun.status === "running" && activeIssueId === currentIssue.id) {
          runToInterrupt = activeRun;
        }
      }

      if (runToInterrupt && runToInterrupt.status === "running") {
        const cancelled = await heartbeat.cancelRun(runToInterrupt.id);
        if (cancelled) {
          interruptedRunId = cancelled.id;
          await logActivity(db, {
            companyId: cancelled.companyId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            agentId: actor.agentId,
            runId: actor.runId,
            action: "heartbeat.cancelled",
            entityType: "heartbeat_run",
            entityId: cancelled.id,
            details: { agentId: cancelled.agentId, source: "issue_comment_interrupt", issueId: currentIssue.id },
          });
        }
      }
    }

    const comment = await svc.addComment(id, req.body.body, {
      agentId: actor.agentId ?? undefined,
      userId: actor.actorType === "user" ? actor.actorId : undefined,
    });

    await logActivity(db, {
      companyId: currentIssue.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.comment_added",
      entityType: "issue",
      entityId: currentIssue.id,
      details: {
        commentId: comment.id,
        bodySnippet: comment.body.slice(0, 120),
        identifier: currentIssue.identifier,
        issueTitle: currentIssue.title,
        ...(reopened ? { reopened: true, reopenedFrom: reopenFromStatus, source: "comment" } : {}),
        ...(interruptedRunId ? { interruptedRunId } : {}),
      },
    });

    // Merge all wakeups from this comment into one enqueue per agent to avoid duplicate runs.
    void (async () => {
      const wakeups = new Map<string, Parameters<typeof heartbeat.wakeup>[1]>();
      const assigneeId = currentIssue.assigneeAgentId;
      const actorIsAgent = actor.actorType === "agent";
      const selfComment = actorIsAgent && actor.actorId === assigneeId;
      const skipWake = selfComment || isClosed;
      if (assigneeId && (reopened || !skipWake)) {
        if (reopened) {
          wakeups.set(assigneeId, {
            source: "automation",
            triggerDetail: "system",
            reason: "issue_reopened_via_comment",
            payload: {
              issueId: currentIssue.id,
              commentId: comment.id,
              reopenedFrom: reopenFromStatus,
              mutation: "comment",
              ...(interruptedRunId ? { interruptedRunId } : {}),
            },
            requestedByActorType: actor.actorType,
            requestedByActorId: actor.actorId,
            contextSnapshot: {
              issueId: currentIssue.id,
              taskId: currentIssue.id,
              commentId: comment.id,
              source: "issue.comment.reopen",
              wakeReason: "issue_reopened_via_comment",
              reopenedFrom: reopenFromStatus,
              ...(interruptedRunId ? { interruptedRunId } : {}),
            },
          });
        } else {
          wakeups.set(assigneeId, {
            source: "automation",
            triggerDetail: "system",
            reason: "issue_commented",
            payload: {
              issueId: currentIssue.id,
              commentId: comment.id,
              mutation: "comment",
              ...(interruptedRunId ? { interruptedRunId } : {}),
            },
            requestedByActorType: actor.actorType,
            requestedByActorId: actor.actorId,
            contextSnapshot: {
              issueId: currentIssue.id,
              taskId: currentIssue.id,
              commentId: comment.id,
              source: "issue.comment",
              wakeReason: "issue_commented",
              ...(interruptedRunId ? { interruptedRunId } : {}),
            },
          });
        }
      }

      let mentionedIds: string[] = [];
      try {
        mentionedIds = await svc.findMentionedAgents(issue.companyId, req.body.body);
      } catch (err) {
        logger.warn({ err, issueId: id }, "failed to resolve @-mentions");
      }

      for (const mentionedId of mentionedIds) {
        if (wakeups.has(mentionedId)) continue;
        if (actorIsAgent && actor.actorId === mentionedId) continue;
        wakeups.set(mentionedId, {
          source: "automation",
          triggerDetail: "system",
          reason: "issue_comment_mentioned",
          payload: { issueId: id, commentId: comment.id },
          requestedByActorType: actor.actorType,
          requestedByActorId: actor.actorId,
          contextSnapshot: {
            issueId: id,
            taskId: id,
            commentId: comment.id,
            wakeCommentId: comment.id,
            wakeReason: "issue_comment_mentioned",
            source: "comment.mention",
          },
        });
      }

      for (const [agentId, wakeup] of wakeups.entries()) {
        heartbeat
          .wakeup(agentId, wakeup)
          .catch((err) => logger.warn({ err, issueId: currentIssue.id, agentId }, "failed to wake agent on issue comment"));
      }
    })();

    res.status(201).json(comment);
  });

  router.get("/issues/:id/attachments", async (req, res) => {
    const issueId = req.params.id as string;
    const issue = await svc.getById(issueId);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);
    const attachments = await svc.listAttachments(issueId);
    res.json(attachments.map(withContentPath));
  });

  router.post("/companies/:companyId/issues/:issueId/attachments", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.issueId as string;
    assertCompanyAccess(req, companyId);
    const issue = await svc.getById(issueId);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    if (issue.companyId !== companyId) {
      res.status(422).json({ error: "Issue does not belong to company" });
      return;
    }

    try {
      await runSingleFileUpload(req, res);
    } catch (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(422).json({ error: `Attachment exceeds ${MAX_ATTACHMENT_BYTES} bytes` });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }

    const file = (req as Request & { file?: { mimetype: string; buffer: Buffer; originalname: string } }).file;
    if (!file) {
      res.status(400).json({ error: "Missing file field 'file'" });
      return;
    }
    const contentType = (file.mimetype || "").toLowerCase();
    if (!isAllowedContentType(contentType)) {
      res.status(422).json({ error: `Unsupported attachment type: ${contentType || "unknown"}` });
      return;
    }
    if (file.buffer.length <= 0) {
      res.status(422).json({ error: "Attachment is empty" });
      return;
    }

    const parsedMeta = createIssueAttachmentMetadataSchema.safeParse(req.body ?? {});
    if (!parsedMeta.success) {
      res.status(400).json({ error: "Invalid attachment metadata", details: parsedMeta.error.issues });
      return;
    }

    const actor = getActorInfo(req);
    const stored = await storage.putFile({
      companyId,
      namespace: `issues/${issueId}`,
      originalFilename: file.originalname || null,
      contentType,
      body: file.buffer,
    });

    const attachment = await svc.createAttachment({
      issueId,
      issueCommentId: parsedMeta.data.issueCommentId ?? null,
      provider: stored.provider,
      objectKey: stored.objectKey,
      contentType: stored.contentType,
      byteSize: stored.byteSize,
      sha256: stored.sha256,
      originalFilename: stored.originalFilename,
      createdByAgentId: actor.agentId,
      createdByUserId: actor.actorType === "user" ? actor.actorId : null,
    });

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.attachment_added",
      entityType: "issue",
      entityId: issueId,
      details: {
        attachmentId: attachment.id,
        originalFilename: attachment.originalFilename,
        contentType: attachment.contentType,
        byteSize: attachment.byteSize,
      },
    });

    res.status(201).json(withContentPath(attachment));
  });

  router.get("/attachments/:attachmentId/content", async (req, res, next) => {
    const attachmentId = req.params.attachmentId as string;
    const attachment = await svc.getAttachmentById(attachmentId);
    if (!attachment) {
      res.status(404).json({ error: "Attachment not found" });
      return;
    }
    assertCompanyAccess(req, attachment.companyId);

    const object = await storage.getObject(attachment.companyId, attachment.objectKey);
    res.setHeader("Content-Type", attachment.contentType || object.contentType || "application/octet-stream");
    res.setHeader("Content-Length", String(attachment.byteSize || object.contentLength || 0));
    res.setHeader("Cache-Control", "private, max-age=60");
    const filename = attachment.originalFilename ?? "attachment";
    res.setHeader("Content-Disposition", `inline; filename=\"${filename.replaceAll("\"", "")}\"`);

    object.stream.on("error", (err) => {
      next(err);
    });
    object.stream.pipe(res);
  });

  router.delete("/attachments/:attachmentId", async (req, res) => {
    const attachmentId = req.params.attachmentId as string;
    const attachment = await svc.getAttachmentById(attachmentId);
    if (!attachment) {
      res.status(404).json({ error: "Attachment not found" });
      return;
    }
    assertCompanyAccess(req, attachment.companyId);

    try {
      await storage.deleteObject(attachment.companyId, attachment.objectKey);
    } catch (err) {
      logger.warn({ err, attachmentId }, "storage delete failed while removing attachment");
    }

    const removed = await svc.removeAttachment(attachmentId);
    if (!removed) {
      res.status(404).json({ error: "Attachment not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: removed.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "issue.attachment_removed",
      entityType: "issue",
      entityId: removed.issueId,
      details: {
        attachmentId: removed.id,
      },
    });

    res.json({ ok: true });
  });

  return router;
}
