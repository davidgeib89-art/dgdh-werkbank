import { describe, it, expect } from "vitest";
import {
  validateIssueStatusTransition,
  type IssueStatusTransition,
} from "./issue.js";
import type { IssueStatus } from "../constants.js";

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
