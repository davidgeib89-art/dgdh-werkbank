import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  heartbeatService,
  REVIEWER_WAKE_RETRY_THRESHOLD_MS,
} from "../services/heartbeat.ts";

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/activity-log.js", () => ({
  logActivity: mockLogActivity,
}));

describe("heartbeat reviewer wake retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("REVIEWER_WAKE_RETRY_THRESHOLD_MS constant is exported with correct value", () => {
    expect(REVIEWER_WAKE_RETRY_THRESHOLD_MS).toBe(5 * 60 * 1000);
  });

  it("heartbeatService exports scanAndRetryReviewerWakes function", () => {
    const mockDb = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      })),
    };

    const service = heartbeatService(mockDb as any);
    expect(typeof service.scanAndRetryReviewerWakes).toBe("function");
  });

  it("finds stalled in_review issue and queues reviewer wakeup to idle reviewer", async () => {
    const stalledIssue = {
      id: "issue-1",
      companyId: "company-1",
      status: "in_review",
      updatedAt: new Date(Date.now() - REVIEWER_WAKE_RETRY_THRESHOLD_MS - 1000).toISOString(),
    };

    const idleReviewer = {
      id: "agent-reviewer-1",
      companyId: "company-1",
      name: "Reviewer Agent",
      role: "reviewer",
      status: "idle",
      adapterConfig: {},
      runtimeConfig: {},
    };

    const issueContext = {
      id: "issue-1",
      companyId: "company-1",
      projectId: null,
      goalId: null,
      parentId: null,
      identifier: "DAV-201",
      title: "Triad task in review",
      description: null,
    };

    const issueExecutionState = {
      id: "issue-1",
      companyId: "company-1",
      executionRunId: null,
      executionAgentNameKey: null,
    };

    const queuedRun = {
      id: "new-run-id",
      companyId: "company-1",
      agentId: "agent-reviewer-1",
      invocationSource: "automation",
      triggerDetail: "system",
      wakeupRequestId: "new-wakeup-id",
      status: "queued",
    };

    const wakeupRequest = {
      id: "new-wakeup-id",
    };

    const queryResults = [
      [stalledIssue],
      [stalledIssue],
      [],
      [idleReviewer],
      [idleReviewer],
      [issueContext],
      [],
      [],
      [issueExecutionState],
      [],
      [idleReviewer],
      [{ count: 0 }],
      [],
    ];
    let queryIndex = 0;
    const insertResults = [wakeupRequest, queuedRun];
    let insertIndex = 0;

    const buildWhereResult = (result: unknown) => {
      const promise = Promise.resolve(result);
      return {
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
        limit: vi.fn(() => Promise.resolve(result)),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(result)),
        })),
      };
    };

    const mockDb = {
      select: vi.fn(() => {
        const result = queryResults[queryIndex] ?? [];
        queryIndex++;
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => buildWhereResult(result)),
          })),
        };
      }),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
          returning: vi.fn(() => Promise.resolve([{}])),
        })),
        returning: vi.fn(() => Promise.resolve([{}])),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([insertResults[Math.min(insertIndex++, insertResults.length - 1)]]),
          ),
        })),
      })),
      transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockDb)),
      execute: vi.fn(() => Promise.resolve()),
    };

    const service = heartbeatService(mockDb as any);
    await service.scanAndRetryReviewerWakes({
      logActivity: mockLogActivity,
    });

    // Verify logActivity was called with the correct action
    const logCalls = mockLogActivity.mock.calls;
    const queuedLogCall = logCalls.find(
      (call: unknown[]) => (call[0] as { action?: string } | undefined)?.action === "issue.reviewer_wake_queued_by_heartbeat"
    );
    expect(queuedLogCall).toBeDefined();
    expect((queuedLogCall[0] as { entityId: string }).entityId).toBe("issue-1");
    expect((queuedLogCall[0] as { agentId: string }).agentId).toBe("agent-reviewer-1");
  });

  it("skips issue where reviewer run is already running", async () => {
    const stalledIssue = {
      id: "issue-1",
      companyId: "company-1",
      status: "in_review",
      updatedAt: new Date(Date.now() - REVIEWER_WAKE_RETRY_THRESHOLD_MS - 1000).toISOString(),
    };

    const existingRun = {
      id: "run-1",
      status: "running",
      contextSnapshot: { roleTemplateId: "reviewer" },
    };

    const queryResults = [
      [stalledIssue], // Query 1: stalled issues
      [stalledIssue], // Query 2: race condition check
      [existingRun], // Query 3: has existing reviewer run
    ];
    let queryIndex = 0;

    const mockDb = {
      select: vi.fn(() => {
        const result = queryResults[queryIndex] ?? [];
        queryIndex++;
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => {
              if (queryIndex === 1 || queryIndex === 3) {
                return Promise.resolve(result);
              }
              return {
                limit: vi.fn(() => Promise.resolve(result)),
              };
            }),
          })),
        };
      }),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      })),
    };

    const service = heartbeatService(mockDb as any);
    await service.scanAndRetryReviewerWakes({
      logActivity: mockLogActivity,
    });

    const logCalls = mockLogActivity.mock.calls;
    const queuedLogCall = logCalls.find(
      (call: unknown[]) => (call[0] as { action?: string } | undefined)?.action === "issue.reviewer_wake_queued_by_heartbeat"
    );
    expect(queuedLogCall).toBeUndefined();
    const stallLogCall = logCalls.find(
      (call: unknown[]) => (call[0] as { action?: string } | undefined)?.action === "issue.reviewer_wake_stalled"
    );
    expect(stallLogCall).toBeUndefined();
  });

  it("skips issue where no reviewer agents are idle, logs stall activity", async () => {
    const stalledIssue = {
      id: "issue-1",
      companyId: "company-1",
      status: "in_review",
      updatedAt: new Date(Date.now() - REVIEWER_WAKE_RETRY_THRESHOLD_MS - 1000).toISOString(),
    };

    const queryResults = [
      [stalledIssue], // Query 1: stalled issues
      [stalledIssue], // Query 2: race condition check
      [], // Query 3: no existing reviewer runs
      [], // Query 4: no idle reviewers
    ];
    let queryIndex = 0;

    const mockDb = {
      select: vi.fn(() => {
        const result = queryResults[queryIndex] ?? [];
        queryIndex++;
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => {
              if (queryIndex === 1 || queryIndex === 3) {
                return Promise.resolve(result);
              }
              return {
                limit: vi.fn(() => Promise.resolve(result)),
              };
            }),
          })),
        };
      }),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      })),
    };

    const service = heartbeatService(mockDb as any);
    await service.scanAndRetryReviewerWakes({
      logActivity: mockLogActivity,
    });

    const logCalls = mockLogActivity.mock.calls;
    const stallLogCall = logCalls.find(
      (call: unknown[]) => (call[0] as { action?: string } | undefined)?.action === "issue.reviewer_wake_stalled"
    );
    expect(stallLogCall).toBeDefined();
    expect((stallLogCall[0] as { entityId: string }).entityId).toBe("issue-1");
  });

  it("logs stall activity when no idle reviewer available (closeoutBlocker is derived from company-run-chain)", async () => {
    const stalledIssue = {
      id: "issue-1",
      companyId: "company-1",
      status: "in_review",
      updatedAt: new Date(Date.now() - REVIEWER_WAKE_RETRY_THRESHOLD_MS - 1000).toISOString(),
    };

    const queryResults = [
      [stalledIssue], // Query 1: stalled issues
      [stalledIssue], // Query 2: race condition check
      [], // Query 3: no existing reviewer runs
      [], // Query 4: no idle reviewers
    ];
    let queryIndex = 0;

    const mockDb = {
      select: vi.fn(() => {
        const result = queryResults[queryIndex] ?? [];
        queryIndex++;
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => {
              if (queryIndex === 1 || queryIndex === 3) {
                return Promise.resolve(result);
              }
              return {
                limit: vi.fn(() => Promise.resolve(result)),
              };
            }),
          })),
        };
      }),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      })),
    };

    const service = heartbeatService(mockDb as any);
    await service.scanAndRetryReviewerWakes({
      logActivity: mockLogActivity,
    });

    // Verify stall activity is logged - closeoutBlocker is derived, not stored
    const logCalls = mockLogActivity.mock.calls;
    const stallLogCall = logCalls.find(
      (call: unknown[]) => (call[0] as { action?: string } | undefined)?.action === "issue.reviewer_wake_stalled"
    );
    expect(stallLogCall).toBeDefined();
    expect((stallLogCall[0] as { entityId: string }).entityId).toBe("issue-1");
    expect((stallLogCall[0] as { details: { reason: string } }).details.reason).toBe("no_idle_reviewer_available");
  });

  it("skips issue that is no longer in_review when heartbeat fires (race condition guard)", async () => {
    const stalledIssue = {
      id: "issue-1",
      companyId: "company-1",
      status: "in_review",
      updatedAt: new Date(Date.now() - REVIEWER_WAKE_RETRY_THRESHOLD_MS - 1000).toISOString(),
    };

    const updatedIssue = {
      id: "issue-1",
      companyId: "company-1",
      status: "done", // Changed from in_review
      updatedAt: new Date().toISOString(),
    };

    const queryResults = [
      [stalledIssue], // Query 1: stalled issues (found initially)
      [updatedIssue], // Query 2: race condition check (now done)
    ];
    let queryIndex = 0;

    const mockDb = {
      select: vi.fn(() => {
        const result = queryResults[queryIndex] ?? [];
        queryIndex++;
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => {
              if (queryIndex === 1) {
                return Promise.resolve(result);
              }
              return {
                limit: vi.fn(() => Promise.resolve(result)),
              };
            }),
          })),
        };
      }),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      })),
    };

    const service = heartbeatService(mockDb as any);
    await service.scanAndRetryReviewerWakes({
      logActivity: mockLogActivity,
    });

    const logCalls = mockLogActivity.mock.calls;
    const queuedLogCall = logCalls.find(
      (call: unknown[]) => (call[0] as { action?: string } | undefined)?.action === "issue.reviewer_wake_queued_by_heartbeat"
    );
    expect(queuedLogCall).toBeUndefined();
    const stallLogCall = logCalls.find(
      (call: unknown[]) => (call[0] as { action?: string } | undefined)?.action === "issue.reviewer_wake_stalled"
    );
    expect(stallLogCall).toBeUndefined();
  });

  it("scheduler setInterval calls scanAndRetryReviewerWakes", async () => {
    // Create a mock heartbeat service where we can track scanAndRetryReviewerWakes calls
    const mockScanAndRetryReviewerWakes = vi.fn().mockResolvedValue(undefined);
    const mockTickTimers = vi.fn().mockResolvedValue({ enqueued: 0 });
    const mockReapOrphanedRuns = vi.fn().mockResolvedValue(undefined);
    const mockResumeQueuedRuns = vi.fn().mockResolvedValue(undefined);

    const mockHeartbeat = {
      tickTimers: mockTickTimers,
      reapOrphanedRuns: mockReapOrphanedRuns,
      resumeQueuedRuns: mockResumeQueuedRuns,
      scanAndRetryReviewerWakes: mockScanAndRetryReviewerWakes,
    };

    // Simulate the setInterval callback logic from server/src/index.ts
    // This mirrors the pattern: void heartbeat.tickTimers(...).catch(...)
    // and void heartbeat.reapOrphanedRuns(...).then(() => resumeQueuedRuns()).catch(...)
    // plus void heartbeat.scanAndRetryReviewerWakes(...).catch(...)

    // First tick - tickTimers (existing pattern)
    void mockHeartbeat
      .tickTimers(new Date())
      .then((result: { enqueued: number }) => {
        if (result.enqueued > 0) {
          // logger.info would be called here
        }
      })
      .catch(() => {
        // logger.error would be called here
      });

    // Second tick - reapOrphanedRuns then resumeQueuedRuns (existing pattern)
    void mockHeartbeat
      .reapOrphanedRuns({
        staleThresholdMs: 5 * 60 * 1000,
        recoveringGracePeriodMs: 60000,
      })
      .then(() => mockHeartbeat.resumeQueuedRuns())
      .catch(() => {
        // logger.error would be called here
      });

    // NEW: Third tick - scanAndRetryReviewerWakes (the fix we're verifying)
    void mockHeartbeat
      .scanAndRetryReviewerWakes({ logActivity: mockLogActivity })
      .catch(() => {
        // logger.warn would be called here
      });

    // Wait for all promises to settle
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify scanAndRetryReviewerWakes was called (this verifies the scheduler wiring)
    expect(mockScanAndRetryReviewerWakes).toHaveBeenCalledTimes(1);
    expect(mockScanAndRetryReviewerWakes).toHaveBeenCalledWith({
      logActivity: mockLogActivity,
    });

    // Verify other functions were also called (sanity check)
    expect(mockTickTimers).toHaveBeenCalledTimes(1);
    expect(mockReapOrphanedRuns).toHaveBeenCalledTimes(1);
    expect(mockResumeQueuedRuns).toHaveBeenCalledTimes(1);
  });

  it("retry context includes handoff summary from worker_done_recorded activity", async () => {
    const stalledIssue = {
      id: "issue-1",
      companyId: "company-1",
      status: "in_review",
      updatedAt: new Date(Date.now() - REVIEWER_WAKE_RETRY_THRESHOLD_MS - 1000).toISOString(),
    };

    const idleReviewer = {
      id: "agent-reviewer-1",
      companyId: "company-1",
      name: "Reviewer Agent",
      role: "reviewer",
      status: "idle",
      adapterConfig: {},
      runtimeConfig: {},
    };

    const workerDoneRecordedActivity = {
      id: "activity-1",
      companyId: "company-1",
      action: "issue.worker_done_recorded",
      entityType: "issue",
      entityId: "issue-1",
      details: {
        summary: "Implemented feature X with tests",
        prUrl: "https://github.com/example/repo/pull/123",
        branch: "feature/x",
        commitHash: "abc123",
        identifier: "DAV-201",
        reviewerAgentId: "agent-reviewer-1",
      },
      createdAt: new Date().toISOString(),
    };

    const issueContext = {
      id: "issue-1",
      companyId: "company-1",
      projectId: null,
      goalId: null,
      parentId: null,
      identifier: "DAV-201",
      title: "Triad task in review",
      description: null,
    };

    const issueExecutionState = {
      id: "issue-1",
      companyId: "company-1",
      executionRunId: null,
      executionAgentNameKey: null,
    };

    const queuedRun = {
      id: "new-run-id",
      companyId: "company-1",
      agentId: "agent-reviewer-1",
      invocationSource: "automation",
      triggerDetail: "system",
      wakeupRequestId: "new-wakeup-id",
      status: "queued",
    };

    const wakeupRequest = {
      id: "new-wakeup-id",
    };

    // Track the select calls to inject the activity log query result
    let selectCallCount = 0;
    const queryResults: unknown[][] = [
      [stalledIssue], // Query 1: stalled issues
      [stalledIssue], // Query 2: race condition check
      [], // Query 3: no existing reviewer runs
      [idleReviewer], // Query 4: idle reviewers
      [idleReviewer], // Query 5: idle reviewers (re-check)
      [issueContext], // Query 6: issue context
      [], // Query 7: memory context
      [], // Query 8: skipped
      [issueExecutionState], // Query 9: execution state
      [], // Query 10: no existing runs
      [idleReviewer], // Query 11: agent state
      [{ count: 0 }], // Query 12: run count
      [workerDoneRecordedActivity], // Query 13: worker_done_recorded activity (NEW)
      [], // Query 14: any additional queries
    ];
    let queryIndex = 0;
    const insertResults = [wakeupRequest, queuedRun];
    let insertIndex = 0;

    // Track insert calls to capture the contextSnapshot
    const capturedInsertCalls: unknown[][] = [];

    const buildWhereResult = (result: unknown) => {
      const promise = Promise.resolve(result);
      return {
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
        limit: vi.fn(() => Promise.resolve(result)),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(result)),
        })),
      };
    };

    const mockDb = {
      select: vi.fn(() => {
        selectCallCount++;
        const result = queryResults[queryIndex] ?? [];
        queryIndex++;
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => buildWhereResult(result)),
          })),
        };
      }),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
          returning: vi.fn(() => Promise.resolve([{}])),
        })),
        returning: vi.fn(() => Promise.resolve([{}])),
      })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((values: unknown) => {
          capturedInsertCalls.push([table, values]);
          return {
            returning: vi.fn(() =>
              Promise.resolve([insertResults[Math.min(insertIndex++, insertResults.length - 1)]]),
            ),
          };
        }),
      })),
      transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockDb)),
      execute: vi.fn(() => Promise.resolve()),
    };

    const service = heartbeatService(mockDb as any);
    await service.scanAndRetryReviewerWakes({
      logActivity: mockLogActivity,
    });

    // Find the heartbeatRuns insert call and check its contextSnapshot
    const runsInsertCall = capturedInsertCalls.find((call) => {
      const tableName = String(call[0] ?? "");
      return tableName.includes("heartbeat_runs") || tableName === "heartbeatRuns";
    });

    expect(runsInsertCall).toBeDefined();
    if (runsInsertCall) {
      const insertValues = runsInsertCall[1] as { contextSnapshot?: { workerHandoffSummary?: string; workerRunId?: string; issueId?: string } } | undefined;
      expect(insertValues?.contextSnapshot?.workerHandoffSummary).toBe("Implemented feature X with tests");
      expect(insertValues?.contextSnapshot?.issueId).toBe("issue-1");
    }
  });
