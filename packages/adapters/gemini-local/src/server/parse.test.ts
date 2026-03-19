import { describe, expect, it } from "vitest";
import { parseGeminiJsonl, isGeminiUnknownSessionError } from "./parse.js";

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
});
