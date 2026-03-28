import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Company } from "@paperclipai/shared";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_CONSOLE_LOG = console.log;
const ORIGINAL_CONSOLE_ERROR = console.error;

const DGDH_COMPANY_NAME = "David Geib Digitales Handwerk";

// Inline type definition to avoid dependency issues
interface TriadPreflightResponse {
  allRolesPresent: boolean;
  allAgentsIdle: boolean;
  triadReady: boolean;
  roles: Array<{
    roleTemplateId: string;
    present: boolean;
    agentId: string | null;
    agentName: string | null;
    status: string | null;
  }>;
  blockers: string[];
}

describe("runtime status command", () => {
  let logs: string[] = [];
  let errors: string[] = [];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PAPERCLIP_API_URL;
    logs = [];
    errors = [];
    console.log = (msg: string) => { logs.push(msg); };
    console.error = (msg: string) => { errors.push(msg); };
    
    // Mock global fetch
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    console.log = ORIGINAL_CONSOLE_LOG;
    console.error = ORIGINAL_CONSOLE_ERROR;
    vi.restoreAllMocks();
  });

  async function runStatusCommand(options: { apiUrl?: string } = {}): Promise<{ exitCode: number }> {
    // Dynamically import the module to get fresh instance with mocked fetch
    const { runtimeStatus } = await import("../commands/runtime/status.js");
    const result = await runtimeStatus(options);
    return { exitCode: result.exitCode };
  }

  it("prints health and preflight status when API responds with seedStatus found", async () => {
    const mockHealthResponse = {
      status: "ok",
      deploymentMode: "local_trusted",
      seedStatus: {
        dgdhCompanyFound: true,
        agentRolesFound: { ceo: true, worker: true, reviewer: true },
      },
    };

    const mockCompanies: Company[] = [
      {
        id: "test-company-id",
        name: DGDH_COMPANY_NAME,
        description: null,
        status: "active",
        issuePrefix: "DGDH",
        issueCounter: 1,
        budgetMonthlyCents: 0,
        spentMonthlyCents: 0,
        requireBoardApprovalForNewAgents: false,
        brandColor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockPreflight: TriadPreflightResponse = {
      allRolesPresent: true,
      allAgentsIdle: true,
      triadReady: true,
      roles: [
        { roleTemplateId: "ceo", present: true, agentId: "ceo-agent", agentName: "CEO Agent", status: "idle" },
        { roleTemplateId: "worker", present: true, agentId: "worker-agent", agentName: "Worker Agent", status: "idle" },
        { roleTemplateId: "reviewer", present: true, agentId: "reviewer-agent", agentName: "Reviewer Agent", status: "idle" },
      ],
      blockers: [],
    };

    // Setup fetch mock to return different responses based on URL
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/health")) {
        return {
          ok: true,
          status: 200,
          json: async () => mockHealthResponse,
          text: async () => JSON.stringify(mockHealthResponse),
        } as Response;
      }
      if (url.includes("/api/companies") && !url.includes("/agents/")) {
        return {
          ok: true,
          status: 200,
          json: async () => mockCompanies,
          text: async () => JSON.stringify(mockCompanies),
        } as Response;
      }
      if (url.includes("/api/companies/test-company-id/agents/triad-preflight")) {
        return {
          ok: true,
          status: 200,
          json: async () => mockPreflight,
          text: async () => JSON.stringify(mockPreflight),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await runStatusCommand({ apiUrl: "http://127.0.0.1:3100" });

    expect(result.exitCode).toBe(0);
    expect(logs.length).toBeGreaterThan(0);
    
    // Verify health status is printed
    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("http://127.0.0.1:3100");
    expect(combinedLogs).toContain("ok");
    expect(combinedLogs).toContain("local_trusted");
    expect(combinedLogs).toContain("DGDH Company");
    
    // Verify preflight status is printed
    expect(combinedLogs).toContain("Triad Ready");
    expect(combinedLogs).toContain("All Roles Present");
    expect(combinedLogs).toContain("All Agents Idle");
  });

  it("exits non-zero when health endpoint is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("Connection refused"));

    const result = await runStatusCommand({ apiUrl: "http://127.0.0.1:3100" });

    expect(result.exitCode).not.toBe(0);
    expect(errors.length).toBeGreaterThan(0);
    const combinedErrors = errors.join(" ");
    expect(combinedErrors).toContain("Connection refused");
  });

  it("exits 0 when API responds but seedStatus.dgdhCompanyFound is false", async () => {
    const mockHealthResponse = {
      status: "ok",
      deploymentMode: "local_trusted",
      seedStatus: {
        dgdhCompanyFound: false,
        agentRolesFound: { ceo: false, worker: false, reviewer: false },
      },
    };

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/health")) {
        return {
          ok: true,
          status: 200,
          json: async () => mockHealthResponse,
          text: async () => JSON.stringify(mockHealthResponse),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await runStatusCommand({ apiUrl: "http://127.0.0.1:3100" });

    expect(result.exitCode).toBe(0);
    expect(logs.length).toBeGreaterThan(0);
    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("DGDH Company");
    expect(combinedLogs).toContain("not found");
  });

  it("exits 0 when API responds but triadReady is false with blockers", async () => {
    const mockHealthResponse = {
      status: "ok",
      deploymentMode: "local_trusted",
      seedStatus: {
        dgdhCompanyFound: true,
        agentRolesFound: { ceo: true, worker: true, reviewer: true },
      },
    };

    const mockCompanies: Company[] = [
      {
        id: "test-company-id",
        name: DGDH_COMPANY_NAME,
        description: null,
        status: "active",
        issuePrefix: "DGDH",
        issueCounter: 1,
        budgetMonthlyCents: 0,
        spentMonthlyCents: 0,
        requireBoardApprovalForNewAgents: false,
        brandColor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockPreflight: TriadPreflightResponse = {
      allRolesPresent: true,
      allAgentsIdle: false,
      triadReady: false,
      roles: [
        { roleTemplateId: "ceo", present: true, agentId: "ceo-agent", agentName: "CEO Agent", status: "running" },
        { roleTemplateId: "worker", present: true, agentId: "worker-agent", agentName: "Worker Agent", status: "idle" },
        { roleTemplateId: "reviewer", present: true, agentId: "reviewer-agent", agentName: "Reviewer Agent", status: "idle" },
      ],
      blockers: ["CEO agent is not idle (status: running)"],
    };

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/health")) {
        return {
          ok: true,
          status: 200,
          json: async () => mockHealthResponse,
          text: async () => JSON.stringify(mockHealthResponse),
        } as Response;
      }
      if (url.includes("/api/companies") && !url.includes("/agents/")) {
        return {
          ok: true,
          status: 200,
          json: async () => mockCompanies,
          text: async () => JSON.stringify(mockCompanies),
        } as Response;
      }
      if (url.includes("/api/companies/test-company-id/agents/triad-preflight")) {
        return {
          ok: true,
          status: 200,
          json: async () => mockPreflight,
          text: async () => JSON.stringify(mockPreflight),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await runStatusCommand({ apiUrl: "http://127.0.0.1:3100" });

    expect(result.exitCode).toBe(0);
    expect(logs.length).toBeGreaterThan(0);
    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("Triad Ready");
    expect(combinedLogs).toContain("All Agents Idle");
    expect(combinedLogs).toContain("CEO agent is not idle");
  });

  it("uses PAPERCLIP_API_URL env var when --api-url is not provided", async () => {
    process.env.PAPERCLIP_API_URL = "http://env-api:3200";

    const mockHealthResponse = {
      status: "ok",
      seedStatus: { dgdhCompanyFound: false, agentRolesFound: {} },
    };

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/health") && url.includes("3200")) {
        return {
          ok: true,
          status: 200,
          json: async () => mockHealthResponse,
          text: async () => JSON.stringify(mockHealthResponse),
        } as Response;
      }
      throw new Error(`Connection refused to ${url}`);
    });

    const result = await runStatusCommand();

    expect(result.exitCode).toBe(0);
    expect(logs.some(log => log.includes("http://env-api:3200"))).toBe(true);
  });
});
