/**
 * Sprint 2 — Reflection Engine
 *
 * Analyses recent episode memories for an agent and derives reviewable
 * lesson/decision candidates. Nothing is auto-saved: all output is ephemeral
 * until the caller explicitly calls promote().
 *
 * Leitplanken:
 *   - Keine Vollautonomie: runReflection() only proposes, never commits.
 *   - Keine aggressive Verdichtung: rules fire only above clear thresholds.
 *   - Nachvollziehbare Regeln: each candidate carries ruleName so the origin is visible.
 *   - Reviewable candidates: promote() accepts caller-edited items, not raw candidates.
 *   - discard / dedupe / importance: covered by analyzeDiscards() below.
 */

import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { memoryItems } from "@paperclipai/db";
import type {
  CreateMemoryItemInput,
  DiscardCandidate,
  MemoryItem,
  MemoryKind,
  MemoryScope,
  PromoteReflectionInput,
  ReflectionCandidate,
  ReflectionReport,
  RunReflectionInput,
} from "@paperclipai/shared";
import { memoryService } from "./memory.js";

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function mapRow(row: typeof memoryItems.$inferSelect): MemoryItem {
  return {
    id: row.id,
    companyId: row.companyId,
    scope: row.scope as MemoryScope,
    kind: row.kind as MemoryKind,
    agentId: row.agentId,
    projectId: row.projectId,
    relatedAgentIds: (row.relatedAgentIds as string[]) ?? [],
    summary: row.summary,
    detail: row.detail,
    tags: (row.tags as string[]) ?? [],
    importance: row.importance,
    confidence: row.confidence,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastUsedAt: row.lastUsedAt,
    sourceRefs: (row.sourceRefs as string[]) ?? [],
  };
}

function hasTag(item: MemoryItem, tag: string): boolean {
  return item.tags.includes(tag);
}

function extractIssueIds(item: MemoryItem): string[] {
  return item.sourceRefs
    .filter((ref) => ref.startsWith("issue:"))
    .map((ref) => ref.slice("issue:".length));
}

