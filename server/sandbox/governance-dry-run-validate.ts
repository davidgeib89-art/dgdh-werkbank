import { evaluateGovernanceDryRunValidation } from "../src/services/heartbeat.ts";

type ValidationCase = {
  name: string;
  expectedStatus: "skipped" | "failed" | "succeeded";
  expectedReason:
    | "governance.work_packet_required"
    | "phase_checkpoint_required"
    | "budget_hard_cap_reached"
    | "dry_run_validation_ok";
  input: Parameters<typeof evaluateGovernanceDryRunValidation>[0];
};

const cases: ValidationCase[] = [
  {
    name: "workPacket fehlt",
    expectedStatus: "skipped",
    expectedReason: "governance.work_packet_required",
    input: {
      source: "automation",
      contextSnapshot: {
        executionMode: "dry_run",
        isTestRun: true,
      },
    },
  },
  {
    name: "phase checkpoint fehlt",
    expectedStatus: "failed",
    expectedReason: "phase_checkpoint_required",
    input: {
      source: "automation",
      contextSnapshot: {
        executionMode: "dry_run",
        isTestRun: true,
        workPacketId: "packet-phase-b",
        phase: "phase_b",
      },
    },
  },
  {
    name: "budget hard cap greift",
    expectedStatus: "failed",
    expectedReason: "budget_hard_cap_reached",
    input: {
      source: "automation",
      contextSnapshot: {
        executionMode: "dry_run",
        isTestRun: true,
        workPacketId: "packet-budget",
        hardCapTokens: 5,
        dryRunUsage: {
          inputTokens: 4,
          cachedInputTokens: 0,
          outputTokens: 3,
        },
      },
    },
  },
  {
    name: "minimaler valider dry run",
    expectedStatus: "succeeded",
    expectedReason: "dry_run_validation_ok",
    input: {
      source: "automation",
      contextSnapshot: {
        executionMode: "dry_run",
        isTestRun: true,
        workPacketId: "packet-ok",
        phase: "phase_a",
      },
    },
  },
];

const results = cases.map((testCase) => {
  const result = evaluateGovernanceDryRunValidation(testCase.input);
  const pass =
    result.status === testCase.expectedStatus &&
    result.reason === testCase.expectedReason &&
    result.adapterExecuteBlocked === true;

  return {
    name: testCase.name,
    pass,
    expectedStatus: testCase.expectedStatus,
    expectedReason: testCase.expectedReason,
    actualStatus: result.status,
    actualReason: result.reason,
    adapterExecuteBlocked: result.adapterExecuteBlocked,
    hardTokenCap: result.hardTokenCap,
    totalTokensUsed: result.totalTokensUsed,
    workPacketId: result.workPacketId,
    resultJson: result.adapterResult?.resultJson ?? null,
  };
});

const summary = {
  safeExecution: true,
  adapterExecuteCallsPossible: false,
  evaluatedAt: new Date().toISOString(),
  results,
};

console.log(JSON.stringify(summary, null, 2));

if (results.some((result) => !result.pass)) {
  process.exitCode = 1;
}