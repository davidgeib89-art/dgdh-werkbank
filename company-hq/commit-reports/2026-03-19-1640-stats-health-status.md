# Sprint Reflection - healthStatus in /stats

Date: 2026-03-19
Scope: Top-level healthStatus signal combining budget and last-run outcome.

## What Changed

Added `healthStatus` as the first field in the `/api/agents/:id/stats` response.
Also refactored `budgetSummary` from an inline IIFE to pre-computed named variables
so both `budgetSummary` and `healthStatus` can share the same budget state without
duplicate computation.

### healthStatus values (priority order)

| value      | condition                                                    |
| ---------- | ------------------------------------------------------------ |
| `unknown`  | no runtimeState present                                      |
| `critical` | hard_cap_exceeded OR (soft_cap_exceeded AND last run failed) |
| `running`  | last run is queued or running                                |
| `warning`  | soft_cap_exceeded OR soft_cap_approaching                    |
| `degraded` | last run has an errorCode (excluding cancelled)              |
| `ok`       | otherwise                                                    |

## Design Decisions

- `critical` absorbs the worst-case combination of quota pressure + run failure.
- `cancelled` runs are explicitly excluded from degraded signal; cancellation is intentional.
- `running` is placed after `critical` so a cap-exceeded in-progress run still shows `critical`.
- `healthStatus` is the first field in the response so it is the first thing visible in any print.

## Refactor Note

The `budgetSummary` IIFE was replaced with flat named variables (`budgetUsedTokens`,
`budgetSoftCap`, `budgetHardCap`, `budgetStatus`, etc.) defined before `res.json`.
No behavior change to budgetSummary output shape.

## Validation

- TypeScript typecheck: pass
- Scope: 1 file (server/src/routes/agents.ts), additive + non-breaking

## Files

- server/src/routes/agents.ts

## Next Sprint Candidate

- `/stats` is now a real founder-readable control-plane snapshot.
  Consider a dedicated `GET /api/agents/:id/health` shortcut that returns only
  `{ healthStatus, budgetSummary.status, lastRun.status, lastRun.stopReason }`
  for quick polling without the full payload.
