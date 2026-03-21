# DGDH – CEO Kontext Dokument

> **Leitfrage:** *Entlastet das David real oder verschoenert es nur die Maschine?*

Zuletzt aktualisiert: 2026-03-21
Version: 2.1 – Worker + Reviewer bewiesen

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
| **Claude Code** (Chief of Staff) | Baut was geplant wird, liefert Code, strenger Architekt | Planen, Richtung vorgeben |
| **Flash-Lite Layer** | Entscheidet autonom: Modell/Bucket/Skills pro Run | David fragen fuer Routine |
| **Gemini Agent** | Fuehrt die echte Arbeit aus (Rollen: Worker, Reviewer, CEO) | Eigene Richtung vorgeben |

---

## 2. Aktuelle Phase

**Phase:** Worker + Reviewer bewiesen, naechster Schritt: Worker-Loop schaerfen + Reviewer-Matrix + CEO V1

**Was funktioniert (bewiesen am 2026-03-21):**
- Enforced Routing (`soft_enforced` aktiv, Modellwahl greift)
- Heartbeat-Gate (Kein Run ohne zugewiesenes Issue)
- Role Templates (`worker.json`, `reviewer.json`, `ceo.json` integriert)
- Worker-Beweis in echten Runs erbracht
- Reviewer-Beweis (Urteilt nach Criteria statt neu zu bauen)
- Issue-Lifecycle Automatik (`todo` → `in_review` → `done`)
- Dashboard-Bruecke (Rollen-Dropdown in Agent-Edit UI)

**Was NICHT funktioniert:**
- Kein aktiver CEO-Agent im System
- Kein automatischer Worker → Reviewer Chain
- PowerShell-`&&`-Problem bei Gemini fuehrt zu Token-Verschwendung

**Naechster Schritt:** Worker-Loop explizit schaerfen, Reviewer-Matrix verfeinern, dann den CEO V1 aufbauen.

---

## 3. Current Bet

> **Flash-Lite Layer entscheidet autonom Model + Bucket + Skills basierend auf Task + aktueller Quota – und diese Entscheidung wird durchgesetzt**

**Was das bedeutet:**
- Flash-Lite ist der "Denker" – guenstig, schnell, entscheidet was gemacht wird
- Live Quota kommt rein → Flash-Lite entscheidet welcher Pool
- Skills werden auch entschieden – NICHT David's Job
- Dashboard zeigt: aktuelle Quotas, letzte Entscheidung, warum
- Die Entscheidung muss enforced werden, nicht nur empfohlen

**Quotas die wir ausnutzen (Google AI Pro Account):**
- **Pro Pool:** gemini-2.5-pro, gemini-3.1-pro-preview
- **Flash Pool:** gemini-2.5-flash, gemini-3-flash-preview
- **Flash-Lite Pool:** gemini-2.5-flash-lite, gemini-3.1-flash-lite-preview

**Gesamter AI Stack (~100 EUR/Monat):**
| Tool | Kosten | Rolle |
|------|--------|-------|
| Claude Code | ~20 EUR | Chief of Staff, Builder, Architekt, CLI |
| Codex (OpenAI) | ~20 EUR | CLI Worker |
| Gemini AI Pro x2 Accounts | ~40 EUR | Primaere Worker-Lane (daily Quota reset) |
| MiniMax Coding Plan | ~20 EUR | Arbeitsbiene fuer Massenarbeit (2.7M Context, guenstig) |

**Zeithorizont:** Wichtiges Gespraech 30.06 → danach 6-8 Wochen nicht verfuegbar. System muss bis dahin stabil laufen.

---

## 4. Now / Next / Later

### NOW
- **Worker-Loop schaerfen**
- **Reviewer-Matrix** verfeinern

### NEXT
- **CEO V1** implementieren
- **Tool-/Guardrail-Loop** nachziehen

### LATER
- **Multi-Agent**-Ausbau
- **Expansion** (andere Provider)

### NOT NOW
- Multi-Agent-Komplexitaet ohne stabile Grundrollen
- Neue Architekturflächen
- Benchmark-Theater
- Romantische "mehr Autonomie"-Erweiterungen

---

## 5. Recent Wins

| Was | Wann | Warum wichtig |
|-----|------|---------------|
| Worker-Beweis erbracht | 2026-03-21 | Echte Aufgabe in Test-Repo erfolgreich beendet |
| Reviewer-Beweis erbracht | 2026-03-21 | Review findet statt Re-Implementation statt |
| Dashboard-Bruecke | 2026-03-21 | Rollen lassen sich im UI zuweisen |
| Role Templates | 2026-03-21 | Feste Rollen statt fluider Prompts |
| Issue-Lifecycle-Automatik | 2026-03-21 | Runs verschieben Issues sauber im Board |
| Live Quota aus Google API | 2026-03-21 | Echte Quota-Daten statt statische Config |

---

## 6. Aktueller Reifegrad

```
Architecture      ████████████████░░░░  80%
Governance        ████████████████░░░░  80%
Routing Engine    ██████████████████░░  90%
Operator Surface  ██████████░░░░░░░░░░  50%
Produktive Work   ██████████░░░░░░░░░░  50%
```

---

## 7. Current Risks

| Risk | Warum relevant | Gegenmassnahme |
|------|----------------|----------------|
| Keine echte Entlastung | System funktioniert technisch, liefert aber noch kein Kundenprojekt | Fokus auf erstes echtes Projekt |
| Operator-Blindheit | David sieht zu wenig im Dashboard | Quota + Routing ins UI bringen |
| PowerShell-Fehler | Gemini verbrennt Tokens in Windows | Shell-Anweisungen und Loop-Detection einbauen |

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
- Role Templates: `server/config/role-templates/*.json`

---

## 9. Fuer AIs: Quick Context

```
DU BIST NEU HIER?
1. David ist CEO + einziger Operator
2. Gemini = primaere Worker-Lane
3. Token-Oekonomie = Kern
4. Leitfrage: "Entlastet das David real?"
5. Phase: Worker-Loop schaerfen + Reviewer-Matrix + CEO V1
6. NICHT: neue Lanes, mehr Architektur, Benchmark-Theater
7. Lies: doc/plans/2026-03-21-dgdh-north-star-roadmap.md
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
