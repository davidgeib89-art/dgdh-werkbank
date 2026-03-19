# Sprint Reflection: Live-Execution Read Surface Contract Tests

Date: 2026-03-19
Author: GitHub Copilot
Mode: Single-pass sprint, no interim reflection loops

## Goal

Payload-Stabilität der Live-Operator-Read-Surfaces absichern:

- GET /api/companies/:companyId/live-runs
- GET /api/heartbeat-runs/:runId
- GET /api/heartbeat-runs/:runId/events
- GET /api/heartbeat-runs/:runId/log
- optional: GET /api/issues/:issueId/active-run

Scope eingehalten:

- Nur Contract-Tests
- Null-/Empty-State enthalten
- Additive Kompatibilität geprüft
- Keine Logikänderung

## Implemented

Added:

- server/src/**tests**/live-execution-read-surfaces-contract.test.ts

## Covered contracts

1. /companies/:companyId/live-runs

- empty-state returns []
- additive payload contract for live rows
- minCount fallback path validated (active + recent merge)
- nullable field handling (finishedAt) explicitly guarded

2. /heartbeat-runs/:runId

- stable object payload shape (including additive passthrough fields)

3. /heartbeat-runs/:runId/events

- empty-state returns []
- payload contract with sensitive-key redaction preserved

4. /heartbeat-runs/:runId/log

- stable log payload shape (content/offsets/truncation)
- additive fields preserved

5. /issues/:issueId/active-run (optional, included)

- null-state returns null
- populated-state returns run with attached agent identity fields

## Validation

- Test run:
  - pnpm --filter @paperclipai/server exec vitest src/**tests**/live-execution-read-surfaces-contract.test.ts --run
  - Result: 8/8 passed
- Typecheck:
  - pnpm --filter @paperclipai/server typecheck
  - Result: green

## Operator impact

- Live execution visibility paths are now protected against response-shape regressions.
- This directly hardens David's live operator view with contract safety at route boundary.

## Suggested commit message

test(server): add contract tests for live execution read surfaces
