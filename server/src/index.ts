import { createServer } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {} from "./types/express.js";
import type { Request as ExpressRequest } from "express";
import { createDb } from "@paperclipai/db";
import detectPort from "detect-port";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { logger } from "./middleware/logger.js";
import { setupLiveEventsWebSocketServer } from "./realtime/live-events-ws.js";
import { createStorageServiceFromConfig } from "./storage/index.js";
import { printStartupBanner } from "./startup-banner.js";
import {
  resolvePaperclipHomeDir,
  resolvePaperclipInstanceId,
} from "./home-paths.js";
import { getBoardClaimWarningUrl } from "./board-claim.js";
import { ensureSeedData } from "./services/ensure-seed-data.js";
import { ensureMigrations, type MigrationSummary } from "./startup/migrations.js";
import {
  startEmbeddedPostgres,
  registerShutdownHandler,
} from "./startup/embedded-postgres.js";
import {
  validateDeploymentConfig,
  setupDeploymentMode,
} from "./startup/bootstrap.js";
import { startHeartbeatScheduler, startBackupScheduler } from "./startup/schedulers.js";

export interface StartedServer {
  server: ReturnType<typeof createServer>;
  host: string;
  listenPort: number;
  apiUrl: string;
  databaseUrl: string;
}

export async function startServer(): Promise<StartedServer> {
  const config = loadConfig();

  // Set up secrets environment variables
  if (process.env.PAPERCLIP_SECRETS_PROVIDER === undefined) {
    process.env.PAPERCLIP_SECRETS_PROVIDER = config.secretsProvider;
  }
  if (process.env.PAPERCLIP_SECRETS_STRICT_MODE === undefined) {
    process.env.PAPERCLIP_SECRETS_STRICT_MODE = config.secretsStrictMode
      ? "true"
      : "false";
  }
  if (process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE === undefined) {
    process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE =
      config.secretsMasterKeyFilePath;
  }

  let migrationSummary: MigrationSummary = "skipped";
  let activeDatabaseConnectionString: string;
  let startupDbInfo:
    | { mode: "external-postgres"; connectionString: string }
    | { mode: "embedded-postgres"; dataDir: string; port: number };
  let db: any;
  let embeddedPostgres: { stop(): Promise<void> } | null = null;
  let embeddedPostgresStartedByThisProcess = false;

  // Database setup: external PostgreSQL or embedded
  if (config.databaseUrl) {
    migrationSummary = await ensureMigrations(config.databaseUrl, "PostgreSQL");

    db = createDb(config.databaseUrl);
    logger.info("Using external PostgreSQL via DATABASE_URL/config");
    activeDatabaseConnectionString = config.databaseUrl;
    startupDbInfo = {
      mode: "external-postgres",
      connectionString: config.databaseUrl,
    };
  } else {
    const pgResult = await startEmbeddedPostgres({
      embeddedPostgresDataDir: config.embeddedPostgresDataDir,
      embeddedPostgresPort: config.embeddedPostgresPort,
      databaseMode: config.databaseMode,
    });

    embeddedPostgres = pgResult.embeddedPostgres;
    embeddedPostgresStartedByThisProcess = pgResult.startedByThisProcess;
    const {
      connectionString: embeddedConnectionString,
      dataDir,
      port,
      clusterAlreadyInitialized,
      databaseCreated,
    } = pgResult;

    const shouldAutoApplyFirstRunMigrations =
      !clusterAlreadyInitialized || databaseCreated;

    migrationSummary = await ensureMigrations(
      embeddedConnectionString,
      "Embedded PostgreSQL",
      {
        autoApply: shouldAutoApplyFirstRunMigrations,
      },
    );

    db = createDb(embeddedConnectionString);
    logger.info("Embedded PostgreSQL ready");
    activeDatabaseConnectionString = embeddedConnectionString;
    startupDbInfo = { mode: "embedded-postgres", dataDir, port };
  }

  await ensureSeedData(db);

  // Deployment mode validation and setup
  validateDeploymentConfig(config);

  const {
    authReady,
    betterAuthHandler,
    resolveSession,
    resolveSessionFromHeaders,
  } = await setupDeploymentMode(config, db);

  // Server setup
  const listenPort = await detectPort(config.port);
  const uiMode = config.uiDevMiddleware
    ? "vite-dev"
    : config.serveUi
    ? "static"
    : "none";
  const storageService = createStorageServiceFromConfig(config);
  const app = await createApp(db, {
    uiMode,
    serverPort: listenPort,
    storageService,
    deploymentMode: config.deploymentMode,
    deploymentExposure: config.deploymentExposure,
    allowedHostnames: config.allowedHostnames,
    bindHost: config.host,
    authReady,
    companyDeletionEnabled: config.companyDeletionEnabled,
    betterAuthHandler,
    resolveSession,
  });
  const server = createServer(
    app as unknown as Parameters<typeof createServer>[0],
  );

  if (listenPort !== config.port) {
    logger.warn(
      `Requested port is busy; using next free port (requestedPort=${config.port}, selectedPort=${listenPort})`,
    );
  }

  const runtimeListenHost = config.host;
  const runtimeApiHost =
    runtimeListenHost === "0.0.0.0" || runtimeListenHost === "::"
      ? "localhost"
      : runtimeListenHost;
  process.env.PAPERCLIP_LISTEN_HOST = runtimeListenHost;
  process.env.PAPERCLIP_LISTEN_PORT = String(listenPort);
  process.env.PAPERCLIP_API_URL = `http://${runtimeApiHost}:${listenPort}`;

  // WebSocket setup
  setupLiveEventsWebSocketServer(server, db, {
    deploymentMode: config.deploymentMode,
    resolveSessionFromHeaders,
  });

  // Schedulers
  startHeartbeatScheduler(config, db);
  startBackupScheduler(config, activeDatabaseConnectionString);

  // Start listening
  await new Promise<void>((resolveListen, rejectListen) => {
    const onError = (err: Error) => {
      server.off("error", onError);
      rejectListen(err);
    };

    server.once("error", onError);
    server.listen(listenPort, config.host, () => {
      server.off("error", onError);
      logger.info(`Server listening on ${config.host}:${listenPort}`);

      // Open browser if requested
      if (process.env.PAPERCLIP_OPEN_ON_LISTEN === "true") {
        const openHost =
          config.host === "0.0.0.0" || config.host === "::"
            ? "127.0.0.1"
            : config.host;
        const url = `http://${openHost}:${listenPort}`;
        void import("open")
          .then((mod) => mod.default(url))
          .then(() => {
            logger.info(`Opened browser at ${url}`);
          })
          .catch((err) => {
            logger.warn({ err, url }, "Failed to open browser on startup");
          });
      }

      // Print startup banner
      printStartupBanner({
        host: config.host,
        deploymentMode: config.deploymentMode,
        deploymentExposure: config.deploymentExposure,
        authReady,
        requestedPort: config.port,
        listenPort,
        uiMode,
        db: startupDbInfo,
        migrationSummary,
        heartbeatSchedulerEnabled: config.heartbeatSchedulerEnabled,
        heartbeatSchedulerIntervalMs: config.heartbeatSchedulerIntervalMs,
        databaseBackupEnabled: config.databaseBackupEnabled,
        databaseBackupIntervalMinutes: config.databaseBackupIntervalMinutes,
        databaseBackupRetentionDays: config.databaseBackupRetentionDays,
        databaseBackupDir: config.databaseBackupDir,
        paperclipHome: resolvePaperclipHomeDir(),
        instanceId: resolvePaperclipInstanceId(),
      });

      // Board claim warning if applicable
      const boardClaimUrl = getBoardClaimWarningUrl(config.host, listenPort);
      if (boardClaimUrl) {
        const red = "\x1b[41m\x1b[30m";
        const yellow = "\x1b[33m";
        const reset = "\x1b[0m";
        console.log(
          [
            `${red}  BOARD CLAIM REQUIRED  ${reset}`,
            `${yellow}This instance was previously local_trusted and still has local-board as the only admin.${reset}`,
            `${yellow}Sign in with a real user and open this one-time URL to claim ownership:${reset}`,
            `${yellow}${boardClaimUrl}${reset}`,
            `${yellow}If you are connecting over Tailscale, replace the host in this URL with your Tailscale IP/MagicDNS name.${reset}`,
          ].join("\n"),
        );
      }

      resolveListen();
    });
  });

  // Register shutdown handler for embedded PostgreSQL
  if (embeddedPostgres && embeddedPostgresStartedByThisProcess) {
    registerShutdownHandler(embeddedPostgres, embeddedPostgresStartedByThisProcess);
  }

  return {
    server,
    host: config.host,
    listenPort,
    apiUrl:
      process.env.PAPERCLIP_API_URL ?? `http://${runtimeApiHost}:${listenPort}`,
    databaseUrl: activeDatabaseConnectionString,
  };
}

export function isMainModule(metaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(resolve(entry)).href === metaUrl;
  } catch {
    return false;
  }
}

if (isMainModule(import.meta.url)) {
  void startServer().catch((err) => {
    logger.error({ err }, "Paperclip server failed to start");
    process.exit(1);
  });
}
