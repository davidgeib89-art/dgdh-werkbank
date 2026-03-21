# CONTROLLED-LIVE-PROBE-01-DECISION-BRIEF

Status: board-ready-draft
Date: 2026-03-17
Decision owner: David (Board)
Scope: One controlled-live probe only, no execution in this sprint

## Current Status

Current status recommendation: WARNUNG

Interpretation:

- Technical gate logic and operational checklist are prepared.
- Probe guardrails and stop conditions are explicit.
- Final start-critical fill-ins are still open and must be set before GO.

## Evidence Summary

Shadow/Gate readiness evidence:

- Gate rules for GO/WARNUNG/NO-GO are defined.
- Zero-tolerance rules for fail decisions and readOnly violations are defined.
- Required shadow telemetry fields are explicitly listed.

Ops readiness evidence:

- Pre-run, run-time, and post-run checks are defined.
- Scope box (one agent, one lane, one task type, one window) is defined.
- Immediate abort triggers are defined.

Remaining gap type:

- Mostly governance/operations fill-ins, not architecture gaps.

## Recommended Board Decision

Recommendation: WARNUNG (hold GO until fill-ins are complete)

Reasons:

- Probe envelope details are not yet fully bound in board record (final IDs/window/ownership).
- Threshold set must be explicitly approved in one final board record entry.
- Readout ownership and response timing must be locked before start authorization.

Decision flip conditions:

- Move WARNUNG -> GO immediately after all required fill-ins are completed and signed off.

## Required Fill-ins Before Start Decision

Must fill before GO:

1. Final threshold set chosen and recorded:
   - minComparedSamples
   - minParityRate
   - maxFailDecisions
   - maxReadOnlyViolations
2. Final probe envelope recorded:
   - agentId
   - laneId
   - taskTemplateId or taskClass
   - probeWindowStart
   - probeWindowEnd
3. Stop authority and on-call owner recorded:
   - primary owner
   - backup owner
4. Readout responsibility and deadline recorded:
   - readout owner
   - board readout due time

Should fill before GO:

1. Prior shadow baseline reference for same task class.
2. Confirmed low-noise lane window (no competing high-risk experiments).

Nice-to-have before GO:

1. Pre-filled readout form with static metadata.

## Explicit Next Step After GO

After GO, perform only this sequence:

1. Freeze the approved probe envelope and thresholds in board record.
2. Confirm stop authority availability for full probe window.
3. Execute exactly one probe under approved envelope.
4. Produce immediate post-probe readout using the template below.
5. Return final recommendation to board: GO-compatible / WARNUNG / NO-GO.

## Post-Probe Readout Template (Fixed)

Header:

- probeId:
- agentId:
- laneId:
- taskTemplateIdOrClass:
- probeWindow:
- readoutTimestamp:

Thresholds:

- approved.minComparedSamples:
- approved.minParityRate:
- approved.maxFailDecisions:
- approved.maxReadOnlyViolations:
- observed.comparedSamples:
- observed.parityRate:
- observed.failDecisions:
- observed.readOnlyViolations:
- thresholdVerdict: [pass | fail]

Resolver/Shadow Telemetry:

- preflight.decisionDistribution: { ok, fail, escalated }
- shadow.decisionDistribution: { ok, fail, escalated }
- reasonCodeDistribution:
- parity.promptsEquivalentRate:
- parity.hashMismatchCount:

Adapter/Invoke Signals:

- adapterStartedSummary:
- invokeSuppressedSummary:
- promptHeaderConsistencySummary:

Safety/Quality:

- scopeFidelity: [pass | fail] + notes
- outputValidity: [pass | fail] + notes
- stopTriggerHit: [yes | no]
- stopTriggerDetails:

Final Board Return Recommendation:

- recommendation: [GO-compatible | WARNUNG | NO-GO]
- rationale:
- requiredActions:
- owner:
- dueBy:

## Explicit Non-Action Statement

This brief does not run a probe, does not activate runtime, does not modify enforcement behavior, and does not introduce live wiring.
