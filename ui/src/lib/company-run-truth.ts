import type { CompanyRunChain } from "@paperclipai/shared";

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

export interface ParentBlockerTruth {
  blocker: {
    value: string;
    note: string;
  };
  state: {
    value: string;
    note: string;
  };
  resume: {
    value: string;
    note: string;
  };
  nextPoint: {
    value: string;
    note: string;
  };
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

export function hasVisibleCompanyRunChainTruth(
  chain: CompanyRunChain | null | undefined,
): chain is CompanyRunChain {
  if (!chain) return false;
  return chain.children.length > 0 || Boolean(chain.parentBlocker?.blockerClass);
}

export function getParentBlockerTruth(
  blocker: CompanyRunChain["parentBlocker"],
): ParentBlockerTruth | null {
  if (!blocker?.blockerClass) return null;

  const blockerNote = blocker.summary ?? "Parent is blocked before child execution.";
  const stateNote = blocker.knownBlocker
    ? "Known blocker class. David does not need to rediscover it."
    : "Blocker exists but is not yet classified as known.";
  const resumeNote = blocker.resumeRunId
    ? blocker.sameSessionPath
      ? `${blocker.resumeSource ?? "Resume"} queued ${blocker.resumeRunId.slice(0, 8)} on the same CEO session path${blocker.resumeRunStatus ? ` (${blocker.resumeRunStatus})` : ""}.`
      : `${blocker.resumeSource ?? "Resume"} queued ${blocker.resumeRunId.slice(0, 8)} but same-session proof is missing.`
    : blocker.nextWakeNotBefore
      ? `Resume via ${blocker.resumeSource ?? "scheduler"} after ${blocker.nextWakeNotBefore}.`
      : "No resume wake has been recorded yet.";
  const nextPointNote = blocker.nextWakeStatus
    ? `Next wake status: ${blocker.nextWakeStatus}`
    : "No next wake status recorded.";

  return {
    blocker: {
      value: blocker.blockerClass,
      note: blockerNote,
    },
    state: {
      value: blocker.blockerState ?? "unknown",
      note: stateNote,
    },
    resume: {
      value: blocker.resumeRunId
        ? blocker.sameSessionPath
          ? "Scheduler resumed"
          : "Resume queued"
        : blocker.nextWakeNotBefore
          ? "Scheduler cooldown"
          : "No resume scheduled",
      note: resumeNote,
    },
    nextPoint: {
      value: blocker.nextResumePoint ?? "unknown",
      note: nextPointNote,
    },
  };
}
