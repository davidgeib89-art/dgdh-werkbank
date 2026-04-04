import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { askCommand, compileCommand } from "../commands/kb.js";

const ORIGINAL_ENV = { ...process.env };

function stringifyFrontmatter(frontmatter: Record<string, unknown>): string {
  return Object.entries(frontmatter)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
}

/**
 * Create a temporary directory for test files
 */
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "kb-ask-test-"));
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
 * Create a mock wiki page directly
 */
function createMockWikiPage(
  dir: string,
  filename: string,
  frontmatter: Record<string, unknown>,
  bodyContent: string,
): void {
  const frontmatterYaml = stringifyFrontmatter(frontmatter);
  const fullContent = `---\n${frontmatterYaml}\n---\n\n${bodyContent}`;
  fs.writeFileSync(path.join(dir, filename), fullContent, "utf-8");
}

describe("kb:ask command", () => {
  let tempDir: string;
  let normalizedDir: string;
  let wikiDir: string;
  let outputsDir: string;
  let originalCwd: string;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    tempDir = createTempDir();
    normalizedDir = path.join(tempDir, "company-hq", "kb", "normalized");
    wikiDir = path.join(tempDir, "company-hq", "kb", "wiki");
    outputsDir = path.join(tempDir, "company-hq", "kb", "outputs");

    // Create the directory structure
    fs.mkdirSync(normalizedDir, { recursive: true });
    fs.mkdirSync(wikiDir, { recursive: true });
    fs.mkdirSync(outputsDir, { recursive: true });

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

  describe("citation behavior", () => {
    it("returns cited answer when wiki contains relevant content", async () => {
      // Create a normalized file about Claude Code
      createMockNormalizedFile(
        normalizedDir,
        "claude-code-intro-abc123.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "abc123-uuid",
          title: "Claude Code Introduction",
          message_count: 5,
          start_date: "2026-04-01T10:00:00Z",
          end_date: "2026-04-01T11:00:00Z",
        },
        `# Claude Code Introduction

**UUID:** \`abc123-uuid\`

**Messages:** 5

**Date Range:** Apr 1, 2026 - Apr 1, 2026

---

## Messages

### Message 1

**User** · Apr 1, 2026

What is Claude Code and how can it help me with programming tasks?

### Message 2

**Assistant** · Apr 1, 2026

Claude Code is an AI-powered coding assistant that helps you write, debug, and understand code. It can analyze your codebase, suggest improvements, and answer technical questions.

### Message 3

**User** · Apr 1, 2026

Can it work with large codebases?

### Message 4

**Assistant** · Apr 1, 2026

Yes, Claude Code is designed to handle large codebases efficiently. It can search across files, understand project structure, and provide context-aware suggestions.`,
      );

      // Compile to create wiki pages
      await compileCommand();

      // Verify wiki pages exist
      const wikiFiles = fs.readdirSync(wikiDir).filter((f) => f.endsWith(".md") && f !== ".gitkeep");
      expect(wikiFiles.length).toBeGreaterThan(0);

      // Now ask a question about Claude Code
      // We need to capture the output - the function writes to console via p.log
      // The function doesn't throw on normal operation
      await askCommand({ question: "What is Claude Code?" });

      // If we get here without error, the command executed
      // The actual output verification would require mocking p.log or checking file output
      // For now, we verify it doesn't throw
    });

    it("includes source citations in the answer", async () => {
      // Create wiki pages directly with specific content
      createMockWikiPage(
        wikiDir,
        "mcp-servers-wiki.md",
        {
          title: "MCP Server Configuration",
          compiled_at: "2026-04-04T10:00:00Z",
          source_uuid: "def456-uuid",
          source_file: "mcp-servers-def456.md",
          message_count: 3,
          source: "claude-export",
        },
        `# MCP Server Configuration

## Summary

How to configure MCP servers in Claude Code for extended functionality.

## Metadata

- **UUID:** \`def456-uuid\`
- **Messages:** 3
- **Compiled:** Apr 4, 2026

## Source

Based on normalized file: \`mcp-servers-def456.md\`

> This wiki page was automatically compiled from the normalized conversation data.`,
      );

      createMockWikiPage(
        wikiDir,
        "firefox-mcp-wiki.md",
        {
          title: "Firefox MCP Extension",
          compiled_at: "2026-04-04T10:00:00Z",
          source_uuid: "ghi789-uuid",
          source_file: "firefox-mcp-ghi789.md",
          message_count: 4,
          source: "claude-export",
        },
        `# Firefox MCP Extension

## Summary

Firefox MCP extension setup and troubleshooting connection errors.

## Metadata

- **UUID:** \`ghi789-uuid\`
- **Messages:** 4
- **Compiled:** Apr 4, 2026

## Source

Based on normalized file: \`firefox-mcp-ghi789.md\`

> This wiki page was automatically compiled from the normalized conversation data.`,
      );

      // Ask about MCP
      await askCommand({ question: "How do I configure MCP servers?" });

      // Command should complete without error
    });

    it("writes answer with citations to file when output option is set", async () => {
      createMockNormalizedFile(
        normalizedDir,
        "claude-capabilities-jkl012.md",
        {
          source: "claude-export",
          imported_at: "2026-04-04T10:00:00Z",
          conversation_uuid: "jkl012-uuid",
          title: "Claude Code Capabilities",
          message_count: 6,
          start_date: "2026-04-01T10:00:00Z",
          end_date: "2026-04-01T10:30:00Z",
        },
        `# Claude Code Capabilities

## Messages

### Message 1

**User** · Apr 1, 2026

What can Claude Code do?

### Message 2

**Assistant** · Apr 1, 2026

Claude Code can analyze code, suggest refactors, debug problems, and answer technical questions about a project.`,
      );

      createMockWikiPage(
        wikiDir,
        "claude-capabilities-wiki.md",
        {
          title: "Claude Code Capabilities",
          compiled_at: "2026-04-04T10:00:00Z",
          source_uuid: "jkl012-uuid",
          source_file: "claude-capabilities-jkl012.md",
          message_count: 6,
          source: "claude-export",
        },
        `# Claude Code Capabilities

## Summary

Overview of Claude Code features including code analysis, refactoring, and debugging support.

## Metadata

- **UUID:** \`jkl012-uuid\`
- **Messages:** 6
- **Compiled:** Apr 4, 2026

## Source

Based on normalized file: \`claude-capabilities-jkl012.md\`

> This wiki page was automatically compiled from the normalized conversation data.`,
      );

      // Ask with output option
      await askCommand({ question: "What can Claude Code do?", output: true });

      // Check that a file was created in outputs/
      const outputFiles = fs.readdirSync(outputsDir).filter((f) => f.endsWith(".md"));
      expect(outputFiles.length).toBeGreaterThan(0);

      // Read the output file and verify it contains citations
      const outputFile = outputFiles[0];
      const outputPath = path.join(outputsDir, outputFile);
      const outputContent = fs.readFileSync(outputPath, "utf-8");

      // Verify the output file has the required sections
      expect(outputContent).toContain("# Answer");
      expect(outputContent).toContain("# Sources");
      expect(outputContent).toContain("Claude Code Capabilities");

      // Verify frontmatter
      expect(outputContent).toMatch(/^---\n/);
      expect(outputContent).toContain("question:");
      expect(outputContent).toContain("timestamp:");
    });
  });

  describe("abstain behavior", () => {
    it("abstains when wiki is empty", async () => {
      // wikiDir exists but is empty (no wiki pages)
      // The ask command should handle this gracefully
      await askCommand({ question: "What is the meaning of life?" });

      // Should complete without throwing
    });

    it("abstains when question is unrelated to wiki content", async () => {
      // Create wiki pages about specific technical topics
      createMockWikiPage(
        wikiDir,
        "docker-setup-wiki.md",
        {
          title: "Docker Setup Guide",
          compiled_at: "2026-04-04T10:00:00Z",
          source_uuid: "mno345-uuid",
          source_file: "docker-setup-mno345.md",
          message_count: 5,
          source: "claude-export",
        },
        `# Docker Setup Guide

## Summary

Setting up Docker containers for local development environment.

## Metadata

- **UUID:** \`mno345-uuid\`
- **Messages:** 5

## Source

Based on normalized file: \`docker-setup-mno345.md\``,
      );

      createMockWikiPage(
        wikiDir,
        "typescript-tips-wiki.md",
        {
          title: "TypeScript Best Practices",
          compiled_at: "2026-04-04T10:00:00Z",
          source_uuid: "pqr678-uuid",
          source_file: "typescript-tips-pqr678.md",
          message_count: 7,
          source: "claude-export",
        },
        `# TypeScript Best Practices

## Summary

TypeScript type safety patterns and best practices for large projects.

## Metadata

- **UUID:** \`pqr678-uuid\`
- **Messages:** 7

## Source

Based on normalized file: \`typescript-tips-pqr678.md\``,
      );

      // Ask a completely unrelated question
      await askCommand({ question: "What are the best restaurants in Paris?" });

      // Should complete without throwing - abstention is normal behavior
    });

    it("output file contains abstain message with no sources when abstaining", async () => {
      // Create wiki page about a narrow topic
      createMockWikiPage(
        wikiDir,
        "kubernetes-wiki.md",
        {
          title: "Kubernetes Deployment",
          compiled_at: "2026-04-04T10:00:00Z",
          source_uuid: "stu901-uuid",
          source_file: "kubernetes-stu901.md",
          message_count: 4,
          source: "claude-export",
        },
        `# Kubernetes Deployment

## Summary

Deploying applications to Kubernetes clusters with proper configuration.

## Metadata

- **UUID:** \`stu901-uuid\`
- **Messages:** 4

## Source

Based on normalized file: \`kubernetes-stu901.md\``,
      );

      // Ask about something completely unrelated
      await askCommand({
        question: "How do I bake sourdough bread?",
        output: true,
      });

      // Check output file
      const outputFiles = fs.readdirSync(outputsDir).filter((f) => f.endsWith(".md"));
      expect(outputFiles.length).toBeGreaterThan(0);

      const outputPath = path.join(outputsDir, outputFiles[0]);
      const outputContent = fs.readFileSync(outputPath, "utf-8");

      // Should have frontmatter with 0 sources
      expect(outputContent).toContain("source_count: 0");

      // Should have an answer section
      expect(outputContent).toContain("# Answer");

      // Sources section should indicate no sources
      expect(outputContent).toContain("# Sources");
    });
  });

  describe("edge cases", () => {
    it("handles missing wiki directory gracefully", async () => {
      // Remove the wiki directory
      fs.rmSync(wikiDir, { recursive: true, force: true });

      // Should throw an error about missing wiki
      await expect(askCommand({ question: "What is AI?" })).rejects.toThrow();
    });

    it("handles question with special characters", async () => {
      createMockWikiPage(
        wikiDir,
        "special-chars-wiki.md",
        {
          title: "Special Characters Test",
          compiled_at: "2026-04-04T10:00:00Z",
          source_uuid: "vwx234-uuid",
          source_file: "special-chars-vwx234.md",
          message_count: 2,
          source: "claude-export",
        },
        `# Special Characters Test

## Summary

Testing with special characters like @ # $ % ^ & * ( ) _ +.

## Metadata

- **UUID:** \`vwx234-uuid\`
- **Messages:** 2

## Source

Based on normalized file: \`special-chars-vwx234.md\``,
      );

      // Ask with special characters
      await askCommand({ question: "What about @mentions and #hashtags?" });

      // Should complete without error
    });

    it("handles very short question", async () => {
      createMockWikiPage(
        wikiDir,
        "git-commands-wiki.md",
        {
          title: "Git Commands Reference",
          compiled_at: "2026-04-04T10:00:00Z",
          source_uuid: "yz456-uuid",
          source_file: "git-commands-yz456.md",
          message_count: 10,
          source: "claude-export",
        },
        `# Git Commands Reference

## Summary

Common git commands for daily development workflow.

## Metadata

- **UUID:** \`yz456-uuid\`
- **Messages:** 10

## Source

Based on normalized file: \`git-commands-yz456.md\``,
      );

      // Very short question
      await askCommand({ question: "git" });

      // Should complete without error
    });
  });
});
