# Gemini Micro Benchmark Suite 2026-03-18

Status: active
Date: 2026-03-18
Purpose: fast, repeatable, low-noise Gemini benchmark suite for token and latency optimization

## Why This Exists

DAV-6 is useful, but too broad for rapid optimization loops.
This suite provides a smaller harness so you can run 2-3 fast cycles and compare changes with low variance.

## Suite Design Goals

- Fast: each run should finish quickly (target under 90 seconds)
- Stable: fixed prompts and fixed single-file scope
- Comparable: same model, same agent, same schema every time
- Actionable: emits runtime, benchmark tokens, cached input tokens, and output hash

## Required Fixed Conditions

- Agent: Research-Gemini
- Adapter: gemini_local
- Model: keep fixed during one comparison series
- Workspace: C:/Users/holyd/DGDH/worktrees/dgdh-werkbank
- Morph features: OFF for baseline phase

If model or workspace changes, start a new series.

## Test Set

Run these three tests as one suite cycle.

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

Apply to T1, T2, and T3:

- read only the declared file
- do not read other files
- do not write or modify files
- do not run commands
- no follow-up tasks
- output must be one JSON object and nothing else

## Measurement Contract

Per run, record:

- duration_seconds
- benchmarkTokens
- cachedInputTokens
- tokenMeasurementStatus
- outputHashSha256

Per suite cycle, record:

- cycleDurationSeconds
- totalBenchmarkTokens
- meanRunDurationSeconds
- meanRunBenchmarkTokens

## Determinism Rule

A cycle is deterministic when all are true:

- all three runs succeed
- each test output hash is equal to the previous cycle hash for that test
- benchmark token deltas are within +/-10% against previous cycle for each test

## Usage

Run one cycle:

powershell -ExecutionPolicy Bypass -File scripts/gemini-micro-benchmark-suite.ps1 -CompanyId <COMPANY_ID>

Run three cycles for stability check:

powershell -ExecutionPolicy Bypass -File scripts/gemini-micro-benchmark-suite.ps1 -CompanyId <COMPANY_ID> -Cycles 3

Strict token requirement:

powershell -ExecutionPolicy Bypass -File scripts/gemini-micro-benchmark-suite.ps1 -CompanyId <COMPANY_ID> -Cycles 3 -RequireTokenMeasurement

## Morph Rollout Comparison Plan

Use this exact sequence to attribute gains cleanly:

1. Baseline series (Morph OFF): 3 cycles
2. Enable WarpGrep only: 3 cycles
3. Enable Fast Apply only: 3 cycles
4. Enable Compact only: 3 cycles
5. Combined Morph set: 3 cycles

Compare each phase against baseline using:

- meanRunBenchmarkTokens
- meanRunDurationSeconds
- deterministic-cycle pass rate

Only accept an optimization phase as positive if deterministic pass rate does not degrade.
