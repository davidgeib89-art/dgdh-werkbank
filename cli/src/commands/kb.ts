import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { promises as fs } from "node:fs";
import * as path from "node:path";

const KB_ROOT = "company-hq/kb";
const KB_RAW = path.join(KB_ROOT, "raw");
const KB_NORMALIZED = path.join(KB_ROOT, "normalized");
const KB_WIKI = path.join(KB_ROOT, "wiki");
const KB_OUTPUTS = path.join(KB_ROOT, "outputs");

function stringifyFrontmatter(frontmatter: Record<string, unknown>): string {
  return Object.entries(frontmatter)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
}

function parseFrontmatterBlock(rawFrontmatter: string): Record<string, unknown> {
  return Object.fromEntries(
    rawFrontmatter
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) {
          return [line, ""];
        }

        const key = line.slice(0, separatorIndex).trim();
        const rawValue = line.slice(separatorIndex + 1).trim();

        try {
          return [key, JSON.parse(rawValue)];
        } catch {
          return [key, rawValue.replace(/^\"(.*)\"$/, "$1")];
        }
      }),
  );
}

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
  content += stringifyFrontmatter(frontmatter);
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
 * Check if an error is a permission-related error
 */
function isPermissionError(err: unknown): boolean {
  if (err instanceof Error && 'code' in err) {
    return err.code === 'EACCES' || err.code === 'EPERM';
  }
  return false;
}

/**
 * Check if an error is a file not found error
 */
function isNotFoundError(err: unknown): boolean {
  if (err instanceof Error && 'code' in err) {
    return err.code === 'ENOENT';
  }
  return false;
}

/**
 * kb:compile command - compile normalized data into wiki pages
 */
