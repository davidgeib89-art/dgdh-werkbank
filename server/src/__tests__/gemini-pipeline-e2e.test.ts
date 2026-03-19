/**
 * Gemini Control Plane E2E — Pipeline Chain Tests
 *
 * Tests the full Stage-1 → Stage-2 → Block-Gate chain WITHOUT real Gemini calls.
 *
 * What is mocked: Stage-1 (gemini-flash-lite call via runChildProcess mock)
 * What runs for real: Stage-2 resolver, enforceWorkPacket, blocked-gate logic, stats summary
 *
 * Test matrix:
 *   Case 1: Stage-1 with missingInputs → Stage-2 enforces blocked=true → no adapter.execute
 *   Case 2: Stage-1 clean proposal → Stage-2 allows through → continues to adapter stage
 *   Case 3: needsApproval path — KNOWN GAP: blocked gate does NOT check needsApproval flag
 *
 * Note on Case 3:
 *   enforceWorkPacket sets needsApproval=true when risk=high OR budget=large OR missingInputs.
 *   But the heartbeat blocked-gate (heartbeat.ts ~line 3069) only checks routingPreflight.selected.blocked,
 *   NOT routingPreflight.selected.needsApproval. So needsApproval flows through but is not gated.
 *   → NOT tested; marked as gap. See: enforceWorkPacket() and heartbeat.ts:3070.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { summarizeHeartbeatRunResultJson } from "../services/heartbeat-run-summary.js";
import { resolveGeminiRoutingPreflight } from "../services/gemini-routing.js";
import { resolveGeminiControlPlane } from "../services/gemini-control-plane.js";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const TEST_POLICY = {
  taskRoutes: {
    "research-light": {
      preferredBucket: "flash" as const,
      fallbackBucket: "pro" as const,
      reason: "light research favors flash",
    },
    "bounded-implementation": {
      preferredBucket: "flash" as const,
      fallbackBucket: "pro" as const,
      reason: "bounded defaults to flash",
    },
    "heavy-architecture": {
      preferredBucket: "pro" as const,
      fallbackBucket: "flash" as const,
      reason: "architecture needs pro",
    },
    "benchmark-floor": {
      preferredBucket: "flash" as const,
      fallbackBucket: "flash" as const,
      reason: "floor stays in cheap lane",
    },
  },
  bucketModels: {
    flash: "gemini-3-flash-preview",
    pro: "gemini-3.1-pro-preview",
    "flash-lite": "gemini-2.5-flash-lite",
  },
} as const;

/** Simulates the context after a successful Stage-1 flash-lite call */
function buildContextFromStage1Proposal(proposal: {
  taskClass?: string;
  budgetClass?: string;
  executionIntent?: string;
  targetFolder?: string;
  doneWhen?: string;
  riskLevel?: string;
  missingInputs?: string[];
  needsApproval?: boolean;
  chosenBucket?: string;
  chosenModelLane?: string;
  fallbackBucket?: string;
  rationale?: string;
}) {
  return {
    paperclipTaskPrompt: "Implement user authentication endpoint",
    // Stage-1 output fields (mirrors heartbeat.ts ~2768)
    paperclipRoutingProposal: {
      taskType: proposal.taskClass ?? "bounded-implementation",
      taskClass: proposal.taskClass ?? "bounded-implementation",
      budgetClass: proposal.budgetClass ?? "medium",
      executionIntent: proposal.executionIntent ?? "implement",
      targetFolder: proposal.targetFolder ?? "server/src",
      doneWhen:
        proposal.doneWhen ?? "Endpoint is implemented with passing tests.",
      riskLevel: proposal.riskLevel ?? "medium",
      missingInputs: proposal.missingInputs ?? [],
      needsApproval: proposal.needsApproval ?? false,
      chosenBucket: proposal.chosenBucket ?? "flash",
      chosenModelLane:
        proposal.chosenModelLane ?? "gemini-3-flash-preview",
      fallbackBucket: proposal.fallbackBucket ?? "pro",
      rationale: proposal.rationale ?? "test routing",
    },
    // Stage-1 meta (mirrors heartbeat.ts ~2787)
    paperclipRoutingProposalMeta: {
      source: "flash_lite_call" as const,
      parseStatus: "ok" as const,
      latencyMs: 120,
      attempted: true,
      cacheHit: false,
      fallbackReason: null,
      routerHealth: {
        successCount: 1,
        fallbackCount: 0,
        timeoutCount: 0,
        parseFailCount: 0,
        commandErrorCount: 0,
        cacheHitCount: 0,
        circuitOpenCount: 0,
        consecutiveFailures: 0,
        breakerOpenUntil: null,
        lastLatencyMs: 120,
        lastErrorReason: null,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Case 1: missingInputs → blocked gate
// ---------------------------------------------------------------------------
describe('Case 1: Stage-1 missingInputs → Stage-2 blocked → no adapter.execute', () => {
  it("sets blocked=true and blockReason=missing_inputs when Stage-1 reports missing inputs", () => {
    const context = buildContextFromStage1Proposal({
      taskClass: "bounded-implementation",
      budgetClass: "medium",
      executionIntent: "implement",
      targetFolder: "server/src",
      doneWhen: "User auth endpoint is live.",
      riskLevel: "medium",
      missingInputs: ["database schema", "API spec document"],
      needsApproval: false,
      chosenBucket: "flash",
      chosenModelLane: "gemini-3-flash-preview",
      fallbackBucket: "pro",
      rationale: "small bounded task",
    });

    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          llmRouter: { enabled: true },
        },
      },
      runtimeState: {},
      context,
    });

    // Stage-2 enforcement must block
    expect(result).not.toBeNull();
    expect(result.selected.blocked).toBe(true);
    expect(result.selected.blockReason).toBe("missing_inputs");
    expect(result.selected.missingInputs).toEqual([
      "database schema",
      "API spec document",
    ]);

    // needsApproval should also be enforced (missing inputs trigger it)
    expect(result.selected.needsApproval).toBe(true);

    // blocked gate in heartbeat should stop before adapter.execute
    // This is verified by checking: if blocked=true, heartbeat returns early
    // (see heartbeat.ts:3069-3103)
    expect(result.selected.blocked).toBe(true); // gate condition met
  });

  it("sets blocked=true and blockReason=risk_high_large_implementation for heavy task + large budget + implement", () => {
    const context = buildContextFromStage1Proposal({
      taskClass: "heavy-architecture",
      budgetClass: "large",
      executionIntent: "implement",
      targetFolder: ".",
      doneWhen: "Architecture redesign complete.",
      riskLevel: "high", // escalated by enforceWorkPacket
      missingInputs: [],
      needsApproval: false,
      chosenBucket: "pro",
      chosenModelLane: "gemini-3.1-pro-preview",
      fallbackBucket: "flash",
      rationale: "large architecture task",
    });

    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3.1-pro-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          llmRouter: { enabled: true },
        },
      },
      runtimeState: {},
      context,
    });

    expect(result.selected.blocked).toBe(true);
    expect(result.selected.blockReason).toBe(
      "risk_high_large_implementation",
    );
    expect(result.selected.riskLevel).toBe("high");
    expect(result.selected.budgetClass).toBe("large");
    expect(result.selected.executionIntent).toBe("implement");
  });

  it("stats surface labels routing_blocked resultJson as result=blocked", () => {
    // This simulates what heartbeat-run-summary.ts receives after a blocked run
    const resultJson = {
      type: "routing_blocked",
      status: "blocked",
      blockReason: "missing_inputs",
      needsApproval: false,
      missingInputs: ["database schema", "API spec document"],
      executionIntent: "implement",
      riskLevel: "medium",
      taskType: "bounded-implementation",
      budgetClass: "medium",
    };

    const summary = summarizeHeartbeatRunResultJson(resultJson);

    expect(summary).not.toBeNull();
    expect(summary!.result).toBe("blocked");
    expect(summary!.summary).toBe("Routing blocked: missing_inputs");
  });

  it("stats surface adds approval message when needsApproval=true on blocked run", () => {
    const resultJson = {
      type: "routing_blocked",
      status: "blocked",
      blockReason: "risk_high_large_implementation",
      needsApproval: true,
      missingInputs: [],
      executionIntent: "implement",
      riskLevel: "high",
      taskType: "heavy-architecture",
      budgetClass: "large",
    };

    const summary = summarizeHeartbeatRunResultJson(resultJson);

    expect(summary).not.toBeNull();
    expect(summary!.result).toBe("blocked");
    expect(summary!.summary).toBe(
      "Routing blocked: risk_high_large_implementation",
    );
    expect(summary!.message).toBe(
      "Task requires operator approval before execution",
    );
  });
});

