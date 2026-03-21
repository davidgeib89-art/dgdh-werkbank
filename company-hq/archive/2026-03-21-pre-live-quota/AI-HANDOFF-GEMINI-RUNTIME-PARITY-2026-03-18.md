# AI Handoff - Gemini Runtime Parity and Strict-Floor Benchmark

Status: active handoff
Date: 2026-03-18
Audience: new CLI AI operator, local Copilot session, ChatGPT reflection lane
Purpose: re-enter the current DGDH benchmark workstream without mixing old runtime evidence, old benchmark conclusions, or default-vs-floor measurements

## Working Mode

DGDH is continuing with a split-AI operating model.

Use the lanes like this:

1. Copilot in VS Code:
   - short repo analysis
   - diff review
   - code edits
   - handoff writing
   - result interpretation after runs
2. CLI AI:
   - local runtime bring-up
   - runtime parity verification
   - deterministic benchmark execution
   - log and metric collection
3. ChatGPT web lane:
   - reflection on important strategic choices
   - challenge unclear conclusions
   - compare options after evidence exists

Do not use Copilot as the main operator for repeated live benchmark retries in this workstream.

## Company Context

DGDH is a solo-run, founder-funded AI company in build mode.

The goal here is not generic feature shipping.
The goal is to establish a clean and reproducible measurement system for token usage and harness overhead in the current Paperclip-based DGDH system.

Gemini is the first optimization lane because quota and cost characteristics make it the best current measurement path.
The deeper purpose is to optimize the shared core that later agents will also depend on.

## Benchmark Objective

This strand is about separating tiny-task cost from Paperclip/harness overhead.

Two baselines exist and must not be merged:

1. `T1-floor-v1`
   - strict minimal task floor
   - one file only
   - raw JSON only
   - no shell
   - no API behavior
   - no skill activation
2. `T1-paperclip-default-v1`
   - current real Paperclip default path for the same tiny task

The sequence is fixed:

1. establish a valid, reproducible `T1-floor-v1`
2. only after that run `T1-paperclip-default-v1`
3. only after that discuss Morph MCP / Compact as an optimization layer

## Important Findings So Far

Earlier T1 runs showed very large and unstable token cost for a tiny single-file task.

That result should be interpreted like this:

1. the task itself was small
2. the measured cost was mostly surrounding harness/runtime behavior
3. therefore the first result was more an overhead benchmark than a clean task-floor benchmark

The benchmark harness was then hardened.

Hardenings already implemented:

1. PASS/FAIL logic
2. reason codes
3. component metrics
4. cancel and forbidden-tool telemetry
5. `stablePass` logic
6. strict-floor runtime suppression of:
   - generic worker identity behavior
   - skill injection
   - API/runtime affordance notes
   - session resume
   - Paperclip skill symlinks

Root cause already found and fixed:

- strict-floor detection was previously too fragile because the benchmark family match failed when suffix behavior changed
- detection now uses `startsWith`

## Verified Current Code State

These modified files contain the active benchmark work:

1. `packages/adapters/gemini-local/src/server/execute.ts`
   - strict-floor gating
   - skill injection suppression
   - session suppression
   - floor env flags
   - prompt-path suppression of default Paperclip affordances
2. `scripts/gemini-micro-benchmark-suite.ps1`
   - benchmark family split
   - repeats-based series
   - policy log scan
   - cancel-on-forbidden-use in strict floor mode
   - reason code capture
   - raw JSON and schema validation
   - run summary with `stablePass`
3. `company-hq/GEMINI-T1-BASELINE-ANALYSIS-2026-03-18.md`
4. `company-hq/GEMINI-T1-BENCHMARK-DESIGN-V2-2026-03-18.md`
5. `company-hq/GEMINI-T1-DRY-RUN-CHECKBERICHT-2026-03-18.md`
6. `company-hq/GEMINI-MICRO-BENCHMARK-SUITE-2026-03-18.md`

Most recent local commit in this worktree is not benchmark logic.
It is a heartbeat persistence hardening commit:

- commit: `5705804`
- message: `Server: harden heartbeat persistence for legacy DB encodings`

## Runtime Parity Status

Do not assume old benchmark runs on the older runtime are evidence for the hardened floor.

Latest live parity verification status is:

1. hardened runtime on port `3100` is reachable
2. `Research-Gemini` resolves in the intended company context
3. company id, agent id, agent name, adapter type, adapter config, model config, benchmark family, target path, and target file hash match
4. the strict-floor benchmark issue exists on the live runtime
5. repo/workspace binding is still unresolved

Current live mismatch:

