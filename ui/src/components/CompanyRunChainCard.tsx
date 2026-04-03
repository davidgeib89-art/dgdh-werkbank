import { useQuery } from "@tanstack/react-query";
import type { CompanyRunChain, CloseoutClassification } from "@paperclipai/shared";
import { issuesApi } from "../api/issues";
import {
  getParentBlockerTruth,
  getRunContextHealth,
  type CompanyRunActiveIdentity,
} from "../lib/company-run-truth";
import { queryKeys } from "../lib/queryKeys";
import { relativeTime, cn } from "../lib/utils";
import { Link } from "@/lib/router";
import { StatusBadge } from "./StatusBadge";

type TruthTone = "full" | "degraded";

interface CompanyRunChainCardProps {
  chain: CompanyRunChain;
  currentIssueId: string;
  currentIssueIdentifier: string | null;
  currentIssueTitle: string;
  companyId: string | null;
  companyName: string | null;
  projectId: string | null;
  projectName: string | null;
  activeRun: CompanyRunActiveIdentity | null;
}

interface VisibleIssueIdentity {
  issueId: string;
  identifier: string | null;
  title: string;
}

function humanizeTriadValue(value: string) {
  return value.replace(/_/g, " ");
}

function shortId(value: string | null | undefined): string {
  if (!value) return "unknown";
  return value.slice(0, 8);
}

function findVisibleIssueIdentity(
  chain: CompanyRunChain,
  currentIssueId: string,
  currentIssueIdentifier: string | null,
  currentIssueTitle: string,
  preferredIssueId: string | null,
): VisibleIssueIdentity {
  if (preferredIssueId === chain.parentIssueId) {
    return {
      issueId: chain.parentIssueId,
      identifier: chain.parentIdentifier,
      title: chain.parentTitle,
    };
  }

  if (preferredIssueId) {
    const matchingChild = chain.children.find((child) => child.issueId === preferredIssueId);
    if (matchingChild) {
      return {
        issueId: matchingChild.issueId,
        identifier: matchingChild.identifier,
        title: matchingChild.title,
      };
    }
  }

  return {
    issueId: currentIssueId,
    identifier: currentIssueIdentifier,
    title: currentIssueTitle,
  };
}

