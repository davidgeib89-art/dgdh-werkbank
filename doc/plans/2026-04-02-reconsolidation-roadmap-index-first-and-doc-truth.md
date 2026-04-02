## DGDH Reconsolidation Roadmap

Date: 2026-04-02  
Status: active short-term roadmap  
Audience: David + every AI that needs the next clean sequence  
Intent: smooth the substrate, reduce truth drift, and reopen development beyond the current Triad/Droid carry phase

## 1. Why this file exists

DGDH has gained real capability.
Triad is no longer hypothetical.
The shared runtime is real.
Droid is currently a useful exoskeleton for carrying missions.

But the repo now also carries too much overlap, too many parallel truth surfaces, and too many broad entrypoints.
That makes the current system harder to read, harder to trust, and harder to hand to an AI without hidden drift.

The problem is not that the vision is wrong.
The problem is that the operational surface has become denser than the carrying path needs.

This file exists to define the next bounded cleanup sequence so we can:

- preserve the real North Star
- stop operational and documentation drift
- reduce AI re-entry cost
- reduce David supervision cost
- reopen forward development beyond the current Triad/Droid carry phase

## 2. Fundamental reading

The company vision is still valid.
It should not be thrown away because the operating layer became noisy.

The firm-level constants remain:

- `company-hq/VISION.md` holds the long-horizon mission and soul direction
- `company-hq/CORE.md` holds the shortest truthful firm heart
- `CURRENT.md` should hold live baton truth
- `MEMORY.md` should hold stable cross-session facts

The current failure mode is not "wrong North Star."
It is:

- too many overlapping operator-facing docs
- too many historical or lane-specific files competing with canonical truth
- too much startup/runtime density in a few technical chokepoints
- too much implicit context required for a new AI to act safely

Short form:

> The vision should remain broad and alive.  
> The operating surface should become narrower, clearer, and more boring.

## 3. Current diagnosis

Three different adversarial plugin reads converged on the same broad truth:

1. the repo is not hard to enter because of absence
2. it is hard to enter because of density, overlap, and competing truth layers
3. the server startup path is too concentrated
4. the root-level documentation surface is too crowded

This matches direct repo truth:

- `server/src/index.ts` is a large mixed-concern startup file
- `server/src/app.ts` is a wide integration surface
- `packages/shared/src/index.ts` is a large barrel surface
- the repo root contains many overlapping `.md` files
- DROID/Factory/other AI surfaces now coexist with older re-entry files that were useful earlier but may no longer be the best stack

This does **not** mean the codebase is bad.
It means the codebase is harder to carry than it should be.

## 4. What we are optimizing for now

We are **not** optimizing for:

- more doctrine
- more AI theater
- a giant architecture rewrite
- preserving every historical operator document forever

We **are** optimizing for:

- lower AI re-entry cost
- fewer competing truth surfaces
- cleaner technical carrying paths
- a codebase that a bounded AI can be dropped into with less hidden drift
- preserving the true North Star while shrinking the operational noise

## 5. The next sequence

### Step 1: Decompose `server/src/index.ts`

This is the first real refactor mountain.

Why first:

- it is a concrete technical choke point
- it is easier to review than a repo-wide cleanup
- it reduces startup/runtime complexity without changing company doctrine
- it improves the carrying path for live runtime work immediately

Target outcome:

- split startup concerns into a few named modules
- separate embedded postgres/bootstrap/migrations from runtime server startup
- separate plugin/runtime startup from shutdown/cleanup logic
- preserve behavior; do not widen into platform redesign

Rule:

- this is a decomposition cut, not a redesign cut

### Step 2: Canonicalize the `.md` stack

This is the second mountain.

Why second:

- the repo currently asks too many files to speak at once
- a new AI can easily read the wrong files in the wrong order
- too much of David's intended direction is distributed across overlapping docs

Target outcome:

- one small canonical stack
- everything else either archived, merged, or deleted
- a new AI can enter the repo and know what is live, what is stable, what is vision, and what is legacy

This is not "delete docs because docs are bad."
It is:

> preserve the real truth in fewer files, with clearer authority.

