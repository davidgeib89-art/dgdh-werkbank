# Sprint Reflection: Routing Blocked Execution Gate

Date: 2026-03-19
Author: GitHub Copilot
Mode: Single-pass implementation, one reflection

## Sprint intent

Close the gap between work-packet blocking computation and actual execution enforcement: `routingPreflight.selected.blocked` was calculated in the control plane and visible in telemetry, but never triggered a hard abort before `adapter.execute()`.

## What was implemented

### 1) Hard execution gate for blocked work packets

Updated:

- server/src/services/heartbeat.ts

Added `routingBlocked` check after the `routing.preflight` lifecycle event is logged, before `singleFileBenchmarkPreflight` evaluation:

- Emits a `routing.blocked` lifecycle event with full payload:
  - `blockReason`
  - `needsApproval`
  - `missingInputs`
  - `executionIntent`, `riskLevel`, `budgetClass`, `taskType`
  - full `controlPlane` for traceability
- Calls `setRunStatus(run, "failed")` with the `blockReason` as error code
- Calls `setWakeupStatus(run, "failed")` with the human-readable message
- Added `routingBlocked ||` to the `runtimeServices` guard: no runtime services are provisioned when routing is blocked (consistent with the phase-B checkpoint gate pattern)
- Added `routingBlocked` as first branch at the adapter execution gate: `adapter.execute` is never called when blocked
- Returns a proper `adapterResult` with:
  - `exitCode: 1`
  - `errorCode: blockReason`
  - `errorMessage` with full context (block reason, approval flag, missing inputs)
  - `resultJson.type: "routing_blocked"`
  - full work-packet fields + `controlPlane` for full traceability

The gate fires for both `missing_inputs` and `risk_high_large_implementation` block reasons (and any future block reason from the control plane enforcement layer).

### 2) Routing blocked label in run result summary

Updated:

- server/src/services/heartbeat-run-summary.ts

`summarizeHeartbeatRunResultJson` now detects `type: "routing_blocked"` and:
- Forces `result: "blocked"`
- Sets `summary: "Routing blocked: {blockReason}"`
- Adds `message: "Task requires operator approval before execution"` when `needsApproval === true`

### 3) Tests for routing-blocked summarization

Updated:

- server/src/__tests__/heartbeat-run-summary.test.ts

Added 4 test cases:
- `routing_blocked` with `missing_inputs` → blocked label + reason
- `routing_blocked` with `needsApproval: true` → operator-approval message
- `routing_blocked` with already-set summary → reason label wins

## Validation

- Typecheck:
  - `pnpm --filter @paperclipai/server typecheck` → TYPECHECK_OK
- Focused test run:
  - `pnpm --filter @paperclipai/server exec vitest src/__tests__/heartbeat-run-summary.test.ts src/__tests__/gemini-flash-lite-router.test.ts src/__tests__/gemini-control-plane-resolver.test.ts --run`
  - Result: 22/22 passed
- Full test suite:
  - `pnpm --filter @paperclipai/server exec vitest --run`
  - Result: 371 passed, 5 skipped, 0 failed

## Invariants preserved

- `routingPreflight.selected.blocked` was already computed; the sprint adds enforcement without changing the enforcement logic in `enforceWorkPacket()`.
- `phase_checkpoint_required` gate at the top of the run loop remains the earlier authority for Phase-B.
- `singleFileBenchmarkPreflight` gate remains the later authority for single-file benchmarks.
- `runtimeStatePatch` with `quotaSnapshot` (including `blocked`, `blockReason`, `needsApproval`, `missingInputs`) continues to be built and persisted after the routing blocked case, ensuring Stats/Health surfaces read the correct operative state.
- The `routing.blocked` lifecycle event provides real-time signal; the `resultJson` in the run record provides post-hoc evidence.

## Architectural notes

- Block reasons are now first-class citizen in the execution path: `missing_inputs` and `risk_high_large_implementation` block before any agent work is dispatched.
- The `needsApproval` flag from the control-plane enforcement is surfaced in: the lifecycle event payload, the adapter suppressed metadata, the run result JSON, and the run summary.
- `missingInputs` is surfaced in: the lifecycle event payload, the adapter suppressed metadata command notes, and the run result JSON.
- This makes the operator signal path fully consistent: blocked tasks show up in the run timeline (lifecycle event), the run list (result label), and the agent control plane state (via runtimeStatePatch).

## Why this advances David's goal

A platform that computes safety decisions but doesn't enforce them is not a governed platform. This sprint makes the enforcement real: a task that the server considers unsafe or incomplete will not waste tokens on an agent execution, will clearly signal the operator why, and will leave a consistent record for audit and stats. The platform is now one step closer to stable operational reliability.

## Suggested commit message

feat(server): enforce routing preflight blocked state as hard execution gate before adapter.execute
