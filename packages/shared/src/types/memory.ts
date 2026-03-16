export const MEMORY_SCOPES = [
  "personal",
  "company",
  "project",
  "social",
] as const;

export type MemoryScope = (typeof MEMORY_SCOPES)[number];

export const MEMORY_KINDS = [
  "fact",
  "episode",
  "lesson",
  "decision",
  "policy",
  "preference",
  "relationship",
  "skill",
] as const;

export type MemoryKind = (typeof MEMORY_KINDS)[number];

export interface MemoryItem {
  id: string;
  companyId: string;
  scope: MemoryScope;
  kind: MemoryKind;
  agentId: string | null;
  projectId: string | null;
  relatedAgentIds: string[];
  summary: string;
  detail: string;
  tags: string[];
  importance: number;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
  sourceRefs: string[];
}

export interface MemorySearchParams {
  text: string;
  scope?: MemoryScope[];
  agentId?: string;
  projectId?: string;
  limit?: number;
  // Sprint 3 governance filters (optional, default = approved + not archived)
  approvalStatuses?: MemoryApprovalStatus[];
  includeArchived?: boolean;
}

export interface MemoryStore {
  add(item: MemoryItem): Promise<void>;
  search(params: MemorySearchParams): Promise<MemoryItem[]>;
  reinforce(memoryId: string): Promise<void>;
  correct(memoryId: string, patch: Partial<MemoryItem>): Promise<void>;
}

export interface ReflectionOutput {
  personal: MemoryItem[];
  company: MemoryItem[];
  project: MemoryItem[];
  social: MemoryItem[];
  discard: string[];
}

export interface CreateMemoryItemInput {
  scope: MemoryScope;
  kind: MemoryKind;
  agentId?: string | null;
  projectId?: string | null;
  relatedAgentIds?: string[];
  summary: string;
  detail: string;
  tags?: string[];
  importance?: number;
  confidence?: number;
  sourceRefs?: string[];
  lastUsedAt?: Date | null;
  /** Sprint 3: agent or user who owns this memory (for governance tracking). */
  ownerId?: string | null;
}

export type CorrectMemoryItemInput = Partial<
  Pick<
    MemoryItem,
    | "scope"
    | "kind"
    | "agentId"
    | "projectId"
    | "relatedAgentIds"
    | "summary"
    | "detail"
    | "tags"
    | "importance"
    | "confidence"
    | "sourceRefs"
    | "lastUsedAt"
  >
>;

// ─── Sprint 2: Reflection Engine ─────────────────────────────────────────────

export type DiscardReason = "low-importance" | "near-duplicate" | "stale";

export interface DiscardCandidate {
  memoryId: string;
  summary: string;
  reason: DiscardReason;
  /** Present when reason is "near-duplicate" — ID of the entry this duplicates. */
  duplicateOfId?: string;
}

/**
 * An ephemeral candidate derived by the reflection engine from existing episodes.
 * Not persisted until explicitly promoted via the promote endpoint.
 */
export interface ReflectionCandidate {
  /** Temporary session-scoped ID; not a DB ID. Used by the client to select which candidates to promote. */
  candidateId: string;
  /** Name of the rule that generated this candidate. */
  ruleName: string;
  derivedKind: "lesson" | "decision";
  derivedScope: MemoryScope;
  agentId: string | null;
  projectId: string | null;
  suggestedSummary: string;
  suggestedDetail: string;
  suggestedTags: string[];
  suggestedImportance: number;
  suggestedConfidence: number;
  /** IDs of the episode MemoryItems that triggered this candidate. */
  sourceEpisodeIds: string[];
}

/** Full result of a single reflection pass. Ephemeral — not stored automatically. */
export interface ReflectionReport {
  companyId: string;
  agentId: string;
  projectId: string | null;
  reflectedAt: Date;
  episodesAnalyzed: number;
  lookbackDays: number;
  candidates: ReflectionCandidate[];
  toDiscard: DiscardCandidate[];
  /** Names of rules that fired and contributed at least one result. */
  rulesFired: string[];
}

export interface RunReflectionInput {
  agentId: string;
  projectId?: string | null;
  /** Number of days to look back for episodes. Default: 30. */
  lookbackDays?: number;
}

/** Input for the promote endpoint. Items are exactly the `CreateMemoryItemInput` shape so callers can edit suggestions before confirming. */
export interface PromoteReflectionInput {
  items: CreateMemoryItemInput[];
}

// ─── Sprint 3: Governance ────────────────────────────────────────────────────

export type MemoryApprovalStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected";

/**
 * A `MemoryItem` enriched with governance metadata.
 * Returned by the Viewer and Governance endpoints; never by the standard search.
 */
export interface MemoryItemGoverned extends MemoryItem {
  approvalStatus: MemoryApprovalStatus;
  /** agentId or free-form user ref of the creator/owner. */
  ownerId: string | null;
  /** Set when the item is soft-archived (excluded from context by default). */
  archivedAt: Date | null;
  /** Who approved the item ("system", userId, etc.). */
  approvedBy: string | null;
  approvedAt: Date | null;
}

export interface MemoryViewerFilter {
  scope?: MemoryScope[];
  kind?: MemoryKind[];
  agentId?: string;
  projectId?: string;
  /** Default: all non-archived approval statuses (pending_review, approved). */
  approvalStatus?: MemoryApprovalStatus[];
  includeArchived?: boolean;
  text?: string;
  /** 1-based page number. Default: 1. */
  page?: number;
  /** Items per page, max 50. Default: 25. */
  pageSize?: number;
}

export interface MemoryViewerPage {
  items: MemoryItemGoverned[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MemoryGovernanceStats {
  byScope: Partial<Record<MemoryScope, number>>;
  byKind: Partial<Record<MemoryKind, number>>;
  byApprovalStatus: Partial<Record<MemoryApprovalStatus, number>>;
  totalActive: number;
  totalArchived: number;
  pendingReviewCount: number;
}

export interface RetentionConfig {
  /** Archive succeeded episodes older than this many days. Default: 30. */
  maxAgeDaysSucceeded: number;
  /** Archive failed episodes older than this many days. Default: 90. */
  maxAgeDaysFailed: number;
  /** Only archive episodes with importance below this threshold. Default: 35. */
  importanceThreshold: number;
  /** When true, report what would be archived without actually archiving. */
  dryRun: boolean;
}

export interface RetentionResult {
  archivedCount: number;
  dryRun: boolean;
  archivedIds: string[];
}

export interface RetrievalTraceEntry {
  scope: MemoryScope;
  count: number;
  topItems: Array<{
    id: string;
    summary: string;
    importance: number;
    matchedQuery: boolean;
  }>;
}

/** Debug output showing which memories were (or would be) loaded before a run. */
export interface RetrievalTrace {
  companyId: string;
  agentId: string;
  queryText: string;
  retrievedAt: Date;
  entries: RetrievalTraceEntry[];
  totalRetrieved: number;
}
