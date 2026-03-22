import path from "node:path";
import { promises as fs } from "node:fs";
import sharp from "sharp";
import type {
  RevenueImageOutputFormat,
  RevenueImagePipelineAsset,
  RevenueImagePipelineResult,
  RevenueImageVariantName,
  RunImagePacketPipeline,
} from "@paperclipai/shared";
import { badRequest } from "../errors.js";
import { logger } from "../middleware/logger.js";

type ImageVariantDefinition = {
  name: RevenueImageVariantName;
  width: number;
  height: number;
};

const IMAGE_PACKET_VARIANTS: ImageVariantDefinition[] = [
  { name: "hero", width: 1600, height: 900 },
  { name: "gallery", width: 1200, height: 900 },
  { name: "thumb", width: 600, height: 600 },
];

const OUTPUT_FORMATS: RevenueImageOutputFormat[] = ["webp", "jpg"];
const QUALITY_STEPS = [82, 76, 70, 64, 58, 52, 46, 40, 34, 28, 22, 16, 12];
const SCALE_STEPS = [1, 0.92, 0.84, 0.76] as const;
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function assertInsideRepoRoot(repoRoot: string, absolutePath: string, fieldName: string) {
  const relative = path.relative(repoRoot, absolutePath);
  if (relative === "") return;
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw badRequest(`${fieldName} must stay inside the repository root`);
  }
}

function toRepoRelativePath(repoRoot: string, absolutePath: string) {
  const relative = path.relative(repoRoot, absolutePath);
  return relative === "" ? "." : relative.split(path.sep).join("/");
}

async function renderVariantBuffer(
  sourcePath: string,
  variant: ImageVariantDefinition,
  format: RevenueImageOutputFormat,
  quality: number,
) {
  const resizeWidth = Math.max(320, Math.round(variant.width));
  const resizeHeight = Math.max(320, Math.round(variant.height));
  const image = sharp(sourcePath)
    .rotate()
    .resize({
      width: resizeWidth,
      height: resizeHeight,
      fit: "cover",
      position: sharp.strategy.attention,
    });

  if (format === "webp") {
    return image.webp({ quality, effort: 4 }).toBuffer();
  }

  return image.jpeg({
    quality,
    mozjpeg: true,
    progressive: true,
    chromaSubsampling: "4:2:0",
  }).toBuffer();
}

async function renderWithinTargetBytes(
  sourcePath: string,
  variant: ImageVariantDefinition,
  format: RevenueImageOutputFormat,
  targetBytes: number,
) {
  let best: { buffer: Buffer; quality: number; width: number; height: number } | null = null;

  for (const scale of SCALE_STEPS) {
    const scaledVariant = {
      ...variant,
      width: Math.round(variant.width * scale),
      height: Math.round(variant.height * scale),
    };

    for (const quality of QUALITY_STEPS) {
      const buffer = await renderVariantBuffer(
        sourcePath,
        scaledVariant,
        format,
        quality,
      );
      best = {
        buffer,
        quality,
        width: Math.max(320, scaledVariant.width),
        height: Math.max(320, scaledVariant.height),
      };
      if (buffer.byteLength <= targetBytes) {
        return best;
      }
    }
  }

  return best!;
}

export function revenueImagePipelineService() {
  const repoRoot = path.resolve(process.cwd());

  return {
    async processDirectory(input: RunImagePacketPipeline): Promise<RevenueImagePipelineResult> {
      const sourceDirAbsolute = path.resolve(repoRoot, input.sourceDir);
      assertInsideRepoRoot(repoRoot, sourceDirAbsolute, "sourceDir");

      const sourceStats = await fs.stat(sourceDirAbsolute).catch(() => null);
      if (!sourceStats?.isDirectory()) {
        throw badRequest("sourceDir must point to an existing directory inside the repository");
      }

      const outputDirAbsolute = path.resolve(
        repoRoot,
        input.outputDir ?? path.join(input.sourceDir, "processed"),
      );
      assertInsideRepoRoot(repoRoot, outputDirAbsolute, "outputDir");
      if (sourceDirAbsolute === outputDirAbsolute) {
        throw badRequest("outputDir must be different from sourceDir");
      }

      await fs.mkdir(outputDirAbsolute, { recursive: true });

      const sourceFiles = (await fs.readdir(sourceDirAbsolute, { withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()))
        .sort((left, right) => left.localeCompare(right));

      if (sourceFiles.length === 0) {
        throw badRequest("No supported images found in sourceDir");
      }

      const assets: RevenueImagePipelineAsset[] = [];
      for (const [index, sourceFilename] of sourceFiles.entries()) {
        const sourcePathAbsolute = path.join(sourceDirAbsolute, sourceFilename);
        const sourceMetadata = await sharp(sourcePathAbsolute).metadata();
        const imageId = `image-${String(index + 1).padStart(2, "0")}`;
        const outputs: RevenueImagePipelineAsset["outputs"] = [];

        for (const variant of IMAGE_PACKET_VARIANTS) {
          for (const format of OUTPUT_FORMATS) {
            const rendered = await renderWithinTargetBytes(
              sourcePathAbsolute,
              variant,
              format,
              input.targetBytes,
            );
            const outputFilename = `${imageId}-${variant.name}.${format}`;
            const outputPathAbsolute = path.join(outputDirAbsolute, outputFilename);
            await fs.writeFile(outputPathAbsolute, rendered.buffer);
            outputs.push({
              variant: variant.name,
              format,
              path: toRepoRelativePath(repoRoot, outputPathAbsolute),
              width: rendered.width,
              height: rendered.height,
              byteSize: rendered.buffer.byteLength,
              quality: rendered.quality,
            });
          }
        }

        assets.push({
          id: imageId,
          sourceFilename,
          sourcePath: toRepoRelativePath(repoRoot, sourcePathAbsolute),
          sourceWidth: sourceMetadata.width ?? null,
          sourceHeight: sourceMetadata.height ?? null,
          outputs,
        });
      }

      const manifestPathAbsolute = path.join(outputDirAbsolute, "manifest.json");
      const result: RevenueImagePipelineResult = {
        sourceDir: toRepoRelativePath(repoRoot, sourceDirAbsolute),
        outputDir: toRepoRelativePath(repoRoot, outputDirAbsolute),
        manifestPath: toRepoRelativePath(repoRoot, manifestPathAbsolute),
        imageCount: assets.length,
        targetBytes: input.targetBytes,
        generatedAt: new Date().toISOString(),
        assets,
      };

      await fs.writeFile(
        manifestPathAbsolute,
        `${JSON.stringify(result, null, 2)}\n`,
        "utf8",
      );

      logger.info(
        {
          event: "revenue_image_packet_pipeline_completed",
          sourceDir: result.sourceDir,
          outputDir: result.outputDir,
          imageCount: result.imageCount,
          manifestPath: result.manifestPath,
          targetBytes: result.targetBytes,
        },
        "Revenue image packet pipeline completed",
      );

      return result;
    },
  };
}
