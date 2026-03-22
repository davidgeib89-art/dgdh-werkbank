import path from "node:path";
import { promises as fs } from "node:fs";
import {
  revenueContentDraftSchema,
  revenueImagePipelineResultSchema,
  type RevenueContentDraft,
  type RevenueImagePipelineAsset,
  type RevenueImagePipelineOutput,
  type RevenueSchemaFillGeneratedFile,
  type RevenueSchemaFillResult,
  type RunRevenueSchemaFill,
} from "@paperclipai/shared";
import { badRequest } from "../errors.js";
import { logger } from "../middleware/logger.js";

const SITE_OUTPUT_DIRNAME = "site-output";
const TEMPLATE_REQUIRED_FILES = [
  "keystatic.config.ts",
  "src/content.config.ts",
  "src/content/settings/site.json",
  "src/content/settings/profile.json",
] as const;

const CONTENT_FILES = {
  siteSettings: "src/content/settings/site.json",
  siteProfile: "src/content/settings/profile.json",
  impressum: "src/content/settings/impressum.md",
  datenschutz: "src/content/settings/datenschutz.md",
  homePage: "src/content/pages/startseite/index.md",
  showcaseSection: "src/content/sections/einblicke-in-die-unterkunft/index.md",
  highlightsSection: "src/content/sections/ausstattung-komfort/index.md",
  pricingSection: "src/content/sections/09-preise/index.md",
  poiSection: "src/content/sections/umgebung/index.md",
  locationSection: "src/content/sections/anreise/index.md",
  faqSection: "src/content/sections/haeufige-fragen/index.md",
  testimonialsSection: "src/content/sections/08-bewertungen/index.md",
  contactSection: "src/content/sections/buchungsanfrage/index.md",
} as const;

type TemplateDefaults = {
  siteDefaults: Record<string, unknown>;
  profileDefaults: Record<string, unknown>;
};

type PlaceholderCounter = { count: number };

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonFile(filePath: string, fieldName: string) {
  const raw = await fs.readFile(filePath, "utf8").catch(() => null);
  if (raw === null) throw badRequest(`${fieldName} must point to an existing JSON file`);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw badRequest(`${fieldName} must contain valid JSON`);
  }
}

async function readTemplateDefaults(templateRepoAbsolute: string): Promise<TemplateDefaults> {
  const templateStats = await fs.stat(templateRepoAbsolute).catch(() => null);
  if (!templateStats?.isDirectory()) {
    throw badRequest("templateRepoPath must point to an existing template repository");
  }

  for (const relativePath of TEMPLATE_REQUIRED_FILES) {
    const filePath = path.join(templateRepoAbsolute, relativePath);
    const exists = await fs.stat(filePath).then((stats) => stats.isFile()).catch(() => false);
    if (!exists) {
      throw badRequest(`templateRepoPath is missing required template file: ${relativePath}`);
    }
  }

  const siteDefaults = await readJsonFile(
    path.join(templateRepoAbsolute, "src/content/settings/site.json"),
    "templateRepoPath",
  );
  const profileDefaults = await readJsonFile(
    path.join(templateRepoAbsolute, "src/content/settings/profile.json"),
    "templateRepoPath",
  );
  if (!isRecord(siteDefaults) || !isRecord(profileDefaults)) {
    throw badRequest("templateRepoPath must contain valid template default objects");
  }
  return { siteDefaults, profileDefaults };
}

function asTrimmedString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function withPlaceholder(
  value: string | null | undefined,
  placeholder: string,
  placeholders: PlaceholderCounter,
) {
  const trimmed = asTrimmedString(value);
  if (trimmed) return trimmed;
  placeholders.count += 1;
  return placeholder;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = asTrimmedString(value);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function combineAddressLines(draft: RevenueContentDraft, placeholders: PlaceholderCounter) {
  const address = asTrimmedString(draft.location?.address);
  const postalCode = asTrimmedString(draft.location?.postalCode);
  const city = asTrimmedString(draft.location?.city);
  const country = asTrimmedString(draft.location?.country);
  const secondLine = [postalCode, city].filter(Boolean).join(" ");
  const lines = [address, secondLine, country].filter(Boolean);
  if (lines.length > 0) return lines.join("\n");
  placeholders.count += 1;
  return "[Strasse Hausnummer]\n[PLZ Ort]";
}

function iconForHighlight(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("wifi") || lower.includes("wlan")) return "material-symbols:wifi";
  if (lower.includes("park")) return "material-symbols:directions-car";
  if (lower.includes("balkon") || lower.includes("terrasse")) return "material-symbols:deck";
  if (lower.includes("tv")) return "material-symbols:tv";
  if (lower.includes("kueche") || lower.includes("koch")) return "material-symbols:kitchen";
  if (lower.includes("bad") || lower.includes("dusche")) return "material-symbols:shower";
  if (lower.includes("bett") || lower.includes("schlaf")) return "material-symbols:bed";
  return "material-symbols:check-circle";
}

