import { Button } from "@/components/ui/button";
import type { MemoryItemGoverned } from "@paperclipai/shared";

interface GovernanceActionButtonsProps {
  item: MemoryItemGoverned;
  disabled?: boolean;
  onApprove?: (item: MemoryItemGoverned) => void;
  onReject?: (item: MemoryItemGoverned) => void;
  onArchive?: (item: MemoryItemGoverned) => void;
}

export function GovernanceActionButtons({
  item,
  disabled = false,
  onApprove,
  onReject,
  onArchive,
}: GovernanceActionButtonsProps) {
  if (!onApprove && !onReject && !onArchive) {
    return null;
  }

  const canReview = item.approvalStatus === "pending_review";
  const canArchive = !item.archivedAt;

  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t">
      {onApprove && canReview && (
        <Button size="sm" onClick={() => onApprove(item)} disabled={disabled}>
          Approve
        </Button>
      )}
      {onReject && canReview && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReject(item)}
          disabled={disabled}
        >
          Reject
        </Button>
      )}
      {onArchive && canArchive && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onArchive(item)}
          disabled={disabled}
        >
          Archive
        </Button>
      )}
    </div>
  );
}
