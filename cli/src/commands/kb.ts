import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import yaml from "yaml";

const KB_ROOT = "company-hq/kb";
const KB_RAW = path.join(KB_ROOT, "raw");
const KB_NORMALIZED = path.join(KB_ROOT, "normalized");
const KB_WIKI = path.join(KB_ROOT, "wiki");

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
 * Placeholder for kb:output (to be implemented)
 */
export async function outputCommand(opts: { question?: string }): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:output ")));
  p.log.warn(pc.yellow("kb:output is not yet implemented"));
  p.outro("Done");
}

/**
 * Claude conversation message structure
 */
interface ClaudeMessage {
  uuid: string;
  text?: string;
  content?: unknown[];
  sender: string;
  created_at?: string;
  updated_at?: string;
  attachments?: unknown[];
  files?: { file_name?: string }[];
}

/**
 * Claude conversation structure
 */
interface ClaudeConversation {
  uuid: string;
  name?: string;
  summary?: string;
  created_at?: string;
  updated_at?: string;
  account?: unknown;
  chat_messages?: ClaudeMessage[];
}

/**
 * Format ISO date to readable string
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Format ISO timestamp to readable string
 */
function formatTimestamp(isoDate: string | undefined): string {
  if (!isoDate) return "Unknown";
  try {
    const date = new Date(isoDate);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Normalize a single conversation into markdown format
 */
function normalizeConversation(
  conversation: ClaudeConversation,
  sourceName: string,
  importedAt: string,
): string {
  const messages = conversation.chat_messages || [];
  const messageCount = messages.length;

  // Extract date range
  let startDate: string | null = null;
  let endDate: string | null = null;

  if (messages.length > 0) {
    const dates = messages
      .map((m) => m.created_at)
      .filter((d): d is string => !!d)
      .sort();
    if (dates.length > 0) {
      startDate = dates[0];
      endDate = dates[dates.length - 1];
    }
  }

  // Build frontmatter
  const frontmatter: Record<string, unknown> = {
    source: sourceName,
    imported_at: importedAt,
    conversation_uuid: conversation.uuid,
    title: conversation.name || "Untitled",
    message_count: messageCount,
  };

  if (startDate) {
    frontmatter.start_date = startDate;
  }
  if (endDate) {
    frontmatter.end_date = endDate;
  }
  if (conversation.created_at) {
    frontmatter.created_at = conversation.created_at;
  }
  if (conversation.updated_at) {
    frontmatter.updated_at = conversation.updated_at;
  }

  // Build content
  let content = "---\n";
  content += yaml.stringify(frontmatter).trim();
  content += "\n---\n\n";

  // Add title
  content += `# ${conversation.name || "Untitled"}\n\n`;

  // Add metadata summary
  content += `**UUID:** \`${conversation.uuid}\`\n\n`;
  content += `**Messages:** ${messageCount}\n\n`;

  if (startDate && endDate) {
    content += `**Date Range:** ${formatDate(startDate)} - ${formatDate(endDate)}\n\n`;
  }

  if (conversation.summary) {
    content += `**Summary:** ${conversation.summary}\n\n`;
  }

  content += "---\n\n";

  // Add messages
  if (messages.length > 0) {
    content += "## Messages\n\n";

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const sender = msg.sender === "human" ? "**User**" : "**Assistant**";
      const timestamp = formatTimestamp(msg.created_at);

      content += `### Message ${i + 1}\n\n`;
      content += `${sender} · ${timestamp}\n\n`;

      if (msg.text) {
        content += `${msg.text}\n\n`;
      }

      // Add attachments info if present
      if (msg.attachments && msg.attachments.length > 0) {
        content += `*Attachments: ${msg.attachments.length} file(s)*\n\n`;
      }

      if (msg.files && msg.files.length > 0) {
        const fileNames = msg.files.map((f) => f.file_name).filter(Boolean);
        if (fileNames.length > 0) {
          content += `*Files: ${fileNames.join(", ")}*\n\n`;
        }
      }

      content += "\n";
    }
  } else {
    content += "*No messages in this conversation.*\n\n";
  }

  return content;
}

/**
 * Sanitize a string for use in a filename
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 50)
    .toLowerCase();
}

/**
 * kb:normalize command - normalize conversations from raw to normalized/
 */
export async function normalizeCommand(): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:normalize ")));

  // Find repo root and set up paths
  const repoRoot = await findRepoRoot();
  const rawDir = path.join(repoRoot, KB_RAW);
  const normalizedDir = path.join(repoRoot, KB_NORMALIZED);

  // Check if raw directory exists
  try {
    await fs.access(rawDir);
  } catch {
    p.log.error(pc.red(`Raw directory not found: ${rawDir}`));
    throw new Error(`Raw directory not found. Run kb:ingest first.`);
  }

  // Create normalized directory
  await fs.mkdir(normalizedDir, { recursive: true });
  p.log.message(pc.dim(`Normalized directory: ${normalizedDir}`));

  // Find all source directories in raw/
  const sourceDirs = await fs.readdir(rawDir, { withFileTypes: true });
  const validSourceDirs = sourceDirs.filter((d) => d.isDirectory());

  if (validSourceDirs.length === 0) {
    p.log.error(pc.red("No source directories found in raw/"));
    throw new Error("No source data to normalize. Run kb:ingest first.");
  }

  p.log.message(pc.dim(`Found ${validSourceDirs.length} source(s) to process`));

  let totalNormalized = 0;
  let totalErrors = 0;

  for (const sourceDir of validSourceDirs) {
    const sourceName = sourceDir.name;
    const sourcePath = path.join(rawDir, sourceName);

    p.log.message(pc.bold(`\nProcessing source: ${sourceName}`));

    // Read manifest to get import timestamp
    let importedAt = new Date().toISOString();
    try {
      const manifestPath = path.join(sourcePath, "manifest.json");
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent);
      importedAt = manifest.imported_at || importedAt;
    } catch {
      p.log.warn(pc.yellow(`  No manifest.json found, using current time`));
    }

    // Check for conversations.json
    const conversationsPath = path.join(sourcePath, "conversations.json");
    try {
      await fs.access(conversationsPath);
    } catch {
      p.log.warn(pc.yellow(`  No conversations.json found, skipping`));
      continue;
    }

    // Read and parse conversations
    let conversations: ClaudeConversation[];
    try {
      const content = await fs.readFile(conversationsPath, "utf-8");
      conversations = JSON.parse(content);
      if (!Array.isArray(conversations)) {
        throw new Error("conversations.json is not an array");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      p.log.error(pc.red(`  Failed to parse conversations.json: ${errorMessage}`));
      totalErrors++;
      continue;
    }

    p.log.message(pc.dim(`  Found ${conversations.length} conversation(s)`));

    // Normalize each conversation
    for (const conversation of conversations) {
      try {
        if (!conversation.uuid) {
          p.log.warn(pc.yellow(`  Skipping conversation without UUID`));
          continue;
        }

        const normalized = normalizeConversation(conversation, sourceName, importedAt);

        // Create filename from title and UUID
        const safeTitle = sanitizeFilename(conversation.name || "untitled");
        const filename = `${safeTitle}-${conversation.uuid.substring(0, 8)}.md`;
        const outputPath = path.join(normalizedDir, filename);

        await fs.writeFile(outputPath, normalized, "utf-8");
        totalNormalized++;
        p.log.message(pc.dim(`  ✓ ${filename}`));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        p.log.error(pc.red(`  ✗ Failed to normalize conversation ${conversation?.uuid}: ${errorMessage}`));
        totalErrors++;
      }
    }
  }

  p.outro(pc.green(`Normalization complete: ${totalNormalized} conversation(s) normalized, ${totalErrors} error(s)`));
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
