import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerIssueCommands } from "../commands/client/issue.js";
import * as common from "../commands/client/common.js";
import type {
  Issue,
  IssueExecutionPacketTruth,
  CompanyRunChain,
  CompanyRunChainChild,
  CompanyRunChainTriadTruth,
  CompanyRunChainReviewerWakeStatus,
} from "@paperclipai/shared";

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

// Types for API responses
interface ActiveRunResponse {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  agentId: string | null;
  agentName: string | null;
}

describe("issue liveness command", () => {
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

  // Helper to create mock packet truth
  function createMockPacketTruth(overrides: Partial<IssueExecutionPacketTruth> = {}): IssueExecutionPacketTruth {
    return {
      packetType: "code_patch",
      executionIntent: "fix",
      reviewPolicy: "triad",
      needsReview: true,
      targetFile: "src/index.ts",
      targetFolder: null,
      doneWhen: "tests pass",
      artifactKind: "code_patch",
      scopeMode: "file",
      executionHeavy: false,
      ready: true,
      status: "ready",
      reasonCodes: [],
      triad: {
        ceoCutStatus: "ready",
        workerPacket: {
          source: "explicit",
          goal: "Fix the bug",
          scope: "src/index.ts",
          doneWhen: "tests pass",
        },
        reviewerPacket: {
          source: "derived",
          focus: "code quality",
          acceptWhen: "clean code",
          changeWhen: "issues found",
        },
      },
      ...overrides,
    };
  }

  // Helper to create mock company-run-chain
  function createMockChain(
    children: CompanyRunChainChild[] = [],
    parentBlocker: CompanyRunChain["parentBlocker"] = null,
  ): CompanyRunChain {
    return {
      parentIssueId: "issue-123",
      parentIdentifier: "PC-123",
      parentTitle: "Test Issue",
      parentStatus: "in_progress",
      focusIssueId: children.length > 0 ? children[0].issueId : null,
      parentBlocker,
      children,
    };
  }

  // Helper to create mock chain child
  function createMockChainChild(
    overrides: Partial<CompanyRunChainChild> & { issueId: string },
  ): CompanyRunChainChild {
    const triad: CompanyRunChainTriadTruth = {
      state: "ready_to_build",
      reviewerWakeStatus: overrides.triad?.reviewerWakeStatus ?? null,
      ceoCut: {
        ceoCutStatus: "ready",
        workerPacket: {
          source: "explicit",
          goal: "Do work",
          scope: "src/",
          doneWhen: "done",
        },
        reviewerPacket: {
          source: "derived",
          focus: "quality",
          acceptWhen: "clean",
          changeWhen: "issues",
        },
      },
      workerExecution: {
        status: "not_started",
        runId: null,
        branch: null,
        commitHash: null,
        prUrl: null,
        at: null,
      },
      reviewerVerdict: {
        verdict: null,
        approvalStatus: null,
        packet: null,
        doneWhenCheck: null,
        evidence: null,
        requiredFixes: [],
        next: null,
        at: null,
      },
      closeoutBlocker: null,
      ...overrides.triad,
    };

    return {
      issueId: overrides.issueId,
      identifier: `PC-${overrides.issueId.split("-")[1]}`,
      title: `Child ${overrides.issueId}`,
      status: "todo",
      assigneeAgentId: null,
      assigneeAgentName: null,
      stages: [],
      triad,
    };
  }

  // VAL-CLI-001: Command exists and shows usage
  it("shows help with --help flag", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });

    try {
      await program.parseAsync(["node", "test", "issue", "liveness", "--help"]);
    } catch (err) {
      // Expected
    }

    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("liveness");
    expect(combinedLogs).toContain("<issueId>");

    exitSpy.mockRestore();
  });

  // VAL-CLI-002: Command requires issue-id
  it("exits with error when issue-id is missing", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`Process exit: ${code}`);
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Override mock to throw when issueId is missing (commander will handle missing arg)
    // The command should fail due to missing required argument

    try {
      await program.parseAsync(["node", "test", "issue", "liveness"]);
    } catch (err) {
      // Expected
    }

    // Commander should output usage and exit with error
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // VAL-CLI-003: Shows executionPacketTruth
  it("shows executionPacketTruth from GET /api/issues/:id", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain();
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    // Verify API calls
    expect(mockApi.get).toHaveBeenCalledTimes(3);
    expect(mockApi.get).toHaveBeenNthCalledWith(1, "/api/issues/issue-123");
    expect(mockApi.get).toHaveBeenNthCalledWith(2, "/api/issues/issue-123/company-run-chain");
    expect(mockApi.get).toHaveBeenNthCalledWith(3, "/api/issues/issue-123/active-run");

    // Verify packet truth fields in output
    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("PACKET TRUTH");
    expect(combinedLogs).toContain("ready");
    expect(combinedLogs).toContain("code_patch");
  });

  // VAL-CLI-004: Shows triad worker packet
  it("shows triad worker packet in output", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth({
        triad: {
          ceoCutStatus: "ready",
          workerPacket: {
            source: "explicit",
            goal: "Implement feature",
            scope: "src/feature.ts",
            doneWhen: "feature works",
          },
          reviewerPacket: {
            source: "derived",
            focus: "code review",
            acceptWhen: "clean code",
            changeWhen: "issues found",
          },
        },
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain();
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("Worker");
    expect(combinedLogs).toContain("Implement feature");
    expect(combinedLogs).toContain("explicit");
  });

  // VAL-CLI-005: Shows triad reviewer packet
  it("shows triad reviewer packet in output", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth({
        triad: {
          ceoCutStatus: "ready",
          workerPacket: {
            source: "explicit",
            goal: "Implement feature",
            scope: "src/feature.ts",
            doneWhen: "feature works",
          },
          reviewerPacket: {
            source: "derived",
            focus: "security review",
            acceptWhen: "no vulnerabilities",
            changeWhen: "issues found",
          },
        },
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain();
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
      "--json",
    ]);

    // In JSON mode, verify reviewer packet fields are present
    const jsonLog = logs.find((log) => log.startsWith("{"));
    expect(jsonLog).toBeDefined();

    if (jsonLog) {
      const parsed = JSON.parse(jsonLog);
      expect(parsed.packetTruth.triad.reviewerPacket).toBeDefined();
      expect(parsed.packetTruth.triad.reviewerPacket.source).toBe("derived");
      expect(parsed.packetTruth.triad.reviewerPacket.focus).toBe("security review");
    }
  });

  // VAL-CLI-006: Shows company-run-chain truth
  it("shows company-run-chain truth from GET /api/issues/:id/company-run-chain", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain([
      createMockChainChild({ issueId: "child-1", title: "Child 1" }),
      createMockChainChild({ issueId: "child-2", title: "Child 2" }),
    ]);
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("CHAIN TRUTH");
    expect(combinedLogs).toContain("child-1");
    expect(combinedLogs).toContain("child-2");
  });

  // VAL-CLI-007: Correctly classifies ready state - no children = not-started
  it("classifies no children as 'not-started' not 'stalled'", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain([]); // No children
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("not-started");
    expect(combinedLogs).not.toContain("STALLED");
  });

  // VAL-CLI-008: Detects stalled triad state correctly
  it("detects stalled children with reviewerWakeStatus: stalled", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const stalledChild = createMockChainChild({
      issueId: "stalled-child",
      triad: {
        state: "ready_to_build",
        reviewerWakeStatus: "stalled" as CompanyRunChainReviewerWakeStatus,
        ceoCut: {
          ceoCutStatus: "ready",
          workerPacket: {
            source: "explicit",
            goal: "Work",
            scope: "src/",
            doneWhen: "done",
          },
          reviewerPacket: {
            source: "derived",
            focus: "quality",
            acceptWhen: "clean",
            changeWhen: "issues",
          },
        },
        workerExecution: {
          status: "not_started",
          runId: null,
          branch: null,
          commitHash: null,
          prUrl: null,
          at: null,
        },
        reviewerVerdict: {
          verdict: null,
          approvalStatus: null,
          packet: null,
          doneWhenCheck: null,
          evidence: null,
          requiredFixes: [],
          next: null,
          at: null,
        },
        closeoutBlocker: null,
      },
    });

    const mockChain = createMockChain([stalledChild]);
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("STALLED");
    expect(combinedLogs).toContain("stalled-child");
  });

  // VAL-CLI-008: Detects stalled with closeoutBlocker
  it("detects stalled children with closeoutBlocker present", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const blockedChild = createMockChainChild({
      issueId: "blocked-child",
      triad: {
        state: "ready_to_build",
        reviewerWakeStatus: null,
        ceoCut: {
          ceoCutStatus: "ready",
          workerPacket: {
            source: "explicit",
            goal: "Work",
            scope: "src/",
            doneWhen: "done",
          },
          reviewerPacket: {
            source: "derived",
            focus: "quality",
            acceptWhen: "clean",
            changeWhen: "issues",
          },
        },
        workerExecution: {
          status: "not_started",
          runId: null,
          branch: null,
          commitHash: null,
          prUrl: null,
          at: null,
        },
        reviewerVerdict: {
          verdict: null,
          approvalStatus: null,
          packet: null,
          doneWhenCheck: null,
          evidence: null,
          requiredFixes: [],
          next: null,
          at: null,
        },
        closeoutBlocker: {
          blockerClass: "resume_failed",
          blockerState: "needs_retry",
          summary: "Resume failed due to network error",
          knownBlocker: true,
          nextResumePoint: "worker_execution",
          nextWakeStatus: "queued",
          nextWakeNotBefore: null,
          resumeStrategy: "retry",
          resumeSource: "system",
          resumeRunId: null,
          resumeRunStatus: null,
          resumeAt: null,
          sameSessionPath: false,
        },
      },
    });

    const mockChain = createMockChain([blockedChild]);
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("STALLED");
    expect(combinedLogs).toContain("blocked-child");
    expect(combinedLogs).toContain("Closeout Blocker");
  });

  // VAL-CLI-009: Shows rescue guidance for stalled children
  it("shows rescue command for stalled children", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const stalledChild = createMockChainChild({
      issueId: "stalled-child",
      triad: {
        state: "ready_to_build",
        reviewerWakeStatus: "stalled" as CompanyRunChainReviewerWakeStatus,
        ceoCut: {
          ceoCutStatus: "ready",
          workerPacket: {
            source: "explicit",
            goal: "Work",
            scope: "src/",
            doneWhen: "done",
          },
          reviewerPacket: {
            source: "derived",
            focus: "quality",
            acceptWhen: "clean",
            changeWhen: "issues",
          },
        },
        workerExecution: {
          status: "not_started",
          runId: null,
          branch: null,
          commitHash: null,
          prUrl: null,
          at: null,
        },
        reviewerVerdict: {
          verdict: null,
          approvalStatus: null,
          packet: null,
          doneWhenCheck: null,
          evidence: null,
          requiredFixes: [],
          next: null,
          at: null,
        },
        closeoutBlocker: null,
      },
    });

    const mockChain = createMockChain([stalledChild]);
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("rescue");
    expect(combinedLogs).toContain("stalled-child");
  });

  // VAL-CLI-010: Shows active-run truth
  it("shows active-run truth from GET /api/issues/:id/active-run", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: "agent-1",
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain([]);
    const mockActiveRun: ActiveRunResponse = {
      id: "run-123",
      status: "running",
      startedAt: "2026-03-28T10:00:00.000Z",
      finishedAt: null,
      agentId: "agent-1",
      agentName: "Worker Agent",
    };

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("ACTIVE RUN");
    expect(combinedLogs).toContain("running");
    expect(combinedLogs).toContain("run-123");
  });

  // VAL-CLI-011: Correctly classifies not-started vs stalled vs running
  it("classifies not-started when no active run and no children", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "todo",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain([]);
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("not-active");
    expect(combinedLogs).not.toContain("STALLED");
  });

  // VAL-CLI-011: Classifies running when active run exists
  it("classifies running when active run is present", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: "agent-1",
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain([]);
    const mockActiveRun: ActiveRunResponse = {
      id: "run-123",
      status: "running",
      startedAt: "2026-03-28T10:00:00.000Z",
      finishedAt: null,
      agentId: "agent-1",
      agentName: "Worker Agent",
    };

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join(" ");
    expect(combinedLogs).toContain("running");
  });

  // VAL-CLI-012: Human-readable output has distinct sections
  it("shows all three truth surfaces in distinct labelled sections", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain([
      createMockChainChild({ issueId: "child-1" }),
    ]);
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join("\n");
    // Verify distinct sections exist
    expect(combinedLogs).toContain("PACKET TRUTH");
    expect(combinedLogs).toContain("CHAIN TRUTH");
    expect(combinedLogs).toContain("ACTIVE RUN");
  });

  // VAL-CLI-013: --json flag returns parseable JSON
  it("returns valid JSON with all three surfaces when --json flag used", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth({
        triad: {
          ceoCutStatus: "ready",
          workerPacket: {
            source: "explicit",
            goal: "Fix the bug",
            scope: "src/index.ts",
            doneWhen: "tests pass",
          },
          reviewerPacket: {
            source: "derived",
            focus: "security",
            acceptWhen: "no issues",
            changeWhen: "problems found",
          },
        },
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain([
      createMockChainChild({ issueId: "child-1" }),
    ]);
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    // Update mock to return json: true
    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: "test-company-id",
      json: true,
    });

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
      "--json",
    ]);

    // Verify JSON output is parseable
    const jsonLog = logs.find((log) => log.startsWith("{"));
    expect(jsonLog).toBeDefined();

    const parsed = JSON.parse(jsonLog!);

    // All three surfaces present
    expect(parsed).toHaveProperty("packetTruth");
    expect(parsed).toHaveProperty("chainTruth");
    expect(parsed).toHaveProperty("activeRun");

    // Packet truth details
    expect(parsed.packetTruth).toHaveProperty("status");
    expect(parsed.packetTruth).toHaveProperty("triad");
    expect(parsed.packetTruth.triad).toHaveProperty("ceoCutStatus");
    expect(parsed.packetTruth.triad).toHaveProperty("workerPacket");
    expect(parsed.packetTruth.triad).toHaveProperty("reviewerPacket");

    // Chain truth details
    expect(parsed.chainTruth).toHaveProperty("parentIssueId");
    expect(parsed.chainTruth).toHaveProperty("children");

    // Active run details
    expect(parsed.activeRun).toHaveProperty("status");
  });

  // VAL-CLI-014: Suppresses cosmetic null noise, not diagnostic state
  it("never suppresses reasonCodes, stalled state, closeoutBlocker, or packet-readiness", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth({
        status: "not_ready",
        reasonCodes: ["target_file_missing", "donewhen_missing"],
        ready: false,
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const stalledChild = createMockChainChild({
      issueId: "stalled-child",
      triad: {
        state: "ready_to_build",
        reviewerWakeStatus: "stalled" as CompanyRunChainReviewerWakeStatus,
        ceoCut: {
          ceoCutStatus: "ready",
          workerPacket: {
            source: "explicit",
            goal: "Work",
            scope: "src/",
            doneWhen: "done",
          },
          reviewerPacket: {
            source: "derived",
            focus: "quality",
            acceptWhen: "clean",
            changeWhen: "issues",
          },
        },
        workerExecution: {
          status: "not_started",
          runId: null,
          branch: null,
          commitHash: null,
          prUrl: null,
          at: null,
        },
        reviewerVerdict: {
          verdict: null,
          approvalStatus: null,
          packet: null,
          doneWhenCheck: null,
          evidence: null,
          requiredFixes: [],
          next: null,
          at: null,
        },
        closeoutBlocker: {
          blockerClass: "resume_failed",
          blockerState: "needs_retry",
          summary: "Resume failed",
          knownBlocker: true,
          nextResumePoint: "worker_execution",
          nextWakeStatus: "queued",
          nextWakeNotBefore: null,
          resumeStrategy: "retry",
          resumeSource: "system",
          resumeRunId: null,
          resumeRunStatus: null,
          resumeAt: null,
          sameSessionPath: false,
        },
      },
    });

    const mockChain = createMockChain([stalledChild]);
    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join(" ");
    // Diagnostic state must be visible
    expect(combinedLogs).toContain("not_ready");
    expect(combinedLogs).toContain("target_file_missing");
    expect(combinedLogs).toContain("STALLED");
    expect(combinedLogs).toContain("Closeout Blocker");
  });

  // VAL-CROSS-001: Three truths are independent and non-collapsed
  it("keeps three truth surfaces as separate sections without summary collapse", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth({
        status: "ready",
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain([
      createMockChainChild({
        issueId: "child-1",
        triad: {
          state: "ready_to_build",
          reviewerWakeStatus: "stalled" as CompanyRunChainReviewerWakeStatus,
          ceoCut: {
            ceoCutStatus: "ready",
            workerPacket: {
              source: "explicit",
              goal: "Work",
              scope: "src/",
              doneWhen: "done",
            },
            reviewerPacket: {
              source: "derived",
              focus: "quality",
              acceptWhen: "clean",
              changeWhen: "issues",
            },
          },
          workerExecution: {
            status: "not_started",
            runId: null,
            branch: null,
            commitHash: null,
            prUrl: null,
            at: null,
          },
          reviewerVerdict: {
            verdict: null,
            approvalStatus: null,
            packet: null,
            doneWhenCheck: null,
            evidence: null,
            requiredFixes: [],
            next: null,
            at: null,
          },
          closeoutBlocker: null,
        },
      }),
    ]);

    const mockActiveRun: ActiveRunResponse | null = null;

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockResolvedValueOnce(mockActiveRun);

    await program.parseAsync([
      "node",
      "test",
      "issue",
      "liveness",
      "issue-123",
    ]);

    const combinedLogs = logs.join(" ");
    // Should NOT have a single collapsed summary like "liveness: ok" or "liveness: fail"
    expect(combinedLogs).not.toMatch(/liveness:\s*(ok|fail|healthy|unhealthy)/i);

    // Should have three independent sections
    expect(combinedLogs).toContain("PACKET TRUTH");
    expect(combinedLogs).toContain("CHAIN TRUTH");
    expect(combinedLogs).toContain("ACTIVE RUN");

    // Packet shows ready, chain shows stalled - independent truths
    expect(combinedLogs).toContain("ready");
    expect(combinedLogs).toContain("STALLED");
  });

  // Error handling: API error on issue endpoint
  it("exits with code 1 when issue API fails", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`Process exit: ${code}`);
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockApi.get.mockRejectedValueOnce(new Error("API Error: Issue not found"));

    try {
      await program.parseAsync([
        "node",
        "test",
        "issue",
        "liveness",
        "issue-123",
      ]);
    } catch (err) {
      // Expected
    }

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // Error handling: API error on chain endpoint
  it("exits with code 1 when chain API fails", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`Process exit: ${code}`);
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockRejectedValueOnce(new Error("API Error: Chain not found"));

    try {
      await program.parseAsync([
        "node",
        "test",
        "issue",
        "liveness",
        "issue-123",
      ]);
    } catch (err) {
      // Expected
    }

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // Error handling: API error on active-run endpoint
  it("exits with code 1 when active-run API fails", async () => {
    const program = new Command();
    registerIssueCommands(program);

    const mockIssue: Issue = {
      id: "issue-123",
      companyId: "test-company-id",
      projectId: null,
      goalId: null,
      parentId: null,
      title: "Test Issue",
      description: null,
      status: "in_progress",
      priority: "normal",
      assigneeAgentId: null,
      assigneeUserId: null,
      checkoutRunId: null,
      executionRunId: null,
      executionAgentNameKey: null,
      executionLockedAt: null,
      createdByAgentId: null,
      createdByUserId: null,
      issueNumber: 123,
      identifier: "PC-123",
      requestDepth: 0,
      billingCode: null,
      assigneeAdapterOverrides: null,
      executionWorkspaceSettings: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
      labelIds: [],
      labels: [],
      planDocument: null,
      documentSummaries: [],
      legacyPlanDocument: null,
      project: null,
      goal: null,
      mentionedProjects: [],
      executionPacketTruth: createMockPacketTruth(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChain = createMockChain([]);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`Process exit: ${code}`);
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockApi.get
      .mockResolvedValueOnce(mockIssue)
      .mockResolvedValueOnce(mockChain)
      .mockRejectedValueOnce(new Error("API Error: Active run not found"));

    try {
      await program.parseAsync([
        "node",
        "test",
        "issue",
        "liveness",
        "issue-123",
      ]);
    } catch (err) {
      // Expected
    }

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
