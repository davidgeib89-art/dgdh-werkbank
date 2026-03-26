import fs from "node:fs/promises";
import path from "node:path";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, heartbeatRuns, issues, projectWorkspaces } from "@paperclipai/db";
import type {
  AdapterExecutionResult,
  AdapterSessionCodec,
} from "../adapters/index.js";
import { getServerAdapter } from "../adapters/index.js";
import { asBoolean, asNumber, parseObject } from "../adapters/utils.js";
import { resolveDefaultAgentWorkspaceDir } from "../home-paths.js";
import { summarizeHeartbeatRunResultJson } from "./heartbeat-run-summary.js";
import type {
  ExecutionWorkspaceAgentRef,
  ExecutionWorkspaceInput,
  ExecutionWorkspaceIssueRef,
  RealizedExecutionWorkspace,
} from "./workspace-runtime.js";

const REPO_ONLY_CWD_SENTINEL = "/__paperclip_repo_only__";
const SESSIONED_LOCAL_ADAPTERS = new Set([
  "claude_local",
  "codex_local",
  "cursor",
  "gemini_local",
  "opencode_local",
  "pi_local",
]);

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.floor(value)));
}

export type ResolvedWorkspaceForRun = {
  cwd: string;
  source: "project_primary" | "task_session" | "agent_home";
  projectId: string | null;
  workspaceId: string | null;
  repoUrl: string | null;
  repoRef: string | null;
  workspaceHints: Array<{
    workspaceId: string;
    cwd: string | null;
    repoUrl: string | null;
    repoRef: string | null;
  }>;
  warnings: string[];
};

type SessionCompactionPolicy = {
  enabled: boolean;
  maxSessionRuns: number;
  maxRawInputTokens: number;
  maxSessionAgeHours: number;
};

export type SessionCompactionDecision = {
  rotate: boolean;
  reason: string | null;
  handoffMarkdown: string | null;
  previousRunId: string | null;
};

export type AdapterCwdResolution = {
  effectiveRunCwd: string;
  rawWorkspaceCwd: string | null;
  effectiveWorkspaceCwd: string | null;
  workspaceSource: string | null;
  configuredCwd: string | null;
  configuredCwdExists: boolean;
  resolutionStrategy: "configured" | "workspace" | "process";
};

export type SingleFileBenchmarkPreflight = {
  required: boolean;
  ok: boolean;
  reason: string | null;
  adapterCwd: string;
  rawWorkspaceCwd: string | null;
  effectiveWorkspaceCwd: string | null;
  workspaceSource: string | null;
  configuredCwd: string | null;
  configuredCwdExists: boolean;
  resolutionStrategy: "configured" | "workspace" | "process";
  singleFileTargetPath: string | null;
  singleFileTargetResolvedPath: string | null;
  targetExists: boolean;
  targetWithinEffectiveCwd: boolean;
  issueTaskPromptPresent: boolean;
  issueTaskPromptPreview: string | null;
  abortOnMissingFile: boolean;
};

export type HeartbeatRuntimeForAdapter = {
  sessionId: string | null;
  sessionParams: Record<string, unknown> | null;
  sessionDisplayId: string | null;
  taskKey: string | null;
};

export type HeartbeatWorkspaceSessionPlan = {
  resolvedWorkspace: ResolvedWorkspaceForRun;
  executionWorkspace: RealizedExecutionWorkspace;
  runtimeForAdapter: HeartbeatRuntimeForAdapter;
  warnings: string[];
  contextPatch: Record<string, unknown | null>;
  sessionCompaction: SessionCompactionDecision;
  singleFileBenchmarkPreflight: SingleFileBenchmarkPreflight;
};

function parseSessionCompactionPolicy(
  agent: typeof agents.$inferSelect,
): SessionCompactionPolicy {
  const runtimeConfig = parseObject(agent.runtimeConfig);
  const heartbeat = parseObject(runtimeConfig.heartbeat);
  const compaction = parseObject(
    heartbeat.sessionCompaction ??
      heartbeat.sessionRotation ??
      runtimeConfig.sessionCompaction,
  );
  const supportsSessions = SESSIONED_LOCAL_ADAPTERS.has(agent.adapterType);
  const enabled =
    compaction.enabled === undefined
      ? supportsSessions
      : asBoolean(compaction.enabled, supportsSessions);

  return {
    enabled,
    maxSessionRuns: Math.max(
      0,
      Math.floor(asNumber(compaction.maxSessionRuns, 20)),
    ),
    maxRawInputTokens: Math.max(
      0,
      Math.floor(asNumber(compaction.maxRawInputTokens, 500_000)),
    ),
    maxSessionAgeHours: Math.max(
      0,
      Math.floor(asNumber(compaction.maxSessionAgeHours, 48)),
    ),
  };
}

