# User Testing

## Validation Surface

This mission's testable surfaces are:

1. **Unit tests (Vitest)** — primary surface for all assertions. All behavioral changes are verified through unit tests with mocked DB/service dependencies. No integration test server is started.
   - Tool: `pnpm vitest run <file>` or `pnpm test:run`
   - Auth: not required (mocked)

2. **CLI smoke test** — for VAL-CROSS-005: run `pnpm paperclipai triad status <id>` against the live server on port 3100.
   - Tool: shell command + `curl`
   - Auth: not required for local trusted deployment
   - The server is already running — no startup needed

3. **Static assertion** — for VAL-SCHED-001 / VAL-CROSS-001: confirm `scanAndRetryReviewerWakes` appears in `server/src/index.ts` scheduler block.
   - Tool: `grep` or file read

## Validation Concurrency

- **Unit tests:** Tests are isolated via Vitest. Full suite (`pnpm test:run`) runs all 154+ files. On this machine (16 cores, 32 GB RAM, 5% baseline CPU), Vitest can run with default parallelism safely.
- **CLI smoke test:** Single invocation, negligible resource cost.
- Max concurrent validators: 5 (unit-test surface is low-cost per validator).

## Isolation Approach

Unit tests use in-process mocks (`vi.fn()`, `vi.mock()`). No shared state between test files. No test server process needed.

## Known Pre-existing Issues

9 revenue pipeline test failures (Windows `.tmp` directory missing) — fixed in milestone 1 feature `fix-windows-tmp-test-failures`. If milestone 1 is not yet complete when validating, these 9 failures are expected and should be noted but not treated as regressions.

## Triad Status CLI Test

For VAL-CROSS-005, the validator should:
1. Confirm `curl -sf http://localhost:3100/api/health` returns `status: "ok"`
2. Run `pnpm paperclipai triad status --help` and confirm it exits 0
3. Optionally, call the actual endpoint: `curl -s http://localhost:3100/api/health | python -c "import json,sys; d=json.load(sys.stdin); print(d)"` to get a company ID, then test against a real issue if one is available

The CLI smoke test is intentionally lightweight — the unit tests (VAL-CLI-001 through VAL-CLI-006) provide the behavioral guarantee.
