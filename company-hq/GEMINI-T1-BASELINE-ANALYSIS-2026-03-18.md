# Gemini T1 Baseline Analysis 2026-03-18

Status: active analysis
Date: 2026-03-18
Audience: founder, internal operators, external AI reviewer
Purpose: explain what was tested, what happened in the 3-run Gemini baseline, why token use varied so strongly, and what the best next steps are

## Executive Summary

A very small single-file benchmark was run three times against the Research-Gemini lane.

The task itself was tiny:

- target file: `packages/adapters/gemini-local/src/server/models.ts`
- file size: 2,455 bytes
- line count: 78
- required output: one small JSON object

Despite that, the three runs consumed very large and highly variable benchmark token totals:

- Run 1: 377,299 benchmark tokens
- Run 2: 187,715 benchmark tokens
- Run 3: 271,593 benchmark tokens

This is the core result:

- the run cost is far too high for such a small task
- the cost is not stable enough yet to serve as a clean optimization benchmark
- the main source of variance is not the target file itself
- the main source of variance is the surrounding Paperclip execution harness and the agent behavior it induces

The strongest conclusion is this:

The current benchmark is useful as a diagnostic probe of Paperclip overhead, but it is not yet a clean minimal benchmark of "read one file and return one JSON object".

## Why This Work Exists

The immediate DGDH goal is not to optimize Gemini in isolation.

The real goal is to understand how expensive and how stable the shared execution core is, so that later multiple internal agents can run on low quotas with high reliability and high practical value.

Gemini is currently used as the baseline measurement lane because:

- it has the most favorable available quota situation
- it is currently the cheapest practical worker lane to test repeatedly
- findings from this lane can later guide improvements for the whole company agent system

The founder goal is therefore:

- establish one repeatable baseline task
- measure time and token cost honestly
- understand where tokens are being spent
- then reduce waste through tool changes, prompt/core changes, or a company-specific rebuild if necessary

This analysis should be read in that context.

## What Was Tested

The benchmark used only one small test, repeated three times.

Test key:

- `T1`
- title: `Models Constants Extraction`

Task contract:

- read only `packages/adapters/gemini-local/src/server/models.ts`
- do not read any other file
- do not run commands
- do not write files
- do not create follow-up tasks
- return exactly one JSON object

All three runs were executed with:

- agent: `Research-Gemini`
- adapter: `gemini_local`
- model: `gemini-3-flash-preview`
- resolved working directory: `C:/Users/holyd/DGDH/worktrees/dgdh-werkbank`

## The Three Runs

### Run 1

- issue: `DAV-14`
- runId: `5ae14164-523c-4b82-8b83-a09ef1dd13fd`
- duration: 65.6s
- benchmark tokens: 377,299
- cached input tokens: 311,736
- output tokens: 1,561
- tool calls reported by adapter stats: 21
- log bytes: 25,167

Output:

- JSON wrapped in a fenced code block
- fallback sentence: "The listGeminiModels function merges imported fallback models with environment-defined extra models."

Observed tool pattern:

- `activate_skill`: 1
- `run_shell_command`: 2
- `read_file`: 15
- `list_directory`: 3

Critical observation:

This run violated the intended benchmark scope heavily. It read many unrelated files, including:

- `checkout.json`
- `payload.json`
- `update-issue.json`
- `package.json`
- `doc/TASKS.md`
- `SMOKE-TEST-PHASE1.md`
- `PHASE-2-WRITE-OPERATIONS.md`
- `doc/TASKS-mcp.md`
- `doc/SPEC.md`
- `company-hq/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md`
- `baseline.json`
- `company-hq/GEMINI-BENCHMARK-PACKET-01-2026-03-17.md`
- `company-hq/CURRENT-STATE-REVIEW-2026-03-17.md`
- `company-hq/MODEL-ROADMAP.md`
- `company-hq/VISION.md`

So Run 1 was not a true single-file run in practice, even though preflight passed.

### Run 2

- issue: `DAV-15`
- runId: `acff751d-eca6-402b-b7f0-f3da4dae85ad`
- duration: 86.0s
- benchmark tokens: 187,715
- cached input tokens: 141,414
- output tokens: 1,827
- tool calls reported by adapter stats: 10
- log bytes: 36,541

