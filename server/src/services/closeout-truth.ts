import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Db } from "@paperclipai/db";
import { eq } from "drizzle-orm";
import { issues } from "@paperclipai/db";
import { notFound } from "../errors.js";
import { logger } from "../middleware/logger.js";

const execFileAsync = promisify(execFile);

export type CloseoutClassification = "clean" | "local" | "parked" | "blocked" | "unknown";

export interface GitStatus {
  isClean: boolean;
  branch: string | null;
  uncommittedChanges: boolean;
  untrackedFiles: boolean;
}

export interface FeatureState {
  total: number;
  completed: number;
  pending: number;
  status: "complete" | "incomplete" | "missing";
}

export interface ValidationState {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  pending: number;
  status: "complete" | "incomplete" | "missing" | "error";
}

export interface CloseoutTruth {
  classification: CloseoutClassification;
  reasons: string[];
  gitStatus: GitStatus;
  featureState: FeatureState;
  validationState: ValidationState;
}

interface FeaturesJson {
  features: Array<{
    id: string;
    status?: string;
  }>;
}

interface ValidationStateJson {
  assertions?: Record<string, { status?: string }>;
}

interface MissionStateJson {
  state?: string;
  workingDirectory?: string;
}

function getMissionsHome(): string {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    throw new Error("HOME or USERPROFILE environment variable not set");
  }
  return path.join(home, ".factory", "missions");
}

async function readFeaturesJson(missionDir: string): Promise<FeaturesJson | null> {
  try {
    const content = await fs.readFile(path.join(missionDir, "features.json"), "utf-8");
    return JSON.parse(content) as FeaturesJson;
  } catch {
    return null;
  }
}

async function readValidationStateJson(missionDir: string): Promise<ValidationStateJson | null> {
  try {
    const content = await fs.readFile(path.join(missionDir, "validation-state.json"), "utf-8");
    return JSON.parse(content) as ValidationStateJson;
  } catch {
    return null;
  }
}

async function readMissionStateJson(missionDir: string): Promise<MissionStateJson | null> {
  try {
    const content = await fs.readFile(path.join(missionDir, "state.json"), "utf-8");
    return JSON.parse(content) as MissionStateJson;
  } catch {
    return null;
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function getGitStatus(repoPath: string): Promise<GitStatus> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain", "-b"], {
      cwd: repoPath,
      timeout: 10000,
    });

    const lines = stdout.split("\n").filter((line) => line.length > 0);

    // First line contains branch info: ## main...origin/main
    const branchLine = lines.find((line) => line.startsWith("## "));
    const branch = branchLine
      ? branchLine.slice(3).split("...")[0].split(" ")[0]
      : null;

    // Status lines (without ##)
    const statusLines = lines.filter((line) => !line.startsWith("## "));
    const uncommittedChanges = statusLines.some(
      (line) =>
        line.startsWith(" M ") ||
        line.startsWith("M ") ||
        line.startsWith("A ") ||
        line.startsWith(" D ") ||
        line.startsWith("D ") ||
        line.startsWith("R ") ||
        line.startsWith("C ") ||
        line.match(/^[MADRC]/) !== null
    );
    const untrackedFiles = statusLines.some((line) => line.startsWith("?? ") || line.match(/^\?\?/) !== null);

    return {
      isClean: statusLines.length === 0,
      branch,
      uncommittedChanges,
      untrackedFiles,
    };
  } catch (err) {
    logger.warn({ err, repoPath }, "Failed to get git status");
    return {
      isClean: false,
      branch: null,
      uncommittedChanges: false,
      untrackedFiles: false,
    };
  }
}

function calculateFeatureState(featuresJson: FeaturesJson | null): FeatureState {
  if (!featuresJson || !Array.isArray(featuresJson.features)) {
    return {
      total: 0,
      completed: 0,
      pending: 0,
      status: "missing",
    };
  }

  const features = featuresJson.features;
  const total = features.length;
  const completed = features.filter(
    (f) => f.status === "completed" || f.status === "done"
  ).length;
  const pending = total - completed;

  return {
    total,
    completed,
    pending,
    status: pending === 0 ? "complete" : "incomplete",
  };
}

function calculateValidationState(validationJson: ValidationStateJson | null): ValidationState {
  if (!validationJson || !validationJson.assertions) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      pending: 0,
      status: "missing",
    };
  }

  const assertions = Object.values(validationJson.assertions);
  const total = assertions.length;
  const passed = assertions.filter((a) => a.status === "passed").length;
  const failed = assertions.filter((a) => a.status === "failed").length;
  const blocked = assertions.filter((a) => a.status === "blocked").length;
  const pending = assertions.filter((a) => a.status === "pending").length;

  return {
    total,
    passed,
    failed,
    blocked,
    pending,
    status: total > 0 && passed === total ? "complete" : "incomplete",
  };
}

