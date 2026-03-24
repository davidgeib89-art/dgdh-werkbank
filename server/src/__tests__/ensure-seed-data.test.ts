import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { ensureSeedData } from "../services/ensure-seed-data.js";
import { agents, companies } from "@paperclipai/db";

vi.mock("node:fs");
vi.mock("@paperclipai/db", () => ({
  agents: { id: "agents.id", companyId: "agents.companyId", name: "agents.name", runtimeConfig: "agents.runtimeConfig" },
  companies: { id: "companies.id", name: "companies.name" },
}));

vi.mock("../middleware/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

// We don't strictly need to mock drizzle-orm if we just want to test the flow,
// but it helps in asserting the where() calls if needed.
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => ({ type: "and", args })),
  eq: vi.fn((a, b) => ({ type: "eq", left: a, right: b })),
}));

function createQuery(rows: any[]) {
  const query: any = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    then: (onFulfilled: any) => Promise.resolve(onFulfilled(rows)),
    returning: vi.fn(() => query),
  };
  return query;
}

describe("ensureSeedData regression", () => {
  let dbSelectRowsQueue: any[][] = [];
  let updateCalls: any[] = [];
  let insertCalls: any[] = [];

  const db: any = {
    select: vi.fn(() => {
      const rows = dbSelectRowsQueue.shift() ?? [];
      return createQuery(rows);
    }),
    update: vi.fn((table) => {
      const updateObj = {
        set: vi.fn((values) => {
          updateCalls.push({ table, values });
          return updateObj;
        }),
        where: vi.fn(() => Promise.resolve()),
      };
      return updateObj;
    }),
    insert: vi.fn((table) => {
       const insertObj = {
         values: vi.fn((values) => {
           insertCalls.push({ table, values });
           return insertObj;
         }),
         returning: vi.fn(() => createQuery([])),
         then: (onFulfilled: any) => Promise.resolve(onFulfilled([])),
       };
       return insertObj;
    }),
    transaction: vi.fn((cb) => cb(db)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectRowsQueue = [];
    updateCalls = [];
    insertCalls = [];
  });

  it("backfills empty runtimeConfig for existing agent when company already exists", async () => {
    const mockSeed = {
      company: { name: "David Geib Digitales Handwerk", status: "active", budgetMonthlyCents: 0 },
      agents: [
        {
          name: "CEO Agent",
          role: "general",
          adapterType: "gemini_local",
          adapterConfig: {},
          runtimeConfig: { heartbeat: { enabled: true } },
        },
      ],
    };

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSeed));

    // 1. select company -> exists
    dbSelectRowsQueue.push([{ id: "c1" }]);
    // 2. select agent -> exists, but empty runtimeConfig
    dbSelectRowsQueue.push([{ id: "a1", runtimeConfig: {} }]);

    await ensureSeedData(db);

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].table).toBe(agents);
    expect(updateCalls[0].values).toEqual({ runtimeConfig: mockSeed.agents[0].runtimeConfig });
  });

  it("does not backfill if runtimeConfig is already set (non-empty)", async () => {
    const mockSeed = {
      company: { name: "David Geib Digitales Handwerk", status: "active", budgetMonthlyCents: 0 },
      agents: [
        {
          name: "CEO Agent",
          role: "general",
          adapterType: "gemini_local",
          adapterConfig: {},
          runtimeConfig: { heartbeat: { enabled: true } },
        },
      ],
    };

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSeed));

    // 1. select company -> exists
    dbSelectRowsQueue.push([{ id: "c1" }]);
    // 2. select agent -> exists, and HAS runtimeConfig
    dbSelectRowsQueue.push([{ id: "a1", runtimeConfig: { heartbeat: { enabled: false } } }]);

    await ensureSeedData(db);

    expect(updateCalls).toHaveLength(0);
  });

  it("inserts company and agents if company does not exist", async () => {
    const mockSeed = {
      company: { name: "David Geib Digitales Handwerk", status: "active", budgetMonthlyCents: 0 },
      agents: [
        {
          name: "CEO Agent",
          role: "general",
          adapterType: "gemini_local",
          adapterConfig: {},
          runtimeConfig: { heartbeat: { enabled: true } },
        },
      ],
    };

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSeed));

    // 1. select company -> not found
    dbSelectRowsQueue.push([]);
    
    // We need to mock the returning call for company insert
    db.insert.mockImplementationOnce((table) => {
        const insertObj = {
            values: vi.fn((values) => {
                insertCalls.push({ table, values });
                return insertObj;
            }),
            returning: vi.fn(() => ({
                then: (onFulfilled: any) => Promise.resolve(onFulfilled([{ id: "c1" }]))
            })),
        };
        return insertObj;
    });

    await ensureSeedData(db);

    expect(insertCalls).toHaveLength(2);
    expect(insertCalls[0].table).toBe(companies);
    expect(insertCalls[1].table).toBe(agents);
    expect(insertCalls[1].values).toHaveLength(1);
    expect(insertCalls[1].values[0].companyId).toBe("c1");
  });

  it("creates agent if it does not exist in existing company", async () => {
    const mockSeed = {
      company: { name: "David Geib Digitales Handwerk", status: "active", budgetMonthlyCents: 0 },
      agents: [
        {
          name: "CEO Agent",
          role: "general",
          adapterType: "gemini_local",
          adapterConfig: {},
          runtimeConfig: { heartbeat: { enabled: true } },
        },
      ],
    };

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSeed));

    // 1. select company -> exists
    dbSelectRowsQueue.push([{ id: "c1" }]);
    // 2. select agent -> not found
    dbSelectRowsQueue.push([]);

    await ensureSeedData(db);

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].table).toBe(agents);
    expect(insertCalls[0].values.name).toBe("CEO Agent");
    expect(insertCalls[0].values.companyId).toBe("c1");
  });
});
