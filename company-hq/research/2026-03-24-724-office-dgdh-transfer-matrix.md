# Research: 724-office -> DGDH Transfer Matrix

Date: 2026-03-24
Context: Current DGDH interpretation of the previously reviewed `724-office` repository.
Trigger: Use now as a direction filter for identity, memory, diagnostics, and anti-drift decisions. Do not treat it as a copy target or a new architecture sprint.

## 1. The Core First-Principles Question

The wrong question is:

> "Should DGDH become more like 724-office?"

The right question is:

> "Which low-level agent primitives solved there are also real DGDH problems, and on which time horizon?"

724-office is primarily a persistent personal agent system. DGDH is building a governed human-AI firm with explicit roles, handoffs, review, merge, and promotion. That difference is the main filter.

## 2. What Is Actually Relevant For DGDH

### A. File-layered identity

The strongest direct pattern is the existence of separate durable files for:
- soul / constitution
- operational procedure
- owner or user context

This confirms DGDH's current direction:
- `SOUL.md`
- `TRINITY.md`
- `CODEX.md` / `CHATGPT.md` / `COPILOT.md`
- `EXECUTOR.md`
- `CURRENT.md` / `MEMORY.md`

The lesson is not to copy filenames. The lesson is that durable identity and procedure should live in visible files, not in transient session memory.

### B. Visible primitives over framework magic

724-office is relevant because it appears to work with a small, legible set of primitives:
- prompt layers
- session continuity
- memory compression
- retrieval
- tools
- scheduling
- diagnostics

This is highly DGDH-compatible. It supports the same anti-theater instinct already present in the Trinity and Executor layers.

### C. Memory as a pipeline, not a dump

The important pattern is not "store more chat." The important pattern is:
- active session
- compression of what overflows
- retrieval of only what matters later

For DGDH this translates to firm memory, not personal assistant memory:
- run episodes
- handoffs
- reviewer verdicts
- failure classes
- durable execution truths

### D. Diagnostics and scheduler as later operating primitives

Scheduler, self-check, and diagnosis are relevant because they point toward a future operator-facing support layer:
- nightly health checks
- morning briefings
- run failure diagnosis
- "what is actually stuck?" surfaces

This is relevant for DGDH, but only after the core firm loop is boringly reliable.

## 3. What Is Not The Right Move For DGDH Now

### A. "Self-evolving agent" as the main story

This is the biggest trap.

DGDH does not need a bigger autonomy myth right now. It needs a more reliable governed firm loop:
- canonical state
- better handoffs
- review truth
- merge truth
- lower David-minutes per real run

### B. Runtime tool creation

Runtime tool creation is interesting, but for DGDH right now it is mostly drift fuel.

Before that becomes safe, DGDH needs:
- replayable learning
- review gates
- PR-based promotion
- clearer separation of role templates, skills, memory, and evolution lane

### C. Assistant-first identity

724-office is useful as a persistent-agent pattern. DGDH is not primarily building a personal buddy system. It is building a governed human-AI firm.

That means:
- roles matter more than one agent's continuity
- review matters more than personal continuity alone
- promotion matters more than live self-modification

## 4. Transfer Matrix

| Pattern | DGDH timing | Verdict |
| --- | --- | --- |
| File-layered identity (`SOUL` / procedure / owner context) | Now | Adopt as pattern |
| Visible primitive stack instead of framework-heavy magic | Now | Adopt as design instinct |
| Tool-use loop with bounded iterations | Now | Useful as a readability primitive |
| Session -> compression -> retrieval memory pipeline | Soon | Translate into firm memory, not chat memory |
| Scheduler / background jobs | Soon | Use only after the core loop is reliable |
| Diagnostics / self-check | Soon | Valuable as operator-facing support layer |
| Plugin or MCP-style extension layer | Later | Probably useful, not current sprint material |
| Embedded vector retrieval implementation details | Later | Pattern matters more than specific storage choice |
| Runtime tool creation | Not now | Too drift-prone |
| "Self-evolving agent" as lead narrative | Not now | Wrong emphasis for current phase |
| Multi-tenant personal assistant platform concerns | Not this phase | Wrong problem level |
| Voice / media / messaging-world expansion | Not this phase | Noise relative to current DGDH bottlenecks |

## 5. Concrete DGDH Promotions From This Research

### Promote now

1. Keep strengthening the file-layered identity dock approach.
2. Prefer visible, debuggable primitives over new framework abstraction.
3. Treat memory as a governed compression pipeline, not a context accumulation game.

### Put in the later backlog

1. Operator-facing diagnostics layer.
2. Scheduler-backed maintenance and summary jobs.
3. Firm-memory retrieval over run episodes, handoffs, and verdicts.

### Explicitly do not promote now

1. Runtime tool creation.
2. Self-evolving as a core narrative.
3. Assistant-first persistent autonomy as the main product shape.

## 6. One-Sentence DGDH Verdict

724-office matters to DGDH not as a whole architecture to copy, but as proof that a small, visible, file-layered agent base with soul, procedure, memory, tools, and scheduling can work in practice; DGDH's job is to carry those primitives upward into a governed, reviewable human-AI firm instead of stopping at a persistent assistant.
