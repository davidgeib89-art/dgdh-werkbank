import { describe, expect, it } from "vitest";
import { runPromptResolverPreflight } from "../services/prompt-resolver-preflight.ts";
import type { PromptResolverInput } from "../services/prompt-resolver-schema.ts";

function buildValidInput(): PromptResolverInput {
  return {
    layerOrder: [
      "companyCore",
      "governanceExecution",
      "taskDelta",
      "roleAddon",
    ],
    companyCore: {
      missionGuardrails: "Human-led governance first",
      governancePrinciples: "Escalate before scope growth",
      tokenDiscipline: "Delta over full context",
      behaviorSeparation: "plan vs build vs review",
    },
    governanceExecution: {
      scope: {
        allowedTargets: ["src/a.ts"],
        requestedTargets: ["src/a.ts"],
        forbiddenChanges: ["runtime-config"],
      },
      tools: {
        allowedTools: ["read_file", "grep_search"],
        blockedTools: ["run_in_terminal"],
      },
      governance: {
        approvalMode: "manual_required_for_phase_b",
        riskClass: "medium",
        budgetClass: "medium",
      },
      audit: {
        decisionTraceRequired: true,
        reasonCodes: ["BASELINE"],
      },
    },
    taskDelta: {
      objective: "Review single file",
      allowedTargets: ["src/a.ts"],
      acceptanceCriteria: ["No scope drift"],
    },
    roleAddon: {
      roleName: "Research/Review",
      roleMandate: "Read and assess",
      roleLimits: ["no write"],
    },
  };
}

describe("prompt resolver preflight hook", () => {
  it("returns deterministic preflight output for identical input", () => {
    const input = buildValidInput();

    const first = runPromptResolverPreflight(input, { includeAuditMeta: true });
    const second = runPromptResolverPreflight(input, {
      includeAuditMeta: true,
    });

    expect(first).toEqual(second);
    expect(first.resolverDecision).toBe("ok");
  });

  it("keeps fail and escalated outcomes clearly distinguishable", () => {
    const escalatedInput = buildValidInput();
    escalatedInput.governanceExecution.scope.requestedTargets = [
      "src/a.ts",
      "src/extra.ts",
    ];

    const escalated = runPromptResolverPreflight(escalatedInput);
    expect(escalated.resolverDecision).toBe("escalated");
    expect(escalated.reasonCodes).toEqual([
      "SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS",
    ]);

    const failedInput = buildValidInput();
    failedInput.governanceExecution.scope.requestedTargets = [
      "src/a.ts",
      "src/extra.ts",
    ];
    failedInput.governanceExecution.tools.blockedTools = ["read_file"];

    const failed = runPromptResolverPreflight(failedInput);
    expect(failed.resolverDecision).toBe("fail");
    expect(failed.reasonCodes).toContain("TOOL_CONFLICT");
    expect(failed.reasonCodes).toContain(
      "SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS",
    );
  });

  it("emits only decision and reason codes when audit metadata is not requested", () => {
    const result = runPromptResolverPreflight(buildValidInput());
    expect(result.resolverDecision).toBe("ok");
    expect(result.reasonCodes).toEqual([]);
    expect(result.auditMeta).toBeUndefined();
  });
});
