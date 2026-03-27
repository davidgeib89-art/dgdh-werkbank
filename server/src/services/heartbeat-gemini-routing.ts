import path from "node:path";
import type {
  IssueExecutionPacketArtifactKind,
  IssueExecutionPacketTruth,
} from "@paperclipai/shared";
import { parseObject } from "../adapters/utils.js";
import {
  getGeminiRoutingPolicy,
  resolveGeminiRoutingPreflight,
  type GeminiRoutingPreflightResult,
} from "./gemini-routing.js";
import {
  produceFlashLiteRoutingProposal,
  type GeminiFlashLiteProposal,
  type GeminiFlashLiteRouterHealth,
  type GeminiFlashLiteRouterInput,
  type GeminiFlashLiteRouterResult,
} from "./gemini-flash-lite-router.js";
import { refreshGeminiRuntimeQuotaSnapshot } from "./gemini-quota-producer.js";
import { resolveDirectAnswerAuditTruth } from "./direct-answer-audit.js";
import { resolveIssueExecutionPacketTruth } from "./issue-execution-packet.js";
import { resolveAssignedRoleTemplate } from "./role-templates.js";

type RoleHint = "ceo" | "worker" | "reviewer";
type BucketName = "flash" | "pro" | "flash-lite";
type TaskClass =
  | "research-light"
  | "bounded-implementation"
  | "heavy-architecture"
  | "benchmark-floor";
type BudgetClass = "small" | "medium" | "large";
type ExecutionIntent =
  | "investigate"
  | "implement"
  | "review"
  | "benchmark"
  | "plan";
type RiskLevel = "low" | "medium" | "high";

const ROUTER_ALLOWED_SKILLS = [
  "repo-read",
  "repo-write",
  "web-search",
  "test-runner",
  "status-summary",
] as const;

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeExecutionIntent(value: unknown): ExecutionIntent | null {
  const normalized = asString(value)?.toLowerCase();
  if (
    normalized === "investigate" ||
    normalized === "implement" ||
    normalized === "review" ||
    normalized === "benchmark" ||
    normalized === "plan"
  ) {
    return normalized;
  }
  return null;
}

function normalizeArtifactKind(
  value: unknown,
): IssueExecutionPacketArtifactKind | null {
  const normalized = asString(value)?.toLowerCase().replace(/[\s-]+/g, "_");
  if (
    normalized === "code_patch" ||
    normalized === "doc_update" ||
    normalized === "config_change" ||
    normalized === "test_update" ||
    normalized === "multi_file_change" ||
    normalized === "folder_operation"
  ) {
    return normalized;
  }
  return null;
}

function normalizeRoleHint(value: unknown): RoleHint | null {
  const normalized = asString(value)?.toLowerCase();
  if (
    normalized === "ceo" ||
    normalized === "worker" ||
    normalized === "reviewer"
  ) {
    return normalized;
  }
  return null;
}

function mergeRuntimeStatePatch(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const patchControlPlane = parseObject(patch.controlPlane);
  const baseControlPlane = parseObject(base.controlPlane);
  return {
    ...base,
    ...patch,
    ...(Object.keys(patchControlPlane).length > 0
      ? {
          controlPlane: {
            ...baseControlPlane,
            ...patchControlPlane,
          },
        }
      : {}),
  };
}

function buildRouterHealthFromRuntimeState(
  runtimeState: Record<string, unknown>,
): GeminiFlashLiteRouterHealth {
  const routerRuntime = asObject(parseObject(runtimeState.controlPlane).routerRuntime);
  const breaker = asObject(routerRuntime.breaker);
  const metrics = asObject(routerRuntime.metrics);
  return {
    successCount: Math.max(0, Math.floor(asNumber(metrics.successCount) ?? 0)),
    fallbackCount: Math.max(0, Math.floor(asNumber(metrics.fallbackCount) ?? 0)),
    timeoutCount: Math.max(0, Math.floor(asNumber(metrics.timeoutCount) ?? 0)),
    parseFailCount: Math.max(0, Math.floor(asNumber(metrics.parseFailCount) ?? 0)),
    commandErrorCount: Math.max(
      0,
      Math.floor(asNumber(metrics.commandErrorCount) ?? 0),
    ),
    cacheHitCount: Math.max(0, Math.floor(asNumber(metrics.cacheHitCount) ?? 0)),
    circuitOpenCount: Math.max(
      0,
      Math.floor(asNumber(metrics.circuitOpenCount) ?? 0),
    ),
    consecutiveFailures: Math.max(
      0,
      Math.floor(asNumber(breaker.consecutiveFailures) ?? 0),
    ),
    breakerOpenUntil: asString(breaker.openUntil),
    lastLatencyMs: asNumber(metrics.lastLatencyMs),
    lastErrorReason: asString(metrics.lastErrorReason),
  };
}

