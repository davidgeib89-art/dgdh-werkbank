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
        "reviewPolicy: required",
        "needsReview: true",
        "targetFile: doc/DGDH-AI-OPERATOR-RUNBOOK.md",
        "doneWhen: The runbook note reflects the readiness rule and is validated in a bounded run.",
      ].join("\n"),
    });

    expect(truth.status).toBe("ready");
    expect(truth.targetFile).toBe("doc/DGDH-AI-OPERATOR-RUNBOOK.md");
    expect(truth.targetFolder).toBe("doc");
    expect(truth.artifactKind).toBe("doc_update");
    expect(truth.reasonCodes).toEqual([]);
    expect(truth.triad.ceoCutStatus).toBe("ready");
    expect(truth.triad.workerPacket.source).toBe("explicit");
    expect(truth.triad.reviewerPacket.source).toBe("derived");
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

  it("parses metadata fields when a child packet description contains literal escaped newlines", () => {
    const truth = resolveIssueExecutionPacketTruth({
      title: "Runbook note update",
      description:
        "packetType: free_api\\nexecutionIntent: implement\\nreviewPolicy: required\\nneedsReview: true\\ntargetFile: doc/DGDH-AI-OPERATOR-RUNBOOK.md\\ntargetFolder: doc\\nartifactKind: doc_update\\ndoneWhen: The runbook note reflects the readiness rule and is validated in a bounded run.\\nreviewerFocus: Verify the exact runbook note and keep scope inside doc/.\\nreviewerAcceptWhen: Accept only when the runbook note matches the new readiness rule.\\nreviewerChangeWhen: Request changes on any drift or missing validation note.\\n[NEEDS INPUT]: none",
    });

    expect(truth.packetType).toBe("free_api");
    expect(truth.executionIntent).toBe("implement");
    expect(truth.reviewPolicy).toBe("required");
    expect(truth.needsReview).toBe(true);
    expect(truth.targetFile).toBe("doc/DGDH-AI-OPERATOR-RUNBOOK.md");
    expect(truth.targetFolder).toBe("doc");
    expect(truth.artifactKind).toBe("doc_update");
    expect(truth.doneWhen).toBe(
      "The runbook note reflects the readiness rule and is validated in a bounded run.",
    );
    expect(truth.status).toBe("ready");
    expect(truth.reasonCodes).toEqual([]);
    expect(truth.triad.ceoCutStatus).toBe("ready");
    expect(truth.triad.reviewerPacket.source).toBe("explicit");
    expect(truth.triad.reviewerPacket.focus).toBe(
      "Verify the exact runbook note and keep scope inside doc/.",
    );
  });

  // CLI-to-Server alignment tests: verify server correctly parses CLI-emitted artifactKind
  it("correctly reads artifactKind: doc_update from CLI-emitted description", () => {
    // CLI format as emitted by buildTriadDescription for --target-file doc/README.md
    const cliEmittedDescription = [
      "missionCell: triad-mission-loop-v1",
      "",
      "Objective: Update documentation",
      "Scope: doc/README.md",
      "targetFile: doc/README.md",
      "artifactKind: doc_update",
      "doneWhen: The README accurately describes the feature",
      "",
      "reviewerFocus: Verify all doneWhen criteria are met with concrete file or test evidence.",
      "reviewerAcceptWhen: All doneWhen items satisfied with substance, not superficial paraphrase.",
      "reviewerChangeWhen: Any doneWhen criterion missing, scope drift, out-of-scope file changes, or superficial/weak implementation.",
      "",
      "[NEEDS INPUT]: none",
    ].join("\n");

    const truth = resolveIssueExecutionPacketTruth({
      title: "Update README documentation",
      description: cliEmittedDescription,
    });

    expect(truth.artifactKind).toBe("doc_update");
    expect(truth.targetFile).toBe("doc/README.md");
    expect(truth.status).toBe("ready");
    expect(truth.reasonCodes).toEqual([]);
  });

  it("correctly reads artifactKind: config_change from CLI-emitted description", () => {
    // CLI format as emitted by buildTriadDescription for --target-file package.json
    const cliEmittedDescription = [
      "missionCell: triad-mission-loop-v1",
      "",
      "Objective: Update package dependencies",
      "Scope: package.json",
      "targetFile: package.json",
      "artifactKind: config_change",
      "doneWhen: All dependencies are updated and tests pass",
      "",
      "reviewerFocus: Verify all doneWhen criteria are met with concrete file or test evidence.",
      "reviewerAcceptWhen: All doneWhen items satisfied with substance, not superficial paraphrase.",
      "reviewerChangeWhen: Any doneWhen criterion missing, scope drift, out-of-scope file changes, or superficial/weak implementation.",
      "",
      "[NEEDS INPUT]: none",
    ].join("\n");

    const truth = resolveIssueExecutionPacketTruth({
      title: "Update package.json dependencies",
      description: cliEmittedDescription,
    });

    expect(truth.artifactKind).toBe("config_change");
    expect(truth.targetFile).toBe("package.json");
    expect(truth.status).toBe("ready");
    expect(truth.reasonCodes).toEqual([]);
  });

  it("correctly reads artifactKind: multi_file_change from folder-only CLI description", () => {
    // CLI format as emitted by buildTriadDescription for --target-folder server/src/services (no --target-file)
    const cliEmittedDescription = [
      "missionCell: triad-mission-loop-v1",
      "",
      "Objective: Refactor server services",
      "Scope: server/src/services",
      "targetFolder: server/src/services",
      "artifactKind: multi_file_change",
      "doneWhen: All services are refactored and tests pass",
      "",
      "reviewerFocus: Verify all doneWhen criteria are met with concrete file or test evidence.",
      "reviewerAcceptWhen: All doneWhen items satisfied with substance, not superficial paraphrase.",
      "reviewerChangeWhen: Any doneWhen criterion missing, scope drift, out-of-scope file changes, or superficial/weak implementation.",
      "",
      "[NEEDS INPUT]: none",
    ].join("\n");

    const truth = resolveIssueExecutionPacketTruth({
      title: "Refactor server services",
      description: cliEmittedDescription,
    });

    expect(truth.artifactKind).toBe("multi_file_change");
    expect(truth.targetFolder).toBe("server/src/services");
    expect(truth.targetFile).toBe(null);
    expect(truth.status).toBe("ready");
    expect(truth.reasonCodes).toEqual([]);
  });

  it("correctly reads artifactKind: code_patch from CLI-emitted description with code file", () => {
    // CLI format as emitted by buildTriadDescription for --target-file src/auth.ts
    const cliEmittedDescription = [
      "missionCell: triad-mission-loop-v1",
      "",
      "Objective: Fix auth bug",
      "Scope: src/auth.ts",
      "targetFile: src/auth.ts",
      "artifactKind: code_patch",
      "doneWhen: Auth bug is fixed and tests pass",
      "",
      "reviewerFocus: Verify all doneWhen criteria are met with concrete file or test evidence.",
      "reviewerAcceptWhen: All doneWhen items satisfied with substance, not superficial paraphrase.",
      "reviewerChangeWhen: Any doneWhen criterion missing, scope drift, out-of-scope file changes, or superficial/weak implementation.",
      "",
      "[NEEDS INPUT]: none",
    ].join("\n");

    const truth = resolveIssueExecutionPacketTruth({
      title: "Fix auth bug",
      description: cliEmittedDescription,
    });

    expect(truth.artifactKind).toBe("code_patch");
    expect(truth.targetFile).toBe("src/auth.ts");
    expect(truth.status).toBe("ready");
    expect(truth.reasonCodes).toEqual([]);
  });

  it("correctly reads artifactKind: test_update from CLI-emitted description with test file", () => {
    // CLI format as emitted by buildTriadDescription for --target-file src/foo.test.ts
    const cliEmittedDescription = [
      "missionCell: triad-mission-loop-v1",
      "",
      "Objective: Add auth tests",
      "Scope: src/auth.test.ts",
      "targetFile: src/auth.test.ts",
      "artifactKind: test_update",
      "doneWhen: Auth tests cover all edge cases",
      "",
      "reviewerFocus: Verify all doneWhen criteria are met with concrete file or test evidence.",
      "reviewerAcceptWhen: All doneWhen items satisfied with substance, not superficial paraphrase.",
      "reviewerChangeWhen: Any doneWhen criterion missing, scope drift, out-of-scope file changes, or superficial/weak implementation.",
      "",
      "[NEEDS INPUT]: none",
    ].join("\n");

    const truth = resolveIssueExecutionPacketTruth({
      title: "Add auth tests",
      description: cliEmittedDescription,
    });

    expect(truth.artifactKind).toBe("test_update");
    expect(truth.targetFile).toBe("src/auth.test.ts");
    expect(truth.status).toBe("ready");
    expect(truth.reasonCodes).toEqual([]);
  });
});