export async function compileCommand(): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:compile ")));

  // Find repo root and set up paths
  const repoRoot = await findRepoRoot();
  const normalizedDir = path.join(repoRoot, KB_NORMALIZED);
  const wikiDir = path.join(repoRoot, KB_WIKI);

  // Check if normalized directory exists
  try {
    const normalizedStats = await fs.stat(normalizedDir);
    if (!normalizedStats.isDirectory()) {
      p.log.error(pc.red(`Normalized path exists but is not a directory: ${normalizedDir}`));
      p.outro(pc.red("Compile failed: invalid normalized directory"));
      process.exit(1);
    }
  } catch (err) {
    if (isPermissionError(err)) {
      p.log.error(pc.red(`Permission denied accessing normalized directory: ${normalizedDir}`));
      p.log.message(pc.dim("Check directory permissions and try again."));
      p.outro(pc.red("Compile failed: permission error"));
      process.exit(1);
    }
    if (isNotFoundError(err)) {
      p.log.error(pc.red(`Normalized directory not found: ${normalizedDir}`));
      p.log.message(pc.dim("Run 'kb:normalize' first to create normalized data."));
      p.outro(pc.red("Compile failed: no normalized data"));
      process.exit(1);
    }
    const errorMessage = err instanceof Error ? err.message : String(err);
    p.log.error(pc.red(`Cannot access normalized directory: ${errorMessage}`));
    p.outro(pc.red("Compile failed: directory access error"));
    process.exit(1);
  }

  // Create wiki directory
  try {
    await fs.mkdir(wikiDir, { recursive: true });
  } catch (err) {
    if (isPermissionError(err)) {
      p.log.error(pc.red(`Permission denied creating wiki directory: ${wikiDir}`));
      p.outro(pc.red("Compile failed: permission error"));
      process.exit(1);
    }
    const errorMessage = err instanceof Error ? err.message : String(err);
    p.log.error(pc.red(`Failed to create wiki directory: ${errorMessage}`));
    p.outro(pc.red("Compile failed: directory creation error"));
    process.exit(1);
  }
  p.log.message(pc.dim(`Wiki directory: ${wikiDir}`));

  // Find all markdown files in normalized/
  let files: fs.Dirent[];
  try {
    files = await fs.readdir(normalizedDir, { withFileTypes: true });
  } catch (err) {
    if (isPermissionError(err)) {
      p.log.error(pc.red(`Permission denied reading normalized directory: ${normalizedDir}`));
      p.outro(pc.red("Compile failed: permission error"));
      process.exit(1);
    }
    const errorMessage = err instanceof Error ? err.message : String(err);
    p.log.error(pc.red(`Failed to read normalized directory: ${errorMessage}`));
    p.outro(pc.red("Compile failed: directory read error"));
    process.exit(1);
  }

  const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith(".md") && f.name !== ".gitkeep");

  // Handle empty normalized directory gracefully
  if (mdFiles.length === 0) {
    p.log.warn(pc.yellow("No normalized markdown files found in the normalized directory."));
    p.log.message(pc.dim("The normalized directory is empty. This can happen when:"));
    p.log.message(pc.dim("  - No raw data has been ingested yet (run 'kb:ingest' first)"));
    p.log.message(pc.dim("  - Raw data exists but hasn't been normalized (run 'kb:normalize')"));
    p.log.message(pc.dim("  - All normalized files were previously deleted or moved"));
    p.outro(pc.yellow("Compile completed with no output - normalized/ is empty"));
    return;
  }

  p.log.message(pc.dim(`Found ${mdFiles.length} normalized file(s) to compile`));

  const compiledPages: Array<{
    title: string;
    filename: string;
    summary: string;
    sourceFile: string;
    uuid: string;
    messageCount: number;
    startDate?: string;
    endDate?: string;
  }> = [];

  let totalCompiled = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  for (const file of mdFiles) {
    const sourcePath = path.join(normalizedDir, file.name);

    // Check file is readable before processing
    try {
      await fs.access(sourcePath, fs.constants.R_OK);
    } catch (err) {
      if (isPermissionError(err)) {
        p.log.warn(pc.yellow(`  ⚠ Skipping ${file.name}: permission denied (no read access)`));
        totalSkipped++;
        continue;
      }
      const errorMessage = err instanceof Error ? err.message : String(err);
      p.log.warn(pc.yellow(`  ⚠ Skipping ${file.name}: cannot access file (${errorMessage})`));
      totalSkipped++;
      continue;
    }

    try {
      let content: string;
      try {
        content = await fs.readFile(sourcePath, "utf-8");
      } catch (err) {
        if (isPermissionError(err)) {
          p.log.warn(pc.yellow(`  ⚠ Skipping ${file.name}: permission denied while reading`));
          totalSkipped++;
          continue;
        }
        throw err;
      }

      // Check for empty files
      if (!content || content.trim().length === 0) {
        p.log.warn(pc.yellow(`  ⚠ Skipping ${file.name}: file is empty`));
        totalSkipped++;
        continue;
      }

      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
      if (!frontmatterMatch) {
        p.log.warn(pc.yellow(`  ⚠ Skipping ${file.name}: no valid frontmatter found (file may be corrupted)`));
        totalSkipped++;
        continue;
      }

      // Try to parse frontmatter with better error handling
      let frontmatter: Record<string, unknown>;
      try {
        frontmatter = parseFrontmatterBlock(frontmatterMatch[1]);
      } catch (parseErr) {
        const yamlError = parseErr instanceof Error ? parseErr.message : String(parseErr);
        p.log.warn(pc.yellow(`  ⚠ Skipping ${file.name}: corrupted frontmatter (${yamlError})`));
        totalSkipped++;
        continue;
      }

      // Validate required fields
      if (!frontmatter.conversation_uuid) {
        p.log.warn(pc.yellow(`  ⚠ Skipping ${file.name}: missing required field 'conversation_uuid'`));
        totalSkipped++;
        continue;
      }

      // Extract required fields
      const title = String(frontmatter.title || "Untitled");
      const uuid = String(frontmatter.conversation_uuid);
      const messageCount = Number(frontmatter.message_count || 0);
      const startDate = frontmatter.start_date ? String(frontmatter.start_date) : undefined;
      const endDate = frontmatter.end_date ? String(frontmatter.end_date) : undefined;
      const source = String(frontmatter.source || "unknown");

      // Generate summary from content (first 1-3 sentences from messages section)
      const summary = extractSummary(content);

      // Create wiki page
      const wikiPage = createWikiPage({
        title,
        uuid,
        messageCount,
        startDate,
        endDate,
        source,
        sourceFile: file.name,
        summary,
        normalizedContent: content,
      });

      // Write wiki page
      const wikiFilename = file.name.replace(/\.md$/, "-wiki.md");
      const wikiPath = path.join(wikiDir, wikiFilename);
      
      try {
        await fs.writeFile(wikiPath, wikiPage, "utf-8");
      } catch (err) {
        if (isPermissionError(err)) {
          p.log.warn(pc.yellow(`  ⚠ Failed to write ${wikiFilename}: permission denied`));
          totalSkipped++;
          continue;
        }
        throw err;
      }

      compiledPages.push({
        title,
        filename: wikiFilename,
        summary,
        sourceFile: file.name,
        uuid,
        messageCount,
        startDate,
        endDate,
      });

      totalCompiled++;
      p.log.message(pc.dim(`  ✓ ${wikiFilename}`));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      p.log.error(pc.red(`  ✗ Failed to compile ${file.name}: ${errorMessage}`));
      totalErrors++;
    }
  }

  // Create index.md only if we have compiled pages
  if (compiledPages.length > 0) {
    try {
      await createWikiIndex(wikiDir, compiledPages);
      p.log.message(pc.dim(`  ✓ index.md`));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      p.log.error(pc.red(`  ✗ Failed to create index.md: ${errorMessage}`));
      totalErrors++;
    }
  } else {
    p.log.warn(pc.yellow("  ⚠ No pages were compiled, skipping index.md creation"));
  }

  // Summary message
  if (totalCompiled === 0 && totalErrors === 0 && totalSkipped > 0) {
    p.outro(pc.yellow(`Compile completed: ${totalSkipped} file(s) skipped (all files had issues)`));
  } else if (totalCompiled === 0 && totalErrors === 0 && totalSkipped === 0) {
    // This shouldn't happen if we handled the empty directory case above, but just in case
    p.outro(pc.yellow(`Compile completed: no output`));
  } else if (totalErrors > 0 || totalSkipped > 0) {
    p.outro(pc.yellow(`Compile complete: ${totalCompiled} page(s) compiled, ${totalSkipped} skipped, ${totalErrors} error(s)`));
  } else {
    p.outro(pc.green(`Compile complete: ${totalCompiled} page(s) compiled`));
  }
}