function buildRoleContextPatch(resolvedConfig: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  const roleTemplateResolution = resolveAssignedRoleTemplate(resolvedConfig);
  if (roleTemplateResolution.error) {
    patch.paperclipRoleTemplateError = roleTemplateResolution.error;
    return {
      contextPatch: patch,
      roleTemplateResolution,
      roleHint: null as RoleHint | null,
    };
  }

  if (!roleTemplateResolution.assigned) {
    return {
      contextPatch: patch,
      roleTemplateResolution,
      roleHint: null as RoleHint | null,
    };
  }

  const assigned = roleTemplateResolution.assigned;
  patch.agentRole = assigned.template.id;
  patch.roleName = assigned.template.label;
  patch.paperclipRoleTemplate = {
    id: assigned.template.id,
    version: assigned.template.version,
    label: assigned.template.label,
    description: assigned.template.description,
    sourcePath: assigned.sourcePath,
    roleAppendPrompt: assigned.roleAppendPrompt,
  };
  patch.paperclipRoleTemplatePrompt = assigned.prompt;
  return {
    contextPatch: patch,
    roleTemplateResolution,
    roleHint: normalizeRoleHint(assigned.template.id),
  };
}

function readPacketTruth(
  context: Record<string, unknown>,
  issueRef: HeartbeatGeminiRoutingIssueRef | null,
): IssueExecutionPacketTruth | null {
  const existing = asObject(context.paperclipIssueExecutionPacketTruth);
  if (Object.keys(existing).length > 0) {
    return existing as unknown as IssueExecutionPacketTruth;
  }
  if (!issueRef) return null;
  return resolveIssueExecutionPacketTruth({
    title: issueRef.title,
    description: issueRef.description,
  });
}

function deriveTargetFolder(
  targetFile: string | null,
  targetFolder: string | null,
): string {
  if (targetFolder) return targetFolder;
  if (!targetFile) return ".";
  const dirname = path.posix.dirname(targetFile.replace(/\\/g, "/"));
  return dirname === "." ? "." : dirname;
}

function readReadyPacketTruth(
  context: Record<string, unknown>,
  issueRef: HeartbeatGeminiRoutingIssueRef | null,
): IssueExecutionPacketTruth | null {
  const packetTruth = readPacketTruth(context, issueRef);
  if (!packetTruth) return null;

  const status = asString(packetTruth.status)?.toLowerCase();
  const ready = asBoolean(packetTruth.ready) === true || status === "ready";
  const artifactKind = normalizeArtifactKind(packetTruth.artifactKind);
  const targetFile = asString(packetTruth.targetFile);
  const targetFolder = asString(packetTruth.targetFolder);
  const doneWhen = asString(packetTruth.doneWhen);
  if (!ready || !artifactKind || !doneWhen || (!targetFile && !targetFolder)) {
    return null;
  }
  return packetTruth;
}

function selectReadyPacketBucket(input: {
  roleHint: RoleHint | null;
  packetType: string | null;
}): BucketName {
  if (input.packetType === "premium_model") return "pro";
  if (input.roleHint === "ceo") return "flash";
  return "flash-lite";
}

function inferReadyPacketTaskClass(
  executionIntent: ExecutionIntent,
): TaskClass {
  if (executionIntent === "investigate") return "research-light";
  if (executionIntent === "benchmark") return "benchmark-floor";
  if (executionIntent === "plan") return "heavy-architecture";
  return "bounded-implementation";
}

function inferReadyPacketBudgetClass(input: {
  targetFile: string | null;
  artifactKind: IssueExecutionPacketArtifactKind;
}): BudgetClass {
  if (
    input.targetFile &&
    (input.artifactKind === "doc_update" ||
      input.artifactKind === "config_change" ||
      input.artifactKind === "test_update" ||
      input.artifactKind === "code_patch")
  ) {
    return "small";
  }
  if (
    input.artifactKind === "multi_file_change" ||
    input.artifactKind === "folder_operation"
  ) {
    return "medium";
  }
  return "small";
}

