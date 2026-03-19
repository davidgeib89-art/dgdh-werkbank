# Sprint Reflection - Stats Routing History (Founder Readable)

Date: 2026-03-19
Scope: Extend agent stats from snapshot-only view to compact run history for routing and quota context.

## What We Built

- Expanded stats endpoint to include a compact history block from the latest heartbeat runs:
  - `routingHistory.limit`
  - `routingHistory.count`
  - `routingHistory.runs[]`
- Added query parameter support for `historyLimit` with safe clamp:
  - default: 8
  - min: 3
  - max: 12
- Each history run now includes founder-readable routing/quota fields when available:
  - `createdAt`, `startedAt`, `finishedAt`, `status`
  - `taskType`, `budgetClass`, `accountLabel`, `bucket`
  - `configuredModelLane`, `recommendedModelLane`, `effectiveModelLane`
  - `laneStrategy`, `routingReason`
  - `hardCapTokens`, `softCapTokens`
  - `stopReason`
  - `tokens` summary (or `null` when unavailable)

## Data Strategy

- Reused existing heartbeat run fields instead of introducing a new model:
  - `heartbeatRuns.contextSnapshot.paperclipRoutingPreflight`
  - `heartbeatRuns.usageJson`
  - `heartbeatRuns.resultJson`
  - standard run timing/status fields
- Kept fallback behavior pragmatic:
  - prefer routing preflight selected fields
  - fallback to context fields where useful
  - emit `null` when data does not exist

## Advisory-First Constraint

- No changes to routing execution policy.
- No meta-agent behavior, no auto multi-account switching, no model-lane escalation beyond existing preflight behavior.

## Small Fix Included

- Added a reusable positive integer clamp helper in route code for safe history limit parsing.

## Validation

- Typecheck: `pnpm --filter @paperclipai/server typecheck` passed.
- Live check against `http://127.0.0.1:3100` was attempted but returned HTTP 404 for stats endpoint on the running instance, which indicates runtime mismatch with this worktree deployment.

## Decisions And Tradeoffs

- Included `startedAt` in history in addition to requested timestamps because it improves run readability with low payload cost.
- Kept token summary compact and nullable, avoiding raw usage detail bloat.

## Next Sprint Candidate

- Add a tiny `historyWarnings` list to flag missing preflight data for older runs so founder can distinguish "no data" from "no routing decision".
