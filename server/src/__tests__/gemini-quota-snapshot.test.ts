import { describe, expect, it } from "vitest";
import { ingestGeminiQuotaSnapshot } from "../services/gemini-quota-snapshot.ts";

describe("ingestGeminiQuotaSnapshot", () => {
  it("prefers runtime quota snapshot and normalizes bucket metrics", () => {
    const snapshot = ingestGeminiQuotaSnapshot(
      {
        routingPolicy: {
          accountLabel: "account-fallback",
          bucketState: {
            flash: "ok",
            pro: "ok",
            "flash-lite": "ok",
          },
          quotaSnapshot: {
            accountLabel: "account-live",
            snapshotAt: "2026-03-19T16:30:00.000Z",
            resetAt: "2026-03-20T00:00:00.000Z",
            resetReason: "daily_window",
            buckets: {
              flash: {
                state: "cooldown",
                usagePercent: 92.6,
                cooldown: true,
                snapshotAt: "2026-03-19T16:30:00.000Z",
              },
              pro: {
                exhausted: true,
                usagePct: 120,
              },
            },
          },
        },
      },
      "2026-03-19T16:31:00.000Z",
    );

    expect(snapshot.source).toBe("runtime_quota_snapshot");
    expect(snapshot.accountLabel).toBe("account-live");
    expect(snapshot.snapshotAt).toBe("2026-03-19T16:30:00.000Z");
    expect(snapshot.resetAt).toBe("2026-03-20T00:00:00.000Z");
    expect(snapshot.buckets.flash?.state).toBe("cooldown");
    expect(snapshot.buckets.flash?.usagePercent).toBe(93);
    expect(snapshot.buckets.pro?.state).toBe("exhausted");
    expect(snapshot.buckets.pro?.usagePercent).toBe(100);
  });

  it("falls back to legacy runtime bucket states when quota snapshot is missing", () => {
    const snapshot = ingestGeminiQuotaSnapshot(
      {
        routingPolicy: {
          accountLabel: "account-legacy",
          bucketState: {
            flash: "ok",
            pro: "cooldown",
          },
        },
      },
      "2026-03-19T16:31:00.000Z",
    );

    expect(snapshot.source).toBe("runtime_bucket_state");
    expect(snapshot.accountLabel).toBe("account-legacy");
    expect(snapshot.buckets.flash?.state).toBe("ok");
    expect(snapshot.buckets.pro?.state).toBe("cooldown");
    expect(snapshot.buckets["flash-lite"]).toBeUndefined();
  });
});