export function truncateDisplayId(
  value: string | null | undefined,
  max = 128,
) {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

const defaultSessionCodec: AdapterSessionCodec = {
  deserialize(raw: unknown) {
    const asObj = parseObject(raw);
    if (Object.keys(asObj).length > 0) return asObj;
    const sessionId = readNonEmptyString(
      (raw as Record<string, unknown> | null)?.sessionId,
    );
    if (sessionId) return { sessionId };
    return null;
  },
  serialize(params: Record<string, unknown> | null) {
    if (!params || Object.keys(params).length === 0) return null;
    return params;
  },
  getDisplayId(params: Record<string, unknown> | null) {
    return readNonEmptyString(params?.sessionId);
  },
};

export function getAdapterSessionCodec(adapterType: string) {
  const adapter = getServerAdapter(adapterType);
  return adapter.sessionCodec ?? defaultSessionCodec;
}

export function normalizeSessionParams(
  params: Record<string, unknown> | null | undefined,
) {
  if (!params) return null;
  return Object.keys(params).length > 0 ? params : null;
}

export function resolveNextSessionState(input: {
  codec: AdapterSessionCodec;
  adapterResult: AdapterExecutionResult;
  previousParams: Record<string, unknown> | null;
  previousDisplayId: string | null;
  previousLegacySessionId: string | null;
}) {
  const {
    codec,
    adapterResult,
    previousParams,
    previousDisplayId,
    previousLegacySessionId,
  } = input;

  if (adapterResult.clearSession) {
    return {
      params: null as Record<string, unknown> | null,
      displayId: null as string | null,
      legacySessionId: null as string | null,
    };
  }

  const explicitParams = adapterResult.sessionParams;
  const hasExplicitParams = adapterResult.sessionParams !== undefined;
  const hasExplicitSessionId = adapterResult.sessionId !== undefined;
  const explicitSessionId = readNonEmptyString(adapterResult.sessionId);
  const hasExplicitDisplay = adapterResult.sessionDisplayId !== undefined;
  const explicitDisplayId = readNonEmptyString(adapterResult.sessionDisplayId);
  const shouldUsePrevious =
    !hasExplicitParams && !hasExplicitSessionId && !hasExplicitDisplay;

  const candidateParams = hasExplicitParams
    ? explicitParams
    : hasExplicitSessionId
      ? explicitSessionId
        ? { sessionId: explicitSessionId }
        : null
      : previousParams;

  const serialized = normalizeSessionParams(
    codec.serialize(normalizeSessionParams(candidateParams) ?? null),
  );
  const deserialized = normalizeSessionParams(codec.deserialize(serialized));

  const displayId = truncateDisplayId(
    explicitDisplayId ??
      (codec.getDisplayId ? codec.getDisplayId(deserialized) : null) ??
      readNonEmptyString(deserialized?.sessionId) ??
      (shouldUsePrevious ? previousDisplayId : null) ??
      explicitSessionId ??
      (shouldUsePrevious ? previousLegacySessionId : null),
  );

  const legacySessionId =
    explicitSessionId ??
    readNonEmptyString(deserialized?.sessionId) ??
    displayId ??
    (shouldUsePrevious ? previousLegacySessionId : null);

  return {
    params: serialized,
    displayId,
    legacySessionId,
  };
}

export function resolveRuntimeSessionParamsForWorkspace(input: {
  agentId: string;
  previousSessionParams: Record<string, unknown> | null;
  resolvedWorkspace: ResolvedWorkspaceForRun;
}) {
  const { agentId, previousSessionParams, resolvedWorkspace } = input;
  const previousSessionId = readNonEmptyString(previousSessionParams?.sessionId);
  const previousCwd = readNonEmptyString(previousSessionParams?.cwd);
  if (!previousSessionId || !previousCwd) {
    return {
      sessionParams: previousSessionParams,
      warning: null as string | null,
    };
  }
  if (resolvedWorkspace.source !== "project_primary") {
    return {
      sessionParams: previousSessionParams,
      warning: null as string | null,
    };
  }
  const projectCwd = readNonEmptyString(resolvedWorkspace.cwd);
  if (!projectCwd) {
    return {
      sessionParams: previousSessionParams,
      warning: null as string | null,
    };
  }
  const fallbackAgentHomeCwd = resolveDefaultAgentWorkspaceDir(agentId);
  if (path.resolve(previousCwd) !== path.resolve(fallbackAgentHomeCwd)) {
    return {
      sessionParams: previousSessionParams,
      warning: null as string | null,
    };
  }
  if (path.resolve(projectCwd) === path.resolve(previousCwd)) {
    return {
      sessionParams: previousSessionParams,
      warning: null as string | null,
    };
  }
  const previousWorkspaceId = readNonEmptyString(previousSessionParams?.workspaceId);
  if (
    previousWorkspaceId &&
    resolvedWorkspace.workspaceId &&
    previousWorkspaceId !== resolvedWorkspace.workspaceId
  ) {
    return {
      sessionParams: previousSessionParams,
      warning: null as string | null,
    };
  }

  const migratedSessionParams: Record<string, unknown> = {
    ...(previousSessionParams ?? {}),
    cwd: projectCwd,
  };
  if (resolvedWorkspace.workspaceId) {
    migratedSessionParams.workspaceId = resolvedWorkspace.workspaceId;
  }
  if (resolvedWorkspace.repoUrl) migratedSessionParams.repoUrl = resolvedWorkspace.repoUrl;
  if (resolvedWorkspace.repoRef) migratedSessionParams.repoRef = resolvedWorkspace.repoRef;

  return {
    sessionParams: migratedSessionParams,
    warning:
      `Project workspace "${projectCwd}" is now available. ` +
      `Attempting to resume session "${previousSessionId}" that was previously saved in fallback workspace "${previousCwd}".`,
  };
}

export function shouldResetTaskSessionForWake(
  contextSnapshot: Record<string, unknown> | null | undefined,
) {
  if (contextSnapshot?.forceFreshSession === true) return true;

  const wakeReason = readNonEmptyString(contextSnapshot?.wakeReason);
  if (wakeReason === "issue_assigned") return true;
  return false;
}

function shouldPreserveSessionForPostToolCapacityResume(
  contextSnapshot: Record<string, unknown> | null | undefined,
) {
  if (contextSnapshot?.postToolCapacityResume === true) return true;
  return readNonEmptyString(contextSnapshot?.wakeReason) === "post_tool_capacity_resume";
}

function describeSessionResetReason(
  contextSnapshot: Record<string, unknown> | null | undefined,
) {
  if (contextSnapshot?.forceFreshSession === true) {
    return "forceFreshSession was requested";
  }

  const wakeReason = readNonEmptyString(contextSnapshot?.wakeReason);
  if (wakeReason === "issue_assigned") return "wake reason is issue_assigned";
  return null;
}

async function getOldestRunForSession(
  db: Db,
  agentId: string,
  sessionId: string,
) {
  return db
    .select({
      id: heartbeatRuns.id,
      createdAt: heartbeatRuns.createdAt,
      usageJson: heartbeatRuns.usageJson,
      resultJson: heartbeatRuns.resultJson,
      error: heartbeatRuns.error,
    })
    .from(heartbeatRuns)
    .where(
      and(
        eq(heartbeatRuns.agentId, agentId),
        eq(heartbeatRuns.sessionIdAfter, sessionId),
      ),
    )
    .orderBy(asc(heartbeatRuns.createdAt))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

function readRawUsageTotals(value: unknown) {
  const usage = parseObject(value);
  const inputTokens = Math.max(0, Math.floor(asNumber(usage.inputTokens, 0)));
  const cachedInputTokens = Math.max(
    0,
    Math.floor(asNumber(usage.cachedInputTokens, 0)),
  );
  const outputTokens = Math.max(0, Math.floor(asNumber(usage.outputTokens, 0)));
  if (inputTokens === 0 && cachedInputTokens === 0 && outputTokens === 0) {
    return null;
  }
  return { inputTokens, cachedInputTokens, outputTokens };
}

function arePathsEquivalent(left: string, right: string) {
  const leftResolved = path.resolve(left);
  const rightResolved = path.resolve(right);
  if (process.platform === "win32") {
    return leftResolved.toLowerCase() === rightResolved.toLowerCase();
  }
  return leftResolved === rightResolved;
}

function isPathWithinRoot(targetPath: string, rootPath: string) {
  const relative = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  return (
    relative.length === 0 ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function resolveAdapterCwdForRun(
  contextSnapshot: Record<string, unknown>,
  resolvedConfig: Record<string, unknown>,
): AdapterCwdResolution {
  const workspaceContext = parseObject(contextSnapshot.paperclipWorkspace);
  const rawWorkspaceCwd = readNonEmptyString(workspaceContext.cwd);
  const workspaceSource = readNonEmptyString(workspaceContext.source);
  const configuredCwd = readNonEmptyString(resolvedConfig.cwd);
  const configuredCwdExists = Boolean(configuredCwd);

  const prefersConfiguredForSingleFile =
    contextSnapshot.paperclipAbortOnMissingFile === true ||
    Boolean(readNonEmptyString(contextSnapshot.paperclipSingleFileTargetPath));
  const useConfiguredCwd =
    Boolean(configuredCwd) && prefersConfiguredForSingleFile;
  const effectiveWorkspaceCwd =
    useConfiguredCwd &&
    (workspaceSource === "agent_home" || workspaceSource === "fallback")
      ? null
      : rawWorkspaceCwd;

  const effectiveRunCwd = useConfiguredCwd
    ? configuredCwd!
    : effectiveWorkspaceCwd ?? configuredCwd ?? process.cwd();

  const resolutionStrategy: AdapterCwdResolution["resolutionStrategy"] =
    useConfiguredCwd || (!effectiveWorkspaceCwd && configuredCwd)
      ? "configured"
      : effectiveWorkspaceCwd
        ? "workspace"
        : "process";

  return {
    effectiveRunCwd,
    rawWorkspaceCwd,
    effectiveWorkspaceCwd,
    workspaceSource,
    configuredCwd,
    configuredCwdExists,
    resolutionStrategy,
  };
}

export async function evaluateSingleFileBenchmarkPreflight(input: {
  contextSnapshot: Record<string, unknown>;
  resolvedConfig: Record<string, unknown>;
}): Promise<SingleFileBenchmarkPreflight> {
  const { contextSnapshot, resolvedConfig } = input;
  const singleFileTargetPath = readNonEmptyString(
    contextSnapshot.paperclipSingleFileTargetPath,
  );
  const abortOnMissingFile =
    contextSnapshot.paperclipAbortOnMissingFile === true;
  const issueTaskPrompt = readNonEmptyString(contextSnapshot.paperclipTaskPrompt);
  const issueTaskPromptPreview = issueTaskPrompt
    ? issueTaskPrompt.slice(0, 400)
    : null;
  const adapterCwdResolution = resolveAdapterCwdForRun(
    contextSnapshot,
    resolvedConfig,
  );
  const {
    effectiveRunCwd,
    rawWorkspaceCwd,
    effectiveWorkspaceCwd,
    workspaceSource,
    configuredCwd,
    configuredCwdExists,
    resolutionStrategy,
  } = adapterCwdResolution;
  const configuredCwdAccessible = configuredCwd
    ? await fs
        .access(configuredCwd)
        .then(() => true)
        .catch(() => false)
    : false;

  const required = abortOnMissingFile || Boolean(singleFileTargetPath);
  if (!required) {
    return {
      required,
      ok: true,
      reason: null,
      adapterCwd: effectiveRunCwd,
      rawWorkspaceCwd,
      effectiveWorkspaceCwd,
      workspaceSource,
      configuredCwd,
      configuredCwdExists: configuredCwdAccessible,
      resolutionStrategy,
      singleFileTargetPath,
      singleFileTargetResolvedPath: null,
      targetExists: false,
      targetWithinEffectiveCwd: false,
      issueTaskPromptPresent: Boolean(issueTaskPrompt),
      issueTaskPromptPreview,
      abortOnMissingFile,
    };
  }

  if (!singleFileTargetPath) {
    return {
      required,
      ok: false,
      reason: "single_file_target_missing",
      adapterCwd: effectiveRunCwd,
      rawWorkspaceCwd,
      effectiveWorkspaceCwd,
      workspaceSource,
      configuredCwd,
      configuredCwdExists: configuredCwdAccessible,
      resolutionStrategy,
      singleFileTargetPath: null,
      singleFileTargetResolvedPath: null,
      targetExists: false,
      targetWithinEffectiveCwd: false,
      issueTaskPromptPresent: Boolean(issueTaskPrompt),
      issueTaskPromptPreview,
      abortOnMissingFile,
    };
  }

  if (configuredCwd && !configuredCwdAccessible) {
    return {
      required,
      ok: false,
      reason: "configured_cwd_unavailable",
      adapterCwd: effectiveRunCwd,
      rawWorkspaceCwd,
      effectiveWorkspaceCwd,
      workspaceSource,
      configuredCwd,
      configuredCwdExists: false,
      resolutionStrategy,
      singleFileTargetPath,
      singleFileTargetResolvedPath: null,
      targetExists: false,
      targetWithinEffectiveCwd: false,
      issueTaskPromptPresent: Boolean(issueTaskPrompt),
      issueTaskPromptPreview,
      abortOnMissingFile,
    };
  }

  if (
    effectiveWorkspaceCwd &&
    !arePathsEquivalent(effectiveWorkspaceCwd, effectiveRunCwd)
  ) {
    return {
      required,
      ok: false,
      reason: "workspace_cwd_mismatch",
      adapterCwd: effectiveRunCwd,
      rawWorkspaceCwd,
      effectiveWorkspaceCwd,
      workspaceSource,
      configuredCwd,
      configuredCwdExists: configuredCwdAccessible,
      resolutionStrategy,
      singleFileTargetPath,
      singleFileTargetResolvedPath: null,
      targetExists: false,
      targetWithinEffectiveCwd: false,
      issueTaskPromptPresent: Boolean(issueTaskPrompt),
      issueTaskPromptPreview,
      abortOnMissingFile,
    };
  }

  const singleFileTargetResolvedPath = path.resolve(
    effectiveRunCwd,
    singleFileTargetPath,
  );
  const targetExists = await fs
    .stat(singleFileTargetResolvedPath)
    .then((stats) => stats.isFile())
    .catch(() => false);
  const targetWithinEffectiveCwd = isPathWithinRoot(
    singleFileTargetResolvedPath,
    effectiveRunCwd,
  );

  if (!targetWithinEffectiveCwd) {
    return {
      required,
      ok: false,
      reason: "single_file_target_outside_cwd",
      adapterCwd: effectiveRunCwd,
      rawWorkspaceCwd,
      effectiveWorkspaceCwd,
      workspaceSource,
      configuredCwd,
      configuredCwdExists: configuredCwdAccessible,
      resolutionStrategy,
      singleFileTargetPath,
      singleFileTargetResolvedPath,
      targetExists,
      targetWithinEffectiveCwd,
      issueTaskPromptPresent: Boolean(issueTaskPrompt),
      issueTaskPromptPreview,
      abortOnMissingFile,
    };
  }

  if (!targetExists) {
    return {
      required,
      ok: false,
      reason: "single_file_target_missing_on_disk",
      adapterCwd: effectiveRunCwd,
      rawWorkspaceCwd,
      effectiveWorkspaceCwd,
      workspaceSource,
      configuredCwd,
      configuredCwdExists: configuredCwdAccessible,
      resolutionStrategy,
      singleFileTargetPath,
      singleFileTargetResolvedPath,
      targetExists,
      targetWithinEffectiveCwd,
      issueTaskPromptPresent: Boolean(issueTaskPrompt),
      issueTaskPromptPreview,
      abortOnMissingFile,
    };
  }

  return {
    required,
    ok: true,
    reason: null,
    adapterCwd: effectiveRunCwd,
    rawWorkspaceCwd,
    effectiveWorkspaceCwd,
    workspaceSource,
    configuredCwd,
    configuredCwdExists: configuredCwdAccessible,
    resolutionStrategy,
    singleFileTargetPath,
    singleFileTargetResolvedPath,
    targetExists,
    targetWithinEffectiveCwd,
    issueTaskPromptPresent: Boolean(issueTaskPrompt),
    issueTaskPromptPreview,
    abortOnMissingFile,
  };
}

export async function resolveWorkspaceForRun(input: {
  db: Db;
  agent: typeof agents.$inferSelect;
  context: Record<string, unknown>;
  previousSessionParams: Record<string, unknown> | null;
  useProjectWorkspace?: boolean | null;
}): Promise<ResolvedWorkspaceForRun> {
  const { db, agent, context, previousSessionParams } = input;
  const issueId = readNonEmptyString(context.issueId);
  const contextProjectId = readNonEmptyString(context.projectId);
  const issueProjectId = issueId
    ? await db
        .select({ projectId: issues.projectId })
        .from(issues)
        .where(and(eq(issues.id, issueId), eq(issues.companyId, agent.companyId)))
        .then((rows) => rows[0]?.projectId ?? null)
    : null;
  const resolvedProjectId = issueProjectId ?? contextProjectId;
  const useProjectWorkspace = input.useProjectWorkspace !== false;
  const workspaceProjectId = useProjectWorkspace ? resolvedProjectId : null;

  const projectWorkspaceRows = workspaceProjectId
    ? await db
        .select()
        .from(projectWorkspaces)
        .where(
          and(
            eq(projectWorkspaces.companyId, agent.companyId),
            eq(projectWorkspaces.projectId, workspaceProjectId),
          ),
        )
        .orderBy(asc(projectWorkspaces.createdAt), asc(projectWorkspaces.id))
    : [];

  const workspaceHints = projectWorkspaceRows.map((workspace) => ({
    workspaceId: workspace.id,
    cwd: readNonEmptyString(workspace.cwd),
    repoUrl: readNonEmptyString(workspace.repoUrl),
    repoRef: readNonEmptyString(workspace.repoRef),
  }));

  if (projectWorkspaceRows.length > 0) {
    const missingProjectCwds: string[] = [];
    let hasConfiguredProjectCwd = false;
    for (const workspace of projectWorkspaceRows) {
      const projectCwd = readNonEmptyString(workspace.cwd);
      if (!projectCwd || projectCwd === REPO_ONLY_CWD_SENTINEL) {
        continue;
      }
      hasConfiguredProjectCwd = true;
      const projectCwdExists = await fs
        .stat(projectCwd)
        .then((stats) => stats.isDirectory())
        .catch(() => false);
      if (projectCwdExists) {
        return {
          cwd: projectCwd,
          source: "project_primary",
          projectId: resolvedProjectId,
          workspaceId: workspace.id,
          repoUrl: workspace.repoUrl,
          repoRef: workspace.repoRef,
          workspaceHints,
          warnings: [],
        };
      }
      missingProjectCwds.push(projectCwd);
    }

    const fallbackCwd = resolveDefaultAgentWorkspaceDir(agent.id);
    await fs.mkdir(fallbackCwd, { recursive: true });
    const warnings: string[] = [];
    if (missingProjectCwds.length > 0) {
      const firstMissing = missingProjectCwds[0];
      const extraMissingCount = Math.max(0, missingProjectCwds.length - 1);
      warnings.push(
        extraMissingCount > 0
          ? `Project workspace path "${firstMissing}" and ${extraMissingCount} other configured path(s) are not available yet. Using fallback workspace "${fallbackCwd}" for this run.`
          : `Project workspace path "${firstMissing}" is not available yet. Using fallback workspace "${fallbackCwd}" for this run.`,
      );
    } else if (!hasConfiguredProjectCwd) {
      warnings.push(
        `Project workspace has no local cwd configured. Using fallback workspace "${fallbackCwd}" for this run.`,
      );
    }
    return {
      cwd: fallbackCwd,
      source: "project_primary",
      projectId: resolvedProjectId,
      workspaceId: projectWorkspaceRows[0]?.id ?? null,
      repoUrl: projectWorkspaceRows[0]?.repoUrl ?? null,
      repoRef: projectWorkspaceRows[0]?.repoRef ?? null,
      workspaceHints,
      warnings,
    };
  }

  const sessionCwd = readNonEmptyString(previousSessionParams?.cwd);
  if (sessionCwd) {
    const sessionCwdExists = await fs
      .stat(sessionCwd)
      .then((stats) => stats.isDirectory())
      .catch(() => false);
    if (sessionCwdExists) {
      return {
        cwd: sessionCwd,
        source: "task_session",
        projectId: resolvedProjectId,
        workspaceId: readNonEmptyString(previousSessionParams?.workspaceId),
        repoUrl: readNonEmptyString(previousSessionParams?.repoUrl),
        repoRef: readNonEmptyString(previousSessionParams?.repoRef),
        workspaceHints,
        warnings: [],
      };
    }
  }

  const cwd = resolveDefaultAgentWorkspaceDir(agent.id);
  await fs.mkdir(cwd, { recursive: true });
  const warnings: string[] = [];
  if (sessionCwd) {
    warnings.push(
      `Saved session workspace "${sessionCwd}" is not available. Using fallback workspace "${cwd}" for this run.`,
    );
  } else if (resolvedProjectId) {
    warnings.push(
      `No project workspace directory is currently available for this issue. Using fallback workspace "${cwd}" for this run.`,
    );
  } else {
    warnings.push(
      `No project or prior session workspace was available. Using fallback workspace "${cwd}" for this run.`,
    );
  }
  return {
    cwd,
    source: "agent_home",
    projectId: resolvedProjectId,
    workspaceId: null,
    repoUrl: null,
    repoRef: null,
    workspaceHints,
    warnings,
  };
}

export async function evaluateSessionCompaction(input: {
  db: Db;
  agent: typeof agents.$inferSelect;
  sessionId: string | null;
  issueId: string | null;
}): Promise<SessionCompactionDecision> {
  const { db, agent, sessionId, issueId } = input;
  if (!sessionId) {
    return {
      rotate: false,
      reason: null,
      handoffMarkdown: null,
      previousRunId: null,
    };
  }

  const policy = parseSessionCompactionPolicy(agent);
  if (!policy.enabled) {
    return {
      rotate: false,
      reason: null,
      handoffMarkdown: null,
      previousRunId: null,
    };
  }

  const fetchLimit = Math.max(
    policy.maxSessionRuns > 0 ? policy.maxSessionRuns + 1 : 0,
    4,
  );
  const runs = await db
    .select({
      id: heartbeatRuns.id,
      createdAt: heartbeatRuns.createdAt,
      usageJson: heartbeatRuns.usageJson,
      resultJson: heartbeatRuns.resultJson,
      error: heartbeatRuns.error,
    })
    .from(heartbeatRuns)
    .where(
      and(
        eq(heartbeatRuns.agentId, agent.id),
        eq(heartbeatRuns.sessionIdAfter, sessionId),
      ),
    )
    .orderBy(desc(heartbeatRuns.createdAt))
    .limit(fetchLimit);

  if (runs.length === 0) {
    return {
      rotate: false,
      reason: null,
      handoffMarkdown: null,
      previousRunId: null,
    };
  }

  const latestRun = runs[0] ?? null;
  const oldestRun =
    policy.maxSessionAgeHours > 0
      ? await getOldestRunForSession(db, agent.id, sessionId)
      : runs[runs.length - 1] ?? latestRun;
  const latestRawUsage = readRawUsageTotals(latestRun?.usageJson);
  const sessionAgeHours =
    latestRun && oldestRun
      ? Math.max(
          0,
          (new Date(latestRun.createdAt).getTime() -
            new Date(oldestRun.createdAt).getTime()) /
            (1000 * 60 * 60),
        )
      : 0;

  let reason: string | null = null;
  if (policy.maxSessionRuns > 0 && runs.length > policy.maxSessionRuns) {
    reason = `session exceeded ${policy.maxSessionRuns} runs`;
  } else if (
    policy.maxRawInputTokens > 0 &&
    latestRawUsage &&
    latestRawUsage.inputTokens >= policy.maxRawInputTokens
  ) {
    reason =
      `session raw input reached ${formatCount(
        latestRawUsage.inputTokens,
      )} tokens ` + `(threshold ${formatCount(policy.maxRawInputTokens)})`;
  } else if (
    policy.maxSessionAgeHours > 0 &&
    sessionAgeHours >= policy.maxSessionAgeHours
  ) {
    reason = `session age reached ${Math.floor(sessionAgeHours)} hours`;
  }

  if (!reason || !latestRun) {
    return {
      rotate: false,
      reason: null,
      handoffMarkdown: null,
      previousRunId: latestRun?.id ?? null,
    };
  }

  const latestSummary = summarizeHeartbeatRunResultJson(latestRun.resultJson);
  const latestTextSummary =
    readNonEmptyString(latestSummary?.summary) ??
    readNonEmptyString(latestSummary?.result) ??
    readNonEmptyString(latestSummary?.message) ??
    readNonEmptyString(latestRun.error);

  const handoffMarkdown = [
    "Paperclip session handoff:",
    `- Previous session: ${sessionId}`,
    issueId ? `- Issue: ${issueId}` : "",
    `- Rotation reason: ${reason}`,
    latestTextSummary ? `- Last run summary: ${latestTextSummary}` : "",
    "Continue from the current task state. Rebuild only the minimum context you need.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    rotate: true,
    reason,
    handoffMarkdown,
    previousRunId: latestRun.id,
  };
}

export async function resolveSessionBeforeForWakeup(input: {
  agent: typeof agents.$inferSelect;
  taskKey: string | null;
}, deps: {
  getTaskSession: (
    companyId: string,
    agentId: string,
    adapterType: string,
    taskKey: string,
  ) => Promise<{ sessionParamsJson: unknown; sessionDisplayId: string | null } | null>;
  getRuntimeState: (
    agentId: string,
  ) => Promise<{ sessionId: string | null } | null>;
}) {
  const { agent, taskKey } = input;
  if (taskKey) {
    const codec = getAdapterSessionCodec(agent.adapterType);
    const existingTaskSession = await deps.getTaskSession(
      agent.companyId,
      agent.id,
      agent.adapterType,
      taskKey,
    );
    const parsedParams = normalizeSessionParams(
      codec.deserialize(existingTaskSession?.sessionParamsJson ?? null),
    );
    return truncateDisplayId(
      existingTaskSession?.sessionDisplayId ??
        (codec.getDisplayId ? codec.getDisplayId(parsedParams) : null) ??
        readNonEmptyString(parsedParams?.sessionId),
    );
  }

  const runtimeForRun = await deps.getRuntimeState(agent.id);
  return runtimeForRun?.sessionId ?? null;
}

function applyContextPatch(
  base: Record<string, unknown>,
  patch: Record<string, unknown | null>,
) {
  const next: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete next[key];
      continue;
    }
    next[key] = value;
  }
  return next;
}

export async function prepareHeartbeatWorkspaceSessionPlan(input: {
  db: Db;
  agent: typeof agents.$inferSelect;
  context: Record<string, unknown>;
  previousSessionParams: Record<string, unknown> | null;
  runtimeSessionId: string | null;
  taskKey: string | null;
  taskSessionForRun: { sessionDisplayId: string | null } | null;
  resetTaskSession: boolean;
  resolvedConfig: Record<string, unknown>;
  executionWorkspaceMode: string;
  useProjectWorkspace: boolean;
  issueId: string | null;
  issueRef: {
    id: string;
    companyId: string;
    projectId: string | null;
    goalId: string | null;
    parentId: string | null;
    identifier: string | null;
    title: string | null;
    description: string | null;
  } | null;
  sessionCodec: AdapterSessionCodec;
  baseWarnings?: string[];
  realizeExecutionWorkspace: (input: {
    base: ExecutionWorkspaceInput;
    config: Record<string, unknown>;
    issue: ExecutionWorkspaceIssueRef | null;
    agent: ExecutionWorkspaceAgentRef;
  }) => Promise<RealizedExecutionWorkspace>;
}, overrides?: {
  resolveWorkspaceForRun?: (input: {
    agent: typeof agents.$inferSelect;
    context: Record<string, unknown>;
    previousSessionParams: Record<string, unknown> | null;
    useProjectWorkspace: boolean;
  }) => Promise<ResolvedWorkspaceForRun>;
  evaluateSessionCompaction?: (input: {
    agent: typeof agents.$inferSelect;
    sessionId: string | null;
    issueId: string | null;
  }) => Promise<SessionCompactionDecision>;
  evaluateSingleFileBenchmarkPreflight?: (input: {
    contextSnapshot: Record<string, unknown>;
    resolvedConfig: Record<string, unknown>;
  }) => Promise<SingleFileBenchmarkPreflight>;
}) {
  const resolvedWorkspace = await (
    overrides?.resolveWorkspaceForRun ??
    ((seamInput) =>
      resolveWorkspaceForRun({
        db: input.db,
        ...seamInput,
      }))
  )({
    agent: input.agent,
    context: input.context,
    previousSessionParams: input.previousSessionParams,
    useProjectWorkspace: input.useProjectWorkspace,
  });

  const executionWorkspace = await input.realizeExecutionWorkspace({
    base: {
      baseCwd: resolvedWorkspace.cwd,
      source: resolvedWorkspace.source,
      projectId: resolvedWorkspace.projectId,
      workspaceId: resolvedWorkspace.workspaceId,
      repoUrl: resolvedWorkspace.repoUrl,
      repoRef: resolvedWorkspace.repoRef,
    },
    config: input.resolvedConfig,
    issue: input.issueRef,
    agent: {
      id: input.agent.id,
      name: input.agent.name,
      companyId: input.agent.companyId,
    },
  });

  const runtimeSessionResolution = resolveRuntimeSessionParamsForWorkspace({
    agentId: input.agent.id,
    previousSessionParams: input.previousSessionParams,
    resolvedWorkspace: {
      ...resolvedWorkspace,
      cwd: executionWorkspace.cwd,
    },
  });
  const runtimeSessionParams = runtimeSessionResolution.sessionParams;
  const warnings = [
    ...(input.baseWarnings ?? []),
    ...resolvedWorkspace.warnings,
    ...executionWorkspace.warnings,
    ...(runtimeSessionResolution.warning ? [runtimeSessionResolution.warning] : []),
  ];

  const sessionResetReason = describeSessionResetReason(input.context);
  if (input.resetTaskSession && sessionResetReason) {
    warnings.push(
      input.taskKey
        ? `Skipping saved session resume for task "${input.taskKey}" because ${sessionResetReason}.`
        : `Skipping saved session resume because ${sessionResetReason}.`,
    );
  }

  const runtimeServiceIntents = (() => {
    const runtimeConfig = parseObject(input.resolvedConfig.workspaceRuntime);
    return Array.isArray(runtimeConfig.services)
      ? runtimeConfig.services.filter(
          (value): value is Record<string, unknown> =>
            typeof value === "object" && value !== null,
        )
      : [];
  })();

  const contextPatch: Record<string, unknown | null> = {
    paperclipWorkspace: {
      cwd: executionWorkspace.cwd,
      source: executionWorkspace.source,
      mode: input.executionWorkspaceMode,
      strategy: executionWorkspace.strategy,
      projectId: executionWorkspace.projectId,
      workspaceId: executionWorkspace.workspaceId,
      repoUrl: executionWorkspace.repoUrl,
      repoRef: executionWorkspace.repoRef,
      branchName: executionWorkspace.branchName,
      worktreePath: executionWorkspace.worktreePath,
      agentHome: resolveDefaultAgentWorkspaceDir(input.agent.id),
    },
    paperclipWorkspaces: resolvedWorkspace.workspaceHints,
    paperclipRuntimeServiceIntents:
      runtimeServiceIntents.length > 0 ? runtimeServiceIntents : null,
  };
  if (executionWorkspace.projectId && !readNonEmptyString(input.context.projectId)) {
    contextPatch.projectId = executionWorkspace.projectId;
  }

  const runtimeSessionFallback =
    input.taskKey || input.resetTaskSession ? null : input.runtimeSessionId;
  let previousSessionDisplayId = truncateDisplayId(
    input.taskSessionForRun?.sessionDisplayId ??
      (input.sessionCodec.getDisplayId
        ? input.sessionCodec.getDisplayId(runtimeSessionParams)
        : null) ??
      readNonEmptyString(runtimeSessionParams?.sessionId) ??
      runtimeSessionFallback,
  );
  let runtimeSessionIdForAdapter =
    readNonEmptyString(runtimeSessionParams?.sessionId) ?? runtimeSessionFallback;
  let runtimeSessionParamsForAdapter = runtimeSessionParams;
  const thinDefaultExecutionPath =
    readNonEmptyString(input.context.paperclipDefaultExecutionPath) ===
    "ready_small_default";
  const preserveSessionForPostToolCapacityResume =
    shouldPreserveSessionForPostToolCapacityResume(input.context);
  let sessionCompaction: SessionCompactionDecision = {
    rotate: false,
    reason: null,
    handoffMarkdown: null,
    previousRunId: null,
  };

  if (
    !preserveSessionForPostToolCapacityResume &&
    (thinDefaultExecutionPath || input.context.forceFreshSession === true)
  ) {
    runtimeSessionIdForAdapter = null;
    runtimeSessionParamsForAdapter = null;
    previousSessionDisplayId = null;
    contextPatch.paperclipSessionHandoffMarkdown = null;
    contextPatch.paperclipSessionRotationReason = null;
    contextPatch.paperclipPreviousSessionId = null;
  } else {
    sessionCompaction = await (
      overrides?.evaluateSessionCompaction ??
      ((seamInput) =>
        evaluateSessionCompaction({
          db: input.db,
          ...seamInput,
        }))
    )({
      agent: input.agent,
      sessionId: previousSessionDisplayId ?? runtimeSessionIdForAdapter,
      issueId: input.issueId,
    });
    if (sessionCompaction.rotate) {
      contextPatch.paperclipSessionHandoffMarkdown =
        sessionCompaction.handoffMarkdown;
      contextPatch.paperclipSessionRotationReason = sessionCompaction.reason;
      contextPatch.paperclipPreviousSessionId =
        previousSessionDisplayId ?? runtimeSessionIdForAdapter;
      runtimeSessionIdForAdapter = null;
      runtimeSessionParamsForAdapter = null;
      previousSessionDisplayId = null;
      if (sessionCompaction.reason) {
        warnings.push(
          `Starting a fresh session because ${sessionCompaction.reason}.`,
        );
      }
    } else {
      contextPatch.paperclipSessionHandoffMarkdown = null;
      contextPatch.paperclipSessionRotationReason = null;
      contextPatch.paperclipPreviousSessionId = null;
    }
  }

  const plannedContext = applyContextPatch(input.context, contextPatch);
  const singleFileBenchmarkPreflight = await (
    overrides?.evaluateSingleFileBenchmarkPreflight ??
    evaluateSingleFileBenchmarkPreflight
  )({
    contextSnapshot: plannedContext,
    resolvedConfig: input.resolvedConfig,
  });

  return {
    resolvedWorkspace,
    executionWorkspace,
    warnings,
    contextPatch,
    runtimeForAdapter: {
      sessionId: runtimeSessionIdForAdapter,
      sessionParams: runtimeSessionParamsForAdapter,
      sessionDisplayId: previousSessionDisplayId,
      taskKey: input.taskKey,
    },
    sessionCompaction,
    singleFileBenchmarkPreflight,
  };
}