function getPreferredOutput(
  asset: RevenueImagePipelineAsset,
  variant: RevenueImagePipelineOutput["variant"],
) {
  const matchingOutputs = asset.outputs.filter((output) => output.variant === variant);
  if (matchingOutputs.length === 0) {
    throw badRequest(`manifestPath is missing a ${variant} output for asset ${asset.id}`);
  }
  return (
    matchingOutputs.find((output) => output.format === "webp") ??
    matchingOutputs.find((output) => output.format === "jpg") ??
    matchingOutputs[0]!
  );
}

function toAssetPublicPath(targetRelativePath: string) {
  const normalized = targetRelativePath.split(path.sep).join("/");
  const prefix = "src/assets/images/";
  if (!normalized.startsWith(prefix)) {
    throw new Error(`Asset output path must stay inside ${prefix}`);
  }
  return `@assets/images/${normalized.slice(prefix.length)}`;
}

async function writeOutputTextFile(input: {
  repoRoot: string;
  outputRootAbsolute: string;
  relativePath: string;
  content: string;
  generatedFiles: RevenueSchemaFillGeneratedFile[];
}) {
  const absolutePath = path.join(input.outputRootAbsolute, input.relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, input.content, "utf8");
  input.generatedFiles.push({
    kind: "content",
    path: toRepoRelativePath(input.repoRoot, absolutePath),
  });
}

async function copyOutputAsset(input: {
  repoRoot: string;
  outputRootAbsolute: string;
  sourceRelativePath: string;
  targetRelativePath: string;
  generatedFiles: RevenueSchemaFillGeneratedFile[];
}) {
  const sourceAbsolutePath = path.resolve(input.repoRoot, input.sourceRelativePath);
  assertInsideRepoRoot(input.repoRoot, sourceAbsolutePath, "manifestPath");
  const sourceExists = await fs.stat(sourceAbsolutePath).then((stats) => stats.isFile()).catch(() => false);
  if (!sourceExists) {
    throw badRequest(`manifestPath references a missing processed image: ${input.sourceRelativePath}`);
  }

  const targetAbsolutePath = path.join(input.outputRootAbsolute, input.targetRelativePath);
  await fs.mkdir(path.dirname(targetAbsolutePath), { recursive: true });
  await fs.copyFile(sourceAbsolutePath, targetAbsolutePath);
  input.generatedFiles.push({
    kind: "asset",
    path: toRepoRelativePath(input.repoRoot, targetAbsolutePath),
  });
  return toAssetPublicPath(input.targetRelativePath);
}

function serializeYamlScalar(value: string | number | boolean | null) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

function serializeYaml(value: unknown, indent = 0): string {
  const spaces = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return `${spaces}[]`;
    return value
      .map((item) => {
        if (!isRecord(item) && !Array.isArray(item)) {
          return `${spaces}- ${serializeYamlScalar(item as string | number | boolean | null)}`;
        }
        return `${spaces}-\n${serializeYaml(item, indent + 2)}`;
      })
      .join("\n");
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).filter((entry) => entry[1] !== undefined);
    if (entries.length === 0) return `${spaces}{}`;
    return entries
      .map(([key, entryValue]) => {
        if (!isRecord(entryValue) && !Array.isArray(entryValue)) {
          return `${spaces}${key}: ${serializeYamlScalar(entryValue as string | number | boolean | null)}`;
        }
        return `${spaces}${key}:\n${serializeYaml(entryValue, indent + 2)}`;
      })
      .join("\n");
  }

  return `${spaces}${serializeYamlScalar(value as string | number | boolean | null)}`;
}

function buildMarkdownDocument(frontmatter: Record<string, unknown>, body: string) {
  return `---\n${serializeYaml(frontmatter)}\n---\n${body.trim()}\n`;
}

