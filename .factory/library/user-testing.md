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

## Validation gate (David adjustment)

Required gate: targeted test files pass. Full pnpm test:run is secondary.
Use `pnpm vitest run server/src/__tests__/<file>.test.ts` for targeted runs.

## Live-proof milestone

The final milestone (live-proof) attempts a bounded live triad rerun against the actual Paperclip runtime. The worker for this feature:
1. Checks if server is running on port 3100 (GET /api/health or /api/companies)
2. If running and agents are free: creates a bounded parent issue and assigns to CEO
3. Observes via company-run-chain and active-run
4. Records outcome (run IDs or specific blocker) in CURRENT.md
No browser automation needed. Pure API calls via curl or PowerShell Invoke-RestMethod.

## Known test quirks

- `gemini-local-execute.test.ts` has 9 intentionally skipped tests — not a failure
- Total baseline: 143 files, 729 passed, 9 skipped
- After this mission: expect 144+ files (1 new test file)
