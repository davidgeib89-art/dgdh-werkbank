# ACTIVE MISSION

Status: active
Owner: David
Execution lane: `Eidan` / Copilot
Mode: `mission autonomy mode`
Mission ID: `mission-autonomy-lane-v1`
Current phase: `triad-mission-loop-v1`

## Objective

Carry DGDH from "one mission path can learn repeatably" to
"one bounded mission can travel through CEO cut, worker execution, reviewer verdict,
and only true Type-1 escalation with less David supervision than before."

This active mission exists so long-running execution agents can re-anchor fast after compacts,
context loss, or branch handoffs without collapsing back into short paid micro-sprints
or back into David as the hidden ongoing spine of the work.

## Terminal question

Can DGDH now take one bounded internal mission through:

- David seed
- CEO cut
- worker execution
- reviewer verdict
- promotion or true Type-1 escalation

so that the mission is genuinely shared instead of silently collapsing back into one execution lane plus David restating?

## Latest proof

Yes on the repeatable bounded mission-cell proof.

`DAV-160` / heartbeat run `d012d8ba-a327-4cd1-b73d-b9306a09a754`
showed the remaining continuity friction on the live mission-cell path.
`3b9b473e` hardened the runtime bridge to repo-root-stable contract paths.
`DAV-163` / heartbeat run `fce157ad-8fab-4a86-bb1e-1cc38c9abb36`
then replayed the same path and proved the original friction was reduced on the second pass.

That completes the repeatability proof this phase needed.

The next real missing truth is no longer basic mission continuity.
It is role separation:
the firm needs a real CEO cut, a real worker packet, a real reviewer packet,
and a real reviewer-visible verdict path instead of one execution lane plus commentary.

That triad visibility is now landed on `main` in `db007ea1`:
- issue execution packet truth now carries `triad.ceoCutStatus`
- worker and reviewer packet truth are separated
- company-run-chain exposes explicit triad state and reviewer verdict surfaces
- the issue-detail UI shows the same separation to the operator

The first honest live triad loop is now also real.

`DAV-165` / parent run `70e6ea6e-3055-4863-98c4-813e1dc915ef`
started the first bounded triad mission on the confirmed 3100 runtime.
The CEO cut child `DAV-166`, the worker produced real branch/PR truth,
the reviewer recorded an explicit `accepted` verdict,
and the CEO merge landed PR `#24` on `origin/main` in `22314039`.

The live path did expose the next narrow friction:
after real worker progress, `DAV-166` fell into `post_tool_capacity_exhausted`
and still needed manual lane rescue to complete canonical `worker-pr`, `worker-done`,
and `reviewer-verdict` truth instead of boringly carrying the closing path itself.

Reviewer wake retry is now a system capability.

The silent reviewer wake stall is removed: `in_review` issues where reviewers are busy
no longer stall permanently — the heartbeat now retries reviewer wakes automatically
after `REVIEWER_WAKE_RETRY_THRESHOLD_MS` (5 minutes) and sets `closeoutBlocker`
for operator visibility.

## Current direction

The next real missing truth is no longer `can one triad loop happen?`.
It is `can the same bounded triad closing path keep carrying after quota interruptions
with less manual lane rescue than DAV-165 / DAV-166 still needed?`.

**Runtime readiness is now boringly visible (2026-03-28):**
- `GET /api/companies/:id/agents/triad-preflight` — one call shows allRolesPresent, allAgentsIdle, triadReady, blockers
- `GET /api/health` — seedStatus shows whether seeding ran and which roles are present
- `paperclipai runtime status` — CLI summary of both
- Operator runbook section 6.1 documents the full diagnostic path

Next mountain: second live triad proof with the hardened path.
The code is ready. The diagnostic tools are ready. The remaining gap is executing a live runtime proof.

The lane has now proved that one mission can be shared across
direction, work, and judgment without collapsing back into David micro-steering.
The next cut should reduce the remaining manual rescue on the worker->reviewer->promotion seam.

While David availability is low, long Droid missions are explicitly allowed as an external
async-leverage test: they may run large, long, and relatively open during the day, but they
only count at night after hard review against real product value, operating value, hidden
David dependency, and drift/slop.

Keep the ontology clear:

> Paperclip is the current carrier.
> DGDH is the deeper firm truth.

## Working rules

- do not stop at the first green implementation package
- do not report before `David seed -> CEO cut -> worker execution -> reviewer verdict -> promotion or true Type-1 escalation`
  has either landed or honestly hit a real blocker
- do not report early because the branch is tidy
- do not widen into unrelated platform work
- do carry the next obvious sister cut when it serves the same root mission
- do commit and push durable reviewable value without waiting for a new prompt when the mission still clearly continues
- do reread this file after compacts, context loss, or long runtime gaps before resuming execution
- do not inspect AppData, workspaceStorage, chat-session-resources, or other Copilot/editor internals
  unless David explicitly asks for Copilot forensics

## Likely next cuts

- cut the narrowest fix that removes manual rescue after `post_tool_capacity_exhausted` on the triad closing path
- rerun the same bounded triad shape on a second mission with less Eidan/Copilot intervention
- keep reviewer verdict explicit and promotion reviewer-gated
- promote only if the next triad mission would need less David and less manual execution-lane rescue than before

These are candidates, not a forced order.
Choose the next one by leverage, reviewability, and David-minute savings.

## Stop only when

- `strong success`: one first real bounded mission traveled through David seed, CEO cut, worker execution,
  reviewer verdict, and promotion or true Type-1 escalation, and the triad loop clearly reduced the need for David as ongoing mission spine
- `truthful partial`: multiple real triad phases landed, but the first honest live loop still hit a narrow blocker
  that is no longer in the same mission-sized scope
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
10. `company-hq/mission-contracts/triad-mission-loop-v1.md`
11. `company-hq/mission-cells/triad-mission-loop-v1.json`
12. `company-hq/mission-contracts/eidan-triad-loop-launch-v1.md`

## Canonical deeper docs

- `company-hq/mission-contracts/triad-mission-loop-v1.md`
- `company-hq/mission-cells/triad-mission-loop-v1.json`
- `company-hq/mission-contracts/eidan-triad-loop-launch-v1.md`
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

The next proof is shared work, not just shared intention.
