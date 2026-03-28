import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerAgentCommands } from "../commands/client/agent.js";
import * as common from "../commands/client/common.js";
import type { Agent } from "@paperclipai/shared";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_CONSOLE_LOG = console.log;
const ORIGINAL_CONSOLE_ERROR = console.error;

// Mock the common module
vi.mock("../commands/client/common.js", async () => {
  const actual = await vi.importActual("../commands/client/common.js");
  return {
    ...(actual as any),
    resolveCommandContext: vi.fn(),
  };
});

// Types for API responses
interface AgentHealthResponse {
  companyId: string;
  count: number;
  summary: {
    countsByHealthStatus: Record<string, number>;
    countsByBudgetStatus: Record<string, number>;
    highestSeverity: string;
    atRiskAgents: string[];
  };
  agents: Array<{
    agentId: string;
    agentName: string;
    role: string;
    adapterType: string;
    agentStatus: string;
    healthStatus: string;
    budgetStatus: string;
    usedTokens: number;
    softCapTokens: number;
    hardCapTokens: number;
    totalCostCents: number;
    lastRun: {
      id: string;
      status: string;
      stopReason: string | null;
      finishedAt: string | null;
      createdAt: string;
    } | null;
  }>;
}

interface LiveRun {
  id: string;
  status: string;
  invocationSource: string;
  triggerDetail: string;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
  agentId: string;
  agentName: string;
  adapterType: string;
  issueId: string | null;
}

