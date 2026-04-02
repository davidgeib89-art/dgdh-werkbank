import { describe, it, expect } from "vitest";
import {
  validateIssueStatusTransition,
  type IssueStatusTransition,
  validateIssuePriority,
  type IssuePriorityValidation,
  validateIssueAssignee,
  type IssueAssigneeValidation,
  type IssueAssigneeValidationResult,
} from "./issue.js";
import type { IssueStatus, IssuePriority } from "../constants.js";

describe("validateIssueStatusTransition", () => {
  // Allowed transitions
  it("allows backlog -> in_progress", () => {
    const result = validateIssueStatusTransition({ from: "backlog", to: "in_progress" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows backlog -> todo", () => {
    const result = validateIssueStatusTransition({ from: "backlog", to: "todo" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows backlog -> cancelled", () => {
    const result = validateIssueStatusTransition({ from: "backlog", to: "cancelled" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows todo -> in_progress", () => {
    const result = validateIssueStatusTransition({ from: "todo", to: "in_progress" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows in_progress -> done", () => {
    const result = validateIssueStatusTransition({ from: "in_progress", to: "done" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows in_progress -> in_review", () => {
    const result = validateIssueStatusTransition({ from: "in_progress", to: "in_review" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows in_review -> done", () => {
    const result = validateIssueStatusTransition({ from: "in_review", to: "done" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  // Blocked transitions
  it("blocks done -> in_progress", () => {
    const result = validateIssueStatusTransition({ from: "done", to: "in_progress" });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("done");
    expect(result.reason).toMatch(/cannot/i);
  });

  it("blocks done -> any status", () => {
    const result = validateIssueStatusTransition({ from: "done", to: "backlog" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("blocks cancelled -> any status", () => {
    const result = validateIssueStatusTransition({ from: "cancelled", to: "backlog" });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/cancelled/i);
  });

  it("blocks invalid transition from todo to done directly", () => {
    const result = validateIssueStatusTransition({ from: "todo", to: "done" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  // Edge cases - same status
  it("allows same status transition (backlog -> backlog)", () => {
    const result = validateIssueStatusTransition({ from: "backlog", to: "backlog" });
    expect(result.valid).toBe(true);
  });

  it("allows same status transition (done -> done)", () => {
    const result = validateIssueStatusTransition({ from: "done", to: "done" });
    expect(result.valid).toBe(true);
  });

  // Invalid statuses
  it("rejects invalid 'from' status", () => {
    const result = validateIssueStatusTransition({
      from: "invalid_status" as IssueStatus,
      to: "backlog",
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/invalid/i);
  });

  it("rejects invalid 'to' status", () => {
    const result = validateIssueStatusTransition({
      from: "backlog",
      to: "invalid_status" as IssueStatus,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/invalid/i);
  });

  // Additional blocked transitions based on ISSUE_STATUS_TRANSITIONS
  it("blocks in_review -> todo", () => {
    const result = validateIssueStatusTransition({ from: "in_review", to: "todo" });
    expect(result.valid).toBe(false);
  });

  it("allows in_review -> in_progress", () => {
    const result = validateIssueStatusTransition({ from: "in_review", to: "in_progress" });
    expect(result.valid).toBe(true);
  });

  it("allows blocked -> in_progress", () => {
    const result = validateIssueStatusTransition({ from: "blocked", to: "in_progress" });
    expect(result.valid).toBe(true);
  });

  it("blocks blocked -> done directly", () => {
    const result = validateIssueStatusTransition({ from: "blocked", to: "done" });
    expect(result.valid).toBe(false);
  });
});

describe("validateIssuePriority", () => {
  // Valid priorities
  it("allows critical priority", () => {
    const result = validateIssuePriority({ priority: "critical" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows high priority", () => {
    const result = validateIssuePriority({ priority: "high" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows medium priority", () => {
    const result = validateIssuePriority({ priority: "medium" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows low priority", () => {
    const result = validateIssuePriority({ priority: "low" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  // Invalid priorities
  it("rejects invalid priority 'urgent'", () => {
    const result = validateIssuePriority({ priority: "urgent" as IssuePriority });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("urgent");
    expect(result.reason).toContain("valid");
  });

  it("rejects empty string priority", () => {
    const result = validateIssuePriority({ priority: "" as IssuePriority });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  // Case sensitivity edge case
  it("rejects case-sensitive priority 'High' (uppercase)", () => {
    const result = validateIssuePriority({ priority: "High" as IssuePriority });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("High");
  });
});

describe("validateIssueAssignee", () => {
  // Valid UUIDs
  it("allows valid UUID format (v4)", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows valid UUID format (v1)", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows valid UUID with uppercase letters (normalized to lowercase)", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "550E8400-E29B-41D4-A716-446655440000" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  // Empty string
  it("rejects empty string with descriptive reason", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "" });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("empty");
  });

  // Malformed UUIDs
  it("rejects malformed UUID 'not-a-uuid'", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "not-a-uuid" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toMatch(/uuid|format/i);
  });

  it("rejects malformed UUID '123'", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "123" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("rejects malformed UUID partial '550e8400'", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "550e8400" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  // Wrong patterns
  it("rejects UUID with missing digit in last group", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "550e8400-e29b-41d4-a716-44665544000" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("rejects UUID with extra digit in last group", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "550e8400-e29b-41d4-a716-4466554400000" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("rejects UUID with wrong separator", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "550e8400_e29b_41d4_a716_446655440000" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("rejects UUID without separators", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "550e8400e29b41d4a716446655440000" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("rejects UUID with special characters", () => {
    const result = validateIssueAssignee({ assigneeAgentId: "550e8400-e29b-41d4-a716-44665544000g" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  // Type exports verification
  it("returns correct type shape for valid result", () => {
    const result: IssueAssigneeValidationResult = validateIssueAssignee({ assigneeAgentId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns correct type shape for invalid result", () => {
    const result: IssueAssigneeValidationResult = validateIssueAssignee({ assigneeAgentId: "invalid" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(typeof result.reason).toBe("string");
  });
});
