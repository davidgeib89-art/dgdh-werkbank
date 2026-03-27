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

  it("injects an explicit verified skill brief into the task prompt", () => {
    const context = applyIssuePromptContext(
      {},
      {
        id: "issue-2",
        companyId: "company-1",
        projectId: "project-1",
        goalId: null,
        parentId: null,
        identifier: "DAV-201",
        title: "Use skill bridge",
        description: [
          "verifiedSkill: same-session-resume-after-post-tool-capacity",
          "doneWhen: Reuse the same session path after post-tool capacity.",
        ].join("\n"),
      },
    ) as Record<string, unknown>;

    const prompt = String(context.paperclipTaskPrompt ?? "");

    expect(prompt).toContain("Verified skill references (explicit opt-in):");
    expect(prompt).toContain(
      "capabilityId: same-session-resume-after-post-tool-capacity",
    );
    expect(prompt).toContain(
      "resume existing session before child create",
    );
    expect(context.paperclipVerifiedSkillRequestedIds).toEqual([
      "same-session-resume-after-post-tool-capacity",
    ]);
  });

  it("injects explicit closeout truth for post-tool capacity resume runs", () => {
    const context = applyIssuePromptContext(
      {
        postToolCapacityResume: true,
        paperclipPostToolCapacityCloseout: {
          roleTemplateId: "worker",
          childIssueCreated: true,
          parentDelegationPath: "closeout",
          nextResumePoint: "resume_existing_session_worker_closeout",
          guidance:
            "Inspect worker-pr and worker-done first, then finish the canonical handoff.",
        },
      },
      {
        id: "issue-1",
        companyId: "company-1",
        projectId: "project-1",
        goalId: null,
        parentId: "parent-1",
        identifier: "DAV-166",
        title: "Resume worker closeout",
        description: "Finish the worker closeout after post-tool capacity.",
      },
    ) as Record<string, unknown>;

    const prompt = String(context.paperclipTaskPrompt ?? "");

    expect(prompt).toContain("Post-tool capacity resume truth:");
    expect(prompt).toContain("roleTemplateId: worker");
    expect(prompt).toContain(
      "nextResumePoint: resume_existing_session_worker_closeout",
    );
    expect(prompt).toContain(
      "Rule: finish the explicit closeout step first before widening the run again.",
    );
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

  it("stores assigned role template ids into heartbeat context for routing", () => {
    const heartbeatSource = readFileSync(
      path.resolve(__dirname, "../../..", "server/src/services/heartbeat.ts"),
      "utf8",
    );
    const routingSource = readFileSync(
      path.resolve(
        __dirname,
        "../../..",
        "server/src/services/heartbeat-gemini-routing.ts",
      ),
      "utf8",
    );

    expect(heartbeatSource).toContain("delete context.agentRole;");
    expect(heartbeatSource).toContain("prepareHeartbeatGeminiRouting({");
    expect(routingSource).toContain("patch.agentRole = assigned.template.id;");
    expect(routingSource).toContain("patch.roleName = assigned.template.label;");
  });
});
