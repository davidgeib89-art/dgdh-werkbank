import type { CompanyRunChain, CompanyRunChainChild } from "@paperclipai/shared";

// Internal copy of CompanyRunChainParentBlocker to avoid needing it exported from shared
interface BlockerData {
  blockerClass: string | null;
  blockerState: string | null;
  summary: string | null;
  knownBlocker: boolean;
  nextResumePoint: string | null;
  nextWakeStatus: string | null;
  nextWakeNotBefore: Date | null;
  resumeStrategy: string | null;
  resumeSource: string | null;
  resumeRunId: string | null;
  resumeRunStatus: string | null;
  resumeAt: Date | null;
  sameSessionPath: boolean;
}

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

export interface ChildRecoveryTruth {
  type: "stalled_reviewer_wake" | "child_closeout_blocker" | "parent_blocker" | "none";
  title: string;
  description: string;
  blockerDetails: ParentBlockerTruth | null;
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

export function hasRecoverableState(chain: CompanyRunChain | null | undefined): boolean {
  if (!chain) return false;

  // Check for stalled reviewer wake on any child
  const hasStalledReviewerWake = chain.children.some(
    (child) => child.triad.reviewerWakeStatus === "stalled",
  );
  if (hasStalledReviewerWake) return true;

  // Check for child closeout blocker on any child
  const hasChildCloseoutBlocker = chain.children.some(
    (child) => child.triad.closeoutBlocker?.blockerClass,
  );
  if (hasChildCloseoutBlocker) return true;

  // Check for parent blocker
  if (chain.parentBlocker?.blockerClass) return true;

  return false;
}

export function getParentBlockerTruth(
  blocker: CompanyRunChain["parentBlocker"],
): ParentBlockerTruth | null {
  if (!blocker?.blockerClass) return null;

  return formatBlockerTruth(blocker);
}

function formatBlockerTruth(blocker: BlockerData): ParentBlockerTruth {
  const blockerNote = blocker.summary ?? "Execution is blocked before completion.";
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
      value: blocker.blockerClass ?? "unknown",
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

export function getChildRecoveryTruth(
  child: CompanyRunChainChild,
): ChildRecoveryTruth {
  // Check for stalled reviewer wake first (highest priority for operator attention)
  if (child.triad.reviewerWakeStatus === "stalled") {
    return {
      type: "stalled_reviewer_wake",
      title: "Reviewer closeout stalled",
      description: `Reviewer wake for ${child.identifier ?? child.issueId.slice(0, 8)} is stalled and needs recovery-oriented follow-up. The reviewer handoff was not completed within the expected time window.`,
      blockerDetails: null,
    };
  }

  // Check for child closeout blocker
  if (child.triad.closeoutBlocker?.blockerClass) {
    const blockerDetails = formatBlockerTruth(child.triad.closeoutBlocker);
    return {
      type: "child_closeout_blocker",
      title: "Closeout paused",
      description: `Worker closeout is paused with blocker: ${child.triad.closeoutBlocker.blockerClass}. Resume/check procedure is available.`,
      blockerDetails,
    };
  }

  return {
    type: "none",
    title: "",
    description: "",
    blockerDetails: null,
  };
}

export function getRecoveryGuidanceForChain(
  chain: CompanyRunChain,
): ChildRecoveryTruth | null {
  // Find first child with stalled reviewer wake (most actionable)
  const stalledChild = chain.children.find(
    (child) => child.triad.reviewerWakeStatus === "stalled",
  );
  if (stalledChild) {
    return getChildRecoveryTruth(stalledChild);
  }

  // Find first child with closeout blocker
  const blockedChild = chain.children.find(
    (child) => child.triad.closeoutBlocker?.blockerClass,
  );
  if (blockedChild) {
    return getChildRecoveryTruth(blockedChild);
  }

  // Check parent blocker
  if (chain.parentBlocker?.blockerClass) {
    const blockerDetails = getParentBlockerTruth(chain.parentBlocker);
    return {
      type: "parent_blocker",
      title: "Parent execution blocked",
      description: `Parent issue is blocked with ${chain.parentBlocker.blockerClass} before child execution can proceed.`,
      blockerDetails,
    };
  }

  return null;
}

// Reviewer wake status helpers for passive/active state checking
export function isReviewerWakePassive(
  status: CompanyRunChainChild["triad"]["reviewerWakeStatus"],
): boolean {
  return status === "queued" || status === "running" || status === "completed" || status === null;
}

export function isReviewerWakeStalled(
  status: CompanyRunChainChild["triad"]["reviewerWakeStatus"],
): boolean {
  return status === "stalled";
}
