import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import {
  missionCellContractSchema,
  type MissionCellContractInput,
} from "@paperclipai/shared";
import { ApiRequestError, PaperclipApiClient } from "../client/http.js";
import {
  handleCommandError,
  printOutput,
  resolveCommandContext,
  addCommonClientOptions,
  type BaseClientOptions,
} from "./client/common.js";

interface MissionCellValidateOptions {
  json?: boolean;
}

interface MissionCellListOptions {
  dir?: string;
  status?: string;
  json?: boolean;
}

interface MissionCellUseOptions {
  dir?: string;
  json?: boolean;
}

// Server closeout truth types
export interface ServerCloseoutTruth {
  classification: "clean" | "local" | "parked" | "blocked" | "unknown";
  reasons: string[];
  gitStatus: {
    isClean: boolean;
    branch: string | null;
    uncommittedChanges: boolean;
    untrackedFiles: boolean;
  };
  featureState: {
    total: number;
    completed: number;
    pending: number;
    status: "complete" | "incomplete" | "missing";
  };
  validationState: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    pending: number;
    status: "complete" | "incomplete" | "missing" | "error";
  };
}

// CLI closeout truth types
export interface CloseoutTruth {
  missionId: string;
  classification: "clean" | "local" | "parked" | "blocked" | "unknown";
  gitStatus: {
    clean: boolean;
    modified: string[];
    untracked: string[];
    staged: string[];
  };
  validationState: {
    exists: boolean;
    totalAssertions: number;
    passed: number;
    failed: number;
    pending: number;
    blocked: number;
  };
  featureCompletion: {
    exists: boolean;
    totalFeatures: number;
    completed: number;
    pending: number;
    cancelled: number;
  };
  blockers: string[];
}

// Transform server response to CLI format
export function transformServerCloseoutTruth(serverTruth: ServerCloseoutTruth, missionId: string): CloseoutTruth {
  const modified: string[] = [];
  const untracked: string[] = [];
  const staged: string[] = [];

  if (serverTruth.gitStatus.uncommittedChanges) {
    modified.push("uncommitted changes");
  }
  if (serverTruth.gitStatus.untrackedFiles) {
    untracked.push("untracked files");
  }

  return {
    missionId,
    classification: serverTruth.classification,
    gitStatus: {
      clean: serverTruth.gitStatus.isClean,
      modified,
      untracked,
      staged,
    },
    validationState: {
      exists: serverTruth.validationState.status !== "missing",
      totalAssertions: serverTruth.validationState.total,
      passed: serverTruth.validationState.passed,
      failed: serverTruth.validationState.failed,
      pending: serverTruth.validationState.pending,
      blocked: serverTruth.validationState.blocked,
    },
    featureCompletion: {
      exists: serverTruth.featureState.status !== "missing",
      totalFeatures: serverTruth.featureState.total,
      completed: serverTruth.featureState.completed,
      pending: serverTruth.featureState.pending,
      cancelled: 0,
    },
    blockers: serverTruth.reasons.filter((r) =>
      r.includes("failed") || r.includes("blocked") || r.includes("pending") || r.includes("missing"),
    ),
  };
}

export async function fetchCloseoutTruthFromServer(
  api: PaperclipApiClient,
  missionId: string,
  companyId = "test-company",
): Promise<CloseoutTruth | null> {
  const serverTruth = await api.get<ServerCloseoutTruth>(
    `/missions/${encodeURIComponent(missionId)}/closeout-truth?companyId=${encodeURIComponent(companyId)}`,
  );
  if (!serverTruth) {
    return null;
  }
  return transformServerCloseoutTruth(serverTruth, missionId);
}

function formatClassification(
  classification: CloseoutTruth["classification"],
): string {
  switch (classification) {
    case "clean":
      return pc.green("clean");
    case "local":
      return pc.yellow("local");
    case "parked":
      return pc.blue("parked");
    case "blocked":
      return pc.red("blocked");
    case "unknown":
      return pc.dim("unknown");
    default:
      return classification;
  }
}

