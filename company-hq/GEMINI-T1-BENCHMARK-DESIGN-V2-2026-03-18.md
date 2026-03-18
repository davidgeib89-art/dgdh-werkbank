# Gemini T1 Benchmark Design v2 (DGDH)

Status: proposed for immediate implementation
Date: 2026-03-18
Audience: founder, operators, runtime/core maintainers
Purpose: define a strict, versioned, reproducible benchmark instrument that separates task cost from harness overhead

## Why v2 Exists

v1 evidence was useful but mixed two things:

- tiny task execution cost
- broad Paperclip runtime behavior cost

v2 formalizes this split so results are comparable over time.

## Benchmark Families

Two baselines are mandatory and must not be merged.

### Baseline A: T1-floor-v1

Goal:

- measure minimum viable task cost under hard deterministic constraints

Allowed:

- one target path only: packages/adapters/gemini-local/src/server/models.ts
- one tool only: read_file(target)
- one output mode only: raw JSON

Forbidden:

- skill activation
- shell commands
- API calls
- directory listing
- file search tools
- reads outside target file
- issue mutation behavior
- touching other issue context
- fenced output or extra prose

### Baseline B: T1-paperclip-default-v1

Goal:

- measure real current operational cost of default Paperclip path for same task

Behavior:

- keep current default harness and capabilities
- keep same task contract and output schema
- record the same metric fields as Floor mode

## Run Contract (Both Baselines)

Task:

- extract model constants from packages/adapters/gemini-local/src/server/models.ts
- return one JSON object with exact required schema

Run count:

- 3 consecutive runs minimum per baseline

Isolation:

- fresh task session per run
- explicit run labeling with benchmark version and baseline family

## PASS/FAIL Rules

A run is PASS only if all checks are true:

- output is valid raw JSON
- output schema exactly matches required keys and value types
- benchmark-specific policy checks all pass

Floor-specific PASS checks:

- read_file used exactly for the target path
- no non-target read events
- no disallowed tool use events
- no issue API touch
- no other issue context touch

Any violation is FAIL and must be reported with reason codes.

## Required Reason Codes

At minimum:

- read_non_target_file
- shell_command_used
- api_call_used
- list_directory_used
- search_tool_used
- skill_activation_used
- issue_api_touched
- other_issue_context_touched
- non_json_output
- output_schema_mismatch

## Required Metrics Per Run

Every run record must include these fields.

Identity and setup:

- benchmarkFamily (T1-floor-v1 or T1-paperclip-default-v1)
- runId
- issue key
- agent
- adapter
- model
- resolved working directory

Provider token metrics:

- provider_input_tokens
- provider_cached_input_tokens
- provider_output_tokens
- provider_total_tokens

Runtime behavior metrics:

- tool_calls_total
- tool_calls_by_tool (map)
- policy_violation_count
- policy_violations (array of reason codes)
- log_bytes
- duration_seconds

Output metrics:

- output_valid_json (boolean)
- output_schema_valid (boolean)
- output_hash
- output_hash_equality_in_series (computed at summary time)

## Series Summary Fields

For each 3-run series:

- pass_count
- fail_count
- pass_rate
- min_provider_total_tokens
- max_provider_total_tokens
- mean_provider_total_tokens
- min_duration_seconds
- max_duration_seconds
- mean_duration_seconds
- output_hash_equality
- violation_histogram

## Comparison Method

Always compare A vs B using identical task schema and run count.

Derived values:

- task_floor_tokens = mean_provider_total_tokens of T1-floor-v1
- default_tokens = mean_provider_total_tokens of T1-paperclip-default-v1
- overhead_tokens = default_tokens - task_floor_tokens
- overhead_ratio = default_tokens / task_floor_tokens

Interpretation rule:

- optimize against overhead_tokens and overhead_ratio, not only absolute default token count

## Morph Evaluation Gate

Do not run Morph A/B until both gates pass:

- T1-floor-v1 pass_rate is 100% over 3 runs
- T1-floor-v1 token spread is low enough for stable comparison

Then add one change at a time:

1. T1-morph-warpgrep-v1
2. T1-morph-fastapply-v1
3. T1-morph-compact-v1

Do not combine all three in the first comparison cycle.

## Implementation Notes

- Keep benchmark harness mode explicit, not inferred from prompt text.
- Enforce constraints at runtime policy layer, not only preflight validation.
- Mark FAIL runs as diagnostic outcomes, not successful completions.
- Keep benchmark version string immutable once results are recorded.

## Decision Use

This design enables a grounded decision after first full v2 cycle:

- if overhead collapses with strict policy changes, continue shrinking current core
- if overhead remains high despite strict policy, prioritize firm-specific lean-core path
- if Morph reduces overhead after stable baseline, adopt tool-layer optimizations incrementally
