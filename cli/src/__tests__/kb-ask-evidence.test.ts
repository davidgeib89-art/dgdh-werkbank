import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";

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

// Mock fs and path
vi.mock("node:fs", () => ({
  promises: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

// Import the module under test (functions will be tested via the command)
describe("kb ask evidence-loader", () => {
  const mockWikiDir = "/test/company-hq/kb/wiki";
  const mockNormalizedDir = "/test/company-hq/kb/normalized";
  const mockOutputsDir = "/test/company-hq/kb/outputs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("wiki routing (findRelevantWikiPages)", () => {
    it("should find wiki pages matching question keywords", async () => {
      // Mock wiki directory contents
      const mockWikiFiles = [
        { name: "claude-code-usage-limits-abc123-wiki.md", isFile: () => true, isDirectory: () => false },
        { name: "claude-code-installation-xyz789-wiki.md", isFile: () => true, isDirectory: () => false },
        { name: "random-topic-123456-wiki.md", isFile: () => true, isDirectory: () => false },
      ];

      vi.mocked(fs.readdir).mockResolvedValueOnce(mockWikiFiles as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      // Mock wiki file contents
      const usageWikiContent = `---
title: Claude Code Usage Limits
source_file: claude-code-usage-limits-abc123.md
message_count: 4
---

# Claude Code Usage Limits

## Summary

In Claude Code steh jetzt Approaching 5 Hour limit.
`;

      const installWikiContent = `---
title: Claude Code Installation in WSL
source_file: claude-code-installation-xyz789.md
message_count: 6
---

# Claude Code Installation in WSL

## Summary

How to install Claude Code in WSL.
`;

      const randomWikiContent = `---
title: Random Topic
source_file: random-topic-123456.md
message_count: 2
---

# Random Topic

## Summary

Something unrelated.
`;

      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(usageWikiContent)
        .mockResolvedValueOnce(installWikiContent)
        .mockResolvedValueOnce(randomWikiContent);

      // Import and test the function
      const { findRelevantWikiPages } = await import("../../src/commands/kb.js");
      const results = await findRelevantWikiPages(mockWikiDir, "Claude Code usage limits", 5);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe("Claude Code Usage Limits");
      expect(results[0].sourceFile).toBe("claude-code-usage-limits-abc123.md");
      expect(results[1].title).toBe("Claude Code Installation in WSL");
    });

    it("should return empty array when no matches found", async () => {
      const mockWikiFiles = [
        { name: "unrelated-topic-123456-wiki.md", isFile: () => true, isDirectory: () => false },
      ];

      vi.mocked(fs.readdir).mockResolvedValueOnce(mockWikiFiles as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const unrelatedContent = `---
title: Unrelated Topic
source_file: unrelated-123456.md
message_count: 2
---

# Unrelated Topic

## Summary

Something completely different.
`;

      vi.mocked(fs.readFile).mockResolvedValueOnce(unrelatedContent);

      const { findRelevantWikiPages } = await import("../../src/commands/kb.js");
      const results = await findRelevantWikiPages(mockWikiDir, "quantum physics", 5);

      expect(results).toHaveLength(0);
    });

    it("should validate source_file reference in wiki frontmatter", async () => {
      const mockWikiFiles = [
        { name: "test-wiki.md", isFile: () => true, isDirectory: () => false },
      ];

      vi.mocked(fs.readdir).mockResolvedValueOnce(mockWikiFiles as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const wikiContent = `---
title: Test Wiki Page
source_file: test-source-file.md
message_count: 3
---

# Test Wiki Page

## Summary

This is a test.
`;

      vi.mocked(fs.readFile).mockResolvedValueOnce(wikiContent);

      const { findRelevantWikiPages } = await import("../../src/commands/kb.js");
      const results = await findRelevantWikiPages(mockWikiDir, "test", 5);

      expect(results).toHaveLength(1);
      expect(results[0].sourceFile).toBe("test-source-file.md");
    });
  });

  describe("normalized source loading (loadNormalizedFile)", () => {
    it("should load normalized file referenced by wiki page", async () => {
      const normalizedContent = `---
source: claude-export
imported_at: 2026-04-03T15:03:23.396Z
conversation_uuid: 6e56eaf5-d575-4b81-81f0-b71ad710d951
title: Claude Code Usage Limits
message_count: 4
---

# Claude Code Usage Limits

## Messages

### Message 1

**User** · Aug 29, 2025, 08:27 AM

In Claude Code steh jetzt Approaching 5 Hour limit.
`;

      vi.mocked(fs.readFile).mockResolvedValueOnce(normalizedContent);

      const { loadNormalizedFile } = await import("../../src/commands/kb.js");
      const result = await loadNormalizedFile(mockNormalizedDir, "claude-code-usage-limits.md");

      expect(result.exists).toBe(true);
      expect(result.content).toBe(normalizedContent);
      expect(result.error).toBeUndefined();
    });

    it("should handle missing normalized file gracefully", async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("ENOENT: file not found"));

      const { loadNormalizedFile } = await import("../../src/commands/kb.js");
      const result = await loadNormalizedFile(mockNormalizedDir, "missing-file.md");

      expect(result.exists).toBe(false);
      expect(result.content).toBe("");
      expect(result.error).toContain("ENOENT");
    });

    it("should extract messages from normalized content", async () => {
      const normalizedContent = `---
title: Test Conversation
message_count: 2
---

# Test Conversation

## Messages

### Message 1

**User** · Aug 29, 2025, 08:27 AM

First user message here.

### Message 2

**Assistant** · Aug 29, 2025, 08:28 AM

Assistant response here.
`;

      const { extractMessagesFromNormalized } = await import("../../src/commands/kb.js");
      const messages = extractMessagesFromNormalized(normalizedContent);

      expect(messages).toHaveLength(2);
      expect(messages[0].sender).toBe("User");
      expect(messages[0].text).toBe("First user message here.");
      expect(messages[1].sender).toBe("Assistant");
      expect(messages[1].text).toBe("Assistant response here.");
    });
  });

  describe("answer generation (buildAnswerFromEvidence)", () => {
    it("should build answer from extracted evidence", async () => {
      const evidence = [
        {
          sourceFile: "claude-code-usage-limits.md",
          title: "Claude Code Usage Limits",
          snippets: ["In Claude Code steh jetzt Approaching 5 Hour limit.", "Also alle 5 Stunden wird das resettet."],
          messageCount: 4,
        },
      ];

      const { buildAnswerFromEvidence } = await import("../../src/commands/kb.js");
      const result = buildAnswerFromEvidence("Claude Code usage limits", evidence);

      expect(result.answer).toBeTruthy();
      expect(result.answer).toContain("5 Hour limit");
      expect(result.abstainReason).toBeUndefined();
    });

    it("should abstain when no evidence available", async () => {
      const { buildAnswerFromEvidence } = await import("../../src/commands/kb.js");
      const result = buildAnswerFromEvidence("unrelated question", []);

      expect(result.answer).toBeNull();
      expect(result.abstainReason).toBeTruthy();
      expect(result.abstainReason).toContain("No relevant content");
    });

    it("should abstain when evidence has no relevant snippets", async () => {
      const evidence = [
        {
          sourceFile: "some-file.md",
          title: "Some File",
          snippets: [],
          messageCount: 4,
        },
      ];

      const { buildAnswerFromEvidence } = await import("../../src/commands/kb.js");
      const result = buildAnswerFromEvidence("question", evidence);

      expect(result.answer).toBeNull();
      expect(result.abstainReason).toContain("no matching content");
    });
  });

  describe("citation behavior", () => {
    it("should cite normalized files, not wiki files", async () => {
      const evidence = [
        {
          sourceFile: "claude-code-usage-limits.md",
          title: "Claude Code Usage Limits",
          snippets: ["Usage limit is 5 hours."],
          messageCount: 4,
        },
      ];

      const { formatOutputForFile } = await import("../../src/commands/kb.js");
      const result = formatOutputForFile({
        question: "What is the usage limit?",
        answer: "The usage limit is 5 hours.",
        evidence,
        timestamp: "2026-04-04T12:00:00Z",
      });

      // Should reference normalized file (.md, not -wiki.md)
      expect(result).toContain("claude-code-usage-limits.md");
      expect(result).not.toContain("claude-code-usage-limits-wiki.md");
    });
  });

  describe("output formatting", () => {
    it("should format output with evidence section", async () => {
      const evidence = [
        {
          sourceFile: "test-source.md",
          title: "Test Source",
          snippets: ["Snippet 1", "Snippet 2"],
          messageCount: 3,
        },
      ];

      const { formatOutputForFile } = await import("../../src/commands/kb.js");
      const result = formatOutputForFile({
        question: "Test question?",
        answer: "Test answer.",
        evidence,
        timestamp: "2026-04-04T12:00:00Z",
      });

      expect(result).toContain("# Question");
      expect(result).toContain("Test question?");
      expect(result).toContain("# Answer");
      expect(result).toContain("Test answer.");
      expect(result).toContain("# Evidence");
      expect(result).toContain("# Sources");
      expect(result).toContain("test-source.md");
    });

    it("should include frontmatter with metadata", async () => {
      const { formatOutputForFile } = await import("../../src/commands/kb.js");
      const result = formatOutputForFile({
        question: "Test?",
        answer: "Answer.",
        evidence: [],
        timestamp: "2026-04-04T12:00:00Z",
      });

      const frontmatterMatch = result.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).toBeTruthy();

      const frontmatter = parseFrontmatterBlock(frontmatterMatch![1]);
      expect(frontmatter.question).toBe("Test?");
      expect(frontmatter.timestamp).toBe("2026-04-04T12:00:00Z");
      expect(frontmatter.source_count).toBe(0);
    });
  });

  describe("abstention behavior", () => {
    it("should abstain when no wiki content matches", async () => {
      const { formatOutputForFile } = await import("../../src/commands/kb.js");
      const result = formatOutputForFile({
        question: "Quantum physics?",
        answer: null,
        evidence: [],
        abstainReason: "No relevant content found.",
        timestamp: "2026-04-04T12:00:00Z",
      });

      expect(result).toContain("_No answer could be generated");
      expect(result).toContain("No relevant content found.");
      expect(result).toContain("abstained: true");
    });

    it("should abstain when normalized sources unavailable", async () => {
      const { formatOutputForFile } = await import("../../src/commands/kb.js");
      const result = formatOutputForFile({
        question: "Test?",
        answer: null,
        evidence: [],
        abstainReason: "Normalized sources unavailable.",
        timestamp: "2026-04-04T12:00:00Z",
      });

      expect(result).toContain("_No answer could be generated");
      expect(result).toContain("Normalized sources unavailable.");
    });
  });
});
