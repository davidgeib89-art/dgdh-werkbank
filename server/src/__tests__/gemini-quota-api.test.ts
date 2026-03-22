import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../middleware/logger.ts";
import { fetchLiveGeminiQuota } from "../services/gemini-quota-api.ts";

const PRIMARY_CREDS_PATH = "C:/fake/gemini/oauth_creds.json";
const SECONDARY_CREDS_PATH = "C:/fake/gemini/oauth_creds_2.json";

const PRIMARY_FEED = {
  buckets: [
    { modelId: "gemini-3-flash-preview", remainingFraction: 0, remainingAmount: "0" },
    { modelId: "gemini-3.1-pro-preview", remainingFraction: 0, remainingAmount: "0" },
    { modelId: "gemini-3.1-flash-lite-preview", remainingFraction: 0, remainingAmount: "0" },
  ],
};

const SECONDARY_FEED = {
  buckets: [
    { modelId: "gemini-3-flash-preview", remainingFraction: 0.5, remainingAmount: "50" },
    { modelId: "gemini-3.1-pro-preview", remainingFraction: 0.25, remainingAmount: "25" },
  ],
};

afterEach(() => {
  delete process.env.GEMINI_OAUTH_CREDS_2_PATH;
  vi.restoreAllMocks();
});

describe("fetchLiveGeminiQuota", () => {
  it("falls back to account 2 when account 1 is fully exhausted", async () => {
    process.env.GEMINI_OAUTH_CREDS_2_PATH = SECONDARY_CREDS_PATH;

    vi.spyOn(fs, "readFileSync").mockImplementation((credsPath) => {
      if (credsPath === PRIMARY_CREDS_PATH) {
        return JSON.stringify({ access_token: "token-primary" });
      }
      if (credsPath === SECONDARY_CREDS_PATH) {
        return JSON.stringify({ access_token: "token-secondary" });
      }
      throw new Error(`missing creds: ${credsPath}`);
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input, init) => {
        const url = String(input);
        const headers = new Headers(init?.headers);
        const authorization = headers.get("Authorization");

        if (url.includes("loadCodeAssist")) {
          return new Response(
            JSON.stringify({ cloudaicompanionProject: "project-1" }),
            { status: 200 },
          );
        }

        if (authorization === "Bearer token-primary") {
          return new Response(JSON.stringify(PRIMARY_FEED), { status: 200 });
        }

        if (authorization === "Bearer token-secondary") {
          return new Response(JSON.stringify(SECONDARY_FEED), { status: 200 });
        }

        return new Response("unexpected request", { status: 500 });
      },
    );

    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => logger);

    const quota = await fetchLiveGeminiQuota(PRIMARY_CREDS_PATH);

    expect(quota?.accountLabel).toBe("account_2");
    expect(quota?.buckets.flash?.state).toBe("ok");
    expect(quota?.buckets.pro?.state).toBe("ok");
    expect(warnSpy).toHaveBeenCalledWith(
      {
        event: "gemini_account_failover",
        from: "account_1",
        to: "account_2",
      },
      "Gemini quota failover switched to secondary account",
    );
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("falls back to account 2 when account 1 returns RESOURCE_EXHAUSTED", async () => {
    process.env.GEMINI_OAUTH_CREDS_2_PATH = SECONDARY_CREDS_PATH;

    vi.spyOn(fs, "readFileSync").mockImplementation((credsPath) => {
      if (credsPath === PRIMARY_CREDS_PATH) {
        return JSON.stringify({ access_token: "token-primary" });
      }
      if (credsPath === SECONDARY_CREDS_PATH) {
        return JSON.stringify({ access_token: "token-secondary" });
      }
      throw new Error(`missing creds: ${credsPath}`);
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      const authorization = headers.get("Authorization");

      if (url.includes("loadCodeAssist")) {
        return new Response(
          JSON.stringify({ cloudaicompanionProject: "project-1" }),
          { status: 200 },
        );
      }

      if (authorization === "Bearer token-primary") {
        return new Response(
          JSON.stringify({
            error: {
              code: 429,
              status: "RESOURCE_EXHAUSTED",
            },
          }),
          { status: 429 },
        );
      }

      if (authorization === "Bearer token-secondary") {
        return new Response(JSON.stringify(SECONDARY_FEED), { status: 200 });
      }

      return new Response("unexpected request", { status: 500 });
    });

    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => logger);

    const quota = await fetchLiveGeminiQuota(PRIMARY_CREDS_PATH);

    expect(quota?.accountLabel).toBe("account_2");
    expect(warnSpy).toHaveBeenCalledWith(
      {
        event: "gemini_account_failover",
        from: "account_1",
        to: "account_2",
      },
      "Gemini quota failover switched to secondary account",
    );
  });
});
