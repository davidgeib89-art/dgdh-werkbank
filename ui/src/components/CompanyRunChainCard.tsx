import { Link } from "@/lib/router";
import type { CompanyRunChain } from "@paperclipai/shared";
import { StatusBadge } from "./StatusBadge";
import { relativeTime, cn } from "../lib/utils";
import { getRunContextHealth, type CompanyRunActiveIdentity } from "../lib/company-run-truth";

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
  if (!chain.children.length) {
    return null;
  }

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
            {chain.parentIdentifier ?? chain.parentIssueId.slice(0, 8)} · {chain.parentTitle}
          </p>
        </div>
        <StatusBadge status={chain.parentStatus} />
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <TruthCell
          label="Issue"
          value={visibleIssueValue}
          note={visibleIssue.title}
          mono
        />
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
                  {child.identifier ?? child.issueId.slice(0, 8)} · {child.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {child.assigneeAgentName ? `Current assignee: ${child.assigneeAgentName}` : "No assignee"}
                </p>
              </div>
              <StatusBadge status={child.status} />
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
          </div>
        ))}
      </div>
    </section>
  );
}