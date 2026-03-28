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