function inferReadyPacketRiskLevel(input: {
  artifactKind: IssueExecutionPacketArtifactKind;
  budgetClass: BudgetClass;
}): RiskLevel {
  if (input.budgetClass === "large") return "high";
  if (
    input.artifactKind === "doc_update" ||
    input.artifactKind === "config_change" ||
    input.artifactKind === "test_update"
  ) {
    return "low";
  }
  if (input.artifactKind === "folder_operation") return "medium";
  return "medium";
}

function buildReadyPacketProposal(input: {
  packetTruth: IssueExecutionPacketTruth;
  roleHint: RoleHint | null;
  bucketModels: Record<BucketName, string>;
}): GeminiFlashLiteProposal {
  const executionIntent =
    normalizeExecutionIntent(input.packetTruth.executionIntent) ?? "implement";
  const artifactKind =
    normalizeArtifactKind(input.packetTruth.artifactKind) ?? "code_patch";
  const targetFile = asString(input.packetTruth.targetFile);
  const targetFolder = deriveTargetFolder(
    targetFile,
    asString(input.packetTruth.targetFolder),
  );
  const chosenBucket = selectReadyPacketBucket({
    roleHint: input.roleHint,
    packetType: asString(input.packetTruth.packetType),
  });
  const taskClass = inferReadyPacketTaskClass(executionIntent);
  const budgetClass = inferReadyPacketBudgetClass({
    targetFile,
    artifactKind,
  });
  const riskLevel = inferReadyPacketRiskLevel({ artifactKind, budgetClass });

  return {
    taskClass,
    budgetClass,
    executionIntent,
    targetFile: targetFile ?? "",
    targetFolder,
    artifactKind,
    doneWhen:
      asString(input.packetTruth.doneWhen) ??
      "Complete the ready execution packet.",
    riskLevel,
    missingInputs: [],
    needsApproval: false,
    chosenBucket,
    chosenModelLane: input.bucketModels[chosenBucket],
    fallbackBucket:
      chosenBucket === "pro"
        ? "flash"
        : chosenBucket === "flash"
          ? "flash-lite"
          : "flash",
    allowedSkills:
      input.roleHint === "ceo" ? ["repo-read", "repo-write"] : [],
    rationale:
      "ready execution packet truth seeded the routing plan without an extra classifier call",
  };
}

function isThinReadySmallDefaultProposal(
  proposal: GeminiFlashLiteProposal,
): boolean {
  return (
    proposal.budgetClass === "small" &&
    proposal.riskLevel === "low" &&
    proposal.missingInputs.length === 0 &&
    proposal.needsApproval === false &&
    proposal.targetFile.trim().length > 0 &&
    proposal.artifactKind !== "multi_file_change" &&
    proposal.artifactKind !== "folder_operation"
  );
}

function buildRoutingProposalContext(
  proposal: GeminiFlashLiteProposal,
): Record<string, unknown> {
  return {
    taskType: proposal.taskClass,
    taskClass: proposal.taskClass,
    budgetClass: proposal.budgetClass,
    executionIntent: proposal.executionIntent,
    targetFile: proposal.targetFile,
    targetFolder: proposal.targetFolder,
    artifactKind: proposal.artifactKind,
    doneWhen: proposal.doneWhen,
    riskLevel: proposal.riskLevel,
    missingInputs: proposal.missingInputs,
    needsApproval: proposal.needsApproval,
    chosenBucket: proposal.chosenBucket,
    chosenModelLane: proposal.chosenModelLane,
    fallbackBucket: proposal.fallbackBucket,
    rationale: proposal.rationale,
  };
}

function resolveModelOverride(input: {
  adapterType: string;
  configuredModel?: string | null;
  applyModelLane: boolean;
  effectiveModelLane?: string | null;
}) {
  const configuredModel = input.configuredModel?.trim() || null;
  const effectiveModelLane = input.effectiveModelLane?.trim() || null;
  if (!input.applyModelLane || !effectiveModelLane) return configuredModel;
  return effectiveModelLane;
}

