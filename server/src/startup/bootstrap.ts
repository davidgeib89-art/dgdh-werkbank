/**
 * Bootstrap utilities for server startup.
 *
 * Handles deployment mode validation, authentication setup,
 * and local trusted board principal initialization.
 */

import type { Request as ExpressRequest, RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import {
  authUsers,
  companies,
  companyMemberships,
  instanceUserRoles,
} from "@paperclipai/db";
import { logger } from "../middleware/logger.js";
import { initializeBoardClaimChallenge } from "../board-claim.js";
import type { Config } from "../config.js";

type BetterAuthSessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

type BetterAuthSessionResult = {
  session: { id: string; userId: string } | null;
  user: BetterAuthSessionUser | null;
};

export interface DeploymentModeResult {
  authReady: boolean;
  betterAuthHandler: RequestHandler | undefined;
  resolveSession:
    | ((req: ExpressRequest) => Promise<BetterAuthSessionResult | null>)
    | undefined;
  resolveSessionFromHeaders:
    | ((headers: Headers) => Promise<BetterAuthSessionResult | null>)
    | undefined;
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "localhost" ||
    normalized === "::1"
  );
}

const LOCAL_BOARD_USER_ID = "local-board";
const LOCAL_BOARD_USER_EMAIL = "local@paperclip.local";
const LOCAL_BOARD_USER_NAME = "Board";

export async function ensureLocalTrustedBoardPrincipal(db: any): Promise<void> {
  const now = new Date();
  const existingUser = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.id as any, LOCAL_BOARD_USER_ID))
    .then((rows: Array<{ id: string }>) => rows[0] ?? null);

  if (!existingUser) {
    await db.insert(authUsers).values({
      id: LOCAL_BOARD_USER_ID,
      name: LOCAL_BOARD_USER_NAME,
      email: LOCAL_BOARD_USER_EMAIL,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const role = await db
    .select({ id: instanceUserRoles.id })
    .from(instanceUserRoles)
    .where(
      and(
        eq(instanceUserRoles.userId as any, LOCAL_BOARD_USER_ID),
        eq(instanceUserRoles.role as any, "instance_admin"),
      ),
    )
    .then((rows: Array<{ id: string }>) => rows[0] ?? null);
  if (!role) {
    await db.insert(instanceUserRoles).values({
      userId: LOCAL_BOARD_USER_ID,
      role: "instance_admin",
    });
  }

  const companyRows = await db.select({ id: companies.id }).from(companies);
  for (const company of companyRows) {
    const membership = await db
      .select({ id: companyMemberships.id })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId as any, company.id),
          eq(companyMemberships.principalType as any, "user"),
          eq(companyMemberships.principalId as any, LOCAL_BOARD_USER_ID),
        ),
      )
      .then((rows: Array<{ id: string }>) => rows[0] ?? null);
    if (membership) continue;
    await db.insert(companyMemberships).values({
      companyId: company.id,
      principalType: "user",
      principalId: LOCAL_BOARD_USER_ID,
      status: "active",
      membershipRole: "owner",
    });
  }
}

export function validateDeploymentConfig(config: Config): void {
  if (
    config.deploymentMode === "local_trusted" &&
    !isLoopbackHost(config.host)
  ) {
    throw new Error(
      `local_trusted mode requires loopback host binding (received: ${config.host}). ` +
        "Use authenticated mode for non-loopback deployments.",
    );
  }

  if (
    config.deploymentMode === "local_trusted" &&
    config.deploymentExposure !== "private"
  ) {
    throw new Error("local_trusted mode only supports private exposure");
  }

  if (config.deploymentMode === "authenticated") {
    if (config.authBaseUrlMode === "explicit" && !config.authPublicBaseUrl) {
      throw new Error("auth.baseUrlMode=explicit requires auth.publicBaseUrl");
    }
    if (config.deploymentExposure === "public") {
      if (config.authBaseUrlMode !== "explicit") {
        throw new Error(
          "authenticated public exposure requires auth.baseUrlMode=explicit",
        );
      }
      if (!config.authPublicBaseUrl) {
        throw new Error(
          "authenticated public exposure requires auth.publicBaseUrl",
        );
      }
    }
  }
}

export async function setupDeploymentMode(
  config: Config,
  db: any,
): Promise<DeploymentModeResult> {
  let authReady = config.deploymentMode === "local_trusted";
  let betterAuthHandler: RequestHandler | undefined;
  let resolveSession:
    | ((req: ExpressRequest) => Promise<BetterAuthSessionResult | null>)
    | undefined;
  let resolveSessionFromHeaders:
    | ((headers: Headers) => Promise<BetterAuthSessionResult | null>)
    | undefined;

  if (config.deploymentMode === "local_trusted") {
    await ensureLocalTrustedBoardPrincipal(db);
  }

  if (config.deploymentMode === "authenticated") {
    const {
      createBetterAuthHandler,
      createBetterAuthInstance,
      deriveAuthTrustedOrigins,
      resolveBetterAuthSession,
      resolveBetterAuthSessionFromHeaders,
    } = await import("../auth/better-auth.js");
    const betterAuthSecret =
      process.env.BETTER_AUTH_SECRET?.trim() ??
      process.env.PAPERCLIP_AGENT_JWT_SECRET?.trim();
    if (!betterAuthSecret) {
      throw new Error(
        "authenticated mode requires BETTER_AUTH_SECRET (or PAPERCLIP_AGENT_JWT_SECRET) to be set",
      );
    }
    const derivedTrustedOrigins = deriveAuthTrustedOrigins(config);
    const envTrustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const effectiveTrustedOrigins = Array.from(
      new Set([...derivedTrustedOrigins, ...envTrustedOrigins]),
    );
    logger.info(
      {
        authBaseUrlMode: config.authBaseUrlMode,
        authPublicBaseUrl: config.authPublicBaseUrl ?? null,
        trustedOrigins: effectiveTrustedOrigins,
        trustedOriginsSource: {
          derived: derivedTrustedOrigins.length,
          env: envTrustedOrigins.length,
        },
      },
      "Authenticated mode auth origin configuration",
    );
    const auth = createBetterAuthInstance(
      db,
      config,
      effectiveTrustedOrigins,
    );
    betterAuthHandler = createBetterAuthHandler(auth);
    resolveSession = (req) => resolveBetterAuthSession(auth, req);
    resolveSessionFromHeaders = (headers) =>
      resolveBetterAuthSessionFromHeaders(auth, headers);
    await initializeBoardClaimChallenge(db, {
      deploymentMode: config.deploymentMode,
    });
    authReady = true;
  }

  return {
    authReady,
    betterAuthHandler,
    resolveSession,
    resolveSessionFromHeaders,
  };
}
