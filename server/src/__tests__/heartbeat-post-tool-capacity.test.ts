import { describe, expect, it } from "vitest";
import {
  buildPostToolCapacityDeferredContextSnapshot,
  POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS,
} from "../services/heartbeat.ts";

describe("buildPostToolCapacityDeferredContextSnapshot", () => {
  it("sets resume flag and increments counter on first resume", () => {
    const result = buildPostToolCapacityDeferredContextSnapshot({
      contextSnapshot: {},
      source: "automation",
      triggerDetail: "system",
      cooldownUntil: "2026-03-28T15:00:00.000Z",
      closeout: {
        roleTemplateId: "ceo",
        childIssueCreated: false,
        parentDelegationPath: "active",
        nextResumePoint: "resume_existing_session_before_child_create",
        guidance: "Resume before child create",
      },
    });

    expect(result.postToolCapacityResume).toBe(true);
    expect(result.postToolCapacityResumeCount).toBe(1);
    expect(result.forceFreshSession).toBeUndefined();
    expect(result.wakeReason).toBe("post_tool_capacity_resume");
  });

  it("increments counter to 2 on second resume", () => {
    const result = buildPostToolCapacityDeferredContextSnapshot({
      contextSnapshot: { postToolCapacityResumeCount: 1 },
      source: "automation",
      triggerDetail: "system",
      cooldownUntil: "2026-03-28T15:00:00.000Z",
      closeout: {
        roleTemplateId: "ceo",
        childIssueCreated: false,
        parentDelegationPath: "active",
        nextResumePoint: "resume_existing_session_before_child_create",
        guidance: "Resume before child create",
      },
    });

    expect(result.postToolCapacityResumeCount).toBe(2);
    expect(result.forceFreshSession).toBeUndefined();
    expect(result.postToolCapacityResume).toBe(true);
  });

  it("DAV-167 fix: forces fresh session after 2 consecutive capacity resumes", () => {
    // DAV-167 root cause fix: After 2 consecutive capacity resumes, force fresh session
    // to break the misleading same-session cooldown/retry spiral
    const result = buildPostToolCapacityDeferredContextSnapshot({
      contextSnapshot: { postToolCapacityResumeCount: 2 },
      source: "automation",
      triggerDetail: "system",
      cooldownUntil: "2026-03-28T15:00:00.000Z",
      closeout: {
        roleTemplateId: "ceo",
        childIssueCreated: false,
        parentDelegationPath: "active",
        nextResumePoint: "resume_existing_session_before_child_create",
        guidance: "Resume before child create",
      },
    });

    // Third resume forces fresh session to break loop
    expect(result.forceFreshSession).toBe(true);
    expect(result.postToolCapacityResumeCount).toBe(0); // Reset for fresh session
    expect(result.postToolCapacityResume).toBeUndefined(); // Allow normal routing
    expect(result.wakeReason).toBe("post_tool_capacity_resume");
  });

  it("resets counter for fresh session and preserves other context", () => {
    const result = buildPostToolCapacityDeferredContextSnapshot({
      contextSnapshot: {
        postToolCapacityResumeCount: 2,
        someOtherField: "preserved",
        paperclipRoleTemplate: { id: "ceo" },
      },
      source: "assignment",
      triggerDetail: "manual",
      cooldownUntil: "2026-03-28T15:30:00.000Z",
      closeout: {
        roleTemplateId: "worker",
        childIssueCreated: true,
        parentDelegationPath: "closeout",
        nextResumePoint: "resume_existing_session_worker_closeout",
        guidance: "Worker closeout resume",
      },
    });

    expect(result.forceFreshSession).toBe(true);
    expect(result.postToolCapacityResumeCount).toBe(0);
    expect(result.someOtherField).toBe("preserved");
    expect(result.paperclipRoleTemplate).toEqual({ id: "ceo" });
    expect(result.wakeReason).toBe("post_tool_capacity_resume");
  });

  it("handles undefined/NaN resume count as 0", () => {
    const result = buildPostToolCapacityDeferredContextSnapshot({
      contextSnapshot: { postToolCapacityResumeCount: NaN },
      source: "automation",
      triggerDetail: "system",
      cooldownUntil: "2026-03-28T15:00:00.000Z",
      closeout: {
        roleTemplateId: "reviewer",
        childIssueCreated: true,
        parentDelegationPath: "closeout",
        nextResumePoint: "resume_existing_session_reviewer_verdict",
        guidance: "Reviewer verdict resume",
      },
    });

    expect(result.postToolCapacityResumeCount).toBe(1);
    expect(result.postToolCapacityResume).toBe(true);
    expect(result.forceFreshSession).toBeUndefined();
  });
});
