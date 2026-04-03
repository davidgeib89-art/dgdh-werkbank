---
name: kb-worker
description: Implements KB infrastructure, ingest, normalize, compile, and output features
---

# KB Worker Skill

## When to Use This Skill

This skill is used for implementing knowledge-base pipeline features:
- Creating KB folder structure (raw/, normalized/, wiki/, outputs/)
- Building kb:ingest CLI command for Claude exports
- Creating normalization scripts
- Building kb:compile CLI command
- Adding output path convention and helper

## Required Skills

None required for this skill - standard file operations and CLI.

## Work Procedure

1. **Read the feature specification** from features.json to understand what's required

2. **KB Structure Feature:**
   - Create `company-hq/kb/` directory structure:
     - `company-hq/kb/raw/` - immutable source data
     - `company-hq/kb/normalized/` - processed conversation data
     - `company-hq/kb/wiki/` - compiled wiki pages
     - `company-hq/kb/outputs/` - AI-generated outputs
   - Verify directories exist

3. **KB Ingest CLI Feature:**
   - Create CLI command in `cli/src/commands/kb.ts` with subcommands:
     - `kb:ingest --source <path>` - copy Claude export files to raw/
   - Create manifest file with metadata (source, imported_at, original_path)
   - Validate source has required files (conversations.json)
   - Test with sample data

4. **Normalization Feature:**
   - Parse Claude conversations.json
   - Create normalized markdown files in `company-hq/kb/normalized/`
   - Include frontmatter: source, imported_at, conversation_uuid, date range
   - Extract title, message count, dates

5. **KB Compile Feature:**
   - Create `kb:compile` CLI subcommand
   - Generate `wiki/index.md` with all conversation titles/dates
   - Generate individual topic pages in `wiki/`
   - Include source reference in frontmatter

6. **Output Path Feature:**
   - Create `kb:output` helper or convention for outputs/
   - Output files follow pattern: `outputs/YYYY-MM-DD-question.md`
   - Include frontmatter with date and source questions

7. **Verification:**
   - Run each feature with sample data
   - Verify output files exist with expected content
   - Test error handling for invalid inputs
   - Run `pnpm -r typecheck` to verify no TS errors

## Example Handoff

```json
{
  "salientSummary": "Created KB folder structure, kb:ingest CLI command, normalization script, kb:compile command.",
  "whatWasImplemented": "company-hq/kb/ directory with raw/normalized/wiki/outputs/, kb:ingest CLI with source validation, normalization to markdown, kb:compile to wiki pages, output path convention",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "ls company-hq/kb/", "exitCode": 0, "observation": "4 directories exist" },
      { "command": "pnpm paperclipai kb:ingest --help", "exitCode": 0, "observation": "shows ingest command" },
      { "command": "test -f company-hq/kb/normalized/*.md", "exitCode": 0, "observation": "normalized files exist" },
      { "command": "ls company-hq/kb/wiki/", "exitCode": 0, "observation": "index.md and topic pages exist" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- If CLI build fails and cannot be fixed
- If feature requirements are ambiguous
- If sample data is inaccessible
- If validation assertions cannot be met
