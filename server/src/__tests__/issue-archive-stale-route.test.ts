import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueRoutes } from "../routes/issues.js";
import { errorHandler } from "../middleware/index.js";

const mockIssueService = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  getById: vi.fn(),
  getByIdentifier: vi.fn(),
}));

const mockCompanyService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  accessService: () => ({}),
  activityService: () => ({}),
  agentService: () => ({}),
  ceoService: () => ({}),
  goalService: () => ({}),
  heartbeatService: () => ({}),
  githubPrService: () => ({}),
  issueApprovalService: () => ({}),
  issueService: () => mockIssueService,
  companyService: () => mockCompanyService,
  documentService: () => ({}),
  logActivity: mockLogActivity,
  projectService: () => ({}),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "user",
      userId: "user-operator-1",
      companyId: "company-1",
    };
    next();
  });

  const db = {
    transaction: async <T>(runner: (tx: unknown) => Promise<T>) => runner({}),
  };
  app.use("/api", issueRoutes(db as any, {} as any));
  app.use(errorHandler);
  return app;
}

describe("issues archive-stale route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompanyService.getById.mockResolvedValue({
      id: "company-1",
      name: "Test Company",
    });
  });

  it("dryRun: true → returns list of matching IDs without updating DB", async () => {
    const staleIssues = [
      { id: "issue-1", status: "todo", updatedAt: new Date("2026-01-01") },
      { id: "issue-2", status: "blocked", updatedAt: new Date("2026-01-02") },
    ];
    mockIssueService.list.mockResolvedValue(staleIssues);

    const res = await request(createApp())
      .post("/api/companies/company-1/issues/archive-stale")
      .send({ daysOld: 30, dryRun: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      archived: 0,
      issueIds: ["issue-1", "issue-2"],
    });
    expect(mockIssueService.list).toHaveBeenCalledWith("company-1", expect.any(Object));
    expect(mockIssueService.update).not.toHaveBeenCalled();
  });

  it("dryRun: false → updates matching issues to cancelled and returns count", async () => {
    const staleIssues = [
      { id: "issue-1", status: "todo", updatedAt: new Date("2026-01-01") },
      { id: "issue-2", status: "blocked", updatedAt: new Date("2026-01-02") },
    ];
    mockIssueService.list.mockResolvedValue(staleIssues);
    mockIssueService.update.mockResolvedValue({ id: "mock-id", status: "cancelled" });

    const res = await request(createApp())
      .post("/api/companies/company-1/issues/archive-stale")
      .send({ daysOld: 30, dryRun: false });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      archived: 2,
      issueIds: ["issue-1", "issue-2"],
    });
    expect(mockIssueService.list).toHaveBeenCalledWith("company-1", expect.any(Object));
    expect(mockIssueService.update).toHaveBeenCalledTimes(2);
    expect(mockIssueService.update).toHaveBeenCalledWith("issue-1", { status: "cancelled" });
    expect(mockIssueService.update).toHaveBeenCalledWith("issue-2", { status: "cancelled" });
  });

  it("excludes issues with status 'in_review', 'done', 'merged' from query results", async () => {
    // Only todo and blocked issues should be returned by the service list
    const staleIssues = [
      { id: "issue-1", status: "todo", updatedAt: new Date("2026-01-01") },
      { id: "issue-2", status: "blocked", updatedAt: new Date("2026-01-02") },
    ];
    mockIssueService.list.mockResolvedValue(staleIssues);

    const res = await request(createApp())
      .post("/api/companies/company-1/issues/archive-stale")
      .send({ daysOld: 30, dryRun: true });

    expect(res.status).toBe(200);
    expect(res.body.issueIds).toEqual(["issue-1", "issue-2"]);
    // Verify the filter was passed to the list call
    const listCallArg = mockIssueService.list.mock.calls[0][1];
    expect(listCallArg.status).toEqual("todo,blocked");
  });

  it("returns 400 validation error for invalid daysOld value", async () => {
    const res = await request(createApp())
      .post("/api/companies/company-1/issues/archive-stale")
      .send({ daysOld: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockIssueService.list).not.toHaveBeenCalled();
  });

  it("returns 400 validation error when daysOld is negative", async () => {
    const res = await request(createApp())
      .post("/api/companies/company-1/issues/archive-stale")
      .send({ daysOld: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockIssueService.list).not.toHaveBeenCalled();
  });

  it("returns 400 validation error when daysOld is not a number", async () => {
    const res = await request(createApp())
      .post("/api/companies/company-1/issues/archive-stale")
      .send({ daysOld: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockIssueService.list).not.toHaveBeenCalled();
  });

  it("returns 404 when company does not exist", async () => {
    mockCompanyService.getById.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/companies/nonexistent-company/issues/archive-stale")
      .send({ daysOld: 30, dryRun: true });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Company not found/);
    expect(mockIssueService.list).not.toHaveBeenCalled();
  });

  it("dryRun defaults to false when not specified", async () => {
    const staleIssues = [{ id: "issue-1", status: "todo", updatedAt: new Date("2026-01-01") }];
    mockIssueService.list.mockResolvedValue(staleIssues);
    mockIssueService.update.mockResolvedValue({ id: "issue-1", status: "cancelled" });

    const res = await request(createApp())
      .post("/api/companies/company-1/issues/archive-stale")
      .send({ daysOld: 30 });

    expect(res.status).toBe(200);
    expect(res.body.archived).toBe(1);
    expect(mockIssueService.update).toHaveBeenCalledWith("issue-1", { status: "cancelled" });
  });
});
