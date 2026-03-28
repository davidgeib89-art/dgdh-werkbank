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

describe("issue archive-stale command", () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  };

  const VALID_COMPANY_ID = "44850e08-61ce-44de-8ccd-b645c1f292be";

  beforeEach(() => {
    vi.clearAllMocks();
    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: VALID_COMPANY_ID,
      json: false,
    });
  });

  it("dry-run mode prints IDs that would be archived without archiving", async () => {
    const program = new Command();
    registerIssueCommands(program);

    mockApi.post.mockResolvedValue({
      archived: 0,
      issueIds: ["id1", "id2"],
    });

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "archive-stale",
      "--company-id",
      VALID_COMPANY_ID,
      "--older-than",
      "7",
      "--dry-run",
    ]);

    expect(mockApi.post).toHaveBeenCalledWith(
      `/api/companies/${VALID_COMPANY_ID}/issues/archive-stale`,
      {
        daysOld: 7,
        dryRun: true,
      },
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Would archive 2 issues:"));
    expect(consoleLogSpy).toHaveBeenCalledWith("id1");
    expect(consoleLogSpy).toHaveBeenCalledWith("id2");

    consoleLogSpy.mockRestore();
  });

  it("normal mode prints 'Archived N issues' on success", async () => {
    const program = new Command();
    registerIssueCommands(program);

    mockApi.post.mockResolvedValue({
      archived: 3,
      issueIds: ["id1", "id2", "id3"],
    });

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "archive-stale",
      "--company-id",
      VALID_COMPANY_ID,
      "--older-than",
      "7",
    ]);

    expect(mockApi.post).toHaveBeenCalledWith(
      `/api/companies/${VALID_COMPANY_ID}/issues/archive-stale`,
      {
        daysOld: 7,
        dryRun: false,
      },
    );

    expect(consoleLogSpy).toHaveBeenCalledWith("Archived 3 issues");

    consoleLogSpy.mockRestore();
  });

  it("missing --company-id uses env var and exits 1 with error when neither provided", async () => {
    const program = new Command();
    registerIssueCommands(program);

    (common.resolveCommandContext as any).mockImplementation(() => {
      throw new Error("Company ID is required");
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
        "archive-stale",
        "--older-than",
        "7",
      ]);
    } catch (err) {
      // Expected
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Company ID is required"));
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("missing --older-than exits with error", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await program.parseAsync([
        "node",
        "test",
        "issue",
        "archive-stale",
        "--company-id",
        VALID_COMPANY_ID,
      ]);
    } catch (err) {
      // Expected
    }

    // Commander will show usage and exit when a required option is missing
    expect(exitSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("API error exits with code 1", async () => {
    const program = new Command();
    registerIssueCommands(program);

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
        "issue",
        "archive-stale",
        "--company-id",
        VALID_COMPANY_ID,
        "--older-than",
        "7",
      ]);
    } catch (err) {
      // Expected
    }

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("resolves company ID from env var when --company-id not provided", async () => {
    const program = new Command();
    registerIssueCommands(program);

    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: "env-company-id",
      json: false,
    });

    mockApi.post.mockResolvedValue({
      archived: 1,
      issueIds: ["id1"],
    });

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "archive-stale",
      "--older-than",
      "7",
    ]);

    expect(mockApi.post).toHaveBeenCalledWith(
      `/api/companies/env-company-id/issues/archive-stale`,
      {
        daysOld: 7,
        dryRun: false,
      },
    );

    expect(consoleLogSpy).toHaveBeenCalledWith("Archived 1 issues");

    consoleLogSpy.mockRestore();
  });
});
