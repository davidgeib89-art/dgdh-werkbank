import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { compileCommand } from "../commands/kb.js";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

describe("kb compile", () => {
  it("compiles normalized markdown into wiki pages and an index", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-kb-"));
    const repoRoot = path.join(tempRoot, "repo");
    const normalizedDir = path.join(repoRoot, "company-hq", "kb", "normalized");

    await mkdir(normalizedDir, { recursive: true });
    await writeFile(
      path.join(normalizedDir, "hello-world-12345678.md"),
      `---
source: claude-export
imported_at: 2026-04-04T10:00:00.000Z
conversation_uuid: 12345678-abcd-efgh
title: Hello World
message_count: 2
start_date: 2026-04-01T09:00:00.000Z
end_date: 2026-04-01T09:05:00.000Z
---

# Hello World

## Messages

### Message 1

**User** - Apr 1, 2026, 09:00 AM

Hi
`,
      "utf-8",
    );

    process.chdir(repoRoot);
    await compileCommand();

    const wikiPage = await readFile(
      path.join(repoRoot, "company-hq", "kb", "wiki", "hello-world-12345678-wiki.md"),
      "utf-8",
    );
    const wikiIndex = await readFile(
      path.join(repoRoot, "company-hq", "kb", "wiki", "index.md"),
      "utf-8",
    );

    expect(wikiPage).toContain("# Hello World");
    expect(wikiPage).toContain(
      "Based on normalized file: `hello-world-12345678.md`",
    );
    expect(wikiIndex).toContain("# Knowledge Base Wiki");
    expect(wikiIndex).toContain("[Hello World](./hello-world-12345678-wiki.md)");
  });
});