function TruthCell({
  label,
  value,
  note,
  mono = false,
  href,
  trailing,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  mono?: boolean;
  href?: string;
  trailing?: React.ReactNode;
  tone?: TruthTone;
}) {
  const toneClassName = tone === "degraded"
    ? "border-amber-500/30 bg-amber-500/10"
    : tone === "full"
      ? "border-emerald-500/25 bg-emerald-500/10"
      : "border-border bg-background/80";

  return (
    <div className={cn("rounded-lg border p-3", toneClassName)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          {href ? (
            <Link
              to={href}
              className={cn("text-sm font-medium hover:underline", mono && "font-mono text-xs")}
              title={value}
            >
              {value}
            </Link>
          ) : (
            <p className={cn("text-sm font-medium", mono && "font-mono text-xs")} title={value}>
              {value}
            </p>
          )}
        </div>
        {trailing}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function CloseoutBadge({ classification }: { classification: CloseoutClassification }) {
  const config: Record<CloseoutClassification, { label: string; className: string }> = {
    clean: {
      label: "clean",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    local: {
      label: "local",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    parked: {
      label: "parked",
      className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    },
    blocked: {
      label: "blocked",
      className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    },
    unknown: {
      label: "unknown",
      className: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    },
  };

  const { label, className } = config[classification];

  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", className)}>
      {label}
    </span>
  );
}

export function CompanyRunChainCard({
  chain,
  currentIssueId,
  currentIssueIdentifier,
  currentIssueTitle,
  companyId,
  companyName,
  projectId,
  projectName,
  activeRun,
}: CompanyRunChainCardProps) {
  const parentBlockerTruth = getParentBlockerTruth(chain.parentBlocker);

  const { data: closeoutTruth } = useQuery({
    queryKey: queryKeys.issues.closeoutTruth(currentIssueId),
    queryFn: () => issuesApi.getCloseoutTruth(currentIssueId),
    staleTime: 30_000,
  });

  const highlightedIssueId = chain.focusIssueId ?? activeRun?.issueId ?? null;
  const visibleIssue = findVisibleIssueIdentity(
    chain,
    currentIssueId,
    currentIssueIdentifier,
    currentIssueTitle,
    activeRun?.issueId ?? highlightedIssueId,
  );
  const contextHealth = getRunContextHealth({
    activeRun,
    companyId,
    projectId,
    issueId: visibleIssue.issueId,
    issueIdentifier: visibleIssue.identifier,
  });
  const projectValue = projectName ?? (projectId ? shortId(projectId) : "Missing project");
  const companyValue = companyName ?? (companyId ? shortId(companyId) : "Missing company");
  const visibleIssueValue = visibleIssue.identifier ?? shortId(visibleIssue.issueId);
  const activeRunIssueNote = activeRun
    ? `Tracking ${visibleIssue.identifier ?? shortId(visibleIssue.issueId)}.`
    : "No run is active for this chain right now.";

  return (
    <section className="rounded-xl border border-border bg-accent/10 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium">Company run chain</p>
          <p className="text-xs text-muted-foreground">
            {chain.parentIdentifier ?? chain.parentIssueId.slice(0, 8)} - {chain.parentTitle}
          </p>
        </div>
        <StatusBadge status={chain.parentStatus} />
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <TruthCell label="Issue" value={visibleIssueValue} note={visibleIssue.title} mono />
        <TruthCell
          label="Company"
          value={companyValue}
          note={companyId ? shortId(companyId) : "No company id"}
        />
        <TruthCell
          label="Project"
          value={projectValue}
          note={projectId ? shortId(projectId) : "No project id"}
        />
        <TruthCell
          label="Active run"
          value={activeRun ? shortId(activeRun.id) : "No active run"}
          note={activeRunIssueNote}
          mono
          href={activeRun ? `/agents/${activeRun.agentId}/runs/${activeRun.id}` : undefined}
          trailing={activeRun ? <StatusBadge status={activeRun.status} /> : undefined}
        />
        <TruthCell
          label="Context"
          value={contextHealth.label}
          note={contextHealth.note}
          tone={contextHealth.tone}
        />
      </div>

      {closeoutTruth && (
        <div className="rounded-lg border border-border bg-background/80 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Closeout status</p>
              <CloseoutBadge classification={closeoutTruth.classification} />
            </div>
          </div>

          {closeoutTruth.reasons.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Reasons:</p>
              <ul className="text-xs space-y-0.5">
                {closeoutTruth.reasons.map((reason, index) => (
                  <li key={index} className="text-foreground">- {reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-3 text-xs">
            {closeoutTruth.validationState.pending > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {closeoutTruth.validationState.pending}
                </span>
                <span className="text-muted-foreground">pending validation</span>
              </div>
            )}
            {closeoutTruth.featureState.pending > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {closeoutTruth.featureState.pending}
                </span>
                <span className="text-muted-foreground">pending feature</span>
              </div>
            )}
            {closeoutTruth.gitStatus.uncommittedChanges && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-red-600 dark:text-red-400">uncommitted</span>
                <span className="text-muted-foreground">git changes</span>
              </div>
            )}
          </div>
        </div>
      )}

      {parentBlockerTruth && (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <TruthCell
            label="Parent blocker"
            value={parentBlockerTruth.blocker.value}
            note={parentBlockerTruth.blocker.note}
            mono
            tone="degraded"
          />
          <TruthCell
            label="Blocker state"
            value={parentBlockerTruth.state.value}
            note={parentBlockerTruth.state.note}
            mono
          />
          <TruthCell
            label="Resume"
            value={parentBlockerTruth.resume.value}
            note={parentBlockerTruth.resume.note}
          />
          <TruthCell
            label="Next point"
            value={parentBlockerTruth.nextPoint.value}
            note={parentBlockerTruth.nextPoint.note}
            mono
          />
        </div>
      )}

      {chain.children.length > 0 && (
        <div className="space-y-2">
          {chain.children.map((child) => (
            <div
              key={child.issueId}
              className={cn(
                "rounded-lg border border-border bg-background/80 p-3 space-y-2",
                highlightedIssueId === child.issueId && "border-foreground/40",
              )}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Link
                    to={`/issues/${child.identifier ?? child.issueId}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {child.identifier ?? child.issueId.slice(0, 8)} - {child.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {child.assigneeAgentName ? `Current assignee: ${child.assigneeAgentName}` : "No assignee"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium capitalize text-sky-700 dark:text-sky-300">
                    {humanizeTriadValue(child.triad.state)}
                  </span>
                  <StatusBadge status={child.status} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {child.stages.map((stage) => (
                  <div
                    key={stage.key}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] leading-4",
                      stage.completed
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-border bg-background text-muted-foreground",
                    )}
                    title={stage.note ?? undefined}
                  >
                    <span className="font-medium">{stage.label}</span>
                    {stage.at && <span className="ml-1 text-[10px] opacity-80">{relativeTime(stage.at)}</span>}
                    {!stage.at && <span className="ml-1 text-[10px] opacity-70">pending</span>}
                  </div>
                ))}
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <TruthCell
                  label="CEO cut"
                  value={humanizeTriadValue(child.triad.ceoCut.ceoCutStatus)}
                  note={`worker ${child.triad.ceoCut.workerPacket.source} - reviewer ${child.triad.ceoCut.reviewerPacket.source}`}
                />
                <TruthCell
                  label="Worker"
                  value={humanizeTriadValue(child.triad.workerExecution.status)}
                  note={child.triad.workerExecution.branch ?? child.triad.workerExecution.prUrl ?? "No worker handoff yet."}
                  mono={Boolean(child.triad.workerExecution.branch || child.triad.workerExecution.prUrl)}
                />
                <TruthCell
                  label="Reviewer"
                  value={child.triad.reviewerVerdict.verdict ?? "pending"}
                  note={child.triad.reviewerVerdict.next ?? child.triad.reviewerVerdict.doneWhenCheck ?? "No reviewer verdict recorded yet."}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
