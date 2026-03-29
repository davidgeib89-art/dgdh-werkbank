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

describe("triad start command", () => {
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

  it("creates issue with full triad description format when all flags provided", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const createdIssue = {
      id: "issue-123",
      identifier: "DGDH-42",
      title: "Test Triad Issue",
      status: "todo",
    };

    mockApi.post.mockResolvedValue(createdIssue);

    await program.parseAsync([
      "node",
      "test",
      "triad",
      "start",
      "--company-id",
      "test-company",
      "--title",
      "Test Triad Issue",
      "--objective",
      "Implement the triad start CLI command",
      "--done-when",
      "All tests pass and CLI command works",
      "--target-folder",
      "cli/src/commands/client",
    ]);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/companies/test-company/issues",
      expect.objectContaining({
        title: "Test Triad Issue",
        description: expect.stringContaining("missionCell: triad-mission-loop-v1"),
        status: "todo",
      }),
    );

    const callArgs = mockApi.post.mock.calls[0][1];
    expect(callArgs.description).toContain("missionCell: triad-mission-loop-v1");
    expect(callArgs.description).toContain("Objective: Implement the triad start CLI command");
    expect(callArgs.description).toContain("targetFolder: cli/src/commands/client");
    expect(callArgs.description).toContain("artifactKind: code_patch");
    expect(callArgs.description).toContain("doneWhen: All tests pass and CLI command works");
    expect(callArgs.description).toContain("reviewerFocus: Verify all doneWhen criteria are met with concrete file or test evidence.");
    expect(callArgs.description).toContain("reviewerAcceptWhen: All doneWhen items satisfied with substance, not superficial paraphrase.");
    expect(callArgs.description).toContain("reviewerChangeWhen: Any doneWhen criterion missing, scope drift, out-of-scope file changes, or superficial/weak implementation.");
    expect(callArgs.description).toContain("[NEEDS INPUT]: none");
  });

  it("exits non-zero with error when required flag --title is missing", async () => {
    const program = new Command();
    registerTriadCommands(program);

    // Override process.exit to capture exit code
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });

    // Override console.error to suppress error output during test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await program.parseAsync([
        "node",
        "test",
        "triad",
        "start",
        "--company-id",
        "test-company",
        "--objective",
        "Some objective",
        "--done-when",
        "All done",
        "--target-folder",
        "cli/src",
      ]);
    } catch (err) {
      // Expected to throw
    }

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("assigns issue to first idle CEO agent when --assign-to-ceo flag is provided", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const createdIssue = {
      id: "issue-123",
      identifier: "DGDH-42",
      title: "Test Triad Issue",
      status: "todo",
    };

    const mockAgents = [
      {
        id: "agent-1",
        name: "Worker Agent",
        status: "idle",
        adapterConfig: { roleTemplateId: "worker" },
      },
      {
        id: "ceo-agent-1",
        name: "CEO Agent",
        status: "idle",
        adapterConfig: { roleTemplateId: "ceo" },
      },
      {
        id: "agent-3",
        name: "Another Worker",
        status: "idle",
        adapterConfig: { roleTemplateId: "worker" },
      },
    ];

    mockApi.post.mockResolvedValue(createdIssue);
    mockApi.get.mockResolvedValue(mockAgents);
    mockApi.patch.mockResolvedValue({ ...createdIssue, assigneeAgentId: "ceo-agent-1" });

    await program.parseAsync([
      "node",
      "test",
      "triad",
      "start",
      "--company-id",
      "test-company",
      "--title",
      "Test Triad Issue",
      "--objective",
      "Implement triad",
      "--done-when",
      "All done",
      "--target-folder",
      "cli/src",
      "--assign-to-ceo",
    ]);

    // Should fetch agents
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/agents");

    // Should create the issue
    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/companies/test-company/issues",
      expect.any(Object),
    );

    // Should assign to the first idle CEO agent
    expect(mockApi.patch).toHaveBeenCalledWith("/api/issues/issue-123", {
      assigneeAgentId: "ceo-agent-1",
    });
  });

  it("creates issue but skips assignment when --assign-to-ceo is set but no idle CEO agent exists", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const createdIssue = {
      id: "issue-123",
      identifier: "DGDH-42",
      title: "Test Triad Issue",
      status: "todo",
    };

    // All CEO agents are busy or no CEO agents present
    const mockAgents = [
      {
        id: "agent-1",
        name: "Worker Agent",
        status: "idle",
        adapterConfig: { roleTemplateId: "worker" },
      },
      {
        id: "ceo-agent-1",
        name: "CEO Agent",
        status: "running", // busy, not idle
        adapterConfig: { roleTemplateId: "ceo" },
      },
      {
        id: "ceo-agent-2",
        name: "Another CEO",
        status: "error", // also not idle
        adapterConfig: { roleTemplateId: "ceo" },
      },
    ];

    mockApi.post.mockResolvedValue(createdIssue);
    mockApi.get.mockResolvedValue(mockAgents);
    // No patch call expected

    await program.parseAsync([
      "node",
      "test",
      "triad",
      "start",
      "--company-id",
      "test-company",
      "--title",
      "Test Triad Issue",
      "--objective",
      "Implement triad",
      "--done-when",
      "All done",
      "--target-folder",
      "cli/src",
      "--assign-to-ceo",
    ]);

    // Should fetch agents
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/agents");

    // Should create the issue
    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/companies/test-company/issues",
      expect.any(Object),
    );

    // Should NOT attempt assignment since no idle CEO exists
    expect(mockApi.patch).not.toHaveBeenCalled();
  });

  it("creates issue but skips assignment when no CEO agents exist in the company", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const createdIssue = {
      id: "issue-123",
      identifier: "DGDH-42",
      title: "Test Triad Issue",
      status: "todo",
    };

    // No CEO agents at all - only workers
    const mockAgents = [
      {
        id: "agent-1",
        name: "Worker Agent",
        status: "idle",
        adapterConfig: { roleTemplateId: "worker" },
      },
      {
        id: "agent-2",
        name: "Another Worker",
        status: "idle",
        adapterConfig: { roleTemplateId: "worker" },
      },
    ];

    mockApi.post.mockResolvedValue(createdIssue);
    mockApi.get.mockResolvedValue(mockAgents);

    await program.parseAsync([
      "node",
      "test",
      "triad",
      "start",
      "--company-id",
      "test-company",
      "--title",
      "Test Triad Issue",
      "--objective",
      "Implement triad",
      "--done-when",
      "All done",
      "--target-folder",
      "cli/src",
      "--assign-to-ceo",
    ]);

    // Should fetch agents
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/agents");

    // Should create the issue
    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/companies/test-company/issues",
      expect.any(Object),
    );

    // Should NOT attempt assignment since no CEO agent exists
    expect(mockApi.patch).not.toHaveBeenCalled();
  });

  it("API error on issue creation exits with code 1", async () => {
    const program = new Command();
    registerTriadCommands(program);

    mockApi.post.mockRejectedValue({
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
        "triad",
        "start",
        "--company-id",
        "test-company",
        "--title",
        "Test Triad Issue",
        "--objective",
        "Implement triad",
        "--done-when",
        "All done",
        "--target-folder",
        "cli/src",
      ]);
    } catch (err) {
      // Expected
    }

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("gracefully handles API error on agent fetch by skipping assignment", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const createdIssue = {
      id: "issue-123",
      identifier: "DGDH-42",
      title: "Test Triad Issue",
      status: "todo",
    };

    mockApi.post.mockResolvedValue(createdIssue);
    // Agent fetch fails, but this should be handled gracefully
    mockApi.get.mockRejectedValue({
      status: 503,
      message: "Service Unavailable",
    });

    await program.parseAsync([
      "node",
      "test",
      "triad",
      "start",
      "--company-id",
      "test-company",
      "--title",
      "Test Triad Issue",
      "--objective",
      "Implement triad",
      "--done-when",
      "All done",
      "--target-folder",
      "cli/src",
      "--assign-to-ceo",
    ]);

    // Should create the issue
    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/companies/test-company/issues",
      expect.any(Object),
    );

    // Should attempt to fetch agents
    expect(mockApi.get).toHaveBeenCalledWith("/api/companies/test-company/agents");

    // Should NOT attempt assignment since agent fetch failed (graceful degradation)
    expect(mockApi.patch).not.toHaveBeenCalled();
  });
});
