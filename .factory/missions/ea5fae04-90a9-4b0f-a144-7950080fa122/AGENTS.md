# AGENTS.md for KB Pipeline

## Mission Boundaries

- CLI-only project, no services
- Off-limits: no external RAG libs, no web UI, keep markdown-first

## Coding Conventions

- CLI commands go in cli/src/commands/kb.ts
- ESM imports with .js extension
- File operations local only

## Baseline Commands

- typecheck: pnpm -r typecheck
- test: pnpm test:run

## Sample Data

C:\Users\holyd\DGDH\worktrees\dgdh-droid-sandbox\company-hq\kb\raw\_samples\claude-export\

## Known Pre-Existing Issues (Do Not Fix)

These issues are unrelated to this mission. Workers and validators should note them but not attempt fixes.

- **Pre-existing test failures**: issue-liveness.test.ts (help text missing 'liveness'), issue-archive-stale-command.test.ts (process.exit unexpectedly called), E2E test failures (Playwright)
- **Pre-existing typecheck errors**: drizzle-orm type mismatches in board-claim.ts, workspace-runtime.ts, auth-bootstrap-ceo.ts - these are type incompatibilities in external dependencies
- **Missing file**: paperclip-runtime-hook-support.mjs appears to be referenced but missing

These failures are in entirely different parts of the codebase (issue-tracking system) and do NOT affect the KB pipeline functionality which was implemented correctly.
