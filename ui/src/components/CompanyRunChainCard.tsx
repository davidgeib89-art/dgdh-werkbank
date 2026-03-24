import { Link } from "@/lib/router";
import type { CompanyRunChain } from "@paperclipai/shared";
import { StatusBadge } from "./StatusBadge";
import { relativeTime, cn } from "../lib/utils";

export function CompanyRunChainCard({
  chain,
}: {
  chain: CompanyRunChain;
}) {
  if (!chain.children.length) {
    return null;
  }

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

      <div className="space-y-2">
        {chain.children.map((child) => (
          <div
            key={child.issueId}
            className={cn(
              "rounded-lg border border-border bg-background/80 p-3 space-y-2",
              chain.focusIssueId === child.issueId && "border-foreground/40",
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