### Step 3: Reconcile drift against North Star

After the stack is smaller, we compare current operating truth against the original DGDH / Werkbank North Star.

Why this matters:

- we do not want to keep only the short-term tactical layer
- we do not want the long-horizon Werkbank vision to dissolve into Triad/Droid local optimization
- we want research and future ambition preserved without forcing every AI to load all of it on every run

Target outcome:

- the future-facing vision remains explicit
- the current operating truth becomes shorter and sharper
- long-horizon research becomes clearly marked as future-facing, not current baton truth

### Step 4: Clean small technical and operator hotspots

After index decomposition and doc consolidation, we can take smaller cleanup cuts such as:

- logging fallbacks that should be structured
- large barrel or integration surfaces that are too concentrated
- leftover debug-like test noise
- tool/vendor-specific re-entry files that no longer justify their own top-level presence

This step is intentionally later.
It is cleanup after the main shape becomes readable again.

### Step 5: Resume forward development beyond the carry phase

Only after the substrate is clearer do we push further beyond the current Triad/Droid carrying phase.

That future work may include:

- stronger Werkbank-native mission execution
- cleaner operator surfaces
- reduced dependence on DROID as the central carrier
- future North-Star-aligned Werkbank improvements

But the point is:

> we should not build the next layer on top of a truth surface we already know is too drift-prone.

## 6. Proposed future `.md` stack

This is the current proposal for the best long-term shape.
It is a proposal, not yet a deletion list.

### Keep as canonical

- `company-hq/VISION.md`
  - long-horizon mission, North Star, soul direction
- `company-hq/CORE.md`
  - shortest firm heart
- `CURRENT.md`
  - live baton only
- `MEMORY.md`
  - stable cross-session facts only
- `company-hq/ACTIVE-MISSION.md`
  - active company mountain
- `doc/DGDH-AI-OPERATOR-RUNBOOK.md`
  - stable operator procedures
- one current roadmap file
  - short-term direction only

### Keep only if still earning their place

- `AGENTS.md`
  - repo execution rules
- lane-specific files such as `CODEX.md`, `CHATGPT.md`, `COPILOT.md`, `EXECUTOR.md`
  - keep only if they hold truly lane-specific behavior that is not cleaner elsewhere

### Strong candidates to merge, archive, or remove

- `INIT.md`
- `REINIT.md`
- older setup/re-entry docs that duplicate `CURRENT.md`, `MEMORY.md`, runbook, or `AI-CONTEXT-START-HERE`
- root-level philosophy documents that are no longer the shortest truthful home for their content

The rule is simple:

> if a file is not the best current authority for a real recurring need, it should not remain a top-level default truth surface.

## 7. Practical deletion rule

We should not mass-delete first and think later.

The right sequence is:

1. inventory root and canonical docs
2. assign each file one of:
   - keep canonical
   - merge into another file
   - archive
   - delete
3. perform the consolidation in a bounded reviewable cut
4. update AI entrypoints so they point only at the surviving stack

## 8. North Star protection rule

The long-horizon Werkbank vision must not be lost during consolidation.

That means:

- preserve the broad DGDH mission and soul direction
- preserve the thesis that DGDH should become a real human-AI firm with increasing useful autonomy
- preserve the Werkbank aspiration beyond current Triad/Droid local forms
- preserve future-oriented research documents only where they still serve that role clearly

But:

- future research should not masquerade as current operating truth
- every AI should not need to absorb the whole philosophical history to do current bounded work

The North Star stays.
The operational stack gets compressed.

## 9. Decision

The current short-term roadmap is:

1. decompose `server/src/index.ts` without behavior change
2. inventory and reconsolidate the `.md` stack
3. preserve and clarify the North Star while shrinking operator truth surfaces
4. clean smaller technical/documentation hotspots after the shape is readable
5. then continue building beyond the current Triad/Droid carry phase on a less drift-prone substrate

## 10. One sentence

DGDH should now preserve the real vision, compress the operating truth, untangle the startup choke points, and only then continue growing the Werkbank beyond the current exoskeleton phase.
