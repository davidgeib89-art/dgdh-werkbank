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
  await writeJson(path.join(root, "src/content/settings/site.json"), {
    identity: { siteTitle: "Alt" },
  });
  await writeJson(path.join(root, "src/content/settings/profile.json"), {
    vertical: "ferienwohnung",
  });
}

async function createSiteOutput(root: string) {
  const outputRoot = path.join(root, "processed", "site-output");
  await writeJson(path.join(outputRoot, "src/content/settings/site.json"), {
    identity: { siteTitle: "Neu" },
  });
  await writeJson(path.join(outputRoot, "src/content/settings/profile.json"), {
    vertical: "ferienwohnung",
  });
  await writeText(path.join(outputRoot, "src/content/settings/impressum.md"), "---\ntitle: Impressum\n---\n");
  await writeText(path.join(outputRoot, "src/content/settings/datenschutz.md"), "---\ntitle: Datenschutz\n---\n");
  await writeText(path.join(outputRoot, "src/content/pages/startseite/index.md"), "---\ntitle: Start\n---\n");
  await writeText(path.join(outputRoot, "src/content/sections/einblicke-in-die-unterkunft/index.md"), "---\ntitle: Einblicke\n---\n");
  await writeText(path.join(outputRoot, "src/content/sections/08-bewertungen/index.md"), "---\ntitle: Bewertungen\n---\n");
  await writeText(path.join(outputRoot, "src/content/sections/09-preise/index.md"), "---\ntitle: Preise\n---\n");
  await writeText(path.join(outputRoot, "src/content/sections/anreise/index.md"), "---\ntitle: Anreise\n---\n");
  await writeText(path.join(outputRoot, "src/content/sections/ausstattung-komfort/index.md"), "---\ntitle: Ausstattung\n---\n");
  await writeText(path.join(outputRoot, "src/content/sections/buchungsanfrage/index.md"), "---\ntitle: Anfrage\n---\n");
  await writeText(path.join(outputRoot, "src/content/sections/haeufige-fragen/index.md"), "---\ntitle: FAQ\n---\n");
  await writeText(path.join(outputRoot, "src/content/sections/umgebung/index.md"), "---\ntitle: Umgebung\n---\n");
  await writeText(path.join(outputRoot, "src/assets/images/banner/generated/00.webp"), "hero");
  await writeText(
    path.join(outputRoot, "src/assets/images/sections/ausstattung-komfort/sectionLayout/value/items/00.webp"),
    "thumb",
  );
  await writeText(
    path.join(outputRoot, "src/assets/images/sections/einblicke-in-die-unterkunft/sectionLayout/value/images/00.webp"),
    "gallery",
  );
  return outputRoot;
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

describe("revenue template apply routes", () => {
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

  it("processes a template-apply request and logs activity", async () => {
    const sourceRoot = await fs.mkdtemp(path.join(process.cwd(), ".tmp", "revenue-template-apply-route-source-"));
    const templateRoot = await fs.mkdtemp(path.join(process.cwd(), ".tmp", "revenue-template-apply-route-template-"));
    tempRoots.push(sourceRoot, templateRoot);

    const outputRoot = await createSiteOutput(sourceRoot);
    await createTemplateRepo(templateRoot);

    const res = await request(createApp())
      .post("/api/companies/company-1/revenue-lane/template-apply/process")
      .send({
        siteOutputDir: path.relative(process.cwd(), outputRoot).split(path.sep).join("/"),
        templateRepoPath: templateRoot,
      });

    expect(res.status).toBe(201);
    expect(res.body.templateRepoPath).toBe(templateRoot);
    expect(res.body.appliedCount).toBeGreaterThan(0);
    expect(logActivity).toHaveBeenCalledWith(
      {} as any,
      expect.objectContaining({
        companyId: "company-1",
        action: "revenue.template_apply_packet.processed",
        details: expect.objectContaining({
          templateRepoPath: templateRoot,
        }),
      }),
    );
  });
});
