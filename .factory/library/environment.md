# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Runtime

- Platform: Windows (win32), PowerShell is the shell
- Node: >=20 (pnpm workspace)
- Package manager: pnpm@9.15.4
- TypeScript strict mode

## Test runner

- Vitest
- Command: `pnpm test:run` (all tests once, no watch mode)
- Single file: `pnpm vitest run server/src/__tests__/<file>.test.ts`
- Baseline: 143 test files, 729 tests, 9 skipped (expected)

## No external services needed for tests

All tests use mocked dependencies via `vi.mock`. No database or server instance is required for running unit tests.

## Typecheck

- Command: `pnpm -r typecheck`
- Must pass with zero errors before any commit

## Key file locations

- Server source: `server/src/`
- Server tests: `server/src/__tests__/`
- Role templates: `server/config/role-templates/`
- Shared types: `packages/shared/src/types/`
- Heartbeat service: `server/src/services/heartbeat.ts` (5382 lines, monolithic)
- Issues route: `server/src/routes/issues.ts`
