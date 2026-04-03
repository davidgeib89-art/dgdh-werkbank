import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { promises as fs } from "node:fs";
import * as path from "node:path";

const KB_ROOT = "company-hq/kb";
const KB_RAW = path.join(KB_ROOT, "raw");

/**
 * Find the repository root by looking for the company-hq directory
 */
async function findRepoRoot(): Promise<string> {
  let currentDir = process.cwd();

  // Check if we're already in the repo root
  try {
    await fs.access(path.join(currentDir, "company-hq"));
    return currentDir;
  } catch {
    // Not in root, try to find it by walking up
    while (currentDir !== path.dirname(currentDir)) {
      try {
        await fs.access(path.join(currentDir, "company-hq"));
        return currentDir;
      } catch {
        currentDir = path.dirname(currentDir);
      }
    }
  }

  // Default to current working directory if not found
  return process.cwd();
}

/**
 * Validate that a source path contains required Claude export files
 */
async function validateClaudeExport(sourcePath: string): Promise<{ valid: boolean; error?: string; files: string[] }> {
  try {
    const stats = await fs.stat(sourcePath);
    if (!stats.isDirectory()) {
      return { valid: false, error: `Source path is not a directory: ${sourcePath}`, files: [] };
    }

    const files = await fs.readdir(sourcePath);

    // Check for conversations.json (required)
    if (!files.includes("conversations.json")) {
      return {
        valid: false,
        error: `Missing required file: conversations.json. This doesn't appear to be a valid Claude export.`,
        files,
      };
    }

    return { valid: true, files };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Cannot read source path: ${errorMessage}`, files: [] };
  }
}

/**
 * Get the source name from path (last directory component)
 */
function getSourceName(sourcePath: string): string {
  const baseName = path.basename(sourcePath);
  // Sanitize for filesystem use
  return baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Copy a file and return its new path
 */
async function copyFile(src: string, dest: string): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

/**
 * Create metadata manifest for the ingestion
 */
async function createMetadataManifest(
  destDir: string,
  sourcePath: string,
  sourceName: string,
  files: string[],
): Promise<void> {
  const manifest = {
    source: "claude_export",
    source_name: sourceName,
    original_path: path.resolve(sourcePath),
    imported_at: new Date().toISOString(),
    files: files,
  };

  const manifestPath = path.join(destDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

/**
 * Check if we're running in an interactive terminal (TTY)
 */
function isInteractive(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

/**
 * kb:ingest command - ingest Claude export files into KB raw/
 */
export async function ingestCommand(opts: {
  source: string;
  force?: boolean;
}): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:ingest ")));

  // Resolve source path
  const sourcePath = path.resolve(opts.source);
  p.log.message(pc.dim(`Source path: ${sourcePath}`));

  // Validate source
  const validation = await validateClaudeExport(sourcePath);
  if (!validation.valid) {
    p.log.error(pc.red(`Invalid source: ${validation.error}`));
    throw new Error(`Ingest failed: ${validation.error}`);
  }

  p.log.success(pc.green(`Found ${validation.files.length} file(s) in source`));

  // Find repo root and set up destination
  const repoRoot = await findRepoRoot();
  const sourceName = getSourceName(sourcePath);
  const destDir = path.join(repoRoot, KB_RAW, sourceName);

  // Check if destination already exists
  let shouldProceed = true;
  try {
    await fs.access(destDir);
    p.log.warn(pc.yellow(`Destination already exists: ${destDir}`));
    
    if (opts.force) {
      p.log.message(pc.dim("Force flag set, overwriting existing files..."));
      shouldProceed = true;
    } else if (!isInteractive()) {
      p.log.message(pc.yellow("Running in non-interactive mode, skipping overwrite. Use --force to overwrite."));
      shouldProceed = false;
    } else {
      const shouldContinue = await p.confirm({
        message: "Destination already exists. Overwrite?",
        initialValue: false,
      });

      if (p.isCancel(shouldContinue) || !shouldContinue) {
        shouldProceed = false;
      }
    }
  } catch {
    // Destination doesn't exist, which is fine
    shouldProceed = true;
  }

  if (!shouldProceed) {
    p.outro(pc.yellow("Ingest cancelled"));
    return;
  }

  // Create destination directory
  await fs.mkdir(destDir, { recursive: true });
  p.log.message(pc.dim(`Created destination: ${destDir}`));

  // Copy JSON files
  let copiedCount = 0;
  for (const file of validation.files) {
    if (!file.endsWith(".json")) {
      p.log.message(pc.dim(`Skipping non-JSON file: ${file}`));
      continue;
    }

    const srcFile = path.join(sourcePath, file);
    const destFile = path.join(destDir, file);

    try {
      await copyFile(srcFile, destFile);
      copiedCount++;
      p.log.message(pc.dim(`  ✓ ${file}`));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      p.log.error(pc.red(`  ✗ ${file}: ${errorMessage}`));
    }
  }

  // Create metadata manifest
  await createMetadataManifest(destDir, sourcePath, sourceName, validation.files);
  p.log.message(pc.dim(`  ✓ manifest.json`));

  p.outro(pc.green(`Ingest complete: ${copiedCount} JSON file(s) copied to ${destDir}`));
}

/**
 * kb:help command - show KB commands help
 */
export async function helpCommand(): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb commands ")));

  p.log.message(pc.bold("Available commands:"));
  p.log.message(`  ${pc.cyan("kb:ingest")} --source <path>  Ingest Claude export files into KB raw/`);
  p.log.message(`  ${pc.cyan("kb:compile")}                 Compile normalized data into wiki pages`);
  p.log.message(`  ${pc.cyan("kb:normalize")}               Normalize conversations from raw to normalized/`);
  p.log.message(`  ${pc.cyan("kb:output")}                  Create output files in outputs/`);

  p.outro("Done");
}

/**
 * Placeholder for kb:compile (to be implemented)
 */
export async function compileCommand(): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:compile ")));
  p.log.warn(pc.yellow("kb:compile is not yet implemented"));
  p.outro("Done");
}

/**
 * Placeholder for kb:normalize (to be implemented)
 */
export async function normalizeCommand(): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:normalize ")));
  p.log.warn(pc.yellow("kb:normalize is not yet implemented"));
  p.outro("Done");
}

/**
 * Placeholder for kb:output (to be implemented)
 */
export async function outputCommand(opts: { question?: string }): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:output ")));
  p.log.warn(pc.yellow("kb:output is not yet implemented"));
  p.outro("Done");
}

/**
 * Register all KB commands with the CLI
 */
export function registerKbCommands(program: Command): void {
  const kb = program.command("kb").description("Knowledge base operations");

  kb
    .command("ingest")
    .description("Ingest Claude export files into KB raw/")
    .requiredOption("-s, --source <path>", "Path to Claude export directory")
    .option("-f, --force", "Overwrite existing destination without prompting", false)
    .action(async (opts) => {
      await ingestCommand(opts);
    });

  kb
    .command("compile")
    .description("Compile normalized data into wiki pages")
    .action(async () => {
      await compileCommand();
    });

  kb
    .command("normalize")
    .description("Normalize conversations from raw to normalized/")
    .action(async () => {
      await normalizeCommand();
    });

  kb
    .command("output")
    .description("Create output files in outputs/")
    .option("-q, --question <text>", "Question being answered")
    .action(async (opts) => {
      await outputCommand(opts);
    });
}