function buildGenericImpressum(input: {
  ownerName: string;
  address: string;
  email: string;
  phone: string;
}) {
  return [
    "---",
    'title: "Impressum"',
    "---",
    "# Impressum",
    "",
    "## Angaben gemaess Section 5 TMG",
    "",
    input.ownerName,
    input.address,
    "",
    "## Kontakt",
    "",
    `Telefon: ${input.phone}`,
    `E-Mail: ${input.email}`,
    "",
    "## Redaktionell verantwortlich",
    "",
    input.ownerName,
    input.address,
    "",
    "## Hinweis",
    "",
    "Diese Platzhalter sollten vor dem Livegang mit den finalen Unternehmensdaten ersetzt werden.",
    "",
  ].join("\n");
}

function buildGenericDatenschutz(input: {
  ownerName: string;
  address: string;
  email: string;
}) {
  return [
    "---",
    'title: "Datenschutzerklaerung"',
    "---",
    "# Datenschutzerklaerung",
    "",
    "## Verantwortliche Stelle",
    "",
    input.ownerName,
    input.address,
    `E-Mail: ${input.email}`,
    "",
    "## Hinweis",
    "",
    "Dieses Dokument ist ein Platzhalter fuer die finale Datenschutzerklaerung und muss vor dem Livegang juristisch geprueft werden.",
    "",
  ].join("\n");
}

async function buildAssetReferences(input: {
  repoRoot: string;
  outputRootAbsolute: string;
  manifest: ReturnType<typeof revenueImagePipelineResultSchema.parse>;
  generatedFiles: RevenueSchemaFillGeneratedFile[];
}) {
  const heroRefs: string[] = [];
  const galleryRefs: string[] = [];
  const thumbRefs: string[] = [];

  for (const [index, asset] of input.manifest.assets.entries()) {
    const heroOutput = getPreferredOutput(asset, "hero");
    const galleryOutput = getPreferredOutput(asset, "gallery");
    const thumbOutput = getPreferredOutput(asset, "thumb");
    const imageIndex = String(index).padStart(2, "0");

    heroRefs.push(
      await copyOutputAsset({
        repoRoot: input.repoRoot,
        outputRootAbsolute: input.outputRootAbsolute,
        sourceRelativePath: heroOutput.path,
        targetRelativePath: path.join("src", "assets", "images", "banner", "generated", `${imageIndex}.${heroOutput.format}`),
        generatedFiles: input.generatedFiles,
      }),
    );

    galleryRefs.push(
      await copyOutputAsset({
        repoRoot: input.repoRoot,
        outputRootAbsolute: input.outputRootAbsolute,
        sourceRelativePath: galleryOutput.path,
        targetRelativePath: path.join(
          "src",
          "assets",
          "images",
          "sections",
          "einblicke-in-die-unterkunft",
          "sectionLayout",
          "value",
          "images",
          `${imageIndex}.${galleryOutput.format}`,
        ),
        generatedFiles: input.generatedFiles,
      }),
    );

    thumbRefs.push(
      await copyOutputAsset({
        repoRoot: input.repoRoot,
        outputRootAbsolute: input.outputRootAbsolute,
        sourceRelativePath: thumbOutput.path,
        targetRelativePath: path.join(
          "src",
          "assets",
          "images",
          "sections",
          "ausstattung-komfort",
          "sectionLayout",
          "value",
          "items",
          `${imageIndex}.${thumbOutput.format}`,
        ),
        generatedFiles: input.generatedFiles,
      }),
    );
  }

  return { heroRefs, galleryRefs, thumbRefs };
}

