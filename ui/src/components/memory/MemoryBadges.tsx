import type { MemoryKind, MemoryScope } from "@paperclipai/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SCOPE_COLORS: Record<MemoryScope, string> = {
  personal: "bg-blue-100 text-blue-800",
  company: "bg-purple-100 text-purple-800",
  project: "bg-green-100 text-green-800",
  social: "bg-orange-100 text-orange-800",
};

export function ScopeBadge({ scope }: { scope: MemoryScope }) {
  return (
    <Badge className={cn("font-semibold", SCOPE_COLORS[scope])}>{scope}</Badge>
  );
}

export function KindBadge({ kind }: { kind: MemoryKind }) {
  return (
    <Badge variant="outline" className="text-xs">
      {kind}
    </Badge>
  );
}

export function ApprovalStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: "bg-green-100 text-green-800",
    pending_review: "bg-yellow-100 text-yellow-800",
    rejected: "bg-red-100 text-red-800",
    draft: "bg-gray-100 text-gray-800",
  };

  return (
    <Badge className={cn("text-xs", colors[status] ?? colors.draft)}>
      {status}
    </Badge>
  );
}
