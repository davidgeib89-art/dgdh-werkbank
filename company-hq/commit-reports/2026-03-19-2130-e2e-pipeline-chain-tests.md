# Sprint: Pipeline Chain Tests — 2026-03-19/20

## Was gebaut

Pipeline-Chain-Tests (NICHT "E2E" — Stage-1 ist gemockt, kein echter Adapter-Execute):
`server/src/__tests__/gemini-pipeline-e2e.test.ts`

## Was verifiziert wurde

**Case 1: blocked path**
- `missingInputs` → `blocked=true`, `blockReason=missing_inputs` ✓
- `heavy-architecture + large + implement` → `blocked=true`, `blockReason=risk_high_large_implementation` ✓
- Stats Surface: `routing_blocked` → `result: "blocked"` ✓
- Stats Surface: `needsApproval=true` → Approval-Message ✓
- `blocked` gate: heartbeat.ts:3069 confirmed in code — returns early before adapter.execute

**Was blocked path NICHT beweist** (Boundary-Limit):
- Kein expliziter Beweis für "kein adapter.execute" aus diesem Test heraus
- Beweis requiret Heartbeat-Level-Test mit Adapter-Mock
- Im Code bestätigt: heartbeat.ts:3069 return bei `blocked=true`

**Case 2: success path**
- Clean Proposal → `blocked=false` ✓
- Bucket/Model-Lane korrekt resolved in `soft_enforced` ✓
- Stale Snapshot → `advisoryOnly=true` (Mode-Erhaltung) ✓
- Stage-1 lässt `targetFolder`/`doneWhen` weg → Stage-2 füllt Defaults ✓
- Stats: `result: "ok"` ✓

**Was success path NICHT beweist:**
- Kein echter `adapter.execute()` — das requiret Heartbeat + Adapter-Mock
- Routing-Decision-Kette (bis zum Gate), nicht Full-Stack E2E

**Case 3: `needsApproval` — STRUKTURELLE BOUNDARY-LÜCKE**

Kein Policy-Problem. Eine echte Lücke im System:

- `enforceWorkPacket` setzt `needsApproval=true` korrekt
- `heartbeat.ts:3070` Gate prüft NUR `blocked`, NICHT `needsApproval`
- **NIEMAND ruft jemals `setRunStatus(..., "awaiting_approval")`** — kein einziger codepfad
- `heartbeat.ts:3598` LISTET `awaiting_approval`, aber kein Code schreibt es
- Das Flag existiert im Type-System, hat aber NULL Runtime-Enforcement

**Konsequenz:** `needsApproval=true` mit `blocked=false` läuft direkt durch zum Adapter, ohne Operator-Sign-Off, ohne `awaiting_approval`-Status.

**Zu schliessen:** Heartbeat braucht ein zweites Gate ODER `needsApproval` muss in das blocked-Gate integriert werden ODER `setRunStatus(..., "awaiting_approval")` muss als separater Pfad implementiert werden. David's Entscheidung.

## Bug gefunden

`applyModelLane` in Tests = `false` wegen subtiler Default-Logik in `ingestGeminiQuotaSnapshot`: kein `bucketState` → `source="none"` → `isStale=true` → `effectiveMode=advisory` → `applyModelLane=false`. Tests müssen `bucketState` setzen.

## Was NICHT angefasst

- UI, Subagents, neue Interfaces, Benchmark, Policy-Änderungen

## Test-Stand

```
10 passed, 1 todo (needsApproval structural gap), 5 skipped
Full suite: 381 passed | 5 skipped | 1 todo
```

## Architektonische Grenze — sauber dokumentiert

Diese Tests beweisen die Routing-Entscheidungs-Kette (Stage-1 → Stage-2 → Gate-Output). Für echten E2E-Nachweis inklusive Adapter-Execute braucht es einen Heartbeat-Level-Test mit Adapter-Mock — aber der ist gerade nicht nötig, weil die Gate-Logik im Code klar ist.