/**
 * Extract a summary from normalized content (1-3 sentences)
 */
function extractSummary(content: string): string {
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, "");

  // Try to find the first substantial user message
  const messageMatch = withoutFrontmatter.match(/\*\*User\*\*[\s\S]*?\n\n([^\n]+(?:\n[^\n]+){0,2})/);
  if (messageMatch) {
    const firstMessage = messageMatch[1].trim().substring(0, 300);
    // Clean up the message
    const cleaned = firstMessage
      .replace(/\*\*/g, "")
      .replace(/\*\//g, "")
      .replace(/```[\s\S]*?```/g, "[code block]")
      .replace(/`([^`]+)`/g, "$1")
      .trim();

    if (cleaned.length > 20) {
      // Return first 1-2 sentences (up to ~200 chars)
      const sentences = cleaned.split(/(?<=[.!?])\s+/);
      const summary = sentences.slice(0, 2).join(" ").substring(0, 200);
      return summary.endsWith(".") ? summary : summary + "...";
    }
  }

  // Fallback: extract from title and message count
  const titleMatch = withoutFrontmatter.match(/^# (.+)$/m);
  if (titleMatch) {
    return `Conversation about "${titleMatch[1]}". See messages section for details.`;
  }

  return "No summary available. See the source file for full content.";
}

/**
 * Create a wiki page from normalized data
 */
function createWikiPage(params: {
  title: string;
  uuid: string;
  messageCount: number;
  startDate?: string;
  endDate?: string;
  source: string;
  sourceFile: string;
  summary: string;
  normalizedContent: string;
}): string {
  const { title, uuid, messageCount, startDate, endDate, source, sourceFile, summary } = params;

  const compiledAt = new Date().toISOString();

  // Build frontmatter
  const frontmatter: Record<string, unknown> = {
    title,
    compiled_at: compiledAt,
    source_uuid: uuid,
    source_file: sourceFile,
    message_count: messageCount,
    source,
  };

  if (startDate) {
    frontmatter.start_date = startDate;
  }
  if (endDate) {
    frontmatter.end_date = endDate;
  }

  // Build content
  let content = "---\n";
  content += stringifyFrontmatter(frontmatter);
  content += "\n---\n\n";

  // Title
  content += `# ${title}\n\n`;

  // Summary section
  content += `## Summary\n\n`;
  content += `${summary}\n\n`;

  // Metadata
  content += `## Metadata\n\n`;
  content += `- **UUID:** \`${uuid}\`\n`;
  content += `- **Messages:** ${messageCount}\n`;
  if (startDate && endDate) {
    content += `- **Date Range:** ${formatDate(startDate)} - ${formatDate(endDate)}\n`;
  }
  content += `- **Compiled:** ${formatTimestamp(compiledAt)}\n\n`;

  // Source reference
  content += `## Source\n\n`;
  content += `Based on normalized file: \`${sourceFile}\`\n\n`;
  content += `> This wiki page was automatically compiled from the normalized conversation data.\n\n`;

  return content;
}

