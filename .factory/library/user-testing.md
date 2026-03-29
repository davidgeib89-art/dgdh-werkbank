# User Testing

## Validation Surface

When validating DGDH/Paperclip work, prefer the narrowest real surface first and state exactly what it proves.

Primary surfaces in this repo:

1. **Package-scoped tests**
   - UI: `pnpm --filter @paperclipai/ui exec vitest run <exact-file>`
   - Server: `pnpm --filter @paperclipai/server exec vitest run <exact-file>`
   - CLI: `pnpm --filter paperclipai exec vitest run <exact-file>`
   - Use this first for bounded code changes.

2. **Package-scoped typecheck**
   - UI: `pnpm --filter @paperclipai/ui typecheck`
   - Server: `pnpm --filter @paperclipai/server typecheck`
   - CLI: `pnpm --filter paperclipai typecheck`
   - Use this before broad workspace validation unless the feature crosses package boundaries.

3. **Paperclip runtime truth**
   - `Invoke-RestMethod http://127.0.0.1:3100/api/health`
   - `Invoke-RestMethod http://127.0.0.1:3100/api/companies`
   - `Invoke-RestMethod http://127.0.0.1:3100/api/companies/<companyId>/agents/triad-preflight`
   - `Invoke-RestMethod http://127.0.0.1:3100/api/issues/<issueId>/company-run-chain`
   - Use these for live state, readiness, issue truth, and triad progress.

4. **Paperclip CLI smoke test**
   - Build first when needed: `pnpm --filter paperclipai build`
   - Then run exact CLI surfaces such as:
     - `pnpm paperclipai runtime status`
     - `pnpm paperclipai triad start --help`
     - `pnpm paperclipai triad status --help`
     - `pnpm paperclipai triad rescue --help`
   - Prefer CLI truth over ad-hoc curl if the CLI is the real operator surface under test.

5. **Browser / operator UI**
   - Use only when the feature is genuinely user-visible or operator-visible in the UI.
   - Always pair UI observations with the backing API truth for the same canonical issue or run.

## Validation Order

Use this order by default:

1. exact package tests
2. exact package typecheck
3. live API truth if runtime behavior matters
4. CLI smoke path if the CLI is part of the feature
5. browser validation only for real visible UI claims
6. broad workspace validation only if scope honestly requires it

Do not jump straight to `pnpm test:run` or browser work for a small bounded change.

## Windows / PowerShell Rule

- Prefer `Invoke-RestMethod` over `curl -sf`
- Prefer PowerShell-native commands over Unix shell snippets
- Use `http://127.0.0.1:3100` consistently for local trusted runtime checks

## Paperclip Runtime Rule

When validating a live triad or issue flow:

- Treat mission prose IDs as illustrative until live API truth confirms the canonical ID
- Re-anchor to the current canonical issue ID before each validation step
- `triad-preflight` alone is not enough for a live-proof claim; if the proof depends on active agents, verify real heartbeats / actual execution truth too
- If runtime truth contradicts the mission assumptions, stop and report that contradiction rather than continuing with stale IDs

## Honest Reporting Rule

Every validation result must clearly say:
- which exact command was run
- what it proved
- what remains unproven
- whether the outcome is `passed`, `failed`, `blocked`, or `not_testable`

Never report broad green confidence from narrow commands.
Never mark user-surface behavior as proven if only tests passed but the live UI or runtime path was not exercised.
