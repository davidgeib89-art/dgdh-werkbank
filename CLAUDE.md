# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@import doc/CLAUDE-ARCHITECTURE.md
@import doc/CLAUDE-WORKFLOW.md

## Was ist dieses Repo?

DGDH ist eine **human-led, AI-assistierte Werkbank**.
Paperclip ist das Steuerungssystem. Gemini ist der aktive Worker.
Ziel: reale Aufgaben günstig und kontrolliert erledigen.

## Kernprinzipien

- **Human-led, AI-assisted** — David ist der Operator. AI assistiert und enforcet.
- **Founder-readable > clever** — Tracing und Transparenz über Cleverness.
- **Nutzen > Meta** — Jeder Sprint advancing ein praktisches Ziel.
- **Token-sicher** — Erst messen, dann optimieren. Keine Multi-Agent-Drift.

## Monorepo-Struktur

pnpm workspace with composite TypeScript project references.

| Package | Name | Rolle |
|---------|------|-------|
| `server/` | `@paperclipai/server` | Express API (Node/TypeScript, runs via `tsx`) |
| `ui/` | `@paperclipai/ui` | React frontend |
| `cli/` | `@paperclipai/cli` | Paperclip CLI |
| `packages/db` | `@paperclipai/db` | Kysely DB schema + migrations |
| `packages/shared` | `@paperclipai/shared` | Shared types and utilities |
| `packages/adapter-utils` | `@paperclipai/adapter-utils` | Shared adapter utilities |
| `packages/plugins/sdk` | `@paperclipai/plugin-sdk` | Plugin SDK |
| `packages/adapters/*` | 7 adapters | claude-local, codex-local, cursor-local, gemini-local, openclaw-gateway, opencode-local, pi-local |

Build order: shared packages → plugin-sdk → server → cli → ui.

## Status-Semantik (Kurzreferenz)

| Status | Bedeutung |
|--------|-----------|
| `succeeded` | Adapter ran, exit 0 |
| `failed` | Technisches Problem |
| `blocked` | Policy gate hat gestoppt |
| `awaiting_approval` | Braucht Operator-Sign-off |

**Regel**: Policy stops sind `blocked` oder `awaiting_approval`, niemals `failed`.

## No-Go-Zonen

- **Kein Multi-Agent-Ausbau** — Eine Operator-Loop, keine Agenten-Schwärme
- **Kein Benchmark-Drift** — Benchmark = Guardrail, nicht Hauptbeschäftigung
- **Keine autonomen CEO-Entscheidungen** — David ist der CEO
- **Keine Flash/Pro-Tests ohne klare architektonische Need**
- **Keine neue Agenten-Schicht ohne Token-Messung**

## Sprint-Regeln

- Ein Sprint = ein klarer, messbarer Fortschritt
- Sprint-Reports: `company-hq/commit-reports/YYYY-MM-DD-name-sprint.md`
- Report enthält: was gebaut, validiert, Invarianten erhalten, was NICHT angefasst und warum

## Wichtige Source-Pfade

| Komponente | Pfad |
|------------|------|
| Heartbeat Run Loop | `server/src/services/heartbeat.ts` |
| Stage-1 Router | `server/src/services/gemini-flash-lite-router.ts` |
| Stage-2 Control Plane | `server/src/services/gemini-control-plane.ts` |
| Agent Health | `server/src/services/agent-health.ts` |
| Routing Policy | `server/src/services/gemini-routing.ts` |
| Run Summary | `server/src/services/heartbeat-run-summary.ts` |
| Routing Policy Config | `server/config/gemini-routing-policy.v1.json` |
| Tests | `server/src/__tests__/*.test.ts` |

## Architecture-Docs (lesen wenn nötig)

| Was | Wo |
|-----|-----|
| Gemini Engine V1 Spec | `company-hq/DGDH-GEMINI-ENGINE-V1-2026-03-19.md` |
| Model Roadmap | `company-hq/MODEL-ROADMAP.md` |
| Vision/Mission | `company-hq/VISION.md` |
