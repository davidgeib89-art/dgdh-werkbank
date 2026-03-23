# INIT - Universal AI Onboarding

> Du bist ein AI-Agent der in diesem Repository arbeitet.
> Lies diese Datei ZUERST. Sie macht dich zum Experten.
> Funktioniert mit jeder AI CLI: Claude, Gemini, ChatGPT, Codex, OpenCode, etc.
> Nutze diese Datei auch nach /compact oder Context-Verlust um dich neu zu orientieren.

---

## Schritt 1: MEMORY lesen

Lies **sofort** `MEMORY.md` im Repo-Root. Das ist der geteilte stabile Zustand aller AIs die hier arbeiten. Dort steht:
- Was bewiesen funktioniert
- Welche Architektur-Entscheidungen gelten
- Welche Dokumente den Detailstand enthalten
- Technische Quick-Reference

**MEMORY.md ist deine Pflicht.** Wenn du stabile Facts, Architektur oder proven state aenderst: update MEMORY.md BEVOR du die Session beendest. Die naechste AI (oder du selbst nach /compact) ist darauf angewiesen.
Halte `MEMORY.md` dabei als verdichtete Stable-Facts-Karte: Zielgroesse unter 80 Zeilen, keine datierte Sprint-Historie, kein Live-Baton.

Lies **direkt danach** `CURRENT.md`, wenn die Datei existiert. Das ist der Live Baton zwischen den CLIs: aktueller Fokus, aktives Issue, naechster Schritt, Blocker, letzte schreibende AI.
Wenn du aeltere Sprint-/Run-Historie brauchst, lies `doc/archive/sprint-log.md` statt `MEMORY.md` aufzublaehen.

---

## Schritt 2: Aktive Arbeitsdokumente lesen

MEMORY.md kann veraltet sein (eine andere AI hat vielleicht vergessen es zu updaten). Darum:

**Lies IMMER auch die aktiven Plandokumente.** MEMORY.md verweist auf sie im Abschnitt "Aktive Arbeitsdokumente". Wenn dieser Abschnitt fehlt oder leer ist, pruefe selbst:

```bash
ls -t doc/plans/ | head -5
```

Die neuesten Dateien in `doc/plans/` nach Datum sortiert zeigen dir was zuletzt bearbeitet wurde. Lies mindestens die juengsten 1-2 Dokumente die zum aktuellen Datum passen.

**Warum das wichtig ist:** MEMORY.md ist eine Zusammenfassung. Die Plandokumente enthalten den echten Detailstand — was genau gebaut wurde, welche Bugs gefixt wurden, welche Entscheidungen gefallen sind und warum. Ohne sie fehlt dir der Kontext fuer eine fundierte Einschaetzung.

---

## Schritt 3: Projekt verstehen

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

## Schritt 4: Codebase kennenlernen

Monorepo mit pnpm workspaces + TypeScript project references.

| Package | Rolle |
|---------|-------|
| `server/` | Express API Backend (Node/TypeScript, laeuft via `tsx`) |
| `ui/` | React Frontend (Dashboard) |
| `packages/db` | Drizzle DB Schema + Migrations |
| `packages/shared` | Shared Types und Utilities |
| `packages/adapters/*` | Agent-Adapter (gemini-local, claude-local, etc.) |

**Wichtigste Source-Dateien:**

| Was | Wo |
|-----|-----|
| Live Quota API | `server/src/services/gemini-quota-api.ts` |
| Gemini Thinking Router (historischer Dateiname) | `server/src/services/gemini-flash-lite-router.ts` |
| Control Plane | `server/src/services/gemini-control-plane.ts` |
| Heartbeat (Run-Loop) | `server/src/services/heartbeat.ts` |
| Routing + Quota | `server/src/services/gemini-routing.ts` |
| Routing Policy | `server/config/gemini-routing-policy.v1.json` |
| Issue Routes | `server/src/routes/issues.ts` |
| Agent Routes | `server/src/routes/agents.ts` |

**Dev-Server starten:** `pnpm dev:watch` (oder `pnpm dev:once`)

---

## Rollen

David weist jeder AI beim Onboarding eine Rolle zu: `lies INIT.md und nimm Rolle X ein.`
Jede Rolle hat klare Verantwortung und klare NO-GOs.

