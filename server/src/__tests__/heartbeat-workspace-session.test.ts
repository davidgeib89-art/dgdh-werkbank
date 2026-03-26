import { describe, expect, it } from "vitest";
import { resolveDefaultAgentWorkspaceDir } from "../home-paths.js";
import {
  resolveRuntimeSessionParamsForWorkspace,
  shouldResetTaskSessionForWake,
  prepareHeartbeatWorkspaceSessionPlan,
  type ResolvedWorkspaceForRun,
} from "../services/heartbeat.ts";

function buildResolvedWorkspace(overrides: Partial<ResolvedWorkspaceForRun> = {}): ResolvedWorkspaceForRun {
  return {
    cwd: "/tmp/project",
    source: "project_primary",
    projectId: "project-1",
    workspaceId: "workspace-1",
    repoUrl: null,
    repoRef: null,
    workspaceHints: [],
    warnings: [],
    ...overrides,
  };
}

describe("resolveRuntimeSessionParamsForWorkspace", () => {
  it("migrates fallback workspace sessions to project workspace when project cwd becomes available", () => {
    const agentId = "agent-123";
    const fallbackCwd = resolveDefaultAgentWorkspaceDir(agentId);

    const result = resolveRuntimeSessionParamsForWorkspace({
      agentId,
      previousSessionParams: {
        sessionId: "session-1",
        cwd: fallbackCwd,
        workspaceId: "workspace-1",
      },
      resolvedWorkspace: buildResolvedWorkspace({ cwd: "/tmp/new-project-cwd" }),
    });

    expect(result.sessionParams).toMatchObject({
      sessionId: "session-1",
      cwd: "/tmp/new-project-cwd",
      workspaceId: "workspace-1",
    });
    expect(result.warning).toContain("Attempting to resume session");
  });

  it("does not migrate when previous session cwd is not the fallback workspace", () => {
    const result = resolveRuntimeSessionParamsForWorkspace({
      agentId: "agent-123",
      previousSessionParams: {
        sessionId: "session-1",
        cwd: "/tmp/some-other-cwd",
        workspaceId: "workspace-1",
      },
      resolvedWorkspace: buildResolvedWorkspace({ cwd: "/tmp/new-project-cwd" }),
    });

    expect(result.sessionParams).toEqual({
      sessionId: "session-1",
      cwd: "/tmp/some-other-cwd",
      workspaceId: "workspace-1",
    });
    expect(result.warning).toBeNull();
  });

  it("does not migrate when resolved workspace id differs from previous session workspace id", () => {
    const agentId = "agent-123";
    const fallbackCwd = resolveDefaultAgentWorkspaceDir(agentId);

    const result = resolveRuntimeSessionParamsForWorkspace({
      agentId,
      previousSessionParams: {
        sessionId: "session-1",
        cwd: fallbackCwd,
        workspaceId: "workspace-1",
      },
      resolvedWorkspace: buildResolvedWorkspace({
        cwd: "/tmp/new-project-cwd",
        workspaceId: "workspace-2",
      }),
    });

    expect(result.sessionParams).toEqual({
      sessionId: "session-1",
      cwd: fallbackCwd,
      workspaceId: "workspace-1",
    });
    expect(result.warning).toBeNull();
  });
});

