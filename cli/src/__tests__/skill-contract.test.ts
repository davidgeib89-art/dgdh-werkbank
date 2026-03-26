import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateSkillContractVerification,
  listCapabilityContractFiles,
  loadCapabilitySkillContract,
  verifyCapabilitySkillContractWithApi,
  verifyCapabilityContractsInDirectory,
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

function buildContractFixtureWithRun(
  capabilityId: string,
  runId: string,
  assignMarker: string,
) {
  const base = buildContractFixture();
  return {
    ...base,
    capabilityId,
    title: capabilityId,
    verify: {
      ...base.verify,
      runIds: [runId],
      requiredMarkers: [assignMarker],
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

  it("lists capability contracts from a directory", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-skill-contracts-"));
    fs.writeFileSync(path.join(dir, "a.json"), JSON.stringify(buildContractFixture()), "utf8");
    fs.writeFileSync(path.join(dir, "b.json"), JSON.stringify(buildContractFixture()), "utf8");
    fs.writeFileSync(path.join(dir, "notes.txt"), "ignore", "utf8");

    const files = await listCapabilityContractFiles(dir);

    expect(files).toHaveLength(2);
    expect(files[0]?.endsWith("a.json")).toBe(true);
    expect(files[1]?.endsWith("b.json")).toBe(true);
  });

  it("verifies all contracts in a directory via one reusable path", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-skill-batch-"));
    const runA = "11111111-1111-4111-8111-111111111111";
    const runB = "22222222-2222-4222-8222-222222222222";

    fs.writeFileSync(
      path.join(dir, "seed-a.json"),
      JSON.stringify(buildContractFixtureWithRun("seed-a", runA, "marker-a"), null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(dir, "seed-b.json"),
      JSON.stringify(buildContractFixtureWithRun("seed-b", runB, "marker-b"), null, 2),
      "utf8",
    );

    const fakeApi = {
      get: async (pathValue: string) => {
        if (pathValue.includes(`/api/heartbeat-runs/${runA}/log`)) {
          return {
            content:
              "marker-a paperclipai issue list --company-id --parent-id " +
              "paperclipai agent list --company-id " +
              "paperclipai issue create --company-id " +
              "paperclipai issue assign",
          };
        }
        if (pathValue.includes(`/api/heartbeat-runs/${runB}/log`)) {
          return {
            content:
              "marker-b paperclipai issue list --company-id --parent-id " +
              "paperclipai agent list --company-id " +
              "paperclipai issue create --company-id " +
              "paperclipai issue assign",
          };
        }
        if (pathValue === `/api/heartbeat-runs/${runA}`) {
          return {
            id: runA,
            status: "succeeded",
            error: null,
            stdoutExcerpt: null,
            stderrExcerpt: null,
            resultJson: {},
          };
        }
        if (pathValue === `/api/heartbeat-runs/${runB}`) {
          return {
            id: runB,
            status: "succeeded",
            error: null,
            stdoutExcerpt: null,
            stderrExcerpt: null,
            resultJson: {},
          };
        }
        throw new Error(`Unexpected path ${pathValue}`);
      },
    } as any;

    const batch = await verifyCapabilityContractsInDirectory(dir, {
      api: fakeApi,
      logLimitBytes: 10000,
    });

    expect(batch.passed).toBe(true);
    expect(batch.totalContracts).toBe(2);
    expect(batch.failedContracts).toBe(0);
    expect(batch.reports.map((report) => report.capabilityId).sort()).toEqual([
      "seed-a",
      "seed-b",
    ]);
  });

  it("uses usageJson markers during verify to avoid false negatives", async () => {
    const runId = "33333333-3333-4333-8333-333333333333";
    const contract = buildContractFixtureWithRun(
      "usage-proof",
      runId,
      '"sessionreused":true',
    );

    const parsed = await loadCapabilitySkillContract(writeTempContract(contract));

    const fakeApi = {
      get: async (pathValue: string) => {
        if (pathValue.includes(`/api/heartbeat-runs/${runId}/log`)) {
          return { content: "paperclipai issue list --company-id --parent-id paperclipai agent list --company-id paperclipai issue create --company-id paperclipai issue assign" };
        }
        if (pathValue === `/api/heartbeat-runs/${runId}`) {
          return {
            id: runId,
            status: "succeeded",
            error: null,
            stdoutExcerpt: null,
            stderrExcerpt: null,
            usageJson: { sessionReused: true },
            resultJson: {},
            contextSnapshot: {},
          };
        }
        throw new Error(`Unexpected path ${pathValue}`);
      },
    } as any;

    const report = await verifyCapabilitySkillContractWithApi(parsed, {
      api: fakeApi,
      logLimitBytes: 10000,
    });

    expect(report.passed).toBe(true);
    expect(report.matchedMarkers).toContain('"sessionreused":true');
  });
});
