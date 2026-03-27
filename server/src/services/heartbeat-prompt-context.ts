import { parseObject } from "../adapters/utils.js";
import {
  buildVerifiedCapabilityPromptBlock,
  resolveVerifiedCapabilityRuntimeBridge,
} from "./capability-contracts.js";
import {
  buildMissionCellPromptBlock,
  resolveMissionCellRuntimeBridge,
} from "./mission-cell-contracts.js";
import { resolveDirectAnswerAuditTruth } from "./direct-answer-audit.js";
import { resolveIssueExecutionPacketTruth } from "./issue-execution-packet.js";
import { runPromptResolverPreflight } from "./prompt-resolver-preflight.js";
import type { PromptResolverInput } from "./prompt-resolver-schema.js";

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNonEmptyStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export type IssuePromptContext = {
  id: string;
  companyId?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  parentId?: string | null;
  identifier: string | null;
  title: string | null;
  description: string | null;
};

export type ReviewTargetPromptContext = {
  runId: string;
  agentId: string;
  agentName: string | null;
  status: string;
  finishedAt: string | null;
  model: string | null;
  resultSummary: string | null;
  readEvidencePaths: string[];
  artifactPaths: string[];
  workerHandoff: string | null;
};

export type RecordedWorkerHandoffContext = {
  resultSummary: string | null;
  artifactPaths: string[];
  workerHandoff: string | null;
};

export type ReviewerVerdict = "accepted" | "changes_requested";

export type HeartbeatPromptContextPatch = Record<string, unknown | null>;

export function readExecutionMode(
  contextSnapshot: Record<string, unknown> | null | undefined,
) {
  return (
    readNonEmptyString(contextSnapshot?.executionMode) ??
    readNonEmptyString(contextSnapshot?.runMode) ??
    readNonEmptyString(contextSnapshot?.mode) ??
    null
  );
}

export function isDryRunExecutionMode(mode: string | null | undefined) {
  if (!mode) return false;
  const normalized = mode.trim().toLowerCase();
  return (
    normalized === "mock" ||
    normalized === "dry_run" ||
    normalized === "dry-run" ||
    normalized === "test" ||
    normalized === "test_run" ||
    normalized === "test-run"
  );
}

export function isTestRunContext(
  contextSnapshot: Record<string, unknown> | null | undefined,
) {
  return (
    contextSnapshot?.isTestRun === true ||
    contextSnapshot?.isDryRun === true ||
    contextSnapshot?.governanceTest === true ||
    isDryRunExecutionMode(readExecutionMode(contextSnapshot))
  );
}

