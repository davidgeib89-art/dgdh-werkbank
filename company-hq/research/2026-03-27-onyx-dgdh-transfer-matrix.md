# Research: Onyx -> DGDH Transfer Matrix

Date: 2026-03-27
Context: First-principles DGDH reading of `onyx-dot-app/onyx`, its docs, and current release/changelog direction.
Trigger: Use as a later knowledge-plane and tool-gateway filter. Do not treat this as the next core sprint or as a new company center of gravity.

## 1. Kurzurteil

Onyx matters to DGDH less as a new primary work surface and more as proof that a firm can benefit from a separate shared knowledge and tool plane across multiple clients.

The wrong question is:

> "Should DGDH switch to Onyx now?"

The right question is:

> "Which parts of Onyx show a useful future shape for shared context, search, actions, and agent observability without creating a second AI supervision machine?"

## 2. Which assumptions usually sit behind projects like this

### A. The product is mainly "AI chat for companies"

Onyx can look like a chat UI first, but its stronger architecture claim is broader than chat.

### B. The model is the real moat

The durable value is less the model itself and more the shared retrieval, permissions, actions, and multi-client surfaces around it.

### C. MCP is the whole story

MCP is only one access surface. The bigger idea is a controlled capability boundary for tools and knowledge.

### D. More features automatically mean more leverage

A large feature surface can also create a second place David has to watch, configure, and interpret.

### E. Self-hosted means simple or cheap

The full Onyx stack is operationally real infrastructure, not a tiny local helper.

## 3. What remains fundamentally, provably true after removing the hype

### Truth 1. Shared reusable context is a real problem

When several lanes, chats, or tools need the same docs, rules, or external sources, re-reconstructing that context in each lane is expensive.

### Truth 2. Knowledge plane and execution plane are different concerns

DGDH already has strong execution lanes:
- Codex
- Copilot
- Paperclip company runs

Onyx reinforces that a separate shared knowledge and tool plane may eventually be useful.

### Truth 3. Actions are stronger when they are scoped and governed

The strongest Onyx lesson is not "more tools", but:

> a clear, permissioned, reusable capability surface matters.

That fits DGDH's direction toward verified skills, explicit bridges, and later harnesses.

### Truth 4. Multi-client access is real leverage only if it reduces reconstruction

Web, desktop, browser, API, MCP, and CLI are only valuable when they help several lanes use the same truth without multiplying supervision.

### Truth 5. Lite-first is a serious architectural lesson

The existence of Onyx Lite is one of the strongest product signals:

> even they distinguish between a small useful cut and the whole heavy platform.

That maps directly onto DGDH anti-slop.

## 4. What seems strongest for DGDH specifically

### A. Separate knowledge plane from execution plane

This is the clearest transfer.

DGDH should likely continue to treat:
- Codex / Copilot / Paperclip as execution and reasoning lanes
- a later retrieval/search/tool surface as a different capability layer

### B. Treat actions as capability boundaries, not as tool soup

Onyx reinforces a DGDH principle already emerging:
- explicit capabilities
- clear scope
- governed auth / access
- reusable surfaces across clients

### C. Agent observability matters

Onyx's timeline / history / agent visibility direction supports a DGDH truth:

> if agents work, David must be able to see what happened without reading raw transcript sludge.

### D. Shared search can be a real later leverage point

Only if it truly reduces repeated doc/runbook/research rediscovery across clients.

## 5. What is heavy, risky, or wrong for DGDH right now

### A. Full platform adoption

Full Onyx is a real system stack with web app, backend, workers, databases, and search infrastructure.
That is too much weight for DGDH's current phase.

### B. Feature breadth as strategy

DGDH should not read Onyx's breadth as permission to widen the company surface.

### C. A second AI supervision surface

This is the biggest DGDH-specific danger:

> if Onyx becomes one more place David has to inspect, classify, and babysit, it creates anti-leverage.

### D. Deep research by default

Expensive research loops are only good when the path truly needs them. Otherwise they increase cost and supervision.

## 6. Transfer matrix

| Pattern | DGDH timing | Verdict |
| --- | --- | --- |
| Separate knowledge plane from execution plane | Soon | Strong principle |
| Actions as clear capability boundary | Soon | Strong principle |
| Lite-first instead of full platform first | Now | Strong anti-slop lesson |
| Shared search / retrieval across lanes | Later | Plausible leverage if reconstruction pain stays high |
| Agent observability / timeline | Later | Strong UX / operator lesson |
| Full self-hosted Onyx stack | Not now | Too heavy for current phase |
| Product-breadth imitation | Not now | Wrong scale |
| Onyx as new main work surface | Not now | Risks second supervision machine |

## 7. Concrete DGDH promotions from this research

### Promote now

1. Keep separating execution concerns from later knowledge-plane concerns.
2. Keep reading tool/action surfaces as governed capability boundaries.
3. Keep the anti-slop rule that the smallest useful cut beats platform-first rollout.
4. Keep operator-facing agent observability as a real future UX target.

### Put in the later backlog

1. `onyx-lite-or-mcp-shadow-search-spike-v1`
2. a later shared context/search plane for docs, runbooks, research, and selected operational truth
3. richer operator-visible agent timelines once the current firm loop is stable enough

### Explicitly do not promote now

1. Full Onyx deployment as a new default stack
2. Connector breadth as a company goal
3. A second primary AI portal beside the current execution lanes
4. "Let's build our own Onyx" as a planning frame

## 8. Suggested future spike shape

If DGDH studies this further, the right small cut is:

`onyx-lite-or-mcp-shadow-search-spike-v1`

DoneWhen:
- one narrow searchable knowledge slice
- one real client path tested against reconstruction time
- one clear verdict:
  - saves David minutes
  - maybe later
  - not worth it

## 9. One-sentence DGDH verdict

Onyx matters to DGDH as a strong example of a separate shared knowledge and tool plane with multiple clients, but the right lesson is to extract the small knowledge/search/action primitives that might later reduce reconstruction, not to import a second heavy AI platform into the firm's current core.