function normalizeForDedup(summary: string): string {
  return summary.toLowerCase().trim().replace(/\s+/g, " ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule implementations (pure functions — exported for unit testing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * recurring-failure: ≥ 2 failed episodes → lesson "Recurring failure detected".
 * Fires on personal or project scope depending on whether projectId is set.
 */
export function ruleRecurringFailure(
  episodes: MemoryItem[],
  agentId: string,
  projectId: string | null,
): ReflectionCandidate | null {
  const failed = episodes.filter((e) => hasTag(e, "failed"));
  if (failed.length < 2) return null;

  const runRefs = failed
    .flatMap((e) => e.sourceRefs.filter((r) => r.startsWith("heartbeat_run:")))
    .slice(0, 10);

  return {
    candidateId: randomUUID(),
    ruleName: "recurring-failure",
    derivedKind: "lesson",
    derivedScope: projectId ? "project" : "personal",
    agentId,
    projectId,
    suggestedSummary: `Recurring failure detected (${failed.length} of ${episodes.length} runs)`,
    suggestedDetail: [
      `Agent failed on ${failed.length} out of ${episodes.length} recent runs.`,
      `Failed runs: ${runRefs.join(", ")}`,
      "Review error patterns and consider adding defensive handling or clearer task descriptions.",
    ].join("\n"),
    suggestedTags: ["lesson", "failure-pattern", "review"],
    suggestedImportance: 65,
    suggestedConfidence: 70,
    sourceEpisodeIds: failed.map((e) => e.id),
  };
}

/**
 * consistent-success: ≥ 3 succeeded episodes in a project → lesson "Consistent success".
 * Only fires when projectId is provided.
 */
export function ruleConsistentSuccess(
  episodes: MemoryItem[],
  agentId: string,
  projectId: string | null,
): ReflectionCandidate | null {
  if (!projectId) return null;
  const succeeded = episodes.filter(
    (e) => hasTag(e, "succeeded") && e.projectId === projectId,
  );
  if (succeeded.length < 3) return null;

  return {
    candidateId: randomUUID(),
    ruleName: "consistent-success",
    derivedKind: "lesson",
    derivedScope: "project",
    agentId,
    projectId,
    suggestedSummary: `Agent consistently succeeds in project (${succeeded.length} runs)`,
    suggestedDetail: [
      `Agent succeeded on ${succeeded.length} out of ${episodes.length} recent runs in this project.`,
      "Current approach appears reliable. Consider documenting the pattern.",
    ].join("\n"),
    suggestedTags: ["lesson", "success-pattern"],
    suggestedImportance: 60,
    suggestedConfidence: 75,
    sourceEpisodeIds: succeeded.map((e) => e.id),
  };
}

/**
 * issue-resolution: succeeded episode with an issue: sourceRef → decision candidate.
 * One candidate per unique issue ID. Scope is "project" if the episode has a projectId.
 */
export function ruleIssueResolution(
  episodes: MemoryItem[],
  agentId: string,
): ReflectionCandidate[] {
  const resolvedIssues = new Map<string, MemoryItem>();

  for (const ep of episodes) {
    if (!hasTag(ep, "succeeded")) continue;
    for (const issueId of extractIssueIds(ep)) {
      if (!resolvedIssues.has(issueId)) {
        resolvedIssues.set(issueId, ep);
      }
    }
  }

  return Array.from(resolvedIssues.entries()).map(([issueId, ep]) => {
    const summaryLine =
      ep.detail.split("\n").find((l) => l.startsWith("Summary:")) ?? "";
    return {
      candidateId: randomUUID(),
      ruleName: "issue-resolution",
      derivedKind: "decision",
      derivedScope: (ep.projectId ? "project" : "personal") as MemoryScope,
      agentId,
      projectId: ep.projectId,
      suggestedSummary: `Issue resolved: ${issueId}`,
      suggestedDetail: [
        `Issue ${issueId} was successfully resolved.`,
        summaryLine,
      ]
        .filter(Boolean)
        .join("\n"),
      suggestedTags: ["decision", "issue-resolution"],
      suggestedImportance: 55,
      suggestedConfidence: 85,
      sourceEpisodeIds: [ep.id],
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Discard analysis (pure — exported for unit testing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyses episodes for low-value or duplicate entries.
 *
 * Rules:
 *   low-importance: succeeded episode with importance < 40 (failed episodes kept for learning).
 *   near-duplicate: two episodes with the same normalised summary; discard the newer one
 *                   (the older carries the original observation; the newer is likely a repeat).
 */
export function analyzeDiscards(episodes: MemoryItem[]): DiscardCandidate[] {
  const discards: DiscardCandidate[] = [];
  // Process oldest-first so the first occurrence is kept for dedup.
  const ordered = [...episodes].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const seenSummaries = new Map<string, string>(); // normalised → first id

  for (const ep of ordered) {
    const key = normalizeForDedup(ep.summary);
    const existingId = seenSummaries.get(key);

    if (existingId) {
      discards.push({
        memoryId: ep.id,
        summary: ep.summary,
        reason: "near-duplicate",
        duplicateOfId: existingId,
      });
      continue;
    }

    seenSummaries.set(key, ep.id);

    // Only propose discarding succeeded low-importance episodes.
    // Failed episodes (even low-importance) are retained for learning.
    if (ep.importance < 40 && hasTag(ep, "succeeded")) {
      discards.push({
        memoryId: ep.id,
        summary: ep.summary,
        reason: "low-importance",
      });
    }
  }

  return discards;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service factory
// ─────────────────────────────────────────────────────────────────────────────

export function reflectionService(db: Db) {
  async function fetchEpisodes(input: {
    companyId: string;
    agentId: string;
    projectId: string | null | undefined;
    lookbackDays: number;
  }): Promise<MemoryItem[]> {
    const cutoff = new Date(Date.now() - input.lookbackDays * 86_400_000);
    const scopes: MemoryScope[] = ["personal"];
    if (input.projectId) scopes.push("project");

    const rows = await db
      .select()
      .from(memoryItems)
      .where(
        and(
          eq(memoryItems.companyId, input.companyId),
          eq(memoryItems.agentId, input.agentId),
          eq(memoryItems.kind, "episode"),
          inArray(memoryItems.scope, scopes),
          gte(memoryItems.createdAt, cutoff),
        ),
      )
      .orderBy(desc(memoryItems.createdAt))
      .limit(100);

    return rows.map(mapRow);
  }

  async function runReflection(
    companyId: string,
    input: RunReflectionInput,
  ): Promise<ReflectionReport> {
    const lookbackDays = input.lookbackDays ?? 30;
    const projectId = input.projectId ?? null;

    const episodes = await fetchEpisodes({
      companyId,
      agentId: input.agentId,
      projectId,
      lookbackDays,
    });

    const candidates: ReflectionCandidate[] = [];
    const rulesFired: string[] = [];

    const failureCandidate = ruleRecurringFailure(
      episodes,
      input.agentId,
      projectId,
    );
    if (failureCandidate) {
      candidates.push(failureCandidate);
      rulesFired.push("recurring-failure");
    }

    const successCandidate = ruleConsistentSuccess(
      episodes,
      input.agentId,
      projectId,
    );
    if (successCandidate) {
      candidates.push(successCandidate);
      rulesFired.push("consistent-success");
    }

    const issueResolutions = ruleIssueResolution(episodes, input.agentId);
    if (issueResolutions.length > 0) {
      candidates.push(...issueResolutions);
      rulesFired.push("issue-resolution");
    }

    const toDiscard = analyzeDiscards(episodes);

    return {
      companyId,
      agentId: input.agentId,
      projectId,
      reflectedAt: new Date(),
      episodesAnalyzed: episodes.length,
      lookbackDays,
      candidates,
      toDiscard,
      rulesFired,
    };
  }

  /**
   * Promotes chosen candidates to actual memory items.
   * The caller supplies the items as CreateMemoryItemInput so they can edit
   * the suggested values before committing (summary, detail, importance, …).
   */
  async function promote(
    companyId: string,
    input: PromoteReflectionInput,
  ): Promise<MemoryItem[]> {
    const svc = memoryService(db);
    const created = await Promise.all(
      input.items.map((item) => svc.create(companyId, item)),
    );
    return created;
  }

  return { runReflection, promote };
}
