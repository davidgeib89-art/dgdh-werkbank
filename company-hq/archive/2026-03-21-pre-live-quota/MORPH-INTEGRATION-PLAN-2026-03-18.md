# Morph Integration Plan For DGDH - 2026-03-18

Status: canonical tool-integration note
Audience: David, Copilot, ChatGPT in agent mode, future DGDH implementation agents
Purpose: place Morph MCP and Morph Compact into DGDH's current benchmark-first operating model without introducing measurement confusion

## DGDH Positioning

Morph is not a platform core for DGDH.
Morph is an optional efficiency layer.

Current interpretation:

- Morph MCP: targeted tool support for narrower builder work, especially search and edit operations
- Morph Compact: later-stage context compaction candidate for longer sessions, to be validated with explicit before/after evidence

## Strategic Order (Mandatory)

1. Baseline first: run the first Gemini benchmark without Morph.
2. MCP second: introduce Morph MCP only for controlled narrow tasks.
3. Compact third: evaluate Morph Compact only after baseline and MCP effects are separately visible.

Core rule:

- do not mix these phases if attribution would become unclear

## Why This Order Exists

DGDH must be able to tell where gains come from.

We need to distinguish improvements caused by:

1. workflow changes
2. Morph MCP
3. Morph Compact

If these are mixed too early, token and quality changes become non-diagnostic.

## Phase 1 - Gemini Baseline (No Morph)

Goal:

- establish a clean baseline for token usage, cost, runtime, and output quality

Scope:

- one small real Gemini task
- repeatable packet
- no Morph MCP
- no Morph Compact

Required record per run:

- runId
- date/time
- inputTokens
- outputTokens
- cachedInputTokens if available
- costUsd if available
- durationMinutes
- usefulnessScore (1-5)
- formatPass (yes/no)
- one short quality note

Exit condition:

- at least 3 comparable baseline runs with stable packet boundaries

## Phase 2 - Morph MCP Trial (Search + Edit Focus)

Goal:

- test whether Morph MCP reduces waste on narrow builder-style operations

Scope:

- keep same or very similar task family
- enable Morph MCP only for selected runs
- focus on search and edit paths
- no Morph Compact in this phase

Controlled comparison:

- compare against baseline runs with similar task shape
- keep acceptance criteria unchanged

Record deltas:

- token delta vs baseline median
- duration delta vs baseline median
- output quality delta vs baseline median
- operator friction note (short)

Exit condition:

- evidence that MCP adds measurable benefit or a clear decision to defer

## Phase 3 - Morph Compact Trial (Context Compaction)

Goal:

- test whether controlled compaction improves longer-session cleanliness and token discipline

Scope:

- only after baseline and MCP behavior are understood
- enable compaction in controlled A/B-style runs
- use longer research/code sessions where context accumulation is relevant

Guardrail:

- do not treat compact as default-on by assumption

Required comparison:

- same task class with compact off vs on
- token usage, runtime, quality, and consistency compared side by side

Success signal:

- lower context waste and equal-or-better output quality without loss of control

## Practical Run Matrix

Minimum lean matrix:

1. Baseline (no Morph): 3 runs
2. MCP enabled (no Compact): 3 runs
3. Compact enabled on top of validated setup: 3 runs

This is enough for directional decisions without over-investing in theory.

## Decision Rules

Adopt Morph MCP wider only if:

1. repeatable token or time benefit is visible
2. output quality does not regress
3. workflow complexity does not grow unacceptably

Adopt Morph Compact wider only if:

1. longer-session context handling improves measurably
2. token waste drops on relevant task classes
3. quality and control stay stable

If results are mixed:

- keep feature scoped to narrow high-leverage cases only

## Non-Goals Right Now

This plan is not trying to:

- make Morph a global default layer immediately
- redesign the whole DGDH system around a tool vendor
- skip baseline measurement discipline

## Integration With Existing DGDH Canon

This note extends, but does not replace:

- CURRENT-STATE-REVIEW-2026-03-17.md
- GEMINI-BENCHMARK-PACKET-01-2026-03-17.md
- HARNESS-LEARNINGS-FOR-DGDH-2026-03-18.md

If these documents conflict, prefer the benchmark-first sequence and explicit measurement attribution.
