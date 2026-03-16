import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  correctMemorySchema,
  createMemoryItemSchema,
  MEMORY_SCOPES,
  promoteReflectionSchema,
  runReflectionSchema,
  searchMemorySchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { memoryService } from "../services/memory.js";
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

  return router;
}
