# DGDH Escalation Matrix

Version: 1.0

## Purpose

Define who must be escalated, when, and whether work must stop.

## Immediate Stop Cases (all agents)

- hard token cap reached
- missing required task brief fields
- request conflicts with constitution
- unauthorized file/system boundary crossed
- potential security, secrets, or data integrity incident

Action:

- stop current expansion
- write minimal incident summary
- escalate to David

## Claude Escalates When

- mission ambiguity blocks safe planning
- backlog item conflicts with constitution or budget policy
- architecture impact extends beyond approved packet

Escalation target:

- David for decision
- Codex only after approved plan

## Codex Escalates When

- implementation requires scope expansion
- expected file changes exceed cap
- unresolved risk appears during phase B
- repeated failures exceed retry threshold

Escalation target:

- Claude first for technical decision
- David if policy, scope, or budget override is required

## Gemini Escalates When

- review finds high-risk regression
- evidence quality insufficient for acceptance
- unresolved contradiction between implementation and brief

Escalation target:

- Claude for technical re-plan
- David for acceptance or release gate decision

## David Decision Required

- mode switch
- budget override
- constitution exception
- mission scope change
- any immediate stop incident

## Response Time Classes

- P0 immediate stop: halt now, escalate now
- P1 major scope or budget risk: escalate before continuing
- P2 normal clarification: continue in safe subset while waiting

## Escalation Payload (minimal)

Include only:

- workPacketId
- runId
- current phase
- blocking condition
- options (1-3)
- recommended next action
