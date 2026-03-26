import { describe, expect, it } from "vitest";
import {
  applyHeartbeatContextPatch,
  buildHeartbeatIssuePromptContextPatch,
  buildHeartbeatReviewerPromptContextPatch,
} from "../services/heartbeat-prompt-context.ts";

describe("buildHeartbeatIssuePromptContextPatch", () => {
  it("builds an issue patch without mutating the source context", () => {
    const context = {
      paperclipWorkspace: {
        cwd: "C:/repo",
        branchName: "main",
        worktreePath: "C:/repo",
      },
      untouched: "keep-me",
    } satisfies Record<string, unknown>;
    const snapshot = JSON.parse(JSON.stringify(context));

    const patch = buildHeartbeatIssuePromptContextPatch({
      contextSnapshot: context,
      issue: {
        id: "issue-1",
        companyId: "company-1",
        projectId: "project-1",
        goalId: null,
        parentId: "parent-1",
        identifier: "DAV-100",
        title: "Tighten heartbeat seams",
        description: "Ship the seam extraction artifact.",
      },
    });

    expect(context).toEqual(snapshot);
    expect(patch.paperclipIssue).toMatchObject({
      id: "issue-1",
      companyId: "company-1",
      projectId: "project-1",
      parentId: "parent-1",
      identifier: "DAV-100",
    });
    expect(String(patch.paperclipTaskPrompt ?? "")).toContain(
      "Tighten heartbeat seams",
    );
    expect(String(patch.paperclipWorkspacePrompt ?? "")).toContain(
      "Execution workspace:",
    );
  });

  it("injects verified skill references into the issue prompt context when explicitly requested", () => {
    const patch = buildHeartbeatIssuePromptContextPatch({
      contextSnapshot: {},
      issue: {
        id: "issue-skill-1",
        companyId: "company-1",
        projectId: "project-1",
        goalId: null,
        parentId: null,
        identifier: "DAV-201",
        title: "Use the native handoff skill",
        description: [
          "verifiedSkill: ceo-native-issue-handoff-primitives",
          "Goal: Delegate using the already verified native child handoff path.",
        ].join("\n"),
      },
    });

    expect(patch.paperclipVerifiedSkillRequestedIds).toEqual([
      "ceo-native-issue-handoff-primitives",
    ]);
    expect(patch.paperclipVerifiedSkillReferences).toEqual([
      expect.objectContaining({
        capabilityId: "ceo-native-issue-handoff-primitives",
        maturity: "verified",
      }),
    ]);
    expect(String(patch.paperclipTaskPrompt ?? "")).toContain(
      "Verified skill references (explicit opt-in):",
    );
    expect(String(patch.paperclipTaskPrompt ?? "")).toContain(
      "capabilityId: ceo-native-issue-handoff-primitives",
    );
    expect(String(patch.paperclipTaskPrompt ?? "")).toContain(
      "paperclipai issue list --company-id",
    );
  });

  it("surfaces invalid verified skill references as prompt warnings", () => {
    const patch = buildHeartbeatIssuePromptContextPatch({
      contextSnapshot: {},
      issue: {
        id: "issue-skill-2",
        companyId: "company-1",
        projectId: "project-1",
        goalId: null,
        parentId: null,
        identifier: "DAV-202",
        title: "Bad skill ref",
        description: "verifiedSkill: does-not-exist",
      },
    });

    expect(patch.paperclipVerifiedSkillReferences).toBeNull();
    expect(patch.paperclipVerifiedSkillReferenceErrors).toEqual([
      expect.stringContaining("does-not-exist"),
    ]);
    expect(String(patch.paperclipTaskPrompt ?? "")).toContain(
      "Capability reference warnings:",
    );
  });

  it("raises the hard cap for explicit same-session post-tool proofs", () => {
    const patch = buildHeartbeatIssuePromptContextPatch({
      contextSnapshot: {},
      issue: {
        id: "issue-ptc-proof",
        companyId: "company-1",
        projectId: "project-1",
        goalId: null,
        parentId: null,
        identifier: "DAV-200",
        title: "Truth cut: post-tool capacity same-session proof",
        description: [
          "packetType: free_api",
          "executionIntent: implement",
          "reviewPolicy: required",
          "needsReview: true",
          "targetFile: doc/DGDH-AI-OPERATOR-RUNBOOK.md",
          "targetFolder: doc",
          "artifactKind: doc_update",
          "doneWhen: The CEO hits post-tool capacity after real tool calls, the deferred wake is promoted, and the resumed CEO run carries the same session path before any child creation.",
        ].join("\n"),
      },
    });

    expect(patch.workPacketBudget).toEqual({
      budgetClass: "large",
      hardCapTokens: 500000,
    });
  });
});

describe("buildHeartbeatReviewerPromptContextPatch", () => {
  it("returns reviewer-specific fields without mutating the source context", () => {
    const context = {
      paperclipWorkspace: {
        cwd: "C:/repo",
      },
      untouched: "keep-me",
    } satisfies Record<string, unknown>;
    const snapshot = JSON.parse(JSON.stringify(context));

    const patch = buildHeartbeatReviewerPromptContextPatch({
      contextSnapshot: context,
      issue: {
        id: "issue-2",
        identifier: "DAV-101",
        title: "Review worker handoff",
        description: "Inspect the worker result",
      },
      reviewTarget: null,
    });

    expect(context).toEqual(snapshot);
    expect(String(patch.paperclipOriginalTaskPrompt ?? "")).toContain(
      "Review worker handoff",
    );
    expect(String(patch.paperclipTaskPrompt ?? "")).toContain(
      "You are reviewing the latest worker result",
    );
    expect(patch.paperclipReviewTarget).toBeNull();
    expect(patch.paperclipReviewTargetError).toBe(
      "No prior non-reviewer run found for this issue.",
    );
  });
});

describe("applyHeartbeatContextPatch", () => {
  it("applies values and deletes null keys", () => {
    const context = {
      keep: "before",
      removeMe: true,
    } satisfies Record<string, unknown>;

    const next = applyHeartbeatContextPatch(context, {
      keep: "after",
      removeMe: null,
      added: "new",
    });

    expect(next).toEqual({
      keep: "after",
      added: "new",
    });
  });
});