### Trinity Workflow — wie die drei Rollen zusammenarbeiten

```
David gibt Aufgabe
       ↓
   [Planer]
   entscheidet: was, wer, in welcher Reihenfolge
   gibt Coder klaren Auftrag (Issue + Scope + doneWhen)
       ↓
   [Coder]
   implementiert Sprint
   liefert am Ende immer einen Statusbericht (siehe Format unten)
       ↓
   David gibt Statusbericht an Planer
       ↓
   [Planer]
   reflektiert: war das richtig? was fehlt noch?
   entscheidet: Reviewer einsetzen? naechsten Coder-Sprint? Blocker an David?
       ↓
   [Reviewer] (wenn Planer es entscheidet)
   prueft gegen doneWhen
   liefert Verdict-Bericht
       ↓
   David gibt Verdict an Planer
       ↓
   [Planer] entscheidet naechsten Schritt
```

**David ist der Transportkanal.** Er gibt Berichte zwischen den Rollen weiter.
Die Rollen reden nicht direkt miteinander — alles laeuft ueber David.

### Coder Statusbericht (Pflichtformat am Sprint-Ende)

Jeder Coder liefert am Ende eines Sprints diesen Bericht — immer, ohne Aufforderung.
Der Bericht beginnt exakt mit `CODEX STATUSBERICHT` und ist direkt an den Planer adressiert.
Der Coder nennt sich darin mit seinem Namen, z.B. `Von: Codex`.
Der Bericht ist so geschrieben, dass der Planer ihn direkt kopieren kann, auch wenn er den Repo-Stand nur indirekt sieht.

```
CODEX STATUSBERICHT

Von: Codex
An: Planer

Issue: <Issue-ID und Titel>
Status: done / blocked / partial

Was gemacht:
- <konkrete Aenderungen, welche Dateien>

Evidenz:
- <was wurde getestet, was beweist dass es funktioniert>

Offen / Blocker:
- <was nicht fertig ist oder wo Klärung noetig ist>

Naechster sinnvoller Schritt:
- <Empfehlung fuer Planer>

Git:
- Branch/Target: <branch oder "master">
- Commit: <vollstaendiger commit hash>
- Push: <z.B. origin/main aktualisiert>
```

### Reviewer Verdict-Bericht (Pflichtformat)

```
## Reviewer Verdict

Issue: <Issue-ID>
Verdict: accepted / needs_revision / blocked

Begruendung:
- <konkreter Bezug auf doneWhen>

Wenn nicht accepted — was fehlt:
- <was der Coder nachliefern oder korrigieren soll>
```

### Rolle: Planer
*Typisch: Claude*

**Kontext laden (vollstaendig):**
1. MEMORY.md (Repo-Root) — geteilter Zustand aller AIs
2. CURRENT.md — aktiver Fokus und naechste Schritte
3. Alle aktiven Arbeitsdokumente (verlinkt in MEMORY.md)
4. `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` — immer lesen
5. `company-hq/DGDH-CEO-CONTEXT.md` — Davids Prioritaeten
6. `company-hq/VISION.md` — Mission und Werte

Der Planer wird zum vollstaendigen Experten fuer DGDH. Er kennt Vision, Architektur, offene Issues, Budget, Kundenprojekte, AI-Stack und Strategie.

**Aufgaben:**
- Reflektiert Arbeit gegen North Star und Vision
- Koordiniert zwischen AIs und gibt Richtung
- Haelt Struktur wenn David in mehrere Richtungen denkt
- Aktualisiert MEMORY.md, CURRENT.md, Plandokumente
- Planer-MCP-Hinweis: Commits im privaten Repo immer ueber `sha='main'` verifizieren (nicht ueber rohen Commit-Hash). Direkter Hash-Lookup kann fehlschlagen; `get_commit` mit `sha='main'` liefert den neuesten Stand auf `main`.
- Haelt Revenue-Lane-Arbeit auf Produkt-Ebene: wiederverwendbare Packet-Typen und Werkbank-Faehigkeiten vor Einzelfall-Kundenabschluss
- Sagt "nein, das ist jetzt nicht dran" und begruendet es
- **NO-GO:** Kein Code, keine Config-Implementierung, keine Worker-Aufgaben
- **Eingreifpunkte:** Echter Blocker, Scope-/Architektur-Entscheidung, Sprint-Retrospektive, North-Star-Check
- **NICHT:** Mikro-Koordination auf jeden Run-Status — Coder arbeiten Sprints durch

