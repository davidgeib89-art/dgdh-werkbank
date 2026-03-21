# CONTROLLED-LIVE-PROBE-01-OPS-CHECKLIST

Status: draft-for-board
Date: 2026-03-17
Scope: Operational readiness only (no execution in this sprint)

Decision reference:

- CONTROLLED-LIVE-PROBE-01-DECISION-BRIEF.md

## Purpose

This checklist operationalizes Probe-01 so that a later run can be monitored without interpretation drift. It does not authorize execution.

## Probe-01 Recommended Frame

Agent and lane type (recommended):

- One Gemini-local agent with stable prior shadow telemetry quality.
- One dedicated governance lane reserved for Probe-01 only.

Task type (recommended):

- Single-file benchmark style issue.
- Read-focused task with strict target path constraint and explicit no-scope-growth language.

Minimal scope box:

- Exactly one agent.
- Exactly one lane.
- Exactly one issue type template.
- Exactly one probe window.
- No concurrent probe variants.

Selection criteria if concrete IDs are not fixed yet:

- Agent has recent promptResolverShadow presence and readOnly=true history in shadow runs.
- Lane has low operational noise and no competing high-risk experiments.
- Task template has deterministic acceptance text and explicit single-file target instructions.

## Pre-run Checks (Must pass before GO)

1. Board decision recorded as GO with approved thresholds.
2. Approved thresholds are explicit: minComparedSamples, minParityRate, maxFailDecisions, maxReadOnlyViolations.
3. Probe envelope recorded: agent ID, lane ID, task template ID/class, probe window start/end.
4. Confirm no automatic shadow-to-enforcement switching is configured.
5. Confirm no execution branching depends on shadow/gate outputs.
6. Confirm default production prompt path is unchanged.
7. Confirm telemetry collectors can capture:
   - promptResolverDryRunPreflight
   - promptResolverShadow
   - adapter invoke metadata fields (promptHeader, adapterStarted, invokeSuppressed)
8. Confirm stop authority and on-call owner are named for immediate abort decisions.

## Run-time Observation Checks (During probe)

Check continuously per sample/window:

- promptResolverDryRunPreflight present when expected.
- promptResolverShadow present when expected.
- comparison.promptsEquivalent trend.
- resolverDecision trend (ok/fail/escalated).
- reasonCodes trend and emergence of new codes.
- auditMeta.readOnly remains true.
- auditMeta.mode remains shadow.
- auditMeta.source remains gemini_local.execute.
- invokeSuppressed/adapterStarted/promptHeader are coherent with the approved probe mode.
- scope fidelity: task remains inside single-file target and approved lane/agent envelope.
- output validity: run-level outputs are parseable and operationally reviewable.

Immediate abort triggers:

- Any readOnly violation.
- Any fail decision.
- Any evidence of branching driven by shadow/gate output.
- Any scope escape outside approved envelope.

## Post-run Checks (Immediate readout window)

1. Produce aggregate summary:
   - comparedCount
   - parityRate
   - resolverDecision distribution
   - reasonCode distribution
   - readOnly violation count
2. Classify outcome: GO-compatible, WARNUNG, or NO-GO per approved rules.
3. Confirm whether fail/escalated/readOnly behavior matches expectation.
4. Confirm scope fidelity and output validity conclusions.
5. Record anomalies and whether they are policy-relevant or formatting-only.
6. Publish board readout package within the agreed follow-up time.

## Board Readout Format (Required)

Header:

- Probe ID
- Agent ID
- Lane ID
- Task template/class
- Probe window
- Decision summary (GO-compatible / WARNUNG / NO-GO)

Threshold block:

- Approved thresholds
- Observed metrics
- Pass/fail per threshold

Telemetry block:

- promptResolverDryRunPreflight summary
- promptResolverShadow summary
- parity details (including hash mismatch count)
- fail/escalated/readOnly counts
- adapter metadata coherence:
  - adapterStarted
  - invokeSuppressed
  - promptHeader consistency

Safety block:

- Scope fidelity verdict
- Output validity verdict
- Any stop-trigger hit (yes/no + details)

Board recommendation block:

- Recommendation: proceed / hold / reject next probe
- Required corrective actions (if any)
- Owner and deadline

## Preconditions Before GO

Must-have:

- Board-approved thresholds and envelope are explicitly recorded.
- Manual stop authority is assigned.
- Shadow telemetry and adapter metadata capture confirmed.
- Zero-tolerance rules remain active for fail decisions and readOnly violations.

Should-have:

- Prior shadow-only sample baseline for same task template available.
- Predefined readout owner and backup reviewer assigned.
- Probe window avoids major parallel operational changes.

Nice-to-have:

- Lightweight rehearsal of readout generation on historical shadow data.
- Pre-filled board readout template with IDs and placeholders.

## Explicit Non-Goals

- No model runs in this sprint.
- No probe execution in this sprint.
- No runtime activation changes.
- No new live wiring.
- No automatic enforcement switching.
- No default-path prompt manipulation.
