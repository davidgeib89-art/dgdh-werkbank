import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  listRoleTemplateSummaries,
  resolveAssignedRoleTemplate,
} from "../services/role-templates.ts";

describe("resolveAssignedRoleTemplate", () => {
  it("lists the current canonical role templates for the dashboard", () => {
    const result = listRoleTemplateSummaries();

    expect(result).toEqual([
      expect.objectContaining({
        id: "assistant",
        version: "v1",
        label: "Assistant",
      }),
      expect.objectContaining({ id: "ceo", version: "v1", label: "CEO" }),
      expect.objectContaining({
        id: "reviewer",
        version: "v1",
        label: "Reviewer",
      }),
      expect.objectContaining({
        id: "worker",
        version: "v1",
        label: "Worker",
      }),
    ]);
  });

  it("loads the canonical worker template and renders a prompt", () => {
    const result = resolveAssignedRoleTemplate({
      roleTemplateId: "worker",
    });

    expect(result.error).toBeNull();
    expect(result.assigned).not.toBeNull();
    expect(result.assigned?.template.id).toBe("worker");
    expect(result.assigned?.template.version).toBe("v1");
    expect(result.assigned?.prompt).toContain(
      "Canonical role template: Worker (worker@v1)",
    );
    expect(result.assigned?.prompt).toContain(
      "You are the Worker role for David Geib Digitales Handwerk",
    );
    expect(result.assigned?.prompt).toContain("1. Locate");
    expect(result.assigned?.prompt).toContain("2. Hypothesize");
    expect(result.assigned?.prompt).toContain("4. Validate");
    expect(result.assigned?.prompt).toContain("3. Evidence");
    expect(result.assigned?.prompt).toContain("7. Next");
  });

  it("appends the operator add-on prompt without replacing the template", () => {
    const result = resolveAssignedRoleTemplate({
      roleTemplateId: "worker",
      roleAppendPrompt: "Prefer documentation-first outputs when in doubt.",
    });

    expect(result.error).toBeNull();
    expect(result.assigned?.prompt).toContain("Operator add-on:");
    expect(result.assigned?.prompt).toContain(
      "Prefer documentation-first outputs when in doubt.",
    );
    expect(result.assigned?.prompt).toContain(
      "You are the Worker role for David Geib Digitales Handwerk",
    );
  });

  it("loads the canonical reviewer template with strict acceptance rules", () => {
    const result = resolveAssignedRoleTemplate({
      roleTemplateId: "reviewer",
    });

    expect(result.error).toBeNull();
    expect(result.assigned?.template.id).toBe("reviewer");
    expect(result.assigned?.prompt).toContain(
      "Allowed verdicts are exactly: accepted | changes_requested.",
    );
    expect(result.assigned?.prompt).toContain(
      "What to check explicitly:",
    );
    expect(result.assigned?.prompt).toContain("- Ziel:");
    expect(result.assigned?.prompt).toContain("- Scope:");
    expect(result.assigned?.prompt).toContain("- doneWhen:");
    expect(result.assigned?.prompt).toContain("- Semantic Compliance: Does the outcome truly and substantially hit the mission");
    expect(result.assigned?.prompt).toContain("- Point-by-point verification: Are explicitly required points really implemented");
    expect(result.assigned?.prompt).toContain("- Evidence:");
    expect(result.assigned?.prompt).toContain("Simplicity criterion:");
    expect(result.assigned?.prompt).toContain(
      "accepted is allowed only when doneWhen is not just formally met, but semantically and substantially fulfilled.",
    );
    expect(result.assigned?.prompt).toContain(
      "For changes_requested, provide at most 3 concrete fix points.",
    );
    expect(result.assigned?.prompt).toContain(
      "After final verdict, call POST /api/issues/PAPERCLIP_TASK_ID/reviewer-verdict.",
    );
    expect(result.assigned?.prompt).toContain(
      "accepted -> approved",
    );
    expect(result.assigned?.prompt).toContain(
      "changes_requested -> changes_requested",
    );
    expect(result.assigned?.template.constraints).toContain(
      "Check semantic compliance point-by-point against the mission and doneWhen. Reject superficial compliance.",
    );
    expect(result.assigned?.template.constraints).toContain(
      "Do not accept results with unsupported claims, source drift, scope drift, or weak/superficial substitute logic.",
    );
    expect(result.assigned?.template.constraints).toContain(
      "For changes_requested, provide no more than 3 concrete and actionable fixes.",
    );
    expect(result.assigned?.template.constraints).toContain(
      "Persist the reviewer verdict via POST /api/issues/:id/reviewer-verdict.",
    );
  });

  it("loads the canonical ceo template with constitution check and packet schema", () => {
    const result = resolveAssignedRoleTemplate({
      roleTemplateId: "ceo",
    });

    expect(result.error).toBeNull();
    expect(result.assigned?.template.id).toBe("ceo");
    expect(result.assigned?.prompt).toContain("Constitution check");
    expect(result.assigned?.prompt).toContain("[NEEDS INPUT]");
    expect(result.assigned?.prompt).toContain("doneWhen");
    expect(result.assigned?.prompt).toContain(
      "Read at most 3-5 directly relevant files",
    );
    expect(result.assigned?.prompt).toContain(
      "Create real child issues in Paperclip",
    );
    expect(result.assigned?.prompt).toContain(
      "Do not search for a `pc` or `paperclip` CLI.",
    );
    expect(result.assigned?.prompt).toContain(
      "Execute the issue creation calls. Do not merely print sample commands",
    );
    expect(result.assigned?.prompt).toContain(
      "fetch available agents with GET /api/companies/PAPERCLIP_COMPANY_ID/agents",
    );
    expect(result.assigned?.prompt).toContain(
      "adapterConfig.roleTemplateId == \"worker\" and status == \"idle\"",
    );
    expect(result.assigned?.prompt).toContain(
      "set status to \"todo\" in the create request body",
    );
    expect(result.assigned?.prompt).toContain("status: todo");
    expect(result.assigned?.prompt).toContain("[NEEDS WORKER]");
    expect(result.assigned?.prompt).toContain("Direct Answer Mode");
    expect(result.assigned?.prompt).toContain(
      "If the mission stays inside thinking, deciding, delegating, or aggregating",
    );
    expect(result.assigned?.prompt).toContain("executionIntent: implement");
    expect(result.assigned?.prompt).toContain("reviewPolicy: required");
  });

  it("ceo template contains aggregation mode instructions", () => {
    const result = resolveAssignedRoleTemplate({
      roleTemplateId: "ceo",
    });

    expect(result.error).toBeNull();
    expect(result.assigned?.prompt).toContain("Aggregation Mode");
    expect(result.assigned?.prompt).toContain("parentId");
    expect(result.assigned?.prompt).toContain(
      "GET /api/companies/PAPERCLIP_COMPANY_ID/issues?parentId=PAPERCLIP_TASK_ID",
    );
    expect(result.assigned?.prompt).toContain(
      "GET /api/issues/CHILD_ISSUE_ID/approvals",
    );
    expect(result.assigned?.prompt).toContain(
      "latest review approval status is approved",
    );
    expect(result.assigned?.prompt).toContain(
      "review-optional child is complete only when its issue status is done",
    );
    expect(result.assigned?.template.constraints).toContain(
      "Aggregation Mode: MUST execute GET /api/companies/.../issues?parentId=... before any decision. Do not trust injected context for child statuses. The API call is mandatory and non-optional. Do not create new packets if all children are already done.",
    );
    expect(result.assigned?.template.constraints).toContain(
      "Aggregation Mode: A child with reviewPolicy optional is complete only when status=done; review-required children still require latest approval status=approved.",
    );
    expect(result.assigned?.template.constraints).toContain(
      "If and only if all child packets are complete under policy, PATCH parent issue status to done and report the mission complete.",
    );
    expect(result.assigned?.template.constraints).toContain(
      "After creating child issues, fetch /api/companies/{companyId}/agents and assign each packet to an idle worker (adapterConfig.roleTemplateId == worker) when available.",
    );
    expect(result.assigned?.template.constraints).toContain(
      "If a packet should start immediately, create it with status=todo because backlog intentionally blocks assignment-triggered wakeup.",
    );
    expect(result.assigned?.template.constraints).toContain(
      "If no idle worker is available, keep packet unassigned and report [NEEDS WORKER] in the handoff.",
    );
    expect(result.assigned?.template.constraints).toContain(
      "Direct Answer Mode is allowed only for thinking, deciding, prioritizing, packetizing, or aggregating work with no code, file, git, PR, merge, or implementation artifact.",
    );
    expect(result.assigned?.template.constraints).toContain(
      "Implementation, file-change, code, git, PR, merge, or concrete artifact work must be delegated and stays review-required by default.",
    );
  });

  it("loads the canonical assistant template with bounded packet planning handoff", () => {
    const result = resolveAssignedRoleTemplate({
      roleTemplateId: "assistant",
    });

    expect(result.error).toBeNull();
    expect(result.assigned?.template.id).toBe("assistant");
    expect(result.assigned?.template.operatingMode).toBe("planning");
    expect(result.assigned?.template.defaultExecutionIntent).toBe("plan");
    expect(result.assigned?.template.defaultNeedsReview).toBe(false);
    expect(result.assigned?.prompt).toContain(
      "You are the Assistant role for David Geib Digitales Handwerk",
    );
    expect(result.assigned?.prompt).toContain(
      "Read at most 5 directly relevant files.",
    );
    expect(result.assigned?.prompt).toContain(
      "Decompose into exactly 2-4 worker packets.",
    );
    expect(result.assigned?.prompt).toContain(
      "No issue creation. CEO creates issues after your handoff.",
    );
    expect(result.assigned?.prompt).toContain(
      "Finish every run with this exact handoff format:",
    );
    expect(result.assigned?.prompt).toContain("1. Delegation:");
    expect(result.assigned?.prompt).toContain("3. packetType je Packet:");
    expect(result.assigned?.prompt).toContain("packetType: free_api");
    expect(result.assigned?.prompt).toContain("needsReview: true");
  });

  it("assistant template file declares premium_model packetType", () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const templatePath = path.resolve(
      testDir,
      "../../config/role-templates/assistant.json",
    );
    const parsed = JSON.parse(fs.readFileSync(templatePath, "utf8")) as {
      packetType?: string;
    };

    expect(parsed.packetType).toBe("premium_model");
  });

  it("reviewer handoff format is structured in the prompt", () => {
    const result = resolveAssignedRoleTemplate({
      roleTemplateId: "reviewer",
    });

    expect(result.error).toBeNull();
    expect(result.assigned?.prompt).toContain(
      "1. Packet",
    );
    expect(result.assigned?.prompt).toContain(
      "2. Verdict: accepted | changes_requested",
    );
    expect(result.assigned?.prompt).toContain(
      "3. doneWhen Check",
    );
    expect(result.assigned?.prompt).toContain(
      "4. Evidence",
    );
    expect(result.assigned?.prompt).toContain(
      "5. Required Fixes",
    );
    expect(result.assigned?.prompt).toContain(
      "6. Next",
    );
  });

  it("returns a clear error for unknown templates", () => {
    const result = resolveAssignedRoleTemplate({
      roleTemplateId: "does-not-exist",
    });

    expect(result.assigned).toBeNull();
    expect(result.error).toContain('Role template "does-not-exist" was not found');
  });
});
