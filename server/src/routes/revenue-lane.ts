import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  runImagePacketPipelineSchema,
  runRevenueContentExtractorSchema,
  runRevenueSchemaFillSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import {
  logActivity,
  revenueContentExtractorService,
  revenueImagePipelineService,
  revenueSchemaFillService,
} from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function revenueLaneRoutes(db: Db) {
  const router = Router();
  const imagePipeline = revenueImagePipelineService();
  const contentExtractor = revenueContentExtractorService();
  const schemaFill = revenueSchemaFillService();

  router.post(
    "/companies/:companyId/revenue-lane/image-pipeline/process",
    validate(runImagePacketPipelineSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const actor = getActorInfo(req);
      const result = await imagePipeline.processDirectory(req.body);

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "revenue.image_packet_pipeline.processed",
        entityType: "company",
        entityId: companyId,
        details: {
          sourceDir: result.sourceDir,
          outputDir: result.outputDir,
          manifestPath: result.manifestPath,
          imageCount: result.imageCount,
          targetBytes: result.targetBytes,
        },
      });

      res.status(201).json(result);
    },
  );

  router.post(
    "/companies/:companyId/revenue-lane/content-extractor/process",
    validate(runRevenueContentExtractorSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const actor = getActorInfo(req);
      const result = await contentExtractor.processDirectory(req.body);

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "revenue.content_packet_extractor.processed",
        entityType: "company",
        entityId: companyId,
        details: {
          sourceDir: result.sourceDir,
          manifestPath: result.manifestPath,
          outputPath: result.outputPath,
          source: result.source,
          sourceFileCount: result.sourceFiles.length,
        },
      });

      res.status(201).json(result);
    },
  );

  router.post(
    "/companies/:companyId/revenue-lane/schema-fill/process",
    validate(runRevenueSchemaFillSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const actor = getActorInfo(req);
      const result = await schemaFill.processDirectory(req.body);

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "revenue.schema_fill_packet.processed",
        entityType: "company",
        entityId: companyId,
        details: {
          manifestPath: result.manifestPath,
          contentDraftPath: result.contentDraftPath,
          outputDir: result.outputDir,
          templateRepoPath: result.templateRepoPath,
          assetCount: result.assetCount,
          placeholderCount: result.placeholderCount,
          generatedFileCount: result.generatedFiles.length,
        },
      });

      res.status(201).json(result);
    },
  );

  return router;
}
