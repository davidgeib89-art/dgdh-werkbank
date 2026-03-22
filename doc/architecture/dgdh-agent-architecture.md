# DGDH Agent Architecture — Rollen × Skills

**Status:** kanonisch (2026-03-22)
**Gilt für:** alle AIs die mit DGDH arbeiten

## Das Kernprinzip: Opinionated Flexibility

DGDH-Agenten sind weder starr noch chaotisch.
Sie operieren in geregelter Freiheit:
Guidelines sind eingebacken — Freiheit existiert innerhalb dieser Grenzen.

"Spezialisierung bei gleichzeitiger möglicher Offenheit —
entschieden anhand von Guidelines die ins System gebacken sind."
— David Geib, 2026-03-22

## Zwei orthogonale Dimensionen

### Dimension 1 — Rollen (vertikal, langlebig, mit Persönlichkeit)

Rollen haben Verantwortung, Kontext und Charakter.
Sie nutzen reportsTo + chainOfCommand (bereits im Datenbankschema).

David (CEO, Mensch)
  └── CEO-Agent       → versteht Mission, delegiert, aggregiert
        └── Assistent → zerlegt Delegation in konkrete Packets
              └── Worker    → führt einen Packet aus
                    └── Reviewer  → prüft doneWhen, freed oder schickt zurück

Rollen erben Guidelines automatisch durch dieselbe Engine.
Neue Rollen brauchen nur eine neue role-template JSON — kein neues Datenmodell.

### Dimension 2 — Skills/Tools (horizontal, zustandslos, ohne Persönlichkeit)

Skills sind aufrufbare Fähigkeiten. Jede Rolle kann jeden Skill nutzen.
Sie leben als Plugin-Endpoints im bestehenden Plugin-System.

Beispiele (heute):
- revenue-image-pipeline
- revenue-content-extractor
- revenue-schema-fill
- revenue-template-apply

Beispiele (morgen):
- skill:web-research
- skill:social-content
- skill:pdf-extract

Skills haben keine Meinung. Rollen haben Meinung.
Skills machen. Rollen entscheiden wann und warum.

## Guidelines — einmal schreiben, überall wirken

Guidelines leben auf drei Ebenen gleichzeitig:

| Ebene | Datei | Wirkung |
|-------|-------|---------|
| Agent-Config | role-templates/*.json | Constitution Check, Packet-Format, Delegation-Regeln |
| Routing-Policy | gemini-routing-policy.v1.json | Welches Modell, welche Lane, welche Kosten |
| Constitution | company-hq/AGENT-CONSTITUTION.md | One run = one work packet. Keine Ausnahmen. |

## Was das NICHT ist

- Kein Multi-Agent-Chaos wo Agents sich selbst tasken
- Kein romantischer Autonomie-Loop
- Keine Benchmarks, keine Eval-Drift
- Kein "alles-kann-alles"-System

## Reihenfolge des Aufbaus

Sprint M  → CEO V1 — Rolle definiert, Packets erstellt (done, aber Auth unvollstaendig)
Sprint N  → Assistent V1 — Rolle definiert (done, aber Kette nicht verdrahtet)
Sprint O  → Auth-Token-Injection — CEO kann API zuverlaessig aufrufen
Sprint P  → Assignment-Logik — erstellte Issues landen bei Workern
Sprint Q  → Reviewer-Feedback-Loop — Verdict hat Konsequenzen
Sprint R  → CEO-Aggregation — Parent schliesst wenn Children done
Sprint S  → Smoke Customer Run — erster vollautomatischer End-to-End-Lauf

Jeder Sprint beweist die Voraussetzung fuer den naechsten.
Kein Sprint basiert auf Hoffnung.

## Verdrahtungs-Backlog (Stand 2026-03-22)

Die Einzelteile existieren. Die Orchestrierungsschicht fehlt noch.

| Stueck | Status |
|--------|--------|
| Auth-Token-Injection fuer CEO-API-Calls | fehlt |
| Auto-Assignment CEO → Worker | fehlt |
| Reviewer-Verdict → Approval-Status | fehlt |
| CEO-Aggregation (Parent schliesst wenn Children done) | fehlt |
| Re-Invocation (CEO wacht auf wenn Children fertig) | fehlt |

Diese 5 Stuecke sind der kritische Pfad vor dem ersten
vollautomatischen End-to-End-Lauf (Sprint S).

## Stufen der Selbst-Verbesserung

Die Fabrik wird mit jedem Projekt kompetenter — aber kontrolliert, in drei Stufen:

### Stufe 1 — Reflexive Skill-Registrierung (nach Sprint O)

Wenn ein Worker einen neuen Skill baut (neues Plugin/Package),
erkennt das System das automatisch via Git Snapshot Engine
und registriert den Skill in der Skill-Registry.

Ab dem naechsten Run wissen CEO + Assistent dass dieser Skill existiert
und koennen ihn fuer Kunden einsetzen. Kein manueller Schritt noetig.

Rohbau existiert bereits: `plugin-dev-watcher.ts` + `plugin-registry.ts`.
Git-Snapshot waere die persistente, commit-basierte Version davon.

### Stufe 2 — Skill-Komposition (spaeter)

CEO schlaegt vor: "Skill A + B kombinieren zu Skill C".
Assistent plant die Komposition, Worker baut sie, Reviewer prueft.
David approved das Ergebnis.

Beispiel: Zweiter Vereinskunde kommt → System erkennt:
"vereinswebseite-template existiert schon, nur Content fuellen".

### Stufe 3 — Skill-Creation als Meta-Skill (viel spaeter)

Agenten koennen nicht nur Skills nutzen — sie koennen neue Skills
vorschlagen und bauen lassen. Intelligence erkennt wann das sinnvoll ist
(z.B. gleicher Use Case kommt zum zweiten Mal → Skill erzeugen
statt nochmal manuell bauen).

**Harte Grenze: David approves immer.** Auch in Stufe 3.
Das ist in der Constitution eingebacken.

### Sicherheits-Matrix

| Stufe | Was passiert | Wer hat letztes Wort | Risiko |
|-------|-------------|---------------------|--------|
| 1 | Skill automatisch registriert | System (nur Lesen + Registry-Write) | Minimal |
| 2 | Skill-Kombination vorgeschlagen | David approved | Niedrig |
| 3 | Neuer Skill-Code geschrieben | David approved + Reviewer-Gate | Mittel |

### Das Flywheel

Neuer Kunde → neuer Skill gebaut → automatisch registriert →
naechster Kunde profitiert sofort → Fabrik wird kompetenter →
David macht weniger, nicht mehr.

Details: `doc/backlog/skill-creation-engine.md`