function trimIssueText(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return null;

  const normalized = value
    .replace(/&#x20;/gi, " ")
    .replace(/&#32;/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\\([_`*[\]()#+\-.!\\])/g, "$1")
    .trim();

  return normalized.length > 0 ? normalized : null;
}

export function extractSingleFileBenchmarkTarget(
  description: string | null | undefined,
) {
  if (!description) return null;
  const match = description.match(/read only the file:\s*\r?\n([^\r\n]+)/i);
  return match?.[1]?.trim() || null;
}

export function extractBenchmarkFamily(description: string | null | undefined) {
  if (!description) return null;
  const match = description.match(/benchmark family:\s*([^\r\n]+)/i);
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : null;
}

function formatWorkerDoneHandoff(
  workerDoneDetails: Record<string, unknown> | null,
  workerPrDetails: Record<string, unknown> | null,
): RecordedWorkerHandoffContext | null {
  if (!workerDoneDetails && !workerPrDetails) return null;

  const doneSummary = parseObject(workerDoneDetails?.summary);
  const files = readNonEmptyStringArray(doneSummary.files);
  const branch =
    readNonEmptyString(workerDoneDetails?.branch) ??
    readNonEmptyString(workerPrDetails?.branch);
  const prUrl =
    readNonEmptyString(workerDoneDetails?.prUrl) ??
    readNonEmptyString(workerPrDetails?.prUrl);
  const commitHash = readNonEmptyString(workerDoneDetails?.commitHash);
  const goal = readNonEmptyString(doneSummary.goal);
  const result = readNonEmptyString(doneSummary.result);
  const blockers = readNonEmptyString(doneSummary.blockers);
  const next = readNonEmptyString(doneSummary.next);

  const lines: string[] = [];
  if (prUrl) lines.push(`PR: ${prUrl}`);
  if (branch) lines.push(`Branch: ${branch}`);
  if (commitHash) lines.push(`Commit: ${commitHash}`);
  if (goal) {
    if (lines.length > 0) lines.push("");
    lines.push(`Goal: ${goal}`);
  }
  if (result) lines.push(`Result: ${result}`);
  if (files.length > 0) {
    lines.push("Files Changed:");
    for (const filePath of files) {
      lines.push(`- ${filePath}`);
    }
  }
  if (blockers) lines.push(`Blockers: ${blockers}`);
  if (next) lines.push(`Next: ${next}`);

  return {
    resultSummary: result,
    artifactPaths: files,
    workerHandoff: lines.length > 0 ? lines.join("\n") : null,
  };
}

function matchReviewerVerdict(output: string): ReviewerVerdict | null {
  for (const rawLine of output.split(/\r?\n/)) {
    const normalizedLine = rawLine
      .replace(/[`#>]/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim();
    const verdictMatch = normalizedLine.match(
      /^(?:\d+\.\s*)?_?Verdict:?_?\s*(accepted|changes_requested|needs_revision|blocked)\s*$/i,
    );
    const verdict = verdictMatch?.[1]?.toLowerCase();
    if (verdict === "accepted") return "accepted";
    if (
      verdict === "changes_requested" ||
      verdict === "needs_revision" ||
      verdict === "blocked"
    ) {
      return "changes_requested";
    }
  }
  return null;
}

function collectAssistantContentFromStreamJson(output: string): string | null {
  const chunks: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) continue;
    try {
      const parsed = JSON.parse(trimmed) as {
        type?: unknown;
        role?: unknown;
        content?: unknown;
      };
      if (
        parsed.type === "message" &&
        parsed.role === "assistant" &&
        typeof parsed.content === "string" &&
        parsed.content.length > 0
      ) {
        chunks.push(parsed.content);
      }
    } catch {
      // Ignore non-JSON or partial lines in stdout excerpts.
    }
  }
  if (chunks.length === 0) return null;
  return chunks.join("\n");
}

function extractArtifactPathsFromWorkerOutput(
  output: string | null | undefined,
): string[] {
  if (!output) return [];
  const paths = new Set<string>();

  const assistantOutput = collectAssistantContentFromStreamJson(output);
  const assistantText = assistantOutput ?? output;
  for (const match of assistantText.matchAll(/Files Changed:\s*`([^`]+)`/g)) {
    const candidate = match[1]?.trim();
    if (candidate) paths.add(candidate);
  }

  for (const match of output.matchAll(/"file_path":"([^"]+)"/g)) {
    const candidate = match[1]?.trim();
    if (candidate) paths.add(candidate);
  }

  return [...paths];
}

export function extractReviewerVerdict(
  output: string | null | undefined,
): ReviewerVerdict | null {
  if (!output) return null;
  const assistantOutput = collectAssistantContentFromStreamJson(output);
  if (assistantOutput) {
    return matchReviewerVerdict(assistantOutput);
  }
  return matchReviewerVerdict(output);
}

export function normalizeReviewTargetWorkerHandoff(input: {
  workerDoneDetails?: Record<string, unknown> | null;
  workerPrDetails?: Record<string, unknown> | null;
  targetStdoutExcerpt?: string | null;
  fallbackResultSummary?: string | null;
}): RecordedWorkerHandoffContext {
  const structured = formatWorkerDoneHandoff(
    input.workerDoneDetails ?? null,
    input.workerPrDetails ?? null,
  );
  if (structured) return structured;

  const targetStdoutExcerpt = input.targetStdoutExcerpt ?? null;
  const fallbackHandoff =
    (targetStdoutExcerpt
      ? collectAssistantContentFromStreamJson(targetStdoutExcerpt)
      : null) ?? targetStdoutExcerpt;

  return {
    resultSummary: input.fallbackResultSummary ?? null,
    artifactPaths: extractArtifactPathsFromWorkerOutput(targetStdoutExcerpt),
    workerHandoff: fallbackHandoff,
  };
}

function buildIssueTaskPrompt(
  issue: IssuePromptContext,
  input?: {
    skillPromptBlock?: string | null;
    missionCellPromptBlock?: string | null;
    contextSnapshot?: Record<string, unknown> | null;
  },
) {
  const ref = issue.identifier ?? issue.id;
  const title = trimIssueText(issue.title);
  const description = trimIssueText(issue.description);
    const missionCellBridge = resolveMissionCellRuntimeBridge(
      issue.description ?? null,
    );
    const missionCellPromptBlock = buildMissionCellPromptBlock(missionCellBridge);
  const skillPromptBlock =
    input?.skillPromptBlock ??
    buildVerifiedCapabilityPromptBlock(
      resolveVerifiedCapabilityRuntimeBridge(description),
    );
  const summary = title ? `${ref} - ${title}` : ref;
  const apiUrl = trimIssueText(process.env.PAPERCLIP_API_URL);
  const companyId = trimIssueText(issue.companyId);
  const projectId = trimIssueText(issue.projectId);
  const goalId = trimIssueText(issue.goalId);
  const parentId = trimIssueText(issue.parentId);
  const packetTruth = resolveIssueExecutionPacketTruth({
    title: issue.title,
    description: issue.description,
  });
  const directAnswerAuditTruth = resolveDirectAnswerAuditTruth({
    title: issue.title,
    description: issue.description,
  });
  const packetLines = [
    `- status: ${packetTruth.status}`,
    `- executionHeavy: ${packetTruth.executionHeavy ? "yes" : "no"}`,
    `- targetFile: ${packetTruth.targetFile ?? "none"}`,
    `- targetFolder: ${packetTruth.targetFolder ?? "none"}`,
    `- artifactKind: ${packetTruth.artifactKind ?? "none"}`,
    `- doneWhen: ${packetTruth.doneWhen ?? "none"}`,
    `- packetType: ${packetTruth.packetType ?? "none"}`,
    `- executionIntent: ${packetTruth.executionIntent ?? "none"}`,
    `- reviewPolicy: ${packetTruth.reviewPolicy ?? "none"}`,
    `- needsReview: ${
      typeof packetTruth.needsReview === "boolean"
        ? packetTruth.needsReview
          ? "yes"
          : "no"
        : "none"
    }`,
    `- scopeMode: ${packetTruth.scopeMode}`,
    `- reasonCodes: ${
      packetTruth.reasonCodes.length > 0
        ? packetTruth.reasonCodes.join(", ")
        : "none"
    }`,
  ];
  const postToolCapacityCloseout = parseObject(
    input?.contextSnapshot?.paperclipPostToolCapacityCloseout,
  );
  const operatingBlocks = [missionCellPromptBlock, skillPromptBlock].filter(
    (value): value is string => Boolean(value),
  );
  const postToolCapacityLines =
    input?.contextSnapshot?.postToolCapacityResume === true &&
    Object.keys(postToolCapacityCloseout).length > 0
      ? [
          "",
          "Post-tool capacity resume truth:",
          `- roleTemplateId: ${readNonEmptyString(postToolCapacityCloseout.roleTemplateId) ?? "none"}`,
          `- nextResumePoint: ${readNonEmptyString(postToolCapacityCloseout.nextResumePoint) ?? "none"}`,
          `- parentDelegationPath: ${readNonEmptyString(postToolCapacityCloseout.parentDelegationPath) ?? "none"}`,
          `- childIssueCreated: ${postToolCapacityCloseout.childIssueCreated === true ? "yes" : "no"}`,
          `- guidance: ${readNonEmptyString(postToolCapacityCloseout.guidance) ?? "none"}`,
          "- Rule: finish the explicit closeout step first before widening the run again.",
        ]
      : [];
  const directAnswerAuditLines =
    directAnswerAuditTruth?.bounded === true
      ? [
          "",
          "Direct-answer audit guardrail:",
          `- requiresChildStatusRead: ${
            directAnswerAuditTruth.requiresChildStatusRead ? "yes" : "no"
          }`,
          `- namedTruthSurfaces: ${directAnswerAuditTruth.namedTruthSurfaces.join(
            ", ",
          )}`,
          `- issueIdentifiers: ${
            directAnswerAuditTruth.issueIdentifiers.length > 0
              ? directAnswerAuditTruth.issueIdentifiers.join(", ")
              : "none"
          }`,
          `- heartbeatRunIds: ${
            directAnswerAuditTruth.heartbeatRunIds.length > 0
              ? directAnswerAuditTruth.heartbeatRunIds.join(", ")
              : "none"
          }`,
          `- archaeologyForbidden: ${
            directAnswerAuditTruth.forbidArchaeology ? "yes" : "no"
          }`,
          `- repoReadsForbidden: ${
            directAnswerAuditTruth.forbidRepoReads ? "yes" : "no"
          }`,
          `- childCreationForbidden: ${
            directAnswerAuditTruth.forbidChildCreation ? "yes" : "no"
          }`,
          `- gitForbidden: ${directAnswerAuditTruth.forbidGit ? "yes" : "no"}`,
          `- resumeTriggerChaseForbidden: ${
            directAnswerAuditTruth.forbidResumeTriggerChase ? "yes" : "no"
          }`,
          "- Rule: After the required child-status read, stay on the named truth surfaces only and answer directly.",
          "- Rule: Do not open project lists, activity feeds, dashboards, repo files, or other archaeology unless a named surface fails or stronger truth contradicts it.",
          "- Route rule: heartbeat runs live under `/api/heartbeat-runs/{runId}`. Do not use `/api/runs/{id}`.",
          "- Auth rule: direct API reads use `Authorization: Bearer $env:PAPERCLIP_API_KEY`.",
          "- Preferred step 1: `pnpm --dir $env:PAPERCLIP_CLI_CWD paperclipai issue list --company-id $env:PAPERCLIP_COMPANY_ID --parent-id $env:PAPERCLIP_TASK_ID --json`",
          ...(directAnswerAuditTruth.issueIdentifiers.length > 0
            ? [
                `- Preferred step 2: resolve the exact issue UUID with \`$issue = (Invoke-RestMethod -Headers @{ Authorization = \"Bearer $env:PAPERCLIP_API_KEY\" } -Uri \"$env:PAPERCLIP_API_URL/api/companies/$env:PAPERCLIP_COMPANY_ID/issues?q=${directAnswerAuditTruth.issueIdentifiers[0]}\") | Where-Object { $_.identifier -eq \"${directAnswerAuditTruth.issueIdentifiers[0]}\" } | Select-Object -First 1\``,
                `- Preferred step 3: read company-run-chain with \`Invoke-RestMethod -Headers @{ Authorization = \"Bearer $env:PAPERCLIP_API_KEY\" } -Uri \"$env:PAPERCLIP_API_URL/api/issues/$($issue.id)/company-run-chain\"\``,
              ]
            : []),
          ...directAnswerAuditTruth.heartbeatRunIds.map(
            (runId, index) =>
              `- Preferred step ${
                directAnswerAuditTruth.issueIdentifiers.length > 0 ? index + 4 : index + 2
              }: read heartbeat run ${runId} with \`Invoke-RestMethod -Headers @{ Authorization = \"Bearer $env:PAPERCLIP_API_KEY\" } -Uri \"$env:PAPERCLIP_API_URL/api/heartbeat-runs/${runId}\"\``,
          ),
          "- Stop rule: once the named surfaces answer the question, reply directly and stop.",
        ]
      : [];

  return [
    "Paperclip issue assignment:",
    summary,
    "",
    "Paperclip API context:",
    `- PAPERCLIP_API_URL: ${apiUrl ?? "none"}`,
    `- PAPERCLIP_TASK_ID: ${issue.id}`,
    `- PAPERCLIP_COMPANY_ID: ${companyId ?? "none"}`,
    `- PROJECT_ID: ${projectId ?? "none"}`,
    `- GOAL_ID: ${goalId ?? "none"}`,
    `- PARENT_ID: ${parentId ?? "none"}`,
    "",
    "Execution packet truth:",
    ...packetLines,
    ...postToolCapacityLines,
    ...directAnswerAuditLines,
    ...operatingBlocks.flatMap((block) => ["", block]),
    ...(description ? ["", description] : []),
  ].join("\n");
}

function buildIssueWorkspacePrompt(contextSnapshot: Record<string, unknown>) {
  const workspace = parseObject(contextSnapshot.paperclipWorkspace);
  const workspaceCwd = readNonEmptyString(workspace.cwd);
  const workspaceBranch = readNonEmptyString(workspace.branchName);
  const worktreePath = readNonEmptyString(workspace.worktreePath);

  if (!workspaceCwd && !workspaceBranch && !worktreePath) {
    return null;
  }

  const lines = [
    "",
    "Execution workspace:",
    `- PAPERCLIP_WORKSPACE_CWD: ${workspaceCwd ?? "none"}`,
    `- PAPERCLIP_WORKSPACE_BRANCH: ${workspaceBranch ?? "none"}`,
    `- PAPERCLIP_WORKTREE_PATH: ${worktreePath ?? "none"}`,
  ];

  if (workspaceBranch) {
    lines.push(
      "- Branch rule: reuse PAPERCLIP_WORKSPACE_BRANCH for commits, worker-pr, and worker-done. Do not create a different ad hoc branch.",
    );
  }

  return lines.join("\n");
}

function buildReviewerTaskPrompt(input: {
  issue: IssuePromptContext;
  reviewTarget: ReviewTargetPromptContext | null;
}) {
  const { issue, reviewTarget } = input;
  const ref = issue.identifier ?? issue.id;
  const title = trimIssueText(issue.title);
  const summary = title ? `${ref} - ${title}` : ref;
  const originalPacket = buildIssueTaskPrompt(issue);

  const lines = [
    "Paperclip review assignment:",
    summary,
    "",
    "You are reviewing the latest worker result for this issue.",
    "Do not implement the original task yourself.",
    "",
    "Original packet:",
    originalPacket,
  ];

  if (!reviewTarget) {
    lines.push(
      "",
      "Review target status:",
      "- No prior non-reviewer run was found for this issue.",
      "",
      "Your task:",
      "1. Do not execute the packet yourself.",
      "2. Return Verdict: changes_requested.",
      "3. Explain that no worker result exists yet to review.",
      "4. Recommend that a worker run the issue first.",
    );
    return lines.join("\n");
  }

  lines.push(
    "",
    "Review target run:",
    `- Run ID: ${reviewTarget.runId}`,
    `- Worker agent: ${reviewTarget.agentName ?? reviewTarget.agentId}`,
    `- Status: ${reviewTarget.status}`,
  );
  if (reviewTarget.finishedAt) {
    lines.push(`- Finished at: ${reviewTarget.finishedAt}`);
  }
  if (reviewTarget.model) {
    lines.push(`- Model lane: ${reviewTarget.model}`);
  }
  if (reviewTarget.resultSummary) {
    lines.push(`- Result summary: ${reviewTarget.resultSummary}`);
  }
  if (reviewTarget.readEvidencePaths.length > 0) {
    lines.push("- Worker read evidence:");
    for (const readPath of reviewTarget.readEvidencePaths) {
      lines.push(`  - ${readPath}`);
    }
  } else {
    lines.push("- Worker read evidence: none recorded");
  }
  if (reviewTarget.artifactPaths.length > 0) {
    lines.push("- Worker produced artifacts:");
    for (const artifactPath of reviewTarget.artifactPaths) {
      lines.push(`  - ${artifactPath}`);
    }
  } else {
    lines.push("- Worker produced artifacts: none recorded");
  }
  if (reviewTarget.workerHandoff) {
    lines.push("", "Worker handoff:", reviewTarget.workerHandoff);
  }

  lines.push(
    "",
    "Your task:",
    "1. Inspect the actual produced result in the workspace.",
    "2. Check whether the result satisfies doneWhen and stays inside the issue scope.",
    "3. Flag unsupported claims or references to sources not named in the issue.",
    "4. Do not redo the worker task unless the review explicitly requires a tiny corrective verification step.",
    "",
    "Acceptance rules:",
    "- Use accepted only if doneWhen is satisfied, scope was respected, and no unsupported claim or source drift remains.",
    "- If the result references information that cannot be justified from the issue-listed sources, the produced artifact, or recorded evidence, return changes_requested.",
    "- If there is no worker result to inspect, return changes_requested.",
    "",
    "Return exactly these sections:",
    "1. Verdict: accepted | changes_requested",
    "2. Findings",
    "3. Evidence Checked",
    "4. Recommended Next Step",
  );

  return lines.join("\n");
}

function buildPromptResolverDryRunInput(
  contextSnapshot: Record<string, unknown>,
  issueTaskPrompt: string,
): PromptResolverInput {
  const targetPath = readNonEmptyString(
    contextSnapshot.paperclipSingleFileTargetPath,
  );
  const allowedTargets = targetPath ? [targetPath] : ["paperclipTaskPrompt"];
  const requestedTargets = readNonEmptyStringArray(
    contextSnapshot.paperclipRequestedTargets,
  );
  const allowedTools = readNonEmptyStringArray(
    contextSnapshot.paperclipAllowedTools,
  );
  const blockedTools = readNonEmptyStringArray(
    contextSnapshot.paperclipBlockedTools,
  );

  const overrideRaw = parseObject(contextSnapshot.paperclipRoleOverrideAttempt);
  const overrideAttempt: PromptResolverInput["roleAddon"]["overrideAttempt"] = {
    ...(readNonEmptyString(overrideRaw.approvalMode)
      ? {
          approvalMode:
            readNonEmptyString(overrideRaw.approvalMode) ?? undefined,
        }
      : {}),
    ...(readNonEmptyString(overrideRaw.riskClass)
      ? { riskClass: readNonEmptyString(overrideRaw.riskClass) ?? undefined }
      : {}),
    ...(readNonEmptyString(overrideRaw.budgetClass)
      ? {
          budgetClass: readNonEmptyString(overrideRaw.budgetClass) ?? undefined,
        }
      : {}),
    ...(readNonEmptyStringArray(overrideRaw.forbiddenChanges).length > 0
      ? {
          forbiddenChanges: readNonEmptyStringArray(
            overrideRaw.forbiddenChanges,
          ),
        }
      : {}),
    ...(readNonEmptyStringArray(overrideRaw.blockedTools).length > 0
      ? { blockedTools: readNonEmptyStringArray(overrideRaw.blockedTools) }
      : {}),
    ...(typeof overrideRaw.decisionTraceRequired === "boolean"
      ? { decisionTraceRequired: overrideRaw.decisionTraceRequired }
      : {}),
  };

  return {
    layerOrder: [
      "companyCore",
      "governanceExecution",
      "taskDelta",
      "roleAddon",
    ],
    companyCore: {
      missionGuardrails: "Human-led governance first",
      governancePrinciples: "Escalate before scope growth",
      tokenDiscipline: "Delta over full context",
      behaviorSeparation: "plan vs build vs review",
      versionTag: "heartbeat-dry-run",
    },
    governanceExecution: {
      scope: {
        allowedTargets,
        ...(requestedTargets.length > 0
          ? { requestedTargets }
          : { requestedTargets: [...allowedTargets] }),
        forbiddenChanges: ["runtime_mutation"],
      },
      tools: {
        allowedTools: allowedTools.length > 0 ? allowedTools : ["read_file"],
        blockedTools:
          blockedTools.length > 0 ? blockedTools : ["run_in_terminal"],
      },
      governance: {
        approvalMode: "manual_required_for_phase_b",
        riskClass: "medium",
        budgetClass: "medium",
      },
      audit: {
        decisionTraceRequired: true,
        reasonCodes: ["HEARTBEAT_DRY_RUN_PREFLIGHT"],
      },
      notes: issueTaskPrompt,
    },
    taskDelta: {
      objective: "Attach issue task prompt context",
      allowedTargets,
      acceptanceCriteria: ["Issue prompt context preserved"],
      constraints: ["No execution branching", "No prompt mutation"],
    },
    roleAddon: {
      roleName: "HeartbeatDryRunObserver",
      roleMandate: "Observe prompt preflight only",
      roleLimits: ["no policy override", "no runtime control"],
      ...(Object.keys(overrideAttempt).length > 0 ? { overrideAttempt } : {}),
    },
  };
}

export function buildHeartbeatIssuePromptContextPatch(input: {
  contextSnapshot: Record<string, unknown>;
  issue: IssuePromptContext | null;
}): HeartbeatPromptContextPatch {
  if (!input.issue) return {};

  const normalizedIssue = {
    id: input.issue.id,
    companyId: trimIssueText(input.issue.companyId),
    projectId: trimIssueText(input.issue.projectId),
    goalId: trimIssueText(input.issue.goalId),
    parentId: trimIssueText(input.issue.parentId),
    identifier: trimIssueText(input.issue.identifier),
    title: trimIssueText(input.issue.title),
    description: trimIssueText(input.issue.description),
  };

  const packetTruth = resolveIssueExecutionPacketTruth({
    title: normalizedIssue.title,
    description: normalizedIssue.description,
  });
  const missionCellBridge = resolveMissionCellRuntimeBridge(
    normalizedIssue.description,
  );
  const skillBridge = resolveVerifiedCapabilityRuntimeBridge(
    normalizedIssue.description,
  );
  const directAnswerAuditTruth = resolveDirectAnswerAuditTruth({
    title: normalizedIssue.title,
    description: normalizedIssue.description,
  });
  const missionCellPromptBlock = buildMissionCellPromptBlock(missionCellBridge);
  const skillPromptBlock = buildVerifiedCapabilityPromptBlock(skillBridge);
  const workspacePrompt = buildIssueWorkspacePrompt(input.contextSnapshot);
  const issueTaskPrompt = [
    buildIssueTaskPrompt(normalizedIssue, {
      skillPromptBlock,
      missionCellPromptBlock,
      contextSnapshot: input.contextSnapshot,
    }),
    workspacePrompt,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");

  const patch: HeartbeatPromptContextPatch = {
    paperclipIssue: normalizedIssue,
    paperclipIssueExecutionPacketTruth: packetTruth,
    paperclipExecutionPacketStatus: packetTruth.status,
    paperclipExecutionPacketReasonCodes: packetTruth.reasonCodes,
    paperclipExecutionPacketTargetFile: packetTruth.targetFile,
    paperclipExecutionPacketTargetFolder: packetTruth.targetFolder,
    paperclipExecutionPacketArtifactKind: packetTruth.artifactKind,
    paperclipExecutionPacketDoneWhen: packetTruth.doneWhen,
    paperclipWorkspacePrompt: workspacePrompt,
    paperclipTaskPrompt: issueTaskPrompt,
    paperclipMissionCellRequestedIds:
      missionCellBridge.requestedMissionCellIds.length > 0
        ? missionCellBridge.requestedMissionCellIds
        : null,
    paperclipMissionCellReferences:
      missionCellBridge.briefs.length > 0 ? missionCellBridge.briefs : null,
    paperclipMissionCellReferenceErrors:
      missionCellBridge.errors.length > 0 ? missionCellBridge.errors : null,
    paperclipVerifiedSkillRequestedIds:
      skillBridge.requestedCapabilityIds.length > 0
        ? skillBridge.requestedCapabilityIds
        : null,
    paperclipVerifiedSkillReferences:
      skillBridge.briefs.length > 0 ? skillBridge.briefs : null,
    paperclipVerifiedSkillReferenceErrors:
      skillBridge.errors.length > 0 ? skillBridge.errors : null,
    paperclipDirectAnswerAuditTruth:
      directAnswerAuditTruth?.bounded === true ? directAnswerAuditTruth : null,
    paperclipPromptResolverPreflight: null,
    paperclipSingleFileTargetPath: null,
    paperclipAbortOnMissingFile: null,
    paperclipBenchmarkFamily: null,
    paperclipStrictFloorMode: null,
    paperclipAllowedTools: null,
    paperclipBlockedTools: null,
  };

  if (packetTruth.ready) {
    const doneWhen = packetTruth.doneWhen?.toLowerCase() ?? "";
    if (
      doneWhen.includes("post-tool capacity") ||
      doneWhen.includes("same session path") ||
      doneWhen.includes("same-session path")
    ) {
      patch.workPacketBudget = {
        budgetClass: "large",
        hardCapTokens: 500000,
      };
    }
  }

  if (isTestRunContext(input.contextSnapshot)) {
    patch.paperclipPromptResolverPreflight = runPromptResolverPreflight(
      buildPromptResolverDryRunInput(input.contextSnapshot, issueTaskPrompt),
      { includeAuditMeta: true },
    );
  }

  const singleFileTargetPath = extractSingleFileBenchmarkTarget(
    normalizedIssue.description,
  );
  if (singleFileTargetPath) {
    patch.paperclipSingleFileTargetPath = singleFileTargetPath;
    patch.paperclipAbortOnMissingFile = true;
  }

  const benchmarkFamily = extractBenchmarkFamily(normalizedIssue.description);
  if (benchmarkFamily) {
    patch.paperclipBenchmarkFamily = benchmarkFamily;
  }

  const strictFloorMode =
    typeof benchmarkFamily === "string" &&
    (benchmarkFamily.trim().toLowerCase().startsWith("t1-floor-v") ||
      benchmarkFamily.trim().toLowerCase().startsWith("t1-floor-normalized-v"));
  if (strictFloorMode) {
    patch.paperclipStrictFloorMode = true;
    patch.paperclipAllowedTools = ["read_file"];
    patch.paperclipBlockedTools = [
      "run_shell_command",
      "list_directory",
      "glob_search",
      "grep_search",
      "activate_skill",
    ];
  }

  if (directAnswerAuditTruth?.bounded === true) {
    patch.paperclipAllowedTools = ["read_file", "run_shell_command"];
    patch.paperclipBlockedTools = [
      "list_directory",
      "glob_search",
      "grep_search",
      "activate_skill",
    ];
  }

  return patch;
}

export function buildHeartbeatReviewerPromptContextPatch(input: {
  contextSnapshot: Record<string, unknown>;
  issue: IssuePromptContext | null;
  reviewTarget: ReviewTargetPromptContext | null;
}): HeartbeatPromptContextPatch {
  if (!input.issue) return {};

  const workspacePrompt = buildIssueWorkspacePrompt(input.contextSnapshot);
  const issueTaskPrompt = buildIssueTaskPrompt(input.issue);
  return {
    paperclipOriginalTaskPrompt: issueTaskPrompt,
    paperclipTaskPrompt: buildReviewerTaskPrompt({
      issue: input.issue,
      reviewTarget: input.reviewTarget,
    }),
    paperclipWorkspacePrompt: workspacePrompt,
    paperclipReviewTarget: input.reviewTarget
      ? {
          runId: input.reviewTarget.runId,
          agentId: input.reviewTarget.agentId,
          agentName: input.reviewTarget.agentName,
          status: input.reviewTarget.status,
          finishedAt: input.reviewTarget.finishedAt,
          model: input.reviewTarget.model,
          resultSummary: input.reviewTarget.resultSummary,
          readEvidencePaths: input.reviewTarget.readEvidencePaths,
          artifactPaths: input.reviewTarget.artifactPaths,
          workerHandoff: input.reviewTarget.workerHandoff,
        }
      : null,
    paperclipReviewTargetError: input.reviewTarget
      ? null
      : "No prior non-reviewer run found for this issue.",
  };
}

export function applyHeartbeatContextPatch(
  contextSnapshot: Record<string, unknown>,
  patch: HeartbeatPromptContextPatch,
) {
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete contextSnapshot[key];
      continue;
    }
    contextSnapshot[key] = value;
  }
  return contextSnapshot;
}

export function applyIssuePromptContext(
  contextSnapshot: Record<string, unknown>,
  issue: IssuePromptContext | null,
) {
  return applyHeartbeatContextPatch(
    contextSnapshot,
    buildHeartbeatIssuePromptContextPatch({ contextSnapshot, issue }),
  );
}

export function applyReviewerPromptContext(
  contextSnapshot: Record<string, unknown>,
  issue: IssuePromptContext | null,
  reviewTarget: ReviewTargetPromptContext | null,
) {
  return applyHeartbeatContextPatch(
    contextSnapshot,
    buildHeartbeatReviewerPromptContextPatch({
      contextSnapshot,
      issue,
      reviewTarget,
    }),
  );
}
