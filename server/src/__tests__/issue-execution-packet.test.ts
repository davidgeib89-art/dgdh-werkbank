import { describe, expect, it } from "vitest";
import { resolveIssueExecutionPacketTruth } from "../services/issue-execution-packet.js";

describe("resolveIssueExecutionPacketTruth", () => {
  it("marks execution-heavy packets not ready with early reason codes", () => {
    const truth = resolveIssueExecutionPacketTruth({
      title: "Fix readiness handling",
      description: [
        "executionIntent: implement",
        "Scope: Fix the server path for execution packets.",
        "doneWhen: n/a",
      ].join("\n"),
    });

    expect(truth.executionHeavy).toBe(true);
    expect(truth.status).toBe("not_ready");
    expect(truth.reasonCodes).toEqual([
      "donewhen_missing",
      "artifact_kind_missing",
      "target_folder_missing",
      "target_file_missing",
      "execution_scope_ambiguous",
    ]);
  });

  it("derives targetFolder and artifactKind from a single target file", () => {
    const truth = resolveIssueExecutionPacketTruth({
      title: "Runbook note update",
      description: [
        "executionIntent: implement",
        "targetFile: doc/DGDH-AI-OPERATOR-RUNBOOK.md",
        "doneWhen: The runbook note reflects the readiness rule and is validated in a bounded run.",
      ].join("\n"),
    });

    expect(truth.status).toBe("ready");
    expect(truth.targetFile).toBe("doc/DGDH-AI-OPERATOR-RUNBOOK.md");
    expect(truth.targetFolder).toBe("doc");
    expect(truth.artifactKind).toBe("doc_update");
    expect(truth.reasonCodes).toEqual([]);
  });

  it("allows explicit folder-only packets when artifact kind makes the scope clear", () => {
    const truth = resolveIssueExecutionPacketTruth({
      title: "Refine server packet surfaces",
      description: [
        "executionIntent: implement",
        "targetFolder: server/src/services",
        "artifactKind: multi_file_change",
        "doneWhen: The readiness rules and surfaces are wired through the server product path.",
      ].join("\n"),
    });

    expect(truth.executionHeavy).toBe(true);
    expect(truth.status).toBe("ready");
    expect(truth.reasonCodes).toEqual([]);
  });

  it("allows bounded multi-file test packets with explicit file targets", () => {
    const truth = resolveIssueExecutionPacketTruth({
      title: "Gate run: small multi-file regression-test packet",
      description: [
        "Target folder: server/src/__tests__",
        "Artifact kind: test_update",
        "Specific mission for this gate run:",
        "- add regression coverage by updating exactly these files:",
        "  - server/src/__tests__/ceo-merge-service.test.ts",
        "  - server/src/__tests__/issue-merge-pr-route.test.ts",
        "DoneWhen: Both named test files contain bounded new coverage and the validation command passes.",
      ].join("\n"),
    });

    expect(truth.executionHeavy).toBe(true);
    expect(truth.targetFile).toBe(null);
    expect(truth.targetFolder).toBe("server/src/__tests__");
    expect(truth.artifactKind).toBe("test_update");
    expect(truth.status).toBe("ready");
    expect(truth.reasonCodes).toEqual([]);
  });
});