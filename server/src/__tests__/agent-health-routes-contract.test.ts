import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/error-handler.ts";
import { agentRoutes } from "../routes/agents.ts";

type AgentRow = {
  id: string;
  companyId: string;
  name: string;
  role: string;
  adapterType: string;
  status: string;
};

type RuntimeStateRow = {
  agentId: string;
  companyId: string;
  totalInputTokens: number;
  totalCachedInputTokens: number;
  totalOutputTokens: number;
  totalCostCents: number;
  stateJson: Record<string, unknown>;
};

type LatestRunRow = {
  agentId?: string;
  id: string;
  status: string;
  errorCode: string | null;
  finishedAt: string | null;
  createdAt: string;
  contextSnapshot: Record<string, unknown> | null;
};

const mockState: {
  agentById: Record<string, AgentRow>;
  listByCompany: Record<string, AgentRow[]>;
  runtimeStateByAgent: Record<string, RuntimeStateRow | null>;
  dbSelectRowsQueue: unknown[][];
} = {
  agentById: {},
  listByCompany: {},
  runtimeStateByAgent: {},
  dbSelectRowsQueue: [],
};

function createQuery(rows: unknown[]) {
  let limit: number | null = null;
  const query: any = {
    from: vi.fn(() => query),
    innerJoin: vi.fn(() => query),
    where: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    groupBy: vi.fn(() => query),
    as: vi.fn(() => ({ __subquery: true })),
    limit: vi.fn((value: number) => {
      limit = value;
      return query;
    }),
    then: (onFulfilled: (value: unknown[]) => unknown) => {
      const selected = limit === null ? rows : rows.slice(0, limit);
      return Promise.resolve(onFulfilled(selected));
    },
  };
  return query;
}

vi.mock("../services/index.js", () => ({
  agentService: () => ({
    getById: async (id: string) => mockState.agentById[id] ?? null,
    list: async (companyId: string) => mockState.listByCompany[companyId] ?? [],
    resolveByReference: async (companyId: string, raw: string) => {
      const list = mockState.listByCompany[companyId] ?? [];
      const match = list.find((agent) => agent.name === raw) ?? null;
      return { ambiguous: false, agent: match };
    },
  }),
  accessService: () => ({}),
  approvalService: () => ({}),
  heartbeatService: () => ({
    getRuntimeState: async (id: string) =>
      mockState.runtimeStateByAgent[id] ?? null,
  }),
  issueApprovalService: () => ({}),
  issueService: () => ({}),
  secretService: () => ({
    resolveAdapterConfigForRuntime: async () => ({ config: {} }),
  }),
  logActivity: async () => undefined,
}));

function createDbMock() {
  return {
    select: vi.fn(() => {
      const rows = mockState.dbSelectRowsQueue.shift() ?? [];
      return createQuery(rows);
    }),
  } as any;
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      source: "session",
      isInstanceAdmin: true,
      companyIds: ["c1"],
      userId: "u1",
      runId: null,
    };
    next();
  });
  app.use("/api", agentRoutes(createDbMock()));
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  mockState.agentById = {};
  mockState.listByCompany = {};
  mockState.runtimeStateByAgent = {};
  mockState.dbSelectRowsQueue = [];
});

