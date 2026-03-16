import type { MemoryItemGoverned } from "@paperclipai/shared";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalStatusBadge, KindBadge, ScopeBadge } from "./MemoryBadges";

interface MemoryListItemProps {
  item: MemoryItemGoverned;
  isSelected: boolean;
  onSelect: (item: MemoryItemGoverned) => void;
}

export function MemoryListItem({
  item,
  isSelected,
  onSelect,
}: MemoryListItemProps) {
  return (
    <div
      onClick={() => onSelect(item)}
      className={cn(
        "p-3 border rounded-lg cursor-pointer transition-colors",
        isSelected
          ? "bg-primary/10 border-primary"
          : "border-border hover:bg-muted",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.summary}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <ScopeBadge scope={item.scope} />
            <KindBadge kind={item.kind} />
            <ApprovalStatusBadge status={item.approvalStatus} />
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}
