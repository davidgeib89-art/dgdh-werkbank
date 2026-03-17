export type ResolverLayerName =
  | "companyCore"
  | "governanceExecution"
  | "taskDelta"
  | "roleAddon"
  | "skillRepoDelta";

export type ResolverDecision = "ok" | "fail" | "escalated";

export type ResolverReasonCode =
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_LAYER_ORDER"
  | "TOOL_CONFLICT"
  | "NON_OVERRIDABLE_OVERRIDE"
  | "SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS";

export interface ResolverCompanyCore {
  missionGuardrails: string;
  governancePrinciples: string;
  tokenDiscipline: string;
  behaviorSeparation: string;
  versionTag?: string;
}

export interface ResolverScopePolicy {
  allowedTargets: string[];
  requestedTargets?: string[];
  forbiddenChanges: string[];
  escalationTrigger?: string;
}

export interface ResolverToolPolicy {
  allowedTools: string[];
  blockedTools: string[];
}

export interface ResolverGovernancePolicy {
  approvalMode: string;
  riskClass: string;
  budgetClass: string;
  stopConditions?: string[];
}

export interface ResolverAuditPolicy {
  decisionTraceRequired: boolean;
  reasonCodes: string[];
}

export interface ResolverGovernanceExecution {
  scope: ResolverScopePolicy;
  tools: ResolverToolPolicy;
  governance: ResolverGovernancePolicy;
  audit: ResolverAuditPolicy;
  notes?: string;
}

export interface ResolverTaskDelta {
  objective: string;
  allowedTargets: string[];
  acceptanceCriteria: string[];
  constraints?: string[];
  deadlineHint?: string;
}

export interface RoleOverrideAttempt {
  approvalMode?: string;
  riskClass?: string;
  budgetClass?: string;
  forbiddenChanges?: string[];
  blockedTools?: string[];
  decisionTraceRequired?: boolean;
}

export interface ResolverRoleAddon {
  roleName: string;
  roleMandate: string;
  roleLimits: string[];
  stylePreferences?: string;
  overrideAttempt?: RoleOverrideAttempt;
}

export interface ResolverSkillRepoDelta {
  relevanceReason: string;
  selectedArtifacts: string[];
  extractWindow?: string;
}

export interface PromptResolverInput {
  layerOrder: ResolverLayerName[];
  companyCore: ResolverCompanyCore;
  governanceExecution: ResolverGovernanceExecution;
  taskDelta: ResolverTaskDelta;
  roleAddon: ResolverRoleAddon;
  skillRepoDelta?: ResolverSkillRepoDelta;
}

export interface PromptResolverOutput {
  resolverDecision: ResolverDecision;
  reasonCodes: ResolverReasonCode[];
  normalizedLayerOrder: ResolverLayerName[];
  validatedAt: string;
}

const REQUIRED_LAYER_ORDER: ResolverLayerName[] = [
  "companyCore",
  "governanceExecution",
  "taskDelta",
  "roleAddon",
];

const FULL_LAYER_ORDER: ResolverLayerName[] = [
  ...REQUIRED_LAYER_ORDER,
  "skillRepoDelta",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString)
  );
}

function layerOrderIsValid(input: PromptResolverInput): boolean {
  const expected = input.skillRepoDelta
    ? FULL_LAYER_ORDER
    : REQUIRED_LAYER_ORDER;
  if (input.layerOrder.length !== expected.length) {
    return false;
  }
  return expected.every((layer, index) => input.layerOrder[index] === layer);
}

function hasRequiredFields(input: PromptResolverInput): boolean {
  return (
    isNonEmptyString(input.companyCore.missionGuardrails) &&
    isNonEmptyString(input.companyCore.governancePrinciples) &&
    isNonEmptyString(input.companyCore.tokenDiscipline) &&
    isNonEmptyString(input.companyCore.behaviorSeparation) &&
    isNonEmptyStringArray(input.governanceExecution.scope.allowedTargets) &&
    isNonEmptyStringArray(input.governanceExecution.scope.forbiddenChanges) &&
    isNonEmptyStringArray(input.governanceExecution.tools.allowedTools) &&
    isNonEmptyStringArray(input.governanceExecution.tools.blockedTools) &&
    isNonEmptyString(input.governanceExecution.governance.approvalMode) &&
    isNonEmptyString(input.governanceExecution.governance.riskClass) &&
    isNonEmptyString(input.governanceExecution.governance.budgetClass) &&
    Array.isArray(input.governanceExecution.audit.reasonCodes) &&
    isNonEmptyString(input.taskDelta.objective) &&
    isNonEmptyStringArray(input.taskDelta.allowedTargets) &&
    isNonEmptyStringArray(input.taskDelta.acceptanceCriteria) &&
    isNonEmptyString(input.roleAddon.roleName) &&
    isNonEmptyString(input.roleAddon.roleMandate) &&
    isNonEmptyStringArray(input.roleAddon.roleLimits) &&
    (!input.skillRepoDelta ||
      (isNonEmptyString(input.skillRepoDelta.relevanceReason) &&
        isNonEmptyStringArray(input.skillRepoDelta.selectedArtifacts)))
  );
}

function hasToolConflict(input: PromptResolverInput): boolean {
  const allowed = new Set(input.governanceExecution.tools.allowedTools);
  return input.governanceExecution.tools.blockedTools.some((tool) =>
    allowed.has(tool),
  );
}

function attemptsNonOverridableOverride(input: PromptResolverInput): boolean {
  const override = input.roleAddon.overrideAttempt;
  if (!override) return false;
  return Boolean(
    override.approvalMode !== undefined ||
      override.riskClass !== undefined ||
      override.budgetClass !== undefined ||
      override.forbiddenChanges !== undefined ||
      override.blockedTools !== undefined ||
      override.decisionTraceRequired !== undefined,
  );
}

function scopeExpandsOutsideAllowedTargets(
  input: PromptResolverInput,
): boolean {
  const requested = input.governanceExecution.scope.requestedTargets;
  if (!requested || requested.length === 0) return false;

  const allowed = new Set([
    ...input.governanceExecution.scope.allowedTargets,
    ...input.taskDelta.allowedTargets,
  ]);
  return requested.some((target) => !allowed.has(target));
}

export function validatePromptResolverInput(
  input: PromptResolverInput,
): PromptResolverOutput {
  const reasonCodes: ResolverReasonCode[] = [];

  if (!hasRequiredFields(input)) {
    reasonCodes.push("MISSING_REQUIRED_FIELD");
  }

  if (!layerOrderIsValid(input)) {
    reasonCodes.push("INVALID_LAYER_ORDER");
  }

  if (hasToolConflict(input)) {
    reasonCodes.push("TOOL_CONFLICT");
  }

  if (attemptsNonOverridableOverride(input)) {
    reasonCodes.push("NON_OVERRIDABLE_OVERRIDE");
  }

  const scopeEscalation = scopeExpandsOutsideAllowedTargets(input);
  if (scopeEscalation) {
    reasonCodes.push("SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS");
  }

  const hasHardFailure = reasonCodes.some(
    (reasonCode) => reasonCode !== "SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS",
  );

  const resolverDecision: ResolverDecision = hasHardFailure
    ? "fail"
    : scopeEscalation
    ? "escalated"
    : "ok";

  return {
    resolverDecision,
    reasonCodes,
    normalizedLayerOrder: [...input.layerOrder],
    validatedAt: new Date().toISOString(),
  };
}
