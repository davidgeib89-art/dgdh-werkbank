import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueRoutes } from "../routes/issues.js";
import { errorHandler } from "../middleware/index.js";

const mockIssueService = vi.hoisted(() => ({
  create: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  assertCheckoutOwner: vi.fn(),
  addComment: vi.fn(),
  findMentionedAgents: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  wakeup: vi.fn(),
  getRun: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

const issueId1 = "11111111-1111-4111-8111-111111111111";
const issueId2 = "22222222-2222-4222-8222-222222222222";
const companyId = "company-1";
const projectId1 = "33333333-3333-4333-8333-333333333333";
const projectId2 = "44444444-4444-4444-8444-444444444444";
const agentId1 = "55555555-5555-4555-8555-555555555555";
const agentId2 = "66666666-6666-4666-8666-666666666666";

vi.mock("../services/index.js", () => ({
  accessService: () => ({ canUser: vi.fn().mockResolvedValue(true), hasPermission: vi.fn().mockResolvedValue(true) }),
  activityService: () => ({ forIssue: vi.fn(), runsForIssue: vi.fn() }),
  agentService: () => ({ getById: vi.fn(), list: vi.fn() }),
  ceoService: () => ({
    mergeIssuePullRequest: vi.fn(),
    maybeRunMergeOrchestratorAfterReviewerVerdict: vi.fn(),
    listChildrenByParentId: vi.fn(),
  }),
  goalService: () => ({}),
  heartbeatService: () => mockHeartbeatService,
  githubPrService: () => ({ createGitHubPR: vi.fn() }),
  issueApprovalService: () => ({}),
  issueService: () => mockIssueService,
  documentService: () => ({}),
  logActivity: mockLogActivity,
  projectService: () => ({}),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      source: "local_implicit",
      userId: "user-1",
      companyIds: [companyId],
    };
    next();
  });
  app.use("/api", issueRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

describe("issue assignment wakeup context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeartbeatService.wakeup.mockResolvedValue({ queued: true });
    mockHeartbeatService.getRun.mockResolvedValue(null);
    mockLogActivity.mockResolvedValue(undefined);
    mockIssueService.assertCheckoutOwner.mockResolvedValue({ adoptedFromRunId: null });
    mockIssueService.findMentionedAgents.mockResolvedValue([]);
  });

  it("includes company and project context on issue create wakeups", async () => {
    mockIssueService.create.mockResolvedValue({
      id: issueId1,
      companyId,
      projectId: projectId1,
      goalId: null,
      parentId: null,
      identifier: "DAV-100",
      title: "Test",
      description: "verifiedSkill: ceo-native-issue-handoff-primitives",
      status: "todo",
      assigneeAgentId: agentId1,
    });

    const res = await request(createApp())
      .post(`/api/companies/${companyId}/issues`)
      .send({
        title: "Test",
        description: "verifiedSkill: ceo-native-issue-handoff-primitives",
        projectId: projectId1,
        status: "todo",
        assigneeAgentId: agentId1,
      });

    expect(res.status).toBe(201);
    expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith(
      agentId1,
      expect.objectContaining({
        contextSnapshot: expect.objectContaining({
          issueId: issueId1,
          taskId: issueId1,
          companyId,
          projectId: projectId1,
          issueIdentifier: "DAV-100",
          requestedMissionCellIds: [],
          requestedCapabilityIds: ["ceo-native-issue-handoff-primitives"],
          issueCapabilityReferences: [
            expect.objectContaining({
              capabilityId: "ceo-native-issue-handoff-primitives",
              maturity: "verified",
            }),
          ],
          source: "issue.create",
        }),
      }),
    );
  });

  it("includes company and project context on assignment update wakeups", async () => {
    mockIssueService.getById.mockResolvedValue({
      id: issueId2,
      companyId,
      projectId: projectId2,
      goalId: null,
      parentId: null,
      identifier: "DAV-101",
      title: "Reassign me",
      description: "verifiedSkill: ceo-native-issue-handoff-primitives",
      status: "todo",
      assigneeAgentId: null,
      assigneeUserId: null,
    });
    mockIssueService.update.mockResolvedValue({
      id: issueId2,
      companyId,
      projectId: projectId2,
      goalId: null,
      parentId: null,
      identifier: "DAV-101",
      title: "Reassign me",
      description: "verifiedSkill: ceo-native-issue-handoff-primitives",
      status: "todo",
      assigneeAgentId: agentId2,
      assigneeUserId: null,
    });

    const res = await request(createApp())
      .patch(`/api/issues/${issueId2}`)
      .send({ assigneeAgentId: agentId2 });

    expect(res.status).toBe(200);
    expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith(
      agentId2,
      expect.objectContaining({
        contextSnapshot: expect.objectContaining({
          issueId: issueId2,
          taskId: issueId2,
          companyId,
          projectId: projectId2,
          issueIdentifier: "DAV-101",
          requestedMissionCellIds: [],
          requestedCapabilityIds: ["ceo-native-issue-handoff-primitives"],
          issueCapabilityReferences: [
            expect.objectContaining({
              capabilityId: "ceo-native-issue-handoff-primitives",
              maturity: "verified",
            }),
          ],
          source: "issue.update",
        }),
      }),
    );
  });

  it("includes mission cell references on issue create wakeups", async () => {
    mockIssueService.create.mockResolvedValue({
      id: issueId1,
      companyId,
      projectId: projectId1,
      goalId: null,
      parentId: null,
      identifier: "DAV-102",
      title: "Start mission cell",
      description: "missionCell: mission-cell-starter-path-v1",
      status: "todo",
      assigneeAgentId: agentId1,
    });

    const res = await request(createApp())
      .post(`/api/companies/${companyId}/issues`)
      .send({
        title: "Start mission cell",
        description: "missionCell: mission-cell-starter-path-v1",
        projectId: projectId1,
        status: "todo",
        assigneeAgentId: agentId1,
      });

    expect(res.status).toBe(201);
    expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith(
      agentId1,
      expect.objectContaining({
        contextSnapshot: expect.objectContaining({
          issueIdentifier: "DAV-102",
          requestedMissionCellIds: ["mission-cell-starter-path-v1"],
          issueMissionCellReferences: [
            expect.objectContaining({
              missionCellId: "mission-cell-starter-path-v1",
              status: "active",
              startupSequence: expect.arrayContaining([
                expect.stringContaining("Validate the mission-cell contract"),
              ]),
              firstProbe: expect.arrayContaining([
                expect.stringContaining("Read the issue prompt context and confirm the mission-cell brief is present."),
              ]),
            }),
          ],
        }),
      }),
    );
  });
});
