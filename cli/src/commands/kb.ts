import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { promises as fs } from "node:fs";
import * as path from "node:path";

const KB_ROOT = "company-hq/kb";
const KB_RAW = path.join(KB_ROOT, "raw");
const KB_NORMALIZED = path.join(KB_ROOT, "normalized");
const KB_WIKI = path.join(KB_ROOT, "wiki");

interface ClaudeMessage {
  uuid: string;
  text?: string;
  sender: string;
  created_at?: string;
  attachments?: unknown[];
  files?: { file_name?: string }[];
}

interface ClaudeConversation {
  uuid: string;
  name?: string;
  summary?: string;
  created_at?: string;
  updated_at?: string;
  chat_messages?: ClaudeMessage[];
}

function isInteractive(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

async function findRepoRoot(): Promise<string> {
  let currentDir = process.cwd();

  try {
    await fs.access(path.join(currentDir, "company-hq"));
    return currentDir;
  } catch {
    while (currentDir !== path.dirname(currentDir)) {
      try {
        await fs.access(path.join(currentDir, "company-hq"));
        return currentDir;
      } catch {
        currentDir = path.dirname(currentDir);
      }
    }
  }

  return process.cwd();
}

async function validateClaudeExport(
  sourcePath: string,
): Promise<{ valid: boolean; error?: string; files: string[] }> {
  try {
    const stats = await fs.stat(sourcePath);
    if (!stats.isDirectory()) {
      return { valid: false, error: `Source path is not a directory: ${sourcePath}`, files: [] };
    }

    const files = await fs.readdir(sourcePath);
    if (!files.includes("conversations.json")) {
      return {
        valid: false,
        error: "Missing required file: conversations.json. This does not appear to be a valid Claude export.",
        files,
      };
    }

    return { valid: true, files };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Cannot read source path: ${errorMessage}`, files: [] };
  }
}

function getSourceName(sourcePath: string): string {
  return path.basename(sourcePath).replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function copyFile(src: string, dest: string): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

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
    files,
  };

  await fs.writeFile(path.join(destDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
}

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function formatTimestamp(isoDate: string | undefined): string {
  if (!isoDate) return "Unknown";
  try {
    return new Date(isoDate).toLocaleString("en-US", {
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

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 50)
    .toLowerCase();
}

function stringifyFrontmatter(frontmatter: Record<string, unknown>): string {
  return Object.entries(frontmatter)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
}

function normalizeConversation(
  conversation: ClaudeConversation,
  sourceName: string,
  importedAt: string,
): string {
  const messages = conversation.chat_messages || [];
  const messageCount = messages.length;

  let startDate: string | null = null;
  let endDate: string | null = null;

  if (messages.length > 0) {
    const dates = messages
      .map((message) => message.created_at)
      .filter((date): date is string => !!date)
      .sort();

    if (dates.length > 0) {
      startDate = dates[0];
      endDate = dates[dates.length - 1];
    }
  }

  const frontmatter: Record<string, unknown> = {
    source: sourceName,
    imported_at: importedAt,
    conversation_uuid: conversation.uuid,
    title: conversation.name || "Untitled",
    message_count: messageCount,
  };

  if (startDate) frontmatter.start_date = startDate;
  if (endDate) frontmatter.end_date = endDate;
  if (conversation.created_at) frontmatter.created_at = conversation.created_at;
  if (conversation.updated_at) frontmatter.updated_at = conversation.updated_at;

  let content = "---\n";
  content += stringifyFrontmatter(frontmatter);
  content += "\n---\n\n";
  content += `# ${conversation.name || "Untitled"}\n\n`;
  content += `**UUID:** \`${conversation.uuid}\`\n\n`;
  content += `**Messages:** ${messageCount}\n\n`;

  if (startDate && endDate) {
    content += `**Date Range:** ${formatDate(startDate)} - ${formatDate(endDate)}\n\n`;
  }

  if (conversation.summary) {
    content += `**Summary:** ${conversation.summary}\n\n`;
  }

  content += "---\n\n";

  if (messages.length === 0) {
    content += "*No messages in this conversation.*\n";
    return content;
  }

  content += "## Messages\n\n";
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const sender = message.sender === "human" ? "**User**" : "**Assistant**";

    content += `### Message ${index + 1}\n\n`;
    content += `${sender} - ${formatTimestamp(message.created_at)}\n\n`;

    if (message.text) {
      content += `${message.text}\n\n`;
    }

    if (message.attachments && message.attachments.length > 0) {
      content += `*Attachments: ${message.attachments.length} file(s)*\n\n`;
    }

    if (message.files && message.files.length > 0) {
      const fileNames = message.files.map((file) => file.file_name).filter(Boolean);
      if (fileNames.length > 0) {
        content += `*Files: ${fileNames.join(", ")}*\n\n`;
      }
    }
  }

  return content;
}

function parseFrontmatterDocument(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content.trim() };
  }

  const [, rawFrontmatter, body] = match;
  const parsed = Object.fromEntries(
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

  return {
    frontmatter: (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>,
    body: body.trim(),
  };
}

function getFrontmatterString(frontmatter: Record<string, unknown>, key: string): string | undefined {
  const value = frontmatter[key];
  return typeof value === "string" ? value : undefined;
}

function getFrontmatterNumber(frontmatter: Record<string, unknown>, key: string): number | undefined {
  const value = frontmatter[key];
  return typeof value === "number" ? value : undefined;
}

function buildWikiPage(
  normalizedFileName: string,
  compiledAt: string,
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const title = getFrontmatterString(frontmatter, "title") ?? normalizedFileName;
  const source = getFrontmatterString(frontmatter, "source") ?? "unknown";
  const conversationUuid = getFrontmatterString(frontmatter, "conversation_uuid");
  const importedAt = getFrontmatterString(frontmatter, "imported_at");
  const startDate = getFrontmatterString(frontmatter, "start_date");
  const endDate = getFrontmatterString(frontmatter, "end_date");
  const messageCount = getFrontmatterNumber(frontmatter, "message_count");
  const sourceReference = `../normalized/${normalizedFileName}`;

  const wikiFrontmatter: Record<string, unknown> = {
    title,
    compiled_at: compiledAt,
    source,
    source_reference: sourceReference,
  };

  if (conversationUuid) wikiFrontmatter.conversation_uuid = conversationUuid;
  if (importedAt) wikiFrontmatter.imported_at = importedAt;
  if (startDate) wikiFrontmatter.start_date = startDate;
  if (endDate) wikiFrontmatter.end_date = endDate;
  if (messageCount !== undefined) wikiFrontmatter.message_count = messageCount;

  let content = "---\n";
  content += stringifyFrontmatter(wikiFrontmatter);
  content += "\n---\n\n";
  content += `# ${title}\n\n`;
  content += "## Source\n\n";
  content += `- Source type: ${source}\n`;
  content += `- Normalized file: [${normalizedFileName}](${sourceReference})\n`;
  if (conversationUuid) {
    content += `- Conversation UUID: \`${conversationUuid}\`\n`;
  }
  if (messageCount !== undefined) {
    content += `- Message count: ${messageCount}\n`;
  }
  if (startDate || endDate) {
    content += `- Date range: ${startDate ?? "unknown"} -> ${endDate ?? "unknown"}\n`;
  }
  content += "\n";
  content += body;
  content += "\n";

  return content;
}

function buildWikiIndex(
  entries: Array<{
    fileName: string;
    title: string;
    source: string;
    startDate?: string;
    messageCount?: number;
  }>,
  compiledAt: string,
): string {
  const lines = [
    "# Knowledge Base Index",
    "",
    `Compiled at: ${compiledAt}`,
    "",
    `Total pages: ${entries.length}`,
    "",
    "## Conversations",
    "",
  ];

  for (const entry of entries) {
    const metadata: string[] = [];
    if (entry.startDate) metadata.push(entry.startDate);
    if (entry.messageCount !== undefined) metadata.push(`${entry.messageCount} messages`);
    metadata.push(entry.source);
    lines.push(`- [${entry.title}](${entry.fileName}) - ${metadata.join(" - ")}`);
  }

  lines.push("", "## Notes", "", "- Pages are compiled from normalized source files.", "- Normalized markdown remains the evidence layer.", "");
  return lines.join("\n");
}

export async function ingestCommand(opts: { source: string; force?: boolean }): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:ingest ")));

  const sourcePath = path.resolve(opts.source);
  p.log.message(pc.dim(`Source path: ${sourcePath}`));

  const validation = await validateClaudeExport(sourcePath);
  if (!validation.valid) {
    p.log.error(pc.red(`Invalid source: ${validation.error}`));
    throw new Error(`Ingest failed: ${validation.error}`);
  }

  p.log.success(pc.green(`Found ${validation.files.length} file(s) in source`));

  const repoRoot = await findRepoRoot();
  const sourceName = getSourceName(sourcePath);
  const destDir = path.join(repoRoot, KB_RAW, sourceName);

  let shouldProceed = true;
  try {
    await fs.access(destDir);
    p.log.warn(pc.yellow(`Destination already exists: ${destDir}`));

    if (opts.force) {
      p.log.message(pc.dim("Force flag set, overwriting existing files..."));
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
    shouldProceed = true;
  }

  if (!shouldProceed) {
    p.outro(pc.yellow("Ingest cancelled"));
    return;
  }

  await fs.mkdir(destDir, { recursive: true });
  p.log.message(pc.dim(`Created destination: ${destDir}`));

  let copiedCount = 0;
  for (const file of validation.files) {
    if (!file.endsWith(".json")) {
      p.log.message(pc.dim(`Skipping non-JSON file: ${file}`));
      continue;
    }

    try {
      await copyFile(path.join(sourcePath, file), path.join(destDir, file));
      copiedCount += 1;
      p.log.message(pc.dim(`  OK ${file}`));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      p.log.error(pc.red(`  X ${file}: ${errorMessage}`));
    }
  }

  await createMetadataManifest(destDir, sourcePath, sourceName, validation.files);
  p.log.message(pc.dim("  OK manifest.json"));
  p.outro(pc.green(`Ingest complete: ${copiedCount} JSON file(s) copied to ${destDir}`));
}

export async function normalizeCommand(): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:normalize ")));

  const repoRoot = await findRepoRoot();
  const rawDir = path.join(repoRoot, KB_RAW);
  const normalizedDir = path.join(repoRoot, KB_NORMALIZED);

  try {
    await fs.access(rawDir);
  } catch {
    p.log.error(pc.red(`Raw directory not found: ${rawDir}`));
    throw new Error("Raw directory not found. Run kb:ingest first.");
  }

  await fs.mkdir(normalizedDir, { recursive: true });
  p.log.message(pc.dim(`Normalized directory: ${normalizedDir}`));

  const sourceDirs = await fs.readdir(rawDir, { withFileTypes: true });
  const validSourceDirs = sourceDirs.filter((entry) => entry.isDirectory());

  if (validSourceDirs.length === 0) {
    p.log.error(pc.red("No source directories found in raw/"));
    throw new Error("No source data to normalize. Run kb:ingest first.");
  }

  let totalNormalized = 0;
  let totalErrors = 0;

  for (const sourceDir of validSourceDirs) {
    const sourceName = sourceDir.name;
    const sourcePath = path.join(rawDir, sourceName);
    p.log.message(pc.bold(`\nProcessing source: ${sourceName}`));

    let importedAt = new Date().toISOString();
    try {
      const manifest = JSON.parse(await fs.readFile(path.join(sourcePath, "manifest.json"), "utf-8"));
      importedAt = manifest.imported_at || importedAt;
    } catch {
      p.log.warn(pc.yellow("  No manifest.json found, using current time"));
    }

    const conversationsPath = path.join(sourcePath, "conversations.json");
    try {
      await fs.access(conversationsPath);
    } catch {
      p.log.warn(pc.yellow("  No conversations.json found, skipping"));
      continue;
    }

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
      totalErrors += 1;
      continue;
    }

    p.log.message(pc.dim(`  Found ${conversations.length} conversation(s)`));

    for (const conversation of conversations) {
      try {
        if (!conversation.uuid) {
          p.log.warn(pc.yellow("  Skipping conversation without UUID"));
          continue;
        }

        const normalized = normalizeConversation(conversation, sourceName, importedAt);
        const safeTitle = sanitizeFilename(conversation.name || "untitled");
        const filename = `${safeTitle}-${conversation.uuid.substring(0, 8)}.md`;
        await fs.writeFile(path.join(normalizedDir, filename), normalized, "utf-8");
        totalNormalized += 1;
        p.log.message(pc.dim(`  OK ${filename}`));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        p.log.error(pc.red(`  X Failed to normalize conversation ${conversation?.uuid}: ${errorMessage}`));
        totalErrors += 1;
      }
    }
  }

  p.outro(pc.green(`Normalization complete: ${totalNormalized} conversation(s) normalized, ${totalErrors} error(s)`));
}

