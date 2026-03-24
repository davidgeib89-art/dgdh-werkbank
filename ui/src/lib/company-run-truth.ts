export interface CompanyRunActiveIdentity {
  id: string;
  status: string;
  agentId: string;
  issueId: string | null;
  contextSnapshot: Record<string, unknown> | null;
}

type TruthTone = "full" | "degraded";

export interface RunContextHealth {
  label: string;
  note: string;
  tone: TruthTone;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function getRunContextHealth(input: {
  activeRun: CompanyRunActiveIdentity | null;
  companyId: string | null;
  projectId: string | null;
  issueId: string;
  issueIdentifier: string | null;
}): RunContextHealth {
  const missing: string[] = [];

  if (!input.companyId) missing.push("company");
  if (!input.projectId) missing.push("project");
  if (!input.issueIdentifier) missing.push("issue identifier");

  const runContext = asRecord(input.activeRun?.contextSnapshot);
  if (input.activeRun) {
    const runCompanyId = typeof runContext?.companyId === "string" ? runContext.companyId : null;
    const runProjectId = typeof runContext?.projectId === "string" ? runContext.projectId : null;
    const runIssueId = typeof runContext?.issueId === "string" ? runContext.issueId : null;
    const runIssueIdentifier = typeof runContext?.issueIdentifier === "string"
      ? runContext.issueIdentifier
      : null;

    if (!runCompanyId) {
      missing.push("run company");
    } else if (input.companyId && runCompanyId !== input.companyId) {
      missing.push("company mismatch");
    }

    if (!runProjectId) {
      missing.push("run project");
    } else if (input.projectId && runProjectId !== input.projectId) {
      missing.push("project mismatch");
    }

    if (!runIssueId) {
      missing.push("run issue");
    } else if (runIssueId !== input.issueId) {
      missing.push("issue mismatch");
    }

    if (!runIssueIdentifier) {
      missing.push("run identifier");
    } else if (input.issueIdentifier && runIssueIdentifier !== input.issueIdentifier) {
      missing.push("identifier mismatch");
    }
  }

  if (missing.length === 0) {
    return {
      label: "Full",
      note: input.activeRun
        ? "Run snapshot matches the visible issue, company, and project."
        : "Visible issue, company, and project identity is complete.",
      tone: "full",
    };
  }

  return {
    label: "Degraded",
    note: `Missing or mismatched: ${missing.join(", ")}`,
    tone: "degraded",
  };
}