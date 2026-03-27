# Eidan Triad Loop Launch V1

Status: ready next-phase execution brief
Authority: David
Execution lane: `Eidan` / Copilot
Mission family: `triad-mission-loop-v1`

## Read First

Read these before substantial work and after every compact or context loss:

1. `company-hq/ACTIVE-MISSION.md`
2. `company-hq/mission-contracts/triad-mission-loop-v1.md`
3. `company-hq/mission-cells/triad-mission-loop-v1.json`
4. `CURRENT.md`
5. `MEMORY.md`
6. `COPILOT.md`
7. `EXECUTOR.md`
8. `AGENTS.md`

## Mission

Carry the first real triad mission loop.

Do not treat this as "another worker sprint."
Treat it as the first bounded proving container where the firm tries to move one mission through:

1. David seed
2. CEO cut
3. worker execution
4. reviewer verdict
5. promotion or true Type-1 escalation

with less David supervision than the current single-lane path.

## Eidan's Role

Your job is not to impersonate the whole company.
Your job is to carry the execution lane inside a triad.

That means:

- take the worker packet seriously as your bounded truth
- build until the mission reaches a real reviewable state or a real blocker
- leave explicit review surfaces for Taren instead of trying to silently self-grade everything
- prefer real code, tests, packets, and git truth over commentary

## The First Real Target

The first triad loop should prove one bounded internal company-improvement target where:

- David gives only the seed
- the CEO lane produces a worker packet and a reviewer packet
- Eidan carries the worker packet to review
- Taren can genuinely decide:
  - accept
  - request changes
  - patch the narrowest truthful fix
  - or escalate a true Type-1 issue

The target should be small enough to finish reviewably,
but large enough that review truth actually changes what happens.

## What To Build

Push as far as reviewably possible toward these outcomes:

1. one bounded mission intake packet David can hand off in one shot
2. one CEO-cut artifact that yields:
   - an explicit worker brief
   - an explicit reviewer brief
3. one runtime-visible triad state machine, likely something like:
   - `ready_to_build`
   - `in_execution`
   - `ready_for_review`
   - `changes_requested`
   - `ready_to_promote`
   - `type1_escalation`
4. one real worker-to-reviewer handoff that survives repo truth
5. one real reviewer verdict that changes the mission path
6. durable promotion truth about what is now triad-bound versus still single-lane/carrier-bound

## Working Rules

- do not stop at the first green execution cut
- do not stop at the first commit or push
- do not pretend a doc-only CEO cut is enough
- do not bypass reviewer truth just because your branch is tidy
- do not widen into platform work, provider work, UI work, or orchestration theater
- do not read AppData, workspaceStorage, chat-session-resources, or other editor internals unless David explicitly declares a forensics mission
- do reread the read-first files after compacts or long pauses
- do carry the next obvious sister cut if it is still inside the same triad mission gravity

## Strong Success

`strong success` means all of these are true:

- one mission entered as a bounded David seed
- the CEO lane produced a real worker packet and a real reviewer packet
- Eidan carried the worker packet to a reviewable state
- a reviewer verdict actually changed what happened next
- David was only needed for a true Type-1 boundary or final strategic truth
- durable repo truth now makes the next triad mission easier

## Truthful Partial

`truthful partial` means:

- the triad loop was entered for real
- at least one true worker-to-reviewer handoff happened
- the next blocker is narrow, real, and still honest
- continuing further would require a new platform jump or a true Type-1 decision

## Hard Stop

`hard stop` means:

- the triad cannot continue without a true Type-1 decision
- the reviewer/runtime seam needed for the loop does not yet exist in honest form
- or the next step would open a new orchestration program instead of proving one bounded triad loop

## Commit / Push Rule

- commit and push durable reviewable value as the mission advances
- do not hold the entire mission dirty until the end
- but do not confuse a clean branch with completed mission gravity

## Final Output

Report only at a terminal state:

- `strong success`
- `truthful partial`
- `hard stop`

Then include:

- findings first
- exact git truth
- what the CEO packet became
- what the worker packet became
- what reviewer truth existed or still failed to exist
- what is now triad-bound versus still single-lane/carrier-bound

## One sentence

Carry the first mission that a small AI firm could honestly say it worked on together.
