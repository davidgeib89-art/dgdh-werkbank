import express from "express";
import path from "node:path";
import { promises as fs } from "node:fs";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/index.js";
import { revenueLaneRoutes } from "../routes/revenue-lane.js";

const logActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", async () => {
  const actual = await vi.importActual<typeof import("../services/index.js")>(
    "../services/index.js",
  );
  return {
    ...actual,
    logActivity,
  };
});

async function writeManifest(root: string) {
  const processedDir = path.join(root, "processed");
  await fs.mkdir(processedDir, { recursive: true });
  const manifestPath = path.join(processedDir, "manifest.json");
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        sourceDir: path.relative(process.cwd(), root).split(path.sep).join("/"),
        outputDir: path
          .relative(process.cwd(), processedDir)
          .split(path.sep)
          .join("/"),
        manifestPath: path
          .relative(process.cwd(), manifestPath)
          .split(path.sep)
          .join("/"),
        imageCount: 1,
        targetBytes: 200000,
        generatedAt: "2026-03-22T15:00:00.000Z",
        assets: [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return manifestPath;
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

describe("revenue content extractor routes", () => {
  const tempRoots: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Promise.all(
      tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })),
    );
    tempRoots.length = 0;
  });

  it("processes a content extraction request and logs activity", async () => {
    const root = await fs.mkdtemp(
      path.join(process.cwd(), ".tmp", "revenue-content-route-"),
    );
    tempRoots.push(root);

    const manifestPath = await writeManifest(root);
    const sourceDir = path.relative(process.cwd(), root).split(path.sep).join("/");
    const manifestPathRelative = path
      .relative(process.cwd(), manifestPath)
      .split(path.sep)
      .join("/");

    const res = await request(createApp())
      .post("/api/companies/company-1/revenue-lane/content-extractor/process")
      .send({
        sourceDir,
        manifestPath: manifestPathRelative,
      });

    expect(res.status).toBe(201);
    expect(res.body.source).toBe("no_input");
    expect(res.body.outputPath).toBe(`${sourceDir}/processed/content-draft.json`);
    expect(logActivity).toHaveBeenCalledWith(
      {} as any,
      expect.objectContaining({
        companyId: "company-1",
        action: "revenue.content_packet_extractor.processed",
        details: expect.objectContaining({
          sourceDir,
          manifestPath: manifestPathRelative,
          source: "no_input",
          sourceFileCount: 0,
        }),
      }),
    );
  });
});
