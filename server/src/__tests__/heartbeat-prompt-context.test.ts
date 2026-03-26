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
