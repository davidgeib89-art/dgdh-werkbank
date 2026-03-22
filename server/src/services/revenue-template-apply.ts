import path from "node:path";
import { promises as fs } from "node:fs";
import type {
  RevenueTemplateApplyResult,
  RunRevenueTemplateApply,
} from "@paperclipai/shared";
import { badRequest } from "../errors.js";
import { logger } from "../middleware/logger.js";

const TEMPLATE_REQUIRED_FILES = [
  "keystatic.config.ts",
  "src/content.config.ts",
  "src/content/settings/site.json",
  "src/content/settings/profile.json",
] as const;

const MANAGED_ROOTS = [
  "src/content/settings",
  "src/content/pages/startseite",
  "src/content/sections",
  "src/assets/images/banner/generated",
  "src/assets/images/sections/ausstattung-komfort/sectionLayout/value/items",
  "src/assets/images/sections/einblicke-in-die-unterkunft/sectionLayout/value/images",
] as const;

type SyncStats = {
  appliedPaths: string[];
  deletedPaths: string[];
};

function toSlashPath(value: string) {
  return value.split(path.sep).join("/");
}

function toRelativePath(root: string, absolutePath: string) {
  const relative = path.relative(root, absolutePath);
  return relative === "" ? "." : toSlashPath(relative);
}

function assertInsideRepoRoot(repoRoot: string, absolutePath: string, fieldName: string) {
  const relative = path.relative(repoRoot, absolutePath);
  if (relative === "") return;
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw badRequest(`${fieldName} must stay inside the repository root`);
  }
}

async function statSafe(filePath: string) {
  return fs.stat(filePath).catch(() => null);
}

async function ensureTemplateRepo(templateRepoAbsolute: string) {
  const templateStats = await statSafe(templateRepoAbsolute);
  if (!templateStats?.isDirectory()) {
    throw badRequest("templateRepoPath must point to an existing template repository");
  }

  for (const relativePath of TEMPLATE_REQUIRED_FILES) {
    const requiredFile = path.join(templateRepoAbsolute, relativePath);
    const exists = await statSafe(requiredFile);
    if (!exists?.isFile()) {
      throw badRequest(`templateRepoPath is missing required template file: ${relativePath}`);
    }
  }
}

async function removePath(targetRoot: string, absolutePath: string, stats: SyncStats) {
  const exists = await statSafe(absolutePath);
  if (!exists) return;
  await fs.rm(absolutePath, { recursive: true, force: true });
  stats.deletedPaths.push(toRelativePath(targetRoot, absolutePath));
}

async function copyManagedFile(
  sourceAbsolute: string,
  targetAbsolute: string,
  targetRoot: string,
  stats: SyncStats,
) {
  await fs.mkdir(path.dirname(targetAbsolute), { recursive: true });
  await fs.copyFile(sourceAbsolute, targetAbsolute);
  stats.appliedPaths.push(toRelativePath(targetRoot, targetAbsolute));
}

async function syncDirectory(sourceDir: string, targetDir: string, targetRoot: string, stats: SyncStats) {
  const sourceStats = await statSafe(sourceDir);
  if (!sourceStats?.isDirectory()) {
    throw badRequest(`siteOutputDir is missing required managed directory: ${toSlashPath(sourceDir)}`);
  }

  const targetStats = await statSafe(targetDir);
  if (targetStats && !targetStats.isDirectory()) {
    await removePath(targetRoot, targetDir, stats);
  }

  await fs.mkdir(targetDir, { recursive: true });

  const sourceEntries = await fs.readdir(sourceDir, { withFileTypes: true });
  const sourceNames = new Set(sourceEntries.map((entry) => entry.name));
  const targetEntries = await fs.readdir(targetDir, { withFileTypes: true }).catch(() => []);

  for (const targetEntry of targetEntries) {
    if (sourceNames.has(targetEntry.name)) continue;
    await removePath(targetRoot, path.join(targetDir, targetEntry.name), stats);
  }

  for (const sourceEntry of sourceEntries) {
    const sourceAbsolute = path.join(sourceDir, sourceEntry.name);
    const targetAbsolute = path.join(targetDir, sourceEntry.name);

    if (sourceEntry.isDirectory()) {
      await syncDirectory(sourceAbsolute, targetAbsolute, targetRoot, stats);
      continue;
    }

    if (!sourceEntry.isFile()) continue;

    const targetEntryStats = await statSafe(targetAbsolute);
    if (targetEntryStats?.isDirectory()) {
      await removePath(targetRoot, targetAbsolute, stats);
    }
    await copyManagedFile(sourceAbsolute, targetAbsolute, targetRoot, stats);
  }
}

async function syncManagedPath(sourceRoot: string, targetRoot: string, relativePath: string, stats: SyncStats) {
  const sourceAbsolute = path.join(sourceRoot, relativePath);
  const targetAbsolute = path.join(targetRoot, relativePath);
  const sourceStats = await statSafe(sourceAbsolute);

  if (!sourceStats) {
    throw badRequest(`siteOutputDir is missing required managed path: ${relativePath}`);
  }

  if (sourceStats.isDirectory()) {
    await syncDirectory(sourceAbsolute, targetAbsolute, targetRoot, stats);
    return;
  }

  if (!sourceStats.isFile()) {
    throw badRequest(`siteOutputDir contains unsupported managed path type: ${relativePath}`);
  }

  const targetStats = await statSafe(targetAbsolute);
  if (targetStats?.isDirectory()) {
    await removePath(targetRoot, targetAbsolute, stats);
  }
  await copyManagedFile(sourceAbsolute, targetAbsolute, targetRoot, stats);
}

export function revenueTemplateApplyService() {
  const repoRoot = path.resolve(process.cwd());

  return {
    async processDirectory(input: RunRevenueTemplateApply): Promise<RevenueTemplateApplyResult> {
      const siteOutputAbsolute = path.resolve(repoRoot, input.siteOutputDir);
      assertInsideRepoRoot(repoRoot, siteOutputAbsolute, "siteOutputDir");

      const sourceStats = await statSafe(siteOutputAbsolute);
      if (!sourceStats?.isDirectory()) {
        throw badRequest("siteOutputDir must point to an existing site-output directory");
      }

      const templateRepoAbsolute = path.resolve(input.templateRepoPath);
      await ensureTemplateRepo(templateRepoAbsolute);

      const stats: SyncStats = {
        appliedPaths: [],
        deletedPaths: [],
      };

      for (const relativePath of MANAGED_ROOTS) {
        await syncManagedPath(siteOutputAbsolute, templateRepoAbsolute, relativePath, stats);
      }

      const result: RevenueTemplateApplyResult = {
        siteOutputDir: toRelativePath(repoRoot, siteOutputAbsolute),
        templateRepoPath: templateRepoAbsolute,
        managedRoots: [...MANAGED_ROOTS],
        appliedCount: stats.appliedPaths.length,
        deletedCount: stats.deletedPaths.length,
        generatedAt: new Date().toISOString(),
        appliedPaths: stats.appliedPaths.sort(),
        deletedPaths: stats.deletedPaths.sort(),
      };

      logger.info(
        {
          event: "revenue_template_apply_completed",
          siteOutputDir: result.siteOutputDir,
          templateRepoPath: result.templateRepoPath,
          appliedCount: result.appliedCount,
          deletedCount: result.deletedCount,
        },
        "Revenue template apply completed",
      );

      return result;
    },
  };
}
