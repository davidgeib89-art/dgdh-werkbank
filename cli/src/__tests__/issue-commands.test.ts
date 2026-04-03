import { describe, expect, it, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { registerIssueCommands } from "../commands/client/issue.js";
import * as common from "../commands/client/common.js";

vi.mock("../commands/client/common.js", async () => {
  const actual = await vi.importActual("../commands/client/common.js");
  return {
    ...actual as any,
    resolveCommandContext: vi.fn(),
  };
});

describe("issue commands", () => {
  const mockApi = {
    get: vi.fn(),
    patch: vi.fn(),
  };

  const VALID_ISSUE_ID = "00000000-0000-0000-0000-000000000001";
  const VALID_AGENT_ID = "00000000-0000-0000-0000-000000000002";

  beforeEach(() => {
    vi.clearAllMocks();
    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: "test-company",
      json: false,
    });
  });

  it("assigns an issue to an agent", async () => {
    const program = new Command();
    registerIssueCommands(program);

    mockApi.patch.mockResolvedValue({ id: VALID_ISSUE_ID, assigneeAgentId: VALID_AGENT_ID });

    await program.parseAsync(["node", "test", "issue", "assign", VALID_ISSUE_ID, "--agent-id", VALID_AGENT_ID]);

    expect(mockApi.patch).toHaveBeenCalledWith(`/api/issues/${VALID_ISSUE_ID}`, {
      assigneeAgentId: VALID_AGENT_ID,
    });
  });

  it("lists issues filtered by parent id", async () => {
    const program = new Command();
    registerIssueCommands(program);

    mockApi.get = vi.fn().mockResolvedValue([]);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "list",
      "--company-id",
      "test-company",
      "--parent-id",
      VALID_ISSUE_ID,
    ]);

    expect(mockApi.get).toHaveBeenCalledWith(
      `/api/companies/test-company/issues?parentId=${VALID_ISSUE_ID}`,
    );
  });

  it("unassigns an issue", async () => {
    const program = new Command();
    registerIssueCommands(program);

    mockApi.patch.mockResolvedValue({ id: VALID_ISSUE_ID, assigneeAgentId: null });

    await program.parseAsync(["node", "test", "issue", "unassign", VALID_ISSUE_ID]);

    expect(mockApi.patch).toHaveBeenCalledWith(`/api/issues/${VALID_ISSUE_ID}`, {
      assigneeAgentId: null,
    });
  });

  it("supports json output for assign", async () => {
    const program = new Command();
    registerIssueCommands(program);

    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: "test-company",
      json: true,
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const issueData = { id: VALID_ISSUE_ID, assigneeAgentId: VALID_AGENT_ID };
    mockApi.patch.mockResolvedValue(issueData);

    await program.parseAsync(["node", "test", "issue", "assign", VALID_ISSUE_ID, "--agent-id", VALID_AGENT_ID, "--json"]);

    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(issueData, null, 2));
  });

  it("handles API error on issue list and exits with code 1", async () => {
    const program = new Command();
    registerIssueCommands(program);

    mockApi.get.mockRejectedValue({
      status: 500,
      message: "Internal Server Error",
    });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await program.parseAsync([
        "node",
        "test",
        "issue",
        "list",
        "--company-id",
        "test-company",
      ]);
    } catch (err) {
      // Expected
    }

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("handles API error on issue assign and exits with code 1", async () => {
    const program = new Command();
    registerIssueCommands(program);

    mockApi.patch.mockRejectedValue({
      status: 404,
      message: "Issue not found",
    });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await program.parseAsync([
        "node",
        "test",
        "issue",
        "assign",
        VALID_ISSUE_ID,
        "--agent-id",
        VALID_AGENT_ID,
      ]);
    } catch (err) {
      // Expected
    }

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("shows next tasks grouped by status", async () => {
    const program = new Command();
    registerIssueCommands(program);

    // Mock API to return different issues for different status queries
    mockApi.get.mockImplementation((path: string) => {
      if (path.includes("status=todo")) {
        return Promise.resolve([
          { id: "1", identifier: "PC-1", title: "Ready Task", status: "todo", priority: "high", assigneeAgentId: null },
        ]);
      }
      if (path.includes("status=in_progress")) {
        return Promise.resolve([
          { id: "2", identifier: "PC-2", title: "Active Task", status: "in_progress", priority: "medium", assigneeAgentId: VALID_AGENT_ID },
        ]);
      }
      if (path.includes("status=in_review")) {
        return Promise.resolve([]);
      }
      if (path.includes("status=blocked")) {
        return Promise.resolve([
          { id: "3", identifier: "PC-3", title: "Blocked Task", status: "blocked", priority: "low", assigneeAgentId: null },
        ]);
      }
      return Promise.resolve([]);
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await program.parseAsync(["node", "test", "issue", "next", "--company-id", "test-company"]);

    // Verify API was called for all three status categories
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/issues?status=todo");
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/issues?status=in_progress");
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/issues?status=in_review");
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/issues?status=blocked");

    // Verify output contains the sections
    const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("READY");
    expect(output).toContain("ACTIVE");
    expect(output).toContain("BLOCKED");
    expect(output).toContain("Ready Task");
    expect(output).toContain("Active Task");
    expect(output).toContain("Blocked Task");

    consoleSpy.mockRestore();
  });

  it("supports json output for next command", async () => {
    const program = new Command();
    registerIssueCommands(program);

    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: "test-company",
      json: true,
    });

    mockApi.get.mockResolvedValue([]);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await program.parseAsync(["node", "test", "issue", "next", "--company-id", "test-company", "--json"]);

    // Verify JSON output with correct structure
    const outputCall = consoleSpy.mock.calls[0]?.[0];
    expect(outputCall).toBeDefined();
    const parsed = JSON.parse(outputCall as string);
    expect(parsed).toHaveProperty("ready");
    expect(parsed).toHaveProperty("active");
    expect(parsed).toHaveProperty("blocked");
    expect(Array.isArray(parsed.ready)).toBe(true);
    expect(Array.isArray(parsed.active)).toBe(true);
    expect(Array.isArray(parsed.blocked)).toBe(true);

    consoleSpy.mockRestore();
  });

  it("filters next tasks by project ID", async () => {
    const program = new Command();
    registerIssueCommands(program);

    mockApi.get.mockResolvedValue([]);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "next",
      "--company-id",
      "test-company",
      "--project-id",
      "test-project",
    ]);

    // Verify API calls include project filter
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/issues?status=todo&projectId=test-project");
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/issues?status=in_progress&projectId=test-project");
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/issues?status=in_review&projectId=test-project");
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/issues?status=blocked&projectId=test-project");
  });

  it("handles API error on next command and exits with code 1", async () => {
    const program = new Command();
    registerIssueCommands(program);

    mockApi.get.mockRejectedValue({
      status: 500,
      message: "Internal Server Error",
    });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await program.parseAsync(["node", "test", "issue", "next", "--company-id", "test-company"]);
    } catch (err) {
      // Expected
    }

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
