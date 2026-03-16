import type { MemoryKind } from "@paperclipai/shared";
import { MEMORY_KINDS } from "@paperclipai/shared";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ANY_KIND = "__any_kind__";
const ANY_AGENT = "__any_agent__";
const ANY_PROJECT = "__any_project__";

interface SelectOption {
  value: string;
  label: string;
}

interface MemoryFiltersBarProps {
  textSearch: string;
  selectedKind?: MemoryKind;
  selectedAgentId?: string;
  selectedProjectId?: string;
  includeArchived: boolean;
  agentOptions: SelectOption[];
  projectOptions: SelectOption[];
  onTextSearchChange: (value: string) => void;
  onKindChange: (value: MemoryKind | undefined) => void;
  onAgentChange: (value: string | undefined) => void;
  onProjectChange: (value: string | undefined) => void;
  onIncludeArchivedChange: (value: boolean) => void;
}

export function MemoryFiltersBar({
  textSearch,
  selectedKind,
  selectedAgentId,
  selectedProjectId,
  includeArchived,
  agentOptions,
  projectOptions,
  onTextSearchChange,
  onKindChange,
  onAgentChange,
  onProjectChange,
  onIncludeArchivedChange,
}: MemoryFiltersBarProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search text..."
              value={textSearch}
              onChange={(e) => onTextSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={selectedKind ?? ANY_KIND}
            onValueChange={(value) =>
              onKindChange(
                value === ANY_KIND ? undefined : (value as MemoryKind),
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Kind" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_KIND}>All kinds</SelectItem>
              {MEMORY_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {kind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedAgentId ?? ANY_AGENT}
            onValueChange={(value) =>
              onAgentChange(value === ANY_AGENT ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_AGENT}>All agents</SelectItem>
              {agentOptions.map((agent) => (
                <SelectItem key={agent.value} value={agent.value}>
                  {agent.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedProjectId ?? ANY_PROJECT}
            onValueChange={(value) =>
              onProjectChange(value === ANY_PROJECT ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_PROJECT}>All projects</SelectItem>
              {projectOptions.map((project) => (
                <SelectItem key={project.value} value={project.value}>
                  {project.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="include-archived"
            checked={includeArchived}
            onChange={(e) => onIncludeArchivedChange(e.target.checked)}
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
  );
}
