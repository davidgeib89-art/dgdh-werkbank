# Sprint Reflection: Policy Gate Status Semantics

Date: 2026-03-19
Author: GitHub Copilot

## Sprint intent

Fix the semantic pollution caused by routing-blocked runs being labelled as `failed`. Policy gates (missing inputs, risky tasks) are not technical failures — they must not contaminate health metrics, failure counts, or operator stats.

## What was implemented

### 1) Routing blocked uses `status="blocked"` — not `"failed"`

Updated `server/src/services/heartbeat.ts`:

Changed the routing-blocked handler (heartbeat.ts routing gate section):
- `setRunStatus(run.id, "failed", ...)` → `setRunStatus(run.id, "blocked", ...)`
- Removed `setWakeupStatus(run.wakeupRequestId, "failed", ...)` — wakeup stays alive so the operator can act on it
- Added `return` after the blocked handler to prevent fall-through to the normal finalization path

### 2) Extended outcome type with `"blocked"` and `"awaiting_approval"`

Updated outcome derivation in `heartbeat.ts`:
```ts
let outcome: "succeeded" | "failed" | "cancelled" | "timed_out" | "blocked" | "awaiting_approval";
// ...
if (latestRun?.status === "blocked") { outcome = "blocked"; }
else if (latestRun?.status === "awaiting_approval") { outcome = "awaiting_approval"; }
```

Updated `finalizeAgentStatus()` signature to accept the new outcomes.

### 3) Extended `RunEpisodeInput.outcome` type in memory.ts

`memory.ts`:
- `RunEpisodeInput.outcome` now accepts `"blocked" | "awaiting_approval"`
- `recordRunEpisode` importance: `"blocked"` and `"awaiting_approval"` → importance 50 (between succeeded=45 and failed=60) — governance stop, needs attention, not a failure

### 4) Extended terminal statuses in plugin-host-services.ts

Added `"blocked"` and `"awaiting_approval"` to `TERMINAL_STATUSES` — these are terminal run states that should clean up plugin worker subscriptions.

### 5) Updated memory-smoke test

Updated the test to match the new importance calculation logic.

## Validation

- Typecheck: TYPECHECK_OK
- Tests: 371 passed, 5 skipped, 0 failed

## Invariants preserved

- `outcome` is now a proper discriminated union with 6 states
- Technical failures → `failed` (adapter crash, timeout, budget exceeded, process lost, agent not found)
- Operator stops → `blocked` (policy gate, missing inputs)
- Operator waits → `awaiting_approval` (reserved for future needsApproval flow)
- Cancels/timeouts are unchanged
- Wakeup lifecycle is unchanged for normal runs

## Architectural note

`awaiting_approval` is reserved for the next sprint: when `needsApproval=true` but `blocked=false` (task is valid but needs sign-off), the run should enter `awaiting_approval` status instead of blocking immediately. That sprint will wire up the operator approval UI.

## Why this advances David's goal

Health metrics, failure rates, and operator dashboards now correctly distinguish technical failures from governance decisions. The platform can finally show an operator "your routing policy blocked 3 tasks this week" vs "adapter failed 1 time". Clean semantics are the foundation for meaningful governance visibility.
