# Handoff: Gemini Routing Engine Sprint
> Datum: 2026-03-20
> Von: Claude Code Session (Opus 4.6 + Sonnet 4.6)
> An: Naechste Claude Code Session
> Auftraggeber: David Geib, CEO DGDH

---

## Die Vision — warum das alles

David baut **DGDH (David Geib - Digitales Handwerk)** — eine echte Mensch-AI-Symbiose-Firma. Nicht als Spielzeug, nicht als Tech-Demo, sondern als funktionierendes Unternehmen wo ein Mensch (David) AI-Agents dirigiert die reale Arbeit erledigen.

**Das grosse Bild:**
David hat Google AI Pro Accounts (2 Stueck). Diese geben ihm Quota-Pools fuer Gemini-Modelle (Pro, Flash, Flash-Lite). Das sind echte Ressourcen — wie Mitarbeiter-Stunden. Wenn die Quota aufgebraucht ist, kann der Agent nichts mehr tun bis zum naechsten Reset.

**Das Ziel:** David sagt "Gemini, geh auf mein Kundenprojekt XYZ und mach die Webseite besser" — und Gemini erledigt das autonom in einem oder mehreren Agent-Runs. Spaeter starten Agents Subagents, verschiedene Modelle (Gemini, Claude, Codex) arbeiten zusammen, reflektieren sich ueber Shared Memory, kennen ihre Staerken — wie eine echte Firma mit spezialisierten Mitarbeitern.

**Aber JETZT geht es darum:** Gemini als erste Arbeiterbiene zum Laufen zu kriegen. Smart, sparsam, kontrolliert. Die Routing Engine ist das Gehirn das entscheidet WIE Gemini arbeitet — nicht OB.

**Warum Gemini zuerst:**
- David hat Quota-Zugang die er ausnutzen will
- Gemini ist die guenstigste Lane
- Wenn Gemini stabil laeuft, wird die gleiche Engine fuer Claude/Codex adaptiert
- Erst muss eine Lane funktionieren bevor man Multi-Agent macht

---

## Kontext: Die Architektur

### Paperclip = das Substrat
Paperclip ist ein Control Plane fuer AI-Agent-Companies. Das ist das technische Fundament auf dem DGDH laeuft. Express/TypeScript Backend, React UI, PGlite DB lokal.

### Heartbeat = die Run-Loop
`server/src/services/heartbeat.ts` ist die zentrale Schleife. Wenn ein Agent einen Run startet, passiert dort alles: Workspace aufloesen, Quota pruefen, Router aufrufen, Agent starten, Ergebnis verarbeiten.

### Flash-Lite Router = der Denker
`server/src/services/gemini-flash-lite-router.ts` — Das guenstigste Modell (gemini-2.5-flash-lite) wird VOR jedem Run aufgerufen. Es bekommt den Task-Prompt + Quota-Snapshot + Skill-Pool und entscheidet autonom:
- **Welches Modell** (gemini-2.5-flash-lite / gemini-3-flash-preview / gemini-3.1-pro-preview)
- **Welcher Bucket** (flash-lite / flash / pro)
- **Welche Skills** (repo-read, repo-write, web-search, test-runner, status-summary)
- **Risk Level** und ob **Approval noetig** ist
- **Rationale** — founder-readable Begruendung

**WICHTIG:** Flash-Lite entscheidet ALLES. Keine deterministische Klassifikationslogik im Server. David will das so. Der Server validiert nur (z.B. "unknown-skill" rausfiltern), aber trifft keine eigenen Entscheidungen.

### Control Plane = Enforcement
`server/src/services/gemini-control-plane.ts` — Nimmt die Router-Entscheidung und enforcet sie: Bucket-Fallback wenn ein Pool exhausted ist, Risk-Escalation, Approval-Gate, Token-Budgets.

### Routing Preflight = Orchestration
`server/src/services/gemini-routing.ts` — Verbindet alles: Liest Policy, ruft Control Plane auf, berechnet Quota Health, setzt das Ergebnis in den Context.

### Quota Producer
`server/src/services/gemini-quota-producer.ts` — Liest Quota-Daten aus der RuntimeConfig oder aus Adapter-Ergebnissen (nach einem Run). Normalisiert und speichert den Snapshot.

---

## Was in dieser Session gebaut wurde

