import { describe, expect, it } from "vitest";
import {
  buildGeminiDryRunPreflightTelemetry,
  buildGeminiPromptResolverShadowTelemetry,
} from "@paperclipai/adapter-gemini-local/server";

describe("gemini-local adapter dry-run preflight telemetry", () => {
  it("is deterministic for identical input", () => {
    const input = {
      context: {
        executionMode: "dry_run",
        paperclipSingleFileTargetPath:
          "packages/adapters/gemini-local/src/server/models.ts",
      },
      prompt: "Follow the paperclip heartbeat.",
    };

    const first = buildGeminiDryRunPreflightTelemetry(input);
    const second = buildGeminiDryRunPreflightTelemetry(input);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      resolverDecision: "ok",
      reasonCodes: [],
    });
  });

  it("keeps escalated and fail outcomes distinguishable", () => {
    const escalated = buildGeminiDryRunPreflightTelemetry({
      context: {
        executionMode: "dry_run",
        paperclipSingleFileTargetPath:
          "packages/adapters/gemini-local/src/server/models.ts",
        paperclipRequestedTargets: [
          "packages/adapters/gemini-local/src/server/models.ts",
          "server/src/app.ts",
        ],
      },
      prompt: "Follow the paperclip heartbeat.",
    });

    expect(escalated).toMatchObject({
      resolverDecision: "escalated",
      reasonCodes: ["SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS"],
    });

    const failed = buildGeminiDryRunPreflightTelemetry({
      context: {
        executionMode: "dry_run",
        paperclipSingleFileTargetPath:
          "packages/adapters/gemini-local/src/server/models.ts",
        paperclipRequestedTargets: [
          "packages/adapters/gemini-local/src/server/models.ts",
          "server/src/app.ts",
        ],
        paperclipAllowedTools: ["read_file"],
        paperclipBlockedTools: ["read_file"],
      },
      prompt: "Follow the paperclip heartbeat.",
    });

    expect(failed).toMatchObject({ resolverDecision: "fail" });
    expect(failed?.reasonCodes).toEqual(
      expect.arrayContaining([
        "TOOL_CONFLICT",
        "SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS",
      ]),
    );
  });

  it("produces deterministic shadow comparison telemetry", () => {
    const input = {
      context: {
        executionMode: "dry_run",
        isTestRun: true,
      },
      prompt: "Follow the paperclip heartbeat.",
      renderedPrompt: "Follow the paperclip heartbeat.",
    };

    const first = buildGeminiPromptResolverShadowTelemetry(input);
    const second = buildGeminiPromptResolverShadowTelemetry(input);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      resolverPath: {
        resolverDecision: "ok",
        reasonCodes: [],
      },
      comparison: {
        promptsEquivalent: true,
      },
      auditMeta: {
        mode: "shadow",
        readOnly: true,
      },
    });
  });
});
