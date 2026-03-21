# INIT - Universal AI Onboarding

> Du bist ein AI-Agent der in diesem Repository arbeitet.
> Lies diese Datei ZUERST. Sie macht dich zum Experten.
> Funktioniert mit jeder AI CLI: Claude, Gemini, ChatGPT, Codex, OpenCode, etc.
> Nutze diese Datei auch nach /compact oder Context-Verlust um dich neu zu orientieren.

---

## Schritt 1: MEMORY lesen

Lies **sofort** `MEMORY.md` im Repo-Root. Das ist der geteilte Zustand aller AIs die hier arbeiten. Dort steht:
- Was gerade funktioniert und was nicht
- Wo wir in der Entwicklung stehen
- Aktive Aufgaben und Blocker
- Technische Quick-Reference

**MEMORY.md ist deine Pflicht.** Wenn du Code, Architektur oder Design-Entscheidungen aenderst: update MEMORY.md BEVOR du die Session beendest. Die naechste AI (oder du selbst nach /compact) ist darauf angewiesen.

---

## Schritt 2: Projekt verstehen

**DGDH (David Geib - Digitales Handwerk)** ist eine Mensch-AI-Symbiose-Firma. David ist der einzige menschliche Operator. AI-Agents erledigen echte Arbeit: Kundenprojekte, Tools, Recherche. Paperclip ist das technische Substrat (Control Plane fuer AI-Agents).

Lies diese Docs in dieser Reihenfolge:

1. `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` - aktueller North Star; IMMER lesen
2. `company-hq/ROADMAP.md` - Wo wir stehen, wo wir hinwollen, warum
3. `company-hq/DGDH-CEO-CONTEXT.md` - Davids Prioritaeten und Entscheidungsregeln
4. `company-hq/VISION.md` - Mission, Werte, Organisationsstruktur

Wenn Dokumente sich widersprechen, gilt fuer die aktuelle operative Richtung zuerst:
- `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`

Nur bei Bedarf (wenn deine Aufgabe es erfordert):
- `company-hq/AI-CONTEXT-START-HERE.md` - vollstaendiger Doc-Index
- `company-hq/DGDH-GEMINI-ENGINE-V1-2026-03-19.md` - Gemini Engine Spec
- `CLAUDE.md` - Claude-spezifische Architektur-Details und Workflow

---

## Schritt 3: Codebase kennenlernen

Monorepo mit pnpm workspaces + TypeScript project references.

| Package | Rolle |
|---------|-------|
| `server/` | Express API Backend (Node/TypeScript, laeuft via `tsx`) |
| `ui/` | React Frontend (Dashboard) |
| `packages/db` | Kysely DB Schema + Migrations |
| `packages/shared` | Shared Types und Utilities |
| `packages/adapters/*` | Agent-Adapter (gemini-local, claude-local, etc.) |

**Wichtigste Source-Dateien:**

| Was | Wo |
|-----|-----|
| Live Quota API | `server/src/services/gemini-quota-api.ts` |
| Flash-Lite Router | `server/src/services/gemini-flash-lite-router.ts` |
| Control Plane | `server/src/services/gemini-control-plane.ts` |
| Heartbeat (Run-Loop) | `server/src/services/heartbeat.ts` |
| Routing + Quota | `server/src/services/gemini-routing.ts` |
| Routing Policy | `server/config/gemini-routing-policy.v1.json` |
| Issue Routes | `server/src/routes/issues.ts` |
| Agent Routes | `server/src/routes/agents.ts` |

**Dev-Server starten:** `pnpm dev:watch` (oder `pnpm dev:once`)

---

## Regeln

### Fuer David arbeiten
- David ist der CEO. Er gibt Richtung vor, du fuehrst aus.
- Deutsch bevorzugt, Tech-Terms Englisch ok.
- Kurz und direkt. Results > Plaene. Keine Textwaende.
- David committet und pusht selbst - NIE danach fragen.
- Wenn du unsicher bist, frag. Lieber einmal fragen als falsch bauen.

### Leitfrage
> *Entlastet das David real oder verschoenert es nur die Maschine?*

### NO-GO
- Kein Multi-Agent-Ausbau solange eine Lane nicht stabil laeuft
- Kein Benchmark-Theater
- Keine neue Meta-Architektur ohne konkreten Nutzen
- Keine "romantische Autonomie"-Erweiterungen
- Keine unautorisierten Commits oder Aenderungen ausserhalb der Aufgabe

### MEMORY.md Pflege
- **Lies MEMORY.md am Anfang** - versteh wo wir stehen
- **Update MEMORY.md am Ende** - wenn sich etwas geaendert hat
- **Korrigiere MEMORY.md sofort** - wenn etwas darin falsch ist
- **Halte es kurz** - max ~150 Zeilen, Fakten statt Prosa
- **Keine Session-Details** - nur stabile Fakten die ueber Sessions hinweg gelten
- **Architektur-Entscheidungen festhalten** - die naechste AI muss wissen WARUM

### Issue Runs (Gemini-Agent steuern)
- Issue Run starten: `PATCH /api/issues/{id}` mit `{"assigneeAgentId": "..."}`
- NICHT `POST /api/agents/{id}/wakeup` - das ist ein Heartbeat ohne Kontext
- Unassign + Reassign zum erneuten Triggern

### Env Vars (muessen gesetzt sein fuer Quota)
- `GEMINI_OAUTH_CLIENT_ID`
- `GEMINI_OAUTH_CLIENT_SECRET`

---

## Nach /compact oder Context-Verlust

1. Lies diese INIT.md
2. Lies MEMORY.md
3. Lies `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
4. Du bist wieder auf Stand
5. Arbeite weiter wo die letzte Session aufgehoert hat

---

> *Diese Datei ist der Schluessel zu nahtlosem Kontext ueber beliebig viele AI-Sessions und -Modelle hinweg. Halte MEMORY.md aktuell und lies den North Star, damit die Richtung stabil bleibt.*
