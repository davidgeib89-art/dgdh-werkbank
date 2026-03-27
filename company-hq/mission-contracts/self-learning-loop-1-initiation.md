# Self Learning Loop 1 Initiation

Status: proposed bounded mission contract
Authority: David
Mode: `mission autonomy mode`
Mission ID: `self-learning-loop-1-initiation`

## Objective

Move DGDH from repair-heavy task autonomy toward the first real mission-bounded self-improvement loop.

This mission must deliver:

1. `mission-contract-v1`
2. `substrate-boundary-cut-v1`
3. one first technical cut: `firm-identity-export-recovery-truth-v1`

## Primary Metric

- DGDH gains one reviewable, reusable firm-identity export/recovery surface that makes durable firm truth more explicit than raw runtime/DB state alone.

## Guard Metrics

- no destructive mutation of existing company runtime state
- no provider switch
- no new platform stack
- no unbounded dashboard or observability expansion
- no claim that DGDH is reducible to the current Paperclip runtime

## Budget

- one coherent branch-sized implementation cut
- targeted tests plus package typecheck
- no broad speculative subsystem rewrite

## Runtime

- one bounded execution sprint

## Blast Radius

- docs and company portability/export surfaces
- shared contract types/validators
- CLI export path
- targeted tests

## Allowed Zones

- `company-hq/**`
- `doc/plans/**`
- `packages/shared/**`
- `server/src/services/company-portability.ts`
- `server/src/routes/companies.ts`
- `cli/src/commands/client/company.ts`
- directly related tests

## Forbidden Zones

- provider migrations
- new runtime orchestration stack
- broad issue/run/heartbeat rewrites unrelated to firm identity export
- destructive DB operations

## Escalation Reasons

- the existing portability seam cannot express durable firm identity without widening into a new platform
- the chosen cut would require Type-1 changes beyond a bounded branch/package truth cut
- tests reveal that the current carrier blocks durable export in a way that cannot be solved reviewably in this seam

## Promotion Criteria

- the three deliverables exist in reviewable form
- the technical cut is implemented, not only described
- tests and typecheck pass
- end state can state clearly whether `Paperclip traegt`, `Paperclip traegt mit kleinem Umbau`, or `Paperclip blockiert hier hart`
