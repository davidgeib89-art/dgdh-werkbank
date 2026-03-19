import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  runChildProcessMock: vi.fn(),
}));

vi.mock("@paperclipai/adapter-utils/server-utils", async () => {
  const actual = await vi.importActual(
    "@paperclipai/adapter-utils/server-utils",
  );
  return {
    ...(actual as object),
    runChildProcess: hoisted.runChildProcessMock,
  };
});

import { produceFlashLiteRoutingProposal } from "../services/gemini-flash-lite-router.ts";

describe("produceFlashLiteRoutingProposal", () => {
  beforeEach(() => {
    hoisted.runChildProcessMock.mockReset();
  });

  it("accepts valid strict JSON proposal from flash-lite call", async () => {
    hoisted.runChildProcessMock.mockResolvedValue({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: JSON.stringify({
        type: "assistant",
        message: {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                taskClass: "bounded-implementation",
                budgetClass: "medium",
                chosenBucket: "pro",
                chosenModelLane: "gemini-3.1-pro-preview",
                fallbackBucket: "flash",
                rationale: "pro route",
              }),
            },
          ],
        },
      }),
      stderr: "",
    });

    const result = await produceFlashLiteRoutingProposal({
      adapterType: "gemini_local",
      adapterConfig: {
        command: "node",
        cwd: process.cwd(),
        env: {},
      },
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
            timeoutSec: 8,
          },
        },
      },
      context: {
        paperclipTaskPrompt: "Implement endpoint",
      },
      quotaSnapshot: {
        snapshotAt: "2026-03-19T19:30:00.000Z",
      },
      allowedBuckets: ["flash", "pro", "flash-lite"],
      allowedModelLanes: [
        "gemini-3-flash-preview",
        "gemini-3.1-pro-preview",
        "gemini-2.5-flash-lite",
      ],
      manualOverride: null,
    });

    expect(result.source).toBe("flash_lite_call");
    expect(result.parseStatus).toBe("ok");
    expect(result.proposal?.chosenBucket).toBe("pro");
  });

  it("falls back to heuristic policy on invalid json", async () => {
    hoisted.runChildProcessMock.mockResolvedValue({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: JSON.stringify({
        type: "assistant",
        message: {
          content: [
            {
              type: "output_text",
              text: "this is not json",
            },
          ],
        },
      }),
      stderr: "",
    });

    const result = await produceFlashLiteRoutingProposal({
      adapterType: "gemini_local",
      adapterConfig: {
        command: "node",
        cwd: process.cwd(),
        env: {},
      },
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
        },
      },
      context: {
        paperclipTaskPrompt: "Investigate issue",
      },
      quotaSnapshot: {
        snapshotAt: "2026-03-19T19:30:00.000Z",
      },
      allowedBuckets: ["flash", "pro", "flash-lite"],
      allowedModelLanes: ["gemini-3-flash-preview", "gemini-3.1-pro-preview"],
      manualOverride: null,
    });

    expect(result.source).toBe("heuristic_policy");
    expect(result.parseStatus).toBe("invalid_json");
    expect(result.proposal).toBeNull();
  });
});
