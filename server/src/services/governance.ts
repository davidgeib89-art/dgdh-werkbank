/**
 * Sprint 3 — Memory Governance
 *
 * Provides approval gating for governed memory kinds, a soft-archive (retention)
 * pass, a paginated viewer, and aggregate stats.
 *
 * Leitplanken:
 *   - canPromoteDirectly() is a pure rule — no DB needed, deterministic.
 *   - company / policy / decision → pending_review by default.
 *   - Personal decisions and all personal/project/social facts → approved directly.
 *   - Approval requires an explicit human/system call to approve().
 *   - Retention archives, never hard-deletes. Only episodes are eligible.
 *   - All viewer/governance endpoints respect companyId isolation.
 */

import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { memoryItems } from "@paperclipai/db";
import type {
  MemoryApprovalStatus,
  MemoryGovernanceStats,
  MemoryItemGoverned,
  MemoryKind,
  MemoryScope,
  MemoryViewerFilter,
  MemoryViewerPage,
  RetentionConfig,
  RetentionResult,
} from "@paperclipai/shared";
import { mapRowToMemoryItem } from "./memory.js";

// ─────────────────────────────────────────────────────────────────────────────
// Pure governance rule
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when a memory with this scope+kind can be approved immediately
 * (i.e. does not require a human review step).
 *
 * Rules:
 *   - scope = "company"                        → pending_review
 *   - kind  = "policy"                         → pending_review
 *   - kind  = "decision" AND scope ≠ "personal"→ pending_review
 *   - everything else                          → approved immediately
 */
