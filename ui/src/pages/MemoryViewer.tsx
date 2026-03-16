import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
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
import { MemoryDetailPanel } from "../components/memory/MemoryDetailPanel";
import { MemoryFiltersBar } from "../components/memory/MemoryFiltersBar";
import { MemoryListItem } from "../components/memory/MemoryListItem";
import { ReflectionCandidateCard } from "../components/memory/ReflectionCandidateCard";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Archive, Search, ChevronRight, Loader2 } from "lucide-react";

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
            <ReflectionCandidateCard
              key={`${candidate.suggestedSummary}-${idx}`}
              candidate={candidate}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function MemoryViewer() {
  const navigate = useNavigate();
  const {
    selectedCompanyId,
    companies,
    loading: companiesLoading,
  } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [selectedScope, setSelectedScope] = useState<MemoryScope | "all">(
    "all",
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(
    undefined,
  );
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >(undefined);
  const [selectedKind, setSelectedKind] = useState<MemoryKind | undefined>(
    undefined,
  );
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
      kind: selectedKind ? [selectedKind] : undefined,
      agentId: selectedAgentId,
      projectId: selectedProjectId,
      text: textSearch || undefined,
      page: currentPage,
      pageSize: 25,
      includeArchived,
    }),
    [
      selectedScope,
      selectedKind,
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
      selectedAgentId ?? "none",
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
    if (!companiesLoading && companies.length === 0) {
      return (
        <EmptyState
          icon={Archive}
          message="No company exists yet. Create your first company in onboarding, then open Memory Viewer."
          action="Start onboarding"
          onAction={() => navigate("/onboarding")}
        />
      );
    }

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
  const agentOptions =
    agents?.map((agent) => ({ value: agent.id, label: agent.name })) ?? [];
  const projectOptions =
    projects?.map((project) => ({ value: project.id, label: project.name })) ??
    [];

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
      <MemoryFiltersBar
        textSearch={textSearch}
        selectedKind={selectedKind}
        selectedAgentId={selectedAgentId}
        selectedProjectId={selectedProjectId}
        includeArchived={includeArchived}
        agentOptions={agentOptions}
        projectOptions={projectOptions}
        onTextSearchChange={(value) => {
          setTextSearch(value);
          setCurrentPage(1);
        }}
        onKindChange={(value) => {
          setSelectedKind(value);
          setCurrentPage(1);
        }}
        onAgentChange={(value) => {
          setSelectedAgentId(value);
          setCurrentPage(1);
        }}
        onProjectChange={(value) => {
          setSelectedProjectId(value);
          setCurrentPage(1);
        }}
        onIncludeArchivedChange={(value) => {
          setIncludeArchived(value);
          setCurrentPage(1);
        }}
      />

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
