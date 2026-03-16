import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { memoryItems } from "@paperclipai/db";
import type {
  CorrectMemoryItemInput,
  CreateMemoryItemInput,
  MemoryItem,
  MemoryScope,
  MemorySearchParams,
  MemoryStore,
  ReflectionOutput,
} from "@paperclipai/shared";

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;
const MAX_CONTEXT_PER_SCOPE = 8;

function clampScore(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.floor(value)));
}

function normalizeStringList(values: string[] | undefined) {
  const normalized = (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(normalized));
}

function mapRowToMemoryItem(row: typeof memoryItems.$inferSelect): MemoryItem {
  return {
    id: row.id,
    companyId: row.companyId,
    scope: row.scope,
    kind: row.kind,
    agentId: row.agentId,
    projectId: row.projectId,
    relatedAgentIds: row.relatedAgentIds,
    summary: row.summary,
    detail: row.detail,
    tags: row.tags,
    importance: row.importance,
    confidence: row.confidence,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastUsedAt: row.lastUsedAt,
    sourceRefs: row.sourceRefs,
  };
}

function sanitizePatch(patch: CorrectMemoryItemInput) {
  const next: Partial<typeof memoryItems.$inferInsert> = {};

  if (patch.scope) next.scope = patch.scope;
  if (patch.kind) next.kind = patch.kind;
  if (patch.agentId !== undefined) next.agentId = patch.agentId;
  if (patch.projectId !== undefined) next.projectId = patch.projectId;
  if (patch.relatedAgentIds)
    next.relatedAgentIds = normalizeStringList(patch.relatedAgentIds);
  if (patch.summary) next.summary = patch.summary.trim();
  if (patch.detail) next.detail = patch.detail.trim();
  if (patch.tags) next.tags = normalizeStringList(patch.tags);
  if (patch.importance !== undefined)
    next.importance = clampScore(patch.importance, 50);
  if (patch.confidence !== undefined)
    next.confidence = clampScore(patch.confidence, 50);
  if (patch.sourceRefs) next.sourceRefs = normalizeStringList(patch.sourceRefs);
  if (patch.lastUsedAt !== undefined) next.lastUsedAt = patch.lastUsedAt;

  return next;
}

