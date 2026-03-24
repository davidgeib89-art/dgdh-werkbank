# Research: Airweave -> DGDH Transfer Matrix

Date: 2026-03-24
Context: Current DGDH interpretation of the previously reviewed `airweave` repository.
Trigger: Use now as a retrieval and architecture filter. Do not treat it as the next product sprint or as a copy target.

## 1. The Core First-Principles Question

The wrong question is:

> "Should DGDH build an Airweave-like platform now?"

The right question is:

> "What does Airweave prove about retrieval as a capability, and what does its complexity warn us not to do too early?"

Airweave is a context retrieval layer product. DGDH is a governed human-AI firm. That difference is the main filter.

## 2. What Is Actually Relevant For DGDH

### A. Retrieval is a real capability layer

Airweave is relevant because it treats context retrieval as a distinct problem between data sources and agents.

That principle matters for DGDH:
- not every role should build its own connector chaos
- not every worker should carry the whole world in prompt context
- retrieval will later need to exist as a shared firm capability

### B. Shared retrieval can reduce duplication

The strongest positive lesson is that multiple agents or surfaces should not each reinvent:
- auth
- sync
- indexing
- query surfaces
- source-specific mapping

For DGDH this points toward a later internal context layer for:
- run episodes
- handoffs
- verdicts
- repo and doc slices
- selected external sources when they genuinely save David minutes

### C. Domain / adapter / protocol separation matters early

The most valuable architecture lesson is not the product story but the refactor pressure:
- domains should own business logic
- adapters should own infrastructure
- protocols should stay explicit
- workflows should carry IDs, not heavy serialized blobs
- tests should use fakes instead of real infrastructure where possible

This is highly relevant for DGDH as the workbench core grows.

## 3. What Airweave Warns DGDH About

### A. Retrieval becomes a product very quickly

A retrieval layer is not a tiny feature. It easily grows into its own platform with:
- sync
- auth
- indexing
- orchestration
- search infra
- operations footprint

That means retrieval is real, but also dangerous to romanticize too early.

### B. Breadth can outrun clarity

Large integration count looks impressive, but for DGDH it is mostly a warning:
- too many sources
- too many auth patterns
- too many sync modes
- too much system mass before core firm leverage is proven

### C. Platform identity can overshadow capability identity

The danger is to start thinking:

> "If we build a strong retrieval platform, the agent firm will become good."

That is false.

For DGDH retrieval is a later support capability, not the main myth, not the main product, and not the main trust architecture.

## 4. Transfer Matrix

| Pattern | DGDH timing | Verdict |
| --- | --- | --- |
| Retrieval as its own capability layer | Soon | Promote into target architecture |
| Shared retrieval instead of per-agent connector chaos | Soon | Strong later principle |
| Domain / adapter / protocol separation | Now | Strong architecture lesson |
| Thin workflow wrappers + ID-first orchestration | Now | Strong architecture lesson |
| External-source breadth and integration-heavy platforming | Not now | Wrong scale for current phase |
| Heavy retrieval ops stack as next sprint | Not now | Drift risk |
| Retrieval as the main product story | Not now | Wrong center of gravity |
| Multi-source sync/index/search SaaS identity | Not this phase | Product-form mismatch |

## 5. Concrete DGDH Promotions From This Research

### Promote now

1. Keep hardening domain / adapter / protocol boundaries in the workbench core.
2. Treat retrieval as a later shared firm capability, not as ad hoc per-role connector sprawl.
3. Keep the retrieval idea subordinate to the firm loop, review truth, and David-minute reduction.

### Put in the later backlog

1. A small internal DGDH context or retrieval layer for firm episodes, handoffs, verdicts, and selected doc slices.
2. A retrieval-backed researcher path when external source quality becomes a real blocker.
3. Operator-facing diagnostics for "what is stale / stuck / real" across runs and sources.

### Explicitly do not promote now

1. Retrieval platform building as a new top-level sprint.
2. 50-plus integration thinking.
3. Heavy sync and search infrastructure as a way to avoid finishing the boring firm loop.

## 6. One-Sentence DGDH Verdict

Airweave matters to DGDH as proof that context retrieval is a real and eventually valuable capability layer, but it also proves how fast that layer becomes broad, heavy, and expensive in thought; DGDH should learn the retrieval idea and the domain-adapter-protocol lesson without copying the platform form.
