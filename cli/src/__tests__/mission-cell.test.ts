import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMissionCellOperationalBrief,
  listMissionCellContractFiles,
  listMissionCellContractSummaries,
  loadMissionCellContract,
  loadMissionCellContractByRef,
} from "../commands/mission-cell.js";

function buildMissionCellFixture() {
  return {
    schemaVersion: "v1",
    missionCellId: "mission-cell-starter-path-v1",
    title: "Mission Cell Starter Path V1",
    summary:
      "First startable mission-cell operating form for bounded self-improvement inside DGDH.",
    owners: ["david", "copilot"],
    status: "active",
    updatedAt: "2026-03-27T00:00:00.000Z",
    charter: {
      objective:
        "Start a mission cell with one explicit bounded charter, one real operating path, and one promotion target.",
      primaryMetric:
        "A future mission can be started from one contract reference plus one issue packet without David restating the lane.",
      guardMetrics: [
        "No unbounded platform expansion",
        "No Type-1 decision executed without escalation",
      ],
      budget: "One long autonomous branch-sized mission",
      runtime: "24-72h reviewable autonomous lane",
      blastRadius: ["company-hq/**", "packages/shared/**", "cli/**", "server/**"],
      allowedZones: ["mission contracts", "prompt/runtime bridges", "targeted tests"],
      forbiddenZones: ["provider migration", "destructive DB work"],
    },
    decisionPolicy: {
      type2Autonomy: ["bounded branch edits", "prompt/context improvements", "targeted replay/eval harness changes"],
      type1Escalations: ["main", "deploy", "global secrets/permissions", "irreversible external effects"],
      escalationPath: ["stop at the boundary", "record the blocker", "escalate to David/Oberreviewer"],
    },
    riskGate: {
      oberreviewerTriggers: ["Type-1 boundary reached", "mission cut widens beyond stated blast radius"],
      requiredEvidence: ["git truth", "tests/replay truth", "changed-file truth"],
      stopReasons: ["true Type-1 point", "external blocker", "unbounded megascope pressure"],
    },
    eval: {
      replayChecks: ["prompt/runtime bridge carries mission cell context", "starter path stays narrow and repeatable"],
      guardChecks: ["Type-1 vs Type-2 split remains explicit", "promotion path remains review-gated"],
      successSignals: ["contract validates", "issue can reference missionCell directly", "brief answers start/escalation/promotion questions"],
    },
    promotion: {
      defaultTargets: ["company-hq/mission-contracts/*.md", "CURRENT.md", "MEMORY.md"],
      promoteWhen: ["the same start path can be reused without chat reconstruction"],
      stayExperimentalWhen: ["evidence is only local or one-off"],
      demoteWhen: ["guard metrics regress or the lane causes supervision inflation"],
    },
    boundaries: {
      firmBound: ["mission charter shape", "decision policy", "risk/eval/promotion rules"],
      carrierBound: ["issue prompt injection", "CLI contract loading", "runtime wakeup context"],
    },
    starterPath: {
      trigger:
        "Create or update an issue with `missionCell: mission-cell-starter-path-v1` and explicit execution packet truth.",
      issueTemplate: [
        "missionCell: mission-cell-starter-path-v1",
        "Ziel: <bounded mission objective>",
        "Scope: <in/out>",
        "doneWhen: <verifiable outcome>",
      ],
      startupSequence: [
        "Validate the mission-cell contract",
        "Reference the mission cell in the issue description",
        "Packetize the execution path inside the stated blast radius",
        "Escalate only at true Type-1 or Oberreviewer triggers",
      ],
      firstProbe: [
        "Check that the issue prompt contains the mission cell brief",
        "Check that assignment context carries mission cell references",
      ],
    },
  };
}

function writeTempMissionCell(data: unknown): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-mission-cell-"));
  const filePath = path.join(dir, "mission-cell.json");
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}

describe("mission cell contract commands", () => {
  it("loads and validates a mission cell contract", async () => {
    const filePath = writeTempMissionCell(buildMissionCellFixture());
    const parsed = await loadMissionCellContract(filePath);

    expect(parsed.missionCellId).toBe("mission-cell-starter-path-v1");
    expect(parsed.status).toBe("active");
    expect(parsed.starterPath.startupSequence).toHaveLength(4);
  });

  it("lists mission cell contracts from a directory", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-mission-cells-"));
    fs.writeFileSync(path.join(dir, "a.json"), JSON.stringify(buildMissionCellFixture()), "utf8");
    fs.writeFileSync(path.join(dir, "notes.txt"), "ignore", "utf8");

    const files = await listMissionCellContractFiles(dir);

    expect(files).toHaveLength(1);
    expect(files[0]?.endsWith("a.json")).toBe(true);
  });

  it("filters mission cell summaries by status", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-mission-cell-summaries-"));
    const active = buildMissionCellFixture();
    const draft = { ...buildMissionCellFixture(), missionCellId: "draft-cell", status: "draft" };
    fs.writeFileSync(path.join(dir, "active.json"), JSON.stringify(active), "utf8");
    fs.writeFileSync(path.join(dir, "draft.json"), JSON.stringify(draft), "utf8");

    const summaries = await listMissionCellContractSummaries(dir, { status: "active" });

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.missionCellId).toBe("mission-cell-starter-path-v1");
  });

  it("loads a mission cell contract by id", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-mission-cell-ref-"));
    const filePath = path.join(dir, "contract.json");
    fs.writeFileSync(filePath, JSON.stringify(buildMissionCellFixture()), "utf8");

    const loaded = await loadMissionCellContractByRef("mission-cell-starter-path-v1", {
      rootDir: dir,
    });

    expect(loaded.filePath).toBe(filePath);
    expect(loaded.contract.missionCellId).toBe("mission-cell-starter-path-v1");
  });

  it("builds an operator start brief", async () => {
    const contract = await loadMissionCellContract(
      writeTempMissionCell(buildMissionCellFixture()),
    );

    const brief = buildMissionCellOperationalBrief(
      "company-hq\\mission-cells\\mission-cell-starter-path-v1.json",
      contract,
    );

    expect(brief.missionCellId).toBe("mission-cell-starter-path-v1");
    expect(brief.startReference.filePath).toBe(
      "company-hq/mission-cells/mission-cell-starter-path-v1.json",
    );
    expect(brief.startReference.issueField).toBe(
      "missionCell: mission-cell-starter-path-v1",
    );
    expect(brief.type1Escalations).toContain("main");
  });
});