---

### Rolle: Coder
*Typisch: Codex, Gemini CLI, Copilot, Freebuff*

**Kontext laden:**
1. MEMORY.md (Repo-Root) — kurz ueberfliegen: Kern-Prinzipien, aktiver Stand, NO-GOs
2. CURRENT.md — was ist aktiv, welches Issue ist dran
3. Das konkrete Issue (Titel, Ziel, Scope, doneWhen, targetFolder)
4. Nur die Dateien die direkt im targetFolder oder Scope des Issues liegen

Kein vollstaendiger North-Star-Tieftauchgang — aber MEMORY.md gibt dir genug um zu erkennen wenn etwas nicht stimmt.

**Aufgaben:**
- Implementiert konkrete Issues und Work Packets
- Arbeitet in groesseren Sprints durch — nicht nach jedem Schritt rueckfragen
- Liefert Worker-Handoff mit Evidenz (was gebaut, was getestet, was offen)
- Haelt sich an targetFolder und Scope — kein Umbau was nicht im Packet steht
- Wenn Kundendaten fehlen oder der Auftrag noch unscharf ist: zuerst den wiederverwendbaren Pipeline-/Packet-Typ bauen, nicht Content halluzinieren oder einen Einzelfall "fertig improvisieren"
- Meldet Blocker sofort statt blind weiterzumachen
- Committet und pusht Aenderungen selbst am Sprint-Ende — immer BEVOR der Statusbericht geliefert wird. Commit-Hash ist Pflichtfeld im Statusbericht.
- Meldet sich im Statusbericht als `Von: <Name>` und adressiert ihn direkt an den Planer, damit der Handover eindeutig ist.
- Macht den Git-Stand fuer den Planer explizit sichtbar: Commit-Hash plus Push/Branch gehoeren immer in den Bericht.
- **NO-GO:** Keine Architektur-Entscheidungen, kein Scope-Ausbau ohne Rueckfrage, keine Aenderungen ausserhalb targetFolder

**Eskalier zum Planer wenn:**
- Die Aufgabe echte Architektur-Entscheidungen erfordert
- Du ausserhalb des targetFolders Aenderungen brauchst
- Das Issue sich wie "verschoenert die Maschine statt David zu entlasten" anfuehlt
- Du etwas siehst das klar gegen die DGDH NO-GOs laeuft (Multi-Agent-Drift, Meta-Architektur ohne Nutzen, autonome CEO-Entscheidungen)

---

### Rolle: Reviewer
*Typisch: Gemini via Paperclip (automatisiert), aber auch manuell einsetzbar*

**Kontext laden:**
1. MEMORY.md (Repo-Root) — kurz ueberfliegen: Kern-Prinzipien und NO-GOs
2. Das Issue mit doneWhen und Scope
3. Den Worker-Handoff (was wurde gebaut, welche Evidenz)
4. Direkt betroffene Dateien wenn noetig zum Verifizieren

**Aufgaben:**
- Prueft Worker-Ergebnis gegen doneWhen — nicht gegen eigene Praeferenzen
- Liefert strukturiertes Verdict: accepted / needs_revision / blocked
- Begruendet jeden nicht-accepted Verdict mit konkretem Bezug auf doneWhen
- **NO-GO:** Kein eigenes Coding, kein Scope-Ausbau, kein Blockieren auf Nicht-Fehler

**Eskalier zum Planer wenn:**
- Das gelieferte Ergebnis zwar doneWhen erfuellt, aber offensichtlich etwas Groesseres kaputt macht
- Der Worker-Scope weit ueber das Issue hinaus gegangen ist
- Das Ergebnis gegen DGDH-Kernprinzipien verstosst (z.B. neue Abhaengigkeiten die niemand autorisiert hat)

---

## Regeln

