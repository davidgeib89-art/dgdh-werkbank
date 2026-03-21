# CONTROLLED-LIVE-PROBE-01-BOARD-PACKET

Status: draft-for-board
Date: 2026-03-17
Owner: DGDH Governance Track
Scope: One narrow controlled-live probe, preparation only (no execution in this sprint)

Related operational artifact:

- CONTROLLED-LIVE-PROBE-01-OPS-CHECKLIST.md
- Decision entrypoint: CONTROLLED-LIVE-PROBE-01-DECISION-BRIEF.md

## Objective

Prepare exactly one tightly scoped controlled-live probe for the adapter-near prompt path so the board can decide GO/WARNUNG/NO-GO based on explicit thresholds and stop rules, without any automatic shadow-to-enforcement switch.

## Proposed Thresholds

| Metric                | Conservative Start Value | Minimal Vertretbarer Wert | Open Uncertainty                                                                         |
| --------------------- | -----------------------: | ------------------------: | ---------------------------------------------------------------------------------------- |
| minComparedSamples    |                       20 |                         8 | Sample representativeness across one lane may vary by task mix.                          |
| minParityRate         |                     1.00 |                      0.99 | Rare formatting deltas may appear without policy impact; needs board tolerance decision. |
| maxFailDecisions      |                        0 |                         0 | Any fail currently indicates hard governance break and should remain zero-tolerance.     |
| maxReadOnlyViolations |                        0 |                         0 | Any readOnly violation implies unsafe behavior and must remain zero-tolerance.           |

Threshold recommendation for Probe-01 approval vote:

- Primary recommendation: use conservative values.
- Fallback recommendation: allow minimal values only for first-time lane bootstrap when sample volume is the sole blocker.

## Probe Setup

Probe type:

- Single controlled-live probe on one existing adapter-near prompt path with shadow telemetry already attached.

Selected path:

- Gemini-local adapter prompt handoff at execute meta emission path.

Agent and lane:

- Exactly one pre-approved Gemini-local agent.
- Exactly one dedicated board lane (no mixed-lane traffic).

Task type:

- Single-file benchmark style task only.
- One narrow issue class with explicit file target constraints.

Why this is maximally controllable:

- Existing path already emits promptResolverDryRunPreflight and promptResolverShadow in read-only form.
- Scope can be constrained to one agent, one lane, one task type, one target style.
- Shadow and gate signals can be assessed without introducing execution branching.

## Required Telemetry For Probe Readout

Mandatory fields per reviewed sample:

- promptResolverDryRunPreflight.resolverDecision
- promptResolverDryRunPreflight.reasonCodes
- promptResolverDryRunPreflight.auditMeta.dryRunObserved
- promptResolverShadow.resolverPath.resolverDecision
- promptResolverShadow.resolverPath.reasonCodes
- promptResolverShadow.comparison.promptsEquivalent
- promptResolverShadow.comparison.legacyPromptSha256
- promptResolverShadow.comparison.resolvedPromptSha256
- promptResolverShadow.auditMeta.mode
- promptResolverShadow.auditMeta.readOnly
- promptResolverShadow.auditMeta.source

Mandatory aggregate readout:

- comparedCount
- parityRate
- resolverDecision distribution
- reasonCode distribution
- readOnly violation count

## Immediate GO/WARNUNG/NO-GO Signals After Probe Window

GO:

- comparedCount meets approved minimum.
- parityRate meets approved threshold.
- fail decisions equal 0.
- readOnly violations equal 0.

WARNUNG:

- Only sample count is below minimum.
- No hard breaches (parity, fail decisions, readOnly violations).

NO-GO:

- parity below threshold.
- any fail decision observed.
- any readOnly violation observed.

## Stop Conditions

Abort probe immediately if any condition is true:

- readOnly violation detected.
- any fail decision detected.
- any evidence of execution branching tied to shadow/gate outputs.
- any evidence of default-path prompt rewrite behavior.
- scope escapes agreed single-agent/single-lane/single-task envelope.

## Rollback Assumptions

Rollback is configuration and process rollback, not runtime patching:

- Disable probe schedule and return lane to shadow-only review mode.
- Keep existing default production path unchanged.
- Preserve telemetry artifacts for board postmortem.
- Require fresh board approval for any new probe attempt.

## Probe Invariants (Must Never Be Violated)

- No automatic shadow-to-enforcement switching.
- No prompt manipulation in the default production path.
- No execution branching based on shadow/gate helper output.
- No unapproved runtime activation pattern expansion.
- Manual board control remains mandatory at every phase boundary.

## Board Decision Section

Decision options:

- GO: Approve Probe-01 with conservative thresholds.
- WARNUNG: Hold GO, require additional samples under shadow-only mode.
- NO-GO: Reject probe start until hard issues are resolved.

Board record fields:

- Decision: [GO | WARNUNG | NO-GO]
- Approved thresholds: [minComparedSamples, minParityRate, maxFailDecisions, maxReadOnlyViolations]
- Approved lane and agent: [explicit IDs]
- Probe window: [start/end]
- Required follow-up date: [YYYY-MM-DD]
- Conditions or amendments: [text]