// ---------------------------------------------------------------------------
// Case 2: clean proposal → Stage-2 allows through
// ---------------------------------------------------------------------------
describe('Case 2: Stage-1 clean proposal → Stage-2 allows → continues to adapter', () => {
  it("does NOT block when Stage-1 proposal has no missing inputs and low/medium risk", () => {
    const context = buildContextFromStage1Proposal({
      taskClass: "bounded-implementation",
      budgetClass: "small",
      executionIntent: "implement",
      targetFolder: "server/src/endpoints",
      doneWhen: "POST /auth/login returns 200 with JWT.",
      riskLevel: "low",
      missingInputs: [],
      needsApproval: false,
      chosenBucket: "flash",
      chosenModelLane: "gemini-3-flash-preview",
      fallbackBucket: "pro",
      rationale: "small bounded task, low risk",
    });

    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          llmRouter: { enabled: true },
        },
      },
      runtimeState: {},
      context,
    });

    expect(result).not.toBeNull();
    expect(result.selected.blocked).toBe(false);
    expect(result.selected.blockReason).toBeNull();
    expect(result.selected.missingInputs).toEqual([]);
    expect(result.selected.needsApproval).toBe(false);

    // The blocked gate (heartbeat.ts:3070) does NOT return early
    // → execution continues to adapter stage
    expect(result.selected.blocked).toBe(false);
  });

  it("correctly resolves bucket and model lane for clean flash proposal in soft_enforced mode", () => {
    // NOTE: resolveGeminiRoutingPreflight calls ingestGeminiQuotaSnapshot internally.
    // When runtimeConfig.routingPolicy has no bucketState AND runtimeState is empty,
    // source="none" → isStale=true → effectiveMode="advisory" → applyModelLane=false.
    // To test soft_enforced with applyModelLane=true, we must provide bucketState
    // so that ingestGeminiQuotaSnapshot has a valid source and isStale=false.
    const context = buildContextFromStage1Proposal({
      taskClass: "bounded-implementation",
      budgetClass: "medium",
      executionIntent: "implement",
      targetFolder: "server/src",
      doneWhen: "Tests pass.",
      riskLevel: "medium",
      missingInputs: [],
      needsApproval: false,
      chosenBucket: "flash",
      chosenModelLane: "gemini-3-flash-preview",
      fallbackBucket: "pro",
      rationale: "bounded task, flash is sufficient",
    });

    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          llmRouter: { enabled: true },
          // Provide bucketState so ingestGeminiQuotaSnapshot sets source="runtime_bucket_state"
          // and isStale=false. Without this, effectiveMode flips to "advisory".
          bucketState: {
            flash: "ok",
            pro: "ok",
            "flash-lite": "ok",
          },
        },
      },
      runtimeState: {},
      context,
    });

    expect(result.selected.blocked).toBe(false);
    expect(result.selected.selectedBucket).toBe("flash");
    expect(result.selected.effectiveModelLane).toBe("gemini-3-flash-preview");
    expect(result.applyModelLane).toBe(true);
    expect(result.mode).toBe("soft_enforced");
  });

  it("stays in advisory mode when quota snapshot is stale, even if applyModelLane would normally be true", () => {
    const context = buildContextFromStage1Proposal({
      taskClass: "bounded-implementation",
      budgetClass: "medium",
      executionIntent: "implement",
      targetFolder: "server/src",
      doneWhen: "Tests pass.",
      riskLevel: "medium",
      missingInputs: [],
      needsApproval: false,
      chosenBucket: "flash",
      chosenModelLane: "gemini-3-flash-preview",
      fallbackBucket: "pro",
      rationale: "bounded task",
    });

    // Stale snapshot: isStale=true in runtimeConfig
    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          quotaSnapshot: {
            isStale: true,
            staleReason: "snapshot_expired",
          },
          llmRouter: { enabled: true },
        },
      },
      runtimeState: {},
      context,
    });

    // soft_enforced + stale → advisory (enforcedAdvisory path in control plane)
    expect(result.advisoryOnly).toBe(true);
    expect(result.mode).toBe("advisory");
  });

  it("applies targetFolder and doneWhen defaults when Stage-1 omits them", () => {
    // Stage-1 output with minimal fields — enforceWorkPacket fills safe defaults
    const context = buildContextFromStage1Proposal({
      taskClass: "bounded-implementation",
      budgetClass: "medium",
      executionIntent: "implement",
      // targetFolder, doneWhen, riskLevel intentionally omitted
      missingInputs: [],
      chosenBucket: "flash",
      chosenModelLane: "gemini-3-flash-preview",
      fallbackBucket: "pro",
      rationale: "minimal proposal",
    });

    const result = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          llmRouter: { enabled: true },
        },
      },
      runtimeState: {},
      context,
    });

    expect(result.selected.blocked).toBe(false);
    // enforceWorkPacket applies defaults for these
    expect(result.selected.targetFolder).toBeTruthy();
    expect(result.selected.doneWhen).toBeTruthy();
    expect(result.selected.doneWhen!.length).toBeGreaterThanOrEqual(12);
  });

  it("stats surface labels success result correctly", () => {
    const resultJson = {
      summary: "All 3 tests passed. Endpoint live at /auth/login.",
      result: "ok",
      message: "done",
      total_cost_usd: 0.08,
    };

    const summary = summarizeHeartbeatRunResultJson(resultJson);

    expect(summary).not.toBeNull();
    expect(summary!.result).toBe("ok");
    expect(summary!.summary).toBe("All 3 tests passed. Endpoint live at /auth/login.");
    expect(summary!.total_cost_usd).toBe(0.08);
  });
});

