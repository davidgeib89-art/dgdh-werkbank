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

import {
  produceFlashLiteRoutingProposal,
  type GeminiFlashLiteRouterInput,
} from "../services/gemini-flash-lite-router.ts";

describe("produceFlashLiteRoutingProposal", () => {
  beforeEach(() => {
    hoisted.runChildProcessMock.mockReset();
  });

  const baseInput: GeminiFlashLiteRouterInput = {
    adapterType: "gemini_local",
    adapterConfig: {
      command: "node",
      cwd: process.cwd(),
      env: {},
    },
    context: {
      paperclipTaskPrompt: "Implement endpoint",
      role: "worker",
      packetType: "free_api",
    },
    quotaSnapshot: {
      snapshotAt: "2026-03-19T19:30:00.000Z",
    },
    runtimeConfig: {},
    allowedBuckets: ["flash", "pro", "flash-lite"] as GeminiFlashLiteRouterInput["allowedBuckets"],
    allowedModelLanes: [
      "gemini-3-flash-preview",
      "gemini-3.1-pro-preview",
      "gemini-2.5-flash-lite",
    ],
    allowedSkillPool: [
      "repo-read",
      "repo-write",
      "web-search",
      "test-runner",
      "status-summary",
    ],
    manualOverride: null,
  };

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
                executionIntent: "implement",
                targetFolder: "server/src",
                doneWhen: "Endpoint is implemented with passing tests.",
                riskLevel: "medium",
                missingInputs: [],
                needsApproval: false,
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
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
            timeoutSec: 8,
          },
        },
      },
    });

    expect(result.source).toBe("flash_lite_call");
    expect(result.parseStatus).toBe("ok");
    expect(result.proposal?.chosenBucket).toBe("pro");
    expect(result.proposal?.executionIntent).toBe("implement");
    expect(result.proposal?.targetFolder).toBe("server/src");
    expect(result.routerHealth.successCount).toBe(1);
    expect(result.routerHealth.lastErrorReason).toBeNull();
  });

  it("fills safe defaults when work-packet optional fields are omitted", async () => {
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
                taskClass: "research-light",
                budgetClass: "small",
                chosenBucket: "flash",
                chosenModelLane: "gemini-3-flash-preview",
                fallbackBucket: "pro",
                rationale: "minimal packet",
              }),
            },
          ],
        },
      }),
      stderr: "",
    });

    const result = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
        },
      },
    });

    expect(result.parseStatus).toBe("ok");
    expect(result.proposal?.executionIntent).toBe("investigate");
    expect(result.proposal?.targetFolder).toBe(".");
    expect(result.proposal?.needsApproval).toBe(false);
    expect(result.proposal?.missingInputs).toEqual([]);
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
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
        },
      },
      context: {
        paperclipTaskPrompt: "Investigate issue",
        role: "worker",
        packetType: "free_api",
      },
      allowedModelLanes: ["gemini-3-flash-preview", "gemini-3.1-pro-preview"],
    });

    expect(result.source).toBe("heuristic_policy");
    expect(result.parseStatus).toBe("invalid_json");
    expect(result.proposal).toBeNull();
    expect(result.routerHealth.parseFailCount).toBe(1);
    expect(result.routerHealth.fallbackCount).toBe(1);
  });

  it("hard-skips flash-lite call for deterministic_tool packets", async () => {
    const result = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
        },
      },
      context: {
        paperclipTaskPrompt: "Run deterministic image packet",
        role: "worker",
        packetType: "deterministic_tool",
      },
    });

    expect(result.attempted).toBe(false);
    expect(result.source).toBe("heuristic_policy");
    expect(result.parseStatus).toBe("not_attempted");
    expect(result.fallbackReason).toBe("deterministic_tool_no_llm_call");
    expect(hoisted.runChildProcessMock).not.toHaveBeenCalled();
  });

  it("skips CEO routing by default because the pre-router is worker-scoped", async () => {
    const result = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
        },
      },
      context: {
        ...baseInput.context,
        role: "ceo",
      },
    });

    expect(result.attempted).toBe(false);
    expect(result.source).toBe("heuristic_policy");
    expect(result.parseStatus).toBe("not_attempted");
    expect(result.fallbackReason).toBe("role_scope_excluded");
    expect(hoisted.runChildProcessMock).not.toHaveBeenCalled();
  });

  it("skips non-free_api packets by default because the pre-router is cheap-lane scoped", async () => {
    const result = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
        },
      },
      context: {
        ...baseInput.context,
        packetType: "premium_model",
      },
    });

    expect(result.attempted).toBe(false);
    expect(result.source).toBe("heuristic_policy");
    expect(result.parseStatus).toBe("not_attempted");
    expect(result.fallbackReason).toBe("packet_scope_excluded");
    expect(hoisted.runChildProcessMock).not.toHaveBeenCalled();
  });

  it("skips extra flash-lite call when issue packet truth is already ready", async () => {
    const result = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
          },
        },
      },
      context: {
        paperclipTaskPrompt: "Implement endpoint",
        role: "worker",
        packetType: "free_api",
        paperclipIssueExecutionPacketTruth: {
          ready: true,
          status: "ready",
          targetFile: "doc/DGDH-AI-OPERATOR-RUNBOOK.md",
          targetFolder: "doc",
          artifactKind: "doc_update",
          doneWhen: "Add one tiny runbook note.",
        },
      },
    });

    expect(result.attempted).toBe(false);
    expect(result.parseStatus).toBe("not_attempted");
    expect(result.fallbackReason).toBe("ready_packet_truth");
    expect(result.warning).toBe("flash_lite_router_skipped_ready_packet_truth");
    expect(hoisted.runChildProcessMock).not.toHaveBeenCalled();
  });

  it("opens circuit breaker after repeated failures", async () => {
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
              text: "not-json",
            },
          ],
        },
      }),
      stderr: "",
    });

    const first = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
            circuitBreaker: {
              threshold: 2,
              cooldownSec: 120,
            },
          },
        },
      },
    });

    const second = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
            circuitBreaker: {
              threshold: 2,
              cooldownSec: 120,
            },
          },
        },
      },
      runtimeState: first.runtimeStatePatch,
    });

    expect(first.parseStatus).toBe("invalid_json");
    expect(second.parseStatus).toBe("invalid_json");
    expect(second.routerHealth.circuitOpenCount).toBe(1);
    expect(second.routerHealth.breakerOpenUntil).not.toBeNull();

    const third = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
            circuitBreaker: {
              threshold: 2,
              cooldownSec: 120,
            },
          },
        },
      },
      runtimeState: second.runtimeStatePatch,
    });

    expect(third.attempted).toBe(false);
    expect(third.fallbackReason).toBe("circuit_open");
    expect(third.parseStatus).toBe("not_attempted");
  });

  it("reuses cached proposal for similar intake and skips extra call", async () => {
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
                chosenBucket: "flash",
                chosenModelLane: "gemini-3-flash-preview",
                fallbackBucket: "pro",
                rationale: "cached route",
              }),
            },
          ],
        },
      }),
      stderr: "",
    });

    const first = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
            cache: {
              enabled: true,
              ttlSec: 300,
            },
          },
        },
      },
    });

    expect(first.source).toBe("flash_lite_call");
    expect(first.cacheHit).toBe(false);

    hoisted.runChildProcessMock.mockReset();

    const second = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: {
        routingPolicy: {
          llmRouter: {
            enabled: true,
            cache: {
              enabled: true,
              ttlSec: 300,
            },
          },
        },
      },
      runtimeState: first.runtimeStatePatch,
    });

    expect(second.parseStatus).toBe("ok");
    expect(second.source).toBe("flash_lite_call");
    expect(second.cacheHit).toBe(true);
    expect(hoisted.runChildProcessMock).not.toHaveBeenCalled();
  });

  it("flash-lite decides allowedSkills and they are passed through", async () => {
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
                taskClass: "research-light",
                budgetClass: "small",
                chosenBucket: "flash",
                chosenModelLane: "gemini-3-flash-preview",
                fallbackBucket: "pro",
                allowedSkills: ["repo-read", "web-search", "status-summary"],
                rationale:
                  "Light research task. Flash bucket has capacity. Web search needed, no writes required.",
              }),
            },
          ],
        },
      }),
      stderr: "",
    });

    const result = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: { routingPolicy: { llmRouter: { enabled: true } } },
    });

    expect(result.parseStatus).toBe("ok");
    expect(result.proposal?.allowedSkills).toEqual([
      "repo-read",
      "web-search",
      "status-summary",
    ]);
  });

  it("strips skills not in allowedSkillPool", async () => {
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
                budgetClass: "small",
                chosenBucket: "flash",
                chosenModelLane: "gemini-3-flash-preview",
                fallbackBucket: "pro",
                allowedSkills: [
                  "repo-read",
                  "unknown-skill",
                  "dangerous-tool",
                  "repo-write",
                ],
                rationale: "bounded edit",
              }),
            },
          ],
        },
      }),
      stderr: "",
    });

    const result = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: { routingPolicy: { llmRouter: { enabled: true } } },
    });

    expect(result.parseStatus).toBe("ok");
    expect(result.proposal?.allowedSkills).toEqual(["repo-read", "repo-write"]);
    expect(result.proposal?.allowedSkills).not.toContain("unknown-skill");
    expect(result.proposal?.allowedSkills).not.toContain("dangerous-tool");
  });

  it("returns empty allowedSkills when flash-lite omits them", async () => {
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
                taskClass: "research-light",
                budgetClass: "small",
                chosenBucket: "flash",
                chosenModelLane: "gemini-3-flash-preview",
                fallbackBucket: "pro",
                rationale: "no skills returned",
              }),
            },
          ],
        },
      }),
      stderr: "",
    });

    const result = await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: { routingPolicy: { llmRouter: { enabled: true } } },
    });

    expect(result.parseStatus).toBe("ok");
    expect(result.proposal?.allowedSkills).toEqual([]);
  });

  it("prefers compact issue text over assignment prompt boilerplate", async () => {
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
                chosenBucket: "flash",
                chosenModelLane: "gemini-3-flash-preview",
                fallbackBucket: "pro",
                rationale: "bounded doc packet",
              }),
            },
          ],
        },
      }),
      stderr: "",
    });

    await produceFlashLiteRoutingProposal({
      ...baseInput,
      runtimeConfig: { routingPolicy: { llmRouter: { enabled: true } } },
      context: {
        paperclipTaskPrompt: [
          "Paperclip issue assignment:",
          "PAPERCLIP_API_URL: http://127.0.0.1:3101",
          "Execution workspace:",
          "Branch rule: reuse PAPERCLIP_WORKSPACE_BRANCH.",
        ].join("\n"),
        role: "worker",
        packetType: "free_api",
        paperclipIssue: {
          title: "Add kickoff-probe note to Runbook",
          description: [
            "packetType: free_api",
            "executionIntent: implement",
            "targetFile: doc/DGDH-AI-OPERATOR-RUNBOOK.md",
            "targetFolder: doc",
            "artifactKind: doc_update",
            "doneWhen: Add one tiny kickoff-probe note and keep the file coherent.",
          ].join("\n"),
        },
      },
    });

    const [, , , options] = hoisted.runChildProcessMock.mock.calls.at(-1) ?? [];
    expect(options.stdin).toContain("Add kickoff-probe note to Runbook");
    expect(options.stdin).toContain(
      "targetFile: doc/DGDH-AI-OPERATOR-RUNBOOK.md",
    );
    expect(options.stdin).not.toContain("PAPERCLIP_API_URL");
    expect(options.stdin).not.toContain("Execution workspace");
  });
});
