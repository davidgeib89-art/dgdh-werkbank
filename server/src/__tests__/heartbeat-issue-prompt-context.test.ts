import { describe, expect, it } from "vitest";
import { applyIssuePromptContext } from "../services/heartbeat.js";

describe("applyIssuePromptContext", () => {
  it("injects explicit paperclip api ids into the task prompt", () => {
    const previousApiUrl = process.env.PAPERCLIP_API_URL;
    process.env.PAPERCLIP_API_URL = "http://localhost:3100";
    const context = applyIssuePromptContext(
      {},
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
    if (previousApiUrl === undefined) delete process.env.PAPERCLIP_API_URL;
    else process.env.PAPERCLIP_API_URL = previousApiUrl;
  });
});
