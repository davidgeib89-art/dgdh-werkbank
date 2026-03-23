import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalAgentJwt, verifyLocalAgentJwt } from "../agent-auth-jwt.js";

describe("agent local JWT", () => {
  const secretEnv = "PAPERCLIP_AGENT_JWT_SECRET";
  const ttlEnv = "PAPERCLIP_AGENT_JWT_TTL_SECONDS";
  const issuerEnv = "PAPERCLIP_AGENT_JWT_ISSUER";
  const audienceEnv = "PAPERCLIP_AGENT_JWT_AUDIENCE";
  const configEnv = "PAPERCLIP_CONFIG";

  const originalEnv = {
    secret: process.env[secretEnv],
    ttl: process.env[ttlEnv],
    issuer: process.env[issuerEnv],
    audience: process.env[audienceEnv],
    config: process.env[configEnv],
  };

  beforeEach(() => {
    process.env[secretEnv] = "test-secret";
    process.env[ttlEnv] = "3600";
    delete process.env[issuerEnv];
    delete process.env[audienceEnv];
    delete process.env[configEnv];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalEnv.secret === undefined) delete process.env[secretEnv];
    else process.env[secretEnv] = originalEnv.secret;
    if (originalEnv.ttl === undefined) delete process.env[ttlEnv];
    else process.env[ttlEnv] = originalEnv.ttl;
    if (originalEnv.issuer === undefined) delete process.env[issuerEnv];
    else process.env[issuerEnv] = originalEnv.issuer;
    if (originalEnv.audience === undefined) delete process.env[audienceEnv];
    else process.env[audienceEnv] = originalEnv.audience;
    if (originalEnv.config === undefined) delete process.env[configEnv];
    else process.env[configEnv] = originalEnv.config;
  });

  it("creates and verifies a token", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const token = createLocalAgentJwt("agent-1", "company-1", "claude_local", "run-1");
    expect(typeof token).toBe("string");

    const claims = verifyLocalAgentJwt(token!);
    expect(claims).toMatchObject({
      sub: "agent-1",
      company_id: "company-1",
      adapter_type: "claude_local",
      run_id: "run-1",
      iss: "paperclip",
      aud: "paperclip-api",
    });
  });

  it("returns null when secret is missing", () => {
    process.env[secretEnv] = "";
    const token = createLocalAgentJwt("agent-1", "company-1", "claude_local", "run-1");
    expect(token).toBeNull();
    expect(verifyLocalAgentJwt("abc.def.ghi")).toBeNull();
  });

  it("rejects expired tokens", () => {
    process.env[ttlEnv] = "1";
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const token = createLocalAgentJwt("agent-1", "company-1", "claude_local", "run-1");

    vi.setSystemTime(new Date("2026-01-01T00:00:05.000Z"));
    expect(verifyLocalAgentJwt(token!)).toBeNull();
  });

  it("rejects issuer/audience mismatch", () => {
    process.env[issuerEnv] = "custom-issuer";
    process.env[audienceEnv] = "custom-audience";
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const token = createLocalAgentJwt("agent-1", "company-1", "codex_local", "run-1");

    process.env[issuerEnv] = "paperclip";
    process.env[audienceEnv] = "paperclip-api";
    expect(verifyLocalAgentJwt(token!)).toBeNull();
  });

  it("loads jwt config from paperclip env file when runtime env secret is unset", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-jwt-"));
    const configPath = path.join(tempRoot, "config.json");
    const envPath = path.join(tempRoot, ".env");

    try {
      fs.writeFileSync(configPath, "{}\n");
      fs.writeFileSync(
        envPath,
        [
          "PAPERCLIP_AGENT_JWT_SECRET=file-secret",
          "PAPERCLIP_AGENT_JWT_TTL_SECONDS=120",
          "PAPERCLIP_AGENT_JWT_ISSUER=file-issuer",
          "PAPERCLIP_AGENT_JWT_AUDIENCE=file-audience",
          "",
        ].join("\n"),
      );

      delete process.env[secretEnv];
      delete process.env[ttlEnv];
      delete process.env[issuerEnv];
      delete process.env[audienceEnv];
      process.env[configEnv] = configPath;

      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      const token = createLocalAgentJwt("agent-1", "company-1", "claude_local", "run-1");
      expect(typeof token).toBe("string");

      const claims = verifyLocalAgentJwt(token!);
      expect(claims).toMatchObject({
        sub: "agent-1",
        company_id: "company-1",
        adapter_type: "claude_local",
        run_id: "run-1",
        iss: "file-issuer",
        aud: "file-audience",
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("generates and persists a jwt secret when no runtime env or env file exists", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-jwt-generate-"));
    const configPath = path.join(tempRoot, "config.json");
    const envPath = path.join(tempRoot, ".env");

    try {
      fs.writeFileSync(configPath, "{}\n");

      delete process.env[secretEnv];
      delete process.env[ttlEnv];
      delete process.env[issuerEnv];
      delete process.env[audienceEnv];
      process.env[configEnv] = configPath;

      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      const token = createLocalAgentJwt("agent-1", "company-1", "gemini_local", "run-1");

      expect(typeof token).toBe("string");
      expect(fs.existsSync(envPath)).toBe(true);
      const envFile = fs.readFileSync(envPath, "utf8");
      expect(envFile).toContain("PAPERCLIP_AGENT_JWT_SECRET=");
      expect(process.env[secretEnv]).toBeTruthy();

      const claims = verifyLocalAgentJwt(token!);
      expect(claims).toMatchObject({
        sub: "agent-1",
        company_id: "company-1",
        adapter_type: "gemini_local",
        run_id: "run-1",
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