export function canPromoteDirectly(
  scope: MemoryScope,
  kind: MemoryKind,
): boolean {
  if (scope === "company") return false;
  if (kind === "policy") return false;
  if (kind === "decision" && scope !== "personal") return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal mapping helper
// ─────────────────────────────────────────────────────────────────────────────

function mapRowToGoverned(
  row: typeof memoryItems.$inferSelect,
): MemoryItemGoverned {
  return {
    ...mapRowToMemoryItem(row),
    approvalStatus: row.approvalStatus as MemoryApprovalStatus,
    ownerId: row.ownerId,
    archivedAt: row.archivedAt,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
  };
}

function buildTextCondition(text: string | undefined) {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const escaped = trimmed.replace(/[%_]/g, (c) => `\\${c}`);
  const pattern = `%${escaped}%`;
  return or(
    ilike(memoryItems.summary, pattern),
    ilike(memoryItems.detail, pattern),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Service factory
// ─────────────────────────────────────────────────────────────────────────────

export function governanceService(db: Db) {
  /**
   * Approve a pending_review memory item.
   * `approvedBy` is a free-form identifier (user email, "system", agent ID).
   */
  async function approve(
    companyId: string,
    memoryId: string,
    approvedBy: string,
  ): Promise<void> {
    await db
      .update(memoryItems)
      .set({
        approvalStatus: "approved",
        approvedBy: approvedBy.trim(),
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(memoryItems.companyId, companyId), eq(memoryItems.id, memoryId)),
      );
  }

  /**
   * Reject a memory item.
   * The item remains in the DB but is no longer surfaced in context hydration.
   */
  async function reject(
    companyId: string,
    memoryId: string,
    reason: string,
  ): Promise<void> {
    // Store the rejection reason as a detail note (non-destructive).
    await db
      .update(memoryItems)
      .set({
        approvalStatus: "rejected",
        approvedBy: null,
        approvedAt: null,
        updatedAt: new Date(),
        // Append rejection reason into detail so audit trail is preserved.
        detail: sql`${
          memoryItems.detail
        } || E'\n\n[Rejected] ' || ${reason.trim()}`,
      })
      .where(
        and(eq(memoryItems.companyId, companyId), eq(memoryItems.id, memoryId)),
      );
  }

  /**
   * Soft-archive a memory item.
   * Archived items are excluded from context hydration by default.
   */
  async function archive(companyId: string, memoryId: string): Promise<void> {
    await db
      .update(memoryItems)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(memoryItems.companyId, companyId), eq(memoryItems.id, memoryId)),
      );
  }

  /**
   * Episode retention pass: soft-archive low-value old episodes.
   *
   * Eligible episodes:
   *   - kind = "episode"
   *   - not already archived
   *   - importance < config.importanceThreshold
   *   - succeeded episodes: older than maxAgeDaysSucceeded
   *   - failed episodes: older than maxAgeDaysFailed (kept longer for learning)
   *
   * When dryRun = true, reports what would be archived without changing anything.
   */
  async function runRetention(
    companyId: string,
    config?: Partial<RetentionConfig>,
  ): Promise<RetentionResult> {
    const cfg: RetentionConfig = {
      maxAgeDaysSucceeded: 30,
      maxAgeDaysFailed: 90,
      importanceThreshold: 35,
      dryRun: false,
      ...config,
    };

    const cutoffSucceeded = new Date(
      Date.now() - cfg.maxAgeDaysSucceeded * 86_400_000,
    );
    const cutoffFailed = new Date(
      Date.now() - cfg.maxAgeDaysFailed * 86_400_000,
    );

    // Fetch all low-importance, non-archived episodes for this company.
    const rows = await db
      .select({
        id: memoryItems.id,
        tags: memoryItems.tags,
        createdAt: memoryItems.createdAt,
      })
      .from(memoryItems)
      .where(
        and(
          eq(memoryItems.companyId, companyId),
          eq(memoryItems.kind, "episode"),
          isNull(memoryItems.archivedAt),
          lt(memoryItems.importance, cfg.importanceThreshold),
        ),
      );

    // Filter in-memory by outcome tag + age cutoff.
    const toArchive = rows.filter((row) => {
      const tags = (row.tags as string[]) ?? [];
      if (tags.includes("succeeded") && row.createdAt < cutoffSucceeded) {
        return true;
      }
      if (tags.includes("failed") && row.createdAt < cutoffFailed) {
        return true;
      }
      return false;
    });

    const ids = toArchive.map((r) => r.id);

    if (!cfg.dryRun && ids.length > 0) {
      const now = new Date();
      await db
        .update(memoryItems)
        .set({ archivedAt: now, updatedAt: now })
        .where(
          and(
            eq(memoryItems.companyId, companyId),
            inArray(memoryItems.id, ids),
          ),
        );
    }

    return { archivedCount: ids.length, dryRun: cfg.dryRun, archivedIds: ids };
  }

  /**
   * Paginated viewer list — includes governance metadata.
   * Unlike search(), this can return pending_review, rejected, and archived items.
   * If `approvalStatus` and `includeArchived` are not specified, defaults to
   * showing all non-archived items (approved + pending_review) for review UIs.
   */
  async function listForViewer(
    companyId: string,
    filter: MemoryViewerFilter,
  ): Promise<MemoryViewerPage> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, filter.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    const conditions = [eq(memoryItems.companyId, companyId)];

    if (filter.scope?.length) {
      conditions.push(inArray(memoryItems.scope, filter.scope));
    }
    if (filter.kind?.length) {
      conditions.push(inArray(memoryItems.kind, filter.kind));
    }
    if (filter.agentId) {
      conditions.push(eq(memoryItems.agentId, filter.agentId));
    }
    if (filter.projectId) {
      conditions.push(eq(memoryItems.projectId, filter.projectId));
    }

    // Approval status filter: if not specified, show approved + pending_review
    const statusFilter = filter.approvalStatus?.length
      ? inArray(memoryItems.approvalStatus, filter.approvalStatus)
      : inArray(memoryItems.approvalStatus, [
          "approved",
          "pending_review",
        ] as MemoryApprovalStatus[]);
    conditions.push(statusFilter);

    if (!filter.includeArchived) {
      conditions.push(isNull(memoryItems.archivedAt));
    }

    const textCondition = buildTextCondition(filter.text);
    if (textCondition) conditions.push(textCondition);

    const whereClause = and(...conditions);

    const [countRow] = await db
      .select({ count: sql<string>`count(*)` })
      .from(memoryItems)
      .where(whereClause);

    const total = parseInt(countRow?.count ?? "0", 10);

    const rows = await db
      .select()
      .from(memoryItems)
      .where(whereClause)
      .orderBy(desc(memoryItems.updatedAt))
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map(mapRowToGoverned),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /**
   * Aggregate governance stats for a company's entire memory corpus.
   */
  async function stats(companyId: string): Promise<MemoryGovernanceStats> {
    const rows = await db
      .select({
        scope: memoryItems.scope,
        kind: memoryItems.kind,
        approvalStatus: memoryItems.approvalStatus,
        archivedAt: memoryItems.archivedAt,
      })
      .from(memoryItems)
      .where(eq(memoryItems.companyId, companyId));

    const byScope: Partial<Record<MemoryScope, number>> = {};
    const byKind: Partial<Record<MemoryKind, number>> = {};
    const byApprovalStatus: Partial<Record<MemoryApprovalStatus, number>> = {};
    let totalActive = 0;
    let totalArchived = 0;
    let pendingReviewCount = 0;

    for (const row of rows) {
      const scope = row.scope as MemoryScope;
      const kind = row.kind as MemoryKind;
      const status = row.approvalStatus as MemoryApprovalStatus;

      byScope[scope] = (byScope[scope] ?? 0) + 1;
      byKind[kind] = (byKind[kind] ?? 0) + 1;
      byApprovalStatus[status] = (byApprovalStatus[status] ?? 0) + 1;

      if (row.archivedAt) {
        totalArchived++;
      } else {
        totalActive++;
      }
      if (status === "pending_review") {
        pendingReviewCount++;
      }
    }

    return {
      byScope,
      byKind,
      byApprovalStatus,
      totalActive,
      totalArchived,
      pendingReviewCount,
    };
  }

  return { approve, reject, archive, runRetention, listForViewer, stats };
}
