# User Testing

## Validation Surface

**Surface Type**: Unit tests (command-line)

**How to Test:**
1. Run `pnpm vitest run packages/shared` to execute shared package tests
2. Tests output shows pass/fail status for each test case

**Entry Point:**
- Test file: `packages/shared/src/validators/issue.test.ts`
- Run command: `pnpm vitest run packages/shared`

## Resource Cost Classification

**Lightweight** - Unit tests run quickly with minimal resource usage.
- Estimated time: <5 seconds for shared package tests
- Memory: Negligible (<100MB)
- Max concurrent validators: N/A (unit tests, no parallel UI sessions needed)

## Known Constraints

- Shared package not currently in vitest workspace
- Need to create `vitest.config.ts` for the package
- Tests will use Vitest's default configuration

## Closeout Rule

This file describes the user-testing surface only when a mission actually includes user-testing work.

- If no explicit user-testing feature exists in `features.json`, user testing is **unverified**, not implicitly passed
- A completed implementation feature or scrutiny pass does not automatically mean user-testing passed
- If `validation-state.json` remains `pending`, the mission must not claim that all validation assertions are fulfilled
- `validation-state.json` may not be rewritten to `passed` from narrative confidence alone; it must reflect actual validator execution truth
