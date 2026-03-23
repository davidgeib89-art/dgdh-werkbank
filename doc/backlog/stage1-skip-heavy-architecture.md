# Backlog: Stage-1-Skip für heavy-architecture

**Status:** backlog (nicht priorisiert)
**Erstellt:** 2026-03-22
**Trigger:** Nach Sprint T (Merge-Orchestrator)
**Prio:** niedrig — kein kritischer Bug, aber verhindert systematisches Fehlrouting

## Kontext

Brainstorming-Session David + Perplexity (Planer) + Claude (Planer), 2026-03-22.

Das "Cheap Classifier → Smart Executor"-Muster hat eine fundamentale Schwachstelle:
der Stage-1-Classifier muss verstehen was er nicht versteht.

Bei `heavy-architecture`-Packets muss er einschätzen wie viele Sub-Schritte drinstecken,
welche Skills gebraucht werden, welches echte Risiko vorliegt. Schwache Modelle sind dabei
systematisch zu optimistisch.

**Kosten-Asymmetrie:**
Ein einziges falsch-geroutetes schweres Packet kostet mehr als 50 korrekte Flash-Lite-Calls.
Lösung ist nicht "Pro für alles" — sondern "Control Plane entscheidet deterministisch für
heavy-architecture, Stage 1 wird übersprungen."

## Scope

### server/config/gemini-routing-policy.v1.json
```json
"heavy-architecture": {
  "preferredBucket": "pro",
  "fallbackBucket": "flash",
  "skipStage1": true,
  "reason": "heavy-architecture packets skip Stage 1 — Control Plane routes deterministisch auf pro"
}
```

### server/src/services/gemini-control-plane.ts
Wenn `skipStage1 = true`:
- Stage-1-Call wird nicht gemacht
- Control Plane routet direkt auf `pro`
- `always review` wird erzwungen
- `targetFolder` muss explizit im Packet stehen (kein Raten)

## Tiered-Regel (vollständig)

```
riskLevel = low            → Flash-Lite klassifiziert (Stage 1)
riskLevel = medium         → Flash klassifiziert (Stage 1)
riskLevel = high / heavy-architecture → Stage 1 wird ÜBERSPRUNGEN
                              Control Plane entscheidet deterministisch
```

## doneWhen

- Ein `heavy-architecture`-Packet triggert keinen Flash-Lite-Call mehr
- Control Plane routet deterministisch auf `pro` + `always review`
- Kein LLM-Overhead für die Routing-Entscheidung bei High-Risk-Packets
- Tests zeigen: Stage-1-Health-Counter bleibt 0 für `heavy-architecture`-Packets

## Nicht jetzt

Sprint T (Merge-Orchestrator) darf nicht aufgebläht werden.
Dieses Update kommt danach als eigener kleiner Sprint oder Policy-Update.
