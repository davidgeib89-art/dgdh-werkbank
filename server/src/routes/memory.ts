import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  correctMemorySchema,
  createMemoryItemSchema,
  approveMemorySchema,
  rejectMemorySchema,
  runRetentionSchema,
  viewerFilterSchema,
  MEMORY_SCOPES,
  promoteReflectionSchema,
  runReflectionSchema,
  searchMemorySchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { memoryService } from "../services/memory.js";
import { governanceService } from "../services/governance.js";
import { reflectionService } from "../services/reflection.js";
import { assertCompanyAccess } from "./authz.js";

function parseScopeQuery(scopeRaw: string | undefined) {
  if (!scopeRaw) return undefined;
  const allowedScopes = new Set(MEMORY_SCOPES);
  const requested = scopeRaw
    .split(",")
    .map((scope) => scope.trim())
    .filter((scope): scope is (typeof MEMORY_SCOPES)[number] =>
      allowedScopes.has(scope as (typeof MEMORY_SCOPES)[number]),
    );
  return requested.length > 0 ? requested : undefined;
}

export function memoryRoutes(db: Db) {
  const router = Router();
  const memory = memoryService(db);
  const reflection = reflectionService(db);
  const governance = governanceService(db);

  router.get("/companies/:companyId/memory", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const parsed = searchMemorySchema.safeParse({
      text: (req.query.text as string | undefined) ?? "",
      scope: parseScopeQuery(req.query.scope as string | undefined),
      agentId: req.query.agentId as string | undefined,
      projectId: req.query.projectId as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid query", details: parsed.error.issues });
      return;
    }

    const result = await memory.forCompany(companyId).search(parsed.data);
    res.json(result);
  });

  router.post(
    "/companies/:companyId/memory",
    validate(createMemoryItemSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const created = await memory.create(companyId, req.body);
      res.status(201).json(created);
    },
  );

  router.patch(
    "/companies/:companyId/memory/:memoryId",
    validate(correctMemorySchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      await memory
        .forCompany(companyId)
        .correct(req.params.memoryId as string, req.body);
      res.status(204).end();
    },
  );

  router.post(
    "/companies/:companyId/memory/:memoryId/reinforce",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      await memory
        .forCompany(companyId)
        .reinforce(req.params.memoryId as string);
      res.status(204).end();
    },
  );

  router.get(
    "/companies/:companyId/memory/reflection-preview",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const parsed = searchMemorySchema.safeParse({
        text: (req.query.text as string | undefined) ?? "",
        agentId: req.query.agentId as string | undefined,
        projectId: req.query.projectId as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: "Invalid query", details: parsed.error.issues });
        return;
      }
      if (!parsed.data.agentId) {
        res.status(400).json({ error: "agentId query param is required" });
        return;
      }

      const context = await memory.hydrateRunContext({
        companyId,
        agentId: parsed.data.agentId,
        projectId: parsed.data.projectId,
        text: parsed.data.text,
        limitPerScope: parsed.data.limit,
      });
      res.json(memory.asReflectionOutput(context));
    },
  );

  // ── Sprint 2: Reflection Engine ──────────────────────────────────────────

  /**
   * POST /companies/:companyId/memory/reflect
   * Analyse recent episodes for an agent and return reviewable candidates.
   * Nothing is saved — all output is ephemeral until /reflect/promote is called.
   */
  router.post(
    "/companies/:companyId/memory/reflect",
    validate(runReflectionSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const report = await reflection.runReflection(companyId, req.body);
      res.json(report);
    },
  );

  /**
   * POST /companies/:companyId/memory/reflect/promote
   * Persist selected (and optionally edited) candidates as real memory items.
   * Returns the created MemoryItem array.
   */
  router.post(
    "/companies/:companyId/memory/reflect/promote",
    validate(promoteReflectionSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const created = await reflection.promote(companyId, req.body);
      res.status(201).json(created);
    },
  );

  // ── Sprint 3: Memory Viewer ───────────────────────────────────────────────

  /**
   * GET /companies/:companyId/memory/viewer
   * Paginated list of all memory items (incl. pending_review) with governance metadata.
   * Query params match viewerFilterSchema fields.
   */
  router.get("/companies/:companyId/memory/viewer", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const parsed = viewerFilterSchema.safeParse({
      scope: req.query.scope
        ? String(req.query.scope).split(",").filter(Boolean)
        : undefined,
      kind: req.query.kind
        ? String(req.query.kind).split(",").filter(Boolean)
        : undefined,
      agentId: req.query.agentId as string | undefined,
      projectId: req.query.projectId as string | undefined,
      approvalStatus: req.query.approvalStatus
        ? String(req.query.approvalStatus).split(",").filter(Boolean)
        : undefined,
      includeArchived: req.query.includeArchived === "true",
      text: req.query.text as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid query", details: parsed.error.issues });
      return;
    }
    const page = await governance.listForViewer(companyId, parsed.data);
    res.json(page);
  });

  /**
   * GET /companies/:companyId/memory/viewer/stats
   * Aggregate counts by scope, kind, approval status.
   */
  router.get("/companies/:companyId/memory/viewer/stats", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const result = await governance.stats(companyId);
    res.json(result);
  });

  // ── Sprint 3: Governance Actions ─────────────────────────────────────────

  /**
   * POST /companies/:companyId/memory/:memoryId/approve
   * Approve a pending_review memory item.
   * Body: { approvedBy: string }
   */
  router.post(
    "/companies/:companyId/memory/:memoryId/approve",
    validate(approveMemorySchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      await governance.approve(
        companyId,
        req.params.memoryId as string,
        req.body.approvedBy,
      );
      res.status(204).end();
    },
  );

  /**
   * POST /companies/:companyId/memory/:memoryId/reject
   * Reject a pending_review memory item. Preserves the item for audit.
   * Body: { reason: string }
   */
  router.post(
    "/companies/:companyId/memory/:memoryId/reject",
    validate(rejectMemorySchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      await governance.reject(
        companyId,
        req.params.memoryId as string,
        req.body.reason,
      );
      res.status(204).end();
    },
  );

  /**
   * POST /companies/:companyId/memory/:memoryId/archive
   * Soft-archive a memory item (excluded from context hydration).
   */
  router.post(
    "/companies/:companyId/memory/:memoryId/archive",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      await governance.archive(companyId, req.params.memoryId as string);
      res.status(204).end();
    },
  );

  /**
   * POST /companies/:companyId/memory/retention/run
   * Run the episode retention pass for a company.
   * Body: runRetentionSchema (all fields optional with sensible defaults).
   */
  router.post(
    "/companies/:companyId/memory/retention/run",
    validate(runRetentionSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const result = await governance.runRetention(companyId, req.body);
      res.json(result);
    },
  );

  /**
   * GET /companies/:companyId/memory/retrieval-trace
   * Debug endpoint: shows which memories would be loaded before a run.
   * Query params: agentId (required), projectId?, text?, limit?
   */
  router.get(
    "/companies/:companyId/memory/retrieval-trace",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const agentId = req.query.agentId as string | undefined;
      if (!agentId) {
        res.status(400).json({ error: "agentId query param is required" });
        return;
      }

      const projectId = req.query.projectId as string | undefined;
      const text = (req.query.text as string | undefined) ?? "";
      const limitPerScope = req.query.limit
        ? Number(req.query.limit)
        : undefined;

      const context = await memory.hydrateRunContext({
        companyId,
        agentId,
        projectId,
        text,
        limitPerScope,
      });

      const retrievedAt = new Date();
      const entries = (
        [
          { scope: "personal" as const, items: context.personal },
          { scope: "company" as const, items: context.company },
          { scope: "project" as const, items: context.project },
          { scope: "social" as const, items: context.social },
        ] as const
      ).map(({ scope, items }) => ({
        scope,
        count: items.length,
        topItems: items.slice(0, 5).map((m) => ({
          id: m.id,
          summary: m.summary,
          importance: m.importance,
          matchedQuery:
            text.length > 0
              ? m.summary.toLowerCase().includes(text.toLowerCase()) ||
                m.detail.toLowerCase().includes(text.toLowerCase())
              : false,
        })),
      }));

      res.json({
        context,
        trace: {
          companyId,
          agentId,
          queryText: text,
          retrievedAt,
          entries,
          totalRetrieved: entries.reduce((s, e) => s + e.count, 0),
        },
      });
    },
  );

  return router;
}
