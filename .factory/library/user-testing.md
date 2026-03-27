# User Testing

## Validation Surface

This mission's validation surface is exclusively **API-level unit and integration tests** using Vitest with mocked dependencies.

No browser automation (agent-browser) needed.
No server startup needed.
No database seeding needed.

All assertions are verified via:
1. `pnpm test:run` — full suite baseline (143+ files)
2. `pnpm vitest run server/src/__tests__/<specific-file>.test.ts` — targeted file tests
3. `pnpm -r typecheck` — TypeScript type correctness

## Validation Concurrency

Single-threaded test run. No concurrency concerns. The Vitest runner handles parallelism internally.

Max concurrent validators: 1 (all via `pnpm test:run`).

## Test files relevant to this mission

- `server/src/__tests__/issue-worker-done-route.test.ts` (extend)
- `server/src/__tests__/heartbeat-reviewer-wake-retry.test.ts` (new)
- `server/src/__tests__/issue-company-run-chain-route.test.ts` (extend)

## Known test quirks

- `gemini-local-execute.test.ts` has 9 intentionally skipped tests — not a failure
- Total baseline: 143 files, 729 passed, 9 skipped
- After this mission: expect 144+ files (1 new test file)
