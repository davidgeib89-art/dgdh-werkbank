import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { healthRoutes } from "../routes/health.js";

type CompanyRow = {
  id: string;
  name: string;
};

type AgentRow = {
  id: string;
  companyId: string;
  name: string;
  adapterConfig: Record<string, unknown>;
};

const mockState: {
  companyRows: CompanyRow[];
  agentRows: AgentRow[];
  dbSelectQueue: unknown[][];
} = {
  companyRows: [],
  agentRows: [],
  dbSelectQueue: [],
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

vi.mock("@paperclipai/db", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/db")>("@paperclipai/db");
  return {
    ...actual,
    companies: {
      id: { name: "id" },
      name: { name: "name" },
    },
    agents: {
      id: { name: "id" },
      companyId: { name: "company_id" },
      name: { name: "name" },
      adapterConfig: { name: "adapter_config" },
    },
  };
});

function createDbMock() {
  return {
    select: vi.fn(() => {
      const rows = mockState.dbSelectQueue.shift() ?? [];
      return createQuery(rows);
    }),
  } as any;
}

const defaultOpts = {
  deploymentMode: "local_trusted" as const,
  deploymentExposure: "private" as const,
  authReady: true,
  companyDeletionEnabled: true,
};

beforeEach(() => {
  mockState.companyRows = [];
  mockState.agentRows = [];
  mockState.dbSelectQueue = [];
});

describe("GET /health seedStatus", () => {
  it("includes seedStatus with dgdhCompanyFound=true and all agent roles true when company and all agents exist", async () => {
    const app = express();
    const db = createDbMock();

    // Queue the responses: first company query, then agent query
    mockState.dbSelectQueue.push(
      [{ id: "comp-1", name: "David Geib Digitales Handwerk" }],  // companies query
      [  // agents query
        { id: "agent-1", companyId: "comp-1", name: "CEO Agent", adapterConfig: { roleTemplateId: "ceo" } },
        { id: "agent-2", companyId: "comp-1", name: "Worker Agent", adapterConfig: { roleTemplateId: "worker" } },
        { id: "agent-3", companyId: "comp-1", name: "Reviewer Agent", adapterConfig: { roleTemplateId: "reviewer" } },
      ]
    );

    app.use("/health", healthRoutes(db, defaultOpts));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.seedStatus).toEqual({
      dgdhCompanyFound: true,
      agentRolesFound: {
        ceo: true,
        worker: true,
        reviewer: true,
      },
    });
    // Verify existing fields are preserved
    expect(res.body.deploymentMode).toBe("local_trusted");
    expect(res.body.authReady).toBe(true);
  });

  it("includes seedStatus with dgdhCompanyFound=true but all agent roles false when company exists but no agents", async () => {
    const app = express();
    const db = createDbMock();

    // Queue: company found, but no agents
    mockState.dbSelectQueue.push(
      [{ id: "comp-1", name: "David Geib Digitales Handwerk" }],  // companies query
      []  // agents query - empty
    );

    app.use("/health", healthRoutes(db, defaultOpts));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.seedStatus).toEqual({
      dgdhCompanyFound: true,
      agentRolesFound: {
        ceo: false,
        worker: false,
        reviewer: false,
      },
    });
  });

  it("returns only status ok when db is not provided (no seedStatus)", async () => {
    const app = express();
    // No db provided
    app.use("/health", healthRoutes(undefined, defaultOpts));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.body.seedStatus).toBeUndefined();
  });

  it("includes seedStatus with dgdhCompanyFound=false when company does not exist", async () => {
    const app = express();
    const db = createDbMock();

    // Queue: no company found
    mockState.dbSelectQueue.push([]);

    app.use("/health", healthRoutes(db, defaultOpts));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.seedStatus).toEqual({
      dgdhCompanyFound: false,
      agentRolesFound: {
        ceo: false,
        worker: false,
        reviewer: false,
      },
    });
  });

  it("gracefully handles DB query errors and still returns 200", async () => {
    const app = express();
    const db = {
      select: vi.fn(() => {
        throw new Error("Database connection failed");
      }),
    } as any;

    app.use("/health", healthRoutes(db, defaultOpts));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    // seedStatus should be null or absent when query fails
    expect(res.body.seedStatus).toBeNull();
  });

  it("correctly identifies partial agent roles (only ceo exists)", async () => {
    const app = express();
    const db = createDbMock();

    // Queue: company found, only CEO agent
    mockState.dbSelectQueue.push(
      [{ id: "comp-1", name: "David Geib Digitales Handwerk" }],  // companies query
      [{ id: "agent-1", companyId: "comp-1", name: "CEO Agent", adapterConfig: { roleTemplateId: "ceo" } }]  // agents query
    );

    app.use("/health", healthRoutes(db, defaultOpts));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.seedStatus).toEqual({
      dgdhCompanyFound: true,
      agentRolesFound: {
        ceo: true,
        worker: false,
        reviewer: false,
      },
    });
  });
});
