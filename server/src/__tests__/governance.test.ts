/**
 * Sprint 3 — Memory Governance Unit Tests
 *
 * Tests the pure canPromoteDirectly() rule without a database.
 * The governanceService(db) factory (approve, reject, archive, runRetention,
 * listForViewer, stats) requires a real DB and is covered by integration tests.
 */

import { describe, expect, it } from "vitest";
import { canPromoteDirectly } from "../services/governance.js";

// ─────────────────────────────────────────────────────────────────────────────
// canPromoteDirectly
// ─────────────────────────────────────────────────────────────────────────────

describe("canPromoteDirectly", () => {
  // ── company scope always requires review ──────────────────────────────────

  it("returns false for company scope + kind=fact", () => {
    expect(canPromoteDirectly("company", "fact")).toBe(false);
  });

  it("returns false for company scope + kind=decision", () => {
    expect(canPromoteDirectly("company", "decision")).toBe(false);
  });

  it("returns false for company scope + kind=policy", () => {
    expect(canPromoteDirectly("company", "policy")).toBe(false);
  });

  it("returns false for company scope + kind=episode", () => {
    expect(canPromoteDirectly("company", "episode")).toBe(false);
  });

  // ── policy kind always requires review ────────────────────────────────────

  it("returns false for personal scope + kind=policy", () => {
    expect(canPromoteDirectly("personal", "policy")).toBe(false);
  });

  it("returns false for project scope + kind=policy", () => {
    expect(canPromoteDirectly("project", "policy")).toBe(false);
  });

  it("returns false for social scope + kind=policy", () => {
    expect(canPromoteDirectly("social", "policy")).toBe(false);
  });

  // ── decision + non-personal scope requires review ─────────────────────────

  it("returns false for project scope + kind=decision", () => {
    expect(canPromoteDirectly("project", "decision")).toBe(false);
  });

  it("returns false for social scope + kind=decision", () => {
    expect(canPromoteDirectly("social", "decision")).toBe(false);
  });

  // ── personal decision can promote directly ────────────────────────────────

  it("returns true for personal scope + kind=decision", () => {
    expect(canPromoteDirectly("personal", "decision")).toBe(true);
  });

  // ── facts and episodes outside company scope promote directly ─────────────

  it("returns true for personal scope + kind=fact", () => {
    expect(canPromoteDirectly("personal", "fact")).toBe(true);
  });

  it("returns true for personal scope + kind=episode", () => {
    expect(canPromoteDirectly("personal", "episode")).toBe(true);
  });

  it("returns true for project scope + kind=fact", () => {
    expect(canPromoteDirectly("project", "fact")).toBe(true);
  });

  it("returns true for project scope + kind=episode", () => {
    expect(canPromoteDirectly("project", "episode")).toBe(true);
  });

  it("returns true for social scope + kind=fact", () => {
    expect(canPromoteDirectly("social", "fact")).toBe(true);
  });

  it("returns true for social scope + kind=episode", () => {
    expect(canPromoteDirectly("social", "episode")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RetentionConfig defaults
// ─────────────────────────────────────────────────────────────────────────────

describe("retention eligibility logic (pure in-memory)", () => {
  /**
   * Mirrors the in-memory filter inside governanceService.runRetention():
   *   - tags includes "succeeded" AND createdAt < cutoffSucceeded
   *   - OR tags includes "failed" AND createdAt < cutoffFailed
   */
  function isEligible(
    tags: string[],
    createdAt: Date,
    cfg: {
      maxAgeDaysSucceeded: number;
      maxAgeDaysFailed: number;
      importanceThreshold: number;
    },
  ): boolean {
    const cutoffS = new Date(Date.now() - cfg.maxAgeDaysSucceeded * 86_400_000);
    const cutoffF = new Date(Date.now() - cfg.maxAgeDaysFailed * 86_400_000);
    if (tags.includes("succeeded") && createdAt < cutoffS) return true;
    if (tags.includes("failed") && createdAt < cutoffF) return true;
    return false;
  }

  const cfg = {
    maxAgeDaysSucceeded: 30,
    maxAgeDaysFailed: 90,
    importanceThreshold: 35,
  };

  it("eligible: succeeded episode older than 30 days", () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 86_400_000);
    expect(isEligible(["heartbeat", "succeeded"], thirtyOneDaysAgo, cfg)).toBe(
      true,
    );
  });

  it("not eligible: succeeded episode exactly 29 days old", () => {
    const twentyNineDaysAgo = new Date(Date.now() - 29 * 86_400_000);
    expect(isEligible(["succeeded"], twentyNineDaysAgo, cfg)).toBe(false);
  });

  it("eligible: failed episode older than 90 days", () => {
    const ninetyOneDaysAgo = new Date(Date.now() - 91 * 86_400_000);
    expect(isEligible(["failed"], ninetyOneDaysAgo, cfg)).toBe(true);
  });

  it("not eligible: failed episode 45 days old (within 90-day window)", () => {
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 86_400_000);
    expect(isEligible(["failed"], fortyFiveDaysAgo, cfg)).toBe(false);
  });

  it("not eligible: succeeded episode 31 days old but has no succeeded/failed tag", () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 86_400_000);
    expect(isEligible(["heartbeat", "run"], thirtyOneDaysAgo, cfg)).toBe(false);
  });

  it("eligible: tag list contains both succeeded and failed — succeeded cutoff wins", () => {
    // If somehow both tags are present, it's eligible once the shorter window passes.
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 86_400_000);
    expect(isEligible(["succeeded", "failed"], thirtyOneDaysAgo, cfg)).toBe(
      true,
    );
  });
});