function printMissionCloseoutTruth(truth: CloseoutTruth): void {
  console.log(pc.bold(`\n=== CLOSEOUT TRUTH: ${truth.missionId} ===`));
  console.log(`Classification: ${formatClassification(truth.classification)}`);
  console.log("");

  console.log(pc.bold("Git Status:"));
  if (truth.gitStatus.clean) {
    console.log(pc.green("  OK Working tree clean"));
  } else {
    console.log(pc.red("  DIRTY Working tree dirty"));
    if (truth.gitStatus.staged.length > 0) {
      console.log(`  Staged: ${truth.gitStatus.staged.join(", ")}`);
    }
    if (truth.gitStatus.modified.length > 0) {
      console.log(`  Modified: ${truth.gitStatus.modified.join(", ")}`);
    }
    if (truth.gitStatus.untracked.length > 0) {
      console.log(`  Untracked: ${truth.gitStatus.untracked.join(", ")}`);
    }
  }
  console.log("");

  console.log(pc.bold("Validation State:"));
  if (!truth.validationState.exists) {
    console.log(pc.dim("  (no validation-state.json found)"));
  } else {
    console.log(`  Total assertions: ${truth.validationState.totalAssertions}`);
    if (truth.validationState.passed > 0) {
      console.log(pc.green(`  Passed: ${truth.validationState.passed}`));
    }
    if (truth.validationState.failed > 0) {
      console.log(pc.red(`  Failed: ${truth.validationState.failed}`));
    }
    if (truth.validationState.pending > 0) {
      console.log(pc.yellow(`  Pending: ${truth.validationState.pending}`));
    }
    if (truth.validationState.blocked > 0) {
      console.log(pc.red(`  Blocked: ${truth.validationState.blocked}`));
    }
  }
  console.log("");

  console.log(pc.bold("Feature Completion:"));
  if (!truth.featureCompletion.exists) {
    console.log(pc.dim("  (no features.json found)"));
  } else {
    console.log(`  Total features: ${truth.featureCompletion.totalFeatures}`);
    if (truth.featureCompletion.completed > 0) {
      console.log(pc.green(`  Completed: ${truth.featureCompletion.completed}`));
    }
    if (truth.featureCompletion.pending > 0) {
      console.log(pc.yellow(`  Pending: ${truth.featureCompletion.pending}`));
    }
    if (truth.featureCompletion.cancelled > 0) {
      console.log(pc.dim(`  Cancelled: ${truth.featureCompletion.cancelled}`));
    }
  }
  console.log("");

  if (truth.blockers.length > 0) {
    console.log(pc.bold(pc.red("Blockers:")));
    for (const blocker of truth.blockers) {
      console.log(pc.red(`  - ${blocker}`));
    }
    console.log("");
  }

  console.log(pc.dim(`Closeout classification: ${truth.classification}`));
}

export interface MissionCellContractSummary {
  filePath: string;
  missionCellId: string;
  title: string;
  summary: string;
  status: string;
  owners: string[];
  primaryMetric: string;
}

export interface MissionCellOperationalBrief {
  missionCellId: string;
  title: string;
  status: string;
  summary: string;
  objective: string;
  primaryMetric: string;
  trigger: string;
  startupSequence: string[];
  firstProbe: string[];
  type2Autonomy: string[];
  type1Escalations: string[];
  oberreviewerTriggers: string[];
  replayChecks: string[];
  promoteWhen: string[];
  firmBound: string[];
  carrierBound: string[];
  startReference: {
    filePath: string;
    issueField: string;
    validate: string;
  };
}

export async function loadMissionCellContract(
  inputPath: string,
): Promise<MissionCellContractInput> {
  const resolved = path.resolve(inputPath);
  const raw = await readFile(resolved, "utf8");
  return missionCellContractSchema.parse(JSON.parse(raw) as unknown);
}

function isMissionCellFile(entryName: string): boolean {
  return entryName.toLowerCase().endsWith(".json");
}

