import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateSkillContractVerification,
  loadCapabilitySkillContract,
} from "../commands/skill-contract.js";

function writeTempContract(data: unknown): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-skill-contract-"));
  const filePath = path.join(dir, "contract.json");
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}

function buildContractFixture() {
  return {
    schemaVersion: "v1",
    capabilityId: "ceo-native-issue-handoff-primitives",
    title: "CEO Native Issue Handoff Primitives",
    summary: "Governed capability for native paperclipai child handoff primitives.",
    owners: ["david"],
    maturity: "verified",
    updatedAt: "2026-03-26T00:00:00.000Z",
    contract: {
      intent: "Provide stable CEO-native issue handoff primitives for real runs.",
      scopeIn: ["list child issues", "list agents", "create child issue", "assign child issue"],
      scopeOut: ["implementation work", "provider changes"],
      inputsRequired: ["company id", "task id", "project id"],
      allowedActions: ["paperclipai issue list", "paperclipai agent list", "paperclipai issue create", "paperclipai issue assign"],
      forbiddenActions: ["ad-hoc provider switching"],
      successCriteria: ["all four primitives executed in a real CEO run"],
      failureModes: ["capacity admission failures", "missing runtime context"],
      rollbackPlan: "Revert to last verified contract and rerun one bounded proof.",
    },
    primitives: [
      {
        id: "issue-list-parent",
        title: "List child issues",
        description: "Reads child issues with parent id filter.",
        required: true,
        evidenceMarkers: ["paperclipai issue list --company-id", "--parent-id"],
      },
      {
        id: "agent-list",
        title: "List agents",
        description: "Lists available agents.",
        required: true,
        evidenceMarkers: ["paperclipai agent list --company-id"],
      },
      {
        id: "issue-create",
        title: "Create child issue",
        description: "Creates a child issue.",
        required: true,
        evidenceMarkers: ["paperclipai issue create --company-id"],
      },
      {
        id: "issue-assign",
        title: "Assign child issue",
        description: "Assigns child issue to worker.",
        required: true,
        evidenceMarkers: ["paperclipai issue assign"],
      },
    ],
    verify: {
      method: "heartbeat_run_log_markers",
      runIds: ["11111111-1111-4111-8111-111111111111"],
      requiredMarkers: [],
      requiredPrimitiveIds: [],
      minDistinctRuns: 1,
      notes: null,
    },
  };
}

describe("skill contract verification", () => {
  it("loads and validates a capability skill contract file", async () => {
    const contractPath = writeTempContract(buildContractFixture());
    const parsed = await loadCapabilitySkillContract(contractPath);

    expect(parsed.capabilityId).toBe("ceo-native-issue-handoff-primitives");
    expect(parsed.primitives).toHaveLength(4);
    expect(parsed.verify.method).toBe("heartbeat_run_log_markers");
  });

  it("passes when all required primitive markers are present", async () => {
    const parsed = await loadCapabilitySkillContract(
      writeTempContract(buildContractFixture()),
    );

    const report = evaluateSkillContractVerification(parsed, [
      {
        runId: "11111111-1111-4111-8111-111111111111",
        status: "succeeded",
        text:
          "pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai issue list --company-id x --parent-id y --json\n" +
          "pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai agent list --company-id x --json\n" +
          "pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai issue create --company-id x --project-id p --parent-id y --json\n" +
          "pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai issue assign child --agent-id worker --json",
      },
    ]);

    expect(report.passed).toBe(true);
    expect(report.missingMarkers).toEqual([]);
    expect(report.primitives.every((primitive) => primitive.matched)).toBe(true);
  });

  it("fails when one required primitive marker is missing", async () => {
    const parsed = await loadCapabilitySkillContract(
      writeTempContract(buildContractFixture()),
    );

    const report = evaluateSkillContractVerification(parsed, [
      {
        runId: "11111111-1111-4111-8111-111111111111",
        status: "failed",
        text:
          "paperclipai issue list --company-id x --parent-id y\n" +
          "paperclipai agent list --company-id x\n" +
          "paperclipai issue create --company-id x",
      },
    ]);

    expect(report.passed).toBe(false);
    expect(report.missingMarkers).toContain("paperclipai issue assign");
    expect(
      report.primitives.find((primitive) => primitive.primitiveId === "issue-assign")
        ?.matched,
    ).toBe(false);
  });
});
