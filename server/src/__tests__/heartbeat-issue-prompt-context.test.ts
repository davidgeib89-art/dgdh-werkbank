import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { applyIssuePromptContext } from "../services/heartbeat.js";

describe("applyIssuePromptContext", () => {
  it("injects explicit paperclip api ids into the task prompt", () => {
    const previousApiUrl = process.env.PAPERCLIP_API_URL;
    process.env.PAPERCLIP_API_URL = "http://localhost:3100";
    const context = applyIssuePromptContext(
      {
        paperclipWorkspace: {
          cwd: "C:/repo/.paperclip/worktrees/dgdh-issue-1",
          branchName: "dgdh/issue-DAV-8-branch-truth",
          worktreePath: "C:/repo/.paperclip/worktrees/dgdh-issue-1",
        },
      },
      {
        id: "issue-1",
        companyId: "company-1",
        projectId: "project-1",
        goalId: null,
        parentId: "parent-1",
        identifier: "DAV-8",
        title: "Delegation proof",
        description: "Create the proof artifact.",
      },
    ) as Record<string, unknown>;

    const prompt = String(context.paperclipTaskPrompt ?? "");

    expect(prompt).toContain("Paperclip API context:");
    expect(prompt).toContain("PAPERCLIP_API_URL: http://localhost:3100");
    expect(prompt).toContain("PAPERCLIP_TASK_ID: issue-1");
    expect(prompt).toContain("PAPERCLIP_COMPANY_ID: company-1");
    expect(prompt).toContain("PROJECT_ID: project-1");
    expect(prompt).toContain("PARENT_ID: parent-1");
    expect(prompt).toContain("Execution workspace:");
    expect(prompt).toContain(
      "PAPERCLIP_WORKSPACE_BRANCH: dgdh/issue-DAV-8-branch-truth",
    );
    expect(prompt).toContain(
      "Branch rule: reuse PAPERCLIP_WORKSPACE_BRANCH for commits, worker-pr, and worker-done. Do not create a different ad hoc branch.",
    );
    if (previousApiUrl === undefined) delete process.env.PAPERCLIP_API_URL;
    else process.env.PAPERCLIP_API_URL = previousApiUrl;
  });

  it("keeps company and project ids in the wakeup issue-context select", () => {
    const heartbeatSource = readFileSync(
      path.resolve(__dirname, "../../..", "server/src/services/heartbeat.ts"),
      "utf8",
    );

    expect(heartbeatSource).toContain("companyId: issues.companyId");
    expect(heartbeatSource).toContain("projectId: issues.projectId");
    expect(heartbeatSource).toContain("goalId: issues.goalId");
    expect(heartbeatSource).toContain("parentId: issues.parentId");
  });
});
