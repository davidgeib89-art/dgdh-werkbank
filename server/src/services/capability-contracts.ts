import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  capabilitySkillContractSchema,
  type CapabilitySkillContractInput,
} from "@paperclipai/shared";

export interface VerifiedCapabilityRuntimeBrief {
  capabilityId: string;
  title: string;
  maturity: string;
  summary: string;
  intent: string;
  inputsRequired: string[];
  allowedActions: string[];
  forbiddenActions: string[];
  filePath: string;
}

export interface VerifiedCapabilityRuntimeBridge {
  requestedCapabilityIds: string[];
  briefs: VerifiedCapabilityRuntimeBrief[];
  errors: string[];
}

function capabilitiesDir(): string {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(serviceDir, "../../../company-hq/capabilities");
}

function normalizeCapabilityId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeCapabilityList(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    const normalized = normalizeCapabilityId(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push(normalized);
  }
  return ordered;
}

export function extractRequestedCapabilityIds(
  description: string | null | undefined,
): string[] {
  if (typeof description !== "string" || description.trim().length === 0) {
    return [];
  }

  const requested: string[] = [];
  const regex = /(?:^|\n)\s*verifiedskills?\s*:\s*([^\n]+)/gi;
  for (const match of description.matchAll(regex)) {
    const rawValue = match[1]?.trim();
    if (!rawValue) continue;
    for (const entry of rawValue.split(",")) {
      const normalized = normalizeCapabilityId(entry);
      if (normalized.length > 0) {
        requested.push(normalized);
      }
    }
  }

  return normalizeCapabilityList(requested);
}

function loadCapabilityContracts(): Map<
  string,
  { contract: CapabilitySkillContractInput; sourcePath: string }
> {
  const dir = capabilitiesDir();
  if (!fs.existsSync(dir)) return new Map();

  const contracts = new Map<
    string,
    { contract: CapabilitySkillContractInput; sourcePath: string }
  >();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const sourcePath = path.join(dir, entry.name);
    try {
      const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as unknown;
      const contract = capabilitySkillContractSchema.parse(raw);
      contracts.set(contract.capabilityId, { contract, sourcePath });
    } catch {
      continue;
    }
  }

  return contracts;
}

function buildRuntimeBrief(
  contract: CapabilitySkillContractInput,
  sourcePath: string,
): VerifiedCapabilityRuntimeBrief {
  return {
    capabilityId: contract.capabilityId,
    title: contract.title,
    maturity: contract.maturity,
    summary: contract.summary,
    intent: contract.contract.intent,
    inputsRequired: contract.contract.inputsRequired,
    allowedActions: contract.contract.allowedActions,
    forbiddenActions: contract.contract.forbiddenActions,
    filePath: sourcePath,
  };
}

export function resolveVerifiedCapabilityRuntimeBridge(
  description: string | null | undefined,
): VerifiedCapabilityRuntimeBridge {
  const requestedCapabilityIds = extractRequestedCapabilityIds(description);
  if (requestedCapabilityIds.length === 0) {
    return {
      requestedCapabilityIds: [],
      briefs: [],
      errors: [],
    };
  }

  const contracts = loadCapabilityContracts();
  const briefs: VerifiedCapabilityRuntimeBrief[] = [];
  const errors: string[] = [];

  for (const capabilityId of requestedCapabilityIds) {
    const loaded = contracts.get(capabilityId);
    if (!loaded) {
      errors.push(
        `Verified skill '${capabilityId}' was requested but no contract file was found in company-hq/capabilities.`,
      );
      continue;
    }

    if (!["verified", "promoted"].includes(loaded.contract.maturity)) {
      errors.push(
        `Verified skill '${capabilityId}' is opt-in only for verified/promoted maturity, but current state is '${loaded.contract.maturity}'.`,
      );
      continue;
    }

    briefs.push(buildRuntimeBrief(loaded.contract, loaded.sourcePath));
  }

  return {
    requestedCapabilityIds,
    briefs,
    errors,
  };
}

export function buildVerifiedCapabilityPromptBlock(
  bridge: VerifiedCapabilityRuntimeBridge,
): string | null {
  if (bridge.requestedCapabilityIds.length === 0) return null;

  const lines = ["Verified skill references (explicit opt-in):"];
  for (const brief of bridge.briefs) {
    lines.push(
      `- capabilityId: ${brief.capabilityId}`,
      `  title: ${brief.title}`,
      `  maturity: ${brief.maturity}`,
      `  summary: ${brief.summary}`,
      `  intent: ${brief.intent}`,
      `  inputs: ${brief.inputsRequired.join(" | ")}`,
      `  allowed: ${brief.allowedActions.join(" | ")}`,
      `  forbidden: ${brief.forbiddenActions.join(" | ")}`,
    );
  }

  if (bridge.errors.length > 0) {
    lines.push("Capability reference warnings:");
    for (const error of bridge.errors) {
      lines.push(`- ${error}`);
    }
  }

  return lines.join("\n");
}
