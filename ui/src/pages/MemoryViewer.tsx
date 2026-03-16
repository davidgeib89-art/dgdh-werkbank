import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  MemoryScope,
  MemoryKind,
  MemoryViewerFilter,
  MemoryItemGoverned,
  ReflectionReport,
  RunReflectionInput,
} from "@paperclipai/shared";
import { MEMORY_SCOPES, MEMORY_KINDS } from "@paperclipai/shared";
import { memoryApi } from "../api/memory";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Archive, Search, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

const SCOPE_COLORS: Record<MemoryScope, string> = {
  personal: "bg-blue-100 text-blue-800",
  company: "bg-purple-100 text-purple-800",
  project: "bg-green-100 text-green-800",
  social: "bg-orange-100 text-orange-800",
};

function ScopeBadge({ scope }: { scope: MemoryScope }) {
  return (
    <Badge className={cn("font-semibold", SCOPE_COLORS[scope])}>{scope}</Badge>
  );
}

function KindBadge({ kind }: { kind: MemoryKind }) {
  return (
    <Badge variant="outline" className="text-xs">
      {kind}
    </Badge>
  );
}

function ApprovalStatusBadge({ status }: { status: string }) {
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

function MemoryListItem({
  item,
  isSelected,
  onSelect,
}: {
  item: MemoryItemGoverned;
  isSelected: boolean;
  onSelect: (item: MemoryItemGoverned) => void;
}) {
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

interface DetailPanelProps {
  item: MemoryItemGoverned;
}

function MemoryDetailPanel({ item }: DetailPanelProps) {
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
      </CardContent>
    </Card>
  );
}

interface ReflectionPanelProps {
  companyId: string;
  agentId: string;
  projectId?: string;
  report: ReflectionReport | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}

function ReflectionPanel({
  report,
  isLoading,
  onRefresh,
}: ReflectionPanelProps) {
  if (!report && !isLoading) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Reflection Candidates</CardTitle>
          <CardDescription>
            Run reflection to see proposed memories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Run Reflection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Reflection Candidates</CardTitle>
          <Button
            onClick={onRefresh}
            variant="ghost"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
        {report && (
          <CardDescription>
            Found {report.candidates.length} candidate(s)
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : report?.candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No candidates found</p>
        ) : (
          report?.candidates.map((candidate, idx) => (
            <Card key={idx} className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="font-medium text-sm mb-1">
                  {candidate.suggestedSummary}
                </p>
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
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function MemoryViewer() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [selectedScope, setSelectedScope] = useState<MemoryScope | "all">(
    "all",
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedKinds, setSelectedKinds] = useState<MemoryKind[]>([]);
  const [textSearch, setTextSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMemory, setSelectedMemory] =
    useState<MemoryItemGoverned | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Reflection state
  const [showReflection, setShowReflection] = useState(false);

  // Prepare filter object
  const filter: MemoryViewerFilter = useMemo(
    () => ({
      scope: selectedScope === "all" ? undefined : [selectedScope],
      kind: selectedKinds.length > 0 ? selectedKinds : undefined,
      agentId: selectedAgentId || undefined,
      projectId: selectedProjectId || undefined,
      text: textSearch || undefined,
      page: currentPage,
      pageSize: 25,
      includeArchived,
    }),
    [
      selectedScope,
      selectedKinds,
      selectedAgentId,
      selectedProjectId,
      textSearch,
      currentPage,
      includeArchived,
    ],
  );

  // Breadcrumbs
  useEffect(() => {
    setBreadcrumbs([{ label: "Memory Viewer" }]);
  }, [setBreadcrumbs]);

  // Fetch data
  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: viewer, isLoading: viewerLoading } = useQuery({
    queryKey: queryKeys.memory.viewerList(
      selectedCompanyId!,
      filter.scope,
      filter.kind,
      filter.agentId,
      filter.projectId,
      filter.text,
      filter.page,
    ),
    queryFn: () => memoryApi.listViewer(selectedCompanyId!, filter),
    enabled: !!selectedCompanyId,
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.memory.viewerStats(selectedCompanyId!),
    queryFn: () => memoryApi.getViewerStats(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const {
    data: reflectionReport,
    isLoading: reflectionLoading,
    refetch: refetchReflection,
  } = useQuery({
    queryKey: queryKeys.memory.reflectionReport(
      selectedCompanyId!,
      selectedAgentId,
    ),
    queryFn: async () => {
      if (!selectedAgentId) return undefined;
      const input: RunReflectionInput = {
        agentId: selectedAgentId,
        projectId: selectedProjectId || undefined,
        lookbackDays: 1,
      };
      return memoryApi.runReflection(selectedCompanyId!, input);
    },
    enabled: !!selectedCompanyId && !!selectedAgentId && showReflection,
  });

  if (!selectedCompanyId) {
    return (
      <EmptyState icon={Search} message="Select a company to view memory." />
    );
  }

  const scopeTabs: Array<{ value: MemoryScope | "all"; label: string }> = [
    { value: "all", label: "All" },
    ...MEMORY_SCOPES.map((scope) => ({
      value: scope,
      label: scope.charAt(0).toUpperCase() + scope.slice(1),
    })),
  ];

  const displayItems = viewer?.items || [];
  const totalPages = viewer?.totalPages || 1;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Memory Viewer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inspect, filter, and manage company memories. Current count:{" "}
          {stats?.totalActive ?? 0} active, {stats?.totalArchived ?? 0} archived
        </p>
      </div>

      {/* Scope Tabs */}
      <div className="flex flex-wrap gap-2">
        {scopeTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={selectedScope === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedScope(tab.value);
              setCurrentPage(1);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Text search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search text..."
                value={textSearch}
                onChange={(e) => {
                  setTextSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Kind filter */}
            <Select
              value={selectedKinds.length === 1 ? selectedKinds[0] : ""}
              onValueChange={(val) => {
                setSelectedKinds(val ? [val as MemoryKind] : []);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All kinds</SelectItem>
                {MEMORY_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {kind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Agent filter */}
            <Select
              value={selectedAgentId}
              onValueChange={(val) => {
                setSelectedAgentId(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All agents</SelectItem>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Project filter */}
            <Select
              value={selectedProjectId}
              onValueChange={(val) => {
                setSelectedProjectId(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All projects</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Archive toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="include-archived"
              checked={includeArchived}
              onChange={(e) => {
                setIncludeArchived(e.target.checked);
                setCurrentPage(1);
              }}
              className="w-4 h-4 rounded border-border"
            />
            <label
              htmlFor="include-archived"
              className="text-sm font-medium cursor-pointer"
            >
              Include archived
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Main content: List + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Memory list */}
        <div className="lg:col-span-2 space-y-3">
          {viewerLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : displayItems.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">
                  No memories found
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {displayItems.map((item) => (
                  <MemoryListItem
                    key={item.id}
                    item={item}
                    isSelected={selectedMemory?.id === item.id}
                    onSelect={setSelectedMemory}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail panel + reflection */}
        <div className="space-y-3">
          {selectedMemory ? (
            <>
              <MemoryDetailPanel item={selectedMemory} />

              {/* Reflection section only shows if agent is selected */}
              {selectedAgentId && (
                <ReflectionPanel
                  companyId={selectedCompanyId}
                  agentId={selectedAgentId}
                  projectId={selectedProjectId}
                  report={reflectionReport}
                  isLoading={reflectionLoading}
                  onRefresh={() => {
                    setShowReflection(true);
                    refetchReflection();
                  }}
                />
              )}
            </>
          ) : (
            <>
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">
                    Select a memory to view details
                  </p>
                </CardContent>
              </Card>

              {/* Reflection section */}
              {selectedAgentId && (
                <ReflectionPanel
                  companyId={selectedCompanyId}
                  agentId={selectedAgentId}
                  projectId={selectedProjectId}
                  report={reflectionReport}
                  isLoading={reflectionLoading}
                  onRefresh={() => {
                    setShowReflection(true);
                    refetchReflection();
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
