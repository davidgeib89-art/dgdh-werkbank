# User Testing

## Validation Surface

This mission touches:
- File system (KB folders: raw/, normalized/, wiki/, outputs/)
- CLI commands (kb:ingest, kb:compile, kb:output)

## Testing Approach

CLI-based validation (no browser/TUI):
- File existence checks for KB directories
- CLI command invocation with exit code verification
- Content verification of generated markdown files

## Resource Cost

- This is a lightweight CLI-only mission
- No external services required
- Single-threaded operations
- Max concurrent validators: 1

## Sample Data

Claude export sample location:
- `C:\Users\holyd\DGDH\worktrees\dgdh-werkbank\company-hq\kb\raw\_samples\claude-export\`
- Files: conversations.json, projects.json, users.json

Note: The sample data is now located within the werkbank repo itself, not sandbox.

## Validation Concurrency

- Node.js worker threads: CLI commands spawn Node processes but complete synchronously
- No parallel test runners needed
- Max concurrent validators: 1 (as stated above)

## Flow Validator Guidance: CLI

### Isolation Boundaries

- **Shared State**: All validators share the same `company-hq/kb/` directory tree
- **Read-only operations**: KB structure checks (VAL-KB-001) do not modify state
- **Write operations**: Ingest operations write to `company-hq/kb/raw/<source-name>/`
- **Interference risk**: Low - each ingest operation writers to a unique subdirectory based on source name
- **Concurrent safety**: Multiple ingest tests can run concurrently IF they use different source paths

### Resource Constraints

- Disk I/O is the primary resource (copying JSON files)
- Memory and CPU usage are minimal
- No network ports or background services required

### Test Execution Sequence

For kb-infrastructure milestone, test assertions in this order:
1. VAL-KB-001: Verify folder structure exists (read-only)
2. VAL-INGEST-001: Test ingest with sample data (writes to raw/)
3. VAL-INGEST-002: Verify metadata in manifest.json (read-only)
4. VAL-INGEST-003: Re-verify ingest succeeds (may need --force for existing data)
5. VAL-INGEST-004: Test ingest with invalid source (no conversations.json)

### CLI Commands

Run commands from repo root:
```bash
# Check folder structure
ls company-hq/kb/

# Run ingest with sample data
pnpm paperclipai kb:ingest --source company-hq/kb/raw/_samples/claude-export

# For re-runs (if destination exists)
pnpm paperclipai kb:ingest --source company-hq/kb/raw/_samples/claude-export --force

# Test invalid source
pnpm paperclipai kb:ingest --source /tmp/nonexistent
```

### Evidence Collection

- **VAL-KB-001**: Screenshot or `ls` output showing 4 directories
- **VAL-INGEST-001**: Exit code 0 and files listed in raw/<source>/
- **VAL-INGEST-002**: Content of manifest.json with required fields
- **VAL-INGEST-003**: Exit code 0 on valid sample data
- **VAL-INGEST-004**: Error message when source lacks conversations.json