export function revenueSchemaFillService() {
  const repoRoot = path.resolve(process.cwd());

  return {
    async processDirectory(input: RunRevenueSchemaFill): Promise<RevenueSchemaFillResult> {
      const manifestAbsolutePath = path.resolve(repoRoot, input.manifestPath);
      const contentDraftAbsolutePath = path.resolve(repoRoot, input.contentDraftPath);
      assertInsideRepoRoot(repoRoot, manifestAbsolutePath, "manifestPath");
      assertInsideRepoRoot(repoRoot, contentDraftAbsolutePath, "contentDraftPath");

      const manifestRaw = await readJsonFile(manifestAbsolutePath, "manifestPath");
      const contentDraftRaw = await readJsonFile(contentDraftAbsolutePath, "contentDraftPath");
      const manifest = revenueImagePipelineResultSchema.parse(manifestRaw);
      const contentDraft = revenueContentDraftSchema.parse(contentDraftRaw);

      const processedDirAbsolute = path.dirname(contentDraftAbsolutePath);
      if (path.dirname(manifestAbsolutePath) !== processedDirAbsolute) {
        throw badRequest("manifestPath and contentDraftPath must live in the same processed directory");
      }

      const outputRootAbsolute = path.join(processedDirAbsolute, SITE_OUTPUT_DIRNAME);
      await fs.rm(outputRootAbsolute, { recursive: true, force: true });
      await fs.mkdir(outputRootAbsolute, { recursive: true });

      const templateRepoAbsolute = path.resolve(input.templateRepoPath);
      const templateDefaults = await readTemplateDefaults(templateRepoAbsolute);
      const generatedFiles: RevenueSchemaFillGeneratedFile[] = [];
      const placeholders: PlaceholderCounter = { count: 0 };
      const year = new Date().getUTCFullYear();

      const businessName = withPlaceholder(contentDraft.name, "[Name der Ferienwohnung]", placeholders);
      const tagline = withPlaceholder(contentDraft.tagline, "[Kurzer Slogan der Unterkunft]", placeholders);
      const description = withPlaceholder(
        contentDraft.description,
        "[Kurze Beschreibung der Unterkunft und ihres besonderen Charakters]",
        placeholders,
      );
      const ownerName = withPlaceholder(contentDraft.contact?.name, "[Name Gastgeber:in]", placeholders);
      const contactEmail = withPlaceholder(contentDraft.contact?.email, "[E-Mail-Adresse]", placeholders);
      const contactPhone = withPlaceholder(contentDraft.contact?.phone, "[Telefonnummer]", placeholders);
      const websiteUrl = asTrimmedString(contentDraft.contact?.website);
      const address = combineAddressLines(contentDraft, placeholders);
      const locationLabel =
        uniqueStrings([contentDraft.location?.city, contentDraft.location?.region, contentDraft.location?.country])[0] ??
        withPlaceholder(null, "[Ort]", placeholders);
      const pricingText = withPlaceholder(contentDraft.pricing?.priceText, "[Preis auf Anfrage]", placeholders);
      const pricingPeriod = withPlaceholder(contentDraft.pricing?.period, "[pro Nacht]", placeholders);
      const pricingNotes = withPlaceholder(
        contentDraft.pricing?.notes,
        "[Weitere Preisdetails nachtragen]",
        placeholders,
      );
      const highlightLabels = uniqueStrings([
        ...(contentDraft.highlights ?? []),
        ...(contentDraft.amenities ?? []),
      ]);
      const resolvedHighlights =
        highlightLabels.length > 0
          ? highlightLabels
          : [
              withPlaceholder(null, "[Ausstattungspunkt 1]", placeholders),
              withPlaceholder(null, "[Ausstattungspunkt 2]", placeholders),
              withPlaceholder(null, "[Ausstattungspunkt 3]", placeholders),
            ];

      const assetRefs = await buildAssetReferences({
        repoRoot,
        outputRootAbsolute,
        manifest,
        generatedFiles,
      });

      const themeDefaults = isRecord(templateDefaults.siteDefaults.theme) ? templateDefaults.siteDefaults.theme : {};
      const siteProfile = {
        vertical:
          asTrimmedString(templateDefaults.profileDefaults.vertical) === "verein" ||
          asTrimmedString(templateDefaults.profileDefaults.vertical) === "other"
            ? asTrimmedString(templateDefaults.profileDefaults.vertical)
            : "ferienwohnung",
        profileVersion: asTrimmedString(templateDefaults.profileDefaults.profileVersion) ?? "V0.1",
      };

      const siteSettings = {
        identity: {
          siteTitle: businessName,
          siteSubtitle: tagline,
          businessName,
          ownerName,
          taxId: "[Steuer-ID oder USt-IdNr.]",
          vatId: "[USt-IdNr. falls vorhanden]",
          registrationCourt: "[Registrierungsgericht falls vorhanden]",
          registrationNumber: "[Registernummer falls vorhanden]",
        },
        contact: {
          email: contactEmail,
          phone: contactPhone,
          address,
          whatsappLink: contactPhone,
          openingHours: "[Kontaktzeiten nachtragen]",
        },
        seo: { description },
        theme: {
          themeHue: typeof themeDefaults.themeHue === "number" ? themeDefaults.themeHue : 333,
          defaultTheme:
            asTrimmedString(themeDefaults.defaultTheme) === "dark" ||
            asTrimmedString(themeDefaults.defaultTheme) === "system"
              ? asTrimmedString(themeDefaults.defaultTheme)
              : "light",
        },
        footer: {
          copyrightText: `Copyright ${year} ${businessName}`,
          footerMessage: `[Kurzer Footer-Hinweis fuer ${businessName}]`,
        },
        social: websiteUrl ? [{ platform: "website", url: websiteUrl }] : [],
        banner: {
          title: businessName,
          subtitle: description,
          primaryCtaLabel: "Verfuegbarkeit anfragen",
          primaryCtaLink: "#buchungsanfrage",
          secondaryCtaLabel: "Mehr erfahren",
          secondaryCtaLink: "#einblicke-in-die-unterkunft",
          quickStats: [
            { discriminant: "persons", value: { text: "[Personenzahl nachtragen]" } },
            { discriminant: "location", value: { text: locationLabel } },
            { discriminant: "price", value: { text: pricingText } },
          ],
          imagesDesktop: assetRefs.heroRefs,
          imagesMobile: assetRefs.heroRefs,
        },
      };

      const highlightItems = resolvedHighlights.map((label, index) => ({
        icon: iconForHighlight(label),
        image: assetRefs.thumbRefs[index] ?? undefined,
        label,
      }));

      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.siteSettings,
        content: `${JSON.stringify(siteSettings, null, 2)}\n`,
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.siteProfile,
        content: `${JSON.stringify(siteProfile, null, 2)}\n`,
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.impressum,
        content: buildGenericImpressum({ ownerName, address, email: contactEmail, phone: contactPhone }),
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.datenschutz,
        content: buildGenericDatenschutz({ ownerName, address, email: contactEmail }),
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.homePage,
        content: buildMarkdownDocument({ title: "Home", heroHeadline: businessName }, description),
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.showcaseSection,
        content: buildMarkdownDocument(
          {
            slug: "einblicke-in-die-unterkunft",
            showInNavbar: true,
            navbarTitle: "Einblicke",
            navbarIcon: "material-symbols:bed",
            sortOrder: 10,
            sectionLayout: {
              discriminant: "showcase",
              value: {
                title: `Einblicke in ${businessName}`,
                images: assetRefs.galleryRefs,
                ctaLabel: "Jetzt anfragen",
                ctaHref: "#buchungsanfrage",
              },
            },
            isDraft: false,
          },
          description,
        ),
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.highlightsSection,
        content: buildMarkdownDocument(
          {
            slug: "ausstattung-komfort",
            showInNavbar: true,
            navbarTitle: "Ausstattung",
            navbarIcon: "material-symbols:check-circle",
            sortOrder: 20,
            sectionLayout: {
              discriminant: "highlights",
              value: { title: "Ausstattung und Komfort", items: highlightItems },
            },
            isDraft: false,
          },
          "Hier werden die wichtigsten Merkmale und Ausstattungsdetails der Unterkunft sichtbar gemacht.",
        ),
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.pricingSection,
        content: buildMarkdownDocument(
          {
            slug: "preise",
            showInNavbar: true,
            navbarTitle: "Preise",
            navbarIcon: "material-symbols:euro-symbol",
            sortOrder: 30,
            sectionLayout: {
              discriminant: "pricing",
              value: {
                title: "Preise und Konditionen",
                pricingList: [{ season: "Standard", period: pricingPeriod, price: pricingText, minStay: "[Mindestaufenthalt nachtragen]" }],
                extraCosts: [{ label: "Hinweise", value: pricingNotes }],
              },
            },
            isDraft: false,
          },
          "Alle Preisangaben sollten vor der Veroeffentlichung final geprueft und bei Bedarf ergaenzt werden.",
        ),
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.poiSection,
        content: buildMarkdownDocument(
          {
            slug: "umgebung",
            showInNavbar: true,
            navbarTitle: "Umgebung",
            navbarIcon: "material-symbols:map",
            sortOrder: 50,
            sectionLayout: {
              discriminant: "poi",
              value: {
                title: `Rund um ${locationLabel}`,
                pois: [
                  { title: "[Ausflugsziel 1]", distance: "[Entfernung]", description: `Empfehlung fuer Gaeste in ${locationLabel} nachtragen.` },
                  { title: "[Ausflugsziel 2]", distance: "[Entfernung]", description: `Weiteren Tipp fuer Aktivitaeten rund um ${locationLabel} nachtragen.` },
                  { title: "[Ausflugsziel 3]", distance: "[Entfernung]", description: `Noch einen lokalen Favoriten fuer ${locationLabel} ergaenzen.` },
                ],
              },
            },
            isDraft: false,
          },
          "Die Umgebung kann spaeter mit echten Empfehlungen, Entfernungen und Links angereichert werden.",
        ),
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.locationSection,
        content: buildMarkdownDocument(
          {
            slug: "anreise",
            showInNavbar: true,
            navbarTitle: "Anreise",
            navbarIcon: "material-symbols:map",
            sortOrder: 70,
            sectionLayout: {
              discriminant: "location",
              value: { title: `So finden Sie ${businessName}`, mapAddress: address.replace(/\n/g, ", ") },
            },
            isDraft: false,
          },
          `Adresse fuer die Anreise:\n\n${address}\n\nErgaenze hier spaeter konkrete Hinweise fuer Auto, Bahn oder Check-in.`,
        ),
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.faqSection,
        content: buildMarkdownDocument(
          {
            slug: "haeufige-fragen",
            showInNavbar: true,
            navbarTitle: "FAQ",
            navbarIcon: "material-symbols:help",
            sortOrder: 60,
            sectionLayout: {
              discriminant: "faq",
              value: {
                title: "Haeufige Fragen",
                questions: [
                  { question: "[Wann ist Check-in und Check-out?]", answer: "[Antwort zu Anreise- und Abreisezeiten nachtragen.]" },
                  { question: "[Welche Ausstattung ist besonders wichtig?]", answer: "[Antwort zu Ausstattung oder Services nachtragen.]" },
                  { question: "[Wie laeuft die Kontaktaufnahme ab?]", answer: "[Antwort zu Anfrageprozess und Rueckmeldung nachtragen.]" },
                ],
              },
            },
            isDraft: false,
          },
          "Diese FAQ-Struktur ist vorbereitet und kann spaeter mit echten Antworten ersetzt werden.",
        ),
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.testimonialsSection,
        content: buildMarkdownDocument(
          {
            slug: "bewertungen",
            showInNavbar: true,
            navbarTitle: "Bewertungen",
            navbarIcon: "material-symbols:star",
            sortOrder: 40,
            sectionLayout: {
              discriminant: "testimonials",
              value: {
                title: "Rueckmeldungen von Gaesten",
                testimonials: [{ quote: "[Hier kann spaeter eine echte Gaestestimme stehen.]", author: "[Name Gast]", context: "[Quelle der Bewertung]", rating: 5 }],
              },
            },
            isDraft: false,
          },
          "Sobald echte Bewertungen vorliegen, koennen sie hier strukturiert eingepflegt werden.",
        ),
        generatedFiles,
      });
      await writeOutputTextFile({
        repoRoot,
        outputRootAbsolute,
        relativePath: CONTENT_FILES.contactSection,
        content: buildMarkdownDocument(
          {
            slug: "buchungsanfrage",
            showInNavbar: true,
            navbarTitle: "Kontakt",
            navbarIcon: "material-symbols:call",
            sortOrder: 100,
            sectionLayout: {
              discriminant: "contact-form",
              value: { title: "Kontakt und Anfrage", contactEmail, contactPhone, submitLabel: "Jetzt Nachricht senden" },
            },
            isDraft: false,
          },
          `Nutzen Sie das Formular oder schreiben Sie direkt an ${contactEmail}. Telefonisch erreichbar unter ${contactPhone}.`,
        ),
        generatedFiles,
      });

      const result: RevenueSchemaFillResult = {
        manifestPath: manifest.manifestPath,
        contentDraftPath: contentDraft.outputPath,
        outputDir: toRepoRelativePath(repoRoot, outputRootAbsolute),
        templateRepoPath: templateRepoAbsolute,
        assetCount: generatedFiles.filter((file) => file.kind === "asset").length,
        placeholderCount: placeholders.count,
        generatedAt: new Date().toISOString(),
        generatedFiles,
      };

      logger.info(
        {
          event: "revenue_schema_fill_completed",
          manifestPath: result.manifestPath,
          contentDraftPath: result.contentDraftPath,
          outputDir: result.outputDir,
          assetCount: result.assetCount,
          placeholderCount: result.placeholderCount,
        },
        "Revenue schema fill completed",
      );

      return result;
    },
  };
}