/**
 * Create wiki index.md listing all pages
 */
async function createWikiIndex(
  wikiDir: string,
  pages: Array<{
    title: string;
    filename: string;
    summary: string;
    sourceFile: string;
    uuid: string;
    messageCount: number;
    startDate?: string;
    endDate?: string;
  }>,
): Promise<void> {
  const compiledAt = new Date().toISOString();

  // Sort pages by title
  const sortedPages = [...pages].sort((a, b) => a.title.localeCompare(b.title));

  // Build content
  let content = "---\n";
  content += stringifyFrontmatter({
    title: "Knowledge Base Wiki",
    compiled_at: compiledAt,
    page_count: pages.length,
  });
  content += "\n---\n\n";

  content += `# Knowledge Base Wiki\n\n`;
  content += `Compiled on ${formatTimestamp(compiledAt)}\n\n`;
  content += `This wiki contains ${pages.length} compiled conversation pages from the knowledge base.\n\n`;

  content += `## Pages\n\n`;

  for (const page of sortedPages) {
    content += `### [${page.title}](./${page.filename})\n\n`;
    content += `${page.summary}\n\n`;
    content += `- **Messages:** ${page.messageCount}`;
    if (page.startDate && page.endDate) {
      content += ` | **Date Range:** ${formatDate(page.startDate)} - ${formatDate(page.endDate)}`;
    }
    content += `\n`;
    content += `- **Source:** \`${page.sourceFile}\`\n\n`;
  }

  // Write index
  const indexPath = path.join(wikiDir, "index.md");
  await fs.writeFile(indexPath, content, "utf-8");
}

/**
 * Wiki page data structure for search
 */
