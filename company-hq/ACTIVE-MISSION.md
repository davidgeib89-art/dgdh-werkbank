# ACTIVE MISSION

Status: active
Owner: David
Execution lane: `Eidan` / Copilot
Mode: `mission autonomy mode`
Mission ID: `mission-autonomy-lane-v1`
Current phase: `repeatable-live-mission-cell-proof-v1`

## Objective

Carry DGDH from "one mission cell was used once for real" to
"one hardened mission-cell path was run a second time and proved that the hardening really reduced
future mission restating and continuity loss."

This active mission exists so long-running execution agents can re-anchor fast after compacts,
context loss, or branch handoffs without collapsing back into short paid micro-sprints.

## Terminal question

Can DGDH now take a mission-cell path through:

- live run A
- proof-born hardening
- live run B on the same path
- promotion

so that the second run proves the first hardening really carried?

## Latest proof

Yes on the first bounded live proof.

The real friction discovered during the run was narrower than a platform gap:
the `missionCell` runtime bridge carried charter, risk, and promotion truth,
but not the starter-path continuity an execution lane actually needs to launch and resume cleanly.
That left the mission still depending on manual chat restatement for startup and first probe.

The proof-discovered hardening cut is now the minimal runtime seam:
mission-cell prompt and wakeup context carry `contractFile`, `issueField`, `validate`,
`startupSequence`, and `firstProbe`, so the next Eidan/Copilot run can start from repo truth
with less manual reconstruction.

That is no longer enough for `strong success`.
The next proving container must rerun the hardened path and show that the improvement survives the second live pass.

## Current direction

Use the new mission-cell operating shape on the same bounded internal target:
improve Eidan/Copilot long-autonomy continuity so future runs survive compacts,
resist first-green closure, and hand off clearer mission-state truth.

But now add a stricter bar:
the next mission must rerun the same path after hardening and prove the second live pass is better.

The lane is no longer proving that mission cells can be described.
It is now proving that one mission cell can be used, can hit friction, and can harden itself
without falling back into chat reconstruction.

Keep the ontology clear:

> Paperclip is the current carrier.
> DGDH is the deeper firm truth.

## Working rules

- do not stop at the first green implementation package
- do not report before `launch -> live run A -> proof-discovered hardening -> live run B -> promotion`
  has either landed or honestly hit a real blocker
- do not report early because the branch is tidy
- do not widen into unrelated platform work
- do carry the next obvious sister cut when it serves the same root mission
- do commit and push durable reviewable value without waiting for a new prompt when the mission still clearly continues
- do reread this file after compacts, context loss, or long runtime gaps before resuming execution
- do not inspect AppData, workspaceStorage, chat-session-resources, or other Copilot/editor internals
  unless David explicitly asks for Copilot forensics

## Likely next cuts

- launch `missionCell: repeatable-live-mission-cell-proof-v1` on the same bounded internal target
- carry live run A and capture the first remaining continuity friction
- land the proof-born hardening cut
- rerun the same path as live run B
- promote only if the second pass really needs less restating or carries cleaner mission truth

These are candidates, not a forced order.
Choose the next one by leverage, reviewability, and David-minute savings.

## Stop only when

- `strong success`: live run A, proof-discovered hardening, live run B, and promotion all landed,
  and the second live run proves the hardening really reduced the same friction
- `truthful partial`: multiple real phases landed, but the rerun or promotion blocker is real,
  narrow, and no longer in the same mission-sized scope
- `hard stop`: a true Type-1 decision, external dependency, or scope boundary is reached

## Required reads

1. `CURRENT.md`
2. `MEMORY.md`
3. `company-hq/CORE.md`
4. `SOUL.md`
5. `TRINITY.md`
6. `COPILOT.md`
7. `EXECUTOR.md`
8. `AGENTS.md`
9. `company-hq/mission-contracts/mission-autonomy-lane-v1.md`
10. `company-hq/mission-contracts/repeatable-live-mission-cell-proof-v1.md`
11. `company-hq/mission-cells/repeatable-live-mission-cell-proof-v1.json`

## Canonical deeper docs

- `company-hq/mission-contracts/repeatable-live-mission-cell-proof-v1.md`
- `company-hq/mission-cells/repeatable-live-mission-cell-proof-v1.json`
- `company-hq/mission-contracts/first-live-mission-cell-proof-v1.md`
- `company-hq/mission-cells/first-live-mission-cell-proof-v1.json`
- `company-hq/mission-contracts/mission-autonomy-lane-v1.md`
- `company-hq/mission-contracts/mission-cell-starter-path-v1.md`
- `company-hq/mission-contracts/self-learning-loop-1-initiation.md`
- `doc/plans/2026-03-27-dgdh-substrate-boundary-cut-v1.md`
- `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md`

## One sentence

Run the hardened path twice before you call it real.
