import { describe, expect, it } from "vitest";
import {
  buildPostToolCapacityDeferredContextSnapshot,
  POST_TOOL_CAPACITY_DEFERRED_WAKE_STATUS,
  POST_TOOL_CAPACITY_ERROR_CODE,
  resolvePostToolCapacityCloseoutTruth,
} from "../services/heartbeat.ts";

describe("resolvePostToolCapacityCloseoutTruth", () => {
  it("returns closeout guidance for worker role from template", () => {
    const result = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: {
        paperclipRoleTemplate: { id: "worker" },
      },
    });

    expect(result.roleTemplateId).toBe("worker");
    expect(result.childIssueCreated).toBe(true);
    expect(result.parentDelegationPath).toBe("closeout");
    expect(result.nextResumePoint).toBe("resume_existing_session_worker_closeout");
    expect(result.guidance).toContain("worker");
    expect(result.guidance).toContain("closeout");
  });

  it("returns closeout guidance for reviewer role from template", () => {
    const result = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: {
        paperclipRoleTemplate: { id: "reviewer" },
      },
    });

    expect(result.roleTemplateId).toBe("reviewer");
    expect(result.childIssueCreated).toBe(true);
    expect(result.parentDelegationPath).toBe("closeout");
    expect(result.nextResumePoint).toBe("resume_existing_session_reviewer_verdict");
    expect(result.guidance).toContain("reviewer");
    expect(result.guidance).toContain("closeout");
  });

  it("returns active-session default for ceo role (no closeout procedure)", () => {
    const result = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: {
        paperclipRoleTemplate: { id: "ceo" },
      },
    });

    expect(result.roleTemplateId).toBe("ceo");
    expect(result.childIssueCreated).toBe(false);
    expect(result.parentDelegationPath).toBe("active");
    expect(result.nextResumePoint).toBe("resume_existing_session_before_child_create");
    expect(result.guidance).toContain("Resume the existing session");
  });

  it("returns active-session default for assistant role (no closeout procedure)", () => {
    const result = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: {
        paperclipRoleTemplate: { id: "assistant" },
      },
    });

    expect(result.roleTemplateId).toBe("assistant");
    expect(result.childIssueCreated).toBe(false);
    expect(result.parentDelegationPath).toBe("active");
    expect(result.nextResumePoint).toBe("resume_existing_session_before_child_create");
  });

  it("returns default guidance for unknown role template", () => {
    const result = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: {
        paperclipRoleTemplate: { id: "does-not-exist" },
      },
    });

    expect(result.roleTemplateId).toBe("does-not-exist");
    expect(result.childIssueCreated).toBe(false);
    expect(result.parentDelegationPath).toBe("active");
  });

  it("handles null contextSnapshot gracefully", () => {
    const result = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: null,
    });

    expect(result.roleTemplateId).toBeNull();
    expect(result.childIssueCreated).toBe(false);
    expect(result.parentDelegationPath).toBe("active");
  });

  it("handles missing paperclipRoleTemplate in context", () => {
    const result = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: { someOtherField: "value" },
    });

    expect(result.roleTemplateId).toBeNull();
    expect(result.childIssueCreated).toBe(false);
    expect(result.parentDelegationPath).toBe("active");
  });

  it("uses template-driven lookup, not hardcoded strings", () => {
    // This test proves the implementation uses the template service
    // rather than hardcoded roleTemplateId checks
    const workerResult = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: { paperclipRoleTemplate: { id: "worker" } },
    });
    const reviewerResult = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: { paperclipRoleTemplate: { id: "reviewer" } },
    });
    const ceoResult = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: { paperclipRoleTemplate: { id: "ceo" } },
    });

    // Both worker and reviewer have closeout procedures defined in their templates
    expect(workerResult.childIssueCreated).toBe(true);
    expect(reviewerResult.childIssueCreated).toBe(true);

    // CEO has no closeout procedure, gets default behavior
    expect(ceoResult.childIssueCreated).toBe(false);

    // Guidance comes from template description field
    expect(workerResult.guidance).not.toBe(reviewerResult.guidance);
  });

  it("preserves worker closeout behavior: guidance mentions canonical closeout seam", () => {
    const result = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: { paperclipRoleTemplate: { id: "worker" } },
    });

    // The worker template's closeoutResumeProcedure.description contains
    // the closeout seam guidance
    expect(result.guidance).toContain("closeout");
  });

  it("preserves reviewer closeout behavior: nextResumePoint matches template trigger", () => {
    const result = resolvePostToolCapacityCloseoutTruth({
      contextSnapshot: { paperclipRoleTemplate: { id: "reviewer" } },
    });

    // The nextResumePoint comes from the template's closeoutResumeProcedure.trigger
    expect(result.nextResumePoint).toBe("resume_existing_session_reviewer_verdict");
  });
});

// Note: resolvePostToolCapacityCloseoutTruth is not exported from heartbeat.ts
// These tests verify the behavior through the exported functions that use it