Output:

- plain JSON without code fence
- fallback sentence: "Fallback models are merged with environment-defined models and then deduplicated by ID."

Observed tool pattern:

- `activate_skill`: 1
- `run_shell_command`: 8
- `read_file`: 1

Critical observation:

Run 2 stayed much closer to the intended file scope, but still drifted into unnecessary runtime actions:

- checking `PAPERCLIP_*` environment variables
- attempting to fetch identity and task context via API
- trying to update issue status directly
- hitting issue ownership conflicts
- retrying checkout and patch operations

This run consumed fewer tokens than Run 1 because it avoided the large unrelated repo/doc exploration, but it still paid a major tax for unnecessary agent workflow behavior.

### Run 3

- issue: `DAV-16`
- runId: `af1a174b-94fe-45c5-b3c2-c0af9875c3b0`
- duration: 92.7s
- benchmark tokens: 271,593
- cached input tokens: 227,419
- output tokens: 1,539
- tool calls reported by adapter stats: 14
- log bytes: 47,109

Output:

- JSON wrapped in a fenced code block
- fallback sentence: "The listGeminiModels function merges imported fallbackGeminiModels with extra models parsed from specified environment variables."

Observed tool pattern:

- `activate_skill`: 1
- `run_shell_command`: 12
- `read_file`: 1

Critical observation:

Run 3 drifted even more strongly into API and workflow behavior than Run 2. It performed actions such as:

- curl-style API attempts
- agent identity lookup
- assignment lookup
- heartbeat context fetches
- issue patch attempts
- environment dumps
- repeated issue checkout operations
- checking another issue inbox and touching `DAV-14`

This is especially important:

Run 3 did not just drift within its own issue. It touched context around another issue from the same benchmark series. That means the benchmark is not yet behaviorally isolated enough, even though the task-session was reset.

## Was Previous Run Context Reused?

Short answer:

No, not in the normal persisted session sense.

Evidence:

For all three runs, the stored usage metadata showed:

- `freshSession: true`
- `sessionReused: false`
- `taskSessionReused: false`
- `sessionRotated: false`

Also, each run had a different persisted session id:

- Run 1: `51af9b0e-9877-4f8c-9bba-008d000ad5ef`
- Run 2: `decce3f6-a9b1-451d-ac61-a63b26998ecd`
- Run 3: `0d18d0cd-5e5c-421a-975b-2c1309d4f75c`

So the large token differences were not caused by simple chat/session carry-over from the prior run.

However, there is a more subtle form of carry-over:

- the model was repeatedly told to act as a general Paperclip worker
- the same broad runtime note and API access note appeared every run
- the same `paperclip` skill was activated every run
- the model could still see the live Paperclip environment and other issues through shell/API tools

That means there was no direct saved conversation reuse, but there was repeated harness-level behavioral contamination.

## Why Was Token Use So High For Such A Small Task?

Because the expensive part was not the target file.

The target file is only 2,455 characters long. That cannot explain 185k to 377k benchmark tokens.

The high cost came from repeated agent-loop overhead.

### Cause 1: The benchmark was only guarded by prompt, not enforced by runtime policy

The system did include a single-file benchmark preflight.

That preflight correctly verified:

- target exists
- target is inside the correct repo
- effective cwd resolves to `dgdh-werkbank`

But it did not enforce behavior after launch.

It did not prevent:

- reading unrelated files
- listing directories
- invoking shell commands
- querying unrelated Paperclip state
- touching other issues

So the benchmark was operationally labeled as "single-file", but not behaviorally constrained as one.

### Cause 2: The prompt injected a broad Paperclip worker identity into a tiny benchmark

Each run prompt contained not only the benchmark task but also:

- issue assignment framing
- single-file benchmark guard text
- runtime note about available `PAPERCLIP_*` variables
- API access note with curl examples
- identity line: `Continue your Paperclip work.`

Prompt metrics from the invoke payload were stable across runs:

- total prompt chars: 1,935
- issue task chars: 992
- runtime note chars: 844

The prompt itself was not huge in absolute size.

But it carried the wrong affordances for a tiny benchmark.

