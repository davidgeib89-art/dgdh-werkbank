import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { promises as fs } from "node:fs";
import * as path from "node:path";

const KB_ROOT = "company-hq/kb";
const KB_RAW = path.join(KB_ROOT, "raw");
const KB_NORMALIZED = path.join(KB_ROOT, "normalized");
const KB_WIKI = path.join(KB_ROOT, "wiki");

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
          return [key, rawValue.replace(/^"(.*)"$/, "$1")];
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
  content += stringifyFrontmatter(frontmatter).trim();
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
    await fs.access(normalizedDir);
  } catch {
    p.log.error(pc.red(`Normalized directory not found: ${normalizedDir}`));
    throw new Error(`Normalized directory not found. Run kb:normalize first.`);
  }

  // Create wiki directory
  await fs.mkdir(wikiDir, { recursive: true });
  p.log.message(pc.dim(`Wiki directory: ${wikiDir}`));

  // Find all markdown files in normalized/
  const files = await fs.readdir(normalizedDir, { withFileTypes: true });
  const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith(".md") && f.name !== ".gitkeep");

  if (mdFiles.length === 0) {
    p.log.error(pc.red("No normalized markdown files found"));
    throw new Error("No normalized data to compile. Run kb:normalize first.");
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

  for (const file of mdFiles) {
    const sourcePath = path.join(normalizedDir, file.name);

    try {
      const content = await fs.readFile(sourcePath, "utf-8");

      // Parse frontmatter - be flexible with line endings (CRLF or LF)
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!frontmatterMatch) {
        p.log.warn(pc.yellow(`  Skipping ${file.name}: no frontmatter found`));
        totalErrors++;
        continue;
      }

      const frontmatter = parseFrontmatterBlock(frontmatterMatch[1]);

      // Extract required fields
      const title = String(frontmatter.title || "Untitled");
      const uuid = String(frontmatter.conversation_uuid || "");
      const messageCount = Number(frontmatter.message_count || 0);
      const startDate = frontmatter.start_date ? String(frontmatter.start_date) : undefined;
      const endDate = frontmatter.end_date ? String(frontmatter.end_date) : undefined;
      const source = String(frontmatter.source || "unknown");

      if (!uuid) {
        p.log.warn(pc.yellow(`  Skipping ${file.name}: missing conversation_uuid`));
        totalErrors++;
        continue;
      }

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
      await fs.writeFile(wikiPath, wikiPage, "utf-8");

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

  // Create index.md
  if (compiledPages.length > 0) {
    await createWikiIndex(wikiDir, compiledPages);
    p.log.message(pc.dim(`  ✓ index.md`));
  }

  p.outro(pc.green(`Compile complete: ${totalCompiled} page(s) compiled, ${totalErrors} error(s)`));
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
  content += stringifyFrontmatter(frontmatter).trim();
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
  }).trim();
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
 * Wiki page metadata structure
 */
interface WikiPage {
  filename: string;
  title: string;
  summary: string;
  sourceFile: string;
  messageCount: number;
  startDate?: string;
  endDate?: string;
  frontmatter: Record<string, unknown>;
}

/**
 * Evidence from normalized source
 */
interface Evidence {
  sourceFile: string;
  title: string;
  snippets: string[];
  messageCount: number;
}

/**
 * Ask result structure
 */
interface AskResult {
  question: string;
  answer: string | null;
  evidence: Evidence[];
  abstainReason?: string;
  timestamp: string;
}

/**
 * Find relevant wiki pages by matching question against title, summary, and keywords
 */