function buildTextPattern(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const escaped = trimmed.replace(/[%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

function normalizeLimit(limit: number | undefined) {
  if (!limit || Number.isNaN(limit)) return DEFAULT_SEARCH_LIMIT;
  return Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(limit)));
}

export interface MemoryContext {
  personal: MemoryItem[];
  company: MemoryItem[];
  project: MemoryItem[];
  social: MemoryItem[];
}

function createInMemoryMemoryStore(): MemoryStore {
  const store = new Map<string, MemoryItem>();

  const search = async (params: MemorySearchParams) => {
    const needle = params.text.trim().toLowerCase();
    const requestedScopes = params.scope ? new Set(params.scope) : null;
    const limit = normalizeLimit(params.limit);

    const results = Array.from(store.values())
      .filter((item) => {
        if (requestedScopes && !requestedScopes.has(item.scope)) return false;
        if (params.agentId && item.agentId !== params.agentId) return false;
        if (params.projectId && item.projectId !== params.projectId)
          return false;
        if (!needle) return true;
        const haystack =
          `${item.summary}\n${item.detail}\n${item.tags.join(" ")}`.toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance;
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

    return results.slice(0, limit);
  };

  return {
    add: async (item) => {
      store.set(item.id, { ...item });
    },
    search,
    reinforce: async (memoryId) => {
      const current = store.get(memoryId);
      if (!current) return;
      const now = new Date();
      store.set(memoryId, {
        ...current,
        lastUsedAt: now,
        updatedAt: now,
        importance: Math.min(100, current.importance + 5),
        confidence: Math.min(100, current.confidence + 2),
      });
    },
    correct: async (memoryId, patch) => {
      const current = store.get(memoryId);
      if (!current) return;
      const cleanPatch = sanitizePatch(patch);
      store.set(memoryId, {
        ...current,
        ...cleanPatch,
        updatedAt: new Date(),
      });
    },
  };
}

export interface RunEpisodeInput {
  companyId: string;
  agentId: string;
  runId: string;
  outcome: "succeeded" | "failed" | "cancelled" | "timed_out";
  issueId?: string | null;
  projectId?: string | null;
  resultSummary?: Record<string, unknown> | null;
}

export function memoryService(db: Db) {
  function forCompany(companyId: string): MemoryStore {
    return {
      add: async (item) => {
        await db.insert(memoryItems).values({
          id: item.id,
          companyId,
          scope: item.scope,
          kind: item.kind,
          agentId: item.agentId,
          projectId: item.projectId,
          relatedAgentIds: normalizeStringList(item.relatedAgentIds),
          summary: item.summary.trim(),
          detail: item.detail.trim(),
          tags: normalizeStringList(item.tags),
          importance: clampScore(item.importance, 50),
          confidence: clampScore(item.confidence, 50),
          sourceRefs: normalizeStringList(item.sourceRefs),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          lastUsedAt: item.lastUsedAt,
        });
      },

      search: async (params) => {
        const conditions = [eq(memoryItems.companyId, companyId)];
        if (params.scope && params.scope.length > 0) {
          conditions.push(inArray(memoryItems.scope, params.scope));
        }
        if (params.agentId) {
          conditions.push(eq(memoryItems.agentId, params.agentId));
        }
        if (params.projectId) {
          conditions.push(eq(memoryItems.projectId, params.projectId));
        }

        const pattern = buildTextPattern(params.text);
        if (pattern) {
          conditions.push(
            or(
              ilike(memoryItems.summary, pattern),
              ilike(memoryItems.detail, pattern),
              sql`exists (
                select 1
                from jsonb_array_elements_text(${memoryItems.tags}) as t(tag)
                where t.tag ilike ${pattern}
              )`,
            )!,
          );
        }

        const rows = await db
          .select()
          .from(memoryItems)
          .where(and(...conditions))
          .orderBy(
            desc(memoryItems.importance),
            desc(memoryItems.confidence),
            desc(memoryItems.lastUsedAt),
            desc(memoryItems.updatedAt),
          )
          .limit(normalizeLimit(params.limit));

        return rows.map(mapRowToMemoryItem);
      },

      reinforce: async (memoryId) => {
        await db
          .update(memoryItems)
          .set({
            lastUsedAt: new Date(),
            updatedAt: new Date(),
            importance: sql`least(100, ${memoryItems.importance} + 5)`,
            confidence: sql`least(100, ${memoryItems.confidence} + 2)`,
          })
          .where(
            and(
              eq(memoryItems.companyId, companyId),
              eq(memoryItems.id, memoryId),
            ),
          );
      },

      correct: async (memoryId, patch) => {
        const cleanPatch = sanitizePatch(patch);
        if (Object.keys(cleanPatch).length === 0) return;
        await db
          .update(memoryItems)
          .set({
            ...cleanPatch,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(memoryItems.companyId, companyId),
              eq(memoryItems.id, memoryId),
            ),
          );
      },
    };
  }

  async function create(
    companyId: string,
    input: CreateMemoryItemInput,
  ): Promise<MemoryItem> {
    const now = new Date();
    const item: MemoryItem = {
      id: randomUUID(),
      companyId,
      scope: input.scope,
      kind: input.kind,
      agentId: input.agentId ?? null,
      projectId: input.projectId ?? null,
      relatedAgentIds: normalizeStringList(input.relatedAgentIds),
      summary: input.summary.trim(),
      detail: input.detail.trim(),
      tags: normalizeStringList(input.tags),
      importance: clampScore(input.importance, 50),
      confidence: clampScore(input.confidence, 50),
      createdAt: now,
      updatedAt: now,
      lastUsedAt: input.lastUsedAt ?? null,
      sourceRefs: normalizeStringList(input.sourceRefs),
    };

    await forCompany(companyId).add(item);
    return item;
  }

  async function hydrateRunContext(input: {
    companyId: string;
    agentId: string;
    projectId?: string | null;
    text?: string;
    limitPerScope?: number;
  }): Promise<MemoryContext> {
    const store = forCompany(input.companyId);
    const limit = Math.min(
      MAX_CONTEXT_PER_SCOPE,
      normalizeLimit(input.limitPerScope),
    );
    const text = input.text ?? "";

    const [personal, company, project, social] = await Promise.all([
      store.search({
        text,
        scope: ["personal"],
        agentId: input.agentId,
        limit,
      }),
      store.search({ text, scope: ["company"], limit }),
      input.projectId
        ? store.search({
            text,
            scope: ["project"],
            projectId: input.projectId,
            limit,
          })
        : Promise.resolve([]),
      store.search({ text, scope: ["social"], agentId: input.agentId, limit }),
    ]);

    return {
      personal,
      company,
      project,
      social,
    };
  }

  function asReflectionOutput(context: MemoryContext): ReflectionOutput {
    return {
      personal: context.personal,
      company: context.company,
      project: context.project,
      social: context.social,
      discard: [],
    };
  }

  async function recordRunEpisode(input: RunEpisodeInput) {
    const detailLines = [
      `Run ID: ${input.runId}`,
      `Agent ID: ${input.agentId}`,
      `Outcome: ${input.outcome}`,
      input.issueId ? `Issue ID: ${input.issueId}` : null,
      input.projectId ? `Project ID: ${input.projectId}` : null,
      input.resultSummary
        ? `Summary: ${JSON.stringify(input.resultSummary)}`
        : null,
    ].filter((line): line is string => Boolean(line));

    await create(input.companyId, {
      scope: input.projectId ? "project" : "personal",
      kind: "episode",
      agentId: input.agentId,
      projectId: input.projectId ?? null,
      summary: `Heartbeat run ${input.outcome}`,
      detail: detailLines.join("\n"),
      tags: ["heartbeat", "run", input.outcome],
      importance: input.outcome === "succeeded" ? 45 : 60,
      confidence: 80,
      sourceRefs: [
        `heartbeat_run:${input.runId}`,
        ...(input.issueId ? [`issue:${input.issueId}`] : []),
      ],
      lastUsedAt: new Date(),
    });
  }

  return {
    forCompany,
    create,
    hydrateRunContext,
    asReflectionOutput,
    recordRunEpisode,
  };
}

export { createInMemoryMemoryStore };
