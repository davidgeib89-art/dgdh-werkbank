# DGDH Werkbank — Claude Code Guide

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

## Routing: So funktioniert Stage 1 → Stage 2

```
Account → Bucket (pro | flash | flash-lite) → Model Lane
```

**Stage 1 — Flash-Lite Router** (LLM-assisted Proposal):
- Freitext rein → strukturiertes Work-Packet raus
- advisory only — kein Ausführungsplan

**Stage 2 — Server Enforcement** (Final Authority):
- Validiert, korrigiert oder blockiert Stage-1 Proposal
- Hard Gates: Routing blocked → `blocked` status (NICHT `failed`)
- Policy Stop = `blocked` oder `awaiting_approval`

**Semantik merken:**
| Status | Bedeutung |
|--------|-----------|
| `succeeded` | Adapter ran, exit 0 |
| `failed` | Technisches Problem |
| `blocked` | Policy gate hat gestoppt |
| `awaiting_approval` | Braucht Operator-Sign-off |

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

## Architecture-Docs (lesen wenn nötig)

| Was | Wo |
|-----|-----|
| Gemini Engine V1 Spec | `company-hq/DGDH-GEMINI-ENGINE-V1-2026-03-19.md` |
| Model Roadmap | `company-hq/MODEL-ROADMAP.md` |
| Vision/Mission | `company-hq/VISION.md` |
| Routing Policy Config | `server/config/gemini-routing-policy.v1.json` |

## Wichtige Source-Pfade

| Komponente | Pfad |
|------------|------|
| Heartbeat Run Loop | `server/src/services/heartbeat.ts` |
| Stage-1 Router | `server/src/services/gemini-flash-lite-router.ts` |
| Stage-2 Control Plane | `server/src/services/gemini-control-plane.ts` |
| Agent Health | `server/src/services/agent-health.ts` |
| Routing Policy | `server/src/services/gemini-routing.ts` |

## Dev-Quickstart

```bash
pnpm dev              # API + UI, watch mode
pnpm dev:once         # Single-pass (für heartbeat/memory verification)
pnpm dev:server       # Server only
pnpm build            # Build all packages
pnpm typecheck        # Type-check all packages
pnpm test:run         # Run all tests
```
