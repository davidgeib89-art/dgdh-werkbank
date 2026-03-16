/**
 * Sprint 2 — Reflection Engine Unit Tests
 *
 * Tests pure rule functions and analyzeDiscards() without a database.
 * The reflectionService(db) factory is tested via integration tests once a
 * test DB is available.
 */

import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { MemoryItem } from "@paperclipai/shared";
import {
  analyzeDiscards,
  ruleConsistentSuccess,
  ruleIssueResolution,
  ruleRecurringFailure,
} from "../services/reflection.js";

const AGENT = "agent-codex";
const PROJECT = "proj-alpha";
const COMPANY = "cmp-1";

function episode(
  overrides: Partial<MemoryItem> & { outcome: "succeeded" | "failed" },
): MemoryItem {
  const { outcome, ...rest } = overrides;
  const now = new Date("2026-03-16T12:00:00.000Z");
  const runId = randomUUID();
  return {
    id: randomUUID(),
    companyId: COMPANY,
    scope: rest.projectId ? "project" : "personal",
    kind: "episode",
    agentId: AGENT,
    projectId: null,
    relatedAgentIds: [],
    summary: `Heartbeat run ${outcome}`,
    detail: `Run ID: ${runId}\nAgent ID: ${AGENT}\nOutcome: ${outcome}`,
    tags: ["heartbeat", "run", outcome],
    importance: outcome === "succeeded" ? 45 : 60,
    confidence: 80,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    sourceRefs: [`heartbeat_run:${runId}`],
    ...rest,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ruleRecurringFailure
// ─────────────────────────────────────────────────────────────────────────────
describe("ruleRecurringFailure", () => {
  it("returns null when fewer than 2 failures", () => {
    const eps = [episode({ outcome: "failed" })];
    expect(ruleRecurringFailure(eps, AGENT, null)).toBeNull();
  });

  it("fires when exactly 2 failures exist", () => {
    const eps = [
      episode({ outcome: "failed" }),
      episode({ outcome: "failed" }),
    ];
    const candidate = ruleRecurringFailure(eps, AGENT, null);
    expect(candidate).not.toBeNull();
    expect(candidate!.ruleName).toBe("recurring-failure");
    expect(candidate!.derivedKind).toBe("lesson");
    expect(candidate!.derivedScope).toBe("personal");
    expect(candidate!.sourceEpisodeIds).toHaveLength(2);
    expect(candidate!.suggestedImportance).toBe(65);
    expect(candidate!.suggestedConfidence).toBe(70);
  });

  it("uses project scope when projectId is provided", () => {
    const eps = [
      episode({ outcome: "failed", projectId: PROJECT }),
      episode({ outcome: "failed", projectId: PROJECT }),
    ];
    const candidate = ruleRecurringFailure(eps, AGENT, PROJECT);
    expect(candidate!.derivedScope).toBe("project");
    expect(candidate!.projectId).toBe(PROJECT);
  });

  it("counts only failed episodes towards threshold", () => {
    const eps = [
      episode({ outcome: "failed" }),
      episode({ outcome: "succeeded" }),
      episode({ outcome: "succeeded" }),
    ];
    // Only 1 failure → no candidate
    expect(ruleRecurringFailure(eps, AGENT, null)).toBeNull();
  });

  it("summary mentions counts", () => {
    const eps = [
      episode({ outcome: "failed" }),
      episode({ outcome: "failed" }),
      episode({ outcome: "succeeded" }),
    ];
    const candidate = ruleRecurringFailure(eps, AGENT, null);
    expect(candidate!.suggestedSummary).toContain("2 of 3");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ruleConsistentSuccess
// ─────────────────────────────────────────────────────────────────────────────
describe("ruleConsistentSuccess", () => {
  it("returns null when projectId is absent", () => {
    const eps = [
      episode({ outcome: "succeeded" }),
      episode({ outcome: "succeeded" }),
      episode({ outcome: "succeeded" }),
    ];
    expect(ruleConsistentSuccess(eps, AGENT, null)).toBeNull();
  });

  it("returns null when fewer than 3 successes in project", () => {
    const eps = [
      episode({ outcome: "succeeded", projectId: PROJECT }),
      episode({ outcome: "succeeded", projectId: PROJECT }),
    ];
    expect(ruleConsistentSuccess(eps, AGENT, PROJECT)).toBeNull();
  });

  it("fires when 3+ successes in project", () => {
    const eps = [
      episode({ outcome: "succeeded", projectId: PROJECT }),
      episode({ outcome: "succeeded", projectId: PROJECT }),
      episode({ outcome: "succeeded", projectId: PROJECT }),
    ];
    const candidate = ruleConsistentSuccess(eps, AGENT, PROJECT);
    expect(candidate).not.toBeNull();
    expect(candidate!.ruleName).toBe("consistent-success");
    expect(candidate!.derivedKind).toBe("lesson");
    expect(candidate!.derivedScope).toBe("project");
    expect(candidate!.sourceEpisodeIds).toHaveLength(3);
    expect(candidate!.suggestedImportance).toBe(60);
    expect(candidate!.suggestedConfidence).toBe(75);
  });

  it("only counts episodes matching the provided projectId", () => {
    const eps = [
      episode({ outcome: "succeeded", projectId: PROJECT }),
      episode({ outcome: "succeeded", projectId: "proj-other" }),
      episode({ outcome: "succeeded", projectId: "proj-other" }),
    ];
    // Only 1 episode matches PROJECT
    expect(ruleConsistentSuccess(eps, AGENT, PROJECT)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ruleIssueResolution
// ─────────────────────────────────────────────────────────────────────────────
describe("ruleIssueResolution", () => {
  it("returns empty array when no succeeded episodes have issue refs", () => {
    const eps = [
      episode({ outcome: "succeeded" }),
      episode({ outcome: "failed", sourceRefs: ["issue:issue-7"] }),
    ];
    expect(ruleIssueResolution(eps, AGENT)).toHaveLength(0);
  });

  it("returns one candidate per unique resolved issue", () => {
    const ep1 = episode({
      outcome: "succeeded",
      sourceRefs: ["heartbeat_run:r1", "issue:issue-10"],
    });
    const ep2 = episode({
      outcome: "succeeded",
      sourceRefs: ["heartbeat_run:r2", "issue:issue-20"],
    });
    const candidates = ruleIssueResolution([ep1, ep2], AGENT);
    expect(candidates).toHaveLength(2);

    const ids = candidates.map((c) => c.suggestedSummary);
    expect(ids).toContain("Issue resolved: issue-10");
    expect(ids).toContain("Issue resolved: issue-20");
  });

  it("deduplicates: same issue from two succeeded episodes → one candidate", () => {
    const ep1 = episode({
      outcome: "succeeded",
      sourceRefs: ["issue:issue-5"],
    });
    const ep2 = episode({
      outcome: "succeeded",
      sourceRefs: ["issue:issue-5"],
    });
    const candidates = ruleIssueResolution([ep1, ep2], AGENT);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.derivedKind).toBe("decision");
    expect(candidates[0]!.suggestedConfidence).toBe(85);
  });

  it("uses project scope when episode has projectId", () => {
    const ep = episode({
      outcome: "succeeded",
      projectId: PROJECT,
      sourceRefs: ["issue:issue-99"],
    });
    ep.scope = "project";
    const [candidate] = ruleIssueResolution([ep], AGENT);
    expect(candidate!.derivedScope).toBe("project");
    expect(candidate!.projectId).toBe(PROJECT);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// analyzeDiscards
// ─────────────────────────────────────────────────────────────────────────────
describe("analyzeDiscards", () => {
  it("returns empty array for clean successful episodes with adequate importance", () => {
    const eps = [
      episode({ outcome: "succeeded", importance: 45 }),
      episode({ outcome: "failed", importance: 60 }),
    ];
    expect(analyzeDiscards(eps)).toHaveLength(0);
  });

  it("proposes low-importance succeeded episodes for discard", () => {
    const ep = episode({ outcome: "succeeded" });
    ep.importance = 35; // below threshold of 40
    const discards = analyzeDiscards([ep]);
    expect(discards).toHaveLength(1);
    expect(discards[0]!.reason).toBe("low-importance");
    expect(discards[0]!.memoryId).toBe(ep.id);
  });

  it("does NOT propose low-importance failed episodes for discard", () => {
    const ep = episode({ outcome: "failed" });
    ep.importance = 30; // low, but it's a failed episode — keep for learning
    const discards = analyzeDiscards([ep]);
    // Might still be marked near-duplicate if duplicate summaries, but not low-importance
    const lowImportanceDiscards = discards.filter(
      (d) => d.reason === "low-importance",
    );
    expect(lowImportanceDiscards).toHaveLength(0);
  });

  it("marks newer duplicate as near-duplicate and keeps older", () => {
    const older = episode({ outcome: "succeeded" });
    older.createdAt = new Date("2026-03-01T00:00:00.000Z");
    older.summary = "Heartbeat run succeeded";

    const newer = episode({ outcome: "succeeded" });
    newer.createdAt = new Date("2026-03-16T00:00:00.000Z");
    newer.summary = "Heartbeat run succeeded"; // same normalised summary

    const discards = analyzeDiscards([older, newer]);
    const dupDiscard = discards.find((d) => d.reason === "near-duplicate");
    expect(dupDiscard).toBeDefined();
    expect(dupDiscard!.memoryId).toBe(newer.id); // newer is discarded
    expect(dupDiscard!.duplicateOfId).toBe(older.id); // older is kept
  });

  it("case-insensitive deduplication ignores case and extra whitespace", () => {
    const ep1 = episode({ outcome: "succeeded" });
    ep1.summary = "Heartbeat Run Succeeded";
    ep1.createdAt = new Date("2026-03-01T00:00:00.000Z");

    const ep2 = episode({ outcome: "succeeded" });
    ep2.summary = "heartbeat run succeeded";
    ep2.createdAt = new Date("2026-03-16T00:00:00.000Z");

    const discards = analyzeDiscards([ep1, ep2]);
    expect(discards.some((d) => d.reason === "near-duplicate")).toBe(true);
  });

  it("handles mixed scenarios without false positives", () => {
    const eps = [
      episode({ outcome: "failed" }), // no discard
      episode({ outcome: "succeeded", importance: 50 }), // no discard
    ];
    // Make unique summaries to avoid dedup
    eps[0]!.summary = "Heartbeat run failed — unique case A";
    eps[1]!.summary = "Heartbeat run succeeded — unique case B";
    expect(analyzeDiscards(eps)).toHaveLength(0);
  });
});