function shouldPinRouterFlashLane(input: {
  thinDefaultExecution: boolean;
  routingProposal: GeminiFlashLiteProposal | null;
  routingProposalMeta: Record<string, unknown> | null;
  configuredModel: unknown;
}) {
  if (input.thinDefaultExecution || !input.routingProposal) return false;
  const configuredModel = asString(input.configuredModel)?.toLowerCase() ?? null;
  if (configuredModel !== "auto") return false;
  const proposalSource = asString(input.routingProposalMeta?.source);
  if (proposalSource !== "flash_lite_call") return false;
  return input.routingProposal.chosenModelLane.toLowerCase().includes("flash");
}

function isRecoverableRouterWarning(warning: string | null): boolean {
  return (
    warning === "flash_lite_router_invalid_json" ||
    warning === "flash_lite_router_schema_invalid" ||
    warning === "flash_lite_router_non_zero_exit" ||
    warning === "flash_lite_router_timeout" ||
    warning === "flash_lite_router_command_error"
  );
}

function isSilentRouterWarning(warning: string | null): boolean {
  return (
    warning === "flash_lite_router_skipped_ready_packet_truth" ||
    warning === "flash_lite_router_skipped_role_scope" ||
    warning === "flash_lite_router_skipped_packet_scope" ||
    warning === "flash_lite_router_skipped_deterministic_tool" ||
    warning === "flash_lite_router_disabled" ||
    warning === "flash_lite_router_circuit_open"
  );
}

function shouldAllowRouterSkills(input: {
  roleHint: RoleHint | null;
  proposal: GeminiFlashLiteProposal;
}): boolean {
  if (input.roleHint === "ceo") {
    return input.proposal.taskClass === "research-light";
  }
  return true;
}

function readDirectAnswerAuditTruth(
  context: Record<string, unknown>,
  issueRef: HeartbeatGeminiRoutingIssueRef | null,
) {
  const existing = asObject(context.paperclipDirectAnswerAuditTruth);
  if (Object.keys(existing).length > 0) {
    return existing as unknown as ReturnType<typeof resolveDirectAnswerAuditTruth>;
  }
  if (!issueRef) return null;
  return resolveDirectAnswerAuditTruth({
    title: issueRef.title,
    description: issueRef.description,
  });
}

export interface HeartbeatGeminiRoutingIssueRef {
  id?: string | null;
  companyId?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  parentId?: string | null;
  identifier?: string | null;
  title?: string | null;
  description?: string | null;
}

export interface PrepareHeartbeatGeminiRoutingInput {
  agent: {
    adapterType: string;
  };
  resolvedConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  runtimeState: Record<string, unknown>;
  issueRef: HeartbeatGeminiRoutingIssueRef | null;
  context: Record<string, unknown>;
}

export interface HeartbeatGeminiRoutingPlan {
  contextPatch: Record<string, unknown>;
  resolvedConfigPatch: Record<string, unknown>;
  routingPreflight: GeminiRoutingPreflightResult | null;
  routingProposalMeta: Record<string, unknown> | null;
  runtimeStatePatch: Record<string, unknown>;
  warnings: string[];
}

export interface HeartbeatRoutingReplayFixture {
  name: string;
  agent: {
    adapterType: string;
  };
  resolvedConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  runtimeState: Record<string, unknown>;
  issueRef: HeartbeatGeminiRoutingIssueRef | null;
  context?: Record<string, unknown>;
  expected: {
    roleHint: RoleHint | null;
    selectedBucket: BucketName;
    effectiveModelLane: string;
    parseStatus: string;
    fallbackReason: string | null;
    readyPacketSkip: boolean;
    allowedSkills?: string[];
  };
}

interface PrepareHeartbeatGeminiRoutingDeps {
  produceRoutingProposal?: (
    input: GeminiFlashLiteRouterInput,
  ) => Promise<GeminiFlashLiteRouterResult>;
}

