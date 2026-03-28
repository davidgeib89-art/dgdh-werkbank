import { describe, expect, it, vi, beforeEach } from "vitest";
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
});
