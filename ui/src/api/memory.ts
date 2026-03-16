import type {
  MemoryItemGoverned,
  MemoryViewerPage,
  MemoryGovernanceStats,
  MemoryViewerFilter,
  ReflectionReport,
  RunReflectionInput,
} from "@paperclipai/shared";
import { client } from "./client";

const BASE_URL = "companies";

/**
 * Memory API client for the viewer and governance endpoints.
 * Supports read-only operations (list, stats, reflection preview).
 * Write operations (approve, reject, correct, etc.) are in Phase 2.
 */
export const memoryApi = {
  /**
   * List all governed memory items for a company.
   * Supports filtering by scope, kind, agent, project, approval status, text, and pagination.
   */
  async listViewer(
    companyId: string,
    filter: MemoryViewerFilter,
  ): Promise<MemoryViewerPage> {
    const params = new URLSearchParams();

    if (filter.scope && filter.scope.length > 0) {
      params.append("scope", filter.scope.join(","));
    }
    if (filter.kind && filter.kind.length > 0) {
      params.append("kind", filter.kind.join(","));
    }
    if (filter.agentId) {
      params.append("agentId", filter.agentId);
    }
    if (filter.projectId) {
      params.append("projectId", filter.projectId);
    }
    if (filter.approvalStatus && filter.approvalStatus.length > 0) {
      params.append("approvalStatus", filter.approvalStatus.join(","));
    }
    if (filter.includeArchived) {
      params.append("includeArchived", "true");
    }
    if (filter.text) {
      params.append("text", filter.text);
    }
    if (filter.page !== undefined) {
      params.append("page", String(filter.page));
    }
    if (filter.pageSize !== undefined) {
      params.append("pageSize", String(filter.pageSize));
    }

    const query = params.toString();
    const url = query
      ? `${BASE_URL}/${companyId}/memory/viewer?${query}`
      : `${BASE_URL}/${companyId}/memory/viewer`;

    return client.get<MemoryViewerPage>(url);
  },

  /**
   * Get aggregate governance statistics for a company.
   * Returns counts by scope, kind, approval status, and total active/archived.
   */
  async getViewerStats(companyId: string): Promise<MemoryGovernanceStats> {
    return client.get<MemoryGovernanceStats>(
      `${BASE_URL}/${companyId}/memory/viewer/stats`,
    );
  },

  /**
   * Run ephemeral reflection analysis on recent episodes.
   * Returns candidates without saving anything.
   * All candidates are session-scoped and must be explicitly promoted.
   */
  async runReflection(
    companyId: string,
    input: RunReflectionInput,
  ): Promise<ReflectionReport> {
    return client.post<ReflectionReport>(
      `${BASE_URL}/${companyId}/memory/reflect`,
      input,
    );
  },

  /**
   * Get a debug trace showing which memories would be loaded before a run.
   * Helps operators understand retrieval behavior.
   */
  async getRetrievalTrace(
    companyId: string,
    params: {
      agentId: string;
      projectId?: string;
      text?: string;
      limit?: number;
    },
  ): Promise<{
    context: {
      personal: MemoryItemGoverned[];
      company: MemoryItemGoverned[];
      project: MemoryItemGoverned[];
      social: MemoryItemGoverned[];
    };
    trace: {
      companyId: string;
      agentId: string;
      queryText: string;
      retrievedAt: Date;
      entries: Array<{
        scope: "personal" | "company" | "project" | "social";
        count: number;
        topItems: Array<{
          id: string;
          summary: string;
          importance: number;
          matchedQuery: boolean;
        }>;
      }>;
      totalRetrieved: number;
    };
  }> {
    const searchParams = new URLSearchParams({
      agentId: params.agentId,
    });
    if (params.projectId) searchParams.append("projectId", params.projectId);
    if (params.text) searchParams.append("text", params.text);
    if (params.limit) searchParams.append("limit", String(params.limit));

    return client.get<{
      context: {
        personal: MemoryItemGoverned[];
        company: MemoryItemGoverned[];
        project: MemoryItemGoverned[];
        social: MemoryItemGoverned[];
      };
      trace: {
        companyId: string;
        agentId: string;
        queryText: string;
        retrievedAt: Date;
        entries: Array<{
          scope: "personal" | "company" | "project" | "social";
          count: number;
          topItems: Array<{
            id: string;
            summary: string;
            importance: number;
            matchedQuery: boolean;
          }>;
        }>;
        totalRetrieved: number;
      };
    }>(`${BASE_URL}/${params.agentId}/memory/retrieval-trace?${searchParams}`);
  },
};