Instead of saying, in effect, "read one file and stop", it said, in effect:

- you are a general Paperclip worker
- you can inspect environment state
- you can use shell commands
- you can call the API
- you should continue work in the broader system

That made the model choose different strategies on different runs.

### Cause 3: The `paperclip` skill activation appears to widen behavior

All three runs started with `activate_skill("paperclip")`.

This matters because the skill appears to load general operational behavior, not a minimal benchmark-specific behavior set.

The result was not a narrow extractor but a generalized agent trying to orient itself inside Paperclip before answering.

That orientation behavior is expensive.

### Cause 4: The API note on Windows pushed the model into shell/API detours

The invoke payload still contained a broad API access note that explicitly suggested shell usage and curl-style interaction.

In practice this caused behavior like:

- checking environment variables in shell
- trying curl-like API requests
- identity lookups
- issue checkout/update attempts
- ownership conflicts and retries

Those steps do not help solve the benchmark task.

They do increase the number of model turns and tool calls.

### Cause 5: Output contract was not enforced strongly enough

All three runs returned semantically similar answers, but the output format drifted:

- Run 1: fenced JSON
- Run 2: plain JSON
- Run 3: fenced JSON

Output hash equality was false.

This matters because formatting drift is a sign that the model is not operating in a truly narrow deterministic lane yet.

## What Actually Drove The Differences Between The Three Runs?

The main difference was the strategy the model chose after being placed inside the Paperclip harness.

### Run 1 strategy

- repo/document exploration strategy
- many `read_file` and `list_directory` calls
- broad context gathering far outside the benchmark contract

This produced the highest token consumption.

### Run 2 strategy

- environment/API verification strategy
- fewer file reads
- many shell/API interactions
- still wasteful, but less expansive than Run 1

This produced the lowest token total.

### Run 3 strategy

- stronger workflow/API strategy than Run 2
- more shell/API loops
- even touched another issue context
- more log bytes and more shell actions

This produced a middle token total, but with worse behavioral isolation.

## Did The Cost Rise Because Gemini Got Context From The Prior Run?

Not from persisted session reuse.

The stronger explanation is:

- the harness gives Gemini too many irrelevant affordances
- the prompt and skill activate a generalized agent workflow
- the benchmark does not hard-block unrelated behavior
- the model therefore spends tokens deciding how to operate inside Paperclip instead of just solving the tiny extraction task

So the growth in token use is better explained by strategy drift inside the same harness than by direct session accumulation.

## Is Paperclip Engine "Too Dumb"?

That wording is too coarse, but the current behavior does show that the engine is too permissive for this benchmark purpose.

More precise diagnosis:

- the core is optimized for general agent work, not for a minimal benchmark harness
- the benchmark preflight is only a presence check, not a hard execution constraint
- the prompt still advertises capabilities that are harmful for this test
- the agent is still treated like a broad Paperclip operator, not a benchmark worker

So the problem is not simply model quality or raw engine intelligence.

The problem is mismatch:

- broad workflow harness
- tiny deterministic benchmark task

That mismatch creates avoidable token waste.

## What This Means For DGDH Strategy

This result is valuable because it answers a strategic question.

It suggests that DGDH should not yet treat the current Paperclip path as a clean productivity baseline.

Instead, it should treat the current path as an overhead-diagnostic baseline.

That distinction matters:

- a productivity baseline asks: how much does the task cost?
- an overhead baseline asks: how much extra system behavior is wrapped around the task?

Right now, this T1 benchmark is mostly answering the second question.

That is still useful.

It tells us that before adding more features, DGDH should seriously consider whether the inherited core is carrying too much general-purpose agent behavior for the kind of tight, quota-sensitive, firm-specific coordination system the founder wants.

In other words:

The benchmark is not a failure. It revealed exactly the kind of overhead risk the founder wanted to detect before building deeper on top of the current substrate.

## Best Next Steps

### Immediate next step

Build a stricter benchmark floor test.

Required properties:

- one target file only
- one allowed tool only: `read_file`
- no `run_shell_command`
- no skill activation
- no API access note
- no issue mutation behavior
- hard-fail if any non-target file is accessed
- hard-fail if output is not raw JSON

