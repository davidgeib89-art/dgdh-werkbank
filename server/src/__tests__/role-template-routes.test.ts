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
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  status: string;
};

const mockState: {
  agentById: Record<string, AgentRow>;
  updatedPatch: Record<string, unknown> | null;
} = {
  agentById: {},
  updatedPatch: null,
};

vi.mock("../services/index.js", () => ({
  agentService: () => ({
    getById: async (id: string) => mockState.agentById[id] ?? null,
    update: async (id: string, patch: Record<string, unknown>) => {
      mockState.updatedPatch = patch;
      const existing = mockState.agentById[id];
      if (!existing) return null;
      const next: AgentRow = {
        ...existing,
        ...patch,
        adapterConfig:
          typeof patch.adapterConfig === "object" && patch.adapterConfig !== null
            ? (patch.adapterConfig as Record<string, unknown>)
            : existing.adapterConfig,
        runtimeConfig:
          typeof patch.runtimeConfig === "object" && patch.runtimeConfig !== null
            ? (patch.runtimeConfig as Record<string, unknown>)
            : existing.runtimeConfig,
      };
      mockState.agentById[id] = next;
      return next;
    },
    resolveByReference: async () => ({ ambiguous: false, agent: null }),
  }),
  accessService: () => ({
    canUser: async () => true,
    hasPermission: async () => true,
  }),
  approvalService: () => ({}),
  heartbeatService: () => ({}),
  issueApprovalService: () => ({}),
  issueService: () => ({}),
  secretService: () => ({
    normalizeAdapterConfigForPersistence: async (
      _companyId: string,
      adapterConfig: Record<string, unknown>,
    ) => adapterConfig,
    resolveAdapterConfigForRuntime: async () => ({ config: {} }),
  }),
  logActivity: async () => undefined,
}));

function createDbMock() {
  return {
    select: vi.fn(() => {
      const query: any = {
        from: vi.fn(() => query),
        innerJoin: vi.fn(() => query),
        where: vi.fn(() => query),
        orderBy: vi.fn(() => query),
        groupBy: vi.fn(() => query),
        limit: vi.fn(() => query),
        then: (onFulfilled: (value: unknown[]) => unknown) =>
          Promise.resolve(onFulfilled([])),
      };
      return query;
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
  mockState.updatedPatch = null;
});

describe("role template routes", () => {
  it("lists canonical role templates for the dashboard", async () => {
    const res = await request(createApp()).get("/api/role-templates");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "ceo", version: "v1", label: "CEO" }),
        expect.objectContaining({
          id: "reviewer",
          version: "v1",
          label: "Reviewer",
        }),
        expect.objectContaining({
          id: "worker",
          version: "v1",
          label: "Worker",
        }),
      ]),
    );
  });

  it("stores roleTemplateId and roleAppendPrompt inside adapterConfig on PATCH", async () => {
    const agentId = "11111111-1111-4111-8111-111111111111";
    mockState.agentById[agentId] = {
      id: agentId,
      companyId: "c1",
      name: "Research-Gemini",
      role: "general",
      adapterType: "gemini_local",
      adapterConfig: { model: "gemini-2.5-flash" },
      runtimeConfig: {},
      status: "active",
    };

    const res = await request(createApp())
      .patch(`/api/agents/${agentId}`)
      .send({
        adapterConfig: {
          roleTemplateId: "Worker",
          roleAppendPrompt: "  Prefer compact result reports.  ",
        },
      });

    expect(res.status).toBe(200);
    expect(mockState.updatedPatch).toMatchObject({
      adapterConfig: {
        roleTemplateId: "worker",
        roleAppendPrompt: "Prefer compact result reports.",
      },
    });
    expect(res.body.adapterConfig).toMatchObject({
      roleTemplateId: "worker",
      roleAppendPrompt: "Prefer compact result reports.",
    });
  });
});
