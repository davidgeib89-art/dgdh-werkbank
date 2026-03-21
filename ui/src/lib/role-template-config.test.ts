import { describe, expect, it } from "vitest";
import { withRoleTemplateAdapterConfig } from "./role-template-config";

describe("withRoleTemplateAdapterConfig", () => {
  it("adds canonical role fields when provided", () => {
    expect(
      withRoleTemplateAdapterConfig(
        { model: "gemini-2.5-flash" },
        {
          roleTemplateId: "worker",
          roleAppendPrompt: "Keep outputs compact.",
        },
      ),
    ).toEqual({
      model: "gemini-2.5-flash",
      roleTemplateId: "worker",
      roleAppendPrompt: "Keep outputs compact.",
    });
  });

  it("omits empty role fields", () => {
    expect(
      withRoleTemplateAdapterConfig(
        { model: "gemini-2.5-flash" },
        {
          roleTemplateId: "   ",
          roleAppendPrompt: "",
        },
      ),
    ).toEqual({
      model: "gemini-2.5-flash",
    });
  });
});
