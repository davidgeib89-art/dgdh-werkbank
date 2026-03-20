# Sprint Report: State-Truth — Run-State, Agent-State, Operator-Signale

**Date:** 2026-03-20
**Goal:** Dieselbe Wahrheit in Run-State, Agent-State und Operator-Surfaces.

## Was gebaut wurde

### A) Agent-State Truth — frühe Gates

Beide Routing-Gates haben jetzt `finalizeAgentStatus`-Aufrufe:

| Gate | vorher | nachher |
|------|--------|---------|
| Gate 1 (hard blocked) | Agent blieb `running` bis Reaper | `finalizeAgentStatus(agent.id, "blocked")` → Agent → `"error"` |
| Gate 2 (awaiting_approval) | Agent blieb `running` bis Reaper | `finalizeAgentStatus(agent.id, "awaiting_approval")` → Agent → `"idle"` |

Außerdem: `finalizeAgentStatus` mappt `awaiting_approval` auf `"idle"` (nicht `"error"`):
- `blocked` → `"error"` — Korrekt: Task-Spec hat ein Problem
- `awaiting_approval` → `"idle"` — Korrekt: Agent wartet sauber, ist nicht kaputt

### B) Budget Warning Live-Event

Emitted nach Adapter-Execution, einmalig, wenn `totalTokensUsed >= 0.8 * hardTokenCap`:
- `publishLiveEvent({ type: "heartbeat.run.budget_warning", payload: { runId, agentId, totalTokensUsed, hardTokenCap, softCapThreshold, percentOfCap } })`
- Run-Event wird geloggt (level: `warn`)
- Nur bei 80%+ ohne Hard-Cap-Überschreitung — kein Spam
- `"heartbeat.run.budget_warning"` zu `LIVE_EVENT_TYPES` in `@paperclipai/shared` hinzugefügt

### C) Operator Surfaces

**`evaluateAgentHealth` gepatcht:**
- `lastRunStatus === "awaiting_approval"` → `healthStatus = "warning"` (vorher: `"degraded"`)
- Semantik: Agent wartet auf Freigabe → `warning` (Aufmerksamkeit nötig, nichts kaputt)
- `blocked` → `"degraded"` bleibt korrekt (Task-Spec-Problem)

**`/agents/:id/stats` routingHistory erweitert:**
- `resultType: asNonEmptyString(result?.type) ?? null` — zeigt `"routing_blocked"`, `"routing_awaiting_approval"` etc. direkt in der Run-Liste
- Operator sieht auf einem Blick, warum ein Run gestoppt ist

**`@paperclipai/shared` Typen erweitert:**
- `HEARTBEAT_RUN_STATUSES`: `"blocked"` und `"awaiting_approval"` hinzugefügt
- `LIVE_EVENT_TYPES`: `"heartbeat.run.budget_warning"` hinzugefügt

## Validation

- `pnpm typecheck` — clean, alle Pakete
- `pnpm test:run` — 98 Dateien, 498 Tests, 0 Fehler

## Invarianten erhalten

- Wakeup-Status-Handling in den Gates unverändert (kein `"failed"` für blocked/awaiting_approval)
- Bestehende `finalizeAgentStatus`-Logik für succeeded/cancelled/failed/timed_out unverändert
- Hard-Cap-Exceeded-Pfad (outcome = "failed") unverändert
- Budget-Warning nur bei 80-99% — kein Feuern bei Hard-Cap-Überschreitung (hat eigenen Pfad)

## Restschuld

- **Budget Warning ist post-run**: Signal kommt erst nach Adapter-Completion, nicht live während Execution. Für Live-während-Execution müsste Adapter progressive Usage-Daten streamen — V2-Scope.
- **Reaper-Übergang**: Wenn ein Agent im `running`-Zustand hängt (weil z.B. Server-Neustart), setzt `reapOrphanedRuns` den Run auf `recovering`/`failed`. `finalizeAgentStatus` wird dort korrekt aufgerufen. Kein Problem.
- **`awaiting_approval` in Approval-Reject-Pfad**: Agent geht auf `"idle"`, but wenn Approval rejected wird, kein separater Signal-Pfad. V2.

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `server/src/services/heartbeat.ts` | Gate 1+2: `finalizeAgentStatus`, `awaiting_approval` → `idle`, Budget-Warning Event |
| `server/src/services/agent-health.ts` | `awaiting_approval` → `"warning"` health |
| `server/src/routes/agents.ts` | `resultType` im routingHistory-Entry |
| `packages/shared/src/constants.ts` | `"blocked"`, `"awaiting_approval"` in STATUSES; `budget_warning` in LIVE_EVENT_TYPES |
| `server/src/__tests__/agent-state-truth.test.ts` | 11 Tests (new) |