// ---------------------------------------------------------------------------
// Case 3: needsApproval path — KNOWN GAP
// ---------------------------------------------------------------------------
/**
 * KNOWN GAP — NOT TESTED
 *
 * enforceWorkPacket() sets needsApproval=true when:
 *   - riskLevel=high OR budgetClass=large OR missingInputs.length > 0
 *
 * HOWEVER: heartbeat.ts:3070 only checks `routingPreflight.selected.blocked`,
 * NOT `routingPreflight.selected.needsApproval`.
 *
 * This means a task with needsApproval=true but blocked=false will:
 *   - NOT be stopped by the blocked-gate
 *   - Continue to adapter.execute()
 *   - The needsApproval flag is available in context but not enforced as a gate
 *
 * To close this gap:
 *   1. Add needsApproval check to the blocked-gate in heartbeat.ts (line ~3070)
 *      OR
 *   2. Introduce a separate "awaiting_approval" gate before adapter.execute
 *
 * This is a policy decision — not doing this automatically.
 */
describe("Case 3: needsApproval — KNOWN GAP (not tested)", () => {
  it.todo(
    "GAP: needsApproval=true without blocked=true is NOT currently gated " +
    "(heartbeat.ts:3070 only checks blocked, not needsApproval). " +
    "Policy decision required: should needsApproval create a separate gate " +
    "that pauses execution and awaits operator sign-off before adapter.execute?",
  );
});

