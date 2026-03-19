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

type RunRow = Record<string, unknown> & {
  id: string;
  companyId: string;
  agentId: string;
  status: string;
};

type IssueRow = {
  id: string;
  identifier: string;
  companyId: string;
  assigneeAgentId: string | null;
  executionRunId: string | null;
  status: string;
};

const mockState: {
  agentById: Record<string, AgentRow>;
  listByCompany: Record<string, AgentRow[]>;
  runById: Record<string, RunRow | null>;
  eventsByRun: Record<string, Array<Record<string, unknown>>>;
  logByRun: Record<string, Record<string, unknown>>;
  activeRunByAgent: Record<string, RunRow | null>;
  issueById: Record<string, IssueRow | null>;
  issueByIdentifier: Record<string, IssueRow | null>;
  dbSelectRowsQueue: unknown[][];
} = {
  agentById: {},
  listByCompany: {},
  runById: {},
  eventsByRun: {},
  logByRun: {},
  activeRunByAgent: {},
  issueById: {},
  issueByIdentifier: {},
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
    getRun: async (runId: string) => mockState.runById[runId] ?? null,
    listEvents: async (runId: string, _afterSeq: number, _limit: number) =>
      mockState.eventsByRun[runId] ?? [],
    readLog: async (runId: string, _opts: Record<string, unknown>) =>
      mockState.logByRun[runId] ?? {
        content: "",
        nextOffset: 0,
        truncated: false,
      },
    getActiveRunForAgent: async (agentId: string) =>
      mockState.activeRunByAgent[agentId] ?? null,
  }),
  issueApprovalService: () => ({}),
  issueService: () => ({
    getById: async (id: string) => mockState.issueById[id] ?? null,
    getByIdentifier: async (identifier: string) =>
      mockState.issueByIdentifier[identifier] ?? null,
  }),
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
  mockState.runById = {};
  mockState.eventsByRun = {};
  mockState.logByRun = {};
  mockState.activeRunByAgent = {};
  mockState.issueById = {};
  mockState.issueByIdentifier = {};
  mockState.dbSelectRowsQueue = [];
});

