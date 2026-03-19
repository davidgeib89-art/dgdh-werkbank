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

## Dev-Quickstart

```bash
# Full dev (API + UI, watch mode — can orphan agent processes)
pnpm dev

# Single-pass dev — use this for heartbeat/memory verification
pnpm dev:once

# Server only
pnpm dev:server

# Build & typecheck
pnpm build
pnpm typecheck

# Tests
pnpm test:run                   # all tests
pnpm --filter @paperclipai/server exec vitest src/__tests__/heartbeat-governance.test.ts --run  # single test file

# DB
pnpm db:generate               # generate migrations
pnpm db:migrate                # apply migrations
```

**Dev note:** Use `pnpm dev:once` for heartbeat/memory verification — watch mode can orphan running agent processes.

**Embedded DB:** PostgreSQL auto-starts when `DATABASE_URL` is unset (data at `~/.paperclip/instances/default/db`). Worktree instances auto-load `.paperclip/.env`.

**Testing note:** Governance/approval flows — set `process.env.GOVERNANCE_TEST_MODE = "true"` to enable dry-run validation helpers. Avoid real adapter/agent calls in tests unless explicitly required; prefer mocks and contract tests.

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

## MCP-Tools (MorphLLM)

Use these instead of Bash sed/echo for file operations.

**`edit_file`** — Primary file editing:
```json
{ "path": "server/src/services/heartbeat.ts", "code_edit": "  // ... existing code ...\n  newLine();", "instruction": "Add newLine() after existing code" }
```
`// ... existing code ...` = unchanged block placeholder. Preserve exact indentation.

**`codebase_search`** — Codebase exploration:
```
search_string: "Where does routing preflight block adapter execution?"
repo_path: "C:/Users/holyd/DGDH/worktrees/dgdh-werkbank"
```
Best for: "Find the XYZ flow", "How does X work", "Trace the blocked→execution path"

**`github_codebase_search`** — GitHub repo search:
```
search_string: "How does quota snapshot stale detection work?"
github_url: "https://github.com/anthropic/claude-code"
```

| Goal | Tool |
|------|------|
| Explore unfamiliar code | `codebase_search` |
| Edit files | `edit_file` |
| Research external libs | `github_codebase_search` |
| Read specific files | `Read` tool |