export async function findRelevantWikiPages(
  wikiDir: string,
  question: string,
  limit: number,
): Promise<WikiPage[]> {
  const files = await fs.readdir(wikiDir, { withFileTypes: true });
  const wikiFiles = files.filter(
    (f) => f.isFile() && f.name.endsWith("-wiki.md") && f.name !== "index.md",
  );

  if (wikiFiles.length === 0) {
    return [];
  }

  // Extract keywords from question (lowercase, split on non-alphanumeric, filter short words)
  const questionLower = question.toLowerCase();
  const keywords = questionLower
    .split(/[^a-z0-9äöüß]+/i)
    .filter((word) => word.length >= 3);

  const scoredPages: Array<{ page: WikiPage; score: number }> = [];

  // Add debug logging
  p.log.message(pc.dim(`  Searching ${wikiFiles.length} wiki files...`));

  for (const file of wikiFiles) {
    const filePath = path.join(wikiDir, file.name);
    const content = await fs.readFile(filePath, "utf-8");

    // Parse frontmatter - be flexible with line endings (CRLF or LF)
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) {
      continue;
    }

    const frontmatter = parseFrontmatterBlock(frontmatterMatch[1]);
    const title = String(frontmatter.title || "");
    const sourceFile = String(frontmatter.source_file || "");
    const messageCount = Number(frontmatter.message_count || 0);
    const startDate = frontmatter.start_date ? String(frontmatter.start_date) : undefined;
    const endDate = frontmatter.end_date ? String(frontmatter.end_date) : undefined;

    // Extract summary from content
    const summary = extractSummaryFromWiki(content);

    // Calculate score based on keyword matches
    let score = 0;
    const titleLower = title.toLowerCase();
    const summaryLower = summary.toLowerCase();
    const fileNameLower = file.name.toLowerCase();

    // Direct substring match (highest score)
    if (titleLower.includes(questionLower) || fileNameLower.includes(questionLower)) {
      score += 100;
    }

    for (const keyword of keywords) {
      // Title match is weighted high
      if (titleLower.includes(keyword)) {
        score += 10;
      }
      // Filename match
      if (fileNameLower.includes(keyword)) {
        score += 8;
      }
      // Summary match
      if (summaryLower.includes(keyword)) {
        score += 5;
      }
      // Content match (lower weight)
      if (content.toLowerCase().includes(keyword)) {
        score += 2;
      }
    }

    if (score > 0) {
      p.log.message(pc.dim(`    ${file.name}: score ${score}`));
      scoredPages.push({
        page: {
          filename: file.name,
          title,
          summary,
          sourceFile,
          messageCount,
          startDate,
          endDate,
          frontmatter,
        },
        score,
      });
    }
  }

  // Sort by score descending and take top N
  scoredPages.sort((a, b) => b.score - a.score);
  return scoredPages.slice(0, limit).map((sp) => sp.page);
}

/**
 * Extract summary from wiki page content
 */
