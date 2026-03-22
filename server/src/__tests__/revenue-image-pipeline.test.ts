import path from "node:path";
import { promises as fs } from "node:fs";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { revenueImagePipelineService } from "../services/revenue-image-pipeline.js";

async function createFixtureImage(filePath: string, width: number, height: number, color: string) {
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color,
    },
  })
    .jpeg({ quality: 92 })
    .toFile(filePath);
}

async function removeDirWithRetries(dirPath: string, attempts = 5): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        (error as NodeJS.ErrnoException).code !== "EBUSY"
      ) {
        throw error;
      }
      if (attempt === attempts) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }
}

describe("revenueImagePipelineService", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => removeDirWithRetries(root)));
    tempRoots.length = 0;
  });

  it("creates hero, gallery, and thumb variants plus a manifest within target size", async () => {
    const root = await fs.mkdtemp(path.join(process.cwd(), ".tmp", "revenue-image-pipeline-"));
    tempRoots.push(root);

    await createFixtureImage(path.join(root, "one.jpg"), 2200, 1400, "#b65c4a");
    await createFixtureImage(path.join(root, "two.jpg"), 1800, 1800, "#4a78b6");

    const sourceDir = path.relative(process.cwd(), root);
    const service = revenueImagePipelineService();
    const result = await service.processDirectory({
      sourceDir,
      targetBytes: 200_000,
    });

    expect(result.imageCount).toBe(2);
    expect(result.outputDir).toBe(
      path.join(sourceDir, "processed").split(path.sep).join("/"),
    );
    expect(result.assets).toHaveLength(2);

    for (const asset of result.assets) {
      expect(asset.outputs).toHaveLength(6);
      for (const output of asset.outputs) {
        expect(output.byteSize).toBeLessThanOrEqual(200_000);
        const metadata = await sharp(path.resolve(process.cwd(), output.path)).metadata();
        expect(metadata.width).toBe(output.width);
        expect(metadata.height).toBe(output.height);
      }
    }

    const manifest = JSON.parse(
      await fs.readFile(path.join(root, "processed", "manifest.json"), "utf8"),
    );
    expect(manifest.imageCount).toBe(2);
    expect(manifest.assets[0].outputs).toHaveLength(6);
  });
});
