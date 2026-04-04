import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compileCommand } from "../commands/kb.js";

const ORIGINAL_ENV = { ...process.env };

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
 * Create a temporary directory for test files
 */
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "kb-compile-test-"));
}

/**
 * Create a mock normalized markdown file with frontmatter
 */
function createMockNormalizedFile(
  dir: string,
  filename: string,
  frontmatter: Record<string, unknown>,
  content: string,
): void {
  const frontmatterYaml = stringifyFrontmatter(frontmatter);
  const fullContent = `---\n${frontmatterYaml}\n---\n\n${content}`;
  fs.writeFileSync(path.join(dir, filename), fullContent, "utf-8");
}

/**
 * Extract frontmatter from markdown content
 */
function extractFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  try {
    return parseFrontmatterBlock(match[1]);
  } catch {
    return null;
  }
}

describe("kb:compile command", () => {
  let tempDir: string;
  let normalizedDir: string;
  let wikiDir: string;
  let originalCwd: string;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    tempDir = createTempDir();
    normalizedDir = path.join(tempDir, "company-hq", "kb", "normalized");
    wikiDir = path.join(tempDir, "company-hq", "kb", "wiki");

    // Create the directory structure
    fs.mkdirSync(normalizedDir, { recursive: true });
    fs.mkdirSync(wikiDir, { recursive: true });

    // Change to temp directory so findRepoRoot() finds our mock structure
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    process.env = { ...ORIGINAL_ENV };
  });

  describe("wiki page generation", () => {
    it("creates wiki pages from normalized files", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "test-conversation-abc123.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "abc123-uuid",
          title: "Test Conversation",
          message_count: 5,
          start_date: "2026-04-01T10:00:00Z",
          end_date: "2026-04-01T11:00:00Z",
        },
        "# Test Conversation\n\n**UUID:** `abc123-uuid`\n\n**Messages:** 5\n\n---\n\n## Messages\n\n### Message 1\n\n**User** · Apr 1, 2026\n\nThis is a test message about Claude Code usage limits.",
      );

      await compileCommand();

      const wikiFiles = fs.readdirSync(wikiDir).filter((f) => f.endsWith(".md") && f !== ".gitkeep");
      expect(wikiFiles.length).toBeGreaterThan(0);
      expect(wikiFiles).toContain("test-conversation-abc123-wiki.md");
    });

    it("creates index.md listing all pages", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "conversation-one-abc123.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "abc123-uuid",
          title: "Conversation One",
          message_count: 3,
        },
        "# Conversation One\n\n**Messages:** 3",
      );

      createMockNormalizedFile(
        normalizedDir,
        "conversation-two-def456.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "def456-uuid",
          title: "Conversation Two",
          message_count: 5,
        },
        "# Conversation Two\n\n**Messages:** 5",
      );

      await compileCommand();

      const indexPath = path.join(wikiDir, "index.md");
      expect(fs.existsSync(indexPath)).toBe(true);

      const indexContent = fs.readFileSync(indexPath, "utf-8");
      expect(indexContent).toContain("Conversation One");
      expect(indexContent).toContain("Conversation Two");
    });
  });

  describe("wiki page structure", () => {
    it("wiki pages have YAML frontmatter", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "frontmatter-test-xyz789.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "xyz789-uuid",
          title: "Frontmatter Test",
          message_count: 2,
          start_date: "2026-04-01T10:00:00Z",
          end_date: "2026-04-01T10:30:00Z",
        },
        "# Frontmatter Test\n\nTest content",
      );

      await compileCommand();

      const wikiPath = path.join(wikiDir, "frontmatter-test-xyz789-wiki.md");
      const wikiContent = fs.readFileSync(wikiPath, "utf-8");

      // Verify frontmatter exists
      expect(wikiContent).toMatch(/^---\n/);
      expect(wikiContent).toMatch(/\n---\n\n#/);

      // Extract and verify frontmatter fields
      const frontmatter = extractFrontmatter(wikiContent);
      expect(frontmatter).not.toBeNull();
      expect(frontmatter?.title).toBe("Frontmatter Test");
      expect(frontmatter?.source_uuid).toBe("xyz789-uuid");
      expect(frontmatter?.source_file).toBe("frontmatter-test-xyz789.md");
      expect(frontmatter?.message_count).toBe(2);
      expect(frontmatter?.compiled_at).toBeDefined();
    });

    it("wiki pages contain summary section", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "summary-test-111222.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "111222-uuid",
          title: "Summary Test",
          message_count: 4,
        },
        "# Summary Test\n\n**Messages:** 4\n\n---\n\n## Messages\n\n### Message 1\n\n**User** · Apr 1, 2026\n\nI need help understanding how to configure Claude Code for my project.",
      );

      await compileCommand();

      const wikiPath = path.join(wikiDir, "summary-test-111222-wiki.md");
      const wikiContent = fs.readFileSync(wikiPath, "utf-8");

      expect(wikiContent).toContain("## Summary");
      // Summary should contain content from the first user message
      expect(wikiContent).toMatch(/Summary\n\n.*configure.*Claude/i);
    });

    it("wiki pages cite source files", async () => {
      const sourceFilename = "source-citation-test-333444.md";
      createMockNormalizedFile(
        normalizedDir,
        sourceFilename,
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "333444-uuid",
          title: "Source Citation Test",
          message_count: 3,
        },
        "# Source Citation Test\n\nTest content",
      );

      await compileCommand();

      const wikiPath = path.join(wikiDir, "source-citation-test-333444-wiki.md");
      const wikiContent = fs.readFileSync(wikiPath, "utf-8");

      // Check for Source section
      expect(wikiContent).toContain("## Source");
      // Check for source file reference
      expect(wikiContent).toContain(sourceFilename);
      expect(wikiContent).toMatch(/Based on normalized file.*source-citation-test-333444\.md/);
    });

    it("wiki pages preserve conversation title", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "title-test-555666.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "555666-uuid",
          title: "My Special Conversation Title",
          message_count: 2,
        },
        "# My Special Conversation Title\n\nTest content",
      );

      await compileCommand();

      const wikiPath = path.join(wikiDir, "title-test-555666-wiki.md");
      const wikiContent = fs.readFileSync(wikiPath, "utf-8");

      // Title should appear in the content
      expect(wikiContent).toContain("# My Special Conversation Title");

      // Title should be in frontmatter
      const frontmatter = extractFrontmatter(wikiContent);
      expect(frontmatter?.title).toBe("My Special Conversation Title");
    });

    it("wiki pages include metadata section", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "metadata-test-777888.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "777888-uuid",
          title: "Metadata Test",
          message_count: 10,
          start_date: "2026-03-01T10:00:00Z",
          end_date: "2026-03-15T11:00:00Z",
        },
        "# Metadata Test\n\nTest content",
      );

      await compileCommand();

      const wikiPath = path.join(wikiDir, "metadata-test-777888-wiki.md");
      const wikiContent = fs.readFileSync(wikiPath, "utf-8");

      expect(wikiContent).toContain("## Metadata");
      expect(wikiContent).toContain("777888-uuid");
      expect(wikiContent).toContain("10");
    });
  });

  describe("error handling", () => {
    it("handles empty normalized directory gracefully", async () => {
      // normalizedDir exists but is empty
      await compileCommand();

      // Should not throw, just complete with no output
      const wikiFiles = fs.readdirSync(wikiDir).filter((f) => f.endsWith(".md"));
      expect(wikiFiles.length).toBe(0);
    });

    it("skips files without valid frontmatter", async () => {
      // Create a valid file
      createMockNormalizedFile(
        normalizedDir,
        "valid-file-aaa111.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "aaa111-uuid",
          title: "Valid File",
          message_count: 2,
        },
        "# Valid File\n\nTest content",
      );

      // Create an invalid file (no frontmatter)
      fs.writeFileSync(
        path.join(normalizedDir, "invalid-file-bbb222.md"),
        "# Invalid File\n\nNo frontmatter here",
        "utf-8",
      );

      await compileCommand();

      // Valid file should be compiled
      expect(fs.existsSync(path.join(wikiDir, "valid-file-aaa111-wiki.md"))).toBe(true);

      // Invalid file should not create a wiki page
      expect(fs.existsSync(path.join(wikiDir, "invalid-file-bbb222-wiki.md"))).toBe(false);

      // Index should only list the valid file
      const indexContent = fs.readFileSync(path.join(wikiDir, "index.md"), "utf-8");
      expect(indexContent).toContain("Valid File");
      expect(indexContent).not.toContain("Invalid File");
    });

    it("skips files missing required conversation_uuid", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "no-uuid-ccc333.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          title: "No UUID File",
          message_count: 2,
          // missing conversation_uuid
        },
        "# No UUID File\n\nTest content",
      );

      await compileCommand();

      // Should not create wiki page without UUID
      expect(fs.existsSync(path.join(wikiDir, "no-uuid-ccc333-wiki.md"))).toBe(false);
    });

    it("skips empty files", async () => {
      fs.writeFileSync(path.join(normalizedDir, "empty-file-ddd444.md"), "", "utf-8");

      await compileCommand();

      expect(fs.existsSync(path.join(wikiDir, "empty-file-ddd444-wiki.md"))).toBe(false);
    });
  });

  describe("index.md structure", () => {
    it("index.md has YAML frontmatter with metadata", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "index-test-eee555.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "eee555-uuid",
          title: "Index Test",
          message_count: 2,
        },
        "# Index Test\n\nTest content",
      );

      await compileCommand();

      const indexPath = path.join(wikiDir, "index.md");
      const indexContent = fs.readFileSync(indexPath, "utf-8");

      const frontmatter = extractFrontmatter(indexContent);
      expect(frontmatter).not.toBeNull();
      expect(frontmatter?.title).toBe("Knowledge Base Wiki");
      expect(frontmatter?.page_count).toBe(1);
      expect(frontmatter?.compiled_at).toBeDefined();
    });

    it("index.md lists pages with summaries and source references", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "page-one-fff666.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "fff666-uuid",
          title: "Page One",
          message_count: 3,
        },
        "# Page One\n\n**Messages:** 3\n\n---\n\n## Messages\n\n### Message 1\n\n**User** · Apr 1, 2026\n\nQuestion about MCP servers.",
      );

      createMockNormalizedFile(
        normalizedDir,
        "page-two-ggg777.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "ggg777-uuid",
          title: "Page Two",
          message_count: 5,
          start_date: "2026-04-02T10:00:00Z",
          end_date: "2026-04-02T11:00:00Z",
        },
        "# Page Two\n\n**Messages:** 5\n\n---\n\n## Messages\n\n### Message 1\n\n**User** · Apr 2, 2026\n\nHelp with Claude Code installation.",
      );

      await compileCommand();

      const indexPath = path.join(wikiDir, "index.md");
      const indexContent = fs.readFileSync(indexPath, "utf-8");

      // Check for page links
      expect(indexContent).toContain("[Page One]");
      expect(indexContent).toContain("[Page Two]");

      // Check for summary content - summary appears after a blank line following the heading
      expect(indexContent).toMatch(/Page One[\s\S]*?Question about MCP/i);
      expect(indexContent).toMatch(/Page Two[\s\S]*?Help with Claude Code/i);

      // Check for source references
      expect(indexContent).toContain("page-one-fff666.md");
      expect(indexContent).toContain("page-two-ggg777.md");

      // Check for metadata
      expect(indexContent).toContain("Messages:** 3");
      expect(indexContent).toContain("Messages:** 5");
      expect(indexContent).toContain("Date Range:** Apr 2, 2026 - Apr 2, 2026");
    });

    it("index.md is sorted alphabetically by title", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "z-last-zzz999.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "zzz999-uuid",
          title: "Zebra Topic",
          message_count: 2,
        },
        "# Zebra Topic\n\nTest",
      );

      createMockNormalizedFile(
        normalizedDir,
        "a-first-aaa000.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "aaa000-uuid",
          title: "Apple Topic",
          message_count: 2,
        },
        "# Apple Topic\n\nTest",
      );

      createMockNormalizedFile(
        normalizedDir,
        "m-middle-mmm555.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "mmm555-uuid",
          title: "Middle Topic",
          message_count: 2,
        },
        "# Middle Topic\n\nTest",
      );

      await compileCommand();

      const indexPath = path.join(wikiDir, "index.md");
      const indexContent = fs.readFileSync(indexPath, "utf-8");

      // Find positions of each topic
      const applePos = indexContent.indexOf("Apple Topic");
      const middlePos = indexContent.indexOf("Middle Topic");
      const zebraPos = indexContent.indexOf("Zebra Topic");

      // Should be in alphabetical order
      expect(applePos).toBeLessThan(middlePos);
      expect(middlePos).toBeLessThan(zebraPos);
    });
  });

  describe("summary extraction", () => {
    it("extracts summary from first user message", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "extract-test-hhh888.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "hhh888-uuid",
          title: "Extraction Test",
          message_count: 4,
        },
        `# Extraction Test

**Messages:** 4

---

## Messages

### Message 1

**User** · Apr 1, 2026

How do I configure the Firefox MCP extension in Claude Code? I've installed it but I'm getting connection errors.

### Message 2

**Assistant** · Apr 1, 2026

Here's how to configure it...`,
      );

      await compileCommand();

      const wikiPath = path.join(wikiDir, "extract-test-hhh888-wiki.md");
      const wikiContent = fs.readFileSync(wikiPath, "utf-8");

      // Summary should contain the user message content
      expect(wikiContent).toContain("How do I configure the Firefox MCP extension");
    });

    it("provides fallback summary when no user message found", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "fallback-test-iii777.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "iii777-uuid",
          title: "Fallback Test",
          message_count: 0,
        },
        "# Fallback Test\n\n**Messages:** 0\n\n---\n\nNo messages here.",
      );

      await compileCommand();

      const wikiPath = path.join(wikiDir, "fallback-test-iii777-wiki.md");
      const wikiContent = fs.readFileSync(wikiPath, "utf-8");

      expect(wikiContent).toContain("## Summary");
      // Should have some fallback content
      expect(wikiContent.length).toBeGreaterThan(0);
    });
  });
});