export async function compileCommand(): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:compile ")));

  const repoRoot = await findRepoRoot();
  const normalizedDir = path.join(repoRoot, KB_NORMALIZED);
  const wikiDir = path.join(repoRoot, KB_WIKI);

  try {
    await fs.access(normalizedDir);
  } catch {
    p.log.error(pc.red(`Normalized directory not found: ${normalizedDir}`));
    throw new Error("Normalized directory not found. Run kb:normalize first.");
  }

  await fs.mkdir(wikiDir, { recursive: true });

  const files = (await fs.readdir(normalizedDir))
    .filter((file) => file.endsWith(".md") && file !== ".gitkeep")
    .sort();

  if (files.length === 0) {
    p.log.error(pc.red("No normalized markdown files found."));
    throw new Error("No normalized data to compile. Run kb:normalize first.");
  }

  const compiledAt = new Date().toISOString();
  const indexEntries: Array<{
    fileName: string;
    title: string;
    source: string;
    startDate?: string;
    messageCount?: number;
  }> = [];

  for (const fileName of files) {
    const rawContent = await fs.readFile(path.join(normalizedDir, fileName), "utf-8");
    const { frontmatter, body } = parseFrontmatterDocument(rawContent);
    const title = getFrontmatterString(frontmatter, "title") ?? fileName;
    const source = getFrontmatterString(frontmatter, "source") ?? "unknown";
    const startDate = getFrontmatterString(frontmatter, "start_date");
    const messageCount = getFrontmatterNumber(frontmatter, "message_count");

    await fs.writeFile(
      path.join(wikiDir, fileName),
      buildWikiPage(fileName, compiledAt, frontmatter, body),
      "utf-8",
    );
    p.log.message(pc.dim(`  OK ${fileName}`));

    indexEntries.push({
      fileName,
      title,
      source,
      startDate,
      messageCount,
    });
  }

  await fs.writeFile(path.join(wikiDir, "index.md"), buildWikiIndex(indexEntries, compiledAt), "utf-8");
  p.log.message(pc.dim("  OK index.md"));
  p.outro(pc.green(`Compile complete: ${files.length} wiki page(s) and index.md generated in ${wikiDir}`));
}

export async function outputCommand(opts: { question?: string }): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" kb:output ")));
  if (opts.question) {
    p.log.message(pc.dim(`Question: ${opts.question}`));
  }
  p.log.warn(pc.yellow("kb:output is not yet implemented"));
  p.outro("Done");
}

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
    .command("normalize")
    .description("Normalize conversations from raw to normalized/")
    .action(async () => {
      await normalizeCommand();
    });

  kb
    .command("compile")
    .description("Compile normalized data into wiki pages")
    .action(async () => {
      await compileCommand();
    });

  kb
    .command("output")
    .description("Create output files in outputs/")
    .option("-q, --question <text>", "Question being answered")
    .action(async (opts) => {
      await outputCommand(opts);
    });
}