describe("agent health route contracts", () => {
  it("keeps /agents/:id/health contract fields stable", async () => {
    const agentId = "11111111-1111-4111-8111-111111111111";
    const agent: AgentRow = {
      id: agentId,
      companyId: "c1",
      name: "Alpha",
      role: "coder",
      adapterType: "gemini_local",
      status: "active",
    };
    mockState.agentById[agent.id] = agent;
    mockState.runtimeStateByAgent[agent.id] = {
      agentId: agent.id,
      companyId: agent.companyId,
      totalInputTokens: 30,
      totalCachedInputTokens: 10,
      totalOutputTokens: 20,
      totalCostCents: 42,
      stateJson: {
        quotaSnapshot: { softCapTokens: 200, hardCapTokens: 400 },
      },
    };

    const latestRun: LatestRunRow = {
      id: "run-1",
      status: "succeeded",
      errorCode: null,
      finishedAt: "2026-03-19T13:00:00.000Z",
      createdAt: "2026-03-19T12:59:00.000Z",
      contextSnapshot: {
        paperclipRoutingPreflight: {
          selected: { softCapTokens: 200, hardCapTokens: 400 },
        },
      },
    };
    mockState.dbSelectRowsQueue.push([latestRun]);

    const res = await request(createApp()).get(`/api/agents/${agentId}/health`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      agentId,
      agentName: "Alpha",
      adapterType: "gemini_local",
      healthStatus: expect.any(String),
      budgetStatus: expect.any(String),
      usedTokens: 60,
      softCapTokens: 200,
      hardCapTokens: 400,
      totalCostCents: 42,
      lastRun: {
        id: "run-1",
        status: "succeeded",
        stopReason: "completed",
        finishedAt: "2026-03-19T13:00:00.000Z",
        createdAt: "2026-03-19T12:59:00.000Z",
      },
    });
  });

  it("adds summary to /companies/:companyId/agents/health while keeping agents list", async () => {
    const alphaId = "22222222-2222-4222-8222-222222222222";
    const betaId = "33333333-3333-4333-8333-333333333333";
    const alpha: AgentRow = {
      id: alphaId,
      companyId: "c1",
      name: "Alpha",
      role: "coder",
      adapterType: "gemini_local",
      status: "active",
    };
    const beta: AgentRow = {
      id: betaId,
      companyId: "c1",
      name: "Beta",
      role: "reviewer",
      adapterType: "gemini_local",
      status: "active",
    };

    mockState.listByCompany.c1 = [alpha, beta];
    mockState.runtimeStateByAgent = {
      [alphaId]: {
        agentId: alphaId,
        companyId: "c1",
        totalInputTokens: 120,
        totalCachedInputTokens: 0,
        totalOutputTokens: 0,
        totalCostCents: 15,
        stateJson: {
          quotaSnapshot: { softCapTokens: 100, hardCapTokens: 200 },
        },
      },
      [betaId]: {
        agentId: betaId,
        companyId: "c1",
        totalInputTokens: 20,
        totalCachedInputTokens: 0,
        totalOutputTokens: 0,
        totalCostCents: 3,
        stateJson: {
          quotaSnapshot: { softCapTokens: 100, hardCapTokens: 200 },
        },
      },
    };

    const runtimeRows: RuntimeStateRow[] = [
      mockState.runtimeStateByAgent[alphaId] as RuntimeStateRow,
      mockState.runtimeStateByAgent[betaId] as RuntimeStateRow,
    ];
    const latestRunRows: LatestRunRow[] = [
      {
        agentId: alphaId,
        id: "run-a1",
        status: "failed",
        errorCode: "adapter_timeout",
        finishedAt: "2026-03-19T13:10:00.000Z",
        createdAt: "2026-03-19T13:09:00.000Z",
        contextSnapshot: {
          paperclipRoutingPreflight: {
            selected: { softCapTokens: 100, hardCapTokens: 200 },
          },
        },
      },
      {
        agentId: betaId,
        id: "run-a2",
        status: "succeeded",
        errorCode: null,
        finishedAt: "2026-03-19T13:12:00.000Z",
        createdAt: "2026-03-19T13:11:00.000Z",
        contextSnapshot: {
          paperclipRoutingPreflight: {
            selected: { softCapTokens: 100, hardCapTokens: 200 },
          },
        },
      },
    ];

    // Query order in endpoint:
    // 1) runtime states (top-level)
    // 2) latest joined rows outer select (top-level)
    // 3) latest subquery select (not awaited; rows irrelevant)
    mockState.dbSelectRowsQueue.push(runtimeRows, latestRunRows, []);

    const res = await request(createApp()).get(
      "/api/companies/c1/agents/health",
    );

    expect(res.status).toBe(200);
    expect(res.body.companyId).toBe("c1");
    expect(res.body.count).toBe(2);

    expect(res.body.summary).toMatchObject({
      countsByHealthStatus: expect.any(Object),
      countsByBudgetStatus: expect.any(Object),
      highestSeverity: expect.any(String),
      atRiskAgents: expect.any(Array),
    });

    expect(res.body.summary.countsByHealthStatus.critical).toBe(1);
    expect(res.body.summary.countsByHealthStatus.ok).toBe(1);
    expect(res.body.summary.highestSeverity).toBe("critical");

    expect(Array.isArray(res.body.agents)).toBe(true);
    expect(res.body.agents[0]).toMatchObject({
      agentId: expect.any(String),
      agentName: expect.any(String),
      role: expect.any(String),
      adapterType: expect.any(String),
      agentStatus: expect.any(String),
      healthStatus: expect.any(String),
      budgetStatus: expect.any(String),
      usedTokens: expect.any(Number),
      softCapTokens: expect.any(Number),
      hardCapTokens: expect.any(Number),
      totalCostCents: expect.any(Number),
      lastRun: expect.any(Object),
    });
  });
});
