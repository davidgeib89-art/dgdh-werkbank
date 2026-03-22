import express from "express";
import path from "node:path";
import { promises as fs } from "node:fs";
import request from "supertest";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

async function createFixtureImage(filePath: string) {
  await sharp({
    create: {
      width: 1800,
      height: 1200,
      channels: 3,
      background: "#4a78b6",
    },
  })
    .jpeg({ quality: 92 })
    .toFile(filePath);
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

describe("revenue lane routes", () => {
  const tempRoots: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it("processes repo-relative image folders and logs activity", async () => {
    const root = await fs.mkdtemp(path.join(process.cwd(), ".tmp", "revenue-image-route-"));
    tempRoots.push(root);
    await createFixtureImage(path.join(root, "sample.jpg"));

    const sourceDir = path.relative(process.cwd(), root).split(path.sep).join("/");
    const res = await request(createApp())
      .post("/api/companies/company-1/revenue-lane/image-pipeline/process")
      .send({
        sourceDir,
        targetBytes: 200_000,
      });

    expect(res.status).toBe(201);
    expect(res.body.imageCount).toBe(1);
    expect(res.body.outputDir).toBe(`${sourceDir}/processed`);
    expect(logActivity).toHaveBeenCalledWith(
      {} as any,
      expect.objectContaining({
        companyId: "company-1",
        action: "revenue.image_packet_pipeline.processed",
        details: expect.objectContaining({
          sourceDir,
          imageCount: 1,
        }),
      }),
    );
  });
});
