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

type RuntimeStateRow = Record<string, unknown> | null;

type TaskSessionRow = {
  id: string;
  agentId: string;
  taskKey: string | null;
  taskTitle: string | null;
  sessionParamsJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

const mockState: {
  agentById: Record<string, AgentRow>;
  listByCompany: Record<string, AgentRow[]>;
  runtimeStateByAgent: Record<string, RuntimeStateRow>;
  taskSessionsByAgent: Record<string, TaskSessionRow[]>;
  dbSelectRowsQueue: unknown[][];
} = {
  agentById: {},
  listByCompany: {},
  runtimeStateByAgent: {},
  taskSessionsByAgent: {},
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
    listTaskSessions: async (id: string) =>
      mockState.taskSessionsByAgent[id] ?? [],
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
  mockState.taskSessionsByAgent = {};
  mockState.dbSelectRowsQueue = [];
});

describe("agent runtime and task session route contracts", () => {
  it("keeps /agents/:id/runtime-state payload stable and additive", async () => {
    const agentId = "66666666-6666-4666-8666-666666666666";
    const agent: AgentRow = {
      id: agentId,
      companyId: "c1",
      name: "Runtime Agent",
      role: "coder",
      adapterType: "gemini_local",
      status: "active",
    };
    mockState.agentById[agent.id] = agent;
    mockState.runtimeStateByAgent[agent.id] = {
      id: "state-1",
      agentId,
      companyId: "c1",
      totalInputTokens: 12,
      totalCachedInputTokens: 3,
      totalOutputTokens: 4,
      totalCostCents: 2,
      stateJson: {
        quotaSnapshot: {
          softCapTokens: 100,
          hardCapTokens: 200,
        },
      },
      extraDebugField: "keep-additive",
    };

    const res = await request(createApp()).get(
      `/api/agents/${agentId}/runtime-state`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: "state-1",
      agentId,
      companyId: "c1",
      totalInputTokens: 12,
      totalCachedInputTokens: 3,
      totalOutputTokens: 4,
      totalCostCents: 2,
      stateJson: {
        quotaSnapshot: {
          softCapTokens: 100,
          hardCapTokens: 200,
        },
      },
      extraDebugField: "keep-additive",
    });
  });

  it("keeps /agents/:id/runtime-state null state contract", async () => {
    const agentId = "77777777-7777-4777-8777-777777777777";
    const agent: AgentRow = {
      id: agentId,
      companyId: "c1",
      name: "Runtime Agent Empty",
      role: "coder",
      adapterType: "gemini_local",
      status: "active",
    };
    mockState.agentById[agent.id] = agent;
    mockState.runtimeStateByAgent[agent.id] = null;

    const res = await request(createApp()).get(
      `/api/agents/${agentId}/runtime-state`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("keeps /agents/:id/task-sessions contract and sanitizes sensitive session params", async () => {
    const agentId = "88888888-8888-4888-8888-888888888888";
    const agent: AgentRow = {
      id: agentId,
      companyId: "c1",
      name: "Task Session Agent",
      role: "coder",
      adapterType: "gemini_local",
      status: "active",
    };
    mockState.agentById[agent.id] = agent;
    mockState.taskSessionsByAgent[agent.id] = [
      {
        id: "session-1",
        agentId,
        taskKey: "DGD-15",
        taskTitle: "Stabilize payload",
        sessionParamsJson: {
          cwd: "C:/repo",
          apiKey: "plain-secret-value",
          nested: { access_token: "nested-secret" },
          keepMe: "visible",
        },
        createdAt: "2026-03-19T12:00:00.000Z",
        updatedAt: "2026-03-19T12:10:00.000Z",
      },
    ];

    const res = await request(createApp()).get(
      `/api/agents/${agentId}/task-sessions`,
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: "session-1",
      agentId,
      taskKey: "DGD-15",
      taskTitle: "Stabilize payload",
      createdAt: "2026-03-19T12:00:00.000Z",
      updatedAt: "2026-03-19T12:10:00.000Z",
      sessionParamsJson: {
        cwd: "C:/repo",
        apiKey: "***REDACTED***",
        nested: { access_token: "***REDACTED***" },
        keepMe: "visible",
      },
    });
  });

  it("keeps /agents/:id/task-sessions empty-state as empty array", async () => {
    const agentId = "99999999-9999-4999-8999-999999999999";
    const agent: AgentRow = {
      id: agentId,
      companyId: "c1",
      name: "Task Session Empty",
      role: "coder",
      adapterType: "gemini_local",
      status: "active",
    };
    mockState.agentById[agent.id] = agent;
    mockState.taskSessionsByAgent[agent.id] = [];

    const res = await request(createApp()).get(
      `/api/agents/${agentId}/task-sessions`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