export async function prepareHeartbeatGeminiRouting(
  input: PrepareHeartbeatGeminiRoutingInput,
  deps: PrepareHeartbeatGeminiRoutingDeps = {},
): Promise<HeartbeatGeminiRoutingPlan> {
  const contextPatch: Record<string, unknown> = {};
  const resolvedConfigPatch: Record<string, unknown> = {};
  const warnings: string[] = [];

  const {
    contextPatch: roleContextPatch,
    roleTemplateResolution,
    roleHint,
  } = buildRoleContextPatch(input.resolvedConfig);
  Object.assign(contextPatch, roleContextPatch);

  if (input.agent.adapterType !== "gemini_local") {
    return {
      contextPatch,
      resolvedConfigPatch,
      routingPreflight: null,
      routingProposalMeta: null,
      runtimeStatePatch: {},
      warnings,
    };
  }

  const workingContext = {
    ...input.context,
    ...contextPatch,
  };
  const runtimeConfigForRouting = parseObject(input.runtimeConfig);
  let runtimeStateForRouting = parseObject(input.runtimeState);
  let accumulatedRuntimeStatePatch: Record<string, unknown> = {};

  const packetTruth = readPacketTruth(workingContext, input.issueRef);
  if (packetTruth) {
    contextPatch.paperclipIssueExecutionPacketTruth = packetTruth;
    contextPatch.paperclipExecutionPacketStatus = packetTruth.status;
    contextPatch.paperclipExecutionPacketReasonCodes = packetTruth.reasonCodes;
    contextPatch.paperclipExecutionPacketTargetFile = packetTruth.targetFile;
    contextPatch.paperclipExecutionPacketTargetFolder = packetTruth.targetFolder;
    contextPatch.paperclipExecutionPacketArtifactKind = packetTruth.artifactKind;
    contextPatch.paperclipExecutionPacketDoneWhen = packetTruth.doneWhen;
    if (
      asString(workingContext.packetType) === null &&
      asString(packetTruth.packetType) !== null
    ) {
      contextPatch.packetType = asString(packetTruth.packetType);
    }
    Object.assign(workingContext, contextPatch);
  }

  const quotaRefresh = refreshGeminiRuntimeQuotaSnapshot({
    runtimeConfig: runtimeConfigForRouting,
    runtimeState: runtimeStateForRouting,
    trigger: "before_preflight",
  });
  if (quotaRefresh.runtimeStateChanged) {
    accumulatedRuntimeStatePatch = mergeRuntimeStatePatch(
      accumulatedRuntimeStatePatch,
      quotaRefresh.runtimeStatePatch,
    );
    runtimeStateForRouting = mergeRuntimeStatePatch(
      runtimeStateForRouting,
      quotaRefresh.runtimeStatePatch,
    );
  }
  warnings.push(
    ...quotaRefresh.warnings.map(
      (warning) =>
        `Quota snapshot refresh (${quotaRefresh.refreshSource ?? "none"}) reported ${warning}`,
    ),
  );

  const readyPacketTruth = readReadyPacketTruth(workingContext, input.issueRef);
  const directAnswerAuditTruth = readDirectAnswerAuditTruth(
    workingContext,
    input.issueRef,
  );
  if (directAnswerAuditTruth?.bounded === true) {
    contextPatch.paperclipDirectAnswerAuditTruth = directAnswerAuditTruth;
    contextPatch.paperclipSkillSelection = {
      allowedSkills: ["repo-read"],
      source: "direct_answer_audit_truth",
    };
    workingContext.paperclipSkillSelection = contextPatch.paperclipSkillSelection;
    resolvedConfigPatch.includeSkills = ["repo-read"];
  }
  const { policy } = getGeminiRoutingPolicy();
  const manualOverrideForRouter = parseObject(
    parseObject(runtimeConfigForRouting.routingPolicy).manualOverride,
  );
  const runRouter =
    deps.produceRoutingProposal ?? produceFlashLiteRoutingProposal;

  let routingProposal: GeminiFlashLiteProposal | null = null;
  let routingProposalMeta: Record<string, unknown> | null = null;
  let thinDefaultExecution = false;

  if (readyPacketTruth) {
    routingProposal = buildReadyPacketProposal({
      packetTruth: readyPacketTruth,
      roleHint,
      bucketModels: policy.bucketModels,
    });
    thinDefaultExecution = isThinReadySmallDefaultProposal(routingProposal);
    routingProposalMeta = {
      source: "heuristic_policy",
      parseStatus: "not_attempted",
      latencyMs: null,
      attempted: false,
      cacheHit: false,
      fallbackReason: "ready_packet_truth",
      warning: "flash_lite_router_skipped_ready_packet_truth",
      warningClass: "informational_skip",
      routerHealth: buildRouterHealthFromRuntimeState(runtimeStateForRouting),
    };
  } else {
    const routerResult = await runRouter({
      adapterType: input.agent.adapterType,
      adapterConfig: input.resolvedConfig,
      runtimeConfig: runtimeConfigForRouting,
      runtimeState: runtimeStateForRouting,
      context: workingContext,
      quotaSnapshot: {
        source: quotaRefresh.snapshot.source,
        accountLabel: quotaRefresh.snapshot.accountLabel,
        snapshotAt: quotaRefresh.snapshot.snapshotAt,
        resetAt: quotaRefresh.snapshot.resetAt,
        resetReason: quotaRefresh.snapshot.resetReason,
        isStale: quotaRefresh.snapshot.isStale,
        staleReason: quotaRefresh.snapshot.staleReason,
        ageSec: quotaRefresh.snapshot.ageSec,
        maxAgeSec: quotaRefresh.snapshot.maxAgeSec,
        buckets: quotaRefresh.snapshot.buckets,
      },
      allowedBuckets: ["flash", "pro", "flash-lite"],
      allowedModelLanes: Object.values(policy.bucketModels),
      allowedSkillPool: [...ROUTER_ALLOWED_SKILLS],
      manualOverride:
        Object.keys(manualOverrideForRouter).length > 0
          ? manualOverrideForRouter
          : null,
    });
    if (Object.keys(routerResult.runtimeStatePatch).length > 0) {
      accumulatedRuntimeStatePatch = mergeRuntimeStatePatch(
        accumulatedRuntimeStatePatch,
        routerResult.runtimeStatePatch,
      );
      runtimeStateForRouting = mergeRuntimeStatePatch(
        runtimeStateForRouting,
        routerResult.runtimeStatePatch,
      );
    }
    routingProposal = routerResult.proposal;
    routingProposalMeta = {
      source: routerResult.source,
      parseStatus: routerResult.parseStatus,
      latencyMs: routerResult.latencyMs,
      attempted: routerResult.attempted,
      cacheHit: routerResult.cacheHit,
      fallbackReason: routerResult.fallbackReason,
      warning: routerResult.warning,
      warningClass: isRecoverableRouterWarning(routerResult.warning)
        ? "recoverable_advisory"
        : isSilentRouterWarning(routerResult.warning)
          ? "informational_skip"
          : null,
      routerHealth: routerResult.routerHealth,
    };
    if (
      routerResult.warning &&
      !isRecoverableRouterWarning(routerResult.warning) &&
      !isSilentRouterWarning(routerResult.warning)
    ) {
      warnings.push(routerResult.warning);
    }
  }

  if (routingProposal) {
    contextPatch.paperclipRoutingProposal = buildRoutingProposalContext(
      routingProposal,
    );
  } else {
    contextPatch.paperclipRoutingProposal = null;
  }
  contextPatch.paperclipRoutingProposalMeta = routingProposalMeta;
  if (thinDefaultExecution && routingProposal) {
    contextPatch.paperclipDefaultExecutionPath = "ready_small_default";
    contextPatch.forceFreshSession = true;
    contextPatch.paperclipFixedModelLane = routingProposal.chosenModelLane;
  }
  Object.assign(workingContext, contextPatch);

  if (
    directAnswerAuditTruth?.bounded !== true &&
    routingProposal?.allowedSkills &&
    routingProposal.allowedSkills.length > 0 &&
    shouldAllowRouterSkills({ roleHint, proposal: routingProposal })
  ) {
    resolvedConfigPatch.includeSkills = routingProposal.allowedSkills;
    contextPatch.paperclipSkillSelection = {
      allowedSkills: routingProposal.allowedSkills,
      source:
        readyPacketTruth && roleHint === "ceo"
          ? "ready_packet_truth"
          : "flash_lite_proposal",
    };
    workingContext.paperclipSkillSelection = contextPatch.paperclipSkillSelection;
  } else if (directAnswerAuditTruth?.bounded !== true) {
    contextPatch.paperclipSkillSelection = null;
  }

  const routingPreflight = resolveGeminiRoutingPreflight({
    adapterType: input.agent.adapterType,
    adapterConfig: {
      ...input.resolvedConfig,
      ...resolvedConfigPatch,
    },
    runtimeConfig: runtimeConfigForRouting,
    runtimeState: runtimeStateForRouting,
    context: workingContext,
  });

  let finalRoutingPreflight = routingPreflight;
  if (routingPreflight) {
    const pinRouterFlashLane = shouldPinRouterFlashLane({
      thinDefaultExecution,
      routingProposal,
      routingProposalMeta,
      configuredModel: input.resolvedConfig.model,
    });
    finalRoutingPreflight =
      thinDefaultExecution && routingProposal
        ? {
            ...routingPreflight,
            selected: {
              ...routingPreflight.selected,
              configuredBucket: routingProposal.chosenBucket,
              selectedBucket: routingProposal.chosenBucket,
              effectiveBucket: routingProposal.chosenBucket,
              configuredModelLane: routingProposal.chosenModelLane,
              recommendedModelLane: routingProposal.chosenModelLane,
              effectiveModelLane: routingProposal.chosenModelLane,
              modelLaneReason:
                "ready_small_default pinned a fixed model lane from ready packet truth",
              budgetClass: routingProposal.budgetClass,
              taskType: routingProposal.taskClass,
              executionIntent: routingProposal.executionIntent,
              targetFolder: routingProposal.targetFolder,
              doneWhen: routingProposal.doneWhen,
              riskLevel: routingProposal.riskLevel,
              missingInputs: [],
              needsApproval: false,
              blocked: false,
              blockReason: null,
            },
            routingReason:
              "ready_small_default_path pinned fixed model and skipped smart-path escalation",
            applyModelLane: false,
          }
        : pinRouterFlashLane && routingProposal
          ? {
              ...routingPreflight,
              selected: {
                ...routingPreflight.selected,
                configuredBucket: routingProposal.chosenBucket,
                selectedBucket: routingProposal.chosenBucket,
                effectiveBucket: routingProposal.chosenBucket,
                configuredModelLane: routingProposal.chosenModelLane,
                recommendedModelLane: routingProposal.chosenModelLane,
                effectiveModelLane: routingProposal.chosenModelLane,
                modelLaneReason:
                  "flash_lite_router_proposal pinned an explicit flash lane for an auto-model run",
                laneStrategy: "soft_enforced_use_recommended",
                budgetClass: routingProposal.budgetClass,
                taskType: routingProposal.taskClass,
                executionIntent: routingProposal.executionIntent,
                targetFolder: routingProposal.targetFolder,
                doneWhen: routingProposal.doneWhen,
                riskLevel: routingProposal.riskLevel,
                missingInputs: [],
                needsApproval: false,
                blocked: false,
                blockReason: null,
              },
              routingReason:
                "flash_lite_router_path pinned explicit flash lane from router proposal",
              applyModelLane: true,
            }
        : routingPreflight;

    contextPatch.paperclipRoutingPreflight = finalRoutingPreflight;
    if (workingContext.accountLabel !== undefined) {
      contextPatch.accountLabel = workingContext.accountLabel;
    }
    if (workingContext.bucket !== undefined) {
      contextPatch.bucket =
        (thinDefaultExecution || pinRouterFlashLane) && routingProposal
          ? routingProposal.chosenBucket
          : workingContext.bucket;
    }
    if (workingContext.budgetClass !== undefined) {
      contextPatch.budgetClass = workingContext.budgetClass;
    }

    const routedModelOverride =
      (thinDefaultExecution || pinRouterFlashLane) && routingProposal
        ? routingProposal.chosenModelLane
        : resolveModelOverride({
            adapterType: input.agent.adapterType,
            configuredModel: asString(input.resolvedConfig.model),
            applyModelLane: routingPreflight.applyModelLane,
            effectiveModelLane: routingPreflight.selected.effectiveModelLane,
          });
    if (routedModelOverride) {
      resolvedConfigPatch.model = routedModelOverride;
    }
  }

  if (roleTemplateResolution.error) {
    warnings.push(roleTemplateResolution.error);
  }

  return {
    contextPatch,
    resolvedConfigPatch,
    routingPreflight: finalRoutingPreflight,
    routingProposalMeta,
    runtimeStatePatch: accumulatedRuntimeStatePatch,
    warnings,
  };
}
