# BOARD MEMO - Probe-01 Status

Status date: 2026-03-17
Decision owner: David (Board)
Scope: One controlled-live probe only, no broad rollout

## 1) Ampelstatus

- Overall status: WARNUNG
- Technical readiness: GELB-GRUEN
- Operational readiness: GELB
- Governance readiness: GELB

Reason in one line:

- The technical shadow/preflight/gate baseline is in place, but start-critical board fill-ins are still open.

## 2) Decision Readiness Snapshot

What is ready now:

- Resolver/preflight/shadow path is attached in read-only form.
- Gate logic for GO/WARNUNG/NO-GO exists.
- Stop conditions are defined.
- Board packet, ops checklist, and decision brief exist.

What is not ready yet:

- Final approved threshold set is not locked in one board record.
- Final probe envelope IDs/window are not locked in one board record.
- Stop authority ownership and readout ownership/deadline are not locked.

## 3) Top Risks (Current)

1. Governance gap at start gate

- If final threshold and ownership fields are not bound, start authority is ambiguous.

2. Operational ambiguity during probe window

- If primary/backup stop owner is not explicit, response time on stop triggers degrades.

3. Premature expansion risk

- Any move from single probe to broader activation before readout would break current policy line.

## 4) Open Fill-ins (Must Close Before GO)

Checklist for board sign-off:

- [ ] Threshold set approved and recorded

  - [ ] minComparedSamples
  - [ ] minParityRate
  - [ ] maxFailDecisions
  - [ ] maxReadOnlyViolations

- [ ] Probe envelope approved and recorded

  - [ ] agentId
  - [ ] laneId
  - [ ] taskTemplateId or taskClass
  - [ ] probeWindowStart
  - [ ] probeWindowEnd

- [ ] Stop authority approved and recorded

  - [ ] primary owner
  - [ ] backup owner

- [ ] Readout accountability approved and recorded
  - [ ] readout owner
  - [ ] board readout due time

## 5) Decision Options For Board

Option A - Keep WARNUNG (recommended now)

- Hold GO until all must-fill items are complete and signed.
- Continue shadow/read-only baseline only.

Option B - GO for one controlled probe

- Allowed only after all must-fill items above are complete.
- Scope is locked to one agent, one lane, one task type, one window.
- Immediate stop on hard triggers.

Option C - NO-GO

- Reject probe start until hard blockers are removed.
- Use if governance confidence drops or stop ownership cannot be guaranteed.

## 6) Proposed Board Resolution Text

Recommended immediate resolution:

- Decision: WARNUNG
- Rationale: Technical readiness is adequate, but start-critical governance/ops fill-ins are incomplete.
- Required actions: Complete and sign all must-fill fields in Section 4.
- Re-review trigger: Board reconvenes immediately after fill-ins are complete.

Conditional release resolution (to apply only after fill-ins close):

- Decision: GO (single controlled-live probe only)
- Constraints:
  - no automatic shadow-to-enforcement switching
  - no default-path prompt rewrite activation
  - no scope expansion beyond approved envelope
- Stop triggers (immediate abort):
  - any readOnly violation
  - any fail decision
  - any execution branching tied to shadow/gate outputs
  - any scope escape from approved envelope
- Required post-probe output:
  - fixed readout with recommendation: GO-compatible, WARNUNG, or NO-GO

## 7) Next Board Action

- Next action: confirm Section 4 fields in one signed board record.
- Then: take explicit GO/WARNUNG/NO-GO vote for exactly one probe.
- Not in scope now: shared memory live activation, broad multi-agent activation, or stage-2 expansion.
