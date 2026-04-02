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
    expect(callArgs.description).toContain("artifactKind: multi_file_change");
    expect(callArgs.description).toContain("doneWhen: All tests pass and CLI command works");
    expect(callArgs.description).toContain("reviewerFocus: Verify all doneWhen criteria are met with concrete file or test evidence.");
    expect(callArgs.description).toContain("reviewerAcceptWhen: All doneWhen items satisfied with substance, not superficial paraphrase.");
    expect(callArgs.description).toContain("reviewerChangeWhen: Any doneWhen criterion missing, scope drift, out-of-scope file changes, or superficial/weak implementation.");
    expect(callArgs.description).toContain("[NEEDS INPUT]: none");
  });

  it("infers artifactKind: code_patch from .ts targetFile", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const createdIssue = {
      id: "issue-124",
      identifier: "DGDH-43",
      title: "Auth Implementation",
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
      "Auth Implementation",
      "--objective",
      "Implement authentication middleware",
      "--done-when",
      "Auth middleware passes all tests",
      "--target-file",
      "src/auth.ts",
    ]);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/companies/test-company/issues",
      expect.objectContaining({
        title: "Auth Implementation",
        description: expect.stringContaining("artifactKind: code_patch"),
      }),
    );

    const callArgs = mockApi.post.mock.calls[0][1];
    expect(callArgs.description).toContain("artifactKind: code_patch");
    expect(callArgs.description).toContain("targetFile: src/auth.ts");
  });

  it("infers artifactKind: doc_update from .md targetFile", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const createdIssue = {
      id: "issue-125",
      identifier: "DGDH-44",
      title: "Update README",
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
      "Update README",
      "--objective",
      "Add installation instructions",
      "--done-when",
      "README has clear setup steps",
      "--target-file",
      "doc/README.md",
    ]);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/companies/test-company/issues",
      expect.objectContaining({
        title: "Update README",
        description: expect.stringContaining("artifactKind: doc_update"),
      }),
    );

    const callArgs = mockApi.post.mock.calls[0][1];
    expect(callArgs.description).toContain("artifactKind: doc_update");
    expect(callArgs.description).toContain("targetFile: doc/README.md");
  });

  it("infers artifactKind: config_change from .json targetFile", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const createdIssue = {
      id: "issue-126",
      identifier: "DGDH-45",
      title: "Update Dependencies",
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
      "Update Dependencies",
      "--objective",
      "Add new package dependency",
      "--done-when",
      "Package installs correctly",
      "--target-file",
      "package.json",
    ]);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/companies/test-company/issues",
      expect.objectContaining({
        title: "Update Dependencies",
        description: expect.stringContaining("artifactKind: config_change"),
      }),
    );

    const callArgs = mockApi.post.mock.calls[0][1];
    expect(callArgs.description).toContain("artifactKind: config_change");
    expect(callArgs.description).toContain("targetFile: package.json");
  });

  it("infers artifactKind: test_update from .test.ts targetFile", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const createdIssue = {
      id: "issue-127",
      identifier: "DGDH-46",
      title: "Add Auth Tests",
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
      "Add Auth Tests",
      "--objective",
      "Write unit tests for auth module",
      "--done-when",
      "All auth tests pass",
      "--target-file",
      "src/foo.test.ts",
    ]);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/companies/test-company/issues",
      expect.objectContaining({
        title: "Add Auth Tests",
        description: expect.stringContaining("artifactKind: test_update"),
      }),
    );

    const callArgs = mockApi.post.mock.calls[0][1];
    expect(callArgs.description).toContain("artifactKind: test_update");
    expect(callArgs.description).toContain("targetFile: src/foo.test.ts");
  });

  it("infers artifactKind: multi_file_change for folder-only (no targetFile)", async () => {
    const program = new Command();
    registerTriadCommands(program);

    const createdIssue = {
      id: "issue-128",
      identifier: "DGDH-47",
      title: "Refactor Services",
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
      "Refactor Services",
      "--objective",
      "Refactor the services folder structure",
      "--done-when",
      "Services are properly organized",
      "--target-folder",
      "server/src/services",
    ]);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/companies/test-company/issues",
      expect.objectContaining({
        title: "Refactor Services",
        description: expect.stringContaining("artifactKind: multi_file_change"),
      }),
    );

    const callArgs = mockApi.post.mock.calls[0][1];
    expect(callArgs.description).toContain("artifactKind: multi_file_change");
    expect(callArgs.description).toContain("targetFolder: server/src/services");
    expect(callArgs.description).not.toContain("targetFile:");
  });

  it("exits non-zero when target-folder is broad root scope", async () => {
    const program = new Command();
    registerTriadCommands(program);

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
        "Broad Scope Issue",
        "--objective",
        "Try root scope",
        "--done-when",
        "Should fail before issue creation",
        "--target-folder",
        ".",
      ]);
    } catch {
      // expected
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockApi.post).not.toHaveBeenCalled();

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("exits non-zero when target-folder accidentally consumes another flag", async () => {
    const program = new Command();
    registerTriadCommands(program);

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
        "Malformed Scope Issue",
        "--objective",
        "Try malformed target-folder",
        "--done-when",
        "Should fail before issue creation",
        "--target-folder",
        "--assign-to-ceo",
      ]);
    } catch {
      // expected
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockApi.post).not.toHaveBeenCalled();

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
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
