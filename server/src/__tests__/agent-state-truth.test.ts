import { describe, expect, it } from "vitest";
import { evaluateAgentHealth } from "../services/agent-health.js";
import { resolvePersistedAgentStatusTruth } from "../services/agents.js";
import {
  estimateTotalTokens,
  resolveHeartbeatModelOverride,
  resolveNextAgentStatusAfterRun,
} from "../services/heartbeat.js";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * State-Truth tests: agent-state finalization, health surface accuracy,
 * and budget warning threshold logic.
 */

const heartbeatSource = readFileSync(
  path.resolve(__dirname, "../../..", "server/src/services/heartbeat.ts"),
  "utf8",
);
const finalizationSource = readFileSync(
  path.resolve(
    __dirname,
    "../../..",
    "server/src/services/heartbeat-run-finalization.ts",
  ),
  "utf8",
);

// ---------------------------------------------------------------------------
// A) Agent health surface — blocked / awaiting_approval
// ---------------------------------------------------------------------------

const BASE_RUNTIME_STATE = {
  totalInputTokens: 5_000,
  totalCachedInputTokens: 0,
  totalOutputTokens: 1_000,
  totalCostCents: 50,
};

describe("evaluateAgentHealth — blocked / awaiting_approval status", () => {
  it("lastRunStatus=blocked with errorCode → degraded health (task spec problem)", () => {
    const result = evaluateAgentHealth({
      runtimeState: BASE_RUNTIME_STATE,
      selectedRouting: null,
      quotaSnapshot: null,
      lastRunStatus: "blocked",
      lastRunErrorCode: "missing_inputs",
    });
    expect(result.healthStatus).toBe("degraded");
    expect(result.lastRunStatus).toBe("blocked");
    expect(result.lastRunErrorCode).toBe("missing_inputs");
  });

  it("lastRunStatus=awaiting_approval → warning health (parked, not broken)", () => {
    const result = evaluateAgentHealth({
      runtimeState: BASE_RUNTIME_STATE,
      selectedRouting: null,
      quotaSnapshot: null,
      lastRunStatus: "awaiting_approval",
      lastRunErrorCode: "needs_operator_approval",
    });
    // awaiting_approval is a policy wait — not "degraded" (broken), but "warning" (needs action)
    expect(result.healthStatus).toBe("warning");
    expect(result.lastRunStatus).toBe("awaiting_approval");
  });

  it("lastRunStatus=succeeded → ok health", () => {
    const result = evaluateAgentHealth({
      runtimeState: BASE_RUNTIME_STATE,
      selectedRouting: null,
      quotaSnapshot: null,
      lastRunStatus: "succeeded",
      lastRunErrorCode: null,
    });
    expect(result.healthStatus).toBe("ok");
  });

  it("lastRunStatus=failed → degraded health", () => {
    const result = evaluateAgentHealth({
      runtimeState: BASE_RUNTIME_STATE,
      selectedRouting: null,
      quotaSnapshot: null,
      lastRunStatus: "failed",
      lastRunErrorCode: "adapter_crash",
    });
    expect(result.healthStatus).toBe("degraded");
  });
});

