/**
 * Scheduler startup utilities.
 *
 * Initializes heartbeat and backup schedulers at server startup.
 */

import {
  heartbeatService,
  reconcilePersistedRuntimeServicesOnStartup,
  logActivity,
} from "../services/index.js";
import { logger } from "../middleware/logger.js";
import type { Config } from "../config.js";
import type { MigrationSummary } from "./migrations.js";

export interface SchedulerResult {
  migrationSummary: MigrationSummary;
  startupDbInfo:
    | { mode: "external-postgres"; connectionString: string }
    | { mode: "embedded-postgres"; dataDir: string; port: number };
  activeDatabaseConnectionString: string;
}

export function startHeartbeatScheduler(
  config: Config,
  db: any,
): void {
  if (!config.heartbeatSchedulerEnabled) return;

  const heartbeat = heartbeatService(db);

  // Reap orphaned runs at startup while in-memory execution state is empty,
  // then resume any persisted queued runs that were waiting on the previous process.
  void heartbeat
    .reapOrphanedRuns({
      recoveringGracePeriodMs: config.heartbeatStartupRecoveryGraceMs,
    })
    .then(() => heartbeat.resumeQueuedRuns())
    .catch((err) => {
      logger.error({ err }, "startup heartbeat recovery failed");
    });

  setInterval(() => {
    void heartbeat
      .tickTimers(new Date())
      .then((result) => {
        if (result.enqueued > 0) {
          logger.info({ ...result }, "heartbeat timer tick enqueued runs");
        }
      })
      .catch((err) => {
        logger.error({ err }, "heartbeat timer tick failed");
      });

    // Periodically reap orphaned runs (5-min staleness threshold) and make sure
    // persisted queued work is still being driven forward.
    void heartbeat
      .reapOrphanedRuns({
        staleThresholdMs: 5 * 60 * 1000,
        recoveringGracePeriodMs: config.heartbeatRecoveryGraceMs,
      })
      .then(() => heartbeat.resumeQueuedRuns())
      .catch((err) => {
        logger.error({ err }, "periodic heartbeat recovery failed");
      });

    // Scan for stalled in_review issues and retry reviewer wakes
    void heartbeat
      .scanAndRetryReviewerWakes({ logActivity: (input) => logActivity(db, input) })
      .catch((err) => {
        logger.warn({ err }, "periodic reviewer wake retry scan failed");
      });
  }, config.heartbeatSchedulerIntervalMs);

  // Also run runtime service reconciliation at startup
  void reconcilePersistedRuntimeServicesOnStartup(db)
    .then((result) => {
      if (result.reconciled > 0) {
        logger.warn(
          { reconciled: result.reconciled },
          "reconciled persisted runtime services from a previous server process",
        );
      }
    })
    .catch((err) => {
      logger.error(
        { err },
        "startup reconciliation of persisted runtime services failed",
      );
    });
}

export function startBackupScheduler(
  config: Config,
  connectionString: string,
): void {
  if (!config.databaseBackupEnabled) return;

  const backupIntervalMs = config.databaseBackupIntervalMinutes * 60 * 1000;
  let backupInFlight = false;

  const runScheduledBackup = async () => {
    if (backupInFlight) {
      logger.warn(
        "Skipping scheduled database backup because a previous backup is still running",
      );
      return;
    }

    backupInFlight = true;
    try {
      const { runDatabaseBackup, formatDatabaseBackupResult } = await import(
        "@paperclipai/db"
      );
      const result = await runDatabaseBackup({
        connectionString,
        backupDir: config.databaseBackupDir,
        retentionDays: config.databaseBackupRetentionDays,
        filenamePrefix: "paperclip",
      });
      logger.info(
        {
          backupFile: result.backupFile,
          sizeBytes: result.sizeBytes,
          prunedCount: result.prunedCount,
          backupDir: config.databaseBackupDir,
          retentionDays: config.databaseBackupRetentionDays,
        },
        `Automatic database backup complete: ${formatDatabaseBackupResult(
          result,
        )}`,
      );
    } catch (err) {
      logger.error(
        { err, backupDir: config.databaseBackupDir },
        "Automatic database backup failed",
      );
    } finally {
      backupInFlight = false;
    }
  };

  logger.info(
    {
      intervalMinutes: config.databaseBackupIntervalMinutes,
      retentionDays: config.databaseBackupRetentionDays,
      backupDir: config.databaseBackupDir,
    },
    "Automatic database backups enabled",
  );

  setInterval(() => {
    void runScheduledBackup();
  }, backupIntervalMs);
}
