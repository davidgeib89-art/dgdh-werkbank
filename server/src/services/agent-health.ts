export type AgentBudgetStatus =
  | "ok"
  | "soft_cap_approaching"
  | "soft_cap_exceeded"
  | "hard_cap_exceeded"
  | "unknown";

export type AgentHealthStatus =
  | "ok"
  | "running"
  | "warning"
  | "degraded"
  | "critical"
  | "unknown";

export interface AgentHealthEvaluationInput {
  runtimeState: {
    totalInputTokens: number;
    totalCachedInputTokens: number;
    totalOutputTokens: number;
    totalCostCents: number;
  } | null;
  selectedRouting: Record<string, unknown> | null;
  quotaSnapshot: Record<string, unknown> | null;
  lastRunStatus: string | null;
  lastRunErrorCode: string | null;
}

export interface AgentHealthEvaluation {
  healthStatus: AgentHealthStatus;
  budgetStatus: AgentBudgetStatus;
  usedTokens: number | null;
  softCapTokens: number | null;
  hardCapTokens: number | null;
  totalCostCents: number | null;
  lastRunStatus: string | null;
  lastRunErrorCode: string | null;
}

export interface CompanyHealthSummaryInput {
  agentId: string;
  agentName: string;
  healthStatus: AgentHealthStatus;
  budgetStatus: AgentBudgetStatus;
}

export interface CompanyHealthSummary {
  countsByHealthStatus: Record<AgentHealthStatus, number>;
  countsByBudgetStatus: Record<AgentBudgetStatus, number>;
  highestSeverity: AgentHealthStatus;
  atRiskAgents: Array<{
    agentId: string;
    agentName: string;
    healthStatus: AgentHealthStatus;
    budgetStatus: AgentBudgetStatus;
  }>;
}

const HEALTH_SEVERITY_ORDER: AgentHealthStatus[] = [
  "critical",
  "degraded",
  "warning",
  "running",
  "ok",
  "unknown",
];

const HEALTH_SEVERITY_RANK = new Map(
  HEALTH_SEVERITY_ORDER.map((status, idx) => [status, idx]),
);

function parseNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function compareHealthSeverity(
  left: AgentHealthStatus,
  right: AgentHealthStatus,
): number {
  const leftRank = HEALTH_SEVERITY_RANK.get(left) ?? Number.MAX_SAFE_INTEGER;
  const rightRank = HEALTH_SEVERITY_RANK.get(right) ?? Number.MAX_SAFE_INTEGER;
  return leftRank - rightRank;
}

export function evaluateAgentHealth(
  input: AgentHealthEvaluationInput,
): AgentHealthEvaluation {
  const usedTokens = input.runtimeState
    ? input.runtimeState.totalInputTokens +
      input.runtimeState.totalCachedInputTokens +
      input.runtimeState.totalOutputTokens
    : null;
  const softCapTokens =
    parseNumberLike(input.selectedRouting?.softCapTokens) ??
    parseNumberLike(input.quotaSnapshot?.softCapTokens) ??
    null;
  const hardCapTokens =
    parseNumberLike(input.selectedRouting?.hardCapTokens) ??
    parseNumberLike(input.quotaSnapshot?.hardCapTokens) ??
    null;

  const budgetStatus: AgentBudgetStatus =
    usedTokens === null || hardCapTokens === null
      ? "unknown"
      : usedTokens >= hardCapTokens
      ? "hard_cap_exceeded"
      : softCapTokens !== null && usedTokens >= softCapTokens
      ? "soft_cap_exceeded"
      : softCapTokens !== null && usedTokens >= softCapTokens * 0.8
      ? "soft_cap_approaching"
      : "ok";

  const healthStatus: AgentHealthStatus = !input.runtimeState
    ? "unknown"
    : budgetStatus === "hard_cap_exceeded"
    ? "critical"
    : input.lastRunStatus === "queued" || input.lastRunStatus === "running"
    ? "running"
    : input.lastRunStatus === "awaiting_approval"
    ? "warning"
    : budgetStatus === "soft_cap_exceeded" &&
      input.lastRunErrorCode !== null &&
      input.lastRunErrorCode !== "cancelled"
    ? "critical"
    : budgetStatus === "soft_cap_exceeded"
    ? "warning"
    : budgetStatus === "soft_cap_approaching"
    ? "warning"
    : input.lastRunErrorCode !== null && input.lastRunErrorCode !== "cancelled"
    ? "degraded"
    : "ok";

  return {
    healthStatus,
    budgetStatus,
    usedTokens,
    softCapTokens,
    hardCapTokens,
    totalCostCents: input.runtimeState?.totalCostCents ?? null,
    lastRunStatus: input.lastRunStatus,
    lastRunErrorCode: input.lastRunErrorCode,
  };
}

export function buildCompanyHealthSummary(
  agents: CompanyHealthSummaryInput[],
  options?: { atRiskLimit?: number },
): CompanyHealthSummary {
  const countsByHealthStatus: Record<AgentHealthStatus, number> = {
    ok: 0,
    running: 0,
    warning: 0,
    degraded: 0,
    critical: 0,
    unknown: 0,
  };
  const countsByBudgetStatus: Record<AgentBudgetStatus, number> = {
    ok: 0,
    soft_cap_approaching: 0,
    soft_cap_exceeded: 0,
    hard_cap_exceeded: 0,
    unknown: 0,
  };

  for (const agent of agents) {
    countsByHealthStatus[agent.healthStatus] += 1;
    countsByBudgetStatus[agent.budgetStatus] += 1;
  }

  const highestSeverity =
    HEALTH_SEVERITY_ORDER.find((status) => countsByHealthStatus[status] > 0) ??
    "unknown";

  const atRiskLimit = Math.max(1, options?.atRiskLimit ?? 25);
  const atRiskAgents = agents
    .filter(
      (agent) =>
        agent.healthStatus === "critical" ||
        agent.healthStatus === "degraded" ||
        agent.healthStatus === "warning",
    )
    .sort((left, right) => {
      const bySeverity = compareHealthSeverity(
        left.healthStatus,
        right.healthStatus,
      );
      if (bySeverity !== 0) return bySeverity;
      const byName = left.agentName.localeCompare(right.agentName);
      if (byName !== 0) return byName;
      return left.agentId.localeCompare(right.agentId);
    })
    .slice(0, atRiskLimit)
    .map((agent) => ({
      agentId: agent.agentId,
      agentName: agent.agentName,
      healthStatus: agent.healthStatus,
      budgetStatus: agent.budgetStatus,
    }));

  return {
    countsByHealthStatus,
    countsByBudgetStatus,
    highestSeverity,
    atRiskAgents,
  };
}
