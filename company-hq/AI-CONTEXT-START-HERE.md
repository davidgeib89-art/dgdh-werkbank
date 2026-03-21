# AI Context Start Here

Status: canonical AI entrypoint
Audience: any AI agent starting work in this repository
Last updated: 2026-03-21

## Default Rule

If you are a new AI agent in this repo:

1. Start with this file.
2. Load only the Active Core Set first.
3. Do not load archived documents unless the task explicitly requires historical context.

## Active Core Set (Load First)

1. `company-hq/DGDH-CEO-CONTEXT.md` — CEO's view, current phase, priorities
2. `company-hq/ROADMAP.md` — where we are, where we're going, why
3. `company-hq/VISION.md` — mission, values, organizational structure
4. `company-hq/MODEL-ROADMAP.md` — model strategy and lane priorities
5. `company-hq/AGENT-CONSTITUTION.md` — agent governance rules
6. `company-hq/AGENT-PROFILES.md` — agent roles and capabilities

## Governance Set (Load When Working On Execution Behavior)

1. `company-hq/AUTONOMY-MODES.md`
2. `company-hq/BUDGET-POLICY.md`
3. `company-hq/ESCALATION-MATRIX.md`
4. `company-hq/IDLE-POLICY.md`
5. `company-hq/TASK-BRIEF-TEMPLATE.md`
6. `company-hq/ROLE-ROUTING-CONTRACT.md`
7. `company-hq/MINIMAL-CORE-PROMPT-CONTRACT.md`

## Technical Reference (Load When Working On Routing/Quota)

1. `company-hq/DGDH-GEMINI-ENGINE-V1-2026-03-19.md` — Gemini engine spec
2. `company-hq/TOKEN-ECONOMY-STRATEGY.md` — token cost strategy

## Legacy/Archived Docs

Legacy files are in:

- `company-hq/archive/2026-03-18-legacy/` — pre-routing-engine docs
- `company-hq/archive/2026-03-21-pre-live-quota/` — pre-live-quota docs (handoffs, benchmarks, probes)

These are historical references, not default operating context.

## Practical Anti-Confusion Rule

When two docs conflict:

1. prefer Active Core Set (especially CEO-CONTEXT and ROADMAP)
2. then prefer Governance Set
3. treat archived docs as historical evidence only

## Current State Summary (2026-03-21)

- **Live Quota** works — real Google API data flows into routing
- **Flash-Lite Router** makes correct autonomous decisions (model/bucket/skills)
- **Issue Runs** start cleanly via assignment in dashboard
- **Routing is advisory only** — next step is enforced mode
- **Heartbeats are broken** — no context, needs rethinking
- **No real productive work yet** — only test issues completed

## Key Technical Facts

- Issue Run: `PATCH /api/issues/{id}` with `assigneeAgentId` triggers immediately
- Do NOT use `POST /api/agents/{id}/wakeup` for issue work (that's a contextless heartbeat)
- Env vars needed: `GEMINI_OAUTH_CLIENT_ID`, `GEMINI_OAUTH_CLIENT_SECRET`
- Dev server: `pnpm dev:watch` or `pnpm dev:once`
