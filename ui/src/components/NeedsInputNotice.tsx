import { AlertTriangle, MessageSquare, PencilLine } from "lucide-react";
import type { NeedsInputLine } from "../lib/issueNeedsInput";

interface NeedsInputNoticeProps {
  lines: NeedsInputLine[];
  onEditDescription: () => void;
  onAddComment?: () => void;
}

export function NeedsInputNotice({
  lines,
  onEditDescription,
  onAddComment,
}: NeedsInputNoticeProps) {
  if (lines.length === 0) return null;

  return (
    <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Needs Input
            </span>
            <span className="text-xs font-medium text-amber-800/80 dark:text-amber-200/80">
              Not worker-ready
            </span>
          </div>
          <p className="text-sm text-amber-950/80 dark:text-amber-100/85">
            Dieses Packet braucht noch Input, bevor ein Worker starten sollte.
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

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-900/70 dark:text-amber-200/70">
          Open Questions In Description
        </p>
        <ul className="space-y-2">
          {lines.map((line) => (
            <li key={`${line.lineNumber}:${line.text}`} className="rounded-md border border-amber-500/20 bg-background/60 px-3 py-2">
              <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                Line {line.lineNumber}
              </div>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-foreground">
                {line.text}
              </pre>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
