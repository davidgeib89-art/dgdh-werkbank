import path from "node:path";
import { promises as fs } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { revenueTemplateApplyService } from "../services/revenue-template-apply.js";

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
  await writeText(path.join(root, "src/content/sections/legacy-slug/index.md"), "---\ntitle: Alt\n---\n");
  await writeText(path.join(root, "src/assets/images/banner/generated/obsolete.webp"), "obsolete");
  await writeText(
    path.join(root, "src/assets/images/sections/umgebung/sectionLayout/value/pois/0/image.jpg"),
    "keep-me",
  );
}

async function createSiteOutput(root: string) {
  const outputRoot = path.join(root, "processed", "site-output");
  await writeJson(path.join(outputRoot, "src/content/settings/site.json"), {
    identity: { siteTitle: "Neu" },
  });
  await writeJson(path.join(outputRoot, "src/content/settings/profile.json"), {
    vertical: "ferienwohnung",
    profileVersion: "V0.2",
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

describe("revenueTemplateApplyService", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it("mirrors managed revenue-lane output into the target template repo and prunes stale managed paths", async () => {
    const sourceRoot = await fs.mkdtemp(path.join(process.cwd(), ".tmp", "revenue-template-apply-source-"));
    const templateRoot = await fs.mkdtemp(path.join(process.cwd(), ".tmp", "revenue-template-apply-template-"));
    tempRoots.push(sourceRoot, templateRoot);

    const outputRoot = await createSiteOutput(sourceRoot);
    await createTemplateRepo(templateRoot);

    const service = revenueTemplateApplyService();
    const result = await service.processDirectory({
      siteOutputDir: path.relative(process.cwd(), outputRoot).split(path.sep).join("/"),
      templateRepoPath: templateRoot,
    });

    expect(result.templateRepoPath).toBe(templateRoot);
    expect(result.managedRoots).toContain("src/content/sections");
    expect(result.appliedCount).toBeGreaterThan(0);
    expect(result.deletedPaths).toContain("src/content/sections/legacy-slug");
    expect(result.deletedPaths).toContain("src/assets/images/banner/generated/obsolete.webp");

    const appliedSiteJson = JSON.parse(
      await fs.readFile(path.join(templateRoot, "src/content/settings/site.json"), "utf8"),
    );
    expect(appliedSiteJson.identity.siteTitle).toBe("Neu");

    const legacyExists = await fs
      .stat(path.join(templateRoot, "src/content/sections/legacy-slug"))
      .then(() => true)
      .catch(() => false);
    expect(legacyExists).toBe(false);

    const keptPoiImage = await fs.readFile(
      path.join(templateRoot, "src/assets/images/sections/umgebung/sectionLayout/value/pois/0/image.jpg"),
      "utf8",
    );
    expect(keptPoiImage).toBe("keep-me");

    const mirroredGallery = await fs.readFile(
      path.join(
        templateRoot,
        "src/assets/images/sections/einblicke-in-die-unterkunft/sectionLayout/value/images/00.webp",
      ),
      "utf8",
    );
    expect(mirroredGallery).toBe("gallery");
  });
});
