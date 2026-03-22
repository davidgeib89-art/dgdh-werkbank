import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  ensureCommandResolvable,
  ensurePathInEnv,
  parseObject,
  runChildProcess,
} from "../adapters/utils.js";
import { parseGeminiJsonl } from "@paperclipai/adapter-gemini-local/server";
import type {
  RevenueContentDraft,
  RevenueContentDraftFields,
  RevenueImagePipelineResult,
  RunRevenueContentExtractor,
} from "@paperclipai/shared";
import { revenueContentDraftFieldsSchema } from "@paperclipai/shared";
import { badRequest } from "../errors.js";
import { logger } from "../middleware/logger.js";

const CONTENT_DRAFT_FILENAME = "content-draft.json";
const DEFAULT_GEMINI_COMMAND = "gemini";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_TIMEOUT_SEC = 45;
const SUPPORTED_TEXT_EXTENSIONS = new Set([".txt", ".md", ".markdown", ".json"]);

type ContentSourceFile = {
  path: string;
  content: string;
};

function assertInsideRepoRoot(
  repoRoot: string,
  absolutePath: string,
  fieldName: string,
) {
  const relative = path.relative(repoRoot, absolutePath);
  if (relative === "") return;
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw badRequest(`${fieldName} must stay inside the repository root`);
  }
}

function assertInsideDirectory(
  rootPath: string,
  absolutePath: string,
  fieldName: string,
) {
  const relative = path.relative(rootPath, absolutePath);
  if (relative === "") return;
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw badRequest(`${fieldName} must stay inside sourceDir`);
  }
}

function toRepoRelativePath(repoRoot: string, absolutePath: string) {
  const relative = path.relative(repoRoot, absolutePath);
  return relative === "" ? "." : relative.split(path.sep).join("/");
}

function readEnvString(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readTimeoutSec(): number {
  const raw =
    readEnvString("GEMINI_CONTENT_EXTRACTOR_TIMEOUT_SEC") ??
    readEnvString("GEMINI_FLASH_LITE_TIMEOUT_SEC");
  if (!raw) return DEFAULT_TIMEOUT_SEC;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_SEC;
  return Math.max(5, Math.min(120, Math.floor(parsed)));
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function createEmptyDraftFields(): RevenueContentDraftFields {
  return {
    name: null,
    tagline: null,
    description: null,
    highlights: null,
    amenities: null,
    pricing: null,
    location: null,
    contact: null,
  };
}

function parseManifest(raw: string, manifestPath: string): RevenueImagePipelineResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw badRequest(`manifestPath must point to valid JSON: ${manifestPath}`);
  }

  const manifest = parseObject(parsed);
  const imageCount = manifest.imageCount;
  const assets = Array.isArray(manifest.assets) ? manifest.assets : null;
  if (typeof imageCount !== "number" || !Number.isFinite(imageCount) || !assets) {
    throw badRequest(
      `manifestPath must point to a revenue image manifest: ${manifestPath}`,
    );
  }

  return manifest as unknown as RevenueImagePipelineResult;
}

async function listContentSourceFiles(input: {
  repoRoot: string;
  sourceDirAbsolute: string;
  excludedDirAbsolute: string;
}): Promise<ContentSourceFile[]> {
  const collected: ContentSourceFile[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (absolutePath === input.excludedDirAbsolute) continue;
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;

      const lowerName = entry.name.toLowerCase();
      const extension = path.extname(lowerName);
      if (!SUPPORTED_TEXT_EXTENSIONS.has(extension)) continue;
      if (lowerName === CONTENT_DRAFT_FILENAME) continue;

      const content = (await fs.readFile(absolutePath, "utf8")).trim();
      if (!content) continue;
      collected.push({
        path: toRepoRelativePath(input.repoRoot, absolutePath),
        content,
      });
    }
  }

  await walk(input.sourceDirAbsolute);
  collected.sort((left, right) => left.path.localeCompare(right.path));
  return collected;
}

function buildPrompt(input: {
  sourceDir: string;
  manifestPath: string;
  manifest: RevenueImagePipelineResult;
  sourceFiles: ContentSourceFile[];
}) {
  const promptPayload = {
    sourceDir: input.sourceDir,
    manifestPath: input.manifestPath,
    imageManifest: {
      imageCount: input.manifest.imageCount,
      assets: input.manifest.assets.map((asset) => ({
        id: asset.id,
        sourceFilename: asset.sourceFilename,
        outputs: asset.outputs.map((output) => ({
          variant: output.variant,
          format: output.format,
          path: output.path,
        })),
      })),
    },
    sourceFiles: input.sourceFiles,
    outputSchema: {
      name: "string | null",
      tagline: "string | null",
      description: "string | null",
      highlights: "string[] | null",
      amenities: "string[] | null",
      pricing: {
        priceText: "string | null",
        currency: "string | null",
        period: "string | null",
        notes: "string | null",
      },
      location: {
        address: "string | null",
        city: "string | null",
        region: "string | null",
        postalCode: "string | null",
        country: "string | null",
      },
      contact: {
        name: "string | null",
        email: "string | null",
        phone: "string | null",
        website: "string | null",
      },
    },
  };

  return [
    "SYSTEM: Du bist ein strukturierter Content-Extraktor fuer Ferienwohnungs-Websites.",
    "Extrahiere nur was explizit im Material steht.",
    "Fehlende Felder muessen null sein. Nichts erfinden.",
    "Verwende nur die gelieferten Textdateien als harte Quelle. Dateinamen und Bilddateien sind keine Faktenquelle.",
    "Wenn fuer Highlights oder Amenities keine expliziten Punkte genannt sind, gib null statt leeren Listen zurueck.",
    "Antworte NUR mit genau einem JSON-Objekt. Kein Markdown. Keine Erklaerung.",
    JSON.stringify(promptPayload),
  ].join("\n");
}