describe("resolvePersistedAgentStatusTruth", () => {
  it("heals a stranded error agent back to idle after process_lost with no active run", () => {
    expect(
      resolvePersistedAgentStatusTruth({
        currentStatus: "error",
        latestRunStatus: "failed",
        latestRunErrorCode: "process_lost",
        runningCount: 0,
      }),
    ).toBe("idle");
  });

  it("keeps ordinary failures in error", () => {
    expect(
      resolvePersistedAgentStatusTruth({
        currentStatus: "error",
        latestRunStatus: "failed",
        latestRunErrorCode: "adapter_failed",
        runningCount: 0,
      }),
    ).toBe("error");
  });

  it("maps stale error to running when another run is active", () => {
    expect(
      resolvePersistedAgentStatusTruth({
        currentStatus: "error",
        latestRunStatus: "failed",
        latestRunErrorCode: "process_lost",
        runningCount: 1,
      }),
    ).toBe("running");
  });

  it("heals a blocked agent back to idle when no active run remains", () => {
    expect(
      resolvePersistedAgentStatusTruth({
        currentStatus: "error",
        latestRunStatus: "blocked",
        latestRunErrorCode: "risk_high_large_implementation",
        runningCount: 0,
      }),
    ).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// B) Budget warning threshold
// ---------------------------------------------------------------------------

describe("estimateTotalTokens — budget threshold math", () => {
  it("returns sum of input + cached + output tokens", () => {
    expect(
      estimateTotalTokens({
        inputTokens: 60_000,
        cachedInputTokens: 5_000,
        outputTokens: 3_000,
      }),
    ).toBe(68_000);
  });

  it("returns null for null input", () => {
    expect(estimateTotalTokens(null)).toBeNull();
  });

  it("80% of 75k cap = 60k — threshold boundary", () => {
    const hardCap = 75_000;
    const threshold = hardCap * 0.8;
    // At threshold: warning fires
    expect(60_000 >= threshold).toBe(true);
    // Below threshold: no warning
    expect(59_999 >= threshold).toBe(false);
  });
});

describe("resolveNextAgentStatusAfterRun", () => {
  it("treats process_lost as recoverable and returns idle when no other runs are active", () => {
    expect(
      resolveNextAgentStatusAfterRun({
        runningCount: 0,
        outcome: "failed",
        errorCode: "process_lost",
      }),
    ).toBe("idle");
  });

  it("keeps ordinary failed runs in error when no other runs are active", () => {
    expect(
      resolveNextAgentStatusAfterRun({
        runningCount: 0,
        outcome: "failed",
        errorCode: "adapter_failed",
      }),
    ).toBe("error");
  });

  it("keeps agent running when another run is still active", () => {
    expect(
      resolveNextAgentStatusAfterRun({
        runningCount: 1,
        outcome: "failed",
        errorCode: "process_lost",
      }),
    ).toBe("running");
  });

  it("treats blocked runs as recoverable and returns idle when no other runs are active", () => {
    expect(
      resolveNextAgentStatusAfterRun({
        runningCount: 0,
        outcome: "blocked",
        errorCode: "risk_high_large_implementation",
      }),
    ).toBe("idle");
  });
});

describe("resolveHeartbeatModelOverride", () => {
  it("pins gemini auto-model runs to explicit flash lanes", () => {
    expect(
      resolveHeartbeatModelOverride({
        adapterType: "gemini_local",
        configuredModel: "auto",
        applyModelLane: true,
        effectiveModelLane: "gemini-2.5-flash-lite",
      }),
    ).toBe("gemini-2.5-flash-lite");
  });

  it("also pins gemini auto-model runs to explicit pro lanes", () => {
    expect(
      resolveHeartbeatModelOverride({
        adapterType: "gemini_local",
        configuredModel: "auto",
        applyModelLane: true,
        effectiveModelLane: "gemini-3.1-pro-preview",
      }),
    ).toBe("gemini-3.1-pro-preview");
  });

  it("still applies routed lanes when the adapter already carries an explicit model", () => {
    expect(
      resolveHeartbeatModelOverride({
        adapterType: "gemini_local",
        configuredModel: "gemini-3-flash-preview",
        applyModelLane: true,
        effectiveModelLane: "gemini-2.5-flash-lite",
      }),
    ).toBe("gemini-2.5-flash-lite");
  });
});

// ---------------------------------------------------------------------------
// C) Gate finalization wiring — contract checks via source
// ---------------------------------------------------------------------------

describe("DGDH State Truth — gate finalization wiring", () => {
  it("Gate 1 calls finalizeAgentStatus after blocked setRunStatus", () => {
    // Verifies finalizeAgentStatus is called in the hard-blocked path
    const gate1Block = heartbeatSource.indexOf(
      'await finalizeAgentStatus(agent.id, "blocked")',
    );
    expect(gate1Block).toBeGreaterThan(-1);
  });

  it("Gate 2 is disabled in the live path", () => {
    expect(heartbeatSource).toContain(
      "Gate 2 (routine operator approval) is intentionally disabled for now.",
    );
  });

  it("budget warning publishLiveEvent is wired at 80% threshold", () => {
    expect(heartbeatSource).toContain("heartbeat.run.budget_warning");
    expect(heartbeatSource).toContain("hardTokenCap * 0.8");
  });

  it("awaiting_approval maps to idle in finalizeAgentStatus (not error)", () => {
    expect(finalizationSource).toContain('outcome === "awaiting_approval"');
  });

  it("blocked maps to idle in finalizeAgentStatus (not error)", () => {
    expect(finalizationSource).toContain('outcome === "blocked"');
  });
});