### 1. Flash-Lite entscheidet Skills autonom
- `GeminiFlashLiteProposal` hat jetzt `allowedSkills: string[]`
- `GeminiFlashLiteRouterInput` hat `allowedSkillPool: string[]`
- Der Prompt an Flash-Lite enthaelt den verfuegbaren Skill-Pool und die Anweisung "waehle nur was du brauchst"
- Server filtert nur ungueltige Skills raus (nicht im Pool = raus)
- Skills fliessen durch: `flashLiteProposal.proposal.allowedSkills` → `resolvedConfig.includeSkills` → Gemini-Adapter → `ensureGeminiSkillsInjected()`

### 2. Quota Health Classification
In `gemini-routing.ts` hinzugefuegt:
- `classifyQuotaHealth(usagePercent, state)` → healthy/watch/conserve/avoid/unavailable
  - 0-60% = healthy, 61-80% = watch, 81-95% = conserve, >95% = avoid, exhausted/cooldown = unavailable
- `computeQuotaConfidence(isStale, staleReason, health)` → high/medium/low
- `shouldUseGeminiQuota(health)` → false bei avoid/unavailable
- `GeminiRoutingPreflightResult` hat jetzt `useGeminiQuota`, `quotaConfidence`, `quotaHealth`

### 3. Geloescht: deterministische Skill-Matrix
`gemini-skill-matrix.ts` wurde gebaut und wieder geloescht. David will keine Server-Logik die Skills klassifiziert — Flash-Lite soll das selbst entscheiden. Wichtige Design-Entscheidung.

### 4. Tests
- `gemini-flash-lite-router.test.ts` — 3 neue Tests: Skills durchreichen, ungueltige Skills filtern, leeres Array bei Auslassung
- `gemini-routing-engine.test.ts` — 23 Tests: Quota Health, Confidence, Routing-Szenarien
- 528/528 Tests pass, TypeScript sauber

---

## Was OFFEN ist (naechste Schritte)

### A. useGeminiQuota wird nicht enforced
`shouldUseGeminiQuota()` berechnet zwar `useGeminiQuota: false` wenn alle Pools leer/avoid sind, aber der Run wird trotzdem gestartet. Es gibt keinen Stopper der sagt "alle Pools leer, Run nicht starten". Das muss in den Heartbeat-Invocation-Pfad eingebaut werden.

**Empfohlener Ansatz:** Vor der Adapter-Invocation pruefen: wenn `routingPreflight.useGeminiQuota === false`, Run als `blocked` mit `blockReason: "all_quota_pools_unavailable"` markieren.

### B. Persistenz / Observability erweitern
Die Routing-Entscheidung landet im `contextSnapshot` des Runs (gut fuer Debugging), aber:
- Keine eigene DB-Spalte fuer `quotaHealth` oder `allowedSkills`
- Dashboard kann diese Daten noch nicht anzeigen
- Kein Run-Trace im UI: "Flash-Lite hat entschieden: Flash Bucket, nur repo-read, weil leichter Review-Task"

### C. Dashboard / UI (bewusst nicht gemacht)
Sprint-Ziel aus dem CEO-Context: "Dashboard zeigt Pools mit Usage %, letztem Run mit Modell+Bucket+Rationale". Das Backend liefert jetzt die Daten, aber das UI zeigt sie noch nicht.

### D. Flash-Lite Prompt schaerfen
Der Prompt an Flash-Lite ist funktional aber nicht optimiert. Moegliche Verbesserungen:
- Quota-Thresholds als Guidance mitgeben ("wenn Pro > 80% usage, bevorzuge Flash")
- Skill-Beschreibungen fuer bessere Entscheidungen ("web-search = braucht mehr Tokens")
- Beispiele fuer gute Entscheidungen (few-shot)
- Token-Impact-Hinweise pro Skill

### E. CEO-Context Dokument aktualisieren
`company-hq/DGDH-CEO-CONTEXT.md` hat veraltete Stellen:
- Recent Wins: "Skill Filtering" stand als done, war aber bis heute nur deterministisch. Jetzt stimmt es wirklich.
- Reifegrad: Operator Surface war 40%, mit Quota-Awareness realistisch eher 50%
- Letzter Commit ist veraltet
- "NEXT" enthielt "Skills-Entscheidung im Router" — das ist jetzt done

