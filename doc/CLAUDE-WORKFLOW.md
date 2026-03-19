# Workflow — DGDH Werkbank

## Common Commands

From `worktrees/dgdh-werkbank`:

```bash
pnpm dev              # API + UI, watch mode
pnpm dev:once         # Single-pass dev (NO watch) — for heartbeat/memory verification
pnpm dev:server       # Server only
pnpm build            # Build all packages
pnpm typecheck        # Type-check all packages
pnpm test:run         # Run all tests (vitest run)

# Server package
pnpm --filter @paperclipai/server typecheck
pnpm --filter @paperclipai/server exec vitest --run

# Single test file
pnpm --filter @paperclipai/server exec vitest src/__tests__/heartbeat-governance.test.ts --run

# DB
pnpm db:generate       # Generate migrations
pnpm db:migrate        # Apply migrations
```

## Dev Notes

- **Use `pnpm dev:once` for heartbeat/memory verification** — watch mode can orphan running agent processes
- Embedded PostgreSQL auto-starts when `DATABASE_URL` is unset (data at `~/.paperclip/instances/default/db`)
- Worktree instances auto-load `.paperclip/.env` — no manual env setup needed inside worktree

## Testing

- Tests: `server/src/__tests__/*.test.ts`
- Vitest workspace projects: `packages/db`, `packages/adapters/opencode-local`, `server`, `ui`, `cli`
- Contract tests use supertest against Express app with mocked DB/service layers
- **Avoid real adapter/agent calls in tests** unless explicitly required — prefer mocks, dry harnesses, contract tests
- **Governance/approval flows**: use `process.env.GOVERNANCE_TEST_MODE = "true"` to enable dry-run validation helpers

## TypeScript / Build

- Root `tsconfig.json` with composite project references
- Build order: shared packages → plugin-sdk → server → cli → ui
- `pnpm typecheck` chains `build` of dependencies before `tsc --noEmit`
- Server source uses `tsx src/index.ts` runtime (not compiled dist)

## Sprint Reports

- Location: `company-hq/commit-reports/YYYY-MM-DD-name-sprint.md`
- Format: what was built, validation results, invariants preserved, what was not touched and why
- One report per sprint, named after the sprint goal

## MCP Tools (MorphLLM)

Use these instead of Bash sed/echo for file operations.

### `edit_file` — Primary File Editing
```json
{ "path": "server/src/services/heartbeat.ts", "code_edit": "  // ... existing code ...\n  newLine();", "instruction": "Add newLine() after existing code" }
```
- `// ... existing code ...` = unchanged block placeholder
- Preserve exact indentation (tool matches line prefix)
- Include just enough context to locate uniquely

### `codebase_search` — Codebase Exploration
```
search_string: "Where does routing preflight block adapter execution?"
repo_path: "C:/Users/holyd/DGDH/worktrees/dgdh-werkbank"
```
Best for: "Find the XYZ flow", "How does X work", "Trace the blocked→execution path"

### `github_codebase_search` — GitHub Repo Search
```
search_string: "How does quota snapshot stale detection work?"
github_url: "https://github.com/anthropic/claude-code"
```

### When to Use
| Goal | Tool |
|------|------|
| Explore unfamiliar code | `codebase_search` |
| Edit files | `edit_file` |
| Research external libs | `github_codebase_search` |
| Read specific files | `Read` tool |
