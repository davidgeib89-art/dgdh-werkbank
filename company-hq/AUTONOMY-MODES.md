# DGDH Autonomy Modes

Version: 1.1

> **Aktueller Stand (2026-03-22):** Nur Mode 1 (Supervised Build) und Mode 2 (Bounded Autonomy) sind aktiv. Mode 3 (Mission Operations) ist definiert aber noch nicht aktiviert.

## Mode 1: Supervised Build

Purpose:

- Early build and stabilization with tight human oversight.

Allowed:

- phase A diagnostics
- phase B implementation only after explicit approval
- small scoped fixes and tests

Not allowed:

- autonomous backlog creation
- multi-issue runs
- broad repo exploration without explicit reason

Default budgets:

- diagnose: up to 20k tokens
- implementation: up to 60k tokens
- verification: up to 20k tokens
- hard cap per run: 100k tokens

Approval model:

- mandatory human go/no-go between phase A and B

## Mode 2: Bounded Autonomy

Purpose:

- Daily autonomous execution inside governed backlog.

Allowed:

- autonomous pull from approved queue
- phase A and B within pre-approved policy envelopes
- routine implementation and QA loops

Not allowed:

- work outside approved work packet
- policy bypass to expand scope
- unbounded diagnostics

Default budgets:

- diagnose: up to 30k tokens
- implementation: up to 90k tokens
- verification: up to 30k tokens
- hard cap per run: 150k tokens

Approval model:

- policy-based approval for standard packet types
- human approval for scope expansion or elevated risk

## Mode 3: Mission Operations

Purpose:

- Longer autonomous stretches for well-defined mission queues.

Allowed:

- queued packet execution over extended periods
- autonomous retries inside retry limits
- lightweight periodic reporting

Not allowed:

- self-defined mission changes
- structural architecture pivots without human decision
- unrestricted research loops

Default budgets:

- diagnose: up to 40k tokens
- implementation: up to 120k tokens
- verification: up to 40k tokens
- hard cap per run: 200k tokens

Approval model:

- mission-level pre-approval with strict packet rules
- immediate escalation for non-standard operations

## Mode Switching Rules

- Only David can switch global mode.
- Claude can recommend mode changes with rationale.
- Paperclip must record mode changes with timestamp and actor.

## Mode Safety Invariants

- no self-tasking without approved backlog
- one run one work packet
- escalation before expansion
- hard caps always enforced
