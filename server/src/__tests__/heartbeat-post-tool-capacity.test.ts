import { describe, expect, it } from "vitest";
import {
  buildPostToolCapacityDeferredContextSnapshot,
  buildPostToolCapacityResumeWakeMetadata,
  POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS,
  POST_TOOL_CAPACITY_ERROR_CODE,
  isPostToolCapacityWakeReady,
  readPostToolCapacityState,
  resolveRunStartSessionIdBefore,
  resolvePostToolCapacityResumeSessionId,
  resolvePostToolCapacityCooldownSec,
  shouldRetryFailedPostToolCapacityWake,
} from "../services/heartbeat.ts";

describe("post-tool capacity helpers", () => {
  it("reads structured post-tool capacity state from adapter resultJson", () => {
    const state = readPostToolCapacityState({
      errorCode: POST_TOOL_CAPACITY_ERROR_CODE,
      resultJson: {
        type: POST_TOOL_CAPACITY_ERROR_CODE,
        message: "You have exhausted your capacity on this model. Try again later.",
        capacity: {
          toolCallCount: 2,
          toolResultCount: 2,
          successfulToolResultCount: 2,
          failedToolResultCount: 0,
          firstSuccessfulToolName: "run_shell_command",
          lastSuccessfulToolName: "run_shell_command",
        },
      },
      sessionId: "session-123",
      issueId: "issue-123",
      taskKey: "issue:issue-123",
    });

    expect(state).toEqual({
      toolCallCount: 2,
      toolResultCount: 2,
      successfulToolResultCount: 2,
      failedToolResultCount: 0,
      firstSuccessfulToolName: "run_shell_command",
      lastSuccessfulToolName: "run_shell_command",
      sessionId: "session-123",
      issueId: "issue-123",
      taskKey: "issue:issue-123",
      message: "You have exhausted your capacity on this model. Try again later.",
    });
  });

  it("returns null for unrelated adapter failures", () => {
    expect(
      readPostToolCapacityState({
        errorCode: "adapter_failed",
        resultJson: {
          type: "error",
          message: "generic failure",
        },
      }),
    ).toBeNull();
  });

  it("gates deferred wakes on notBefore timestamps", () => {
    expect(
      isPostToolCapacityWakeReady(
        {
          resumeKind: "post_tool_capacity",
          notBefore: "2026-03-25T10:05:00.000Z",
        },
        new Date("2026-03-25T10:04:59.000Z"),
      ),
    ).toBe(false);
    expect(
      isPostToolCapacityWakeReady(
        {
          resumeKind: "post_tool_capacity",
          notBefore: "2026-03-25T10:05:00.000Z",
          nextWakeStatus: POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS,
        },
        new Date("2026-03-25T10:05:00.000Z"),
      ),
    ).toBe(true);
  });

  it("clamps cooldown seconds to a safe bounded default", () => {
    expect(resolvePostToolCapacityCooldownSec({})).toBe(180);
    expect(
      resolvePostToolCapacityCooldownSec({
        heartbeat: { postToolCapacityCooldownSec: 5 },
      }),
    ).toBe(30);
    expect(
      resolvePostToolCapacityCooldownSec({
        heartbeat: { postToolCapacityCooldownSec: 1200 },
      }),
    ).toBe(900);
  });

  it("sanitizes deferred resume context so session reuse can actually happen", () => {
    expect(
      buildPostToolCapacityDeferredContextSnapshot({
        contextSnapshot: {
          wakeReason: "issue_assigned",
          wakeSource: "assignment",
          wakeTriggerDetail: "system",
          forceFreshSession: true,
          untouched: "keep-me",
        },
        source: "automation",
        triggerDetail: "system",
        cooldownUntil: "2026-03-25T10:05:00.000Z",
        closeout: {
          roleTemplateId: "worker",
          childIssueCreated: true,
          parentDelegationPath: "closeout",
          nextResumePoint: "resume_existing_session_worker_closeout",
          guidance: "Finish canonical worker closeout first.",
        },
      }),
    ).toEqual({
      wakeReason: "post_tool_capacity_resume",
      wakeSource: "automation",
      wakeTriggerDetail: "system",
      postToolCapacityResume: true,
      postToolCapacityCooldownUntil: "2026-03-25T10:05:00.000Z",
      paperclipPostToolCapacityCloseout: {
        roleTemplateId: "worker",
        childIssueCreated: true,
        parentDelegationPath: "closeout",
        nextResumePoint: "resume_existing_session_worker_closeout",
        guidance: "Finish canonical worker closeout first.",
      },
      untouched: "keep-me",
    });
  });

  it("forces scheduler-owned wake metadata while preserving the original wake source", () => {
    expect(
      buildPostToolCapacityResumeWakeMetadata({
        source: "assignment",
        triggerDetail: "manual",
      }),
    ).toEqual({
      source: "automation",
      triggerDetail: "system",
      originalSource: "assignment",
      originalTriggerDetail: "manual",
    });
  });

  it("retries failed deferred wakes only for process_lost on still-promotable issues", () => {
    expect(
      shouldRetryFailedPostToolCapacityWake({
        wakeStatus: "failed",
        payload: {
          resumeKind: "post_tool_capacity",
        },
        runErrorCode: "process_lost",
        issueStatus: "todo",
        executionRunId: null,
      }),
    ).toBe(true);

    expect(
      shouldRetryFailedPostToolCapacityWake({
        wakeStatus: "failed",
        payload: {
          resumeKind: "post_tool_capacity",
        },
        runErrorCode: "adapter_failed",
        issueStatus: "todo",
        executionRunId: null,
      }),
    ).toBe(false);

    expect(
      shouldRetryFailedPostToolCapacityWake({
        wakeStatus: "failed",
        payload: {
          resumeKind: "post_tool_capacity",
        },
        runErrorCode: "process_lost",
        issueStatus: "done",
        executionRunId: null,
      }),
    ).toBe(false);
  });

  it("falls back to the deferred wake payload session when task-session lookup is empty", () => {
    expect(
      resolvePostToolCapacityResumeSessionId({
        resolvedSessionBefore: null,
        payload: {
          sessionId: "session-from-wake",
        },
      }),
    ).toBe("session-from-wake");

    expect(
      resolvePostToolCapacityResumeSessionId({
        resolvedSessionBefore: "task-session-id",
        payload: {
          sessionId: "session-from-wake",
        },
      }),
    ).toBe("task-session-id");
  });

  it("preserves queued resume sessionIdBefore when runtime still asks for a fresh adapter session", () => {
    expect(
      resolveRunStartSessionIdBefore({
        existingSessionIdBefore: "queued-session",
        runtimeSessionDisplayId: null,
        runtimeSessionId: null,
      }),
    ).toBe("queued-session");

    expect(
      resolveRunStartSessionIdBefore({
        existingSessionIdBefore: "queued-session",
        runtimeSessionDisplayId: "runtime-display",
        runtimeSessionId: null,
      }),
    ).toBe("runtime-display");
  });
});
