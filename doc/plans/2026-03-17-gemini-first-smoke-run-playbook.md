# Gemini First Live Smoke Run Playbook (DGDH)

## Goal

Run exactly one controlled Gemini benchmark task to verify:

1. Gemini CLI discovery on Windows
2. Local auth/OAuth session health
3. Fixed model path (gemini-3-flash-preview)
4. Transcript/runtime readability
5. Stable completion without scope drift

## Agent Configuration

- Name: Research-Gemini
- Adapter type: gemini_local
- Role: researcher (or qa)
- Working directory: C:\Users\holyd\DGDH\worktrees\paperclip-gemini
- Command: gemini (or explicit path to gemini.cmd if PATH differs)
- Model: gemini-3-flash-preview (fixed for Benchmark #01)
- Heartbeat interval: disabled
- Wake on demand: disabled (manual invoke only)
- Permissions.canCreateAgents: false

## Model Policy

1. Benchmark #01 uses a fixed model string: gemini-3-flash-preview.
2. Do not use auto for Benchmark #01.
3. If the model is unavailable at runtime, stop and report blocked (no silent fallback).

## Live Run Guardrails

- One run only.
- No heartbeat scheduling.
- Start run only via explicit manual invoke action.
- No follow-up task creation.
- No self-tasking.
- No parallel Gemini runs.
- No repo exploration beyond explicit task scope.
- Abort and report if scope becomes ambiguous.

## Pre-Click Preflight (David)

1. Verify working directory exists: `C:\Users\holyd\DGDH\worktrees\paperclip-gemini`.
2. In agent config, verify `adapterType=gemini_local` and `model=gemini-3-flash-preview`.
3. Confirm `heartbeat.enabled=false` and `heartbeat.wakeOnDemand=false`.
4. Run adapter environment test once and confirm no blocking error.
5. Confirm task prompt is mini-scope (single source file, single output file).

## Benchmark #01 Task (Paste into Paperclip)

Title: Gemini Benchmark #01: Single-file structured extraction

Description:
Read only the file:
packages/adapters/gemini-local/src/server/models.ts

Do not read any other file. Do not inspect imports in other files.
Do not write or modify any file. Do not run commands.
Do not create follow-up tasks.

Return exactly one JSON object and nothing else.
Use exactly this schema:
{
"env_keys": ["..."],
"exported_async_functions": ["..."],
"helper_functions": ["..."],
"dedupe_rule": "max 1 sentence",
"json_parse_fallback": "max 1 sentence"
}

Rules:

1. env_keys: only the keys from EXTRA_GEMINI_MODELS_ENV_KEYS, in source-code order.
2. exported_async_functions: only exported async functions from this file.
3. helper_functions: only non-exported function names from this file.
4. dedupe_rule: one precise sentence describing the dedupe logic.
5. json_parse_fallback: one precise sentence describing the fallback behavior for invalid JSON.
6. If a field has no value, return an empty array or empty string.
7. No markdown. No prose before or after the JSON. Stop after returning the JSON.

## Definition of Done

- No file write operations
- Exactly one constrained read target
- Output is one valid JSON object with required fields
- No follow-up task creation
- Run ends cleanly with a clear final status

## Observation Checklist

- Selected model is visible and expected (gemini-3-flash-preview)
- Adapter environment checks indicate CLI/auth availability
- Transcript lines are understandable enough to follow tool steps
- Tool calls are traceable (read/write actions are clear)
- Scope remains constrained to the single requested source file
- Token usage stays small and does not spike unexpectedly
- Final run status is succeeded (or a cleanly reported blocked/failure reason)

## Post-Run Readout (Order Matters)

1. Resolve run id.
   - Preferred: `GET /api/issues/{issueId}/runs` and take newest `runId`.
2. Read run record.
   - `GET /api/heartbeat-runs/{runId}`
3. Read run log and output length.
   - `GET /api/heartbeat-runs/{runId}/log`
4. Read adapter invoke event (model evidence).
   - `GET /api/heartbeat-runs/{runId}/events`
5. Read agent record for adapter/model context.
   - `GET /api/agents/{agentId}`
6. Optional cost context (aggregate snapshot).
   - `GET /api/companies/{companyId}/costs/by-agent`

For convenience, use:

`powershell -ExecutionPolicy Bypass -File scripts/gemini-benchmark-readout.ps1 -IssueId <ISSUE_ID>`

or

`powershell -ExecutionPolicy Bypass -File scripts/gemini-benchmark-readout.ps1 -RunId <RUN_ID>`

## Metrics to Record (Benchmark #01)

1. status
2. startedAt
3. finishedAt
4. duration_ms
5. adapterType
6. model (with source: adapter.invoke or agent config)
7. usageJson (input/output/cached tokens)
8. resultJson presence + JSON validity of assistant answer
9. logBytes
10. output_length
11. costByAgentSnapshot (context only; per-run cost may be incomplete on subscription)

## Pass/Fail Rules (Benchmark #01)

- Pass:
  - status is `succeeded`
  - model resolves to `gemini-3-flash-preview`
  - output is valid JSON and matches required schema fields
  - no evidence of extra file writes or scope drift
- Fail:
  - status is `failed`, `timed_out`, or `cancelled`
  - output is not valid JSON or schema-incomplete
  - model mismatch
  - unexpected side effects (writes/follow-up tasks)
