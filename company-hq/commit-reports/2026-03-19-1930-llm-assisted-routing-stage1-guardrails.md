# Sprint Reflection: Gemini Engine Core - LLM-Assisted Routing Stage 1 + Guardrails

Date: 2026-03-19
Author: GitHub Copilot
Mode: Single-pass implementation, one reflection

## Sprint intent

Shift routing architecture to a two-stage model:

1. Stage-1 proposal (Flash-Lite-style intake routing)
2. Stage-2 server enforcement (hard policy/override/quotas)

## What was implemented

### 1) Stage-1 routing proposal model introduced

Updated:

- server/src/services/gemini-control-plane.ts

Added:

- GeminiRoutingStageOneProposal type
- context proposal parsing via:
  - context.paperclipRoutingProposal (object)
  - context.paperclipRoutingProposalJson (strict JSON string)

Proposal schema includes:

- taskType
- budgetClass
- chosenBucket
- chosenModelLane
- fallbackBucket
- rationale

### 2) Two-stage resolver flow implemented

Updated:

- server/src/services/gemini-control-plane.ts

Flow:

- Stage-1:
  - prefer context Flash-Lite proposal when present and valid
  - otherwise generate heuristic policy proposal fallback
- Stage-2 server guardrails:
  - enforce bucket availability under quota state
  - auto-fallback when proposed bucket is exhausted/cooldown
  - enforce model lane allowed for selected bucket
  - enforce manual override precedence
  - preserve stale-snapshot advisory fallback behavior

### 3) Founder-readable router telemetry added to controlPlane

Updated:

- server/src/services/gemini-control-plane.ts

New controlPlane.router fields:

- enabled
- model
- source (context_flash_lite | heuristic_policy | none)
- accepted
- correctionReasons[]
- proposal

Routing reason chain now includes both staleness and correction reasons.

### 4) Runtime-state boundary preserved in two-stage flow

Updated:

- server/src/services/gemini-control-plane.ts
- server/src/services/gemini-routing.ts

Changes:

- resolver input now accepts runtimeState
- quota/staleness ingestion composes static runtimeConfig with operational runtimeState
- preflight forwards runtimeState into resolver

### 5) Tests expanded for proposal acceptance/correction

Updated:

- server/src/**tests**/gemini-control-plane-resolver.test.ts

Added coverage:

- accepts valid context Flash-Lite proposal
- corrects invalid proposal via server guardrails

## Validation

- Core routing/producer/snapshot tests:
  - pnpm --filter @paperclipai/server exec vitest src/**tests**/gemini-control-plane-resolver.test.ts src/**tests**/gemini-quota-producer.test.ts src/**tests**/gemini-quota-snapshot.test.ts --run
  - Result: 12/12 passed
- Contract regressions:
  - pnpm --filter @paperclipai/server exec vitest src/**tests**/agent-stats-route-contract.test.ts src/**tests**/agent-health-routes-contract.test.ts src/**tests**/agent-runtime-task-sessions-contract.test.ts --run
  - Result: 8/8 passed
- Typecheck:
  - pnpm --filter @paperclipai/server typecheck
  - Result: TYPECHECK_OK

## Why this is the right stage-1 architecture

This introduces LLM-assisted intake routing while keeping final authority in deterministic server policy enforcement. It supports free-text-first routing intelligence without turning model selection into an ungoverned black box.

## Suggested commit message

feat(server): add two-stage gemini routing with llm proposal intake and server guardrail enforcement
