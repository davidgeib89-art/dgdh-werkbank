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
  totalInputTokens: number;
  totalCachedInputTokens: number;
  totalOutputTokens: number;
  totalCostCents: number;
  stateJson: Record<string, unknown>;
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

describe("agent stats route contract", () => {
  it("keeps /agents/:id/stats payload stable with additive fields", async () => {
    const agentId = "44444444-4444-4444-8444-444444444444";
    const agent: AgentRow = {
      id: agentId,
      companyId: "c1",
      name: "Stats Agent",
      role: "coder",
      adapterType: "gemini_local",
      status: "active",
    };
    mockState.agentById[agent.id] = agent;
    mockState.runtimeStateByAgent[agent.id] = {
      totalInputTokens: 100,
      totalCachedInputTokens: 20,
      totalOutputTokens: 30,
      totalCostCents: 55,
      stateJson: {
        quotaSnapshot: {
          accountLabel: "acc-1",
          modelLane: "stable",
          selectedBucket: "balanced",
          bucket: "balanced",
          budgetClass: "standard",
          softCapTokens: 200,
          hardCapTokens: 400,
          bucketState: "ok",
          snapshotAt: "2026-03-19T10:00:00.000Z",
          laneStrategy: "quota",
          modelLaneReason: "default",
        },
      },
    };

    const historyRuns = [
      {
        id: "run-2",
        status: "succeeded",
        invocationSource: "scheduler",
        triggerDetail: "heartbeat",
        errorCode: null,
        usageJson: {
          inputTokens: 11,
          cachedInputTokens: 5,
          outputTokens: 7,
          toolCalls: 1,
          costUsd: 0.01,
          stopReason: "completed",
        },
        resultJson: { stopReason: "completed" },
        contextSnapshot: {
          paperclipRoutingPreflight: {
            mode: "advisory",
            routingReason: "quota_state",
            policySource: "quota_snapshot",
            quotaState: {
              bucketState: "ok",
              snapshotAt: "2026-03-19T10:00:00.000Z",
            },
            selected: {
              taskType: "coding",
              budgetClass: "standard",
              accountLabel: "acc-1",
              selectedBucket: "balanced",
              effectiveBucket: "balanced",
              configuredModelLane: "stable",
              recommendedModelLane: "stable",
              effectiveModelLane: "stable",
              laneStrategy: "quota",
              modelLaneReason: "default",
              hardCapTokens: 400,
              softCapTokens: 200,
            },
          },
        },
        startedAt: "2026-03-19T10:00:10.000Z",
        finishedAt: "2026-03-19T10:00:20.000Z",
        createdAt: "2026-03-19T10:00:00.000Z",
      },
      {
        id: "run-1",
        status: "running",
        invocationSource: "manual",
        triggerDetail: "operator",
        errorCode: null,
        usageJson: {},
        resultJson: {},
        contextSnapshot: null,
        startedAt: "2026-03-19T09:00:10.000Z",
        finishedAt: null,
        createdAt: "2026-03-19T09:00:00.000Z",
      },
    ];

    const latestCostEvent = [
      {
        id: "cost-1",
        provider: "google",
        model: "gemini-2.5-pro",
        costCents: 12,
        occurredAt: "2026-03-19T10:00:30.000Z",
      },
    ];

    // Query order in /stats endpoint:
    // 1) history runs
    // 2) latest cost event
    mockState.dbSelectRowsQueue.push(historyRuns, latestCostEvent);

    const res = await request(createApp()).get(
      `/api/agents/${agentId}/stats?historyLimit=50`,
    );

    expect(res.status).toBe(200);

    expect(res.body).toMatchObject({
      agentId,
      companyId: "c1",
      adapterType: "gemini_local",
      healthStatus: expect.any(String),
      activeAccountLabel: "acc-1",
      configuredModelLane: "stable",
      recommendedModelLane: "stable",
      effectiveModelLane: "stable",
      currentModelLane: "stable",
      bucket: "balanced",
      selectedBucket: "balanced",
      budgetClass: "standard",
      hardCapTokens: 400,
      softCapTokens: 200,
      quotaState: {
        bucketState: "ok",
        snapshotAt: "2026-03-19T10:00:00.000Z",
      },
      routing: {
        mode: "advisory",
        reason: "quota_state",
        policySource: "quota_snapshot",
        laneStrategy: "quota",
        modelLaneReason: "default",
      },
      routingHistory: {
        limit: 12,
        count: 2,
        runs: expect.any(Array),
      },
      budgetSummary: {
        usedTokens: 150,
        softCapTokens: 200,
        hardCapTokens: 400,
        percentOfSoftCap: 75,
        percentOfHardCap: 38,
        totalCostCents: 55,
        status: expect.any(String),
      },
      totals: {
        inputTokens: 100,
        cachedInputTokens: 20,
        outputTokens: 30,
        totalCostCents: 55,
      },
      latestRun: {
        id: "run-2",
        status: "succeeded",
        stopReason: "completed",
        tokens: {
          inputTokens: 11,
          cachedInputTokens: 5,
          outputTokens: 7,
        },
      },
      latestCostEvent: {
        id: "cost-1",
        provider: "google",
        model: "gemini-2.5-pro",
        costCents: 12,
      },
    });

    expect(Array.isArray(res.body.routingHistory.runs)).toBe(true);
    expect(res.body.routingHistory.runs[0]).toMatchObject({
      id: expect.any(String),
      status: expect.any(String),
      dataSource: expect.any(String),
      taskType: expect.anything(),
      budgetClass: expect.anything(),
      accountLabel: expect.anything(),
      configuredModelLane: expect.anything(),
      recommendedModelLane: expect.anything(),
      effectiveModelLane: expect.anything(),
      laneStrategy: expect.anything(),
      routingReason: expect.anything(),
      hardCapTokens: expect.anything(),
      softCapTokens: expect.anything(),
      stopReason: expect.anything(),
      tokens: expect.anything(),
    });
    expect(
      Object.prototype.hasOwnProperty.call(
        res.body.routingHistory.runs[0],
        "warnings",
      ),
    ).toBe(true);
    expect(
      res.body.routingHistory.runs[0].warnings === null ||
        Array.isArray(res.body.routingHistory.runs[0].warnings),
    ).toBe(true);
  });

  it("keeps null/default structure when runtime and history are absent", async () => {
    const agentId = "55555555-5555-4555-8555-555555555555";
    const agent: AgentRow = {
      id: agentId,
      companyId: "c1",
      name: "Stats Agent Empty",
      role: "coder",
      adapterType: "gemini_local",
      status: "active",
    };
    mockState.agentById[agent.id] = agent;
    mockState.runtimeStateByAgent[agent.id] = null;

    mockState.dbSelectRowsQueue.push([], []);

    const res = await request(createApp()).get(`/api/agents/${agentId}/stats`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      agentId,
      companyId: "c1",
      adapterType: "gemini_local",
      healthStatus: "unknown",
      routingHistory: {
        limit: 8,
        count: 0,
        runs: [],
      },
      budgetSummary: {
        usedTokens: null,
        softCapTokens: null,
        hardCapTokens: null,
        percentOfSoftCap: null,
        percentOfHardCap: null,
        totalCostCents: null,
        status: "unknown",
      },
      totals: null,
      latestRun: null,
      latestCostEvent: null,
    });
  });
});
