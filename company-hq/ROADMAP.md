# DGDH Roadmap

> Zuletzt aktualisiert: 2026-03-21
> Leitfrage: *Entlastet das David real oder verschoenert es nur die Maschine?*

Status-Hinweis 2026-03-31:
- dieses Dokument ist fuer den historischen Firmenaufbau weiter nuetzlich
- der kuerzeste aktuelle Firmenkern steht in `company-hq/CORE.md`
- die aktuelle kanonische Richtungsverschaerfung fuer Mission-Autonomie und bounded Selbstverbesserung steht in `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md`, `doc/plans/2026-03-26-dgdh-roadmap-snapshot.md` und `doc/plans/2026-03-30-dgdh-predictive-delivery-doctrine.md`
- dieses Dokument ist nicht mehr die kuerzeste operative Einstiegskante; lies fuer aktuelle Laufwahrheit zuerst `CURRENT.md` und `company-hq/ACTIVE-MISSION.md`

---

## Wo wir stehen

Die alte Gemini-zentrierte Aufbauphase ist nicht mehr die kuerzeste Wahrheit. Die aktuelle Firmenstufe ist:

- direkte Assistenten-Lanes sind sauberer nach Rolle geschnitten (`TRINITY.md`, `CODEX.md`, `COPILOT.md`, `CHATGPT.md`)
- Mission-Autonomie ist als governter Firmenmodus aktiv
- Runtime-Truth ist expliziter geworden: `runtime status`, `issue liveness`, `triad preflight`, `company-run-chain`, `active-run`
- Live-Fokus liegt auf boring repeatability: gleiche Kette auf sauberem Baseline-Zustand erneut tragfaehig machen, nicht auf weiterer romantischer Expansion

**Naechster Schritt:** den Firmenlauf weiter auf predictability, saubere Runtime-Wahrheit und reviewbare Mission-Cells verengen, bevor neue Breite dazukommt.

---

## Phase 1: ENFORCED ROUTING (ERLEDIGT)

**Ziel:** Flash-Lite-Entscheidung steuert tatsaechlich welches Modell laeuft.

| Was | Status | Detail |
|-----|--------|--------|
| `advisory` → `enforced` Mode umschalten | Erledigt | `soft_enforced` Mode aktiv |
| Modell-Wechsel durchsetzen | Erledigt | Router-Empfehlung wird angewendet |
| Bucket-Enforcement | Erledigt | `chosenBucket` bestimmt das effektive Modell |
| Quota-basierte Eskalation | Erledigt | Flash exhausted → automatisch Flash statt Flash-Lite |

---

## Phase 2: HEARTBEATS REPARIEREN (ERLEDIGT)

**Ziel:** Heartbeats sind aktuell broken — sie bekommen keinen Issue-Kontext und Gemini geht ohne Aufgabe rogue.

| Was | Status | Detail |
|-----|--------|--------|
| Heartbeat-Gate | Erledigt | Heartbeat-Gate enforced Issue-Assignment. Kein Run ohne zugewiesenes Issue |

---

## Phase 3: ECHTE AUFGABEN (TEILWEISE ERLEDIGT)

**Ziel:** Gemini erledigt eine echte Aufgabe die David entlastet — nicht nur Test-Issues.

| Was | Status | Detail |
|-----|--------|--------|
| Worker + Reviewer Beweis | Erledigt | Worker + Reviewer in echten Runs bewiesen |
| Erstes echtes Mini-Projekt | Offen | z.B. Webseite verbessern, Content schreiben, Recherche |
| Ergebnis-Qualitaet bewerten | Offen | War das Ergebnis brauchbar ohne Nacharbeit? |
| Token-Effizienz messen | Offen | Wie viel Quota hat die Aufgabe gekostet? |
| Wiederholbarkeit testen | Offen | Gleiche Art Aufgabe → gleiches Qualitaetsniveau? |

**Done-Kriterium:** David gibt einen echten Auftrag, Gemini liefert, David muss nicht nacharbeiten.

---

## Phase 4: OPERATOR SURFACE (TEILWEISE)

**Ziel:** David versteht die Lage ohne Repo-Dive.

| Was | Status | Detail |
|-----|--------|--------|
| Rollen-Management | Erledigt | Dashboard hat Rollen-Dropdown und Agent-Edit |
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
| Graph-based Memory (Blast Radius) | Start von Multi-Agent-Arbeit oder komplexen Infra-Umbauten (`company-hq/research/2026-03-21-knowledge-graph-memory-pattern.md`) |
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
Routing Engine    ██████████████████░░  90%  ← Enforced Routing funktioniert
Operator Surface  ██████████░░░░░░░░░░  50%  ← Dashboard hat Rollen, Quota fehlt
Produktive Work   ██████████░░░░░░░░░░  50%  ← Worker/Reviewer bewiesen, echtes Projekt fehlt
```

---

> *Erst muss die Maschine fuer David klar, steuerbar und nuetzlich werden — dann darf sie groesser, autonomer und mehrspurig werden.*
