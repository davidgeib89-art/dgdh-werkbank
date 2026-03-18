# AI Context Start Here

Status: canonical AI entrypoint
Audience: any AI agent starting work in this repository
Purpose: minimize confusion by defining the default load order and active doc set

## Default Rule

If you are a new AI agent in this repo:

1. Start with this file.
2. Load only the Active Core Set first.
3. Do not load archived documents unless the task explicitly requires historical context.

## Active Core Set (Load First)

1. `company-hq/CURRENT-STATE-REVIEW-2026-03-17.md`
2. `company-hq/VISION.md`
3. `company-hq/MODEL-ROADMAP.md`
4. `company-hq/AGENT-CONSTITUTION.md`
5. `company-hq/AGENT-PROFILES.md`
6. `company-hq/AUTONOMY-MODES.md`
7. `company-hq/BUDGET-POLICY.md`
8. `company-hq/ESCALATION-MATRIX.md`
9. `company-hq/IDLE-POLICY.md`
10. `company-hq/TASK-BRIEF-TEMPLATE.md`

## Active Runtime/Governance Maps (Load When Working On Execution Behavior)

1. `company-hq/ROLE-ROUTING-CONTRACT.md`
2. `company-hq/MINIMAL-CORE-PROMPT-CONTRACT.md`
3. `company-hq/ROLE-ASSIGNMENT-RUNTIME-MAP-2026-03-18.md`
4. `company-hq/HARNESS-LEARNINGS-FOR-DGDH-2026-03-18.md`

## Active Benchmark Context (Load For Gemini Productivity Work)

1. `company-hq/GEMINI-BENCHMARK-PACKET-01-2026-03-17.md`
2. `company-hq/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md`
3. `company-hq/MORPH-INTEGRATION-PLAN-2026-03-18.md` (load when tool-layer optimization is in scope)

## Probe-01 Packet Docs (Load Only For Probe Work)

1. `company-hq/CONTROLLED-LIVE-PROBE-01-BOARD-PACKET.md`
2. `company-hq/CONTROLLED-LIVE-PROBE-01-DECISION-BRIEF.md`
3. `company-hq/CONTROLLED-LIVE-PROBE-01-OPS-CHECKLIST.md`
4. `company-hq/CONTROLLED-LIVE-GATE-01-SHADOW-REVIEW.md`

## Legacy/Archived Docs

Legacy files have been moved to:

- `company-hq/archive/2026-03-18-legacy/`

These are historical references, not default operating context.

## Practical Anti-Confusion Rule

When two docs conflict:

1. prefer Active Core Set
2. then prefer Active Runtime/Governance Maps
3. then prefer Active Benchmark Context
4. treat archived docs as historical evidence only

## Maintenance Rule

If a change updates operating behavior, this file should be reviewed in the same change set.
