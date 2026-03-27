import type { IssueExecutionPacketTruth } from "@paperclipai/shared";
import { AlertTriangle, CheckCircle2, MessageSquare, PencilLine } from "lucide-react";

interface ExecutionPacketReadinessCardProps {
  truth: IssueExecutionPacketTruth;
  onEditDescription: () => void;
  onAddComment?: () => void;
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/70 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-all font-mono text-xs text-foreground">{value}</div>
    </div>
  );
}

export function ExecutionPacketReadinessCard({
  truth,
  onEditDescription,
  onAddComment,
}: ExecutionPacketReadinessCardProps) {
  if (truth.status === "not_applicable") return null;

  const isReady = truth.status === "ready";

  return (
    <section
      className={isReady
        ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3"
        : "rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={isReady
                ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                : "inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300"}
            >
              {isReady ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              Execution Packet {isReady ? "Ready" : "Not Ready"}
            </span>
            <span className="text-xs font-medium text-foreground/75">
              {isReady ? "Machine-clear before handoff" : "Missing packet truth before handoff"}
            </span>
          </div>
          <p className="text-sm text-foreground/85">
            {isReady
              ? "The packet carries the scope and completion truth the run needs before child creation."
              : "This execution-heavy issue is not machine-clear enough yet. Fix the missing packet truth before assigning or rerunning the packet."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEditDescription}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Edit issue
          </button>
          {onAddComment ? (
            <button
              type="button"
              onClick={onAddComment}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Add comment
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <FieldRow label="target file" value={truth.targetFile ?? "none"} />
        <FieldRow label="target folder" value={truth.targetFolder ?? "none"} />
        <FieldRow label="artifact kind" value={truth.artifactKind ?? "none"} />
        <FieldRow label="doneWhen" value={truth.doneWhen ?? "none"} />
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <FieldRow label="execution intent" value={truth.executionIntent ?? "none"} />
        <FieldRow label="packet type" value={truth.packetType ?? "none"} />
        <FieldRow label="review policy" value={truth.reviewPolicy ?? "none"} />
        <FieldRow label="scope mode" value={truth.scopeMode} />
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <FieldRow label="CEO cut" value={truth.triad.ceoCutStatus} />
        <FieldRow
          label="worker packet"
          value={truth.triad.workerPacket.goal ?? truth.triad.workerPacket.doneWhen ?? "none"}
        />
        <FieldRow
          label="reviewer packet"
          value={truth.triad.reviewerPacket.focus ?? truth.triad.reviewerPacket.acceptWhen ?? "none"}
        />
      </div>

      {!isReady && truth.reasonCodes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-900/70 dark:text-amber-200/70">
            Reason Codes
          </p>
          <div className="flex flex-wrap gap-2">
            {truth.reasonCodes.map((reasonCode) => (
              <span
                key={reasonCode}
                className="inline-flex items-center rounded-full border border-amber-500/30 bg-background/70 px-2.5 py-1 font-mono text-[11px] text-amber-900 dark:text-amber-100"
              >
                {reasonCode}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}