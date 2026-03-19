import {
  ingestGeminiQuotaSnapshot,
  type GeminiQuotaSnapshot,
} from "./gemini-quota-snapshot.js";

type BucketName = "flash" | "pro" | "flash-lite";

export type GeminiQuotaRefreshTrigger =
  | "before_preflight"
  | "after_run"
  | "manual";

export interface GeminiQuotaRefreshInput {
  runtimeConfig: Record<string, unknown>;
  runtimeState: Record<string, unknown>;
  trigger: GeminiQuotaRefreshTrigger;
  nowIso?: string;
  adapterResultJson?: unknown;
}

export interface GeminiQuotaRefreshResult {
  snapshot: GeminiQuotaSnapshot;
  refreshed: boolean;
  refreshSource: "runtime_quota_feed" | "adapter_result_feed" | null;
  runtimeStatePatch: Record<string, unknown>;
  runtimeStateChanged: boolean;
  warnings: string[];
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasAnyKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

function mergeRuntimeStateJson(
  currentState: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const currentControlPlane = asObject(currentState.controlPlane);
  const patchControlPlane = asObject(patch.controlPlane);

  return {
    ...currentState,
    ...patch,
    ...(hasAnyKeys(patchControlPlane)
      ? {
          controlPlane: {
            ...currentControlPlane,
            ...patchControlPlane,
          },
        }
      : {}),
  };
}

function pickFirstObject(
  candidates: Array<Record<string, unknown> | null | undefined>,
): Record<string, unknown> | null {
  for (const candidate of candidates) {
    const obj = asObject(candidate);
    if (hasAnyKeys(obj)) return obj;
  }
  return null;
}

function normalizeBucketInput(
  value: unknown,
  fallbackSnapshotAt: string,
): Record<string, unknown> | null {
  if (typeof value === "string") {
    return {
      state: value,
      snapshotAt: fallbackSnapshotAt,
    };
  }

  const record = asObject(value);
  if (!hasAnyKeys(record)) return null;

  return {
    state: asString(record.state) ?? asString(record.status) ?? undefined,
    usagePercent:
      record.usagePercent ??
      record.usagePct ??
      record.utilizationPercent ??
      undefined,
    exhausted: record.exhausted ?? undefined,
    cooldown: record.cooldown ?? record.cooldownActive ?? undefined,
    resetAt: asString(record.resetAt) ?? undefined,
    snapshotAt:
      asString(record.snapshotAt) ??
      asString(record.capturedAt) ??
      fallbackSnapshotAt,
  };
}

function normalizeQuotaFeedToSnapshot(input: {
  quotaFeed: Record<string, unknown>;
  fallbackAccountLabel: string | null;
  nowIso: string;
}): Record<string, unknown> {
  const quotaFeed = input.quotaFeed;
  const normalized: Record<string, unknown> = {};

  const accountLabel =
    asString(quotaFeed.accountLabel) ??
    asString(quotaFeed.account) ??
    asString(quotaFeed.accountName) ??
    input.fallbackAccountLabel;
  if (accountLabel) normalized.accountLabel = accountLabel;

  const snapshotAt =
    asString(quotaFeed.snapshotAt) ??
    asString(quotaFeed.capturedAt) ??
    asString(quotaFeed.timestamp) ??
    asString(quotaFeed.updatedAt) ??
    input.nowIso;
  normalized.snapshotAt = snapshotAt;

  const resetAt =
    asString(quotaFeed.resetAt) ??
    asString(quotaFeed.windowResetAt) ??
    asString(quotaFeed.nextResetAt);
  if (resetAt) normalized.resetAt = resetAt;

  const resetReason =
    asString(quotaFeed.resetReason) ??
    asString(quotaFeed.windowReason) ??
    asString(quotaFeed.reason);
  if (resetReason) normalized.resetReason = resetReason;

  const bucketsRaw = pickFirstObject([
    asObject(quotaFeed.buckets),
    asObject(quotaFeed.bucketState),
    asObject(quotaFeed.bucketStates),
  ]);

  const buckets: Record<string, unknown> = {};
  for (const bucket of ["flash", "pro", "flash-lite"] as const) {
    const fromBuckets = bucketsRaw
      ? normalizeBucketInput(bucketsRaw[bucket], snapshotAt)
      : null;
    const fromTopLevel = normalizeBucketInput(quotaFeed[bucket], snapshotAt);
    const normalizedBucket = fromBuckets ?? fromTopLevel;
    if (normalizedBucket) {
      buckets[bucket] = normalizedBucket;
    }
  }

  if (Object.keys(buckets).length > 0) {
    normalized.buckets = buckets;
  }

  return normalized;
}

function extractQuotaFeedFromAdapterResult(
  resultJson: unknown,
): Record<string, unknown> | null {
  const raw = asObject(resultJson);
  if (!hasAnyKeys(raw)) return null;

  return pickFirstObject([
    asObject(raw.quotaSnapshot),
    asObject(raw.quota),
    asObject(asObject(raw.stats).quota),
    asObject(asObject(raw.usage).quota),
    asObject(asObject(raw.result).quota),
    asObject(asObject(raw.resultEvent).quota),
  ]);
}

export function refreshGeminiRuntimeQuotaSnapshot(
  input: GeminiQuotaRefreshInput,
): GeminiQuotaRefreshResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const runtimeConfig = asObject(input.runtimeConfig);
  const runtimeState = asObject(input.runtimeState);
  const runtimeRouting = asObject(runtimeConfig.routingPolicy);
  const controlPlaneState = asObject(runtimeState.controlPlane);

