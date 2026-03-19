# Sprint Reflection: Flash-Lite Stage-1 Router Reliability Hardening

Date: 2026-03-19
Author: GitHub Copilot
Mode: Single-pass implementation, one reflection

## Sprint intent

Harden the real Flash-Lite Stage-1 router for production reliability without adding new product features.

## What was implemented

### 1) Feature flag and kill-switch modes

Updated:

- server/src/services/gemini-flash-lite-router.ts

Added explicit router policy handling in `routingPolicy.llmRouter`:

- `enabled`
- `fallbackOnly` and `fallback_only` (both supported)

Behavior:

- `enabled=false` => no Stage-1 call, deterministic heuristic fallback
- `fallback_only=true` => no Stage-1 call, deterministic heuristic fallback

### 2) Circuit breaker with cooldown

Updated:

- server/src/services/gemini-flash-lite-router.ts

Added runtime stateful breaker logic:

- tracks consecutive failures (`invalid_json`, `schema_invalid`, `timeout`, `command_error`)
- opens breaker for configurable cooldown window after threshold breaches
- during cooldown, skips real Flash-Lite call and uses safe fallback

Config path:

- `routingPolicy.llmRouter.circuitBreaker.threshold`
- `routingPolicy.llmRouter.circuitBreaker.cooldownSec`

### 3) Mini cache/reuse for similar intake calls

Updated:

- server/src/services/gemini-flash-lite-router.ts

Added lightweight similarity-key cache:

- reuses recent valid proposal for near-identical intake inputs
- avoids repeated Stage-1 calls for same task shape
- bounded by TTL and entry limit

Config path:

- `routingPolicy.llmRouter.cache.enabled`
- `routingPolicy.llmRouter.cache.ttlSec`
- `routingPolicy.llmRouter.cache.maxEntries`

### 4) Operator health visibility for router subsystem

Updated:

- server/src/services/gemini-flash-lite-router.ts
- server/src/services/heartbeat.ts
- server/src/services/gemini-control-plane.ts

Added counters/telemetry:

- success/fallback/timeout/parse-fail/command-error/cache-hit/circuit-open counts
- consecutive failures
- breaker open-until timestamp
- last latency
- last error reason

Persistence:

- state stored under runtime operational state (`agentRuntimeState.stateJson.controlPlane.routerRuntime`)
- heartbeat persists router runtime patch before resolving routing preflight
- resolver surfaces health under `controlPlane.router.health`

### 5) Telemetry contract test hardening

Updated:

- server/src/**tests**/agent-stats-route-contract.test.ts

Added explicit contract assertions for:

- `controlPlane.router.source`
- `controlPlane.router.parseStatus`
- `controlPlane.router.accepted`

Also updated/additional tests:

- server/src/**tests**/gemini-flash-lite-router.test.ts
  - fallback_only kill-switch
  - circuit breaker open/cooldown behavior
  - cache reuse behavior
- server/src/**tests**/gemini-control-plane-resolver.test.ts
  - router health parsing and defaults

## Validation

- Focused hardening + contract tests:

  - `pnpm --filter @paperclipai/server exec vitest src/__tests__/gemini-flash-lite-router.test.ts src/__tests__/gemini-control-plane-resolver.test.ts src/__tests__/agent-stats-route-contract.test.ts --run`
  - Result: 14/14 passed

- Adjacent route contract tests:

  - `pnpm --filter @paperclipai/server exec vitest src/__tests__/agent-health-routes-contract.test.ts src/__tests__/agent-runtime-task-sessions-contract.test.ts --run`
  - Result: 6/6 passed

- Typecheck:
  - `pnpm --filter @paperclipai/server typecheck`
  - Result: TYPECHECK_OK

## Why this advances David's goal

This sprint reduces operational risk and token waste for the real Stage-1 router path: operators can instantly disable or degrade routing calls, automatic cooldown prevents failure storms, cache reuse cuts redundant calls, and health telemetry is now contract-locked for stable observability.

## Suggested commit message

feat(server): harden flash-lite stage1 router with kill-switch, circuit-breaker, cache, and health telemetry