describe("live execution read surface contracts", () => {
  it("keeps /companies/:companyId/live-runs empty-state contract", async () => {
    mockState.dbSelectRowsQueue.push([]);

    const res = await request(createApp()).get("/api/companies/c1/live-runs");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("keeps /companies/:companyId/live-runs additive contract with minCount fallback", async () => {
    const activeRows = [
      {
        id: "run-live-1",
        status: "running",
        invocationSource: "scheduler",
        triggerDetail: "heartbeat",
        startedAt: "2026-03-19T12:00:00.000Z",
        finishedAt: null,
        createdAt: "2026-03-19T11:59:00.000Z",
        agentId: "a1",
        agentName: "Alpha",
        adapterType: "gemini_local",
        issueId: "issue-1",
      },
    ];
    const recentRows = [
      {
        id: "run-recent-1",
        status: "succeeded",
        invocationSource: "manual",
        triggerDetail: "operator",
        startedAt: "2026-03-19T11:00:00.000Z",
        finishedAt: "2026-03-19T11:05:00.000Z",
        createdAt: "2026-03-19T10:59:00.000Z",
        agentId: "a2",
        agentName: "Beta",
        adapterType: "gemini_local",
        issueId: null,
      },
    ];
    mockState.dbSelectRowsQueue.push(activeRows, recentRows);

    const res = await request(createApp()).get(
      "/api/companies/c1/live-runs?minCount=2",
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      id: expect.any(String),
      status: expect.any(String),
      invocationSource: expect.any(String),
      triggerDetail: expect.any(String),
      startedAt: expect.anything(),
      createdAt: expect.anything(),
      agentId: expect.any(String),
      agentName: expect.any(String),
      adapterType: expect.any(String),
      issueId: expect.anything(),
    });
    expect(
      Object.prototype.hasOwnProperty.call(res.body[0], "finishedAt"),
    ).toBe(true);
    expect(
      res.body[0].finishedAt === null ||
        typeof res.body[0].finishedAt === "string",
    ).toBe(true);
  });

  it("keeps /heartbeat-runs/:runId payload contract", async () => {
    mockState.runById["run-1"] = {
      id: "run-1",
      companyId: "c1",
      agentId: "a1",
      status: "running",
      contextSnapshot: { issueId: "issue-1" },
      createdAt: "2026-03-19T12:00:00.000Z",
      updatedAt: "2026-03-19T12:01:00.000Z",
      extraDebugField: "keep-additive",
    };

    const res = await request(createApp()).get("/api/heartbeat-runs/run-1");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: "run-1",
      companyId: "c1",
      agentId: "a1",
      status: "running",
      contextSnapshot: { issueId: "issue-1" },
      extraDebugField: "keep-additive",
    });
  });

  it("keeps /heartbeat-runs/:runId/events empty-state contract", async () => {
    mockState.runById["run-2"] = {
      id: "run-2",
      companyId: "c1",
      agentId: "a1",
      status: "succeeded",
    };
    mockState.eventsByRun["run-2"] = [];

    const res = await request(createApp()).get(
      "/api/heartbeat-runs/run-2/events?afterSeq=0&limit=50",
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("keeps /heartbeat-runs/:runId/events contract and payload redaction", async () => {
    mockState.runById["run-3"] = {
      id: "run-3",
      companyId: "c1",
      agentId: "a1",
      status: "running",
    };
    mockState.eventsByRun["run-3"] = [
      {
        seq: 1,
        runId: "run-3",
        kind: "log",
        payload: {
          message: "ok",
          apiKey: "super-secret",
          nested: { access_token: "secret-2" },
        },
        createdAt: "2026-03-19T12:10:00.000Z",
      },
    ];

    const res = await request(createApp()).get(
      "/api/heartbeat-runs/run-3/events",
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      seq: 1,
      runId: "run-3",
      kind: "log",
      payload: {
        message: "ok",
        apiKey: "***REDACTED***",
        nested: { access_token: "***REDACTED***" },
      },
    });
  });

  it("keeps /heartbeat-runs/:runId/log payload contract", async () => {
    mockState.runById["run-4"] = {
      id: "run-4",
      companyId: "c1",
      agentId: "a1",
      status: "running",
    };
    mockState.logByRun["run-4"] = {
      runId: "run-4",
      content: "line-1\nline-2\n",
      offset: 0,
      nextOffset: 14,
      totalBytes: 14,
      truncated: false,
      logStore: "db",
      extraDebugField: "keep-additive",
    };

    const res = await request(createApp()).get(
      "/api/heartbeat-runs/run-4/log?offset=0&limitBytes=1024",
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      runId: "run-4",
      content: expect.any(String),
      offset: expect.any(Number),
      nextOffset: expect.any(Number),
      totalBytes: expect.any(Number),
      truncated: expect.any(Boolean),
      extraDebugField: "keep-additive",
    });
  });

  it("keeps optional /issues/:issueId/active-run null-state contract", async () => {
    mockState.issueByIdentifier["DGD-99"] = {
      id: "issue-99",
      identifier: "DGD-99",
      companyId: "c1",
      assigneeAgentId: "a1",
      executionRunId: null,
      status: "in_progress",
    };
    mockState.activeRunByAgent["a1"] = null;

    const res = await request(createApp()).get("/api/issues/DGD-99/active-run");

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("keeps optional /issues/:issueId/active-run populated contract", async () => {
    mockState.issueByIdentifier["DGD-100"] = {
      id: "issue-100",
      identifier: "DGD-100",
      companyId: "c1",
      assigneeAgentId: "a1",
      executionRunId: null,
      status: "in_progress",
    };
    mockState.activeRunByAgent["a1"] = {
      id: "run-active-1",
      companyId: "c1",
      agentId: "a1",
      status: "running",
      contextSnapshot: { issueId: "issue-100" },
      createdAt: "2026-03-19T12:20:00.000Z",
    };
    mockState.agentById["a1"] = {
      id: "a1",
      companyId: "c1",
      name: "Alpha",
      role: "coder",
      adapterType: "gemini_local",
      status: "active",
    };

    const res = await request(createApp()).get(
      "/api/issues/DGD-100/active-run",
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: "run-active-1",
      companyId: "c1",
      agentId: "a1",
      status: "running",
      agentName: "Alpha",
      adapterType: "gemini_local",
    });
  });
});
