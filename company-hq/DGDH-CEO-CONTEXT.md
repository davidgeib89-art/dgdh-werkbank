# DGDH – CEO Kontext Dokument

> **Leitfrage:** *Entlastet das David real oder verschoenert es nur die Maschine?*

Zuletzt aktualisiert: 2026-03-21
Version: 2.0 – Live Quota bewiesen, Enforced Routing als naechster Schritt

---

## 1. Mission in 5 Saetzen

- Wir bauen eine mensch-AI-Symbiose-Firma, gefuehrt von David als einzigem Operator
- Paperclip ist das Substrat, nicht die Identitaet
- Token-Oekonomie ist Kern – wir optimieren auf echte Entlastung, nicht auf "autonomous theater"
- Governance first – keine Arbeit ohne klare Zustaende, Budgets und Freigaberegeln
- Gemini zuerst – bis diese Lane stabil und nuetzlich ist, bleiben andere Lanes dormant

---

### Rollenverteilung

| Wer | Was | Was NICHT |
|-----|-----|----------|
| **David (CEO)** | Richtung, Entscheidungen, Freigaben | Pro-Agent-Skills einstellen, Modell pro Run waehlen |
| **ChatGPT** (Architekt) | Plant, reflektiert, strukturiert | Code schreiben |
| **Claude Code** (Builder) | Baut was geplant wird, liefert Code | Planen, Richtung vorgeben |
| **Flash-Lite Layer** | Entscheidet autonom: Modell/Bucket/Skills pro Run | David fragen fuer Routine |
| **Gemini Agent** | Fuehrt die echte Arbeit aus | Eigene Richtung vorgeben |

---

## 2. Aktuelle Phase

**Phase:** Enforced Routing — Router-Entscheidung soll das Modell tatsaechlich steuern

**Was funktioniert (bewiesen am 2026-03-21):**
- Live Quota aus Google API: flash=10%, pro=11%, flash-lite=9% (identisch mit `gemini /stats session`)
- Flash-Lite Router liefert korrekte Proposals: `research-light`, `small`, `flash` fuer README-Task
- Issue Runs starten sauber via Dashboard (assign → wakeup → run → succeeded)
- Quota-Injection ins Routing-System vor jedem Run

**Was NICHT funktioniert:**
- Router ist `advisory only` — empfiehlt Modell, aber das konfigurierte laeuft trotzdem
- Heartbeats sind broken (kein Kontext → Gemini geht rogue)
- Noch keine echte Aufgabe erledigt die David entlastet

**Naechster Schritt:** `advisory` → `enforced` Mode, damit Flash-Lite's Modellwahl durchgesetzt wird

---

## 3. Current Bet

> **Flash-Lite Layer entscheidet autonom Model + Bucket + Skills basierend auf Task + aktueller Quota – und diese Entscheidung wird durchgesetzt**

**Was das bedeutet:**
- Flash-Lite ist der "Denker" – guenstig, schnell, entscheidet was gemacht wird
- Live Quota kommt rein → Flash-Lite entscheidet welcher Pool
- Skills werden auch entschieden – NICHT David's Job
- Dashboard zeigt: aktuelle Quotas, letzte Entscheidung, warum
- **NEU:** Die Entscheidung muss enforced werden, nicht nur empfohlen

**Quotas die wir ausnutzen (Google AI Pro Account):**
- **Pro Pool:** gemini-2.5-pro, gemini-3.1-pro-preview
- **Flash Pool:** gemini-2.5-flash, gemini-3-flash-preview
- **Flash-Lite Pool:** gemini-2.5-flash-lite, gemini-3.1-flash-lite-preview

---

## 4. Now / Next / Later

### NOW
- **Enforced Routing** — Flash-Lite-Entscheidung steuert welches Modell laeuft
- **Modell-Wechsel** — Agent muss zwischen Flash/Pro/Flash-Lite wechseln koennen
- **Heartbeat-Konzept ueberdenken** — was sollen Heartbeats im DGDH-Kontext tun?

### NEXT
- **Erstes echtes Projekt** — Gemini erledigt eine reale Aufgabe
- **Quota im Dashboard** — Usage % pro Bucket, live
- **Run-Trace im Dashboard** — Quota → Entscheidung → Ergebnis

