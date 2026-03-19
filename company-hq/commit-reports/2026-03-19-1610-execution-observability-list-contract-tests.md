# Sprint Reflection: Execution Observability List Contract Tests

Date: 2026-03-19
Author: GitHub Copilot
Mode: Single-pass sprint, no interim reflection loops

## Goal

Den verbleibenden Execution-Observability-Read-Block per Contract-Tests absichern:

- GET /api/companies/:companyId/heartbeat-runs
- GET /api/issues/:issueId/live-runs

Zusammen mit den bereits vorhandenen Live-Read-Contracts ist der operator-relevante Read-Surface-Block damit im Kern geschlossen.

Scope eingehalten:

- Nur Payload-Stabilität
- Empty-/Null-State
- Additive Kompatibilität
- Keine Logikänderung

## Implemented

Updated:

- server/src/**tests**/live-execution-read-surfaces-contract.test.ts

Erweiterungen in dieser Datei:

1. /companies/:companyId/heartbeat-runs

- empty-state contract (`[]`)
- additive payload contract
- query normalization contract (`limit` clamp to 1000, agentId passthrough) über Mock-Call-Assertion

2. /issues/:issueId/live-runs

- empty-state contract (`[]`)
- additive payload contract inkl. nullable `finishedAt`

## Full test surface now covered in this file

- /companies/:companyId/heartbeat-runs
- /companies/:companyId/live-runs
- /heartbeat-runs/:runId
- /heartbeat-runs/:runId/events
- /heartbeat-runs/:runId/log
- /issues/:issueId/live-runs
- /issues/:issueId/active-run (optional path included)

## Validation

- Test run:
  - pnpm --filter @paperclipai/server exec vitest src/**tests**/live-execution-read-surfaces-contract.test.ts --run
  - Result: 12/12 passed
- Typecheck:
  - pnpm --filter @paperclipai/server typecheck
  - Result: green

## Operator impact

- Execution observability read endpoints are contract-guarded against response-shape regressions.
- This directly supports David's live operator stability goal with no behavior changes.

## Suggested commit message

test(server): add contract coverage for heartbeat-runs and issue live-runs lists