This should become the true minimal token floor for the T1 task.

### Second next step

Instrument the benchmark to record policy violations explicitly.

For example:

- `read_non_target_file`
- `shell_command_used`
- `issue_api_touched`
- `other_issue_context_touched`
- `non_json_output`

Without this, many expensive runs will still be marked as "succeeded" even when they violated the benchmark contract.

### Third next step

Compare three layers separately.

1. Minimal floor harness
2. Current Paperclip harness
3. Future Morph-enhanced harness

This will show whether improvements come from:

- narrower prompt/core design
- better tools
- stronger enforcement
- or all three together

### Fourth next step

Do not add T2 or T3 as default benchmarks yet.

Those are useful later, but right now they would widen measurement noise before the minimal floor is understood.

## Recommended Interpretation For External Reflection

If another AI reviews this work, it should not conclude:

- Gemini is too expensive by nature
- the company benchmark idea is wrong
- repeated runs are useless

It should conclude:

- the benchmark idea is correct
- the current benchmark harness is still too broad
- the three runs already revealed real waste sources
- the next task is to separate core overhead from task cost

That is the key learning.

## Final Bottom Line

The three-run T1 baseline did exactly one important job successfully:

It demonstrated that the current Paperclip execution path adds large and unstable overhead to a tiny single-file task.

The main causes were:

- broad Paperclip skill activation
- overly permissive runtime affordances
- API/shell guidance inside the benchmark prompt
- lack of hard post-launch scope enforcement
- stochastic strategy drift between runs

The best next move is not to abandon benchmarking.

The best next move is to build a stricter minimal benchmark floor so DGDH can measure:

- true task cost
- harness overhead
- later tool savings

That will support the founder vision much better than continuing to optimize against a noisy, semi-generalized benchmark loop.

## External Reflection Alignment (2026-03-18)

An external review validated the core diagnosis and suggested sharper benchmark framing.

This report now adopts the following clarifications as explicit operating guidance.

### Clarification 1: Current T1 is overhead-diagnostic, not yet a pure task benchmark

The three-run series should be interpreted as:

- useful measurement of default harness overhead behavior
- not yet a deterministic single-task floor

This distinction is now normative for internal reporting language.

### Clarification 2: Token accounting must be componentized

Do not rely on one combined benchmark-token number alone.

Every run record should include at minimum:

- provider input tokens
- provider cached input tokens
- provider output tokens
- tool-call counts by tool
- policy-violation events by type
- run duration seconds

This prevents ambiguity when costs move due to prompt size, tool loops, cache effects, or retry behavior.

### Clarification 3: Success criteria must be strict PASS or FAIL

For T1 floor mode, a run is PASS only if all conditions are true:

- exactly one allowed file path was read
- no non-target file read occurred
- no shell command was used
- no API call was used
- no other issue context was touched
- output is raw JSON (no fence, no prose)
- output schema is exact

Any violation is FAIL with diagnostic value.

### Clarification 4: Baselines must be separated and versioned

Starting now, benchmark comparison should be structured as two mandatory baselines:

- Baseline A: `T1-floor-v1` (hard deterministic floor)
- Baseline B: `T1-paperclip-default-v1` (current operational path)

Future optimization lanes should be added as separate versions (example: Morph variants) rather than mixed into one moving target.

### Immediate procedural implication

Do not expand default benchmark scope to T2/T3 until T1 floor variance is low and policy-compliant PASS rates are stable.

## Live Floor Execution Update (2026-03-18)

The first real T1 floor series was executed with 3 live repeats.

Run set:

- DAV-18 / runId 653b661a-dc56-4280-9976-a04af2fca302
- DAV-19 / runId 1ac56ad4-5fd1-4648-bc30-ed235f06edb0
- DAV-20 / runId dae49760-6d8b-4e18-947a-cfd609547940

Series outcome:

- passCount: 0
- failCount: 3
- passRate: 0%
- stablePass: false
- hasCancelIssued: true
- totalTokensSpreadRatio: null
- inputTokensSpreadRatio: null

Per-run behavior pattern was consistent:

- all three runs were cancelled
- first forbidden pattern was skill activation
- run_shell_command followed in each run
- raw output was not valid JSON
- token measurement status was missing for all three runs

