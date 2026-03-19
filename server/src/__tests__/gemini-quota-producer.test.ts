import { describe, expect, it } from "vitest";
import { refreshGeminiRuntimeQuotaSnapshot } from "../services/gemini-quota-producer.ts";

describe("refreshGeminiRuntimeQuotaSnapshot", () => {
  it("refreshes snapshot from canonical runtime quota feed", () => {
    const result = refreshGeminiRuntimeQuotaSnapshot({
      trigger: "before_preflight",
      nowIso: "2026-03-19T18:00:00.000Z",
      runtimeConfig: {
        routingPolicy: {
          accountLabel: "account-live",
          quotaFeed: {
            snapshotAt: "2026-03-19T17:59:40.000Z",
            resetAt: "2026-03-20T00:00:00.000Z",
            buckets: {
              flash: { state: "ok", usagePercent: 32 },
              pro: { state: "cooldown", usagePercent: 88 },
            },
          },
        },
      },
    });

    expect(result.refreshed).toBe(true);
    expect(result.refreshSource).toBe("runtime_quota_feed");
    expect(result.runtimeConfigChanged).toBe(true);
    expect(result.snapshot.source).toBe("runtime_quota_snapshot");
    expect(result.snapshot.buckets.flash?.state).toBe("ok");
    expect(result.snapshot.isStale).toBe(false);
  });

  it("falls back to stale marker when no producer source is available", () => {
    const result = refreshGeminiRuntimeQuotaSnapshot({
      trigger: "before_preflight",
      nowIso: "2026-03-19T18:00:00.000Z",
      runtimeConfig: {
        routingPolicy: {},
      },
    });

    expect(result.refreshed).toBe(false);
    expect(result.refreshSource).toBe(null);
    expect(result.snapshot.source).toBe("none");
    expect(result.snapshot.isStale).toBe(true);
    expect(result.snapshot.staleReason).toBe("missing_snapshot");
    expect(result.warnings).toContain("quota_refresh_source_missing");
  });

  it("extracts quota feed from adapter result payload after a run", () => {
    const result = refreshGeminiRuntimeQuotaSnapshot({
      trigger: "after_run",
      nowIso: "2026-03-19T18:00:00.000Z",
      runtimeConfig: {
        routingPolicy: {
          accountLabel: "account-fallback",
        },
      },
      adapterResultJson: {
        stats: {
          quota: {
            accountLabel: "account-from-run",
            capturedAt: "2026-03-19T17:59:00.000Z",
            buckets: {
              flash: { state: "exhausted", usagePct: 120 },
              pro: { state: "ok", usagePercent: 12 },
            },
          },
        },
      },
    });

    expect(result.refreshed).toBe(true);
    expect(result.refreshSource).toBe("adapter_result_feed");
    expect(result.snapshot.accountLabel).toBe("account-from-run");
    expect(result.snapshot.buckets.flash?.state).toBe("exhausted");
    expect(result.snapshot.buckets.flash?.usagePercent).toBe(100);
  });
});
