import express from "express";
import path from "node:path";
import { promises as fs } from "node:fs";
import request from "supertest";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/index.js";
import { revenueLaneRoutes } from "../routes/revenue-lane.js";

const logActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", async () => {
  const actual = await vi.importActual<typeof import("../services/index.js")>("../services/index.js");
  return {
    ...actual,
    logActivity,
  };
});

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath: string, value: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

async function createTemplateRepo(root: string) {
  await writeText(path.join(root, "keystatic.config.ts"), "export default {};\n");
  await writeText(path.join(root, "src/content.config.ts"), "export const collections = {};\n");
  await writeJson(path.join(root, "src/content/settings/site.json"), { theme: { themeHue: 120 } });
  await writeJson(path.join(root, "src/content/settings/profile.json"), { vertical: "ferienwohnung" });
}

async function createFixture(root: string) {
  const processedDir = path.join(root, "processed");
  await fs.mkdir(processedDir, { recursive: true });
  const heroPath = path.join(processedDir, "image-01-hero.webp");
  const galleryPath = path.join(processedDir, "image-01-gallery.webp");
  const thumbPath = path.join(processedDir, "image-01-thumb.webp");
  await writeText(heroPath, "hero");
  await writeText(galleryPath, "gallery");
  await writeText(thumbPath, "thumb");

  const manifestPath = path.join(processedDir, "manifest.json");
  const contentDraftPath = path.join(processedDir, "content-draft.json");
  await writeJson(manifestPath, {
    sourceDir: path.relative(process.cwd(), root).split(path.sep).join("/"),
    outputDir: path.relative(process.cwd(), processedDir).split(path.sep).join("/"),
    manifestPath: path.relative(process.cwd(), manifestPath).split(path.sep).join("/"),
    imageCount: 1,
    targetBytes: 200000,
    generatedAt: "2026-03-22T15:10:00.000Z",
    assets: [
      {
        id: "image-01",
        sourceFilename: "sample.jpg",
        sourcePath: "shared/Kunde/sample.jpg",
        sourceWidth: 1600,
        sourceHeight: 900,
        outputs: [
          { variant: "hero", format: "webp", path: path.relative(process.cwd(), heroPath).split(path.sep).join("/"), width: 1600, height: 900, byteSize: 1000, quality: 80 },
          { variant: "gallery", format: "webp", path: path.relative(process.cwd(), galleryPath).split(path.sep).join("/"), width: 1200, height: 900, byteSize: 1000, quality: 80 },
          { variant: "thumb", format: "webp", path: path.relative(process.cwd(), thumbPath).split(path.sep).join("/"), width: 600, height: 600, byteSize: 1000, quality: 80 },
        ],
      },
    ],
  });
  await writeJson(contentDraftPath, {
    source: "no_input",
    sourceDir: path.relative(process.cwd(), root).split(path.sep).join("/"),
    manifestPath: path.relative(process.cwd(), manifestPath).split(path.sep).join("/"),
    outputPath: path.relative(process.cwd(), contentDraftPath).split(path.sep).join("/"),
    sourceFiles: [],
    generatedAt: "2026-03-22T15:11:00.000Z",
    name: null,
    tagline: null,
    description: null,
    highlights: null,
    amenities: null,
    pricing: null,
    location: null,
    contact: null,
  });

  return {
    manifestPath: path.relative(process.cwd(), manifestPath).split(path.sep).join("/"),
    contentDraftPath: path.relative(process.cwd(), contentDraftPath).split(path.sep).join("/"),
  };
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "user-1",
      companyIds: ["company-1"],
      source: "session",
      isInstanceAdmin: false,
    };
    next();
  });
  app.use("/api", revenueLaneRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("revenue schema fill routes", () => {
  const tempRoots: string[] = [];

  beforeAll(async () => {
    await fs.mkdir(path.join(process.cwd(), ".tmp"), { recursive: true });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it("processes a schema-fill request and logs activity", async () => {
    const sourceRoot = await fs.mkdtemp(path.join(process.cwd(), ".tmp", "revenue-schema-route-"));
    const templateRoot = await fs.mkdtemp(path.join(process.cwd(), ".tmp", "revenue-schema-template-route-"));
    tempRoots.push(sourceRoot, templateRoot);

    const fixture = await createFixture(sourceRoot);
    await createTemplateRepo(templateRoot);

    const res = await request(createApp())
      .post("/api/companies/company-1/revenue-lane/schema-fill/process")
      .send({
        manifestPath: fixture.manifestPath,
        contentDraftPath: fixture.contentDraftPath,
        templateRepoPath: templateRoot,
      });

    expect(res.status).toBe(201);
    expect(res.body.outputDir).toBe(
      `${path.relative(process.cwd(), sourceRoot).split(path.sep).join("/")}/processed/site-output`,
    );
    expect(res.body.placeholderCount).toBeGreaterThan(0);
    expect(logActivity).toHaveBeenCalledWith(
      {} as any,
      expect.objectContaining({
        companyId: "company-1",
        action: "revenue.schema_fill_packet.processed",
        details: expect.objectContaining({
          assetCount: 3,
        }),
      }),
    );
  });
});
