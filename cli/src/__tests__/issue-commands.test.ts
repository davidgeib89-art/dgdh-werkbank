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
});
