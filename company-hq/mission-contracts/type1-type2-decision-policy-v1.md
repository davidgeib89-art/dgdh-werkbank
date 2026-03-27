# Type1 Type2 Decision Policy V1

Status: active bounded policy
Authority: David
Lane: mission autonomy mode

## Purpose

Keep David only at real one-way doors while the firm carries reversible bounded improvement work itself.

## Rule

- Type-1 means: hard to reverse, high blast radius, meaningful external or irreversible consequence.
- Type-2 means: reversible, local, reviewable, and cheap to correct.

## Type-2 Autonomy

The mission cell may decide and carry on its own:

- bounded branch edits inside the stated blast radius
- prompt, template, routing, CLI, shared, or server cuts that stay reversible
- replay, eval, and harness improvements before promotion
- targeted tests and runtime probes needed to prove the same bounded path

## Type-1 Escalation

Escalate instead of deciding locally when the next action touches:

- `main` outside reviewed merge flow
- deploys or live external effects
- global secrets or permission changes
- irreversible data or cost consequences
- global policy changes beyond the current mission cell

## Decision Test

If the action can be rolled back cheaply and kept inside the mission cell's stated room, it is presumptively Type-2.

If rollback is unclear, blast radius is broad, or the action changes default firm behavior without sufficient evidence, treat it as Type-1 until proven otherwise.

## Escalation Path

1. Stop at the boundary.
2. State the exact action and why it is Type-1.
3. Attach git, test, runtime, or prompt truth as evidence.
4. Escalate to David or the Oberreviewer gate.