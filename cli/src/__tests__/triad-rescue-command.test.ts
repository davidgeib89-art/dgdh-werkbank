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

describe("triad rescue command", () => {
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

  it("worker rescue flags provided, mock API returns 200 → exits 0, prints success", async () => {
    const program = new Command();
    registerTriadCommands(program);

    mockApi.post.mockResolvedValue({ success: true, issueId: "issue-123" });

    // Override process.exit to capture exit code
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });

    // Override console.log to capture success message
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await program.parseAsync([
        "node",
        "test",
        "triad",
        "rescue",
        "--issue-id",
        "issue-123",
        "--pr-url",
        "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        "--branch",
        "dgdh/issue-DGDH-123-worker-rescue",
        "--commit",
        "a1b2c3d4e5f6a7b8c9d0",
      ]);
    } catch (err) {
      // Expected to throw due to process.exit mock
    }

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/issues/issue-123/worker-rescue",
      expect.objectContaining({
        prUrl: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/123",
        branch: "dgdh/issue-DGDH-123-worker-rescue",
        commitHash: "a1b2c3d4e5f6a7b8c9d0",
        summary: "Operator rescue closeout",
      }),
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("✓ Worker rescue successful"));
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("missing required worker rescue flags (no pr-url, branch, commit) → exits non-zero with error", async () => {
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
        "rescue",
        "--issue-id",
        "issue-123",
      ]);
    } catch (err) {
      // Expected to throw
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("pr-url"));

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("--reviewer-verdict accepted, mock API returns 200 → exits 0, prints success, calls reviewer-verdict endpoint", async () => {
    const program = new Command();
    registerTriadCommands(program);

    mockApi.post.mockResolvedValue({
      status: "reviewer_accepted",
      approval: { status: "accepted" },
    });

    // Override process.exit to capture exit code
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });

    // Override console.log to capture success message
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await program.parseAsync([
        "node",
        "test",
        "triad",
        "rescue",
        "--issue-id",
        "issue-123",
        "--reviewer-verdict",
        "accepted",
      ]);
    } catch (err) {
      // Expected to throw due to process.exit mock
    }

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/issues/issue-123/reviewer-verdict",
      expect.objectContaining({
        verdict: "accepted",
        requiredFixes: [],
        evidence: "Operator rescue",
        doneWhenCheck: "Operator rescue closeout",
      }),
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("✓ Reviewer verdict 'accepted' recorded"));
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("--reviewer-verdict changes_requested, mock API returns 200 → exits 0, calls reviewer-verdict endpoint", async () => {
    const program = new Command();
    registerTriadCommands(program);

    mockApi.post.mockResolvedValue({
      status: "in_progress",
      approval: { status: "changes_requested" },
    });

    // Override process.exit to capture exit code
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });

    // Override console.log to capture success message
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await program.parseAsync([
        "node",
        "test",
        "triad",
        "rescue",
        "--issue-id",
        "issue-123",
        "--reviewer-verdict",
        "changes_requested",
      ]);
    } catch (err) {
      // Expected to throw due to process.exit mock
    }

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/issues/issue-123/reviewer-verdict",
      expect.objectContaining({
        verdict: "changes_requested",
        requiredFixes: [],
        evidence: "Operator rescue",
        doneWhenCheck: "Operator rescue closeout",
      }),
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("✓ Reviewer verdict 'changes_requested' recorded"));
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
});