### LATER
- Claude/Codex reaktivieren unter strengen Bedingungen
- Multi-Agent-Coordination
- Mehr Autonomie nur bei stabiler Governance

### NOT NOW
- Multi-Agent-Komplexitaet
- Neue Architekturflächen
- Benchmark-Theater
- Romantische "mehr Autonomie"-Erweiterungen

---

## 5. Recent Wins

| Was | Wann | Warum wichtig |
|-----|------|---------------|
| Live Quota aus Google API | 2026-03-21 | Echte Quota-Daten statt statische Config |
| Flash-Lite Router liefert korrekte Proposals | 2026-03-21 | `research-light/small/flash` — richtige Entscheidung |
| Issue Runs starten sauber | 2026-03-21 | assign → wakeup → run → succeeded, kein manuelles Wakeup |
| Quota-Injection in Routing Pipeline | 2026-03-21 | Live-Daten fliessen automatisch vor jedem Run ein |
| OAuth Creds aus Code entfernt | 2026-03-21 | GitHub Push-Blocker geloest, Env Vars statt Hardcoded |
| Skill Filtering + Routing Engine | 2026-03-20 | Flash-Lite entscheidet Skills autonom |
| Session Compaction + Agent Health | 2026-03-19 | Saubere Status-Semantik |

---

## 6. Aktueller Reifegrad

```
Architecture      ████████████████░░░░  80%
Governance        ████████████████░░░░  80%
Routing Engine    ██████████████░░░░░░  70%  ← advisory ok, enforced fehlt
Operator Surface  ████████░░░░░░░░░░░░  40%  ← ENGPASS
Produktive Work   ████░░░░░░░░░░░░░░░░  20%  ← noch keine echte Entlastung
```

---

## 7. Current Risks

| Risk | Warum relevant | Gegenmassnahme |
|------|----------------|----------------|
| Advisory-only Routing | Flash-Lite entscheidet, aber nichts passiert | Enforced Mode implementieren |
| Heartbeats broken | Kein Kontext → Gemini geht rogue | Heartbeat-Konzept grundlegend ueberdenken |
| Keine echte Entlastung | System funktioniert technisch, liefert aber nichts Nuetzliches | Erstes echtes Projekt testen |
| Operator-Blindheit | David sieht zu wenig im Dashboard | Quota + Routing ins UI bringen |

---

## 8. Technischer Quick-Reference

**Env Vars (muessen gesetzt sein):**
- `GEMINI_OAUTH_CLIENT_ID` — Google OAuth Client ID
- `GEMINI_OAUTH_CLIENT_SECRET` — Google OAuth Client Secret

**Issue Run starten:**
- `PATCH /api/issues/{id}` mit `{"assigneeAgentId": "..."}` → triggert sofort
- NICHT `POST /api/agents/{id}/wakeup` — das ist Heartbeat ohne Kontext

**Key Files:**
- Live Quota API: `server/src/services/gemini-quota-api.ts`
- Flash-Lite Router: `server/src/services/gemini-flash-lite-router.ts`
- Control Plane: `server/src/services/gemini-control-plane.ts`
- Heartbeat: `server/src/services/heartbeat.ts`
- Routing Policy: `server/config/gemini-routing-policy.v1.json`

---

## 9. Fuer AIs: Quick Context

```
DU BIST NEU HIER?
1. David ist CEO + einziger Operator
2. Gemini = primaere Worker-Lane
3. Token-Oekonomie = Kern
4. Leitfrage: "Entlastet das David real?"
5. Phase: Enforced Routing (advisory → enforced)
6. NICHT: neue Lanes, mehr Architektur, Benchmark-Theater
7. Lies: ROADMAP.md fuer den Plan, VISION.md fuer das grosse Bild
```

---

## 10. Harte Priorisierungsregel

### GO, wenn:
- Routing-Entscheidung durchsetzt
- Echte Aufgabe ermoeglicht
- David direkt entlastet
- Quota besser nutzt

### NO-GO, wenn:
- Nur architektonisch elegant
- Nur kuenftige Moeglichkeiten vorbereitet
- Neue Meta-Schichten ohne heutigen Nutzen
- Nur "agentischer" aussieht

---

> *Erst muss die Maschine fuer David klar, steuerbar und nuetzlich werden — dann darf sie groesser, autonomer und mehrspurig werden.*
