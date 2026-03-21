import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type BucketName = "flash" | "pro" | "flash-lite";

export interface GeminiLiveQuotaBucket {
  usagePercent: number;
  remaining: number | null;
  limit: number | null;
  resetAt: string | null;
  state: "ok" | "exhausted" | "unknown";
}

export interface GeminiLiveQuotaFeed {
  snapshotAt: string;
  accountLabel: string | null;
  buckets: Partial<Record<BucketName, GeminiLiveQuotaBucket>>;
}

// Maps API model IDs to our 3 bucket names.
// For each bucket we take the MINIMUM remaining fraction across all models
// in that pool — the most conservative estimate.
const MODEL_TO_BUCKET: Record<string, BucketName> = {
  "gemini-2.5-flash": "flash",
  "gemini-3-flash-preview": "flash",
  "gemini-3.1-flash-preview": "flash",
  "gemini-2.5-flash-lite": "flash-lite",
  "gemini-3.1-flash-lite-preview": "flash-lite",
  "gemini-3-flash-lite-preview": "flash-lite",
  "gemini-2.5-pro": "pro",
  "gemini-3.1-pro-preview": "pro",
  "gemini-3-pro-preview": "pro",
};

// OAuth client for the Gemini CLI — loaded from environment.
// Set GEMINI_OAUTH_CLIENT_ID and GEMINI_OAUTH_CLIENT_SECRET before starting the server.
const OAUTH_CLIENT_ID =
  process.env.GEMINI_OAUTH_CLIENT_ID ?? "";
const OAUTH_CLIENT_SECRET =
  process.env.GEMINI_OAUTH_CLIENT_SECRET ?? "";
const QUOTA_API_URL =
  "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota";
const TOKEN_REFRESH_URL = "https://oauth2.googleapis.com/token";

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

interface QuotaCache {
  result: GeminiLiveQuotaFeed;
  fetchedAt: number;
}

const cacheByCredsPath = new Map<string, QuotaCache>();

interface OAuthCreds {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
}

const LOAD_CODE_ASSIST_URL =
  "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";

function readCredsFile(credsPath: string): OAuthCreds | null {
  try {
    const raw = fs.readFileSync(credsPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).access_token !== "string"
    ) {
      return null;
    }
    return parsed as OAuthCreds;
  } catch {
    return null;
  }
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(TOKEN_REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: OAUTH_CLIENT_ID,
        client_secret: OAUTH_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const token =
      typeof data.access_token === "string" ? data.access_token : null;
    return token;
  } catch {
    return null;
  }
}

async function getValidToken(creds: OAuthCreds): Promise<string | null> {
  const bufferMs = 60_000; // refresh if expiring within 60s
  const isExpired =
    creds.expiry_date !== undefined &&
    Date.now() > creds.expiry_date - bufferMs;

  if (!isExpired) return creds.access_token;
  if (!creds.refresh_token) return creds.access_token; // try anyway

  const refreshed = await refreshAccessToken(creds.refresh_token);
  return refreshed ?? creds.access_token;
}

interface ApiBucket {
  modelId?: string;
  remainingFraction?: number;
  remainingAmount?: string;
  resetTime?: string;
  tokenType?: string;
}

interface ApiResponse {
  buckets?: ApiBucket[];
}

let cachedProjectId: string | null = null;

async function resolveProjectId(token: string): Promise<string | null> {
  if (cachedProjectId) return cachedProjectId;
  try {
    const res = await fetch(LOAD_CODE_ASSIST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metadata: {} }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const projectId =
      typeof data.cloudaicompanionProject === "string"
        ? data.cloudaicompanionProject
        : null;
    if (projectId) cachedProjectId = projectId;
    return projectId;
  } catch {
    return null;
  }
}

function buildQuotaFeed(
  data: ApiResponse,
  snapshotAt: string,
): GeminiLiveQuotaFeed {
  // Track minimum remaining fraction per bucket (most conservative)
  const minFraction: Partial<Record<BucketName, number>> = {};
  const resetAt: Partial<Record<BucketName, string>> = {};
  const remaining: Partial<Record<BucketName, number>> = {};
  const limit: Partial<Record<BucketName, number>> = {};

  for (const bucket of data.buckets ?? []) {
    const modelId = bucket.modelId?.trim();
    if (!modelId) continue;
    const bucketName = MODEL_TO_BUCKET[modelId];
    if (!bucketName) continue;

    const fraction = bucket.remainingFraction;
    if (fraction === undefined || fraction === null) continue;

    const current = minFraction[bucketName];
    if (current === undefined || fraction < current) {
      minFraction[bucketName] = fraction;
      if (bucket.resetTime) resetAt[bucketName] = bucket.resetTime;

      if (bucket.remainingAmount) {
        const rem = parseInt(bucket.remainingAmount, 10);
        if (!isNaN(rem)) {
          remaining[bucketName] = rem;
          if (fraction > 0) {
            limit[bucketName] = Math.round(rem / fraction);
          }
        }
      }
    }
  }

  const buckets: Partial<Record<BucketName, GeminiLiveQuotaBucket>> = {};
  for (const name of ["flash", "pro", "flash-lite"] as const) {
    const fraction = minFraction[name];
    if (fraction === undefined) continue;
    const usagePercent = Math.round((1 - fraction) * 100);
    buckets[name] = {
      usagePercent,
      remaining: remaining[name] ?? null,
      limit: limit[name] ?? null,
      resetAt: resetAt[name] ?? null,
      state: fraction === 0 ? "exhausted" : "ok",
    };
  }

  return {
    snapshotAt,
    accountLabel: null,
    buckets,
  };
}

export async function fetchLiveGeminiQuota(
  credsPath?: string,
): Promise<GeminiLiveQuotaFeed | null> {
  const resolvedCredsPath =
    credsPath ?? path.join(os.homedir(), ".gemini", "oauth_creds.json");

  // Check cache first
  const cached = cacheByCredsPath.get(resolvedCredsPath);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.result;
  }

  const creds = readCredsFile(resolvedCredsPath);
  if (!creds) return null;

  const token = await getValidToken(creds);
  if (!token) return null;

  try {
    const projectId = await resolveProjectId(token);
    const res = await fetch(QUOTA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectId ? { project: projectId } : {}),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as ApiResponse;
    if (!data.buckets?.length) return null;

    const snapshotAt = new Date().toISOString();
    const result = buildQuotaFeed(data, snapshotAt);

    cacheByCredsPath.set(resolvedCredsPath, { result, fetchedAt: Date.now() });
    return result;
  } catch {
    return null;
  }
}
