# DGDH Autonomous Governance Framework (2026-03-16)

## Strategic Pivot

This sprint formalizes a strategic pivot:

- from open-ended agent exploration
- to regulated autonomy under a company constitution

Target operating company:

- David Geib: Auftraggeber, vision, oversight, release authority
- Claude: strategy and planner
- Codex: builder and executor
- Gemini: reviewer, research, QA
- Paperclip: company OS (routing, governance, memory, budgets, controls)

Build-phase role clarification:

- ChatGPT in chat and Copilot in repo were build-phase partners.
- They are not intended as permanent roles in the final autonomous operating company.
- Build-phase learnings are now translated into enforceable governance policy.

## Sprint Deliverables

Governance artifacts introduced:

- company-hq/AGENT-CONSTITUTION.md
- company-hq/AUTONOMY-MODES.md
- company-hq/TASK-BRIEF-TEMPLATE.md
- company-hq/ESCALATION-MATRIX.md
- company-hq/BUDGET-POLICY.md
- company-hq/IDLE-POLICY.md

Engineering alignment note:

- docs/guides/dgdh-governance-shift.md

## Why This Is Needed

Observed risk pattern:

- scope drift
- high token consumption
- expensive exploration loops
- weak stop conditions

Framework objective:

- minimal token usage
- strict packet boundaries
- policy-first autonomy

## Technical Hook Points for Paperclip Enforcement

### 1. Prevent runs without valid work packet

Primary hook:

- server/src/services/heartbeat.ts in wakeup/invoke path

Proposed enforcement:

- require workPacketId in contextSnapshot for autonomous modes
- reject or defer run creation if packet is missing or invalid

### 2. Hard cap per run and per phase

Primary hooks:

- server/src/services/heartbeat.ts executeRun loop
- adapter invocation budget accounting

Proposed enforcement:

- read per-packet budget from policy
- track phase-level consumption
- force stop with explicit budget errorCode when cap reached

### 3. Checkpoint enforcement

Primary hooks:

- heartbeat run lifecycle events
- run status transitions

Proposed enforcement:

- require checkpoint event between phase A and phase B
- block phase B execution when approval gate not satisfied

### 4. No self-tasking systemic guard

Primary hooks:

- agent wakeup request creation
- scheduler tick enqueue logic

Proposed enforcement:

- enqueue only if linked backlog packet exists and is approved
- deny autonomous wakeups that are not traceable to governed packet

### 5. Reduce expensive full-context exploration

Primary hooks:

- task brief parser
- retrieval and context assembly for runs

Proposed enforcement:

- allowlist-based context retrieval from packet scope only
- default minimal context profile; explicit opt-in for expanded retrieval

### 6. Memory role in governance

Current role:

- persistence and reflection context

Governance role extension:

- memory should store concise reusable operational facts
- memory entries should be scoped and deduplicated to avoid repeated rediscovery

### 7. Memory for token savings (not only knowledge)

Policy direction:

- write compact episode summaries and decision records
- retrieve only mission-relevant memory slices
- avoid replaying long historical logs in prompts

## Rollout Recommendation

Phase 1:

- documentation and constitutional alignment (this sprint)

Phase 2:

- add packet-required pre-run validation gates

Phase 3:

- enforce phase checkpoints and hard caps in runtime

Phase 4:

- add governance dashboards for violations and budget burn

## Acceptance Signal

Framework is successful when:

- agents stop exploring without approved packets
- token usage per merged outcome drops materially
- escalations happen before scope expansion
- idle behavior becomes lightweight and predictable