describe("agent status command", () => {
  let logs: string[] = [];
  let errors: string[] = [];
  const mockApi = {
    get: vi.fn(),
  };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PAPERCLIP_API_URL;
    delete process.env.PAPERCLIP_COMPANY_ID;
    logs = [];
    errors = [];
    console.log = (msg: string) => { logs.push(String(msg)); };
    console.error = (msg: string) => { errors.push(String(msg)); };
    vi.clearAllMocks();
    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: "test-company-id",
      json: false,
    });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    console.log = ORIGINAL_CONSOLE_LOG;
    console.error = ORIGINAL_CONSOLE_ERROR;
    vi.restoreAllMocks();
  });

  it("shows agent status with idle agents displaying last run info", async () => {
    const program = new Command();
    registerAgentCommands(program);

    const mockAgents: Agent[] = [
      {
        id: "agent-1",
        companyId: "test-company-id",
        name: "CEO Agent",
        urlKey: "ceo-agent",
        role: "ceo",
        title: null,
        icon: null,
        status: "idle",
        reportsTo: null,
        capabilities: null,
        adapterType: "gemini_local",
        adapterConfig: {},
        runtimeConfig: {},
        budgetMonthlyCents: 10000,
        spentMonthlyCents: 500,
        permissions: { canCreateAgents: true },
        lastHeartbeatAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "agent-2",
        companyId: "test-company-id",
        name: "Worker",
        urlKey: "worker-agent",
        role: "engineer",
        title: null,
        icon: null,
        status: "idle",
        reportsTo: null,
        capabilities: null,
        adapterType: "gemini_local",
        adapterConfig: {},
        runtimeConfig: {},
        budgetMonthlyCents: 10000,
        spentMonthlyCents: 300,
        permissions: { canCreateAgents: false },
        lastHeartbeatAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockHealth: AgentHealthResponse = {
      companyId: "test-company-id",
      count: 2,
      summary: {
        countsByHealthStatus: { ok: 2 },
        countsByBudgetStatus: { healthy: 2 },
        highestSeverity: "ok",
        atRiskAgents: [],
      },
      agents: [
        {
          agentId: "agent-1",
          agentName: "CEO Agent",
          role: "ceo",
          adapterType: "gemini_local",
          agentStatus: "idle",
          healthStatus: "ok",
          budgetStatus: "healthy",
          usedTokens: 1000,
          softCapTokens: 5000,
          hardCapTokens: 10000,
          totalCostCents: 50,
          lastRun: {
            id: "run-1",
            status: "succeeded",
            stopReason: "completed",
            finishedAt: "2026-03-28T10:00:00.000Z",
            createdAt: "2026-03-28T09:00:00.000Z",
          },
        },
        {
          agentId: "agent-2",
          agentName: "Worker",
          role: "engineer",
          adapterType: "gemini_local",
          agentStatus: "idle",
          healthStatus: "ok",
          budgetStatus: "healthy",
          usedTokens: 500,
          softCapTokens: 5000,
          hardCapTokens: 10000,
          totalCostCents: 25,
          lastRun: {
            id: "run-2",
            status: "succeeded",
            stopReason: "completed",
            finishedAt: "2026-03-28T09:30:00.000Z",
            createdAt: "2026-03-28T08:30:00.000Z",
          },
        },
      ],
    };

    const mockLiveRuns: LiveRun[] = []; // No running agents

    mockApi.get
      .mockResolvedValueOnce(mockAgents) // /api/companies/:id/agents
      .mockResolvedValueOnce(mockHealth) // /api/companies/:id/agents/health
      .mockResolvedValueOnce(mockLiveRuns); // /api/companies/:id/live-runs

    await program.parseAsync([
      "node",
      "test",
      "agent",
      "status",
      "--company-id",
      "test-company-id",
    ]);

    // Verify API calls
    expect(mockApi.get).toHaveBeenCalledTimes(3);
    expect(mockApi.get).toHaveBeenNthCalledWith(1, "/api/companies/test-company-id/agents");
    expect(mockApi.get).toHaveBeenNthCalledWith(2, "/api/companies/test-company-id/agents/health");
    expect(mockApi.get).toHaveBeenNthCalledWith(3, "/api/companies/test-company-id/live-runs");

    // Verify output contains expected agent info
    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("CEO Agent");
    expect(combinedLogs).toContain("agent-1");
    expect(combinedLogs).toContain("ceo");
    expect(combinedLogs).toContain("idle");
    expect(combinedLogs).toContain("Worker");
    expect(combinedLogs).toContain("agent-2");
    expect(combinedLogs).toContain("engineer");
  });

  it("shows running agents with current run info", async () => {
    const program = new Command();
    registerAgentCommands(program);

    const mockAgents: Agent[] = [
      {
        id: "agent-1",
        companyId: "test-company-id",
        name: "CEO Agent",
        urlKey: "ceo-agent",
        role: "ceo",
        title: null,
        icon: null,
        status: "running",
        reportsTo: null,
        capabilities: null,
        adapterType: "gemini_local",
        adapterConfig: {},
        runtimeConfig: {},
        budgetMonthlyCents: 10000,
        spentMonthlyCents: 500,
        permissions: { canCreateAgents: true },
        lastHeartbeatAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockHealth: AgentHealthResponse = {
      companyId: "test-company-id",
      count: 1,
      summary: {
        countsByHealthStatus: { ok: 1 },
        countsByBudgetStatus: { healthy: 1 },
        highestSeverity: "ok",
        atRiskAgents: [],
      },
      agents: [
        {
          agentId: "agent-1",
          agentName: "CEO Agent",
          role: "ceo",
          adapterType: "gemini_local",
          agentStatus: "running",
          healthStatus: "ok",
          budgetStatus: "healthy",
          usedTokens: 1000,
          softCapTokens: 5000,
          hardCapTokens: 10000,
          totalCostCents: 50,
          lastRun: {
            id: "run-1",
            status: "succeeded",
            stopReason: "completed",
            finishedAt: "2026-03-28T09:00:00.000Z",
            createdAt: "2026-03-28T08:00:00.000Z",
          },
        },
      ],
    };

    const mockLiveRuns: LiveRun[] = [
      {
        id: "run-live-1",
        status: "running",
        invocationSource: "assignment",
        triggerDetail: "system",
        startedAt: "2026-03-28T10:00:00.000Z",
        finishedAt: null,
        createdAt: "2026-03-28T10:00:00.000Z",
        agentId: "agent-1",
        agentName: "CEO Agent",
        adapterType: "gemini_local",
        issueId: "issue-123",
      },
    ];

    mockApi.get
      .mockResolvedValueOnce(mockAgents)
      .mockResolvedValueOnce(mockHealth)
      .mockResolvedValueOnce(mockLiveRuns);

    await program.parseAsync([
      "node",
      "test",
      "agent",
      "status",
      "--company-id",
      "test-company-id",
    ]);

    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("CEO Agent");
    expect(combinedLogs).toContain("running");
    expect(combinedLogs).toContain("run-live-1");
    expect(combinedLogs).toContain("issue-123");
  });

  it("produces valid JSON output with --json flag", async () => {
    const program = new Command();
    registerAgentCommands(program);

    const mockAgents: Agent[] = [
      {
        id: "agent-1",
        companyId: "test-company-id",
        name: "CEO Agent",
        urlKey: "ceo-agent",
        role: "ceo",
        title: null,
        icon: null,
        status: "idle",
        reportsTo: null,
        capabilities: null,
        adapterType: "gemini_local",
        adapterConfig: {},
        runtimeConfig: {},
        budgetMonthlyCents: 10000,
        spentMonthlyCents: 500,
        permissions: { canCreateAgents: true },
        lastHeartbeatAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockHealth: AgentHealthResponse = {
      companyId: "test-company-id",
      count: 1,
      summary: {
        countsByHealthStatus: { ok: 1 },
        countsByBudgetStatus: { healthy: 1 },
        highestSeverity: "ok",
        atRiskAgents: [],
      },
      agents: [
        {
          agentId: "agent-1",
          agentName: "CEO Agent",
          role: "ceo",
          adapterType: "gemini_local",
          agentStatus: "idle",
          healthStatus: "ok",
          budgetStatus: "healthy",
          usedTokens: 1000,
          softCapTokens: 5000,
          hardCapTokens: 10000,
          totalCostCents: 50,
          lastRun: {
            id: "run-1",
            status: "succeeded",
            stopReason: "completed",
            finishedAt: "2026-03-28T10:00:00.000Z",
            createdAt: "2026-03-28T09:00:00.000Z",
          },
        },
      ],
    };

    const mockLiveRuns: LiveRun[] = [];

    mockApi.get
      .mockResolvedValueOnce(mockAgents)
      .mockResolvedValueOnce(mockHealth)
      .mockResolvedValueOnce(mockLiveRuns);

    // Update mock to return json: true
    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: "test-company-id",
      json: true,
    });

    await program.parseAsync([
      "node",
      "test",
      "agent",
      "status",
      "--company-id",
      "test-company-id",
      "--json",
    ]);

    // Verify JSON output is parseable
    const jsonOutput = logs.find((log) => log.startsWith("{"));
    expect(jsonOutput).toBeDefined();
    
    const parsed = JSON.parse(jsonOutput!);
    expect(parsed).toHaveProperty("companyId");
    expect(parsed).toHaveProperty("triadReady");
    expect(parsed).toHaveProperty("agents");
    expect(Array.isArray(parsed.agents)).toBe(true);
    expect(parsed.agents).toHaveLength(1);
    expect(parsed.agents[0]).toHaveProperty("id");
    expect(parsed.agents[0]).toHaveProperty("name");
    expect(parsed.agents[0]).toHaveProperty("role");
    expect(parsed.agents[0]).toHaveProperty("status");
  });

  it("shows triad readiness indicator when all three roles present", async () => {
    const program = new Command();
    registerAgentCommands(program);

    const mockAgents: Agent[] = [
      {
        id: "ceo-agent",
        companyId: "test-company-id",
        name: "CEO",
        urlKey: "ceo",
        role: "ceo",
        title: null,
        icon: null,
        status: "idle",
        reportsTo: null,
        capabilities: null,
        adapterType: "gemini_local",
        adapterConfig: {},
        runtimeConfig: {},
        budgetMonthlyCents: 10000,
        spentMonthlyCents: 500,
        permissions: { canCreateAgents: true },
        lastHeartbeatAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "worker-agent",
        companyId: "test-company-id",
        name: "Worker",
        urlKey: "worker",
        role: "engineer",
        title: null,
        icon: null,
        status: "idle",
        reportsTo: null,
        capabilities: null,
        adapterType: "gemini_local",
        adapterConfig: {},
        runtimeConfig: {},
        budgetMonthlyCents: 10000,
        spentMonthlyCents: 300,
        permissions: { canCreateAgents: false },
        lastHeartbeatAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "reviewer-agent",
        companyId: "test-company-id",
        name: "Reviewer",
        urlKey: "reviewer",
        role: "qa",
        title: null,
        icon: null,
        status: "idle",
        reportsTo: null,
        capabilities: null,
        adapterType: "gemini_local",
        adapterConfig: {},
        runtimeConfig: {},
        budgetMonthlyCents: 10000,
        spentMonthlyCents: 200,
        permissions: { canCreateAgents: false },
        lastHeartbeatAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockHealth: AgentHealthResponse = {
      companyId: "test-company-id",
      count: 3,
      summary: {
        countsByHealthStatus: { ok: 3 },
        countsByBudgetStatus: { healthy: 3 },
        highestSeverity: "ok",
        atRiskAgents: [],
      },
      agents: mockAgents.map((a) => ({
        agentId: a.id,
        agentName: a.name,
        role: a.role,
        adapterType: a.adapterType,
        agentStatus: a.status,
        healthStatus: "ok",
        budgetStatus: "healthy",
        usedTokens: 1000,
        softCapTokens: 5000,
        hardCapTokens: 10000,
        totalCostCents: 50,
        lastRun: {
          id: `run-${a.id}`,
          status: "succeeded",
          stopReason: "completed",
          finishedAt: "2026-03-28T10:00:00.000Z",
          createdAt: "2026-03-28T09:00:00.000Z",
        },
      })),
    };

    const mockLiveRuns: LiveRun[] = [];

    mockApi.get
      .mockResolvedValueOnce(mockAgents)
      .mockResolvedValueOnce(mockHealth)
      .mockResolvedValueOnce(mockLiveRuns);

    await program.parseAsync([
      "node",
      "test",
      "agent",
      "status",
      "--company-id",
      "test-company-id",
    ]);

    const combinedLogs = logs.join(" ");
    expect(combinedLogs.toLowerCase()).toContain("triad");
  });

  it("handles empty agent list gracefully", async () => {
    const program = new Command();
    registerAgentCommands(program);

    const mockAgents: Agent[] = [];
    const mockHealth: AgentHealthResponse = {
      companyId: "test-company-id",
      count: 0,
      summary: {
        countsByHealthStatus: {},
        countsByBudgetStatus: {},
        highestSeverity: "ok",
        atRiskAgents: [],
      },
      agents: [],
    };
    const mockLiveRuns: LiveRun[] = [];

    mockApi.get
      .mockResolvedValueOnce(mockAgents)
      .mockResolvedValueOnce(mockHealth)
      .mockResolvedValueOnce(mockLiveRuns);

    await program.parseAsync([
      "node",
      "test",
      "agent",
      "status",
      "--company-id",
      "test-company-id",
    ]);

    const combinedLogs = logs.join(" ");
    // Should handle empty state without errors
    expect(errors).toHaveLength(0);
  });

  it("exits with error when company ID is missing", async () => {
    const program = new Command();
    registerAgentCommands(program);

    // Override process.exit to capture exit code
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });

    // Override console.error to suppress output during test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock to throw when companyId is missing
    (common.resolveCommandContext as any).mockImplementation(() => {
      throw new Error("Company ID is required");
    });

    try {
      await program.parseAsync(["node", "test", "agent", "status"]);
    } catch (err) {
      // Expected to throw
    }

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