export async function listMissionCellContractFiles(
  rootDir: string,
): Promise<string[]> {
  const resolvedRoot = path.resolve(rootDir);
  const entries = await readdir(resolvedRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && isMissionCellFile(entry.name))
    .map((entry) => path.join(resolvedRoot, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

export async function listMissionCellContractSummaries(
  rootDir: string,
  opts?: { status?: string },
): Promise<MissionCellContractSummary[]> {
  const files = await listMissionCellContractFiles(rootDir);
  const summaries: MissionCellContractSummary[] = [];

  for (const filePath of files) {
    const contract = await loadMissionCellContract(filePath);
    if (opts?.status && contract.status !== opts.status) {
      continue;
    }
    summaries.push({
      filePath,
      missionCellId: contract.missionCellId,
      title: contract.title,
      summary: contract.summary,
      status: contract.status,
      owners: contract.owners,
      primaryMetric: contract.charter.primaryMetric,
    });
  }

  return summaries;
}

export async function loadMissionCellContractByRef(
  ref: string,
  opts?: { rootDir?: string },
): Promise<{ filePath: string; contract: MissionCellContractInput }> {
  const trimmed = ref.trim();
  if (!trimmed) {
    throw new Error("Mission cell reference is required");
  }

  const looksLikePath =
    trimmed.includes("\\") || trimmed.includes("/") || trimmed.endsWith(".json");
  if (looksLikePath) {
    const filePath = path.resolve(trimmed);
    return {
      filePath,
      contract: await loadMissionCellContract(filePath),
    };
  }

  const rootDir = path.resolve(opts?.rootDir ?? "company-hq/mission-cells");
  const summaries = await listMissionCellContractSummaries(rootDir);
  const match = summaries.find((summary) => summary.missionCellId === trimmed);
  if (!match) {
    throw new Error(
      `Mission cell contract not found for '${trimmed}'. Re-run with --dir or pass an explicit file path.`,
    );
  }

  return {
    filePath: match.filePath,
    contract: await loadMissionCellContract(match.filePath),
  };
}

export function buildMissionCellOperationalBrief(
  filePath: string,
  contract: MissionCellContractInput,
): MissionCellOperationalBrief {
  const normalizedFilePath = filePath.replace(/\\/g, "/");
  return {
    missionCellId: contract.missionCellId,
    title: contract.title,
    status: contract.status,
    summary: contract.summary,
    objective: contract.charter.objective,
    primaryMetric: contract.charter.primaryMetric,
    trigger: contract.starterPath.trigger,
    startupSequence: contract.starterPath.startupSequence,
    firstProbe: contract.starterPath.firstProbe,
    type2Autonomy: contract.decisionPolicy.type2Autonomy,
    type1Escalations: contract.decisionPolicy.type1Escalations,
    oberreviewerTriggers: contract.riskGate.oberreviewerTriggers,
    replayChecks: contract.eval.replayChecks,
    promoteWhen: contract.promotion.promoteWhen,
    firmBound: contract.boundaries.firmBound,
    carrierBound: contract.boundaries.carrierBound,
    startReference: {
      filePath: normalizedFilePath,
      issueField: `missionCell: ${contract.missionCellId}`,
      validate: `pnpm paperclipai mission cell validate ${normalizedFilePath} --json`,
    },
  };
}

export function registerMissionCellCommands(program: Command): void {
  const mission = program.command("mission").description("Mission autonomy utilities");
  const cell = mission.command("cell").description("Mission cell contract commands");

  cell
    .command("list")
    .description("List available mission cell contracts")
    .option(
      "--dir <path>",
      "Directory containing mission cell contract JSON files",
      "company-hq/mission-cells",
    )
    .option("--status <state>", "Filter by status (for example active)")
    .option("--json", "Output raw JSON")
    .action(async (opts: MissionCellListOptions) => {
      try {
        const dir = opts.dir?.trim() || "company-hq/mission-cells";
        const summaries = await listMissionCellContractSummaries(dir, {
          status: opts.status?.trim() || undefined,
        });
        if (opts.json) {
          printOutput(summaries, { json: true });
          return;
        }

        for (const summary of summaries) {
          console.log(
            [
              `missionCellId=${summary.missionCellId}`,
              `status=${summary.status}`,
              `title=${summary.title}`,
              `owners=${summary.owners.join(",")}`,
              `primaryMetric=${summary.primaryMetric}`,
              `summary=${summary.summary}`,
            ].join(" "),
          );
        }
      } catch (err) {
        handleCommandError(err);
      }
    });

  cell
    .command("use")
    .description("Show the shortest start brief for a mission cell")
    .argument("<missionCellIdOrFile>", "Mission cell id or path to a mission cell contract JSON file")
    .option(
      "--dir <path>",
      "Directory containing mission cell contract JSON files",
      "company-hq/mission-cells",
    )
    .option("--json", "Output raw JSON")
    .action(async (missionCellIdOrFile: string, opts: MissionCellUseOptions) => {
      try {
        const result = await loadMissionCellContractByRef(missionCellIdOrFile, {
          rootDir: opts.dir?.trim() || "company-hq/mission-cells",
        });
        const brief = buildMissionCellOperationalBrief(
          result.filePath,
          result.contract,
        );
        if (opts.json) {
          printOutput(brief, { json: true });
          return;
        }

        console.log(`${brief.title} (${brief.missionCellId})`);
        console.log(`status=${brief.status}`);
        console.log(`summary=${brief.summary}`);
        console.log(`objective=${brief.objective}`);
        console.log(`primaryMetric=${brief.primaryMetric}`);
        console.log(`trigger=${brief.trigger}`);
        console.log(`issueField=${brief.startReference.issueField}`);
        console.log(`startup=${brief.startupSequence.join(" | ")}`);
        console.log(`firstProbe=${brief.firstProbe.join(" | ")}`);
        console.log(`type2=${brief.type2Autonomy.join(" | ")}`);
        console.log(`type1=${brief.type1Escalations.join(" | ")}`);
        console.log(`oberreviewer=${brief.oberreviewerTriggers.join(" | ")}`);
        console.log(`replay=${brief.replayChecks.join(" | ")}`);
        console.log(`promote=${brief.promoteWhen.join(" | ")}`);
        console.log(`firmBound=${brief.firmBound.join(" | ")}`);
        console.log(`carrierBound=${brief.carrierBound.join(" | ")}`);
        console.log(`validate=${brief.startReference.validate}`);
      } catch (err) {
        handleCommandError(err);
      }
    });

  cell
    .command("validate")
    .description("Validate a mission cell contract JSON file")
    .argument("<file>", "Path to a mission cell contract JSON file")
    .option("--json", "Output raw JSON")
    .action(async (file: string, opts: MissionCellValidateOptions) => {
      try {
        const parsed = await loadMissionCellContract(file);
        printOutput(
          {
            ok: true,
            missionCellId: parsed.missionCellId,
            status: parsed.status,
            owners: parsed.owners,
            primaryMetric: parsed.charter.primaryMetric,
            startupSteps: parsed.starterPath.startupSequence.length,
          },
          { json: Boolean(opts.json) },
        );
      } catch (err) {
        handleCommandError(err);
      }
    });

  // Closeout truth command
  const closeoutTruthCmd = mission
    .command("closeout-truth")
    .description("Show honest closeout truth for a DROID mission")
    .argument("<missionId>", "DROID mission directory ID")
    .option("--json", "Output raw JSON");

  addCommonClientOptions(closeoutTruthCmd, { includeCompany: true });

  closeoutTruthCmd.action(async (missionId: string, opts: BaseClientOptions & { json?: boolean }) => {
    try {
      const ctx = resolveCommandContext(opts, { requireCompany: true });

      // Fetch closeout truth from server API
      const closeoutTruth = await fetchCloseoutTruthFromServer(
        ctx.api,
        missionId,
        ctx.companyId!,
      );

      if (!closeoutTruth) {
        console.error(pc.red(`Mission not found: ${missionId}`));
        process.exit(1);
      }

      if (opts.json) {
        printOutput(closeoutTruth, { json: true });
        return;
      }

      // Human-readable output
      printMissionCloseoutTruth(closeoutTruth);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 404) {
          console.error(pc.red(`Mission not found: ${missionId}`));
          process.exit(1);
        }
        if (err.status === 0 || err.status === 503 || err.message.includes("Connection refused")) {
          console.error(pc.red(`API unavailable: Unable to connect to server`));
          console.error(pc.dim(`Check that the Paperclip server is running at the configured API base URL.`));
          process.exit(1);
        }
      }
      handleCommandError(err);
    }
  });
}
