import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const heartbeatSource = readFileSync(
  path.resolve(__dirname, "../../..", "server/src/services/heartbeat.ts"),
  "utf8",
);

describe("heartbeat orchestration contract", () => {
  it("routes through prompt, routing, workspace, and finalization seams in order", () => {
    const issuePrompt = heartbeatSource.indexOf(
      "buildHeartbeatIssuePromptContextPatch({",
    );
    const routing = heartbeatSource.indexOf(
      "const routingPlan = await prepareHeartbeatGeminiRouting({",
    );
    const workspace = heartbeatSource.indexOf(
      "const workspacePlan = await prepareHeartbeatWorkspaceSessionPlan({",
    );
    const finalization = heartbeatSource.indexOf(
      "await finalizeAgentStatus(agent.id, outcome);",
    );

    expect(issuePrompt).toBeGreaterThan(-1);
    expect(routing).toBeGreaterThan(issuePrompt);
    expect(workspace).toBeGreaterThan(routing);
    expect(finalization).toBeGreaterThan(workspace);
  });

  it("keeps prompt builder implementations out of heartbeat.ts", () => {
    expect(heartbeatSource).not.toContain("function buildIssueTaskPrompt(");
    expect(heartbeatSource).not.toContain("function buildIssueWorkspacePrompt(");
    expect(heartbeatSource).not.toContain("function buildReviewerTaskPrompt(");
  });
});
