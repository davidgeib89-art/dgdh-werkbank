import path from "node:path";
import { promises as fs } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { revenueSchemaFillService } from "../services/revenue-schema-fill.js";

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
    theme: {
      themeHue: 210,
      defaultTheme: "system",
    },
    banner: {
      primaryCtaLabel: "Verfuegbarkeit anfragen",
      secondaryCtaLabel: "Mehr sehen",
    },
  });
  await writeJson(path.join(root, "src/content/settings/profile.json"), {
    vertical: "ferienwohnung",
    profileVersion: "V0.2",
  });
}

async function createSchemaFillFixture(root: string) {
  const processedDir = path.join(root, "processed");
  await fs.mkdir(processedDir, { recursive: true });

  const assetVariants = [
    ["image-01", "wohnzimmer"],
    ["image-02", "schlafzimmer"],
  ] as const;

  const assets = [];
  for (const [index, [assetId, sourceFilename]] of assetVariants.entries()) {
    const outputs = [];
    for (const variant of ["hero", "gallery", "thumb"] as const) {
      const outputPath = path.join(processedDir, `${assetId}-${variant}.webp`);
      await writeText(outputPath, `${assetId}-${variant}`);
      outputs.push({
        variant,
        format: "webp",
        path: path.relative(process.cwd(), outputPath).split(path.sep).join("/"),
        width: variant === "thumb" ? 600 : 1600,
        height: variant === "thumb" ? 600 : 900,
        byteSize: 1024 + index,
        quality: 80,
      });
    }

    assets.push({
      id: assetId,
      sourceFilename: `${sourceFilename}.jpg`,
      sourcePath: `shared/Kunde/test/${sourceFilename}.jpg`,
      sourceWidth: 1600,
      sourceHeight: 900,
      outputs,
    });
  }

  const manifestPath = path.join(processedDir, "manifest.json");
  const contentDraftPath = path.join(processedDir, "content-draft.json");

  await writeJson(manifestPath, {
    sourceDir: path.relative(process.cwd(), root).split(path.sep).join("/"),
    outputDir: path.relative(process.cwd(), processedDir).split(path.sep).join("/"),
    manifestPath: path.relative(process.cwd(), manifestPath).split(path.sep).join("/"),
    imageCount: assets.length,
    targetBytes: 200000,
    generatedAt: "2026-03-22T15:00:00.000Z",
    assets,
  });

  await writeJson(contentDraftPath, {
    source: "gemini_flash_lite",
    sourceDir: path.relative(process.cwd(), root).split(path.sep).join("/"),
    manifestPath: path.relative(process.cwd(), manifestPath).split(path.sep).join("/"),
    outputPath: path.relative(process.cwd(), contentDraftPath).split(path.sep).join("/"),
    sourceFiles: ["notes.md"],
    generatedAt: "2026-03-22T15:01:00.000Z",
    name: "Ferienwohnung Platzhalter",
    tagline: null,
    description: "Ruhige Unterkunft fuer entspannte Tage im Nahetal.",
    highlights: ["Ruhige Lage", "Nahe Radweg"],
    amenities: ["WLAN", "Parkplatz"],
    pricing: {
      priceText: "ab 95 EUR / Nacht",
      currency: "EUR",
      period: "pro Nacht",
      notes: null,
    },
    location: {
      address: "Musterweg 1",
      city: "Meddersheim",
      region: "Nahetal",
      postalCode: "55566",
      country: "Deutschland",
    },
    contact: {
      name: null,
      email: "info@example.com",
      phone: "06751 123456",
      website: "https://example.com",
    },
  });

  return {
    manifestPath: path.relative(process.cwd(), manifestPath).split(path.sep).join("/"),
    contentDraftPath: path.relative(process.cwd(), contentDraftPath).split(path.sep).join("/"),
  };
}

describe("revenueSchemaFillService", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it("creates a deterministic site-output with copied assets and placeholders", async () => {
    const sourceRoot = await fs.mkdtemp(path.join(process.cwd(), ".tmp", "revenue-schema-fill-"));
    const templateRoot = await fs.mkdtemp(path.join(process.cwd(), ".tmp", "revenue-schema-template-"));
    tempRoots.push(sourceRoot, templateRoot);

    const fixture = await createSchemaFillFixture(sourceRoot);
    await createTemplateRepo(templateRoot);

    const service = revenueSchemaFillService();
    const result = await service.processDirectory({
      manifestPath: fixture.manifestPath,
      contentDraftPath: fixture.contentDraftPath,
      templateRepoPath: templateRoot,
    });

    expect(result.outputDir).toBe(
      `${path.relative(process.cwd(), sourceRoot).split(path.sep).join("/")}/processed/site-output`,
    );
    expect(result.assetCount).toBe(6);
    expect(result.placeholderCount).toBeGreaterThan(0);

    const siteSettings = JSON.parse(
      await fs.readFile(
        path.join(sourceRoot, "processed", "site-output", "src", "content", "settings", "site.json"),
        "utf8",
      ),
    );
    expect(siteSettings.identity.businessName).toBe("Ferienwohnung Platzhalter");
    expect(siteSettings.identity.ownerName).toBe("[Name Gastgeber:in]");
    expect(siteSettings.theme.themeHue).toBe(210);
    expect(siteSettings.banner.imagesDesktop).toHaveLength(2);
    expect(siteSettings.banner.imagesDesktop[0]).toContain("@assets/images/banner/generated/");

    const copiedAsset = path.join(
      sourceRoot,
      "processed",
      "site-output",
      "src",
      "assets",
      "images",
      "banner",
      "generated",
      "00.webp",
    );
    expect(await fs.stat(copiedAsset).then((stats) => stats.isFile())).toBe(true);

    const highlightsSection = await fs.readFile(
      path.join(
        sourceRoot,
        "processed",
        "site-output",
        "src",
        "content",
        "sections",
        "ausstattung-komfort",
        "index.md",
      ),
      "utf8",
    );
    expect(highlightsSection).toContain("Ruhige Lage");
    expect(highlightsSection).toContain("@assets/images/sections/ausstattung-komfort/sectionLayout/value/items/00.webp");
  });
});
