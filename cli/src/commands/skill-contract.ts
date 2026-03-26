import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import {
  capabilitySkillContractSchema,
  type CapabilitySkillContractInput,
  type HeartbeatRun,
} from "@paperclipai/shared";
import {
  addCommonClientOptions,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./client/common.js";

interface SkillContractValidateOptions {
  json?: boolean;
}

interface SkillContractListOptions {
  dir?: string;
  maturity?: string;
  json?: boolean;
}

interface SkillContractUseOptions {
  dir?: string;
  json?: boolean;
}

interface SkillContractVerifyOptions extends BaseClientOptions {
  logLimitBytes?: string;
}

interface SkillContractVerifyAllOptions extends BaseClientOptions {
  dir?: string;
  logLimitBytes?: string;
}

interface RunLogResponse {
  content: string;
  nextOffset?: number;
}

export interface SkillVerificationRunInput {
  runId: string;
  status: string | null;
  text: string;
}

export interface SkillVerificationPrimitiveResult {
  primitiveId: string;
  matched: boolean;
  matchedMarkers: string[];
  missingMarkers: string[];
}

export interface SkillVerificationRunResult {
  runId: string;
  status: string | null;
  matchedMarkers: string[];
  missingMarkers: string[];
}

export interface SkillVerificationReport {
  capabilityId: string;
  passed: boolean;
  requiredMarkers: string[];
  matchedMarkers: string[];
  missingMarkers: string[];
  requiredPrimitiveIds: string[];
  primitives: SkillVerificationPrimitiveResult[];
  runs: SkillVerificationRunResult[];
}

export interface SkillVerificationBatchReport {
  passed: boolean;
  totalContracts: number;
  passedContracts: number;
  failedContracts: number;
  reports: SkillVerificationReport[];
}

export interface SkillContractSummary {
  filePath: string;
  capabilityId: string;
  title: string;
  summary: string;
  maturity: string;
  owners: string[];
  verifyRunCount: number;
}

export interface SkillOperationalReuseBrief {
  capabilityId: string;
  title: string;
  maturity: string;
  summary: string;
  intent: string;
  inputsRequired: string[];
  allowedActions: string[];
  forbiddenActions: string[];
  successCriteria: string[];
  verifyPath: {
    filePath: string;
    verify: string;
    verifyAll: string;
  };
}

export async function loadCapabilitySkillContract(
  inputPath: string,
): Promise<CapabilitySkillContractInput> {
  const resolved = path.resolve(inputPath);
  const raw = await readFile(resolved, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return capabilitySkillContractSchema.parse(parsed);
}

function isCapabilityContractFile(entryName: string): boolean {
  return entryName.toLowerCase().endsWith(".json");
}

export async function listCapabilityContractFiles(
  rootDir: string,
): Promise<string[]> {
  const resolvedRoot = path.resolve(rootDir);
  const entries = await readdir(resolvedRoot, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && isCapabilityContractFile(entry.name))
    .map((entry) => path.join(resolvedRoot, entry.name))
    .sort((a, b) => a.localeCompare(b));
  return files;
}

export async function listCapabilityContractSummaries(
  rootDir: string,
  opts?: { maturity?: string },
): Promise<SkillContractSummary[]> {
  const files = await listCapabilityContractFiles(rootDir);
  const summaries: SkillContractSummary[] = [];

  for (const filePath of files) {
    const contract = await loadCapabilitySkillContract(filePath);
    if (opts?.maturity && contract.maturity !== opts.maturity) {
      continue;
    }
    summaries.push({
      filePath,
      capabilityId: contract.capabilityId,
      title: contract.title,
      summary: contract.summary,
      maturity: contract.maturity,
      owners: contract.owners,
      verifyRunCount: contract.verify.runIds.length,
    });
  }

  return summaries;
}

export async function loadCapabilitySkillContractByRef(
  ref: string,
  opts?: { rootDir?: string },
): Promise<{ filePath: string; contract: CapabilitySkillContractInput }> {
  const trimmed = ref.trim();
  if (!trimmed) {
    throw new Error("Skill contract reference is required");
  }

  const looksLikePath =
    trimmed.includes("\\") || trimmed.includes("/") || trimmed.endsWith(".json");
  if (looksLikePath) {
    const filePath = path.resolve(trimmed);
    return {
      filePath,
      contract: await loadCapabilitySkillContract(filePath),
    };
  }

  const rootDir = path.resolve(opts?.rootDir ?? "company-hq/capabilities");
  const summaries = await listCapabilityContractSummaries(rootDir);
  const match = summaries.find((summary) => summary.capabilityId === trimmed);
  if (!match) {
    throw new Error(
      `Capability contract not found for '${trimmed}'. Re-run with --dir or pass an explicit file path.`,
    );
  }

  return {
    filePath: match.filePath,
    contract: await loadCapabilitySkillContract(match.filePath),
  };
}

export function buildSkillOperationalReuseBrief(
  filePath: string,
  contract: CapabilitySkillContractInput,
): SkillOperationalReuseBrief {
  const normalizedFilePath = filePath.replace(/\\/g, "/");
  return {
    capabilityId: contract.capabilityId,
    title: contract.title,
    maturity: contract.maturity,
    summary: contract.summary,
    intent: contract.contract.intent,
    inputsRequired: contract.contract.inputsRequired,
    allowedActions: contract.contract.allowedActions,
    forbiddenActions: contract.contract.forbiddenActions,
    successCriteria: contract.contract.successCriteria,
    verifyPath: {
      filePath: normalizedFilePath,
      verify: `pnpm paperclipai skill contract verify ${normalizedFilePath} --api-base <api-base> --json`,
      verifyAll: "pnpm paperclipai skill contract verify-all --dir company-hq/capabilities --api-base <api-base> --json",
    },
  };
}

function resolveRequiredPrimitiveIds(
  contract: CapabilitySkillContractInput,
): string[] {
  if (contract.verify.requiredPrimitiveIds.length > 0) {
    return contract.verify.requiredPrimitiveIds;
  }
  return contract.primitives
    .filter((primitive) => primitive.required)
    .map((primitive) => primitive.id);
}

function normalizeMarker(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueStrings(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    ordered.push(value);
  }
  return ordered;
}

function resolveRequiredMarkers(
  contract: CapabilitySkillContractInput,
  requiredPrimitiveIds: string[],
): string[] {
  const markers: string[] = contract.verify.requiredMarkers.map((marker) =>
    normalizeMarker(marker),
  );
  const primitiveById = new Map(
    contract.primitives.map((primitive) => [primitive.id, primitive]),
  );

  for (const primitiveId of requiredPrimitiveIds) {
    const primitive = primitiveById.get(primitiveId);
    if (!primitive) continue;
    for (const marker of primitive.evidenceMarkers) {
      markers.push(normalizeMarker(marker));
    }
  }

  return uniqueStrings(markers);
}

export function evaluateSkillContractVerification(
  contract: CapabilitySkillContractInput,
  runs: SkillVerificationRunInput[],
): SkillVerificationReport {
  const requiredPrimitiveIds = resolveRequiredPrimitiveIds(contract);
  const requiredMarkers = resolveRequiredMarkers(contract, requiredPrimitiveIds);
  const markerHits = new Set<string>();

  const runResults: SkillVerificationRunResult[] = runs.map((run) => {
    const searchable = run.text.toLowerCase();
    const matchedMarkers = requiredMarkers.filter((marker) =>
      searchable.includes(marker),
    );
    for (const marker of matchedMarkers) {
      markerHits.add(marker);
    }
    return {
      runId: run.runId,
      status: run.status,
      matchedMarkers,
      missingMarkers: requiredMarkers.filter(
        (marker) => !matchedMarkers.includes(marker),
      ),
    };
  });

  const matchedMarkers = requiredMarkers.filter((marker) => markerHits.has(marker));
  const missingMarkers = requiredMarkers.filter((marker) => !markerHits.has(marker));

  const primitiveById = new Map(
    contract.primitives.map((primitive) => [primitive.id, primitive]),
  );
  const primitiveResults: SkillVerificationPrimitiveResult[] =
    requiredPrimitiveIds.map((primitiveId) => {
      const primitive = primitiveById.get(primitiveId);
      const primitiveMarkers = primitive
        ? uniqueStrings(primitive.evidenceMarkers.map((marker) => normalizeMarker(marker)))
        : [];
      const primitiveMatchedMarkers = primitiveMarkers.filter((marker) =>
        markerHits.has(marker),
      );
      const primitiveMissingMarkers = primitiveMarkers.filter(
        (marker) => !markerHits.has(marker),
      );
      return {
        primitiveId,
        matched: primitiveMissingMarkers.length === 0,
        matchedMarkers: primitiveMatchedMarkers,
        missingMarkers: primitiveMissingMarkers,
      };
    });

  const minDistinctRuns = Math.max(1, contract.verify.minDistinctRuns);
  const runsWithEvidence = runResults.filter(
    (run) => run.matchedMarkers.length > 0,
  ).length;
  const passed =
    missingMarkers.length === 0 &&
    primitiveResults.every((primitive) => primitive.matched) &&
    runsWithEvidence >= minDistinctRuns;

  return {
    capabilityId: contract.capabilityId,
    passed,
    requiredMarkers,
    matchedMarkers,
    missingMarkers,
    requiredPrimitiveIds,
    primitives: primitiveResults,
    runs: runResults,
  };
}

async function buildRunEvidence(
  runId: string,
  opts: {
    logLimitBytes: number;
    api: ReturnType<typeof resolveCommandContext>["api"];
  },
): Promise<SkillVerificationRunInput> {
  const run = await opts.api.get<HeartbeatRun>(`/api/heartbeat-runs/${runId}`);
  if (!run) {
    throw new Error(`Heartbeat run not found: ${runId}`);
  }

  const log = await opts.api.get<RunLogResponse>(
    `/api/heartbeat-runs/${runId}/log?offset=0&limitBytes=${opts.logLimitBytes}`,
    { ignoreNotFound: true },
  );

  const searchText = [
    run.error,
    run.stdoutExcerpt,
    run.stderrExcerpt,
    JSON.stringify(run.usageJson ?? {}),
    JSON.stringify(run.resultJson ?? {}),
    JSON.stringify(run.contextSnapshot ?? {}),
    log?.content ?? "",
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");

  return {
    runId,
    status: run.status ?? null,
    text: searchText,
  };
}

export async function verifyCapabilitySkillContractWithApi(
  contract: CapabilitySkillContractInput,
  opts: {
    logLimitBytes: number;
    api: ReturnType<typeof resolveCommandContext>["api"];
  },
): Promise<SkillVerificationReport> {
  const runEvidence: SkillVerificationRunInput[] = [];
  for (const runId of contract.verify.runIds) {
    runEvidence.push(
      await buildRunEvidence(runId, {
        logLimitBytes: opts.logLimitBytes,
        api: opts.api,
      }),
    );
  }

  return evaluateSkillContractVerification(contract, runEvidence);
}

export async function verifyCapabilityContractsInDirectory(
  rootDir: string,
  opts: {
    logLimitBytes: number;
    api: ReturnType<typeof resolveCommandContext>["api"];
  },
): Promise<SkillVerificationBatchReport> {
  const files = await listCapabilityContractFiles(rootDir);
  const reports: SkillVerificationReport[] = [];

  for (const filePath of files) {
    const contract = await loadCapabilitySkillContract(filePath);
    reports.push(
      await verifyCapabilitySkillContractWithApi(contract, {
        logLimitBytes: opts.logLimitBytes,
        api: opts.api,
      }),
    );
  }

  const passedContracts = reports.filter((report) => report.passed).length;
  const failedContracts = reports.length - passedContracts;
  return {
    passed: failedContracts === 0,
    totalContracts: reports.length,
    passedContracts,
    failedContracts,
    reports,
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function registerSkillContractCommands(program: Command): void {
  const skill = program.command("skill").description("Capability skill contract utilities");
  const contract = skill.command("contract").description("Skill contract governance commands");

  contract
    .command("list")
    .description("List available capability contracts for operator reuse")
    .option(
      "--dir <path>",
      "Directory containing capability contract JSON files",
      "company-hq/capabilities",
    )
    .option("--maturity <state>", "Filter by maturity state (for example verified)")
    .option("--json", "Output raw JSON")
    .action(async (opts: SkillContractListOptions) => {
      try {
        const dir = opts.dir?.trim() || "company-hq/capabilities";
        const summaries = await listCapabilityContractSummaries(dir, {
          maturity: opts.maturity?.trim() || undefined,
        });
        if (opts.json) {
          printOutput(summaries, { json: true });
          return;
        }

        if (summaries.length === 0) {
          printOutput([], { json: false });
          return;
        }

        for (const summary of summaries) {
          console.log(
            [
              `capabilityId=${summary.capabilityId}`,
              `maturity=${summary.maturity}`,
              `title=${summary.title}`,
              `owners=${summary.owners.join(",")}`,
              `verifyRuns=${summary.verifyRunCount}`,
              `summary=${summary.summary}`,
            ].join(" "),
          );
        }
      } catch (err) {
        handleCommandError(err);
      }
    });

  contract
    .command("use")
    .description("Show the shortest operator reuse brief for a verified capability")
    .argument("<capabilityIdOrFile>", "Capability id or path to a capability contract JSON file")
    .option(
      "--dir <path>",
      "Directory containing capability contract JSON files",
      "company-hq/capabilities",
    )
    .option("--json", "Output raw JSON")
    .action(async (capabilityIdOrFile: string, opts: SkillContractUseOptions) => {
      try {
        const result = await loadCapabilitySkillContractByRef(capabilityIdOrFile, {
          rootDir: opts.dir?.trim() || "company-hq/capabilities",
        });
        const brief = buildSkillOperationalReuseBrief(result.filePath, result.contract);
        if (opts.json) {
          printOutput(brief, { json: true });
          return;
        }

        console.log(`${brief.title} (${brief.capabilityId})`);
        console.log(`maturity=${brief.maturity}`);
        console.log(`summary=${brief.summary}`);
        console.log(`intent=${brief.intent}`);
        console.log(`inputs=${brief.inputsRequired.join(" | ")}`);
        console.log(`allowed=${brief.allowedActions.join(" | ")}`);
        console.log(`forbidden=${brief.forbiddenActions.join(" | ")}`);
        console.log(`success=${brief.successCriteria.join(" | ")}`);
        console.log(`verify=${brief.verifyPath.verify}`);
        console.log(`verifyAll=${brief.verifyPath.verifyAll}`);
      } catch (err) {
        handleCommandError(err);
      }
    });

  contract
    .command("validate")
    .description("Validate a capability skill contract JSON file")
    .argument("<file>", "Path to a capability skill contract JSON file")
    .option("--json", "Output raw JSON")
    .action(async (file: string, opts: SkillContractValidateOptions) => {
      try {
        const parsed = await loadCapabilitySkillContract(file);
        const output = {
          ok: true,
          capabilityId: parsed.capabilityId,
          maturity: parsed.maturity,
          primitiveCount: parsed.primitives.length,
          verifyRunCount: parsed.verify.runIds.length,
        };
        printOutput(output, { json: Boolean(opts.json) });
      } catch (err) {
        handleCommandError(err);
      }
    });

  addCommonClientOptions(
    contract
      .command("verify")
      .description("Verify contract evidence markers against heartbeat run logs")
      .argument("<file>", "Path to a capability skill contract JSON file")
      .option(
        "--log-limit-bytes <n>",
        "Max bytes fetched per run from /api/heartbeat-runs/:id/log",
        "200000",
      )
      .action(async (file: string, opts: SkillContractVerifyOptions) => {
        try {
          const parsed = await loadCapabilitySkillContract(file);
          const ctx = resolveCommandContext(opts);
          const logLimitBytes = parsePositiveInt(opts.logLimitBytes, 200000);

          const report = await verifyCapabilitySkillContractWithApi(parsed, {
            logLimitBytes,
            api: ctx.api,
          });
          printOutput(report, { json: Boolean(opts.json) });

          if (!report.passed) {
            process.exitCode = 1;
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    contract
      .command("verify-all")
      .description("Verify all capability contracts in a directory")
      .option(
        "--dir <path>",
        "Directory containing capability contract JSON files",
        "company-hq/capabilities",
      )
      .option(
        "--log-limit-bytes <n>",
        "Max bytes fetched per run from /api/heartbeat-runs/:id/log",
        "200000",
      )
      .action(async (opts: SkillContractVerifyAllOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const logLimitBytes = parsePositiveInt(opts.logLimitBytes, 200000);
          const contractDir = opts.dir?.trim() || "company-hq/capabilities";
          const report = await verifyCapabilityContractsInDirectory(contractDir, {
            logLimitBytes,
            api: ctx.api,
          });
          printOutput(report, { json: Boolean(opts.json) });
          if (!report.passed) {
            process.exitCode = 1;
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );
}