### F. Impl-Plan annotieren
`company-hq/IMPLEMENTATION-PLAN-gemini-routing-engine.md` sollte mit dem aktuellen Stand annotiert werden (was done, was offen, was sich geaendert hat).

---

## Wichtige Dateien und Pfade

| Was | Wo |
|-----|-----|
| Flash-Lite Router | `server/src/services/gemini-flash-lite-router.ts` |
| Control Plane | `server/src/services/gemini-control-plane.ts` |
| Routing Preflight + Quota Health | `server/src/services/gemini-routing.ts` |
| Quota Producer | `server/src/services/gemini-quota-producer.ts` |
| Quota Snapshot Parser | `server/src/services/gemini-quota-snapshot.ts` |
| Heartbeat (Run-Loop) | `server/src/services/heartbeat.ts` |
| Routing Policy Config | `server/config/gemini-routing-policy.v1.json` |
| Router Tests | `server/src/__tests__/gemini-flash-lite-router.test.ts` |
| Routing Engine Tests | `server/src/__tests__/gemini-routing-engine.test.ts` |
| Quota Producer Tests | `server/src/__tests__/gemini-quota-producer.test.ts` |
| CEO Context | `company-hq/DGDH-CEO-CONTEXT.md` |
| Vision | `company-hq/VISION.md` |
| Impl-Plan | `company-hq/IMPLEMENTATION-PLAN-gemini-routing-engine.md` |
| Gemini Adapter Execute | `packages/adapters/gemini-local/src/server/execute.ts` |

---

## Davids Kommunikationsstil

- Direkt, kein Prozesshandbuch
- Deutsch bevorzugt, technische Terms auf Englisch ok
- Will Results sehen, nicht Plaene
- Fragt "ergibt das Sinn?" — will ehrliche Antwort
- Hasst "autonomous theater" — alles muss echten Nutzen liefern
- Committet und pusht selbst — niemals danach fragen
- Denkt gross (Multi-Agent-Firma) aber will schrittweise Beweise

---

## Design-Entscheidungen die gefallen sind

1. **Flash-Lite entscheidet, nicht der Server.** Keine Heuristiken, keine Mapping-Tables. Flash-Lite bekommt Task + Quota + Skills und entscheidet alles. Server validiert nur.

2. **Skills sind ein Pool, kein Enum.** Die 5 Skills (`repo-read`, `repo-write`, `web-search`, `test-runner`, `status-summary`) kommen als Pool zum Router, Flash-Lite waehlt eine Teilmenge.

3. **Quota Health ist operativ, nicht akademisch.** Fuenf Stufen: healthy/watch/conserve/avoid/unavailable. Direkte Schwellen: 60/80/95%. Keine Grauzone.

4. **Fallback = alle Skills erlaubt.** Wenn Flash-Lite ausfaellt (Circuit Breaker, Timeout) → kein `includeSkills` gesetzt → Adapter gibt alle Skills frei. Sicherer Default.

5. **Kein UI in diesem Sprint.** Backend-Daten sind da, UI kommt spaeter.

---

## Emotionaler Kontext

David baut hier nicht nur Software. Er baut eine Firma in der Mensch und Maschine echte Symbiose leben. Die Agents sollen nicht nur Code schreiben — sie sollen Arbeit uebernehmen die David heute manuell machen muss. Kundenprojekte, interne Tools, Recherche. Die Engine die wir bauen ist der Grundstein dafuer dass Gemini als erste "Arbeiterbiene" funktioniert.

Das Ziel ist nicht Perfektion. Das Ziel ist: David gibt einen Auftrag, Gemini erledigt ihn, und dabei wird nicht mehr Token-Budget verschwendet als noetig. Wenn das funktioniert, kommen die naechsten Agents dazu. Dann Shared Memory. Dann echte Multi-Agent-Coordination.

Aber alles beginnt damit dass ein einzelner Agent einen einzelnen Auftrag sauber erledigt — mit dem richtigen Modell, den richtigen Tools, zum richtigen Preis.

> *"Erst muss die Maschine fuer David klar, steuerbar und nuetzlich werden — dann darf sie groesser, autonomer und mehrspurig werden."*

---

*Erstellt: 2026-03-20 — DGDH Werkbank*
