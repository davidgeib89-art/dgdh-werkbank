# DGDH Roadmap

> Zuletzt aktualisiert: 2026-03-21
> Leitfrage: *Entlastet das David real oder verschoenert es nur die Maschine?*

---

## Wo wir stehen

Gemini ist die erste Arbeiterbiene. Die Infrastruktur steht:

- **Live Quota** funktioniert — echte Google-Quota-Daten fliessen ins Routing
- **Flash-Lite Router** entscheidet autonom: Modell, Bucket, Skills, Risk Level
- **Issue Runs** starten sauber und liefern Ergebnisse
- **Routing Engine** (Flash-Lite → Control Plane → Heartbeat) ist durchgaengig verkabelt

**Aber:** Die Routing-Entscheidung wird noch nicht durchgesetzt. Der Router empfiehlt nur (`advisory` Mode), das konfigurierte Modell laeuft trotzdem. Das ist der Kern-Blocker.

---

## Phase 1: ENFORCED ROUTING (Naechster Schritt)

**Ziel:** Flash-Lite-Entscheidung steuert tatsaechlich welches Modell laeuft.

| Was | Status | Detail |
|-----|--------|--------|
| `advisory` → `enforced` Mode umschalten | Offen | `laneStrategy` muss von `advisory_keep_configured` auf enforced wechseln |
| Modell-Wechsel durchsetzen | Offen | Wenn Flash-Lite `pro` sagt, muss der Adapter `gemini-3.1-pro-preview` starten |
| Bucket-Enforcement | Offen | `chosenBucket` muss das effektive Modell bestimmen |
| Quota-basierte Eskalation | Offen | Flash exhausted → automatisch Flash statt Flash-Lite |

**Done-Kriterium:** Flash-Lite sagt "pro" → Agent laeuft tatsaechlich auf Pro-Modell. Sichtbar im Run-Log.

---

## Phase 2: HEARTBEATS REPARIEREN

**Ziel:** Heartbeats sind aktuell broken — sie bekommen keinen Issue-Kontext und Gemini geht ohne Aufgabe rogue.

| Was | Status | Detail |
|-----|--------|--------|
| Heartbeat-Kontext definieren | Offen | Was soll ein Heartbeat im DGDH-Kontext tun? |
| Issue-Kontext in Heartbeats | Offen | Heartbeat sollte offene Issues kennen, nicht blind starten |
| Heartbeat-Intervall sinnvoll setzen | Offen | 3600s ist zu lang fuer Monitoring, zu kurz fuer nichts |
| Rogue-Prevention | Offen | Ohne klaren Auftrag darf Gemini nichts machen |

**Offene Frage:** Brauchen wir Heartbeats ueberhaupt oder reichen Issue-Runs?

---

## Phase 3: ECHTE AUFGABEN

**Ziel:** Gemini erledigt eine echte Aufgabe die David entlastet — nicht nur Test-Issues.

| Was | Status | Detail |
|-----|--------|--------|
| Erstes echtes Mini-Projekt | Offen | z.B. Webseite verbessern, Content schreiben, Recherche |
| Ergebnis-Qualitaet bewerten | Offen | War das Ergebnis brauchbar ohne Nacharbeit? |
| Token-Effizienz messen | Offen | Wie viel Quota hat die Aufgabe gekostet? |
| Wiederholbarkeit testen | Offen | Gleiche Art Aufgabe → gleiches Qualitaetsniveau? |

**Done-Kriterium:** David gibt einen echten Auftrag, Gemini liefert, David muss nicht nacharbeiten.

---

## Phase 4: OPERATOR SURFACE

**Ziel:** David versteht die Lage ohne Repo-Dive.

| Was | Status | Detail |
|-----|--------|--------|
| Quota im Dashboard sichtbar | Offen | Usage % pro Bucket, live |
| Routing-Entscheidung im Dashboard | Offen | Flash-Lite Proposal + Rationale pro Run |
| Run-Trace | Offen | Quota → Entscheidung → Ergebnis → Kosten |
| Approval UX | Offen | Wenn `needsApproval` → David bekommt Signal |

---

## Phase 5: EXPANSION BY PROOF

**Ziel:** Nur erweitern was bewiesen nuetzlich ist.

| Was | Voraussetzung |
|-----|---------------|
| Claude/Codex reaktivieren | Gemini-Lane stabil + echte Luecke die Gemini nicht kann |
| Multi-Agent-Coordination | Mindestens 2 Agents die einzeln stabil laufen |
| Shared Memory | Agents die sich kennen muessen fuer eine Aufgabe |
| Mehr Autonomie | Stabile Governance + messbare Entlastung |

---

## NOT NOW (Anti-Scope-Creep)

- Kein Multi-Agent-Ausbau solange eine Lane nicht stabil laeuft
- Kein Benchmark-Theater — Benchmarks sind Guardrails, nicht Hauptbeschaeftigung
- Keine neue Meta-Architektur
- Keine "romantische Autonomie"-Erweiterungen
- Kein UI-Ausbau vor Backend-Beweis

---

## Reifegrad (ehrlich)

```
Architecture      ████████████████░░░░  80%
Governance        ████████████████░░░░  80%
Routing Engine    ██████████████░░░░░░  70%  ← advisory funktioniert, enforced fehlt
Operator Surface  ████████░░░░░░░░░░░░  40%  ← David sieht zu wenig
Produktive Work   ████░░░░░░░░░░░░░░░░  20%  ← noch keine echte Entlastung
```

---

> *Erst muss die Maschine fuer David klar, steuerbar und nuetzlich werden — dann darf sie groesser, autonomer und mehrspurig werden.*
