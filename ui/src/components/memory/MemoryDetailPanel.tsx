import type { MemoryItemGoverned } from "@paperclipai/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovalStatusBadge, KindBadge, ScopeBadge } from "./MemoryBadges";
import { GovernanceActionButtons } from "./GovernanceActionButtons";

interface MemoryDetailPanelProps {
  item: MemoryItemGoverned;
  onApprove?: (item: MemoryItemGoverned) => void;
  onReject?: (item: MemoryItemGoverned) => void;
  onArchive?: (item: MemoryItemGoverned) => void;
  actionsDisabled?: boolean;
}

export function MemoryDetailPanel({
  item,
  onApprove,
  onReject,
  onArchive,
  actionsDisabled,
}: MemoryDetailPanelProps) {
  return (
    <Card
      className="border-l-4"
      style={{
        borderLeftColor: item.archivedAt ? "#888" : "#2563eb",
      }}
    >
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className="text-lg">{item.summary}</CardTitle>
          <div className="flex flex-wrap gap-1">
            <ScopeBadge scope={item.scope} />
            <KindBadge kind={item.kind} />
            <ApprovalStatusBadge status={item.approvalStatus} />
            {item.archivedAt && (
              <Badge variant="destructive" className="text-xs">
                archived
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            Detail
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {item.detail}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Importance
            </p>
            <p className="text-sm font-medium">{item.importance}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Confidence
            </p>
            <p className="text-sm font-medium">{item.confidence}</p>
          </div>
        </div>

        {item.tags && item.tags.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Tags
            </p>
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
          <p>Created: {new Date(item.createdAt).toLocaleString()}</p>
          {item.approvalStatus === "approved" && item.approvedAt && (
            <p>
              Approved: {new Date(item.approvedAt).toLocaleString()} by{" "}
              {item.approvedBy}
            </p>
          )}
          {item.archivedAt && (
            <p>Archived: {new Date(item.archivedAt).toLocaleString()}</p>
          )}
        </div>

        <GovernanceActionButtons
          item={item}
          onApprove={onApprove}
          onReject={onReject}
          onArchive={onArchive}
          disabled={actionsDisabled}
        />
      </CardContent>
    </Card>
  );
}
