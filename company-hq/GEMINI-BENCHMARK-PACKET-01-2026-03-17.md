# Gemini Benchmark Packet 01 - Current State Snapshot

Status: draft benchmark packet
Date: 2026-03-17
Purpose: first small real Gemini work packet for a useful, measurable, repeatable company task

## Why This Packet Exists

This packet is designed to create the first practical Gemini productivity baseline for DGDH.

It is intentionally:

- small
- read-only
- useful to the founder
- easy to score by eye
- constrained enough to compare across repeated runs

It is not a governance probe.
It is an operational productivity benchmark.

## Baseline Purity Rule

This packet is the no-Morph baseline packet.

- Morph MCP is not part of this baseline run.
- Morph Compact is not part of this baseline run.

Reason:

- baseline attribution must stay clean before tool-layer optimization is introduced.

## Work Packet Identity

- workPacketId: `gemini-benchmark-01-current-state-snapshot`
- missionLink: `establish-first-productive-gemini-baseline`
- backlogItemRef: `phase-1-gemini-baseline`
- requestedBy: `David Geib`
- assignedAgentRole: `Gemini`
- autonomyMode: `Supervised Build`

## Objective

Read a fixed set of canonical DGDH documents and produce one compact current-state snapshot for founder use.

The output should help David answer three questions quickly:

1. What is the current true operating focus?
2. What are the top 3 current risks?
3. What are the next 3 smallest useful steps?

## Expected Output

The run should return exactly two artifacts in the issue/thread output:

1. a short markdown summary
2. a machine-readable JSON block

### Markdown summary format

Use exactly these sections:

- Current Focus
- Top 3 Risks
- Next 3 Steps

Rules:

- keep the whole markdown section under 220 words
- no motivational language
- no long explanation paragraphs
- each risk and each next step must be concrete

### JSON format

```json
{
  "currentFocus": ["...", "..."],
  "topRisks": ["...", "...", "..."],
  "nextSteps": ["...", "...", "..."],
  "sourceFiles": ["...", "...", "..."]
}
```

Rules:

- exactly 2 items in `currentFocus`
- exactly 3 items in `topRisks`
- exactly 3 items in `nextSteps`
- `sourceFiles` must list only files actually read

## Fixed Inputs

Allowed files for this packet:

- `company-hq/CURRENT-STATE-REVIEW-2026-03-17.md`
- `company-hq/VISION.md`
- `company-hq/MODEL-ROADMAP.md`
- `company-hq/AGENT-PROFILES.md`
- `company-hq/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md`

The preferred minimum read set is:

- `company-hq/CURRENT-STATE-REVIEW-2026-03-17.md`
- `company-hq/MODEL-ROADMAP.md`
- `company-hq/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md`

## Strict Scope

In scope:

- read the allowed files
- extract present-state signal
- summarize current focus, risks, and next steps
- return markdown plus JSON

Out of scope:

- editing files
- broad repo exploration
- reading implementation code
- proposing large architecture changes
- inventing new tracks or new company goals
- converting this into a Probe-01 approval decision

Forbidden areas:

- all files outside the allowed file list
- server/
- packages/
- ui/
- secrets or environment files

External systems allowed:

- none

## Execution Plan

- phaseARequired: `no`
- phaseAQuestions: none
- phaseBAllowedWhen: immediate, because this packet is read-only and tightly scoped

Implementation constraints:

- read at most 5 files
- do not use broad file search if the allowed files exist
- do not expand scope to implementation suggestions beyond the required output
- prefer the minimum file set that can still produce a high-confidence answer

## Budget and Limits

Budget class: smaller than standard `Small Task`

- tokenBudgetDiagnose: `3000`
- tokenBudgetImplementation: `6000`
- tokenBudgetVerification: `2000`
- hardTokenCapRun: `11000`
- maxRuntimeMinutes: `15`
- maxFilesChanged: `0`

Retry policy for this packet:

- max retries: `2`
- retry allowed only if the previous output broke format, missed required sections, or was judged too vague

## Success Criteria

The run is successful only if all are true:

- output contains the 3 required markdown sections
- markdown stays under 220 words
- output includes valid JSON with exact list counts
- risks are specific enough to act on
- next steps are small enough to execute this week
- no files outside the allowed list were needed
- total token use stays below the hard cap

## Verification

Required checks:

- markdown sections present
- JSON parses successfully
- item counts match specification
- all next steps are concrete actions, not abstract themes

Smoke tests:

- founder can read the whole output in under 2 minutes
- founder can decide whether the run was useful without extra explanation

Acceptance evidence:

- final markdown output
- final JSON output
- run token usage
- run duration
- human usefulness score

minimalEvidenceOnly: `yes`

## Human Evaluation Record

After each run, record:

- runId
- date/time
- inputTokens
- outputTokens
- cachedInputTokens
- costUsd if available
- durationMinutes
- usefulnessScore from 1 to 5
- formatPass: yes/no
- notes: one short sentence only

## Stop and Escalation

Immediate stop conditions:

- packet tries to read files outside the allowed set
- packet exceeds hard token cap
- packet attempts to turn into architecture redesign
- packet output is missing required structure and cannot be corrected within retry policy

Escalation trigger:

- repeated vagueness across 2 runs
- hard cap reached before usable output
- contradiction between current-state review and board memo cannot be resolved inside scope

Escalation target: `David`

## Interpretation Rule

This packet is good if it produces a compact, useful founder snapshot cheaply.

This packet is not trying to prove:

- full autonomous capability
- governance probe approval
- multi-lane readiness
- architectural completeness

It is trying to prove one smaller thing:

- Gemini can do a real bounded company task with enough clarity and enough token discipline to justify further optimization.

## Run Metadata Template

- runId:
- phaseReached:
- tokenUsedEstimate:
- status:
- escalationOccurred: yes/no
- summary:
