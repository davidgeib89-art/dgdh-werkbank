---
name: triad-hardening-worker
description: Hardens triad packet truth emission and reviewer-wait closeout visibility
---

# Triad Hardening Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features that touch `triad start` CLI description emission (`buildTriadDescription`), artifactKind inference from targetFile/targetFolder, or reviewer-wait blocker visibility in the company-run-chain / worker-done / reviewer-verdict closeout path.

## Required Skills

None - standard unit testing with vitest and supertest.

## Work Procedure

### Phase 1: Understand

1. Read `mission.md` and `AGENTS.md` for mission boundaries and constraints.
2. Read the existing test file(s) and source files named in the feature description to understand current behavior.

### Phase 2: Implement (TDD)

1. **Write tests FIRST** (red): Add test cases for the new behavior in the existing test file. Tests must fail before implementation.
2. **Implement** (green): Make minimal code changes to make the new tests pass. Do not refactor or clean up unrelated code.
3. **Verify existing tests pass**: Run the full existing test file to ensure no regressions.

### Phase 3: Verify

1. Run `pnpm vitest run <test-file-path>` and confirm all tests pass (exit code 0).
2. Run `pnpm --filter @paperclipai/server typecheck` for server changes, or `pnpm --filter paperclipai typecheck` for CLI changes.
3. Verify the change is minimal and bounded - no unrelated files modified.

## Packet Truth Changes (Milestone 1)

When working on packet truth:

- Add a `inferArtifactKindFromTarget` helper in `cli/src/commands/client/triad.ts` that maps a targetFile extension (or targetFolder-only signal) to an artifactKind value.
- The mapping must match the server's `inferArtifactKindFromTargetFile` behavior in `server/src/services/issue-execution-packet.ts`:
  - `*.test.*`, `*.spec.*`, `__tests__/` → `test_update`
  - `.md`, `.mdx`, `.txt`, `.rst`, `.adoc`, `readme.`, `runbook.`, `plan.`, `spec.` → `doc_update`
  - `.json`, `.yaml`, `.yml`, `.toml`, `.ini`, `.env`, `.conf`, `config.`, `settings.`, `policy.` → `config_change`
  - Code extensions (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`, etc.) → `code_patch`
  - `--target-folder` only (no `--target-file`) → `multi_file_change`
- Replace the hardcoded `lines.push("artifactKind: code_patch")` with a call to the inference helper.
- Do NOT add a new `--artifact-kind` CLI flag. This feature is about safe default inference, not optionality.
- Update the existing test that asserts `artifactKind: code_patch` to use a code file target (e.g., `src/auth.ts`).
- Add new tests for: doc_update from `.md`, config_change from `.json`, test_update from `.test.ts`, multi_file_change from folder-only.

## Closeout Blocker Changes (Milestone 2)

When working on closeout blocker:

- Add a `reviewer-wait` closeout blocker type that appears when:
  - Issue status is `in_review`
  - A `issue.worker_done_recorded` activity exists
  - No reviewer run has started (no `heartbeatRuns` for reviewer agent)
  - The reviewer has not been successfully woken yet
- The blocker record is computed from the existing activity + run data in the company-run-chain endpoint - it does not require a new database table or persistent storage. It is derived truth, not stored state.
   - When `buildCompanyRunChainBlocker(runs)` finds a blocked run for reviewer-wake, it already handles post-tool-capacity. Extend this path to also recognize the reviewer-wait scenario.
   - Alternatively: compute reviewer-wait in `buildCompanyRunChainTriadTruth` by checking if `workerDoneAt` exists but no reviewer run exists and no reviewer-verdict activity exists.
- The blocker clears when:
  - A reviewer run appears in the runs list (any status: queued, running, completed)
  - A reviewer-verdict activity is recorded
- Add tests for:
  - closeoutBlocker is null on happy path (reviewer run exists)
  - closeoutBlocker shows reviewer-wait when in_review with no reviewer run
  - closeoutBlocker is null after reviewer-verdict recorded

## Example Handoff

```json
{
  "salientSummary": "Replaced hardcoded artifactKind: code_patch in triad start with file-extension inference matching server-side logic; added reviewer-wait blocker to company-run-chain closeout truth; all existing tests pass.",
  "whatWasImplemented": "Added inferArtifactKind helper to CLI buildTriadDescription that maps targetFile extensions to artifactKind (doc_update, config_change, test_update, code_patch) and defaults to multi_file_change for folder-only packets. Added reviewer-wait closeout blocker detection in buildCompanyRunChainTriadTruth. Updated existing test assertions.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm vitest run cli/src/__tests__/triad-start-command.test.ts", "exitCode": 0, "observation": "8 passing (was 7, added 1 new artifactKind test)" },
      { "command": "pnpm vitest run server/src/__tests__/issue-company-run-chain-route.test.ts", "exitCode": 0, "observation": "12 passing (added 2 reviewer-wait blocker tests)" },
      { "command": "pnpm --filter paperclipai typecheck", "exitCode": 0, "observation": "no type errors" },
      { "command": "pnpm --filter @paperclipai/server typecheck", "exitCode": 0, "observation": "no type errors" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "cli/src/__tests__/triad-start-command.test.ts", "cases": [
        { "name": "infers doc_update from .md targetFile", "verifies": "artifactKind matches server-side type mapping for documentation files" },
        { "name": "infers config_change from .json targetFile", "verifies": "artifactKind matches server-side type mapping for config files" },
        { "name": "infers test_update from .test.ts targetFile", "verifies": "artifactKind matches server-side type mapping for test files" },
        { "name": "emits multi_file_change for folder-only packet", "verifies": "artifactKind defaults to multi_file_change when no targetFile" }
      ]},
      { "file": "server/src/__tests__/issue-company-run-chain-route.test.ts", "cases": [
        { "name": "closeoutBlocker shows reviewer-wait when in_review with no reviewer run", "verifies": "reviewer-wait blocker appears in triad truth" },
        { "name": "closeoutBlocker is null after reviewer-verdict", "verifies": "reviewer-wait blocker clears on verdict" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Typecheck fails after implementation attempt (return with error details)
- Existing tests break in a way that indicates the change conflicts with broader server-side contract (not just one stale assertion)
- The change would require modifying the shared schema/types in `packages/shared` in a non-trivial way
- The closeout blocker pattern would benefit from a stored persistent record rather than derived truth (architectural judgment call)
