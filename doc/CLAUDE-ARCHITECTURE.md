# Architecture Context — DGDH Werkbank

## DGDH Principles

- **Human-led, AI-assisted**: Operator is the authority; AI assists and enforces.
- **Founder-readable > clever**: System design is transparent and traceable.
- **Nutzen > Meta**: Every sprint advances a practical goal.
- **No multi-agent drift**: Focus stays on the singleoperator loop, not agent swarms.

## Monorepo

```
worktrees/dgdh-werkbank/   ← active worktree (this is what matters)
packages/                  shared: db schema, adapters, types
server/                   Express API (Node/TypeScript)
ui/                       React frontend
cli/                      Paperclip CLI
```

## Gemini Routing: account → bucket → model lane

### Buckets
- `flash` — gemini-3-flash-preview
- `pro` — gemini-3.1-pro-preview
- `flash-lite` — gemini-2.5-flash-lite

### Routing Pipeline (Stage-1 → Stage-2)

**Stage-1 Flash-Lite Router** (`server/src/services/gemini-flash-lite-router.ts`):
- Calls `gemini-2.5-flash-lite` with structured prompt
- Proposes a work-packet from free-text intake
- Produces: taskClass, budgetClass, executionIntent, targetFolder, doneWhen, riskLevel, missingInputs, needsApproval, chosenBucket, chosenModelLane, fallbackBucket, rationale
- **Advisory only**: proposal, not execution plan

**Stage-2 Server Enforcement** (`server/src/services/gemini-control-plane.ts`, `enforceWorkPacket()`):
- Validates and corrects Stage-1 proposal
- Applies safe defaults for missing fields
- Escalates riskLevel for heavy-architecture + large budget
- Enforces `needsApproval=true` and `blocked=true` when: missing inputs, or high risk + large budget + implement intent
- **Final authority**: server-enforced run plan is what actually executes
- Output: `selected.blocked`, `selected.blockReason`, `selected.needsApproval`, `selected.missingInputs`

### Routing Policy
- Static config: `server/config/gemini-routing-policy.v1.json`
- taskType → preferredBucket + fallbackBucket + reason
- Read at startup by `gemini-routing.ts`

## Storage Boundary

- `runtimeConfig` (agent config): **static policy** — approved budgets, routing overrides, static rules
- `agentRuntimeState.stateJson` (operative state): **mutable truth** — quota snapshots, router health, breaker state, accumulated usage

## Heartbeat Run Loop (`server/src/services/heartbeat.ts`)

1. Server claims queued run
2. Resolves workspace + adapter config
3. Runs routing preflight → control-plane decision
4. Execution gates (see below)
5. `adapter.execute()` if not blocked
6. Records result, updates runtime state, emits events

## Execution Gates (in heartbeat.ts)

Three hard gates block `adapter.execute()`:

| Gate | Trigger | Status set |
|------|---------|------------|
| Phase-B checkpoint | Phase-B task, no checkpoint approval | `failed` |
| **Routing blocked** | `routingPreflight.selected.blocked === true` | `blocked` |
| Single-file benchmark preflight | Benchmark mode, workspace check fails | `failed` |

**Routing blocked** sets `status = "blocked"` (not `"failed"`). Wakeup stays alive for operator action.

## Block Reasons (from enforceWorkPacket)

- `missing_inputs` — unresolved inputs in `missingInputs[]`
- `risk_high_large_implementation` — high risk + large budget + implement intent

## Run Outcomes (semantically distinct)

| Outcome | Meaning |
|---------|---------|
| `succeeded` | Adapter ran, exit code 0 |
| `failed` | Technical failure (crash, timeout, budget exceeded, process lost) |
| `cancelled` | Operator cancelled |
| `timed_out` | Execution exceeded time limit |
| **`blocked`** | Policy gate stopped execution (missing inputs, risky task) |
| **`awaiting_approval`** | Valid task, needs operator sign-off before execution |

**Rule**: Policy stops are `blocked` or `awaiting_approval`, never `failed`.

## Canonical Stats/Health Surfaces

- `server/src/services/agent-health.ts`: `evaluateAgentHealth()` — health + budget decision per agent
- `server/src/services/heartbeat-run-summary.ts`: `summarizeHeartbeatRunResultJson()` — run resultJson → stats summary; recognizes `type: "routing_blocked"` and labels it `result: "blocked"`
- `server/src/services/gemini-control-plane.ts`: `deriveGeminiControlPlaneState()` — full CP state from preflight + quota snapshot
