/**
 * Embedded PostgreSQL lifecycle management.
 *
 * Handles initialization, startup, and shutdown of embedded PostgreSQL
 * when DATABASE_URL is not configured.
 */

import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import net from "node:net";
import detectPort from "detect-port";
import { ensurePostgresDatabase } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";

type EmbeddedPostgresInstance = {
  initialise(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
};

type EmbeddedPostgresCtor = new (opts: {
  databaseDir: string;
  user: string;
  password: string;
  port: number;
  persistent: boolean;
  initdbFlags?: string[];
  onLog?: (message: unknown) => void;
  onError?: (message: unknown) => void;
}) => EmbeddedPostgresInstance;

export interface EmbeddedPostgresResult {
  embeddedPostgres: EmbeddedPostgresInstance | null;
  startedByThisProcess: boolean;
  connectionString: string;
  dataDir: string;
  port: number;
  clusterAlreadyInitialized: boolean;
  databaseCreated: boolean;
}

async function canConnectToLocalPort(port: number): Promise<boolean> {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
  return await new Promise((resolvePromise) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const finish = (result: boolean) => {
      socket.removeAllListeners();
      if (!socket.destroyed) socket.destroy();
      resolvePromise(result);
    };
    socket.setTimeout(750);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function startEmbeddedPostgres(config: {
  embeddedPostgresDataDir: string;
  embeddedPostgresPort: number;
  databaseMode: string;
}): Promise<EmbeddedPostgresResult> {
  const moduleName = "embedded-postgres";
  let EmbeddedPostgres: EmbeddedPostgresCtor;
  try {
    const mod = await import(moduleName);
    EmbeddedPostgres = mod.default as EmbeddedPostgresCtor;
  } catch {
    throw new Error(
      "Embedded PostgreSQL mode requires dependency `embedded-postgres`. Reinstall dependencies (without omitting required packages), or set DATABASE_URL for external Postgres.",
    );
  }

  const dataDir = resolve(config.embeddedPostgresDataDir);
  const configuredPort = config.embeddedPostgresPort;
  let port = configuredPort;
  const embeddedPostgresLogBuffer: string[] = [];
  const EMBEDDED_POSTGRES_LOG_BUFFER_LIMIT = 120;
  const verboseEmbeddedPostgresLogs =
    process.env.PAPERCLIP_EMBEDDED_POSTGRES_VERBOSE === "true";
  const appendEmbeddedPostgresLog = (message: unknown) => {
    const text =
      typeof message === "string"
        ? message
        : message instanceof Error
        ? message.message
        : String(message ?? "");
    for (const lineRaw of text.split(/\r?\n/)) {
      const line = lineRaw.trim();
      if (!line) continue;
      embeddedPostgresLogBuffer.push(line);
      if (
        embeddedPostgresLogBuffer.length > EMBEDDED_POSTGRES_LOG_BUFFER_LIMIT
      ) {
        embeddedPostgresLogBuffer.splice(
          0,
          embeddedPostgresLogBuffer.length -
            EMBEDDED_POSTGRES_LOG_BUFFER_LIMIT,
        );
      }
      if (verboseEmbeddedPostgresLogs) {
        logger.info({ embeddedPostgresLog: line }, "embedded-postgres");
      }
    }
  };
  const logEmbeddedPostgresFailure = (
    phase: "initialise" | "start",
    err: unknown,
  ) => {
    if (embeddedPostgresLogBuffer.length > 0) {
      logger.error(
        {
          phase,
          recentLogs: embeddedPostgresLogBuffer,
          err,
        },
        "Embedded PostgreSQL failed; showing buffered startup logs",
      );
    }
  };

  if (config.databaseMode === "postgres") {
    logger.warn(
      "Database mode is postgres but no connection string was set; falling back to embedded PostgreSQL",
    );
  }

  const clusterVersionFile = resolve(dataDir, "PG_VERSION");
  const clusterAlreadyInitialized = existsSync(clusterVersionFile);
  const postmasterPidFile = resolve(dataDir, "postmaster.pid");
  const isPidRunning = (pid: number): boolean => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };

  const getRunningPid = (): number | null => {
    if (!existsSync(postmasterPidFile)) return null;
    try {
      const pidLine = readFileSync(postmasterPidFile, "utf8")
        .split("\n")[0]
        ?.trim();
      const pid = Number(pidLine);
      if (!Number.isInteger(pid) || pid <= 0) return null;
      if (!isPidRunning(pid)) return null;
      return pid;
    } catch {
      return null;
    }
  };

  let embeddedPostgres: EmbeddedPostgresInstance | null = null;
  let startedByThisProcess = false;

  const runningPid = getRunningPid();
  const reuseExistingEmbeddedPostgres =
    runningPid !== null && (await canConnectToLocalPort(port));
  if (runningPid && reuseExistingEmbeddedPostgres) {
    logger.warn(
      `Embedded PostgreSQL already running; reusing existing process (pid=${runningPid}, port=${port})`,
    );
  } else {
    if (runningPid && !reuseExistingEmbeddedPostgres) {
      logger.warn(
        `Embedded PostgreSQL pid file points to pid=${runningPid}, but port ${port} is not accepting connections; treating it as stale and starting a fresh embedded process`,
      );
    }
    const detectedPort = await detectPort(configuredPort);
    if (detectedPort !== configuredPort) {
      logger.warn(
        `Embedded PostgreSQL port is in use; using next free port (requestedPort=${configuredPort}, selectedPort=${detectedPort})`,
      );
    }
    port = detectedPort;
    logger.info(
      `Using embedded PostgreSQL because no DATABASE_URL set (dataDir=${dataDir}, port=${port})`,
    );
    embeddedPostgres = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: "paperclip",
      password: "paperclip",
      port,
      persistent: true,
      initdbFlags: ["--encoding=UTF8", "--locale=C"],
      onLog: appendEmbeddedPostgresLog,
      onError: appendEmbeddedPostgresLog,
    });

    if (!clusterAlreadyInitialized) {
      try {
        await embeddedPostgres.initialise();
      } catch (err) {
        logEmbeddedPostgresFailure("initialise", err);
        throw err;
      }
    } else {
      logger.info(
        `Embedded PostgreSQL cluster already exists (${clusterVersionFile}); skipping init`,
      );
    }

    if (existsSync(postmasterPidFile)) {
      logger.warn("Removing stale embedded PostgreSQL lock file");
      rmSync(postmasterPidFile, { force: true });
    }
    try {
      await embeddedPostgres.start();
    } catch (err) {
      logEmbeddedPostgresFailure("start", err);
      throw err;
    }
    startedByThisProcess = true;
  }

  const embeddedAdminConnectionString = `postgres://paperclip:paperclip@127.0.0.1:${port}/postgres`;
  const dbStatus = await ensurePostgresDatabase(
    embeddedAdminConnectionString,
    "paperclip",
  );
  if (dbStatus === "created") {
    logger.info("Created embedded PostgreSQL database: paperclip");
  }

  const embeddedConnectionString = `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`;

  return {
    embeddedPostgres,
    startedByThisProcess,
    connectionString: embeddedConnectionString,
    dataDir,
    port,
    clusterAlreadyInitialized,
    databaseCreated: dbStatus === "created",
  };
}

export function registerShutdownHandler(
  embeddedPostgres: EmbeddedPostgresInstance | null,
  startedByThisProcess: boolean,
): void {
  if (embeddedPostgres && startedByThisProcess) {
    const shutdown = async (signal: "SIGINT" | "SIGTERM") => {
      logger.info({ signal }, "Stopping embedded PostgreSQL");
      try {
        await embeddedPostgres?.stop();
      } catch (err) {
        logger.error({ err }, "Failed to stop embedded PostgreSQL cleanly");
      } finally {
        process.exit(0);
      }
    };

    process.once("SIGINT", () => {
      void shutdown("SIGINT");
    });
    process.once("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  }
}

export { canConnectToLocalPort };
