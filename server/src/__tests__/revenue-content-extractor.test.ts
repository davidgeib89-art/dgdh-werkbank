import path from "node:path";
import { promises as fs } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  ensureCommandResolvableMock: vi.fn(),
  runChildProcessMock: vi.fn(),
}));

vi.mock("../adapters/utils.js", async () => {
  const actual = await vi.importActual<typeof import("../adapters/utils.js")>(
    "../adapters/utils.js",
  );
  return {
    ...actual,
    ensureCommandResolvable: hoisted.ensureCommandResolvableMock,
    runChildProcess: hoisted.runChildProcessMock,
  };
});

import { revenueContentExtractorService } from "../services/revenue-content-extractor.js";

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
        assets: [
          {
            id: "image-01",
            sourceFilename: "sample.jpg",
            sourcePath: "shared/Kunde/sample.jpg",
            sourceWidth: 1600,
            sourceHeight: 900,
            outputs: [
              {
                variant: "hero",
                format: "webp",
                path: "shared/Kunde/processed/image-01-hero.webp",
                width: 1600,
                height: 900,
                byteSize: 150000,
                quality: 80,
              },
            ],
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return manifestPath;
}

describe("revenueContentExtractorService", () => {
  const tempRoots: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.ensureCommandResolvableMock.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await Promise.all(
      tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })),
    );
    tempRoots.length = 0;
  });

  it("extracts structured content with Gemini Flash-Lite and writes content-draft.json", async () => {
    const root = await fs.mkdtemp(
      path.join(process.cwd(), ".tmp", "revenue-content-extractor-"),
    );
    tempRoots.push(root);

    const manifestPath = await writeManifest(root);
    await fs.writeFile(
      path.join(root, "notes.md"),
      [
        "# Ferienwohnung Platzhalter",
        "Die Ferienwohnung liegt in Meddersheim.",
        "Preis ab 95 EUR pro Nacht.",
        "Ausstattung: WLAN, Balkon, Parkplatz.",
        "Kontakt: Beispiel Gastgeberin, info@example.com, 06751 123456.",
      ].join("\n"),
      "utf8",
    );
    await fs.writeFile(
      path.join(root, "facts.json"),
      JSON.stringify(
        {
          tagline: "Ruhige Auszeit im Nahetal",
          address: "Meddersheim",
        },
        null,
        2,
      ),
      "utf8",
    );

    hoisted.runChildProcessMock.mockResolvedValue({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: JSON.stringify({
        type: "assistant",
        message: {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                name: "Ferienwohnung Platzhalter",
                tagline: "Ruhige Auszeit im Nahetal",
                description:
                  "Die Ferienwohnung liegt in Meddersheim und bietet eine ruhige Auszeit.",
                highlights: ["Ruhige Lage", "Nahetal"],
                amenities: ["WLAN", "Balkon", "Parkplatz"],
                pricing: {
                  priceText: "ab 95 EUR pro Nacht",
                  currency: "EUR",
                  period: "pro Nacht",
                  notes: null,
                },
                location: {
                  address: null,
                  city: "Meddersheim",
                  region: null,
                  postalCode: null,
                  country: "Deutschland",
                },
                contact: {
                  name: "Beispiel Gastgeberin",
                  email: "info@example.com",
                  phone: "06751 123456",
                  website: null,
                },
              }),
            },
          ],
        },
      }),
      stderr: "",
    });

    const service = revenueContentExtractorService();
    const result = await service.processDirectory({
      sourceDir: path.relative(process.cwd(), root).split(path.sep).join("/"),
      manifestPath: path
        .relative(process.cwd(), manifestPath)
        .split(path.sep)
        .join("/"),
    });

    expect(result.source).toBe("gemini_flash_lite");
    expect(result.name).toBe("Ferienwohnung Platzhalter");
    expect(result.amenities).toEqual(["WLAN", "Balkon", "Parkplatz"]);
    expect(result.sourceFiles).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/notes\.md$/),
        expect.stringMatching(/facts\.json$/),
      ]),
    );
    expect(hoisted.runChildProcessMock).toHaveBeenCalledWith(
      expect.stringContaining("revenue-content-extractor-"),
      "gemini",
      expect.arrayContaining(["--model", "gemini-2.5-flash-lite"]),
      expect.objectContaining({
        stdin: expect.stringContaining(
          "Du bist ein strukturierter Content-Extraktor",
        ),
      }),
    );

    const written = JSON.parse(
      await fs.readFile(path.join(root, "processed", "content-draft.json"), "utf8"),
    );
    expect(written).toEqual(result);
  });

  it("writes a no_input draft when the folder has no text material", async () => {
    const root = await fs.mkdtemp(
      path.join(process.cwd(), ".tmp", "revenue-content-extractor-empty-"),
    );
    tempRoots.push(root);

    const manifestPath = await writeManifest(root);
    const service = revenueContentExtractorService();
    const result = await service.processDirectory({
      sourceDir: path.relative(process.cwd(), root).split(path.sep).join("/"),
      manifestPath: path
        .relative(process.cwd(), manifestPath)
        .split(path.sep)
        .join("/"),
    });

    expect(result.source).toBe("no_input");
    expect(result.name).toBeNull();
    expect(result.highlights).toBeNull();
    expect(result.pricing).toBeNull();
    expect(hoisted.runChildProcessMock).not.toHaveBeenCalled();

    const written = JSON.parse(
      await fs.readFile(path.join(root, "processed", "content-draft.json"), "utf8"),
    );
    expect(written.source).toBe("no_input");
  });
});