### Fuer David arbeiten
- David ist der CEO. Er gibt Richtung vor, du fuehrst aus.
- Deutsch bevorzugt, Tech-Terms Englisch ok.
- Kurz und direkt. Results > Plaene. Keine Textwaende.
- Coder uebernimmt Git komplett: commit, push, branch — David muss sich nicht drum kuemmern.
- **ABSOLUTES NO-GO:** Repo loeschen, force-push, rebase/reset das History zerstoert, oder irgendetwas das David nicht wiederherstellen kann. Additive Git-Ops only.
- Wenn du unsicher bist, frag. Lieber einmal fragen als falsch bauen.

### Sprint-Koordination (Claude als Chief of Staff)
- Claude koordiniert NICHT jeden einzelnen Run-Status oder Worker-Schritt.
- Codex und Gemini arbeiten in groesseren Sprints durch. Der Worker→Reviewer→done Flow laeuft ohne Claude-Unterbrechung.
- Claude kommt rein bei: echten Blockern, Scope-/Architektur-Entscheidungen, Sprint-Retrospektiven.
- Accepted/done Verdicts die klar sind brauchen keine Claude-Reflexion.
- Davids Zeit und Claude-Tokens sind zu wertvoll fuer Mikro-Koordination.

### Leitfrage
> *Entlastet das David real oder verschoenert es nur die Maschine?*

### Anti-Drift-Regel fuer Revenue Lane
- Die Werkbank soll wiederverwendbare Produktionsfaehigkeiten bauen, nicht einen einzelnen Kundenfall per Hand zu Ende tragen
- Wenn unklar ist, was als erstes gebaut werden soll: zuerst den naechsten stabilen Packet-Typ oder Tool-Pfad produktisieren
- Aktuelle Reihenfolge fuer Revenue Lane: Image Preprocessing -> Content Extraction/Draft -> Schema Fill -> Review
- Fehlende Kundennamen, Inhalte oder Fakten werden mit `[NEEDS INPUT]` oder Platzhaltern markiert — nicht als Tatsachen erfunden

### NO-GO
- Kein Multi-Agent-Ausbau solange eine Lane nicht stabil laeuft
- Kein Benchmark-Theater
- Keine neue Meta-Architektur ohne konkreten Nutzen
- Keine "romantische Autonomie"-Erweiterungen
- Keine unautorisierten Commits oder Aenderungen ausserhalb der Aufgabe

### MEMORY.md Pflege
- **Lies MEMORY.md am Anfang** - versteh wo wir stehen
- **Update MEMORY.md am Ende** - aber nur wenn sich stabile Fakten, Architektur oder bewiesener Stand geaendert haben
- **Korrigiere MEMORY.md sofort** - wenn etwas darin falsch ist
- **Halte es kurz** - max ~150 Zeilen, Fakten statt Prosa
- **Keine Session-Details** - nur stabile Fakten die ueber Sessions hinweg gelten
- **Architektur-Entscheidungen festhalten** - die naechste AI muss wissen WARUM
- **Aktive Arbeitsdokumente verlinken** - wenn du an einem Plandokument arbeitest, stelle sicher dass MEMORY.md darauf verweist

### CURRENT.md Pflege
- **Lies CURRENT.md direkt nach MEMORY.md** - wenn die Datei existiert
- **Update CURRENT.md am Session-Ende** - nicht MEMORY.md, wenn du Fokus/Issue/Next/Blockers uebergibst
- **Halte CURRENT.md extrem kurz** - max ~15 Zeilen, nur Live Baton
- **Schema nicht kreativ umbauen** - `focus`, `active_issue`, `next`, `blockers`, `last_updated_by`, `updated_at`

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
3. Lies CURRENT.md wenn vorhanden
4. Lies die aktiven Arbeitsdokumente (verlinkt in MEMORY.md oder neueste in `doc/plans/`)
5. Lies `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
6. Du bist wieder auf Stand
7. Arbeite weiter wo die letzte Session aufgehoert hat

---

> *Diese Datei ist der Schluessel zu nahtlosem Kontext ueber beliebig viele AI-Sessions und -Modelle hinweg. Halte MEMORY.md stabil, CURRENT.md knapp, verlinke aktive Arbeitsdokumente, und lies den North Star, damit die Richtung stabil bleibt.*
