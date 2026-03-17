import { describe, expect, it } from "vitest";
import {
  type PromptResolverInput,
  validatePromptResolverInput,
} from "../services/prompt-resolver-schema.ts";

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

describe("prompt resolver schema validator", () => {
  it("returns ok for a valid input", () => {
    const result = validatePromptResolverInput(buildValidInput());
    expect(result.resolverDecision).toBe("ok");
    expect(result.reasonCodes).toEqual([]);
  });

  it("returns hard fail when required fields are missing", () => {
    const input = buildValidInput();
    input.taskDelta.objective = "";

    const result = validatePromptResolverInput(input);
    expect(result.resolverDecision).toBe("fail");
    expect(result.reasonCodes).toContain("MISSING_REQUIRED_FIELD");
  });

  it("returns hard fail for allowed_tools and blocked_tools conflicts", () => {
    const input = buildValidInput();
    input.governanceExecution.tools.blockedTools = ["read_file"];

    const result = validatePromptResolverInput(input);
    expect(result.resolverDecision).toBe("fail");
    expect(result.reasonCodes).toContain("TOOL_CONFLICT");
  });

  it("returns escalated for scope expansion outside allowed targets", () => {
    const input = buildValidInput();
    input.governanceExecution.scope.requestedTargets = ["src/a.ts", "src/b.ts"];

    const result = validatePromptResolverInput(input);
    expect(result.resolverDecision).toBe("escalated");
    expect(result.reasonCodes).toEqual([
      "SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS",
    ]);
  });

  it("returns hard fail when protected governance fields are overridden", () => {
    const input = buildValidInput();
    input.roleAddon.overrideAttempt = {
      approvalMode: "policy_only",
    };

    const result = validatePromptResolverInput(input);
    expect(result.resolverDecision).toBe("fail");
    expect(result.reasonCodes).toContain("NON_OVERRIDABLE_OVERRIDE");
  });
});
