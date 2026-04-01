# Short-Term Roadmap: Closeout Proof and DROID-to-Paperclip Transfer

Status: active planning note
Authority: David-aligned working direction
Date: 2026-04-01

## Purpose

This note holds the current short-term development roadmap so the next few
missions do not drift into broad platform work or get reconstructed from chat.

It is intentionally narrower than a general DROID or Paperclip roadmap.
The question here is not "what could we build next?" but:

> What are the next few large, reviewable mountains that most directly reduce
> David as the hidden final state machine while keeping DROID as a useful
> exoskeleton rather than the firm's permanent center?

## Starting truth

The current repo truth already proves several things:

- one real triad loop has happened
- operator-facing truth surfaces exist
- shared runtime truth is no longer purely theoretical
- DROID / Factory currently carries long missions more productively than raw
  Paperclip alone in some important ways

The narrow missing truth is no longer:

> can triad happen at all?

The narrow missing truth is:

> can the closeout path after real worker progress and
> `post_tool_capacity_exhausted` carry through worker handoff, reviewer verdict,
> and promotion with less David rescue than before?

That is the immediate mountain.

## Why DROID is still the right short-term carrier

From first principles:

- the goal is not to keep DROID as the final company substrate
- the goal is to make DGDH Werkbank / Paperclip eventually carry missions better
  than DROID can
- but today DROID/Factory is still the more productive exoskeleton for long,
  bounded mission execution

Therefore the right short-term move is:

1. use DROID to carry real bounded mountains now
2. extract only the smallest proven winning forms
3. land those forms back into Paperclip / Werkbank

The wrong move would be either:

- refusing to use DROID even where it is clearly more productive
- or letting DROID quietly become the real permanent firm while Paperclip stays
  behind as a weaker substrate

## Roadmap filter

Every short-term step below must pass all of these:

- saves real David minutes
- increases self-carrying mission capacity
- stays reviewable without blind trust
- helps the firm move from exoskeleton dependence toward durable Werkbank truth
- does not widen into general orchestration or architecture theater

## The next 5 mountains

## 1. Second real triad closeout proof

### Goal

Run one new bounded triad mission on fresh `main` and treat it as a hard eval,
not as an open-ended day of motion.

### Why this is Core

This is the most direct test of whether the firm is actually reducing David as
the hidden spine of execution, review, and promotion.

The point is not another nice run.
The point is whether the same triad form now carries further through closeout
than `DAV-165` / `DAV-166` did.

### Success

- no manual rescue on the critical closeout path
- explicit reviewer verdict
- clean promotion truth
- or an honest Type-1 stop / narrow blocker

### Why this comes first

Without this, the rest risks becoming abstract optimization around a seam that
has not yet been re-proven under current conditions.

## 2. Honest closeout gate in DROID / Factory

### Goal

Make mission completion and closeout truth boringly honest.
`completed`, `clean`, or equivalent success language must never outrun actual
git truth, PR truth, or residue truth.

### Why this is Core

A productive system that overstates completion is not actually more reliable.
It only becomes better at producing convincing optimism.

The repo already contains evidence of closeout-truth drift.
That means this is not speculative polish.
It is a real operating seam.

### Success

Every mission ends with explicit closeout classification such as:

- pushed
- local commit only
- intentionally parked residue
- blocked / not promotable

And Factory-level completion no longer masquerades as promotion truth.

### Why this is second

The second live proof should be judged against honest closeout truth.
If the gate is soft, the proof can be misread.

## 3. Read-only boundary for shared `.factory` substrate

### Goal

Prevent investigation, documentation, synthesis, and audit missions from
silently mutating shared `.factory` substrate unless that mutation is the actual
bounded mission.

### Why this is Core-ish but smaller than 1 and 2

This is not the mountain itself.
It is an anti-drift boundary that protects the mountain from getting smeared by
unrelated harness edits.

The repo already has evidence that read-only style missions can still rewrite
shared Factory files and weaken trust in closeout.

### Success

By default, the following become fenced unless explicitly in mission scope:

- `.factory/init.sh`
- `.factory/services.yaml`
- `.factory/library/*`
- shared runtime hooks
- ad-hoc helper skill creation

### Why this is third

It reduces future noise and residue, but it should not displace the actual
closeout proof itself.

## 4. Only seam-near mission-state truth hardening

### Goal

Harden only the mission-state seams that directly affect the closeout proof.

This is intentionally not a broad "repair the whole mission engine" step.

### Why this must stay narrow

This is the easiest place for good instincts to widen into a new platform
program.
That would be drift.

The allowable focus here is only on state truth that touches the closeout seam:

- `completed` must not outrun promotion truth
- `pause` / `resume` must not silently lose closeout truth
- validators must not become silent replacement workers
- setup / completion limbo must not be mistaken for real mission truth

### Success

The closeout-adjacent mission states become more boring and trustworthy without
turning into a general DROID architecture sprint.

### Why this is fourth

It should only be touched after the live proof, honest closeout gate, and
anti-drift boundary are already in view.

## 5. Transfer the winning forms back into Paperclip

### Goal

Move the smallest proven forms from DROID / Factory into the actual
Paperclip/Werkbank carrier.

### Why this is strategically necessary

The point of DROID is leverage, not identity.
If DROID keeps the good forms and Paperclip does not absorb them, then the firm
has not actually progressed toward its intended substrate.

### Candidate winning forms

- better mission start shape
- honest closeout / promotion gate
- compact operator-facing truth surfaces
- tighter reviewer / validator separation

### Success

At least one or two proven forms become boring Paperclip truth instead of
remaining DROID-only craftsmanship.

### Why this is fifth

A form should be transferred after it is proven and boring, not while it is
still half-theory.

## Priority classification

### Core

- second real triad closeout proof
- honest closeout gate

### Smaller but right

- read-only boundary for shared `.factory`

### Only if kept narrow

- seam-near mission-state truth hardening

### Later, after proof

- transfer winning forms into Paperclip

### Slop

The following are out of scope for this short-term roadmap:

- broad DROID beautification
- general orchestration-platform expansion
- extra doctrine production without new operating truth
- provider / failover / leverage branches that do not directly help the
  closeout seam
- turning seam friction into a new architecture program

## Recommended mission order

Use this order unless runtime truth proves a narrower dependency:

1. second real triad closeout proof
2. honest closeout gate
3. read-only boundary for shared `.factory`
4. seam-near mission-state truth hardening only
5. winning-form transfer into Paperclip

## One-sentence operator re-entry

We do not need to prove again that triad can happen once; we need to prove that
the closeout seam after real work becomes boring enough that David is no longer
the hidden final state machine, while DROID remains a temporary carrier and the
best proven forms move back into Paperclip.
