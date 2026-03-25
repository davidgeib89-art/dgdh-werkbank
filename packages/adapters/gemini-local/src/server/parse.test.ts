import { describe, expect, it } from "vitest";
import {
  detectGeminiCapacityExhausted,
  parseGeminiJsonl,
  isGeminiUnknownSessionError,
} from "./parse.js";

describe("parseGeminiJsonl", () => {
  it("extracts usage from result stats when direct usage fields are missing", () => {
    const stdout = [
      JSON.stringify({
        type: "assistant",
        session_id: "session_123",
        message: {
          text: "Founder snapshot ready.",
        },
      }),
      JSON.stringify({
        type: "result",
        session_id: "session_123",
        status: "success",
        stats: {
          input_tokens: 273971,
          output_tokens: 1165,
          cached: 203960,
        },
      }),
    ].join("\n");

    const parsed = parseGeminiJsonl(stdout);

    expect(parsed.sessionId).toBe("session_123");
    expect(parsed.summary).toBe("Founder snapshot ready.");
    expect(parsed.usage).toEqual({
      inputTokens: 273971,
      cachedInputTokens: 203960,
      outputTokens: 1165,
    });
  });

  it("reconstructs assistant delta output from message events", () => {
    const stdout = [
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: '{\n  "ok":',
        delta: true,
      }),
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: " true\n}",
        delta: true,
      }),
    ].join("\n");

    const parsed = parseGeminiJsonl(stdout);

    expect(parsed.summary).toBe('{\n  "ok": true\n}');
  });

  it("detects unknown session errors", () => {
    expect(isGeminiUnknownSessionError("unknown session id", "")).toBe(true);
    expect(isGeminiUnknownSessionError("all good", "")).toBe(false);
  });

  it("captures successful tool activity before a capacity exhaustion result", () => {
    const stdout = [
      JSON.stringify({
        type: "tool_use",
        tool_use_id: "tool-1",
        tool_name: "run_shell_command",
      }),
      JSON.stringify({
        type: "tool_result",
        tool_use_id: "tool-1",
        status: "success",
      }),
      JSON.stringify({
        type: "result",
        status: "error",
        is_error: true,
        error: "You have exhausted your capacity on this model. Try again later.",
      }),
    ].join("\n");

    const parsed = parseGeminiJsonl(stdout);
    const capacity = detectGeminiCapacityExhausted({
      parsed: parsed.resultEvent,
      stdout,
      stderr: "",
    });

    expect(parsed.toolActivity).toMatchObject({
      toolCallCount: 1,
      toolResultCount: 1,
      successfulToolResultCount: 1,
      failedToolResultCount: 0,
      firstSuccessfulToolName: "run_shell_command",
      lastSuccessfulToolName: "run_shell_command",
    });
    expect(capacity).toEqual({
      exhausted: true,
      message: "You have exhausted your capacity on this model. Try again later.",
    });
  });
});
