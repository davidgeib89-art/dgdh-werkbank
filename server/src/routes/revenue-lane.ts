import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { runImagePacketPipelineSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { logActivity, revenueImagePipelineService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function revenueLaneRoutes(db: Db) {
  const router = Router();
  const imagePipeline = revenueImagePipelineService();

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

  return router;
}
