# Architecture

## Knowledge Base Pipeline

The KB pipeline transforms raw chat exports into a retrievable wiki:

1. **Raw Layer** - Immutable source data at `company-hq/kb/raw/`
2. **Normalized Layer** - Parsed/processed data at `company-hq/kb/normalized/`
3. **Wiki Layer** - Compiled wiki pages at `company-hq/kb/wiki/`
4. **Output Layer** - AI-generated summaries at `company-hq/kb/outputs/`

## Components

### CLI Commands (cli/src/commands/kb.ts)
- `kb:ingest --source <path>` - Import Claude exports to raw/
- `kb:compile` - Generate wiki from normalized data
- `kb:output` - Helper for filing outputs

### Normalizer
- Parses `conversations.json` from Claude export
- Produces markdown files with frontmatter metadata
- Extracts: title, uuid, message count, date range

### Wiki Compiler
- Generates `wiki/index.md` with all topics
- Creates individual topic/conversation pages
- Includes source references for traceability

## Data Flow

1. Claude export lands in `kb/raw/<source>/`
2. Normalizer processes -> `kb/normalized/<conversation>.md`
3. Compiler transforms -> `kb/wiki/index.md`, `wiki/topic-*.md`
4. Outputs go to `kb/outputs/YYYY-MM-DD-*.md`

## Boundaries

- No external services
- No network calls
- Pure CLI + file operations
- Markdown-first output
