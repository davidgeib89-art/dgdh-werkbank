import { describe, expect, it, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { registerTriadCommands } from "../commands/client/triad.js";
import * as common from "../commands/client/common.js";

vi.mock("../commands/client/common.js", async () => {
  const actual = await vi.importActual("../commands/client/common.js");
  return {
    ...actual as any,
    resolveCommandContext: vi.fn(),
  };
});

vi.mock("@paperclipai/shared", async () => {
  const actual = await vi.importActual("@paperclipai/shared");
  return {
    ...actual as any,
  };
});

describe("triad status command", () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: "test-company",
      json: false,
    });
  });

  it("triad status command is registered and callable", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const mockResponse = {
      parentIssueId: "parent-123",
      parentStatus: "in_progress",
      children: [
        {
          issueId: "child-1",
          status: "in_progress",
          assigneeAgentName: "Worker Agent",
          triad: {
            state: "in_execution",
            reviewerWakeStatus: null,
            closeoutBlocker: null,
          },
        },
      ],
    };

    mockApi.get.mockResolvedValue(mockResponse);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

    // Verify the command runs without "unknown command" error
    await program.parseAsync([
      "node",
      "test",
      "triad",
      "status",
      "parent-123",
    ]);

    // Should have logged output
    expect(consoleLogSpy).toHaveBeenCalled();

    consoleLogSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("triad --help lists 'status' as a subcommand", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined) => {
      return undefined as never;
    });
    const stdoutWriteSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    await program.parseAsync([
      "node",
      "test",
      "triad",
      "--help",
    ]);

    const output = stdoutWriteSpy.mock.calls.map((call) => String(call[0])).join(" ");
    expect(output).toContain("status");

    exitSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
  });

  it("non-stalled issue shows state without rescue command", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const mockResponse = {
      parentIssueId: "parent-123",
      parentStatus: "in_progress",
      children: [
        {
          issueId: "child-1",
          status: "in_progress",
          assigneeAgentName: "Worker Agent",
          triad: {
            state: "in_execution",
            reviewerWakeStatus: null,
            closeoutBlocker: null,
          },
        },
      ],
    };

    mockApi.get.mockResolvedValue(mockResponse);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

    await program.parseAsync([
      "node",
      "test",
      "triad",
      "status",
      "parent-123",
    ]);

    // Should show the triad state
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls.map((call) => String(call[0])).join(" ");
    expect(output).toContain("in_execution");

    // Should NOT contain rescue command
    expect(output).not.toContain("paperclipai triad rescue");

    consoleLogSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("stalled reviewer wake shows pre-filled rescue command with correct child ID", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const mockResponse = {
      parentIssueId: "parent-123",
      parentStatus: "in_review",
      children: [
        {
          issueId: "child-1",
          status: "in_review",
          assigneeAgentName: "Worker Agent",
          triad: {
            state: "ready_for_review",
            reviewerWakeStatus: "stalled",
            closeoutBlocker: null,
          },
        },
      ],
    };

    mockApi.get.mockResolvedValue(mockResponse);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

    await program.parseAsync([
      "node",
      "test",
      "triad",
      "status",
      "parent-123",
    ]);

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls.map((call) => String(call[0])).join(" ");

    // Should show stall status
    expect(output).toContain("stalled");

    // Should show rescue command with actual child ID (not placeholder)
    expect(output).toContain("paperclipai triad rescue");
    expect(output).toContain("--issue-id child-1");
    expect(output).toContain("--reviewer-verdict accepted");

    consoleLogSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("closeout blocker shown with rescue path", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const mockResponse = {
      parentIssueId: "parent-123",
      parentStatus: "in_progress",
      children: [
        {
          issueId: "child-1",
          status: "in_progress",
          assigneeAgentName: "Worker Agent",
          triad: {
            state: "in_execution",
            reviewerWakeStatus: null,
            closeoutBlocker: {
              blockerClass: "post_tool_capacity_exhausted",
              summary: "Tool capacity exhausted during file edit",
              knownBlocker: true,
            },
          },
        },
      ],
    };

    mockApi.get.mockResolvedValue(mockResponse);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

    await program.parseAsync([
      "node",
      "test",
      "triad",
      "status",
      "parent-123",
    ]);

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls.map((call) => String(call[0])).join(" ");

    // Should show blocker description
    expect(output).toContain("Tool capacity exhausted");

    // Should show rescue guidance
    expect(output).toContain("paperclipai triad rescue");
    expect(output).toContain("--issue-id child-1");

    consoleLogSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("404 from API exits 1 with error message", async () => {
    const program = new Command();
    registerTriadCommands(program);

    // Mock API error as a plain object (as used in other tests)
    mockApi.get.mockRejectedValue({
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
        "triad",
        "status",
        "nonexistent-issue",
      ]);
    } catch (err) {
      // Expected
    }

    // Should exit with code 1
    expect(exitSpy).toHaveBeenCalledWith(1);

    // Should show error message
    expect(consoleErrorSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("network error exits 1 with error message", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const networkError = new Error("Network request failed");
    mockApi.get.mockRejectedValue(networkError);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await program.parseAsync([
        "node",
        "test",
        "triad",
        "status",
        "some-issue",
      ]);
    } catch (err) {
      // Expected
    }

    // Should exit with code 1
    expect(exitSpy).toHaveBeenCalledWith(1);

    // Should show error message
    expect(consoleErrorSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("both stalled reviewer wake and closeout blocker shown when both present", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const mockResponse = {
      parentIssueId: "parent-123",
      parentStatus: "in_review",
      children: [
        {
          issueId: "child-1",
          status: "in_review",
          assigneeAgentName: "Worker Agent",
          triad: {
            state: "ready_for_review",
            reviewerWakeStatus: "stalled",
            closeoutBlocker: {
              blockerClass: "tool_error",
              summary: "Tool execution error in previous run",
              knownBlocker: false,
            },
          },
        },
      ],
    };

    mockApi.get.mockResolvedValue(mockResponse);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

    await program.parseAsync([
      "node",
      "test",
      "triad",
      "status",
      "parent-123",
    ]);

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls.map((call) => String(call[0])).join(" ");

    // Should show both stall and blocker
    expect(output).toContain("stalled");
    expect(output).toContain("Tool execution error");
    expect(output).toContain("paperclipai triad rescue");

    consoleLogSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
