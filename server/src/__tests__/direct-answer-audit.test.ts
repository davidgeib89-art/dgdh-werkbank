import { describe, expect, it } from "vitest";
import { resolveDirectAnswerAuditTruth } from "../services/direct-answer-audit.js";

describe("resolveDirectAnswerAuditTruth", () => {
  it("extracts bounded direct-answer audit truth from named surfaces", () => {
    const result = resolveDirectAnswerAuditTruth({
      title: "Resume proof audit via verified skill bridge",
      description: [
        "verifiedSkill: same-session-resume-after-post-tool-capacity",
        "Scope: Direct answer only. Read child issue status first, then inspect only DAV-131 company-run-chain and the two referenced heartbeat runs. No child creation. No code. No file edits. No git. No repo reads. No resume-trigger chase.",
        "doneWhen: Answer directly from the named audit surfaces without archaeology.",
      ].join("\n"),
    });

    expect(result).toEqual({
      bounded: true,
      directAnswerOnly: true,
      requiresChildStatusRead: true,
      namedTruthSurfaces: [
        "DAV-131 company-run-chain",
        "the two referenced heartbeat runs",
      ],
      forbidChildCreation: true,
      forbidRepoReads: true,
      forbidGit: true,
      forbidArchaeology: true,
      forbidResumeTriggerChase: true,
    });
  });

  it("stays null for non-audit packets", () => {
    const result = resolveDirectAnswerAuditTruth({
      title: "Runbook Update",
      description:
        "Scope: Create one child packet for a tiny doc update and assign it to a worker.",
    });

    expect(result).toBeNull();
  });
});