describe("shouldResetTaskSessionForWake", () => {
  it("resets session context on assignment wake", () => {
    expect(shouldResetTaskSessionForWake({ wakeReason: "issue_assigned" })).toBe(true);
  });

  it("preserves session context on timer heartbeats", () => {
    expect(shouldResetTaskSessionForWake({ wakeSource: "timer" })).toBe(false);
  });

  it("preserves session context on manual on-demand invokes by default", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeSource: "on_demand",
        wakeTriggerDetail: "manual",
      }),
    ).toBe(false);
  });

  it("resets session context when a fresh session is explicitly requested", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeSource: "on_demand",
        wakeTriggerDetail: "manual",
        forceFreshSession: true,
      }),
    ).toBe(true);
  });

  it("does not reset session context on mention wake comment", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeReason: "issue_comment_mentioned",
        wakeCommentId: "comment-1",
      }),
    ).toBe(false);
  });

  it("does not reset session context when commentId is present", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeReason: "issue_commented",
        commentId: "comment-2",
      }),
    ).toBe(false);
  });

  it("does not reset for comment wakes", () => {
    expect(shouldResetTaskSessionForWake({ wakeReason: "issue_commented" })).toBe(false);
  });

  it("does not reset when wake reason is missing", () => {
    expect(shouldResetTaskSessionForWake({})).toBe(false);
  });

  it("does not reset session context on callback on-demand invokes", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeSource: "on_demand",
        wakeTriggerDetail: "callback",
      }),
    ).toBe(false);
  });
});

describe("prepareHeartbeatWorkspaceSessionPlan", () => {
  it("preserves ready-path session reuse for post-tool capacity resumes", async () => {
    const plan = await prepareHeartbeatWorkspaceSessionPlan(
      {
        db: {} as any,
        agent: {
          id: "agent-1",
          name: "CEO Agent",
          companyId: "company-1",
        } as any,
        context: {
          paperclipDefaultExecutionPath: "ready_small_default",
          forceFreshSession: true,
          wakeReason: "post_tool_capacity_resume",
          postToolCapacityResume: true,
        },
        previousSessionParams: {
          sessionId: "session-1",
          cwd: "/tmp/project",
          workspaceId: "workspace-1",
        },
        runtimeSessionId: null,
        taskKey: "DAV-97",
        taskSessionForRun: { sessionDisplayId: "session-1" },
        resetTaskSession: false,
        resolvedConfig: {},
        executionWorkspaceMode: "isolated",
        useProjectWorkspace: true,
        issueId: "issue-1",
        issueRef: {
          id: "issue-1",
          companyId: "company-1",
          projectId: "project-1",
          goalId: null,
          parentId: null,
          identifier: "DAV-97",
          title: "Resume proof",
          description: null,
        },
        sessionCodec: {
          deserialize: (raw) => raw as Record<string, unknown> | null,
          serialize: (params) => params,
          getDisplayId: (params) => (typeof params?.sessionId === "string" ? params.sessionId : null),
        },
        realizeExecutionWorkspace: async () => ({
          cwd: "/tmp/project",
          source: "project_primary",
          projectId: "project-1",
          workspaceId: "workspace-1",
          repoUrl: null,
          repoRef: null,
          branchName: null,
          worktreePath: null,
          strategy: "project_primary",
          warnings: [],
        }),
      },
      {
        resolveWorkspaceForRun: async () =>
          buildResolvedWorkspace({ cwd: "/tmp/project", workspaceId: "workspace-1" }),
        evaluateSessionCompaction: async () => ({
          rotate: false,
          reason: null,
          handoffMarkdown: null,
          previousRunId: null,
        }),
        evaluateSingleFileBenchmarkPreflight: async () => ({
          required: false,
          ok: true,
          reason: null,
          adapterCwd: "/tmp/project",
          rawWorkspaceCwd: "/tmp/project",
          effectiveWorkspaceCwd: "/tmp/project",
          workspaceSource: "project_primary",
          configuredCwd: null,
          configuredCwdExists: false,
          resolutionStrategy: "workspace",
          singleFileTargetPath: null,
          singleFileTargetResolvedPath: null,
          targetExists: false,
          targetWithinEffectiveCwd: false,
          issueTaskPromptPresent: false,
          issueTaskPromptPreview: null,
          abortOnMissingFile: false,
        }),
      },
    );

    expect(plan.runtimeForAdapter.sessionId).toBe("session-1");
    expect(plan.runtimeForAdapter.sessionDisplayId).toBe("session-1");
  });
});
