import type { CompanyRunChain } from "@paperclipai/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.js";
import { AlertTriangle, Info, PlayCircle } from "lucide-react";
import { getRecoveryGuidanceForChain, hasRecoverableState } from "../lib/company-run-truth.js";

interface RecoveryGuidanceCardProps {
  chain: CompanyRunChain;
}

export function RecoveryGuidanceCard({ chain }: RecoveryGuidanceCardProps) {
  // Don't render if there's no recoverable state
  if (!hasRecoverableState(chain)) {
    return null;
  }

  const guidance = getRecoveryGuidanceForChain(chain);
  if (!guidance || guidance.type === "none") {
    return null;
  }

  const iconByType = {
    stalled_reviewer_wake: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    child_closeout_blocker: <Info className="h-5 w-5 text-blue-500" />,
    parent_blocker: <PlayCircle className="h-5 w-5 text-emerald-500" />,
    none: null,
  };

  const variantByType = {
    stalled_reviewer_wake: "border-amber-500/30 bg-amber-500/10",
    child_closeout_blocker: "border-blue-500/30 bg-blue-500/10",
    parent_blocker: "border-emerald-500/30 bg-emerald-500/10",
    none: "",
  };

  return (
    <Card className={variantByType[guidance.type]}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {iconByType[guidance.type]}
          Recovery guidance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{guidance.title}</p>
          <p className="text-xs text-muted-foreground">{guidance.description}</p>
        </div>

        {guidance.blockerDetails && (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 text-xs">
            <div className="space-y-1">
              <p className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Blocker</p>
              <p className="font-mono">{guidance.blockerDetails.blocker.value}</p>
              <p className="text-muted-foreground">{guidance.blockerDetails.blocker.note}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">State</p>
              <p className="font-mono">{guidance.blockerDetails.state.value}</p>
              <p className="text-muted-foreground">{guidance.blockerDetails.state.note}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Resume</p>
              <p>{guidance.blockerDetails.resume.value}</p>
              <p className="text-muted-foreground">{guidance.blockerDetails.resume.note}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Next point</p>
              <p className="font-mono">{guidance.blockerDetails.nextPoint.value}</p>
              <p className="text-muted-foreground">{guidance.blockerDetails.nextPoint.note}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
