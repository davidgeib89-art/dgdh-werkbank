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
