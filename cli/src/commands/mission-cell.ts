import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import {
  missionCellContractSchema,
  type MissionCellContractInput,
} from "@paperclipai/shared";
import { handleCommandError, printOutput } from "./client/common.js";

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
}