import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { closeoutTruthService, determineClassification } from "../services/closeout-truth.js";

const execFileAsync = promisify(execFile);
const originalUserProfile = process.env.USERPROFILE;
const originalHome = process.env.HOME;

async function createCleanGitRepo(rootDir: string): Promise<string> {
  const repoDir = path.join(rootDir, "repo");
  await fs.mkdir(repoDir, { recursive: true });
  await execFileAsync("git", ["init"], { cwd: repoDir });
  await execFileAsync("git", ["config", "user.email", "taren@example.com"], { cwd: repoDir });
  await execFileAsync("git", ["config", "user.name", "Taren"], { cwd: repoDir });
  await fs.writeFile(path.join(repoDir, "README.md"), "# closeout truth\n", "utf8");
  await execFileAsync("git", ["add", "README.md"], { cwd: repoDir });
  await execFileAsync("git", ["commit", "-m", "init"], { cwd: repoDir });
  return repoDir;
}

async function createMissionFixture(rootDir: string, missionId: string, repoDir: string) {
  const missionDir = path.join(rootDir, ".factory", "missions", missionId);
  await fs.mkdir(missionDir, { recursive: true });
  await fs.writeFile(
    path.join(missionDir, "features.json"),
    JSON.stringify({
      features: [
        { id: "server", status: "completed" },
        { id: "cli", status: "completed" },
      ],
    }, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(missionDir, "validation-state.json"),
    JSON.stringify({
      assertions: {
        "VAL-001": { status: "passed" },
        "VAL-002": { status: "passed" },
      },
    }, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(missionDir, "state.json"),
    JSON.stringify({
      missionId: "mis_test",
      state: "completed",
      workingDirectory: repoDir,
    }, null, 2),
    "utf8",
  );
}

afterEach(() => {
  process.env.USERPROFILE = originalUserProfile;
  process.env.HOME = originalHome;
});

describe("determineClassification", () => {
  it("prefers blocked over dirty local git when validation has failed", () => {
    const result = determineClassification(
      {
        isClean: false,
        branch: "main",
        uncommittedChanges: true,
        untrackedFiles: false,
      },
      {
        total: 2,
        completed: 2,
        pending: 0,
        status: "complete",
      },
      {
        total: 3,
        passed: 2,
        failed: 1,
        blocked: 0,
        pending: 0,
        status: "incomplete",
      },
      "in_progress",
    );

    expect(result.classification).toBe("blocked");
    expect(result.reasons).toContain("1 validation assertion(s) failed");
  });
});

describe("closeoutTruthService mission route", () => {
  it("reads a DROID mission directory by mission id", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-closeout-"));
    process.env.USERPROFILE = tempRoot;
    process.env.HOME = tempRoot;

    const repoDir = await createCleanGitRepo(tempRoot);
    await createMissionFixture(tempRoot, "mission-123", repoDir);

    const service = closeoutTruthService({} as never);
    const truth = await service.getMissionCloseoutTruth("mission-123");

    expect(truth.classification).toBe("clean");
    expect(truth.featureState.completed).toBe(2);
    expect(truth.validationState.passed).toBe(2);
    expect(truth.gitStatus.isClean).toBe(true);
  });
});