  const runtimeQuotaFeed = asObject(runtimeRouting.quotaFeed);
  const existingQuotaSnapshot = asObject(controlPlaneState.quotaSnapshot);
  const existingStaleness = asObject(controlPlaneState.staleness);
  const existingRefreshMeta = asObject(controlPlaneState.refresh);
  const adapterQuotaFeed = extractQuotaFeedFromAdapterResult(
    input.adapterResultJson,
  );

  const refreshFeed =
    adapterQuotaFeed ??
    (hasAnyKeys(runtimeQuotaFeed) ? runtimeQuotaFeed : null);
  const refreshSource = adapterQuotaFeed
    ? "adapter_result_feed"
    : hasAnyKeys(runtimeQuotaFeed)
    ? "runtime_quota_feed"
    : null;

  let refreshed = false;
  let normalizedSnapshot: Record<string, unknown> | null = null;
  if (refreshFeed) {
    normalizedSnapshot = normalizeQuotaFeedToSnapshot({
      quotaFeed: refreshFeed,
      fallbackAccountLabel: asString(runtimeRouting.accountLabel),
      nowIso,
    });
    refreshed = true;
  } else if (hasAnyKeys(existingQuotaSnapshot)) {
    normalizedSnapshot = existingQuotaSnapshot;
  }

  const refreshMeta = {
    ...existingRefreshMeta,
    lastTrigger: input.trigger,
    lastCheckedAt: nowIso,
    ...(refreshed
      ? {
          lastRefreshAt: nowIso,
          lastRefreshSource: refreshSource,
        }
      : {}),
  };

  const ingestionRuntimeConfig: Record<string, unknown> = {
    ...runtimeConfig,
    routingPolicy: {
      ...runtimeRouting,
      ...(normalizedSnapshot ? { quotaSnapshot: normalizedSnapshot } : {}),
      quotaStaleness: {
        ...asObject(runtimeRouting.quotaStaleness),
        ...existingStaleness,
        ...refreshMeta,
      },
    },
  };

  const snapshot = ingestGeminiQuotaSnapshot(ingestionRuntimeConfig, nowIso);
  const runtimeStatePatch: Record<string, unknown> = {
    controlPlane: {
      ...controlPlaneState,
      quotaSnapshot: normalizedSnapshot,
      staleness: {
        ...existingStaleness,
        isStale: snapshot.isStale,
        staleReason: snapshot.staleReason,
        maxAgeSec: snapshot.maxAgeSec,
        ageSec: snapshot.ageSec,
        snapshotAt: snapshot.snapshotAt,
        resetAt: snapshot.resetAt,
      },
      refresh: refreshMeta,
      quota: {
        ...asObject(controlPlaneState.quota),
        source: snapshot.source,
        accountLabel: snapshot.accountLabel,
        snapshotAt: snapshot.snapshotAt,
        resetAt: snapshot.resetAt,
        resetReason: snapshot.resetReason,
        isStale: snapshot.isStale,
        staleReason: snapshot.staleReason,
        maxAgeSec: snapshot.maxAgeSec,
        ageSec: snapshot.ageSec,
        buckets: snapshot.buckets,
      },
    },
  };

  const nextStateJson = mergeRuntimeStateJson(runtimeState, runtimeStatePatch);
  const runtimeStateChanged =
    JSON.stringify(runtimeState) !== JSON.stringify(nextStateJson);

  const warnings: string[] = [];
  if (snapshot.isStale && snapshot.staleReason) {
    warnings.push(`quota_snapshot_stale:${snapshot.staleReason}`);
  }
  if (!refreshSource) {
    warnings.push("quota_refresh_source_missing");
  }

  return {
    snapshot,
    refreshed,
    refreshSource,
    runtimeStatePatch,
    runtimeStateChanged,
    warnings,
  };
}
