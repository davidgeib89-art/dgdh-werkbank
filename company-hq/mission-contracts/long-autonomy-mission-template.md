# Long Autonomy Mission Template

Status: active reusable template
Audience: David, Taren, Eidan, future long-running execution agents
Purpose: Canonical template for 1-3h+ bounded autonomous mission runs

## Why this exists

DGDH gets the most leverage when Eidan/Copilot does not stop at the first green package,
does not need David every 5-10 minutes, and can survive compacts or context loss without
forgetting the real mission.

This template is the reusable shape for that kind of run.

## Canonical stack

Every long autonomous mission should have these layers:

1. `company-hq/ACTIVE-MISSION.md`
2. one deep contract in `company-hq/mission-contracts/*.md`
3. the relevant lane dock (`COPILOT.md`, `EXECUTOR.md`, `AGENTS.md`)
4. one short launcher prompt for the current chat window

The chat prompt should be short.
The real continuity should live in files.

## Read-first shape

For Eidan/Copilot, the canonical read-first order is:

1. `company-hq/ACTIVE-MISSION.md`
2. the active deep mission contract
3. `CURRENT.md`
4. `MEMORY.md`
5. `COPILOT.md`
6. `EXECUTOR.md`
7. `AGENTS.md`

After compacts or context loss:

- reread the same stack
- continue the same mission
- do not silently shrink the mission into a smaller sprint

## Mission skeleton

Every long mission should name:

- mission id
- objective
- current root question
- guard metrics
- allowed zones
- forbidden zones
- Type-1 boundaries
- stop states
- exact read-first files

## Stop states

Long autonomy missions stop only at:

- `strong success`
- `truthful partial`
- `hard stop`

They do not stop merely because:

- the first implementation package turned green
- tests passed once
- the branch became tidy
- there is enough material for a nice status report

## Commit / push rule

Inside a David-authorized long mission:

- commit and push durable reviewable value as it lands
- treat commit/push as midpoint truth markers, not automatic stop signals
- after each commit, ask whether the same mission still has an obvious sister cut worth carrying now

## Scope rule

The mission should be as large as reviewable truth allows, but stay in one root theme.

Good:

- multiple sister cuts that all deepen the same mission
- docs + contracts + seams + tests that make the mission more reusable

Bad:

- unrelated feature drift
- platform replacement while the current carrier still carries
- broad side quests that only look impressive

## Transcript improvement loop

After a substantial long mission:

1. export or inspect the transcript if possible
2. identify where the agent stopped too early, drifted, looped, or lost the mission
3. improve the durable mission stack, not only the next chat prompt

Typical durable targets:

- `company-hq/ACTIVE-MISSION.md`
- the active mission contract
- `COPILOT.md`
- `EXECUTOR.md`
- `AGENTS.md` when the learning is repo-wide

The template itself should be iteratively improved from real runs.

## Launcher template

Use a short launcher shaped roughly like this:

```text
Du bist Eidan.

Lies zuerst und nach jedem Compact erneut:
- company-hq/ACTIVE-MISSION.md
- <active deep mission contract>
- CURRENT.md
- MEMORY.md
- COPILOT.md
- EXECUTOR.md
- AGENTS.md

MISSION
<mission id>

Trage diese Mission autonom weiter.
Stoppe nicht beim ersten gruenen Paket.
Committe und pushe durable reviewbare Wahrheit.
Melde dich erst bei:
- strong success
- truthful partial
- hard stop
```

## One sentence

The prompt starts the mission, but the files let the mission survive.
