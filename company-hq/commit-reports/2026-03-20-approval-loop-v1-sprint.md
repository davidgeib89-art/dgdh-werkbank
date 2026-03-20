# Sprint Report: Operator Approval Loop V1

**Date:** 2026-03-20
**Goal:** Real `awaiting_approval` path — Mensch führt, System wartet sauber.

## Was gebaut wurde

### A) Echte Semantik

`needsApproval=true` kollapiert nicht mehr auf `blocked`. Zwei getrennte Gates:

| Gate | Trigger | Status | resultJson type |
|------|---------|--------|----------------|
| Gate 1: Hard block | `selected.blocked === true` | `"blocked"` | `"routing_blocked"` |
| Gate 2: Approval | `needsApproval === true && !blocked` | `"awaiting_approval"` | `"routing_awaiting_approval"` |

`blocked` = harter Policy-Stop, Run terminal.
`awaiting_approval` = valider Task, Operator-Signoff nötig, Run geparkt.

### B) Minimaler Approval Loop

1. Heartbeat Gate 2 feuert → `setRunStatus(run.id, "awaiting_approval", { resultJson: { type: "routing_awaiting_approval", ... } })`
2. Auto-Erstellung eines Approval-Records (`type: "routing_gate"`) per `approvalService(db).create(...)` — kein extra Route, kein extra Service nötig
3. Operator: `POST /approvals/:id/approve`
4. Bestehender Route-Handler: `svc.approve(id, ...)` → `heartbeat.wakeup(approval.requestedByAgentId, ...)` → neuer Run in Queue
5. Follow-up Run durchläuft Routing erneut — bei Approval ohne neue Blocker: Execution

**Resume-Mechanismus:** Follow-up Run via `heartbeat.wakeup()`. Sauberer neuer Run mit Original-Kontext im Approval Payload. Der `awaiting_approval`-Run ist terminal (geparkt, nicht fortgesetzt).

### C) Dead Code Cleanup (im Scope)

- Entfernt: INTERIM-Kommentarblock + collapsed `routingBlocked = blocked || needsApproval` Logik
- Entfernt: Totes Code-Block `if (routingBlocked)` bei ~3260 (65 Zeilen dead code weg)
- Entfernt: `routingBlocked ||` im `runtimeServices`-Ternary (immer false gewesen)
- Gate-Variable umbenannt: `routingBlocked` → `routingHardBlocked` + `routingNeedsApproval`

### D) Reporting / Surface

`heartbeat-run-summary.ts` erweitert:
- `routing_awaiting_approval` → `result: "awaiting_approval"`, `summary: "Awaiting operator approval"`, `message: "Task requires operator approval before execution"`
- `routing_blocked` unverändert → `result: "blocked"`

`doc/CLAUDE-ARCHITECTURE.md` aktualisiert: vier Gates dokumentiert statt drei.

### E) Tests

| Test | Was es verifiziert |
|------|--------------------|
| `gemini-pipeline-e2e.test.ts` — Case 3 | Control plane → needsApproval=true, blocked=false; Gate 2 würde feuern; routing_awaiting_approval surface; blocked bleibt blocked |
| `heartbeat-run-summary.test.ts` | `routing_awaiting_approval` → awaiting_approval result |
| `dgdh-engine-defaults.test.ts` | Gate-Wiring (routingNeedsApproval, awaiting_approval, routing_gate approval creation) |

## Validation

- `pnpm typecheck` — clean
- `pnpm test:run` — 97 Dateien, 487 Tests, 0 Fehler

## Invarianten erhalten

- Approval-System war bereits vollständig vorhanden — kein neues Schema, keine neue Migration
- `blocked` Semantik unverändert — fehlerhafte Tasks bleiben blocked
- Wakeup nach Approval nutzt bestehenden `heartbeat.wakeup()` Mechanismus
- Approval Failure wird via `logger.warn` geloggt — Run bleibt in `awaiting_approval`
- Kein UI, kein Benchmark-Kram, kein Multi-Agent

## Restschuld

- **Kein UI** für Approval-Queue — Operator muss REST API direkt nutzen (`GET /companies/:id/approvals?status=pending`, `POST /approvals/:id/approve`)
- **Keine Approval-Aufhebung**: Wenn Operator `reject` statt `approve` klickt, kein Wakeup — Run bleibt dauerhaft geparkt. Acceptable für V1.
- **Re-Routing nach Approval**: Follow-up Run läuft durch dasselbe Routing. Wenn Kontext sich nicht geändert hat (z.B. `missing_inputs` noch vorhanden), wird Gate 2 erneut feuern. Operator muss Kontext lösen oder Gate bypassen. V1-Design: korrekt.
- `finalizeAgentStatus` wird im `awaiting_approval`-Pfad nicht explizit gesetzt (wie auch im `blocked`-Pfad). Agent-Status bleibt auf `running` bis Reaper greift. V2: explizites `idle`/`waiting` für Operator-clarity.

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `server/src/services/heartbeat.ts` | Gate-Split, dead code removal, approvalService import |
| `server/src/services/heartbeat-run-summary.ts` | routing_awaiting_approval surface |
| `doc/CLAUDE-ARCHITECTURE.md` | Vier Gates, Block Reasons aktualisiert |
| `server/src/__tests__/gemini-pipeline-e2e.test.ts` | Case 3 auf echte Semantik umgeschrieben (+1 Test) |
| `server/src/__tests__/heartbeat-run-summary.test.ts` | awaiting_approval test |
| `server/src/__tests__/dgdh-engine-defaults.test.ts` | 3 neue Approval-Loop-Wire-Tests |
