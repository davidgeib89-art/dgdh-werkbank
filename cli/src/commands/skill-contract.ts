import { readFile } from "node:fs/promises";
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

interface SkillContractVerifyOptions extends BaseClientOptions {
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

export async function loadCapabilitySkillContract(
  inputPath: string,
): Promise<CapabilitySkillContractInput> {
  const resolved = path.resolve(inputPath);
  const raw = await readFile(resolved, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return capabilitySkillContractSchema.parse(parsed);
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
    JSON.stringify(run.resultJson ?? {}),
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

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function registerSkillContractCommands(program: Command): void {
  const skill = program.command("skill").description("Capability skill contract utilities");
  const contract = skill.command("contract").description("Skill contract governance commands");

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

          const runEvidence: SkillVerificationRunInput[] = [];
          for (const runId of parsed.verify.runIds) {
            runEvidence.push(
              await buildRunEvidence(runId, {
                logLimitBytes,
                api: ctx.api,
              }),
            );
          }

          const report = evaluateSkillContractVerification(parsed, runEvidence);
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