export function extractSummaryFromWiki(content: string): string {
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, "");

  // Try to extract from Summary section
  const summaryMatch = withoutFrontmatter.match(/## Summary\n\n([^#]+)/);
  if (summaryMatch) {
    return summaryMatch[1].trim().substring(0, 300);
  }

  // Fallback to first paragraph
  const firstPara = withoutFrontmatter.split("\n\n")[0];
  return firstPara ? firstPara.replace(/^# /, "").trim().substring(0, 200) : "";
}

/**
 * Load normalized file referenced by wiki page
 */
export async function loadNormalizedFile(
  normalizedDir: string,
  sourceFile: string,
): Promise<{ content: string; exists: boolean; error?: string }> {
  const filePath = path.join(normalizedDir, sourceFile);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { content, exists: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { content: "", exists: false, error: errorMessage };
  }
}

/**
 * Extract message content from normalized file
 */
export function extractMessagesFromNormalized(content: string): Array<{ sender: string; text: string; timestamp?: string }> {
  const messages: Array<{ sender: string; text: string; timestamp?: string }> = [];

  // Find the Messages section
  const messagesMatch = content.match(/## Messages\n\n([\s\S]*?)(?=\n## |\n---|$)/);
  if (!messagesMatch) return messages;

  const messagesSection = messagesMatch[1];

  // Parse each message block - split by message headers (flexible newline matching)
  const messageBlocks = messagesSection.split(/\n### Message \d+\n+/).filter(Boolean);

  for (const block of messageBlocks) {
    // Remove any leading "### Message N" header that might remain after split
    const cleanedBlock = block.replace(/^### Message \d+\n+/, "").trim();
    if (!cleanedBlock) continue;

    // Extract sender and timestamp from header line (format: **User** · timestamp)
    const headerMatch = cleanedBlock.match(/^(\*\*User\*\*|\*\*Assistant\*\*) · (.+?)\n/);
    if (!headerMatch) continue;

    const sender = headerMatch[1].replace(/\*\*/g, "");
    const timestamp = headerMatch[2].trim();

    // Extract message text (everything after the header line until next blank line or end)
    const afterHeader = cleanedBlock.substring(headerMatch[0].length);
    const text = afterHeader.split(/\n\n/)[0].trim();

    if (text) {
      messages.push({ sender, text, timestamp });
    }
  }

  return messages;
}

/**
 * Extract relevant snippets from normalized content based on question keywords
 */
export function extractRelevantSnippets(
  content: string,
  question: string,
  maxSnippets: number = 3,
): string[] {
  const keywords = question
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .filter((word) => word.length >= 3);

  const messages = extractMessagesFromNormalized(content);
  const scoredMessages: Array<{ text: string; score: number }> = [];

  for (const msg of messages) {
    const textLower = msg.text.toLowerCase();
    let score = 0;

    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        score += 1;
      }
    }

    // Assistant messages may contain more comprehensive answers
    if (msg.sender === "Assistant") {
      score *= 1.2;
    }

    if (score > 0) {
      scoredMessages.push({ text: msg.text, score });
    }
  }

  // Sort by score and take top N
  scoredMessages.sort((a, b) => b.score - a.score);
  return scoredMessages.slice(0, maxSnippets).map((sm) => sm.text.substring(0, 500));
}

/**
 * Build answer from evidence
 */
export function buildAnswerFromEvidence(
  question: string,
  evidence: Evidence[],
): { answer: string | null; abstainReason?: string } {
  if (evidence.length === 0) {
    return {
      answer: null,
      abstainReason: "No relevant content found in the knowledge base for this question.",
    };
  }

  // Combine evidence to form answer
  const parts: string[] = [];

  for (const ev of evidence) {
    if (ev.snippets.length > 0) {
      // Use the most relevant snippet as the core of the answer
      parts.push(ev.snippets[0]);
    }
  }

  if (parts.length === 0) {
    return {
      answer: null,
      abstainReason: "Found relevant sources but no matching content for this specific question.",
    };
  }

  // Build coherent answer from parts
  const combined = parts.join("\n\n");

  // Truncate if too long
  const answer = combined.length > 1500 ? combined.substring(0, 1500) + "..." : combined;

  return { answer };
}

/**
 * Format answer for CLI display
 */
function formatAnswerForDisplay(result: AskResult): string {
  let output = "";

  if (result.answer) {
    output += `${pc.bold("Answer:")}\n${result.answer}\n\n`;
  } else {
    output += `${pc.yellow("No answer available")}\n`;
    if (result.abstainReason) {
      output += `${pc.dim(result.abstainReason)}\n\n`;
    }
  }

  if (result.evidence.length > 0) {
    output += `${pc.bold("Evidence from sources:")}\n`;
    for (const ev of result.evidence) {
      output += `${pc.cyan("•")} ${pc.bold(ev.title)} (${ev.sourceFile})\n`;
      for (const snippet of ev.snippets.slice(0, 2)) {
        const truncated = snippet.length > 150 ? snippet.substring(0, 150) + "..." : snippet;
        output += `  ${pc.dim("→")} ${truncated}\n`;
      }
    }
    output += "\n";
  }

  output += `${pc.dim(`Sources: ${result.evidence.length} normalized files`)}`;

  return output;
}

/**
 * Format output for file writing
 */
export function formatOutputForFile(result: AskResult): string {
  let content = "---\n";
  content += stringifyFrontmatter({
    question: result.question,
    timestamp: result.timestamp,
    source_count: result.evidence.length,
    abstained: result.answer === null,
  }).trim();
  content += "\n---\n\n";

  content += "# Question\n\n";
  content += `${result.question}\n\n`;

  content += "# Answer\n\n";
  if (result.answer) {
    content += `${result.answer}\n\n`;
  } else {
    content += "_No answer could be generated from available sources._\n\n";
    if (result.abstainReason) {
      content += `**Reason:** ${result.abstainReason}\n\n`;
    }
  }

  content += "# Evidence\n\n";
  if (result.evidence.length > 0) {
    for (const ev of result.evidence) {
      content += `## ${ev.title}\n\n`;
      content += `**Source:** \`${ev.sourceFile}\`\n\n`;
      for (let i = 0; i < ev.snippets.length; i++) {
        content += `> ${ev.snippets[i].replace(/\n/g, "\n> ")}\n\n`;
      }
    }
  } else {
    content += "_No evidence available._\n\n";
  }

  content += "# Sources\n\n";
  for (const ev of result.evidence) {
    content += `- \`${ev.sourceFile}\` - ${ev.title}\n`;
  }
  content += "\n";

  return content;
}

/**
 * kb:ask command - ask a question using the knowledge base
 */
export async function askCommand(opts: {
  question: string;
  output: boolean;
  limit: number;
}): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:ask ")));

  p.log.message(pc.dim(`Question: ${opts.question}`));

  // Find repo root and set up paths
  const repoRoot = await findRepoRoot();
  const wikiDir = path.join(repoRoot, KB_WIKI);
  const normalizedDir = path.join(repoRoot, KB_NORMALIZED);
  const outputsDir = path.join(repoRoot, KB_ROOT, "outputs");

  // Check if wiki directory exists
  try {
    await fs.access(wikiDir);
  } catch {
    p.log.error(pc.red(`Wiki directory not found: ${wikiDir}`));
    throw new Error("Wiki directory not found. Run kb:compile first.");
  }

  // Check if normalized directory exists
  try {
    await fs.access(normalizedDir);
  } catch {
    p.log.error(pc.red(`Normalized directory not found: ${normalizedDir}`));
    throw new Error("Normalized directory not found. Run kb:normalize first.");
  }

  // Step 1: Find relevant wiki pages
  p.log.message(pc.dim("Finding relevant wiki pages..."));
  const relevantPages = await findRelevantWikiPages(wikiDir, opts.question, opts.limit);

  if (relevantPages.length === 0) {
    const result: AskResult = {
      question: opts.question,
      answer: null,
      evidence: [],
      abstainReason: "No relevant wiki content found for this question.",
      timestamp: new Date().toISOString(),
    };

    if (opts.output) {
      await fs.mkdir(outputsDir, { recursive: true });
      const safeQuestion = opts.question.replace(/[^a-z0-9]/gi, "_").substring(0, 50);
      const outputPath = path.join(outputsDir, `ask-${safeQuestion}-${Date.now()}.md`);
      await fs.writeFile(outputPath, formatOutputForFile(result), "utf-8");
      p.log.success(pc.green(`Output written to: ${outputPath}`));
    }

    p.log.warn(pc.yellow("No relevant wiki pages found for this question."));
    p.outro("Abstained: insufficient evidence");
    return;
  }

  p.log.message(pc.dim(`Found ${relevantPages.length} relevant wiki page(s)`));

  // Step 2: Load normalized sources from wiki references
  p.log.message(pc.dim("Loading normalized source files..."));
  const evidence: Evidence[] = [];

  for (const page of relevantPages) {
    if (!page.sourceFile) {
      p.log.warn(pc.yellow(`Wiki page ${page.filename} has no source_file reference`));
      continue;
    }

    const normalizedResult = await loadNormalizedFile(normalizedDir, page.sourceFile);

    if (!normalizedResult.exists) {
      p.log.warn(pc.yellow(`Normalized file not found: ${page.sourceFile}`));
      continue;
    }

    // Extract relevant snippets from normalized content
    const snippets = extractRelevantSnippets(normalizedResult.content, opts.question, 3);

    evidence.push({
      sourceFile: page.sourceFile,
      title: page.title,
      snippets,
      messageCount: page.messageCount,
    });

    p.log.message(pc.dim(`  ✓ ${page.sourceFile} (${snippets.length} snippets)`));
  }

  if (evidence.length === 0) {
    const result: AskResult = {
      question: opts.question,
      answer: null,
      evidence: [],
      abstainReason: "Wiki pages found but normalized sources are unavailable.",
      timestamp: new Date().toISOString(),
    };

    if (opts.output) {
      await fs.mkdir(outputsDir, { recursive: true });
      const safeQuestion = opts.question.replace(/[^a-z0-9]/gi, "_").substring(0, 50);
      const outputPath = path.join(outputsDir, `ask-${safeQuestion}-${Date.now()}.md`);
      await fs.writeFile(outputPath, formatOutputForFile(result), "utf-8");
      p.log.success(pc.green(`Output written to: ${outputPath}`));
    }

    p.log.warn(pc.yellow("Normalized sources unavailable for relevant wiki pages."));
    p.outro("Abstained: sources unavailable");
    return;
  }

  // Step 3: Build answer from evidence
  const { answer, abstainReason } = buildAnswerFromEvidence(opts.question, evidence);

  const result: AskResult = {
    question: opts.question,
    answer,
    evidence,
    abstainReason,
    timestamp: new Date().toISOString(),
  };

  // Step 4: Output result
  if (opts.output) {
    await fs.mkdir(outputsDir, { recursive: true });
    const safeQuestion = opts.question.replace(/[^a-z0-9]/gi, "_").substring(0, 50);
    const outputPath = path.join(outputsDir, `ask-${safeQuestion}-${Date.now()}.md`);
    await fs.writeFile(outputPath, formatOutputForFile(result), "utf-8");
    p.log.success(pc.green(`Output written to: ${outputPath}`));
  }

  // Display to console
  p.log.message("");
  p.log.message(formatAnswerForDisplay(result));

  if (answer) {
    p.outro(pc.green(`Answer generated from ${evidence.length} source(s)`));
  } else {
    p.outro(pc.yellow("Abstained: " + (abstainReason || "No answer could be generated")));
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

  // kb ask subcommand
  kb
    .command("ask")
    .description("Ask a question using the knowledge base")
    .argument("<question>", "Question to ask")
    .option("-o, --output", "Write output to a file in outputs/", false)
    .option("-l, --limit <number>", "Maximum number of sources to include", "5")
    .action(async (question: string, opts: { output: boolean; limit: string }) => {
      await askCommand({
        question,
        output: opts.output,
        limit: parseInt(opts.limit, 10),
      });
    });
}
