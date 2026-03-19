type BucketName = "flash" | "pro" | "flash-lite";
type BucketState = "ok" | "cooldown" | "exhausted" | "unknown";

export interface GeminiQuotaBucketSnapshot {
  state: BucketState;
  usagePercent: number | null;
  exhausted: boolean | null;
  cooldown: boolean | null;
  resetAt: string | null;
  snapshotAt: string | null;
}

export interface GeminiQuotaSnapshot {
  source: "runtime_quota_snapshot" | "runtime_bucket_state" | "none";
  accountLabel: string | null;
  snapshotAt: string | null;
  resetAt: string | null;
  resetReason: string | null;
  buckets: Partial<Record<BucketName, GeminiQuotaBucketSnapshot>>;
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

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function clampUsagePercent(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseBucketState(value: unknown): BucketState | null {
  const normalized = asString(value);
  if (
    normalized === "ok" ||
    normalized === "cooldown" ||
    normalized === "exhausted" ||
    normalized === "unknown"
  ) {
    return normalized;
  }
  return null;
}

function deriveStateFromFlags(input: {
  explicitState: BucketState | null;
  exhausted: boolean | null;
  cooldown: boolean | null;
}): BucketState {
  if (input.explicitState) return input.explicitState;
  if (input.exhausted === true) return "exhausted";
  if (input.cooldown === true) return "cooldown";
  return "unknown";
}

function readBucketSnapshot(
  bucketData: Record<string, unknown>,
): GeminiQuotaBucketSnapshot {
  const explicitState = parseBucketState(bucketData.state);
  const exhausted = asBoolean(bucketData.exhausted);
  const cooldown =
    asBoolean(bucketData.cooldown) ?? asBoolean(bucketData.cooldownActive);

  return {
    state: deriveStateFromFlags({ explicitState, exhausted, cooldown }),
    usagePercent: clampUsagePercent(
      asNumber(bucketData.usagePercent) ??
        asNumber(bucketData.usagePct) ??
        asNumber(bucketData.utilizationPercent),
    ),
    exhausted,
    cooldown,
    resetAt: asString(bucketData.resetAt),
    snapshotAt: asString(bucketData.snapshotAt),
  };
}

function isBucketName(value: string): value is BucketName {
  return value === "flash" || value === "pro" || value === "flash-lite";
}

export function ingestGeminiQuotaSnapshot(
  runtimeConfig: Record<string, unknown>,
  nowIso: string,
): GeminiQuotaSnapshot {
  const runtimeRouting = asObject(runtimeConfig.routingPolicy);
  const rawQuotaSnapshot = asObject(runtimeRouting.quotaSnapshot);
  const rawBucketStates = asObject(runtimeRouting.bucketState);

  const bucketsFromSnapshot = asObject(rawQuotaSnapshot.buckets);

  const buckets: Partial<Record<BucketName, GeminiQuotaBucketSnapshot>> = {};
  for (const bucket of ["flash", "pro", "flash-lite"] as const) {
    const fromSnapshot = asObject(bucketsFromSnapshot[bucket]);
    const hasSnapshotData = Object.keys(fromSnapshot).length > 0;

    if (hasSnapshotData) {
      buckets[bucket] = readBucketSnapshot(fromSnapshot);
      continue;
    }

    const stateFromLegacy = parseBucketState(rawBucketStates[bucket]);
    if (stateFromLegacy) {
      buckets[bucket] = {
        state: stateFromLegacy,
        usagePercent: null,
        exhausted: stateFromLegacy === "exhausted",
        cooldown: stateFromLegacy === "cooldown",
        resetAt: null,
        snapshotAt: asString(rawQuotaSnapshot.snapshotAt) ?? nowIso,
      };
    }
  }

  const hasQuotaSnapshot = Object.keys(rawQuotaSnapshot).length > 0;
  const hasBucketStates = Object.keys(rawBucketStates).length > 0;

  const source: GeminiQuotaSnapshot["source"] = hasQuotaSnapshot
    ? "runtime_quota_snapshot"
    : hasBucketStates
    ? "runtime_bucket_state"
    : "none";

  const accountLabelFromSnapshot =
    asString(rawQuotaSnapshot.accountLabel) ??
    asString(runtimeRouting.accountLabel);

  const snapshotAt = asString(rawQuotaSnapshot.snapshotAt) ?? nowIso;

  const resetAt =
    asString(rawQuotaSnapshot.resetAt) ?? asString(runtimeRouting.resetAt);
  const resetReason =
    asString(rawQuotaSnapshot.resetReason) ??
    asString(runtimeRouting.resetReason);

  // Backfill top-level legacy bucketStates from snapshot.buckets when present.
  for (const [bucket, snapshot] of Object.entries(buckets) as Array<
    [BucketName, GeminiQuotaBucketSnapshot]
  >) {
    const legacyState = parseBucketState(rawBucketStates[bucket]);
    if (!legacyState && snapshot.state !== "unknown") {
      rawBucketStates[bucket] = snapshot.state;
    }
  }

  return {
    source,
    accountLabel: accountLabelFromSnapshot,
    snapshotAt,
    resetAt,
    resetReason,
    buckets,
  };
}
