import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { instanceUserRoles, invites, companies, agents } from "@paperclipai/db";
import type { DeploymentExposure, DeploymentMode } from "@paperclipai/shared";

const DGDH_COMPANY_NAME = "David Geib Digitales Handwerk";

export function healthRoutes(
  db?: Db,
  opts: {
    deploymentMode: DeploymentMode;
    deploymentExposure: DeploymentExposure;
    authReady: boolean;
    companyDeletionEnabled: boolean;
  } = {
    deploymentMode: "local_trusted",
    deploymentExposure: "private",
    authReady: true,
    companyDeletionEnabled: true,
  },
) {
  const router = Router();

  router.get("/", async (_req, res) => {
    if (!db) {
      res.json({ status: "ok" });
      return;
    }

    let bootstrapStatus: "ready" | "bootstrap_pending" = "ready";
    let bootstrapInviteActive = false;
    let seedStatus: {
      dgdhCompanyFound: boolean;
      agentRolesFound: { ceo: boolean; worker: boolean; reviewer: boolean };
    } | null = null;

    try {
      if (opts.deploymentMode === "authenticated") {
        const roleCount = await db
          .select({ count: count() })
          .from(instanceUserRoles)
          .where(sql`${instanceUserRoles.role} = 'instance_admin'`)
          .then((rows) => Number(rows[0]?.count ?? 0));
        bootstrapStatus = roleCount > 0 ? "ready" : "bootstrap_pending";

        if (bootstrapStatus === "bootstrap_pending") {
          const now = new Date();
          const inviteCount = await db
            .select({ count: count() })
            .from(invites)
            .where(
              and(
                eq(invites.inviteType, "bootstrap_ceo"),
                isNull(invites.revokedAt),
                isNull(invites.acceptedAt),
                gt(invites.expiresAt, now),
              ),
            )
            .then((rows) => Number(rows[0]?.count ?? 0));
          bootstrapInviteActive = inviteCount > 0;
        }
      }

      // Check DGDH seed status
      const dgdhCompany = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.name, DGDH_COMPANY_NAME))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      const dgdhCompanyFound = dgdhCompany !== null;

      let agentRolesFound = { ceo: false, worker: false, reviewer: false };

      if (dgdhCompanyFound) {
        // Query for agents with specific roleTemplateIds
        const roleAgents = await db
          .select({
            id: agents.id,
            adapterConfig: agents.adapterConfig,
          })
          .from(agents)
          .where(eq(agents.companyId, dgdhCompany.id))
          .then((rows) => rows);

        for (const agent of roleAgents) {
          const config = agent.adapterConfig as Record<string, unknown>;
          const roleTemplateId = config?.roleTemplateId;
          if (roleTemplateId === "ceo") {
            agentRolesFound.ceo = true;
          } else if (roleTemplateId === "worker") {
            agentRolesFound.worker = true;
          } else if (roleTemplateId === "reviewer") {
            agentRolesFound.reviewer = true;
          }
        }
      }

      seedStatus = {
        dgdhCompanyFound,
        agentRolesFound,
      };

      res.json({
        status: "ok",
        deploymentMode: opts.deploymentMode,
        deploymentExposure: opts.deploymentExposure,
        authReady: opts.authReady,
        bootstrapStatus,
        bootstrapInviteActive,
        features: {
          companyDeletionEnabled: opts.companyDeletionEnabled,
        },
        seedStatus,
      });
    } catch (error) {
      // Gracefully degrade - still return 200 with status ok, but seedStatus as null
      res.json({
        status: "ok",
        deploymentMode: opts.deploymentMode,
        deploymentExposure: opts.deploymentExposure,
        authReady: opts.authReady,
        bootstrapStatus,
        bootstrapInviteActive,
        features: {
          companyDeletionEnabled: opts.companyDeletionEnabled,
        },
        seedStatus: null,
      });
    }
  });

  return router;
}