- heartbeat-run context is falling back to the agent-home workspace under `.paperclip/instances/default/workspaces/...`
- `paperclipWorkspace.worktreePath = null`
- `paperclipWorkspaces = []`
- the run context is not yet bound to `C:\Users\holyd\DGDH\worktrees\dgdh-werkbank`

Root cause currently established:

- the benchmark issue was created without `projectId`
- the live company also lacks a benchmark project primary workspace bound to `C:\Users\holyd\DGDH\worktrees\dgdh-werkbank`
- because of that, heartbeat resolves no project workspace and falls back to agent-home

This means:

- no valid `3x T1-floor-v1` live result exists yet on the correctly bound hardened runtime
- no valid A/B comparison against `T1-paperclip-default-v1` exists yet
- Morph discussion must stay gated

## Anti-Confusion Rules

Follow these rules strictly:

1. do not mix old runtime and new runtime evidence
2. do not mix `T1-floor-v1` and `T1-paperclip-default-v1`
3. do not interpret total token count alone without component metrics
4. do not assume local Morph tooling is automatically active in the real execution path
5. do not treat a default-path run as evidence about the strict floor
6. do not treat old 3101 history as proof of the hardened runtime state

## Required Next Step

The next operational goal is workspace-binding parity on the real target instance.

Minimal safe fix path:

1. create or repoint a dedicated benchmark project workspace so its primary cwd is `C:\Users\holyd\DGDH\worktrees\dgdh-werkbank`
2. create benchmark issues with that `projectId`
3. keep `project_primary` mode for the first fix; `git_worktree` is optional and should be a later step only if needed

Before any new live benchmark run, verify and record all of the following:

1. server port
2. git stand or working state
3. company id
4. agent id
5. agent name
6. adapter type
7. adapter configuration hash
8. model configuration
9. repo/workspace binding
10. benchmark family
11. target file hash

The benchmark agent must exist in the target company context with the intended purpose and configuration, and it must execute from the intended repo/worktree rather than agent-home fallback.

## Required Runtime Parity Checklist

The CLI AI should confirm:

1. correct server instance is running
2. health endpoint answers on the intended port
3. company id matches the intended DGDH target company
4. benchmark agent exists
5. benchmark agent name matches expectation
6. adapter type matches expectation
7. adapter config matches expectation
8. model config matches expectation
9. workspace binding points at the intended repo/worktree

If any of those are wrong, stop and fix parity first.

## Live Benchmark Gate

Only after runtime parity is confirmed:

1. run exactly `3x T1-floor-v1` live on the new hardened runtime
2. accept floor baseline only if all of these are true:
   - `3/3 PASS`
   - `stablePass = true`
   - no cancels
   - no fail reason codes
   - low spread
3. only then run `T1-paperclip-default-v1`

## Preferred Division Of Labor Right Now

Use this assignment unless there is a specific reason not to:

1. CLI AI owns:
   - runtime identification
   - server bring-up
   - parity capture
   - benchmark execution
   - raw evidence collection
2. Copilot owns:
   - repo inspection
   - patching benchmark/runtime code
   - reviewing results
   - writing follow-up docs and decisions
3. ChatGPT owns:
   - high-level reflection after evidence exists
   - challenge on whether to slim Paperclip core, rebuild firm-specific core, or introduce Morph incrementally

## Files To Load First For This Workstream

Load these before acting:

1. `company-hq/AI-CONTEXT-START-HERE.md`
2. `company-hq/GEMINI-T1-BASELINE-ANALYSIS-2026-03-18.md`
3. `company-hq/GEMINI-T1-BENCHMARK-DESIGN-V2-2026-03-18.md`
4. `company-hq/GEMINI-T1-DRY-RUN-CHECKBERICHT-2026-03-18.md`
5. `company-hq/GEMINI-MICRO-BENCHMARK-SUITE-2026-03-18.md`
6. `packages/adapters/gemini-local/src/server/execute.ts`
7. `scripts/gemini-micro-benchmark-suite.ps1`

## Explicit Stop Conditions

Stop and escalate before continuing if any of these happen:

1. benchmark agent is missing on the target instance
2. server instance identity is ambiguous
3. company context does not match expected DGDH target company
4. adapter or model configuration differs from intended benchmark lane
5. a proposed next step would mix legacy runtime evidence with new runtime evidence

## Bottom Line For The New AI

Do not continue from old run history.

Continue from this fact pattern instead:

1. strict-floor hardening is implemented
2. runtime identity parity is mostly verified on port `3100`, but workspace binding is still unresolved
3. the immediate mission is to bind the benchmark run to the intended repo/worktree and then prove the hardened floor is runnable on that correct instance
4. only after that may live benchmark evidence be interpreted
