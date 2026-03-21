# Gemini Micro Benchmark Suite 2026-03-18

Status: active
Date: 2026-03-18
Purpose: fast, repeatable, low-noise Gemini baseline harness for token and latency optimization

## Why This Exists

DAV-6 is useful, but too broad for rapid optimization loops.
This suite provides a smaller harness so you can run the same small task 3 times and compare token cost with low variance.

## Suite Design Goals

- Fast: each run should finish quickly (target under 90 seconds)
- Stable: fixed prompts and fixed single-file scope
- Comparable: same model, same agent, same schema every time
- Actionable: emits runtime, benchmark tokens, cached input tokens, and output hash

## Required Fixed Conditions

- Agent: Research-Gemini
- Adapter: gemini_local
- Model: keep fixed during one comparison series
- Benchmark issue must be bound to the intended project via `projectId`
- That project must have a primary workspace with cwd `C:/Users/holyd/DGDH/worktrees/dgdh-werkbank`
- Workspace: C:/Users/holyd/DGDH/worktrees/dgdh-werkbank
- Morph features: OFF for baseline phase

If model or workspace changes, start a new series.

## Current Baseline Test

Current default baseline means one tiny task repeated three times.

### T1 Models Constants Extraction

Read only the file:
packages/adapters/gemini-local/src/server/models.ts

Return exactly one JSON object with schema:

{
"env_keys": ["..."],
"model_sets": ["..."],
"fallback_rule": "..."
}

Rules:

- env_keys: keys from EXTRA_GEMINI_MODELS_ENV_KEYS in source order
- model_sets: top-level exported const arrays only
- fallback_rule: max 1 sentence

This is the canonical baseline test right now.

Reason:

- tiny input scope
- single-file benchmark guard already exists in the core
- no edits and no shell calls
- output is easy to hash and compare

## Expansion Tests

These are not part of the default baseline right now.
Use them later only after T1 is stable and cheap.

### T2 Error Handler Mapping

Read only the file:
server/src/middleware/error-handler.ts

Return exactly one JSON object with schema:

{
"status_codes": ["..."],
"invalid_json_branch": "...",
"default_error_branch": "..."
}

Rules:

- status_codes: distinct numeric status codes used in responses, ascending as strings
- invalid_json_branch: max 1 sentence
- default_error_branch: max 1 sentence

### T3 Checkout Wake Logic

Read only the file:
server/src/routes/issues-checkout-wakeup.ts

Return exactly one JSON object with schema:

{
"wake_conditions": ["..."],
"skip_conditions": ["..."],
"summary": "..."
}

Rules:

- wake_conditions and skip_conditions: concise bullet-like strings
- summary: max 1 sentence

## Universal Task Guardrails

Apply to every benchmark run:

- read only the declared file
- do not read other files
- do not write or modify files
- do not run commands
- no follow-up tasks
- output must be one JSON object and nothing else

## Measurement Contract

Per run, record:

- projectId
- duration_seconds
- benchmarkTokens
- cachedInputTokens
- tokenMeasurementStatus
- outputHashSha256

Per 3-run baseline series, record:

- seriesDurationSeconds
- minBenchmarkTokens
- maxBenchmarkTokens
- meanBenchmarkTokens
- meanRunDurationSeconds
- outputHashEquality

## Determinism Rule

A 3-run baseline series is deterministic when all are true:

- all three runs succeed
- all three output hashes are equal
- benchmark token spread stays within a narrow range that is believable for the same task

Practical first target:

- token spread no worse than about +/-10%

## Usage

Run the default baseline series:

powershell -ExecutionPolicy Bypass -File scripts/gemini-micro-benchmark-suite.ps1 -CompanyId <COMPANY_ID> -ProjectId <PROJECT_ID> -TestKey T1 -Repeats 3

Run a quick verification only once:

powershell -ExecutionPolicy Bypass -File scripts/gemini-micro-benchmark-suite.ps1 -CompanyId <COMPANY_ID> -ProjectId <PROJECT_ID> -TestKey T1 -Repeats 1

Strict token requirement:

powershell -ExecutionPolicy Bypass -File scripts/gemini-micro-benchmark-suite.ps1 -CompanyId <COMPANY_ID> -ProjectId <PROJECT_ID> -TestKey T1 -Repeats 3 -RequireTokenMeasurement

Benchmark gate before any live run:

- do not run if `projectId` is missing
- do not run if the project primary workspace is not bound to `C:/Users/holyd/DGDH/worktrees/dgdh-werkbank`

## Morph Rollout Comparison Plan

Use this exact sequence to attribute gains cleanly:

1. Baseline series with T1 only: 3 runs
2. Enable WarpGrep only and repeat T1: 3 runs
3. Enable Fast Apply only and repeat an edit benchmark later
4. Enable Compact only and repeat a longer conversational benchmark later
5. Add T2 or T3 only after the baseline floor is understood

Compare each phase against baseline using:

- minBenchmarkTokens / maxBenchmarkTokens / meanBenchmarkTokens
- meanRunDurationSeconds
- outputHashEquality

Only accept an optimization phase as positive if output stability does not degrade.
