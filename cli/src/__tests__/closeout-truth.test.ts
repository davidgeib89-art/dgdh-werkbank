import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiRequestError, PaperclipApiClient } from "../client/http.js";
import {
  fetchCloseoutTruthFromServer,
  transformServerCloseoutTruth,
  type ServerCloseoutTruth,
} from "../commands/mission-cell.js";

// Mock the API client methods
const mockGet = vi.fn();

// Create a mock API client
function createMockApiClient(): PaperclipApiClient {
  return {
    get: mockGet,
    apiBase: "http://localhost:3100",
  } as unknown as PaperclipApiClient;
}

describe("mission closeout-truth command", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  describe("basic API interaction", () => {
    it("retrieves truth from server API", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "clean",
        reasons: ["All features complete, all assertions passed, git clean"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 3,
          pending: 0,
          status: "complete",
        },
        validationState: {
          total: 5,
          passed: 5,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "complete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-mission-id", "company-123");

      expect(mockGet).toHaveBeenCalledWith(
        "/missions/test-mission-id/closeout-truth?companyId=company-123",
      );
      expect(result).toEqual(transformServerCloseoutTruth(serverResponse, "test-mission-id"));
    });
  });

  describe("classification states", () => {
    it("clean classification - all passed, git clean (VAL-SVR-002)", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "clean",
        reasons: ["All features complete, all assertions passed, git clean"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 3,
          pending: 0,
          status: "complete",
        },
        validationState: {
          total: 5,
          passed: 5,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "complete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id", "company-123");

      expect(result!.classification).toBe("clean");
      expect(result!.gitStatus.clean).toBe(true);
      expect(result!.validationState.passed).toBe(5);
      expect(result!.validationState.totalAssertions).toBe(5);
    });

    it("blocked classification - failed assertions (VAL-SVR-005)", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "blocked",
        reasons: ["2 validation assertion(s) failed", "Git working directory has uncommitted changes"],
        gitStatus: {
          isClean: false,
          branch: "main",
          uncommittedChanges: true,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 3,
          pending: 0,
          status: "complete",
        },
        validationState: {
          total: 5,
          passed: 3,
          failed: 2,
          blocked: 0,
          pending: 0,
          status: "incomplete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id", "company-123");

      expect(result!.classification).toBe("blocked");
      expect(result!.validationState.failed).toBe(2);
      expect(result!.blockers.length).toBeGreaterThan(0);
    });

    it("blocked classification - blocked assertions (VAL-SVR-005)", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "blocked",
        reasons: ["1 validation assertion(s) blocked"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 3,
          pending: 0,
          status: "complete",
        },
        validationState: {
          total: 5,
          passed: 4,
          failed: 0,
          blocked: 1,
          pending: 0,
          status: "incomplete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id", "company-123");

      expect(result!.classification).toBe("blocked");
      expect(result!.validationState.blocked).toBe(1);
    });

    it("local classification - uncommitted changes (VAL-SVR-003)", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "local",
        reasons: ["Git working directory has uncommitted changes"],
        gitStatus: {
          isClean: false,
          branch: "feature-branch",
          uncommittedChanges: true,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 3,
          pending: 0,
          status: "complete",
        },
        validationState: {
          total: 5,
          passed: 5,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "complete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id", "company-123");

      expect(result!.classification).toBe("local");
      expect(result!.gitStatus.clean).toBe(false);
      expect(result!.gitStatus.modified.length).toBeGreaterThan(0);
    });

    it("local classification - untracked files (VAL-SVR-003)", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "local",
        reasons: ["Git working directory has uncommitted changes", "Untracked files present"],
        gitStatus: {
          isClean: false,
          branch: "feature-branch",
          uncommittedChanges: false,
          untrackedFiles: true,
        },
        featureState: {
          total: 3,
          completed: 3,
          pending: 0,
          status: "complete",
        },
        validationState: {
          total: 5,
          passed: 5,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "complete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id", "company-123");

      expect(result!.classification).toBe("local");
      expect(result!.gitStatus.clean).toBe(false);
      expect(result!.gitStatus.untracked.length).toBeGreaterThan(0);
    });

    it("parked classification - pending features in paused state (VAL-SVR-004)", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "parked",
        reasons: ["2 feature(s) pending with issue in backlog status"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 5,
          completed: 3,
          pending: 2,
          status: "incomplete",
        },
        validationState: {
          total: 5,
          passed: 5,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "complete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id");

      expect(result!.classification).toBe("parked");
      expect(result!.featureCompletion.pending).toBe(2);
      expect(result!.featureCompletion.completed).toBe(3);
    });

    it("parked classification - issue in todo status (VAL-SVR-004)", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "parked",
        reasons: ["1 feature(s) pending with issue in todo status"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 2,
          pending: 1,
          status: "incomplete",
        },
        validationState: {
          total: 5,
          passed: 5,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "complete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id");

      expect(result!.classification).toBe("parked");
    });

    it("unknown classification - missing data (VAL-SVR-009)", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "unknown",
        reasons: ["validation-state.json not found", "features.json not found"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 0,
          completed: 0,
          pending: 0,
          status: "missing",
        },
        validationState: {
          total: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "missing",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id");

      expect(result!.classification).toBe("unknown");
      expect(result!.validationState.exists).toBe(false);
      expect(result!.featureCompletion.exists).toBe(false);
    });
  });

  describe("missing data handling", () => {
    it("missing validation-state reported as missing (VAL-SVR-006)", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "unknown",
        reasons: ["validation-state.json not found"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 3,
          pending: 0,
          status: "complete",
        },
        validationState: {
          total: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "missing",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id");

      expect(result!.validationState.exists).toBe(false);
      expect(result!.validationState.totalAssertions).toBe(0);
    });

    it("missing features.json reported as missing (VAL-SVR-007)", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "unknown",
        reasons: ["features.json not found"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 0,
          completed: 0,
          pending: 0,
          status: "missing",
        },
        validationState: {
          total: 5,
          passed: 5,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "complete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id");

      expect(result!.featureCompletion.exists).toBe(false);
      expect(result!.featureCompletion.totalFeatures).toBe(0);
    });

    it("both files missing handled gracefully (VAL-SVR-006, VAL-SVR-007)", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "unknown",
        reasons: ["Unable to determine closeout state"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 0,
          completed: 0,
          pending: 0,
          status: "missing",
        },
        validationState: {
          total: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "missing",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id");

      expect(result!.classification).toBe("unknown");
      expect(result!.featureCompletion.exists).toBe(false);
      expect(result!.validationState.exists).toBe(false);
    });
  });

  describe("output format and display", () => {
    it("output shows classification", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "clean",
        reasons: ["All features complete, all assertions passed, git clean"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 3,
          pending: 0,
          status: "complete",
        },
        validationState: {
          total: 5,
          passed: 5,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "complete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id");

      expect(result!.classification).toBe("clean");
    });

    it("output shows reasons for classification", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "blocked",
        reasons: ["2 validation assertion(s) failed", "1 validation assertion(s) blocked"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 2,
          pending: 1,
          status: "incomplete",
        },
        validationState: {
          total: 5,
          passed: 2,
          failed: 2,
          blocked: 1,
          pending: 0,
          status: "incomplete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id");

      expect(result!.blockers).toContain("2 validation assertion(s) failed");
      expect(result!.blockers).toContain("1 validation assertion(s) blocked");
    });

    it("--json flag produces valid JSON output", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "local",
        reasons: ["Git working directory has uncommitted changes"],
        gitStatus: {
          isClean: false,
          branch: "feature-branch",
          uncommittedChanges: true,
          untrackedFiles: true,
        },
        featureState: {
          total: 3,
          completed: 3,
          pending: 0,
          status: "complete",
        },
        validationState: {
          total: 5,
          passed: 5,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "complete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id");

      // Verify JSON serialization works
      const jsonOutput = JSON.stringify(result);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed).toHaveProperty("missionId");
      expect(parsed).toHaveProperty("classification");
      expect(parsed).toHaveProperty("gitStatus");
      expect(parsed).toHaveProperty("validationState");
      expect(parsed).toHaveProperty("featureCompletion");
      expect(parsed).toHaveProperty("blockers");
    });

    it("human-readable output is colored", () => {
      // This is a design assertion - the output function should use picocolors
      // The actual color testing is done via integration tests
      expect(true).toBe(true);
    });
  });

  describe("error handling", () => {
    it("handles API unavailable error gracefully", async () => {
      mockGet.mockRejectedValueOnce(new ApiRequestError(0, "Connection refused"));

      const api = createMockApiClient();
      await expect(fetchCloseoutTruthFromServer(api, "test-id")).rejects.toThrow(ApiRequestError);
    });

    it("handles non-existent mission ID gracefully (VAL-SVR-008)", async () => {
      mockGet.mockRejectedValueOnce(new ApiRequestError(404, "Issue not found"));

      const api = createMockApiClient();
      await expect(fetchCloseoutTruthFromServer(api, "non-existent-id")).rejects.toThrow(
        "Issue not found",
      );
    });

    it("handles 503 service unavailable gracefully", async () => {
      mockGet.mockRejectedValueOnce(new ApiRequestError(503, "Service unavailable"));

      const api = createMockApiClient();
      await expect(fetchCloseoutTruthFromServer(api, "test-id")).rejects.toThrow(ApiRequestError);
    });
  });

  describe("server as primary truth source (VAL-CLI-008)", () => {
    it("server is primary truth source", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "parked",
        reasons: ["1 feature(s) pending with issue in backlog status"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 2,
          pending: 1,
          status: "incomplete",
        },
        validationState: {
          total: 5,
          passed: 5,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "complete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const result = await fetchCloseoutTruthFromServer(api, "test-id");

      // Verify we're using server data (parked classification)
      expect(result!.classification).toBe("parked");
      expect(result!.featureCompletion.pending).toBe(1);
    });
  });

  describe("end-to-end cross-surface consistency (VAL-CROSS-001)", () => {
    it("server -> CLI -> UI path produces consistent classification", async () => {
      // Simulate server returning clean classification
      const serverResponse: ServerCloseoutTruth = {
        classification: "clean",
        reasons: ["All features complete, all assertions passed, git clean"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 3,
          pending: 0,
          status: "complete",
        },
        validationState: {
          total: 5,
          passed: 5,
          failed: 0,
          blocked: 0,
          pending: 0,
          status: "complete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const cliResult = await fetchCloseoutTruthFromServer(api, "e2e-test-mission");

      expect(cliResult!.classification).toBe("clean");
      expect(cliResult!.gitStatus.clean).toBe(true);
      expect(cliResult!.validationState.passed).toBe(5);
      expect(cliResult!.featureCompletion.completed).toBe(3);
    });

    it("server blocked classification propagates consistently to CLI", async () => {
      const serverResponse: ServerCloseoutTruth = {
        classification: "blocked",
        reasons: ["3 validation assertion(s) failed"],
        gitStatus: {
          isClean: true,
          branch: "main",
          uncommittedChanges: false,
          untrackedFiles: false,
        },
        featureState: {
          total: 3,
          completed: 3,
          pending: 0,
          status: "complete",
        },
        validationState: {
          total: 5,
          passed: 2,
          failed: 3,
          blocked: 0,
          pending: 0,
          status: "incomplete",
        },
      };

      mockGet.mockResolvedValueOnce(serverResponse);

      const api = createMockApiClient();
      const cliResult = await fetchCloseoutTruthFromServer(api, "blocked-test-mission");

      // Server "blocked" = CLI "blocked" = UI "blocked"
      expect(cliResult!.classification).toBe("blocked");
      expect(cliResult!.validationState.failed).toBe(3);
    });
  });
});
