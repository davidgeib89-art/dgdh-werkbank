import type { ReflectionReport } from "@paperclipai/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ReflectionCandidateCardProps {
  candidate: ReflectionReport["candidates"][number];
}

export function ReflectionCandidateCard({
  candidate,
}: ReflectionCandidateCardProps) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-4">
        <p className="font-medium text-sm mb-1">{candidate.suggestedSummary}</p>
        <p className="text-xs text-muted-foreground mb-2">
          {candidate.suggestedDetail}
        </p>
        <div className="flex flex-wrap gap-1">
          {candidate.sourceEpisodeIds.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              Sources: {candidate.sourceEpisodeIds.length}
            </Badge>
          )}
          {candidate.sourceEpisodeIds.map((id) => (
            <Badge
              key={id}
              variant="outline"
              className="text-xs font-mono text-xxs"
            >
              {id.slice(0, 8)}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
