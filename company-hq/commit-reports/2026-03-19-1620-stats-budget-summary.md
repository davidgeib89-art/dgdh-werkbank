# Sprint Reflection - budgetSummary in /stats

Date: 2026-03-19
Scope: Compact founder-readable budget overview block in agent stats response.

## What Changed

Added `budgetSummary` to the `/api/agents/:id/stats` response.
Calculated entirely from existing runtimeState and routing cap fields.
No new DB queries.

Fields:

- `usedTokens` — sum of totalInputTokens + totalCachedInputTokens + totalOutputTokens
- `softCapTokens` / `hardCapTokens` — from routing preflight or quotaSnapshot fallback
- `percentOfSoftCap` / `percentOfHardCap` — rounded integer percentages (null if cap unknown)
- `totalCostCents` — lifetime cost from runtimeState
- `status` — one of:
  - `ok`
  - `soft_cap_approaching` (>=80% of softCap)
  - `soft_cap_exceeded` (>=100% of softCap)
  - `hard_cap_exceeded` (>=100% of hardCap)
  - `unknown` (no runtimeState or no hard cap configured)

## Design Decisions

- Status thresholds are pragmatic: 80% approaching, 100% exceeded.
- IIFE pattern keeps the calculation inline and scoped without adding a helper function.
- `totals` block still present for backward compat; budgetSummary is the new founder-facing view.

## Validation

- TypeScript typecheck: pass
- Scope: 1 file (server/src/routes/agents.ts), additive only

## Files

- server/src/routes/agents.ts

## Next Sprint Candidate

- Wire `budgetSummary.status` into a top-level `healthStatus` field that combines
  quota state + last run outcome into a single founder-readable operational signal.