Violation histogram for the series:

- skill_activation_used: 3
- shell_command_used: 3
- run_not_succeeded: 3
- non_json_output: 3
- api_call_used: 2

Condition consistency evidence captured during the same execution window:

- same agent id across all runs: 435dd097-865a-4e41-b6e5-f4a6de3d6c21
- same model across all runs: gemini-3-flash-preview
- same target path across all runs: packages/adapters/gemini-local/src/server/models.ts
- adapterConfigHash: cacebfd6b324deabe2541ede330a192c15a451465df714ed74a5edc29ab771a7
- targetFileHash: 6d356889f27ecb192533b4b7a43784b551beb65b9affd454d35fc7bb78b3482a

Decision from this live floor attempt:

- no default A/B comparison yet
- no Morph evaluation yet
- floor determinism is not established

Interpretation:

The benchmark harness now detects and classifies violations correctly, but current runtime behavior still escapes the strict floor contract early (skill and shell path) before a clean read-only extraction can occur.

## Injection-Point Analysis And Hardening Update (2026-03-18)

The floor-failure series was traced to concrete pre-task injection points.

Observed injection points:

- Worker identity prompt default was injected by adapter prompt template default (`Continue your Paperclip work`).
- Paperclip API/shell affordance was injected by adapter runtime note (`Paperclip API access note` and `run_shell_command` examples).
- Paperclip skill availability came from adapter-side Gemini skill symlink injection before execution.

Hardening changes applied:

- Issue context now extracts benchmark family and marks strict floor mode when `Benchmark family: T1-floor-v1` is present.
- Strict floor context now records explicit tool intent (`paperclipAllowedTools = [read_file]`, blocked list including shell/search/skill activation).
- Gemini adapter now switches to a strict floor execution mode before adapter run when strict floor context is set.
- In strict floor mode, adapter disables Gemini skill injection and logs that suppression explicitly.
- In strict floor mode, adapter suppresses instruction-prefix injection, session handoff note, Paperclip env note, and API access note.
- In strict floor mode, adapter uses a minimal floor prompt template and strict gate note instead of general worker framing.
- In strict floor mode, adapter avoids session resume to reduce inherited workflow drift.

Net effect:

- floor enforcement now acts earlier in the execution path (pre-adapter prompt/tool affordance reduction), not only via post-start cancellation logic.

## Validation Status After Hardening

Code-level hardening is implemented, but live validation requires running against the same populated runtime instance that contains the benchmark company and agents.

Current state observed during validation:

- updated server instance started successfully on port 3100
- health endpoint returned ok
- benchmark invocation on port 3100 failed with `Agent not found` for `Research-Gemini`

Implication:

- pre-adapter hardening changes are in place in code
- full 3x live verification of the hardened path is pending runtime alignment (same company/agent data on the updated server instance)

## Runtime Parity Manifest For First Hardened Floor Series (2026-03-18)

To avoid mixed-runtime interpretation, the first hardened strict-floor series is pinned to one runtime instance and one lane identity.

Pinned runtime for the next live series:

- serverPort: 3100
- baseUrl: http://127.0.0.1:3100
- gitCommit: cb2dee56e2a4ae794033c64ce9f8f765c71fd4eb
- companyId: 66840538-7030-4ed8-8e62-983e0b5159d8
- agentId: 7f6d741f-dcd8-44a5-ba55-a72d94a61fad
- agentName: Research-Gemini
- adapterType: gemini_local
- adapterConfigJson: {"model":"gemini-3-flash-preview"}
- adapterConfigHash: 21c4cf2acf355c8bf33f7d4ce3f96c326b851bf6e5400da372c5bd2846ac172c
- benchmarkFamily: T1-floor-v1
- targetPath: packages/adapters/gemini-local/src/server/models.ts
- targetFileHash: 6d356889f27ecb192533b4b7a43784b551beb65b9affd454d35fc7bb78b3482a

Runtime parity status:

- Hardened runtime 3100 is reachable and healthy.
- Research-Gemini lane now resolves on 3100 in benchmark dry-run.
- No additional benchmark interpretation should use legacy 3101 run history for hardened-floor conclusions.