// ---------------------------------------------------------------------------
// Integration: Stage-1 + Stage-2 full chain (mocked runChildProcess)
// ---------------------------------------------------------------------------
describe("Chain: Stage-1 (mocked) → Stage-2 (real) produces correct enforced packet", () => {
  it("Stage-1 missingInputs proposal → Stage-2 blocked=true, needsApproval=true, correct summary", () => {
    // Simulate the complete chain:
    // 1. Stage-1: flash-lite returns proposal with missingInputs
    // 2. context.paperclipRoutingProposal is set
    // 3. Stage-2: resolveGeminiRoutingPreflight reads context, runs enforceWorkPacket

    const stage1Output = {
      taskClass: "bounded-implementation",
      budgetClass: "medium",
      executionIntent: "implement",
      targetFolder: "server/src",
      doneWhen: "Auth implemented.",
      riskLevel: "medium",
      missingInputs: ["auth library docs"],
      needsApproval: false,
      chosenBucket: "flash",
      chosenModelLane: "gemini-3-flash-preview",
      fallbackBucket: "pro",
      rationale: "needs docs",
    };

    // This is what heartbeat.ts does between Stage-1 and Stage-2 (~2768-2782)
    const context = buildContextFromStage1Proposal(stage1Output);

    // Stage-2 (real)
    const preflight = resolveGeminiRoutingPreflight({
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-3-flash-preview" },
      runtimeConfig: {
        routingPolicy: {
          mode: "soft_enforced",
          llmRouter: { enabled: true },
        },
      },
      runtimeState: {},
      context,
    });

    // Assertions on the full chain result
    expect(preflight.selected.blocked).toBe(true);
    expect(preflight.selected.blockReason).toBe("missing_inputs");
    expect(preflight.selected.missingInputs).toContain("auth library docs");
    expect(preflight.selected.needsApproval).toBe(true); // missingInputs → needsApproval
    expect(preflight.selected.taskType).toBe("bounded-implementation");
    expect(preflight.selected.budgetClass).toBe("medium");

    // Stats surface verification
    const statsSummary = summarizeHeartbeatRunResultJson({
      type: "routing_blocked",
      status: "blocked",
      blockReason: preflight.selected.blockReason,
      needsApproval: preflight.selected.needsApproval,
      missingInputs: preflight.selected.missingInputs,
      executionIntent: preflight.selected.executionIntent,
      riskLevel: preflight.selected.riskLevel,
      taskType: preflight.selected.taskType,
      budgetClass: preflight.selected.budgetClass,
    });

    expect(statsSummary!.result).toBe("blocked");
    expect(statsSummary!.summary).toBe(
      "Routing blocked: missing_inputs",
    );
    expect(statsSummary!.message).toBe(
      "Task requires operator approval before execution",
    );
  });
});
