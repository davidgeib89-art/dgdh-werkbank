import { afterEach, describe, expect, it } from "vitest";
import { listGeminiModels } from "@paperclipai/adapter-gemini-local/server";

const ORIGINAL_PAPERCLIP_GEMINI_MODELS = process.env.PAPERCLIP_GEMINI_MODELS;
const ORIGINAL_GEMINI_MODELS = process.env.GEMINI_MODELS;

afterEach(() => {
  if (ORIGINAL_PAPERCLIP_GEMINI_MODELS === undefined) {
    delete process.env.PAPERCLIP_GEMINI_MODELS;
  } else {
    process.env.PAPERCLIP_GEMINI_MODELS = ORIGINAL_PAPERCLIP_GEMINI_MODELS;
  }

  if (ORIGINAL_GEMINI_MODELS === undefined) {
    delete process.env.GEMINI_MODELS;
  } else {
    process.env.GEMINI_MODELS = ORIGINAL_GEMINI_MODELS;
  }
});

describe("gemini local model catalog", () => {
  it("includes auto and known fallback models", async () => {
    delete process.env.PAPERCLIP_GEMINI_MODELS;
    delete process.env.GEMINI_MODELS;

    const models = await listGeminiModels();
    expect(models.some((model) => model.id === "auto")).toBe(true);
    expect(models.some((model) => model.id === "gemini-2.5-pro")).toBe(true);
  });

  it("merges comma-delimited and json model overrides without duplicates", async () => {
    process.env.PAPERCLIP_GEMINI_MODELS =
      "gemini-2.5-pro,gemini-2.5-flash-exp,gemini-2.5-flash-exp";
    process.env.GEMINI_MODELS = JSON.stringify([
      "gemini-2.5-flash-preview",
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-custom-enterprise", label: "Gemini Enterprise" },
    ]);

    const models = await listGeminiModels();
    const ids = models.map((model) => model.id);

    expect(ids.filter((id) => id === "gemini-2.5-pro")).toHaveLength(1);
    expect(ids).toContain("gemini-2.5-flash-exp");
    expect(ids).toContain("gemini-2.5-flash-preview");
    expect(ids).toContain("gemini-custom-enterprise");
  });
});
