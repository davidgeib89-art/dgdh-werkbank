# Gemini T1 Dry-Run Checkbericht 2026-03-18

Status: ready
Date: 2026-03-18
Purpose: verify that benchmark v2 is enforceable, inspectable, and deterministic in structure before live cost runs

## Scope Of This Check

This check validates instrumentation and output contract only.

It does not execute provider work or consume benchmark run tokens.

Validated command:

- powershell -ExecutionPolicy Bypass -File scripts/gemini-micro-benchmark-suite.ps1 -CompanyId <companyId> -BenchmarkFamily T1-floor-v1 -TestKey T1 -Repeats 1 -DryRun

## Benchmark Families Available

- T1-floor-v1
- T1-paperclip-default-v1

Behavior intent:

- T1-floor-v1: strict floor with policy enforcement and hard FAIL classification
- T1-paperclip-default-v1: current operational path with same task contract and metric capture

## Reason Codes Available

Current explicit reason codes produced by the suite:

- read_non_target_file
- shell_command_used
- api_call_used
- list_directory_used
- search_tool_used
- skill_activation_used
- other_issue_context_touched
- non_json_output
- output_schema_mismatch
- run_not_succeeded
- forbidden_tool_used (fallback mapping)

## PASS Or FAIL Decision Logic

A run is marked FAIL if any reason code is present.

A run is PASS only when all conditions are simultaneously true:

- run status is succeeded
- no forbidden tool usage detected
- no non-target file read detected
- no API touch detected
- no other issue context touch detected
- output is raw JSON (no fence, no prose)
- output schema matches required keys exactly

## Output Schema Contract By Test Key

- T1: env_keys, model_sets, fallback_rule
- T2: status_codes, invalid_json_branch, default_error_branch
- T3: wake_conditions, skip_conditions, summary

## Guaranteed JSON Fields In Suite Summary

Top-level summary fields:

- generatedAt
- benchmarkFamily
- baseUrl
- companyId
- agentRef
- agentId
- testKey
- testName
- repeats
- seriesDurationSeconds
- passCount
- failCount
- passRate
- minTotalTokens
- maxTotalTokens
- meanTotalTokens
- totalTokensSpreadRatio
- inputTokensSpreadRatio
- hasCancelIssued
- stablePass
- meanInputTokens
- floorReferenceTotalTokens
- floorReferenceInputTokens
- overheadRatioTotal
- overheadRatioInput
- minBenchmarkTokens
- maxBenchmarkTokens
- meanBenchmarkTokens
- meanRunDurationSeconds
- outputHashEquality
- violationHistogram
- totalRuns
- results

Per-run result fields:

- benchmarkFamily
- iteration
- testKey
- testName
- issueId
- issueIdentifier
- runId
- runStatus
- durationSeconds
- inputTokens
- cachedInputTokens
- outputTokens
- totalTokens
- benchmarkTokens
- tokenMeasurementStatus
- freshSession
- sessionReused
- taskSessionReused
- toolCallCount
- allowedToolCallCount
- forbiddenToolCallCount
- toolCallsByTool
- readPaths
- cancelIssued
- cancelIssuedAtSeconds
- firstForbiddenEventAtSeconds
- firstForbiddenReasonCode
- firstForbiddenToolName
- firstForbiddenPattern
- rawOutputValidJson
- rawOutputSchemaValid
- passFail
- failReasonCodes
- outputHashSha256

## Enforcement Telemetry Confirmed

The suite now records explicit enforcement timing and shape indicators:

- cancelIssued
- cancelIssuedAtSeconds
- firstForbiddenEventAtSeconds
- firstForbiddenToolName
- firstForbiddenPattern

This supports distinction between:

- clean pass run
- early derailment
- late derailment with extra token burn before cancel

## Stable Floor Acceptance Rule (Proposed)

Accept floor baseline only if all are true:

- passCount = 3 and failCount = 0
- no run has cancelIssued = true
- no run has any failReasonCodes
- output hash stability acceptable for strict task contract
- max(totalTokens) / min(totalTokens) <= 1.15
- max(inputTokens) / min(inputTokens) <= 1.15

Operational note:

- The suite computes this directly in summary as stablePass, using spread ratios and cancel checks.

## Next Sequence

1. Run T1-floor-v1 for 3 live repeats.
2. Accept baseline only with stable 3/3 PASS under the rule above.
3. Then run T1-paperclip-default-v1 for A/B comparison.
4. Then evaluate Morph variants incrementally.
