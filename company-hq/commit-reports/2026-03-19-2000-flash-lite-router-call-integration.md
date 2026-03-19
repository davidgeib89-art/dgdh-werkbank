# Sprint Reflection: Gemini Engine Core - Real Flash-Lite Router Call Integration

Date: 2026-03-19
Author: GitHub Copilot
Mode: Single-pass implementation, one reflection

## Sprint intent

Turn the prepared stage-1 interface into a real Flash-Lite proposal producer with strict guardrails and deterministic server fallback.

## What was implemented

### 1) Real Flash-Lite proposal producer service

Added:

- server/src/services/gemini-flash-lite-router.ts

Provides:

- produceFlashLiteRoutingProposal(...)
  - runs real Gemini CLI call with model default gemini-2.5-flash-lite
  - strict compact prompt with explicit schema and enum constraints
  - short timeout and non-interactive args
  - strict parse/validation path

Input includes:

- free-text task context
- canonical quota snapshot
- allowed buckets
- allowed model lanes
- optional manual override

Output includes:

- proposal (or null)
- source: flash_lite_call | heuristic_policy
- parseStatus: ok | invalid_json | schema_invalid | timeout | command_error | not_attempted
- latencyMs
- warning

### 2) Preflight wiring in heartbeat (stage-1 production path)

Updated:

- server/src/services/heartbeat.ts

Changes:

- before routing preflight, heartbeat now calls produceFlashLiteRoutingProposal(...)
- writes proposal into context.paperclipRoutingProposal only when valid
- writes metadata into context.paperclipRoutingProposalMeta:
  - source
  - parseStatus
  - latencyMs
- proposal failures stay safe and fall back to heuristic policy

### 3) Router/Resolver telemetry aligned to requested fields

Updated:

- server/src/services/gemini-control-plane.ts

Changes:

- router.source now uses:
  - flash_lite_call
  - heuristic_policy
  - manual_override
- router now includes:
  - accepted
  - correctionReasons
  - parseStatus
  - latencyMs
- manual override sets router.source = manual_override
- parseStatus/latency rehydrated through deriveGeminiControlPlaneState(...)

### 4) Policy export for allowed-lane construction

Updated:

- server/src/services/gemini-routing.ts

Changes:

- exported getGeminiRoutingPolicy() for consistent allowed lane/bucket data in preflight producer wiring

### 5) Tests

Added:

- server/src/**tests**/gemini-flash-lite-router.test.ts

Updated:

- server/src/**tests**/gemini-control-plane-resolver.test.ts

Coverage now includes:

- valid strict JSON flash-lite proposal accepted
- invalid JSON hard fallback to heuristic policy
- forbidden lane/bucket correction via server guardrails
- exhausted/cooldown state overriding proposal
- stale snapshot still forcing safe advisory fallback

## Validation

- Flash-lite router + resolver + quota tests:
  - pnpm --filter @paperclipai/server exec vitest src/**tests**/gemini-flash-lite-router.test.ts src/**tests**/gemini-control-plane-resolver.test.ts src/**tests**/gemini-quota-producer.test.ts src/**tests**/gemini-quota-snapshot.test.ts --run
  - Result: 14/14 passed
- Typecheck:
  - pnpm --filter @paperclipai/server typecheck
  - Result: TYPECHECK_OK

## Why this is the right next step

This makes stage-1 real: free text now goes through a real Flash-Lite proposal call with strict schema constraints, while stage-2 server enforcement remains final authority.

## Suggested commit message

feat(server): integrate real gemini-2.5-flash-lite routing proposal call with strict guardrails