function parseDraftFields(summary: string): RevenueContentDraftFields {
  const candidate = extractJsonObject(summary.trim());
  if (!candidate) {
    throw new Error("Gemini content extractor returned no JSON object");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("Gemini content extractor returned invalid JSON");
  }

  return revenueContentDraftFieldsSchema.parse(parsed);
}

async function runGeminiFlashLiteExtraction(input: {
  prompt: string;
  cwd: string;
}): Promise<RevenueContentDraftFields> {
  const command =
    readEnvString("GEMINI_CONTENT_EXTRACTOR_COMMAND") ??
    readEnvString("GEMINI_COMMAND") ??
    DEFAULT_GEMINI_COMMAND;
  const model =
    readEnvString("GEMINI_CONTENT_EXTRACTOR_MODEL") ?? DEFAULT_GEMINI_MODEL;
  const timeoutSec = readTimeoutSec();
  const env = Object.fromEntries(
    Object.entries(
      ensurePathInEnv(
        Object.fromEntries(
          Object.entries(process.env).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        ),
      ),
    ).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  await ensureCommandResolvable(command, input.cwd, env);
  const proc = await runChildProcess(
    `revenue-content-extractor-${randomUUID()}`,
    command,
    [
      "--output-format",
      "stream-json",
      "--model",
      model,
      "--sandbox=none",
    ],
    {
      cwd: input.cwd,
      env,
      timeoutSec,
      graceSec: 5,
      stdin: input.prompt,
      onLog: async () => {
        // The extractor stores only the structured result; raw model output stays out of logs.
      },
    },
  );

  if (proc.timedOut) {
    throw new Error("Gemini content extractor timed out");
  }

  const parsed = parseGeminiJsonl(proc.stdout);
  const fields = parseDraftFields(parsed.summary);
  if ((proc.exitCode ?? 0) !== 0 && !parsed.summary.trim()) {
    throw new Error("Gemini content extractor exited without a usable result");
  }

  return fields;
}

export function revenueContentExtractorService() {
  const repoRoot = path.resolve(process.cwd());

  return {
    async processDirectory(
      input: RunRevenueContentExtractor,
    ): Promise<RevenueContentDraft> {
      const sourceDirAbsolute = path.resolve(repoRoot, input.sourceDir);
      assertInsideRepoRoot(repoRoot, sourceDirAbsolute, "sourceDir");

      const sourceStats = await fs.stat(sourceDirAbsolute).catch(() => null);
      if (!sourceStats?.isDirectory()) {
        throw badRequest(
          "sourceDir must point to an existing directory inside the repository",
        );
      }

      const manifestPathAbsolute = path.resolve(repoRoot, input.manifestPath);
      assertInsideRepoRoot(repoRoot, manifestPathAbsolute, "manifestPath");
      assertInsideDirectory(sourceDirAbsolute, manifestPathAbsolute, "manifestPath");

      const manifestRaw = await fs
        .readFile(manifestPathAbsolute, "utf8")
        .catch(() => null);
      if (manifestRaw === null) {
        throw badRequest(
          "manifestPath must point to an existing manifest.json inside sourceDir",
        );
      }

      const manifest = parseManifest(manifestRaw, input.manifestPath);
      const outputDirAbsolute = path.dirname(manifestPathAbsolute);
      const outputPathAbsolute = path.join(outputDirAbsolute, CONTENT_DRAFT_FILENAME);
      assertInsideDirectory(sourceDirAbsolute, outputPathAbsolute, "outputPath");
      await fs.mkdir(outputDirAbsolute, { recursive: true });

      const sourceFiles = await listContentSourceFiles({
        repoRoot,
        sourceDirAbsolute,
        excludedDirAbsolute: outputDirAbsolute,
      });

      const baseResult = {
        sourceDir: toRepoRelativePath(repoRoot, sourceDirAbsolute),
        manifestPath: toRepoRelativePath(repoRoot, manifestPathAbsolute),
        outputPath: toRepoRelativePath(repoRoot, outputPathAbsolute),
        sourceFiles: sourceFiles.map((file) => file.path),
        generatedAt: new Date().toISOString(),
      };

      if (sourceFiles.length === 0) {
        const result: RevenueContentDraft = {
          ...baseResult,
          source: "no_input",
          ...createEmptyDraftFields(),
        };
        await fs.writeFile(
          outputPathAbsolute,
          `${JSON.stringify(result, null, 2)}\n`,
          "utf8",
        );
        logger.info(
          {
            event: "revenue_content_extractor_no_input",
            sourceDir: result.sourceDir,
            manifestPath: result.manifestPath,
            outputPath: result.outputPath,
          },
          "Revenue content extractor produced no_input draft",
        );
        return result;
      }

      const fields = await runGeminiFlashLiteExtraction({
        cwd: repoRoot,
        prompt: buildPrompt({
          sourceDir: baseResult.sourceDir,
          manifestPath: baseResult.manifestPath,
          manifest,
          sourceFiles,
        }),
      });

      const result: RevenueContentDraft = {
        ...baseResult,
        source: "gemini_flash_lite",
        ...fields,
      };
      await fs.writeFile(
        outputPathAbsolute,
        `${JSON.stringify(result, null, 2)}\n`,
        "utf8",
      );

      logger.info(
        {
          event: "revenue_content_extractor_completed",
          sourceDir: result.sourceDir,
          manifestPath: result.manifestPath,
          outputPath: result.outputPath,
          sourceFileCount: result.sourceFiles.length,
          source: result.source,
          model: DEFAULT_GEMINI_MODEL,
        },
        "Revenue content extractor completed",
      );

      return result;
    },
  };
}
