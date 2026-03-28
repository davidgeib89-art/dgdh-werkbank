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
  adapterConfig: Record<string, unknown>;
};

const mockState: {
  agentById: Record<string, AgentRow>;
  listByCompany: Record<string, AgentRow[]>;
  companyById: Record<string, { id: string; name: string }>;
  dbSelectRowsQueue: unknown[][];
} = {
  agentById: {},
  listByCompany: {},
  companyById: {},
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
    getRuntimeState: async () => null,
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
  mockState.companyById = {};
  mockState.dbSelectRowsQueue = [];
});

describe("triad-preflight endpoint", () => {
  it("returns triadReady=true when all 3 role agents present and idle", async () => {
    mockState.dbSelectRowsQueue.push([{ id: "c1", name: "Test Company" }]);
    mockState.listByCompany["c1"] = [
      {
        id: "agent-ceo-1",
        companyId: "c1",
        name: "CEO Agent",
        role: "ceo",
        adapterType: "gemini_local",
        status: "idle",
        adapterConfig: { roleTemplateId: "ceo" },
      },
      {
        id: "agent-worker-1",
        companyId: "c1",
        name: "Worker Agent",
        role: "worker",
        adapterType: "gemini_local",
        status: "idle",
        adapterConfig: { roleTemplateId: "worker" },
      },
      {
        id: "agent-reviewer-1",
        companyId: "c1",
        name: "Reviewer Agent",
        role: "reviewer",
        adapterType: "gemini_local",
        status: "idle",
        adapterConfig: { roleTemplateId: "reviewer" },
      },
    ];

    const res = await request(createApp()).get("/api/companies/c1/agents/triad-preflight");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      allRolesPresent: true,
      allAgentsIdle: true,
      triadReady: true,
      roles: [
        { roleTemplateId: "ceo", present: true, agentId: "agent-ceo-1", agentName: "CEO Agent", status: "idle" },
        { roleTemplateId: "worker", present: true, agentId: "agent-worker-1", agentName: "Worker Agent", status: "idle" },
        { roleTemplateId: "reviewer", present: true, agentId: "agent-reviewer-1", agentName: "Reviewer Agent", status: "idle" },
      ],
      blockers: [],
    });
  });

  it("returns allRolesPresent=false and blockers when reviewer role is missing", async () => {
    mockState.dbSelectRowsQueue.push([{ id: "c1", name: "Test Company" }]);
    mockState.listByCompany["c1"] = [
      {
        id: "agent-ceo-1",
        companyId: "c1",
        name: "CEO Agent",
        role: "ceo",
        adapterType: "gemini_local",
        status: "idle",
        adapterConfig: { roleTemplateId: "ceo" },
      },
      {
        id: "agent-worker-1",
        companyId: "c1",
        name: "Worker Agent",
        role: "worker",
        adapterType: "gemini_local",
        status: "idle",
        adapterConfig: { roleTemplateId: "worker" },
      },
    ];

    const res = await request(createApp()).get("/api/companies/c1/agents/triad-preflight");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      allRolesPresent: false,
      allAgentsIdle: true,
      triadReady: false,
      roles: [
        { roleTemplateId: "ceo", present: true, agentId: "agent-ceo-1", agentName: "CEO Agent", status: "idle" },
        { roleTemplateId: "worker", present: true, agentId: "agent-worker-1", agentName: "Worker Agent", status: "idle" },
        { roleTemplateId: "reviewer", present: false, agentId: null, agentName: null, status: null },
      ],
      blockers: expect.arrayContaining([expect.stringContaining("reviewer")]),
    });
    expect(res.body.blockers.length).toBeGreaterThan(0);
  });

  it("returns allAgentsIdle=false and triadReady=false when CEO is running", async () => {
    mockState.dbSelectRowsQueue.push([{ id: "c1", name: "Test Company" }]);
    mockState.listByCompany["c1"] = [
      {
        id: "agent-ceo-1",
        companyId: "c1",
        name: "CEO Agent",
        role: "ceo",
        adapterType: "gemini_local",
        status: "running",
        adapterConfig: { roleTemplateId: "ceo" },
      },
      {
        id: "agent-worker-1",
        companyId: "c1",
        name: "Worker Agent",
        role: "worker",
        adapterType: "gemini_local",
        status: "idle",
        adapterConfig: { roleTemplateId: "worker" },
      },
      {
        id: "agent-reviewer-1",
        companyId: "c1",
        name: "Reviewer Agent",
        role: "reviewer",
        adapterType: "gemini_local",
        status: "idle",
        adapterConfig: { roleTemplateId: "reviewer" },
      },
    ];

    const res = await request(createApp()).get("/api/companies/c1/agents/triad-preflight");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      allRolesPresent: true,
      allAgentsIdle: false,
      triadReady: false,
      roles: expect.arrayContaining([
        expect.objectContaining({ roleTemplateId: "ceo", present: true, status: "running" }),
      ]),
      blockers: expect.arrayContaining([expect.stringContaining("CEO Agent")]),
    });
    expect(res.body.blockers.length).toBeGreaterThan(0);
  });

  it("returns 404 when company does not exist", async () => {
    mockState.dbSelectRowsQueue.push([]);

    const res = await request(createApp()).get("/api/companies/c1/agents/triad-preflight");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: "Company not found" });
  });

  it("returns allRolesPresent=false when all roles are missing", async () => {
    mockState.dbSelectRowsQueue.push([{ id: "c1", name: "Test Company" }]);
    mockState.listByCompany["c1"] = [];

    const res = await request(createApp()).get("/api/companies/c1/agents/triad-preflight");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      allRolesPresent: false,
      allAgentsIdle: true,
      triadReady: false,
      roles: [
        { roleTemplateId: "ceo", present: false, agentId: null, agentName: null, status: null },
        { roleTemplateId: "worker", present: false, agentId: null, agentName: null, status: null },
        { roleTemplateId: "reviewer", present: false, agentId: null, agentName: null, status: null },
      ],
      blockers: expect.arrayContaining([
        expect.stringContaining("ceo"),
        expect.stringContaining("worker"),
        expect.stringContaining("reviewer"),
      ]),
    });
    expect(res.body.blockers.length).toBe(3);
  });
});
