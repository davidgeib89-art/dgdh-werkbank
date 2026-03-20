/**
 * Gemini Control Plane — Pipeline Chain Tests
 *
 * Tests Stage-1 → Stage-2 → Gate chain WITHOUT real Gemini calls or adapter execution.
 * Stage-1 output is simulated (context injection). Stage-2 resolver, enforceWorkPacket,
 * gate logic, and stats surface run for real.
 *
 * NOT full E2E: no real adapter.execute(), no actual run DB records.
 * Scope: control-plane boundary chain — routing decision → enforcement → gate output.
 *
 * Test matrix:
 *   Case 1: blocked path — missingInputs or risk triggers blocked=true
 *   Case 2: success path — clean proposal flows through
 *   Case 3: needsApproval — SEMANTIC BOUNDARY GAP (see below)
 *
 * Case 3 — Semantic Boundary Gap:
 *   enforceWorkPacket sets needsApproval=true correctly.
 *   But NO code path exists that sets run.status="awaiting_approval".
 *   The heartbeat gate (heartbeat.ts:3070) only checks blocked, not needsApproval.
 *   Result: the semantically intended awaiting_approval outcome is NEVER emitted.
 *   The flag lives in context but has no enforcement wiring.
 *   → Documented as structural gap, not tested.
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
// Case 1: blocked path
// ---------------------------------------------------------------------------
/**
 * WHAT THIS PROVES:
 * - Stage-2 enforceWorkPacket sets blocked=true and blockReason when conditions met
 * - Stats surface correctly labels routing_blocked → result=blocked
 * - needsApproval is correctly triggered by missingInputs
 *
 * WHAT THIS DOES NOT PROVE (boundary limit):
 * - Actual no-adapter-execute behavior requires heartbeat-level test
 *   (heartbeat.ts:3069 returns early when blocked=true — confirmed in code, not this test)
 * - No explicit model-lane assertion for blocked path — lane application runs
 *   before the blocked gate in heartbeat, so blocked=true does not affect lane state
 */
describe("Case 1: blocked path — Stage-2 enforces blocked=true", () => {
  it("blocked=true + blockReason=missing_inputs when missingInputs present", () => {
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

    // Stage-2 enforcement sets blocked=true
    expect(result).not.toBeNull();
    expect(result.selected.blocked).toBe(true);
    expect(result.selected.blockReason).toBe("missing_inputs");
    expect(result.selected.missingInputs).toEqual([
      "database schema",
      "API spec document",
    ]);

    // needsApproval correctly triggered by missing inputs
    expect(result.selected.needsApproval).toBe(true);

    // heartbeat gate condition is met (blocked=true → early return before adapter.execute)
    expect(result.selected.blocked).toBe(true);
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
// Case 2: success path — clean proposal flows through
// ---------------------------------------------------------------------------
/**
 * WHAT THIS PROVES:
 * - Stage-2 enforceWorkPacket does NOT block clean proposals
 * - Bucket and model lane are correctly resolved in soft_enforced mode
 * - Advisory mode is correctly preserved when quota snapshot is stale
 * - Safe defaults are applied when Stage-1 omits optional fields
 * - Stats surface correctly labels success (result=ok)
 *
 * WHAT THIS DOES NOT PROVE:
 * - Actual adapter.execute() call (requires full heartbeat + adapter mock)
 * - Run record creation in DB
 * - Real model invocation
 */
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
// Case 3: needsApproval — SEMANTIC BOUNDARY GAP
// ---------------------------------------------------------------------------
/**
 * STRUCTURAL GAP — NOT a missing test.
 *
 * Evidence:
 *   - enforceWorkPacket sets needsApproval=true correctly (triggered by risk/budget/inputs)
 *   - heartbeat.ts:3070 gate only checks blocked, NOT needsApproval
 *   - NO code path calls setRunStatus(..., "awaiting_approval")
 *   - heartbeat.ts:3598 READS awaiting_approval from run.status, but no code ever WRITES it
 *   - The flag lives in context.selected.needsApproval but has zero enforcement wiring
 *
 * Result: a run with needsApproval=true (blocked=false) will:
 *   - Continue to adapter.execute()
 *   - Execute without operator sign-off
 *   - Never emit awaiting_approval status
 *
 * This is a semantic boundary gap: the intended state exists in the type system
 * but has no runtime path. It is not a technical failure; it is a missing feature.
 *
 * To close: heartbeat needs a second gate — OR — needsApproval must be wired into
 * the blocked gate OR a separate approval-awaits status must be set.
 * This is David's decision, not an implementation detail.
 */
describe("Case 3: needsApproval — structural boundary gap (not tested)", () => {
  it.todo(
    "needsApproval=true with blocked=false: no enforcement wiring exists. " +
    "enforceWorkPacket sets the flag; heartbeat gate ignores it; " +
    "setRunStatus('awaiting_approval') is never called anywhere in the codebase. " +
    "Flag lives in context but has zero runtime effect. " +
    "Decision required: gate it, merge into blocked, or accept as non-blocking advisory.",
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
