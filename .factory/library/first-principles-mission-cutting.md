# First-Principles Mission Cutting

Use this only for:
- mission proposals
- major replans
- post-mortems
- next-mountain selection
- hard review of whether work is Core or Slop

Do not use this as a default mode for small implementation tasks.

## The sequence

1. Identify the inherited assumptions in the current framing.
2. Strip those assumptions away.
3. Ask what is fundamentally, provably true from:
   - repo truth
   - runtime truth
   - operator truth
4. Ask what still secretly depends on David.
5. Rebuild the problem from only what remains.
6. Classify:
   - Core
   - Smaller
   - Later
   - Slop
7. Choose the next mountain by:
   - real David-minute savings
   - increased self-carrying capacity
   - reviewability without blind trust
   - proximity to the North Star

## Runtime truth override

When a mission proposal uses example issue IDs, example child IDs, or example run IDs:

- treat them as illustrative until runtime truth proves the real targets
- once the real targets are discovered, make them canonical for the rest of the mission
- do not let later handoff prose silently override discovered runtime truth
- after each milestone, re-anchor to the canonical runtime targets before continuing

## Role-stack truth

Do not confuse "new mission" with "new worker identity."

- Prefer the existing DGDH role stack when it can already carry the work.
- A mission-specific skill may narrow procedure, but it should not bypass the established trio without a proved reason.
- If a mission starts by generating new generic worker forms instead of using the existing role stack, treat that as harness drift.

Rebuilt from first principles:

- A durable long-running harness only needs three living functions:
  1. cut and re-anchor
  2. carry and verify
  3. judge and close
- In DGDH those are:
  - Nerah
  - Eidan
  - Taren
- Everything else should be:
  - a skill
  - a validation contract
  - a mission feature
  - or a temporary procedure

Do not multiply identities to compensate for weak mission cuts.
Strengthen the cut, the gates, or the skill procedure instead.

## Mission engine truth

Do not confuse droids with mission skills.

- Droids carry the stable DGDH souls and review stance.
- Mission execution is cut through `features[].skillName`.
- Therefore `skillName` must reference a real skill directory, not a droid file.

Default DGDH mission skill stack:
- `nerah`
- `eidan`
- `taren`

Use helper skills only when they truly add bounded procedure.
Do not replace the mission engine by stuffing droid names into `skillName` and hoping Factory infers the rest.

## Mission start gate

If `StartMissionRun` fails, the mission is not running.

Before continuing, verify:
1. `features.json` exists and has real features
2. the mission directory has the expected artifacts
3. `state.json` is created after a successful start

If those conditions are not met:
- do not continue by improvising the mission in chat mode
- do not substitute ad-hoc task delegation for a running mission
- either repair the mission artifacts or stop and restart cleanly

## Continuation truth

These gates are not there to create fear or force tiny work.

Rebuilt from first principles:
- the firm needs durable forward motion
- durable forward motion needs truthful state
- therefore gates exist to preserve state truth while the mission keeps moving

Default bias:
- continue automatically after each coherent step when the next mountain is already clear
- absorb in-scope unfinished work into the next feature instead of turning it into a fake stop
- widen one living mission family before cutting a fresh one too early

Do not confuse "not complete yet" with "must stop now."
The right move is usually:
- re-anchor
- recut
- keep carrying

## Git truth gate

Mission truth must land somewhere harder than chat.

Before a new mission starts, one of these must be explicitly true:

1. the previous mission's changes were committed and pushed
2. the changes were intentionally parked or stashed with explanation
3. the changes were intentionally discarded

Starting a new mission with leftover tracked changes from a prior mission is a failure of operational truth unless explicitly justified.

At mission end, always classify git truth:
- pushed
- local commit only
- local dirty and intentionally parked
- blocked / not promotable

Repo-specific remote truth matters:
- in `dgdh-werkbank`, normal writable branch truth is usually `fork/main`
- `origin` / `upstream` are not automatically the right push targets just because they contain `main`
- if upstream promotion is desired, cut that as an explicit PR/promotion step instead of assuming direct push rights

## Handoff truth gate

If the mission runner halts because a worker returned `discoveredIssues` or `whatWasLeftUndone`:

- treat that as active mission truth, not as annoyance
- if it is still in scope, convert it into a real next feature or reopen the existing feature
- dismiss it as `Later` only when it is truly outside the mission family

Never jump from unresolved in-scope handoff truth to `mission complete`.

## Mission complete gate

A mission is not honestly complete unless all are true:

1. all required features are complete
2. required validation is no longer pending
3. no in-scope handoff item remains unresolved
4. git truth is explicit

If the product movement is real but these gates are not closed, call it a truthful partial and keep going or stop honestly.

## Anti-illusion guard

Do not confuse these with value:
- duration
- activity
- architectural elegance
- lots of features
- lots of milestones
- impressive language

The question is always:

> What is the next reviewable mountain that makes the firm more real with less David supervision?
