# Sprint Report: Golden Path Work-Packet Continuity V1

**Date:** 2026-03-20
**Goal:** Approval follow-up run carries original work-packet context intact — no infinite approval loop.

## Problem

When `POST /approvals/:id/approve` triggered `heartbeat.wakeup()`, the follow-up run received only:
```
{ source, approvalId, approvalStatus, issueId, workPacketId, wakeReason }
```
Missing: `taskType`, `budgetClass`, `executionIntent`, `doneWhen`, `targetFolder`, `riskLevel`.

The follow-up run re-entered Stage-2 enforcement clean, `needsApproval` came back `true` for the same task → **Gate 2 fired again → infinite approval loop**.

## Was gebaut wurde

### A) Approval Payload — fehlende Felder ergänzt

`heartbeat.ts` Gate 2 schreibt jetzt `doneWhen` und `targetFolder` in den Approval-Record:

```
doneWhen: routingPreflight.selected.doneWhen,
targetFolder: routingPreflight.selected.targetFolder,
```

Payload ist jetzt vollständig: `runId`, `agentId`, `blockReason`, `executionIntent`, `riskLevel`, `taskType`, `budgetClass`, `doneWhen`, `targetFolder`, `missingInputs`.

### B) Continuity Fix — Gate 2 Bypass

**`heartbeat.ts`** — Gate 2 prüft jetzt `wakeReason`:

```typescript
const approvalGranted =
  readNonEmptyString(context.wakeReason) === "approval_approved";
const routingNeedsApproval =
  routingPreflight &&
  !routingPreflight.selected.blocked &&
  routingPreflight.selected.needsApproval === true &&
  !approvalGranted;   // ← Bypass bricht den Loop
```

**`approvals.ts`** — Approve-Handler forwarded Work-Packet-Felder für `routing_gate` Approvals:

```typescript
const approvedWorkPacket =
  approval.type === "routing_gate"
    ? {
        approvedTaskType: approval.payload.taskType,
        approvedBudgetClass: approval.payload.budgetClass,
        approvedExecutionIntent: approval.payload.executionIntent,
        approvedDoneWhen: approval.payload.doneWhen,
        approvedTargetFolder: approval.payload.targetFolder,
      }
    : {};
// ...
contextSnapshot: { ..., wakeReason: "approval_approved", ...approvedWorkPacket }
```

Der Follow-up-Run hat jetzt:
1. `wakeReason: "approval_approved"` → Gate 2 bypassed
2. Alle Original-Work-Packet-Felder im Context → Stage-1/Stage-2 haben Kontext

### C) Validation — 4 neue Tests

`dgdh-engine-defaults.test.ts` — neue `describe("DGDH Continuity V1")`-Suite:

| Test | Was geprüft |
|------|-------------|
| Gate 2 bypass wired | `approvalGranted`, `"approval_approved"`, `!approvalGranted` in Source |
| Work-packet forwarding | `approvedTaskType`, `budgetClass`, `executionIntent`, `doneWhen`, `targetFolder` in Source |
| Spread into contextSnapshot | `...approvedWorkPacket` in approvals.ts Source |
| Approval payload completeness | `doneWhen`/`targetFolder` in heartbeat approval-create block |

## Validation

- `pnpm typecheck` — clean, alle Pakete
- `pnpm test:run` — 98 Dateien, 502 Tests, 0 Fehler (+4 neue Tests)

## Invarianten erhalten

- Gate 1 (hard blocked) unverändert — kein Bypass, kein `approvalGranted`-Check
- Nicht-`routing_gate` Approvals: `approvedWorkPacket = {}` → kein Spread-Noise
- `wakeReason` bereits von `wakeup()` in contextSnapshot geschrieben (bestehende Logik, Z. 1313-1314) — kein neuer Pfad nötig
- Stage-1/Stage-2 Routing laufen normal auf Follow-up-Run — nur Gate 2 ist bypasst

## Restschuld

- **`approvedWorkPacket`-Felder in Stage-2 lesen**: Stage-2 `enforceWorkPacket` liest derzeit `input.proposed` (Flash-Lite Proposal). Die `approved*`-Felder im Context sind verfügbar aber werden noch nicht explizit als Override-Quelle eingespeist — Stage-2 macht eigenständig eine neue Entscheidung. In der Praxis ist das korrekt (Stage-2 ist die Enforcement-Schicht), aber ein expliziter "bereits genehmigt"-Override wäre sauberer. V2-Scope.
- **`doneWhen`/`targetFolder` fehlen im Stats-Surface** (`routingHistory resultJson`): werden in `resultJson` nicht explizit exponiert. Kein Blocker für die Operator-Sicht, da `executionIntent`/`taskType`/`budgetClass` sichtbar sind.

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `server/src/services/heartbeat.ts` | Gate 2: `approvalGranted` Bypass; Payload: `doneWhen`/`targetFolder` ergänzt |
| `server/src/routes/approvals.ts` | Approve-Handler: `approvedWorkPacket` für `routing_gate`; spread in contextSnapshot |
| `server/src/__tests__/dgdh-engine-defaults.test.ts` | 4 neue Continuity-Tests (+1 Payload-Test) |
