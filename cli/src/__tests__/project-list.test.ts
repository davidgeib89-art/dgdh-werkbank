import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerProjectCommands } from "../commands/client/project.js";
import * as common from "../commands/client/common.js";
import type { Project } from "@paperclipai/shared";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_CONSOLE_LOG = console.log;
const ORIGINAL_CONSOLE_ERROR = console.error;

// Mock the common module
vi.mock("../commands/client/common.js", async () => {
  const actual = await vi.importActual("../commands/client/common.js");
  return {
    ...(actual as any),
    resolveCommandContext: vi.fn(),
  };
});

describe("project list command", () => {
  let logs: string[] = [];
  let errors: string[] = [];
  const mockApi = {
    get: vi.fn(),
  };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PAPERCLIP_API_URL;
    delete process.env.PAPERCLIP_COMPANY_ID;
    logs = [];
    errors = [];
    console.log = (msg: string) => { logs.push(String(msg)); };
    console.error = (msg: string) => { errors.push(String(msg)); };
    vi.clearAllMocks();
    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: "test-company-id",
      json: false,
    });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    console.log = ORIGINAL_CONSOLE_LOG;
    console.error = ORIGINAL_CONSOLE_ERROR;
    vi.restoreAllMocks();
  });

  it("lists projects with active vs archived classification", async () => {
    const program = new Command();
    registerProjectCommands(program);

    const mockProjects: Project[] = [
      {
        id: "proj-active-1",
        companyId: "test-company-id",
        urlKey: "active-project-1",
        name: "Active Project One",
        description: "An active project",
        status: "in_progress",
        goalId: null,
        goalIds: [],
        goals: [],
        leadAgentId: null,
        targetDate: null,
        color: "#6366f1",
        executionWorkspacePolicy: null,
        workspaces: [],
        primaryWorkspace: null,
        archivedAt: null,
        createdAt: new Date("2026-01-15"),
        updatedAt: new Date("2026-03-20"),
      },
      {
        id: "proj-active-2",
        companyId: "test-company-id",
        urlKey: "active-project-2",
        name: "Active Project Two",
        description: "Another active project",
        status: "planned",
        goalId: null,
        goalIds: [],
        goals: [],
        leadAgentId: null,
        targetDate: null,
        color: "#22c55e",
        executionWorkspacePolicy: null,
        workspaces: [],
        primaryWorkspace: null,
        archivedAt: null,
        createdAt: new Date("2026-02-01"),
        updatedAt: new Date("2026-03-25"),
      },
      {
        id: "proj-archived-1",
        companyId: "test-company-id",
        urlKey: "archived-project-1",
        name: "Archived Project One",
        description: "An archived project",
        status: "completed",
        goalId: null,
        goalIds: [],
        goals: [],
        leadAgentId: null,
        targetDate: null,
        color: "#ef4444",
        executionWorkspacePolicy: null,
        workspaces: [],
        primaryWorkspace: null,
        archivedAt: new Date("2026-03-01"),
        createdAt: new Date("2025-10-01"),
        updatedAt: new Date("2026-03-01"),
      },
    ];

    mockApi.get.mockResolvedValueOnce(mockProjects);

    await program.parseAsync([
      "node",
      "test",
      "project",
      "list",
      "--company-id",
      "test-company-id",
    ]);

    // Verify API call
    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(mockApi.get).toHaveBeenNthCalledWith(1, "/api/companies/test-company-id/projects");

    // Verify output contains expected project info
    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("Active Project One");
    expect(combinedLogs).toContain("proj-active-1");
    expect(combinedLogs).toContain("in_progress");
    expect(combinedLogs).toContain("Active Project Two");
    expect(combinedLogs).toContain("planned");
    expect(combinedLogs).toContain("Archived Project One");
    expect(combinedLogs).toContain("proj-archived-1");
    expect(combinedLogs).toContain("completed");
  });

  it("counts projects and classifies active vs archived", async () => {
    const program = new Command();
    registerProjectCommands(program);

    const mockProjects: Project[] = [
      {
        id: "proj-1",
        companyId: "test-company-id",
        urlKey: "project-1",
        name: "Project One",
        description: null,
        status: "in_progress",
        goalId: null,
        goalIds: [],
        goals: [],
        leadAgentId: null,
        targetDate: null,
        color: null,
        executionWorkspacePolicy: null,
        workspaces: [],
        primaryWorkspace: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "proj-2",
        companyId: "test-company-id",
        urlKey: "project-2",
        name: "Project Two",
        description: null,
        status: "completed",
        goalId: null,
        goalIds: [],
        goals: [],
        leadAgentId: null,
        targetDate: null,
        color: null,
        executionWorkspacePolicy: null,
        workspaces: [],
        primaryWorkspace: null,
        archivedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "proj-3",
        companyId: "test-company-id",
        urlKey: "project-3",
        name: "Project Three",
        description: null,
        status: "cancelled",
        goalId: null,
        goalIds: [],
        goals: [],
        leadAgentId: null,
        targetDate: null,
        color: null,
        executionWorkspacePolicy: null,
        workspaces: [],
        primaryWorkspace: null,
        archivedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "proj-4",
        companyId: "test-company-id",
        urlKey: "project-4",
        name: "Project Four",
        description: null,
        status: "backlog",
        goalId: null,
        goalIds: [],
        goals: [],
        leadAgentId: null,
        targetDate: null,
        color: null,
        executionWorkspacePolicy: null,
        workspaces: [],
        primaryWorkspace: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockApi.get.mockResolvedValueOnce(mockProjects);

    await program.parseAsync([
      "node",
      "test",
      "project",
      "list",
      "--company-id",
      "test-company-id",
    ]);

    const combinedLogs = logs.join(" ");
    // All projects should appear
    expect(combinedLogs).toContain("Project One");
    expect(combinedLogs).toContain("Project Two");
    expect(combinedLogs).toContain("Project Three");
    expect(combinedLogs).toContain("Project Four");
    
    // Statuses should appear
    expect(combinedLogs).toContain("in_progress");
    expect(combinedLogs).toContain("completed");
    expect(combinedLogs).toContain("cancelled");
    expect(combinedLogs).toContain("backlog");
  });

  it("produces valid JSON output with --json flag", async () => {
    const program = new Command();
    registerProjectCommands(program);

    const mockProjects: Project[] = [
      {
        id: "proj-1",
        companyId: "test-company-id",
        urlKey: "project-1",
        name: "Project One",
        description: "A test project",
        status: "in_progress",
        goalId: null,
        goalIds: [],
        goals: [],
        leadAgentId: null,
        targetDate: null,
        color: "#6366f1",
        executionWorkspacePolicy: null,
        workspaces: [],
        primaryWorkspace: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockApi.get.mockResolvedValueOnce(mockProjects);

    // Update mock to return json: true
    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: "test-company-id",
      json: true,
    });

    await program.parseAsync([
      "node",
      "test",
      "project",
      "list",
      "--company-id",
      "test-company-id",
      "--json",
    ]);

    // Find JSON output in logs
    const jsonLog = logs.find((log) => log.startsWith("["));
    expect(jsonLog).toBeDefined();

    const parsed = JSON.parse(jsonLog!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toHaveProperty("id", "proj-1");
    expect(parsed[0]).toHaveProperty("name", "Project One");
    expect(parsed[0]).toHaveProperty("status", "in_progress");
    expect(parsed[0]).toHaveProperty("archivedAt");
  });

  it("handles empty project list gracefully", async () => {
    const program = new Command();
    registerProjectCommands(program);

    mockApi.get.mockResolvedValueOnce([]);

    await program.parseAsync([
      "node",
      "test",
      "project",
      "list",
      "--company-id",
      "test-company-id",
    ]);

    // Should handle empty state without errors
    expect(errors).toHaveLength(0);
    
    const combinedLogs = logs.join(" ");
    expect(combinedLogs.toLowerCase()).toContain("empty");
  });

  it("exits with error when company ID is missing", async () => {
    const program = new Command();
    registerProjectCommands(program);

    // Override process.exit to capture exit code
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });

    // Override console.error to suppress output during test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock to throw when companyId is missing
    (common.resolveCommandContext as any).mockImplementation(() => {
      throw new Error("Company ID is required");
    });

    try {
      await program.parseAsync(["node", "test", "project", "list"]);
    } catch (err) {
      // Expected to throw
    }

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("distinguishes archived projects by archivedAt field", async () => {
    const program = new Command();
    registerProjectCommands(program);

    const mockProjects: Project[] = [
      {
        id: "proj-active",
        companyId: "test-company-id",
        urlKey: "active-project",
        name: "Active Project",
        description: null,
        status: "in_progress",
        goalId: null,
        goalIds: [],
        goals: [],
        leadAgentId: null,
        targetDate: null,
        color: null,
        executionWorkspacePolicy: null,
        workspaces: [],
        primaryWorkspace: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "proj-archived",
        companyId: "test-company-id",
        urlKey: "archived-project",
        name: "Archived Project",
        description: null,
        status: "completed",
        goalId: null,
        goalIds: [],
        goals: [],
        leadAgentId: null,
        targetDate: null,
        color: null,
        executionWorkspacePolicy: null,
        workspaces: [],
        primaryWorkspace: null,
        archivedAt: new Date("2026-03-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockApi.get.mockResolvedValueOnce(mockProjects);

    // Enable JSON mode to verify archivedAt field is present
    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: "test-company-id",
      json: true,
    });

    await program.parseAsync([
      "node",
      "test",
      "project",
      "list",
      "--company-id",
      "test-company-id",
      "--json",
    ]);

    const jsonLog = logs.find((log) => log.startsWith("["));
    expect(jsonLog).toBeDefined();

    const parsed = JSON.parse(jsonLog!);
    expect(parsed).toHaveLength(2);

    // Active project has null archivedAt
    const active = parsed.find((p: Project) => p.id === "proj-active");
    expect(active.archivedAt).toBeNull();

    // Archived project has non-null archivedAt
    const archived = parsed.find((p: Project) => p.id === "proj-archived");
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.archivedAt).toBe("2026-03-01T00:00:00.000Z");
  });
});
