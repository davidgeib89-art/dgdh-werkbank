# Sprint Reflection - History Warnings + Data Source Clarity

Date: 2026-03-19
Scope: historyWarnings and explicit dataSource per run in /api/agents/:id/stats

## What Changed

Added two new fields to each entry inside `routingHistory.runs[]`:

**`dataSource`** — one of three values:

- `"preflight"` — routing fields came from paperclipRoutingPreflight (reliable, fully instrumented)
- `"context_fallback"` — contextSnapshot present but no preflight; fields are partial best-effort
- `"none"` — no contextSnapshot at all; routing fields are completely absent

**`warnings`** — null when all data is present, otherwise a string[] with named diagnostics:

- `no_context_snapshot` — older or broken run with no contextSnapshot
- `no_routing_preflight` — run predates routing instrumentation (most common case for old runs)
- `no_effective_model_lane` — preflight present but effectiveModelLane is empty
- `no_routing_reason` — preflight present but routingReason is empty
- `run_not_finished` — run is queued or running; data is incomplete by design
- `no_token_summary` — run succeeded but usageJson has no token data

## Why This Matters

Older runs in the history would silently show all-null routing fields.
Without distinction it was impossible to tell if data was truly missing,
or if the run was too old to have been instrumented, or if the run failed mid-flight.
Now "no data" vs "pre-instrumentation run" vs "live run in progress" are clearly distinct.

## Files

- server/src/routes/agents.ts

## Validation

- TypeScript typecheck: pass
- Scope: 1 file, additive only inside routingHistory map

## Risk Check

- No behavior change to routing execution, quota logic, or any other endpoint.
- No schema migration needed; fields are additive to existing response.
- `warnings: null` is the happy-path value, so existing consumers that do not expect warnings are unaffected.

## Next Sprint Candidate

- Expose a compact per-agent `budgetSummary` view: total tokens used this session,
  remaining budget relative to configured soft/hard cap, and percent-used metric.
  All readable from existing runtimeState fields without new DB queries.
