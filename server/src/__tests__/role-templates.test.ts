import { describe, expect, it } from "vitest";
import { resolveAssignedRoleTemplate } from "../services/role-templates.ts";

describe("resolveAssignedRoleTemplate", () => {
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

  it("returns a clear error for unknown templates", () => {
    const result = resolveAssignedRoleTemplate({
      roleTemplateId: "does-not-exist",
    });

    expect(result.assigned).toBeNull();
    expect(result.error).toContain('Role template "does-not-exist" was not found');
  });
});