interface WikiPageData {
  filename: string;
  title: string;
  summary: string;
  sourceFile: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

/**
 * Search result with relevance score
 */
interface SearchResult {
  page: WikiPageData;
  score: number;
  matchingTerms: string[];
}

/**
 * Load all wiki pages from the wiki directory
 */
async function loadWikiPages(wikiDir: string): Promise<WikiPageData[]> {
  const pages: WikiPageData[] = [];

  try {
    const files = await fs.readdir(wikiDir, { withFileTypes: true });
    const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith(".md") && f.name !== "index.md" && f.name !== ".gitkeep");

    for (const file of mdFiles) {
      try {
        const filePath = path.join(wikiDir, file.name);
        const content = await fs.readFile(filePath, "utf-8");

        // Parse frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
        let frontmatter: Record<string, unknown> = {};
        let bodyContent = content;

        if (frontmatterMatch) {
          try {
            frontmatter = parseFrontmatterBlock(frontmatterMatch[1]);
            bodyContent = content.slice(frontmatterMatch[0].length);
          } catch {
            // Ignore YAML parse errors, use empty frontmatter
          }
        }

        // Extract summary from body if not in frontmatter
        let summary = String(frontmatter.summary || "");
        if (!summary) {
          const summaryMatch = bodyContent.match(/## Summary\n\n([\s\S]*?)(?=\n\n##|$)/);
          if (summaryMatch) {
            summary = summaryMatch[1].trim();
          }
        }

        pages.push({
          filename: file.name,
          title: String(frontmatter.title || file.name.replace("-wiki.md", "").replace(/-/g, " ")),
          summary,
          sourceFile: String(frontmatter.source_file || ""),
          content: bodyContent,
          frontmatter,
        });
      } catch (err) {
        // Skip files that can't be read
        p.log.warn(pc.yellow(`  ⚠ Could not read wiki file: ${file.name}`));
      }
    }
  } catch (err) {
    // Directory doesn't exist or can't be read
    throw new Error(`Cannot read wiki directory: ${err instanceof Error ? err.message : String(err)}`);
  }

  return pages;
}

/**
 * Tokenize a string into searchable terms
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .filter((t) => !["the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "she", "use", "her", "way", "many", "oil", "sit"].includes(t));
}

/**
 * Calculate relevance score between question and wiki page
 */
function calculateRelevance(question: string, page: WikiPageData): SearchResult {
  const questionTerms = tokenize(question);
  const searchableText = `${page.title} ${page.summary} ${page.content}`.toLowerCase();

  let score = 0;
  const matchingTerms: string[] = [];

  for (const term of questionTerms) {
    // Check title (highest weight)
    const titleMatches = (page.title.toLowerCase().match(new RegExp(term, "g")) || []).length;
    if (titleMatches > 0) {
      score += titleMatches * 10;
      if (!matchingTerms.includes(term)) matchingTerms.push(term);
    }

    // Check summary (high weight)
    const summaryMatches = (page.summary.toLowerCase().match(new RegExp(term, "g")) || []).length;
    if (summaryMatches > 0) {
      score += summaryMatches * 5;
      if (!matchingTerms.includes(term)) matchingTerms.push(term);
    }

    // Check full content (lower weight)
    const contentMatches = (searchableText.match(new RegExp(term, "g")) || []).length;
    if (contentMatches > 0) {
      score += contentMatches * 1;
      if (!matchingTerms.includes(term)) matchingTerms.push(term);
    }
  }

  // Boost score for multi-term matches
  if (matchingTerms.length > 1) {
    score *= 1 + (matchingTerms.length * 0.2);
  }

  return { page, score, matchingTerms };
}

/**
 * Find relevant wiki pages for a question
 */
function findRelevantPages(question: string, pages: WikiPageData[]): SearchResult[] {
  const results = pages.map((page) => calculateRelevance(question, page));

  // Filter and sort by score
  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Generate an answer based on relevant wiki pages
 */
function generateAnswer(question: string, results: SearchResult[]): { answer: string; sources: string[]; abstain: boolean } {
  if (results.length === 0) {
    return {
      answer: `I found no wiki content relevant to "${question}". The knowledge base does not contain information to answer this question.`,
      sources: [],
      abstain: true,
    };
  }

  // Take top results
  const topResults = results.slice(0, 3);
  const sources: string[] = [];

  // Build answer from summaries
  const parts: string[] = [];
  parts.push(`Based on the knowledge base, here's what I found:`);
  parts.push("");

  for (const result of topResults) {
    const page = result.page;
    parts.push(`**${page.title}**`);

    if (page.summary) {
      parts.push(page.summary.substring(0, 300) + (page.summary.length > 300 ? "..." : ""));
    }

    parts.push("");

    // Add source citation
    sources.push(`${page.title} (${page.filename})`);
  }

  const answer = parts.join("\n");
  return { answer, sources, abstain: false };
}

/**
 * Write answer to file in outputs directory
 */
async function writeAnswerToFile(
  outputsDir: string,
  question: string,
  answer: string,
  sources: string[],
): Promise<string> {
  const timestamp = new Date().toISOString();
  const safeQuestion = question
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 50);

  const filename = `${new Date().toISOString().split("T")[0]}-${safeQuestion}.md`;
  const filePath = path.join(outputsDir, filename);

  let content = "---\n";
  content += stringifyFrontmatter({
    question,
    timestamp,
    source_count: sources.length,
  });
  content += "\n---\n\n";

  content += `# Question: ${question}\n\n`;
  content += `**Asked:** ${formatTimestamp(timestamp)}\n\n`;

  content += `## Answer\n\n`;
  content += `${answer}\n\n`;

  if (sources.length > 0) {
    content += `## Sources\n\n`;
    for (const source of sources) {
      content += `- ${source}\n`;
    }
    content += "\n";
  } else {
    content += `## Sources\n\n*No sources available - question could not be answered from wiki content.*\n\n`;
  }

  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

/**
 * kb:ask command - answer questions using wiki content
 */
export async function askCommand(opts: {
  question: string;
  output?: boolean;
  outputFile?: string;
}): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:ask ")));

  // Find repo root and set up paths
  const repoRoot = await findRepoRoot();
  const wikiDir = path.join(repoRoot, KB_WIKI);
  const outputsDir = path.join(repoRoot, KB_OUTPUTS);

  // Check if wiki directory exists
  try {
    await fs.access(wikiDir);
  } catch {
    p.log.error(pc.red(`Wiki directory not found: ${wikiDir}`));
    p.log.message(pc.dim("Run 'kb:compile' first to create wiki pages."));
    p.outro(pc.red("Ask failed: no wiki data"));
    throw new Error("Wiki directory not found. Run kb:compile first.");
  }

  p.log.message(pc.dim(`Question: "${opts.question}"`));

  // Load wiki pages
  let pages: WikiPageData[];
  try {
    pages = await loadWikiPages(wikiDir);
    p.log.message(pc.dim(`Loaded ${pages.length} wiki page(s)`));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    p.log.error(pc.red(`Failed to load wiki pages: ${errorMessage}`));
    p.outro(pc.red("Ask failed: could not load wiki"));
    throw err;
  }

  // Check if we have any pages
  if (pages.length === 0) {
    p.log.warn(pc.yellow("No wiki pages found. The wiki directory is empty."));
    p.outro(pc.yellow("Ask completed: no wiki content available"));
    return;
  }

  // Find relevant pages
  const results = findRelevantPages(opts.question, pages);

  // Generate answer
  const { answer, sources, abstain } = generateAnswer(opts.question, results);

  // Display results
  p.log.message("");
  p.log.message(pc.bold("Question:"));
  p.log.message(opts.question);
  p.log.message("");

  if (abstain) {
    p.log.warn(pc.yellow(answer));
  } else {
    p.log.message(pc.bold("Answer:"));
    p.log.message(answer);
  }

  if (sources.length > 0) {
    p.log.message("");
    p.log.message(pc.bold("Sources:"));
    for (const source of sources) {
      p.log.message(`  • ${pc.cyan(source)}`);
    }
  }

  // Write to file if requested
  let outputPath: string | undefined;
  if (opts.output || opts.outputFile) {
    try {
      await fs.mkdir(outputsDir, { recursive: true });

      if (opts.outputFile) {
        // Use custom filename
        const customPath = path.join(outputsDir, opts.outputFile);
        // Create the content
        const timestamp = new Date().toISOString();
        let content = "---\n";
        content += stringifyFrontmatter({
          question: opts.question,
          timestamp,
          source_count: sources.length,
        });
        content += "\n---\n\n";
        content += `# Question: ${opts.question}\n\n`;
        content += `**Asked:** ${formatTimestamp(timestamp)}\n\n`;
        content += `## Answer\n\n${answer}\n\n`;
        if (sources.length > 0) {
          content += `## Sources\n\n`;
          for (const source of sources) {
            content += `- ${source}\n`;
          }
        } else {
          content += `## Sources\n\n*No sources available.*\n`;
        }
        await fs.writeFile(customPath, content, "utf-8");
        outputPath = customPath;
      } else {
        outputPath = await writeAnswerToFile(outputsDir, opts.question, answer, sources);
      }

      p.log.message("");
      p.log.success(pc.green(`Answer saved to: ${outputPath}`));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      p.log.error(pc.red(`Failed to write output file: ${errorMessage}`));
    }
  }

  if (abstain) {
    p.outro(pc.yellow("Ask completed: abstained (no relevant content found)"));
  } else {
    p.outro(pc.green(`Ask completed: answered using ${sources.length} source(s)`));
  }
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

  kb
    .command("ask")
    .description("Ask a question using the wiki knowledge base")
    .argument("<question>", "The question to ask")
    .option("-o, --output", "Save answer to a file in outputs/", false)
    .option("-f, --output-file <filename>", "Custom filename for output")
    .action(async (question: string, opts) => {
      await askCommand({ question, ...opts });
    });
}
