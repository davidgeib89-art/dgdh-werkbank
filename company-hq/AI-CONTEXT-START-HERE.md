# AI Context Start Here

Status: canonical AI entrypoint
Audience: any AI agent starting work in this repository
Last updated: 2026-03-21

## Default Rule

If you are a new AI agent in this repo:

1. Start with `INIT.md` and `MEMORY.md`.
2. Then read this file.
3. Load only the Active Core Set first.
4. Do not load archived documents unless the task explicitly requires historical context.

## Active Core Set (Load First)

1. `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` — The North Star (PRIMARY REFERENCE)
2. `company-hq/DGDH-CEO-CONTEXT.md` — CEO's view, current phase, priorities
3. `company-hq/ROADMAP.md` — where we are, where we're going, why
4. `company-hq/VISION.md` — mission, values, organizational structure

## Governance Set (Load When Working On Execution Behavior)

1. `company-hq/AGENT-CONSTITUTION.md`
2. `company-hq/AGENT-PROFILES.md`
3. `company-hq/AUTONOMY-MODES.md`
4. `company-hq/BUDGET-POLICY.md`
5. `company-hq/ESCALATION-MATRIX.md`
6. `company-hq/IDLE-POLICY.md`

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

1. prefer the `MEMORY.md` and `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
2. then prefer Active Core Set (especially CEO-CONTEXT and ROADMAP)
3. then prefer Governance Set
4. treat archived docs as historical evidence only

## Current State Summary (2026-03-21)

- **Engine bewiesen:** Flash-Lite Router, Live Quota, Context Injection und `soft_enforced` Routing funktionieren.
- **Role Templates existieren:** Feste Rollen (`worker.json`, `reviewer.json`, `ceo.json`) bilden den Agent Layer.
- **Worker/Reviewer bewiesen:** Echte Runs mit Worker und Reviewer wurden erfolgreich durchgefuehrt, Issue-Lifecycles werden automatisch gemanagt.
- **Heartbeat-Gate:** Kein Run startet ohne zugewiesenes Issue. Routine-Approval ist fuer normale bounded Tasks deaktiviert.
- **Dashboard Bruecke:** Rollen lassen sich ueber das Agent-Edit-UI verwalten.
- **Naechste Schritte:** Worker-Loop schaerfen, Reviewer-Matrix härten, CEO V1 ausbauen und PowerShell `&&` Fix einbauen.

## Key Technical Facts

- Issue Run: `PATCH /api/issues/{id}` with `assigneeAgentId` triggers immediately
- Do NOT use `POST /api/agents/{id}/wakeup` for issue work (that's a contextless heartbeat)
- Env vars needed: `GEMINI_OAUTH_CLIENT_ID`, `GEMINI_OAUTH_CLIENT_SECRET`
- Dev server: `pnpm dev:watch` or `pnpm dev:once`
