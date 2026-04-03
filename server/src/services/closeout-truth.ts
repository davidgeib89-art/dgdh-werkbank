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

function determineClassification(
  gitStatus: GitStatus,
  featureState: FeatureState,
  validationState: ValidationState,
  issueStatus: string
): { classification: CloseoutClassification; reasons: string[] } {
  const reasons: string[] = [];

  // Check for local changes first (highest priority for "local")
  if (!gitStatus.isClean) {
    reasons.push("Git working directory has uncommitted changes");
    if (gitStatus.untrackedFiles) {
      reasons.push("Untracked files present");
    }
    return { classification: "local", reasons };
  }

  // Check for blocked assertions
  if (validationState.failed > 0 || validationState.blocked > 0) {
    if (validationState.failed > 0) {
      reasons.push(`${validationState.failed} validation assertion(s) failed`);
    }
    if (validationState.blocked > 0) {
      reasons.push(`${validationState.blocked} validation assertion(s) blocked`);
    }
    return { classification: "blocked", reasons };
  }

  // Check for pending features (parked)
  const pausedStatuses = ["backlog", "todo", "blocked", "cancelled"];
  if (featureState.pending > 0 && pausedStatuses.includes(issueStatus)) {
    reasons.push(`${featureState.pending} feature(s) pending with issue in ${issueStatus} status`);
    return { classification: "parked", reasons };
  }

  // Check for clean state
  if (
    gitStatus.isClean &&
    featureState.status === "complete" &&
    validationState.status === "complete" &&
    validationState.total > 0
  ) {
    reasons.push("All features complete, all assertions passed, git clean");
    return { classification: "clean", reasons };
  }

  // Check for incomplete features
  if (featureState.pending > 0) {
    reasons.push(`${featureState.pending} feature(s) still pending`);
  }

  // Check for incomplete validations
  if (validationState.pending > 0) {
    reasons.push(`${validationState.pending} validation assertion(s) pending`);
  }

  // If validation-state is missing, that's a reason
  if (validationState.status === "missing") {
    reasons.push("validation-state.json not found");
  }

  // If features.json is missing
  if (featureState.status === "missing") {
    reasons.push("features.json not found");
  }

  // Default to unknown if we can't determine a clear state
  if (reasons.length === 0) {
    reasons.push("Unable to determine closeout state");
  }

  return { classification: "unknown", reasons };
}

export function closeoutTruthService(db: Db) {
  async function getCloseoutTruth(issueId: string): Promise<CloseoutTruth> {
    // Get issue from database
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

    // Get mission directory
    const missionsHome = getMissionsHome();
    const missionDir = path.join(missionsHome, issueId);

    // Check if mission directory exists, fall back to checking parent issue if this is a child
    let targetMissionDir = missionDir;
    try {
      await fs.access(missionDir);
    } catch {
      // Mission directory doesn't exist for this issue
      // Check if this is a child issue by looking for parent
      const parentIssue = await db
        .select({ id: issues.id })
        .from(issues)
        .where(eq(issues.id, issue.parentId ?? ""))
        .then((rows) => rows[0] ?? null);

      if (parentIssue?.id) {
        // Try parent's mission directory
        const parentMissionDir = path.join(missionsHome, parentIssue.id);
        try {
          await fs.access(parentMissionDir);
          targetMissionDir = parentMissionDir;
        } catch {
          // Neither directory exists, use original
        }
      }
    }

    // Read mission files
    const [featuresJson, validationJson] = await Promise.all([
      readFeaturesJson(targetMissionDir),
      readValidationStateJson(targetMissionDir),
    ]);

    // Calculate states
    const featureState = calculateFeatureState(featuresJson);
    const validationState = calculateValidationState(validationJson);

    // Get git status from repo path if available
    let repoPath = process.cwd();
    const workspaceSettings = issue.executionWorkspaceSettings as Record<string, unknown> | null;
    if (workspaceSettings?.repoPath && typeof workspaceSettings.repoPath === "string") {
      repoPath = workspaceSettings.repoPath;
    }

    const gitStatus = await getGitStatus(repoPath);

    // Determine classification
    const { classification, reasons } = determineClassification(
      gitStatus,
      featureState,
      validationState,
      issue.status
    );

    return {
      classification,
      reasons,
      gitStatus,
      featureState,
      validationState,
    };
  }

  return {
    getCloseoutTruth,
  };
}
