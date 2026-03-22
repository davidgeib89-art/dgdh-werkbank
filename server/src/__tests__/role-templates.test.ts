import { describe, expect, it } from "vitest";
import {
  listRoleTemplateSummaries,
  resolveAssignedRoleTemplate,
} from "../services/role-templates.ts";

describe("resolveAssignedRoleTemplate", () => {
  it("lists the current canonical role templates for the dashboard", () => {
    const result = listRoleTemplateSummaries();

    expect(result).toEqual([
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
      "Accepted is only allowed when the result satisfies doneWhen",
    );
    expect(result.assigned?.prompt).toContain("Review dimensions:");
    expect(result.assigned?.prompt).toContain("Scope -");
    expect(result.assigned?.prompt).toContain("Safety and Readiness");
    expect(result.assigned?.template.constraints).toContain(
      "Do not accept results with unsupported claims, source drift, or scope drift.",
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
  });

  it("reviewer matrix format is structured in the prompt", () => {
    const result = resolveAssignedRoleTemplate({
      roleTemplateId: "reviewer",
    });

    expect(result.error).toBeNull();
    expect(result.assigned?.prompt).toContain("pass/fail/partial");
    expect(result.assigned?.prompt).toContain("| Scope            |");
  });

  it("returns a clear error for unknown templates", () => {
    const result = resolveAssignedRoleTemplate({
      roleTemplateId: "does-not-exist",
    });

    expect(result.assigned).toBeNull();
    expect(result.error).toContain('Role template "does-not-exist" was not found');
  });
});
