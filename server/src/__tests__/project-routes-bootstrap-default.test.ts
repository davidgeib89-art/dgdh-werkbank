import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectRoutes } from "../routes/projects.js";
import { errorHandler } from "../middleware/index.js";

const mockProjectService = vi.hoisted(() => ({
  create: vi.fn(),
  createWorkspace: vi.fn(),
  getById: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  logActivity: mockLogActivity,
  projectService: () => mockProjectService,
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      source: "local_implicit",
      userId: "user-1",
      companyIds: ["company-1"],
    };
    next();
  });
  app.use("/api", projectRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("project bootstrap execution workspace defaults", () => {
  let tempRoot: string;
  let gitWorkspacePath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempRoot = mkdtempSync(path.join(os.tmpdir(), "paperclip-project-bootstrap-"));
    mkdirSync(path.join(tempRoot, ".git"));
    gitWorkspacePath = path.join(tempRoot, "workspace");
    mkdirSync(gitWorkspacePath);

    mockProjectService.create.mockResolvedValue({
      id: "project-1",
      companyId: "company-1",
      name: "Canonical Run",
      executionWorkspacePolicy: null,
    });
    mockProjectService.createWorkspace.mockResolvedValue({
      id: "workspace-1",
      projectId: "project-1",
      companyId: "company-1",
      name: "workspace",
      cwd: gitWorkspacePath,
      repoUrl: null,
      isPrimary: true,
    });
    mockProjectService.getById.mockResolvedValue({
      id: "project-1",
      companyId: "company-1",
      name: "Canonical Run",
      executionWorkspacePolicy: {
        enabled: true,
        defaultMode: "isolated",
        allowIssueOverride: true,
        workspaceStrategy: { type: "git_worktree" },
      },
      workspaces: [],
      primaryWorkspace: null,
    });
    mockProjectService.update.mockResolvedValue({
      id: "project-1",
      companyId: "company-1",
      name: "Canonical Run",
      executionWorkspacePolicy: {
        enabled: true,
        defaultMode: "isolated",
        allowIssueOverride: true,
        workspaceStrategy: { type: "git_worktree" },
      },
    });
    mockLogActivity.mockResolvedValue(undefined);
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("auto-applies isolated git_worktree policy when a fresh project is created on a git-backed local workspace", async () => {
    const res = await request(createApp())
      .post("/api/companies/company-1/projects")
      .send({
        name: "Canonical Run",
        status: "planned",
        workspace: {
          name: "workspace",
          cwd: gitWorkspacePath,
          isPrimary: true,
        },
      });

    expect(res.status).toBe(201);
    expect(mockProjectService.update).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        executionWorkspacePolicy: {
          enabled: true,
          defaultMode: "isolated",
          allowIssueOverride: true,
          workspaceStrategy: { type: "git_worktree" },
        },
      }),
    );
  });

  it("backfills the bootstrap policy when the workspace is added after project creation", async () => {
    mockProjectService.getById.mockResolvedValueOnce({
      id: "project-1",
      companyId: "company-1",
      name: "Canonical Run",
      executionWorkspacePolicy: null,
      workspaces: [],
      primaryWorkspace: null,
    });

    const res = await request(createApp())
      .post("/api/projects/project-1/workspaces")
      .send({
        name: "workspace",
        cwd: gitWorkspacePath,
        isPrimary: true,
      });

    expect(res.status).toBe(201);
    expect(mockProjectService.update).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        executionWorkspacePolicy: {
          enabled: true,
          defaultMode: "isolated",
          allowIssueOverride: true,
          workspaceStrategy: { type: "git_worktree" },
        },
      }),
    );
  });
});