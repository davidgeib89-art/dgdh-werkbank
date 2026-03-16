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
