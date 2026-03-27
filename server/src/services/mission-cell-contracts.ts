import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  missionCellContractSchema,
  type MissionCellContractInput,
} from "@paperclipai/shared";

export interface MissionCellRuntimeBrief {
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
  filePath: string;
}

export interface MissionCellRuntimeBridge {
  requestedMissionCellIds: string[];
  briefs: MissionCellRuntimeBrief[];
  errors: string[];
}

function missionCellsDir(): string {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(serviceDir, "../../../company-hq/mission-cells");
}

function repoRootDir(): string {
  return path.resolve(missionCellsDir(), "../..");
}

function normalizeMissionCellId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeMissionCellList(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    const normalized = normalizeMissionCellId(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push(normalized);
  }
  return ordered;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describeMissionCellLoadError(err: unknown): string {
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message.trim();
  }
  return String(err);
}

export function extractRequestedMissionCellIds(
  description: string | null | undefined,
): string[] {
  if (typeof description !== "string" || description.trim().length === 0) {
    return [];
  }

  const requested: string[] = [];
  const regex = /(?:^|\n)\s*missioncells?\s*:\s*([^\n]+)/gi;
  for (const match of description.matchAll(regex)) {
    const rawValue = match[1]?.trim();
    if (!rawValue) continue;
    for (const entry of rawValue.split(",")) {
      const normalized = normalizeMissionCellId(entry);
      if (normalized.length > 0) {
        requested.push(normalized);
      }
    }
  }

  return normalizeMissionCellList(requested);
}

function loadMissionCellContracts(): {
  contracts: Map<string, { contract: MissionCellContractInput; sourcePath: string }>;
  errors: string[];
} {
  const dir = missionCellsDir();
  if (!fs.existsSync(dir)) {
    return {
      contracts: new Map(),
      errors: [],
    };
  }

  const contracts = new Map<
    string,
    { contract: MissionCellContractInput; sourcePath: string }
  >();
  const errors: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const sourcePath = path.join(dir, entry.name);
    try {
      const rawText = fs.readFileSync(sourcePath, "utf8");
      const raw = JSON.parse(rawText) as unknown;
      const contract = missionCellContractSchema.parse(raw);
      contracts.set(contract.missionCellId, { contract, sourcePath });
    } catch (err) {
      const hintedId = (() => {
        try {
          const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as unknown;
          if (isPlainRecord(raw) && typeof raw.missionCellId === "string") {
            return raw.missionCellId.trim();
          }
          return entry.name;
        } catch {
          return entry.name;
        }
      })();
      errors.push(
        `Mission cell contract '${hintedId}' at '${sourcePath}' is invalid: ${describeMissionCellLoadError(err)}`,
      );
    }
  }

  return {
    contracts,
    errors,
  };
}

function buildRuntimeBrief(
  contract: MissionCellContractInput,
  sourcePath: string,
): MissionCellRuntimeBrief {
  const normalizedSourcePath = path
    .relative(repoRootDir(), sourcePath)
    .replace(/\\/g, "/");
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
    filePath: normalizedSourcePath,
  };
}

export function resolveMissionCellRuntimeBridge(
  description: string | null | undefined,
): MissionCellRuntimeBridge {
  const requestedMissionCellIds = extractRequestedMissionCellIds(description);
  if (requestedMissionCellIds.length === 0) {
    return {
      requestedMissionCellIds: [],
      briefs: [],
      errors: [],
    };
  }

  const loadedContracts = loadMissionCellContracts();
  const briefs: MissionCellRuntimeBrief[] = [];
  const errors = [...loadedContracts.errors];

  for (const missionCellId of requestedMissionCellIds) {
    const loaded = loadedContracts.contracts.get(missionCellId);
    if (!loaded) {
      errors.push(
        `Mission cell '${missionCellId}' was requested but no active valid contract file was found in company-hq/mission-cells.`,
      );
      continue;
    }

    if (loaded.contract.status !== "active") {
      errors.push(
        `Mission cell '${missionCellId}' is opt-in only for active status, but current state is '${loaded.contract.status}'.`,
      );
      continue;
    }

    briefs.push(buildRuntimeBrief(loaded.contract, loaded.sourcePath));
  }

  return {
    requestedMissionCellIds,
    briefs,
    errors,
  };
}

export function buildMissionCellPromptBlock(
  bridge: MissionCellRuntimeBridge,
): string | null {
  if (bridge.requestedMissionCellIds.length === 0) return null;

  const lines = ["Mission cell references (explicit operating lane):"];
  for (const brief of bridge.briefs) {
    lines.push(
      `- missionCellId: ${brief.missionCellId}`,
      `  title: ${brief.title}`,
      `  status: ${brief.status}`,
      `  summary: ${brief.summary}`,
      `  objective: ${brief.objective}`,
      `  primaryMetric: ${brief.primaryMetric}`,
      `  contractFile: ${brief.filePath}`,
      `  issueField: missionCell: ${brief.missionCellId}`,
      `  validate: pnpm paperclipai mission cell validate ${brief.filePath} --json`,
      `  startTrigger: ${brief.trigger}`,
      `  startupSequence: ${brief.startupSequence.join(" | ")}`,
      `  firstProbe: ${brief.firstProbe.join(" | ")}`,
      `  type2Autonomy: ${brief.type2Autonomy.join(" | ")}`,
      `  type1Escalations: ${brief.type1Escalations.join(" | ")}`,
      `  oberreviewerTriggers: ${brief.oberreviewerTriggers.join(" | ")}`,
      `  replayChecks: ${brief.replayChecks.join(" | ")}`,
      `  promoteWhen: ${brief.promoteWhen.join(" | ")}`,
      `  firmBound: ${brief.firmBound.join(" | ")}`,
      `  carrierBound: ${brief.carrierBound.join(" | ")}`,
    );
  }

  if (bridge.errors.length > 0) {
    lines.push("Mission cell reference warnings:");
    for (const error of bridge.errors) {
      lines.push(`- ${error}`);
    }
  }

  return lines.join("\n");
}
