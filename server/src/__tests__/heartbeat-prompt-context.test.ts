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

  it("injects mission cell references into the issue prompt context when explicitly requested", () => {
    const patch = buildHeartbeatIssuePromptContextPatch({
      contextSnapshot: {},
      issue: {
        id: "issue-cell-1",
        companyId: "company-1",
        projectId: "project-1",
        goalId: null,
        parentId: null,
        identifier: "DAV-301",
        title: "Start the mission cell",
        description: [
          "missionCell: mission-cell-starter-path-v1",
          "Ziel: Start the first real mission cell on a bounded path.",
        ].join("\n"),
      },
    });

    expect(patch.paperclipMissionCellRequestedIds).toEqual([
      "mission-cell-starter-path-v1",
    ]);
    expect(patch.paperclipMissionCellReferences).toEqual([
      expect.objectContaining({
        missionCellId: "mission-cell-starter-path-v1",
        status: "active",
      }),
    ]);
    expect(String(patch.paperclipTaskPrompt ?? "")).toContain(
      "Mission cell references (explicit operating lane):",
    );
    expect(String(patch.paperclipTaskPrompt ?? "")).toContain(
      "missionCellId: mission-cell-starter-path-v1",
    );
    expect(String(patch.paperclipTaskPrompt ?? "")).toContain(
      "type1Escalations: main branch mutation outside normal reviewed merge flow | deploys and live external effects | global secrets or permission changes | irreversible data or cost consequences | global policy changes beyond the current mission cell",
    );
  });

  it("surfaces invalid mission cell references as prompt warnings", () => {
    const patch = buildHeartbeatIssuePromptContextPatch({
      contextSnapshot: {},
      issue: {
        id: "issue-cell-2",
        companyId: "company-1",
        projectId: "project-1",
        goalId: null,
        parentId: null,
        identifier: "DAV-302",
        title: "Bad mission cell ref",
        description: "missionCell: does-not-exist",
      },
    });

    expect(patch.paperclipMissionCellReferences).toBeNull();
    expect(patch.paperclipMissionCellReferenceErrors).toEqual([
      expect.stringContaining("does-not-exist"),
    ]);
    expect(String(patch.paperclipTaskPrompt ?? "")).toContain(
      "Mission cell reference warnings:",
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

  it("keeps narrow direct-answer audit instructions visible in the task prompt", () => {
    const patch = buildHeartbeatIssuePromptContextPatch({
      contextSnapshot: {},
      issue: {
        id: "issue-audit-1",
        companyId: "company-1",
        projectId: "project-1",
        goalId: null,
        parentId: null,
        identifier: "DAV-156",
        title: "Resume proof audit via verified skill bridge",
        description: [
          "verifiedSkill: same-session-resume-after-post-tool-capacity",
          "Ziel: Give a direct answer on whether DAV-131 still proves same-session resume and whether the verified skill brief keeps the audit path narrow.",
          "Scope: Direct answer only. Read child issue status first, then inspect only DAV-131 company-run-chain and the two referenced heartbeat runs. No child creation. No code. No file edits. No git. No repo reads. No resume-trigger chase.",
          "doneWhen: Answer directly from the named audit surfaces without archaeology.",
        ].join("\n"),
      },
    });

    const prompt = String(patch.paperclipTaskPrompt ?? "");
    expect(prompt).toContain(
      "Scope: Direct answer only. Read child issue status first, then inspect only DAV-131 company-run-chain and the two referenced heartbeat runs. No child creation. No code. No file edits. No git. No repo reads. No resume-trigger chase.",
    );
    expect(prompt).toContain("No resume-trigger chase.");
    expect(prompt).toContain(
      "doneWhen: Answer directly from the named audit surfaces without archaeology.",
    );
    expect(prompt).toContain(
      "capabilityId: same-session-resume-after-post-tool-capacity",
    );
    expect(prompt).toContain("Direct-answer audit guardrail:");
    expect(prompt).toContain(
      "namedTruthSurfaces: DAV-131 company-run-chain, the two referenced heartbeat runs",
    );
    expect(prompt).toContain("issueIdentifiers: DAV-131");
    expect(prompt).toContain(
      "Route rule: heartbeat runs live under `/api/heartbeat-runs/{runId}`. Do not use `/api/runs/{id}`.",
    );
    expect(prompt).toContain(
      "Preferred step 2: resolve the exact issue UUID with `$issue = (Invoke-RestMethod -Headers @{ Authorization = \"Bearer $env:PAPERCLIP_API_KEY\" } -Uri \"$env:PAPERCLIP_API_URL/api/companies/$env:PAPERCLIP_COMPANY_ID/issues?q=DAV-131\") | Where-Object { $_.identifier -eq \"DAV-131\" } | Select-Object -First 1`",
    );
    expect(prompt).toContain(
      "Preferred step 3: read company-run-chain with `Invoke-RestMethod -Headers @{ Authorization = \"Bearer $env:PAPERCLIP_API_KEY\" } -Uri \"$env:PAPERCLIP_API_URL/api/issues/$($issue.id)/company-run-chain\"`",
    );
    expect(prompt).toContain(
      "Rule: After the required child-status read, stay on the named truth surfaces only and answer directly.",
    );
    expect(patch.paperclipAllowedTools).toEqual([
      "read_file",
      "run_shell_command",
    ]);
    expect(patch.paperclipBlockedTools).toEqual([
      "list_directory",
      "glob_search",
      "grep_search",
      "activate_skill",
    ]);
    expect(patch.paperclipDirectAnswerAuditTruth).toEqual(
      expect.objectContaining({
        bounded: true,
        requiresChildStatusRead: true,
        forbidRepoReads: true,
        forbidChildCreation: true,
        forbidResumeTriggerChase: true,
      }),
    );
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