export function determineClassification(
  gitStatus: GitStatus,
  featureState: FeatureState,
  validationState: ValidationState,
  issueStatus: string | null,
): { classification: CloseoutClassification; reasons: string[] } {
  const reasons: string[] = [];
  const blockingReasons: string[] = [];
  const parkedReasons: string[] = [];
  const pausedStatuses = new Set(["backlog", "todo", "blocked", "cancelled"]);
  const isPaused = issueStatus ? pausedStatuses.has(issueStatus) : false;

  if (validationState.failed > 0 || validationState.blocked > 0) {
    if (validationState.failed > 0) {
      blockingReasons.push(`${validationState.failed} validation assertion(s) failed`);
    }
    if (validationState.blocked > 0) {
      blockingReasons.push(`${validationState.blocked} validation assertion(s) blocked`);
    }
  }

  if (featureState.pending > 0) {
    const message = `${featureState.pending} feature(s) still pending`;
    if (isPaused) {
      parkedReasons.push(`${featureState.pending} feature(s) pending with issue in ${issueStatus} status`);
    } else {
      blockingReasons.push(message);
    }
  }

  if (validationState.pending > 0) {
    const message = `${validationState.pending} validation assertion(s) pending`;
    if (isPaused) {
      parkedReasons.push(message);
    } else {
      blockingReasons.push(message);
    }
  }

  if (featureState.status === "missing") {
    reasons.push("features.json not found");
  }
  if (validationState.status === "missing") {
    reasons.push("validation-state.json not found");
  }
  if (validationState.status === "error") {
    reasons.push("validation-state.json could not be parsed");
  }

  if (blockingReasons.length > 0) {
    return { classification: "blocked", reasons: [...blockingReasons, ...reasons] };
  }

  if (parkedReasons.length > 0) {
    return { classification: "parked", reasons: [...parkedReasons, ...reasons] };
  }

  if (!gitStatus.isClean) {
    reasons.unshift("Git working directory has uncommitted changes");
    if (gitStatus.untrackedFiles) {
      reasons.push("Untracked files present");
    }
    return { classification: "local", reasons };
  }

  if (
    gitStatus.isClean &&
    featureState.status === "complete" &&
    validationState.status === "complete" &&
    validationState.total > 0
  ) {
    reasons.push("All features complete, all assertions passed, git clean");
    return { classification: "clean", reasons };
  }

  // Default to unknown if we can't determine a clear state
  if (reasons.length === 0) {
    reasons.push("Unable to determine closeout state");
  }

  return { classification: "unknown", reasons };
}

async function resolveMissionDirFromIssue(issueId: string, parentIssueId: string | null): Promise<string | null> {
  const missionsHome = getMissionsHome();
  const issueMissionDir = path.join(missionsHome, issueId);
  if (await pathExists(issueMissionDir)) {
    return issueMissionDir;
  }

  if (parentIssueId) {
    const parentMissionDir = path.join(missionsHome, parentIssueId);
    if (await pathExists(parentMissionDir)) {
      return parentMissionDir;
    }
  }

  return null;
}

function resolveRepoPath(input: {
  executionWorkspaceSettings: Record<string, unknown> | null;
  missionState: MissionStateJson | null;
}): string {
  const workspaceSettings = input.executionWorkspaceSettings;
  if (workspaceSettings?.repoPath && typeof workspaceSettings.repoPath === "string") {
    return workspaceSettings.repoPath;
  }

  if (typeof input.missionState?.workingDirectory === "string" && input.missionState.workingDirectory.length > 0) {
    return input.missionState.workingDirectory;
  }

  return process.cwd();
}

async function buildCloseoutTruth(input: {
  missionDir: string | null;
  issueStatus: string | null;
  executionWorkspaceSettings: Record<string, unknown> | null;
}): Promise<CloseoutTruth> {
  const [featuresJson, validationJson, missionState] = input.missionDir
    ? await Promise.all([
        readFeaturesJson(input.missionDir),
        readValidationStateJson(input.missionDir),
        readMissionStateJson(input.missionDir),
      ])
    : [null, null, null];

  const featureState = calculateFeatureState(featuresJson);
  const validationState = calculateValidationState(validationJson);
  const repoPath = resolveRepoPath({
    executionWorkspaceSettings: input.executionWorkspaceSettings,
    missionState,
  });
  const gitStatus = await getGitStatus(repoPath);
  const { classification, reasons } = determineClassification(
    gitStatus,
    featureState,
    validationState,
    input.issueStatus,
  );

  return {
    classification,
    reasons,
    gitStatus,
    featureState,
    validationState,
  };
}

export function closeoutTruthService(db: Db) {
  async function getIssueCloseoutTruth(issueId: string): Promise<CloseoutTruth> {
    const issue = await db
      .select({
        id: issues.id,
        status: issues.status,
        parentId: issues.parentId,
        executionWorkspaceSettings: issues.executionWorkspaceSettings,
      })
      .from(issues)
      .where(eq(issues.id, issueId))
      .then((rows) => rows[0] ?? null);

    if (!issue) {
      throw notFound("Issue not found");
    }

    const missionDir = await resolveMissionDirFromIssue(issue.id, issue.parentId ?? null);

    return buildCloseoutTruth({
      missionDir,
      issueStatus: issue.status,
      executionWorkspaceSettings: issue.executionWorkspaceSettings as Record<string, unknown> | null,
    });
  }

  async function getMissionCloseoutTruth(missionId: string): Promise<CloseoutTruth> {
    const missionDir = path.join(getMissionsHome(), missionId);
    if (!(await pathExists(missionDir))) {
      throw notFound("Mission not found");
    }

    return buildCloseoutTruth({
      missionDir,
      issueStatus: null,
      executionWorkspaceSettings: null,
    });
  }

  return {
    getIssueCloseoutTruth,
    getMissionCloseoutTruth,
  };
}
