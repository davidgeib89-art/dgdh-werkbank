# Backlog: Skill-Creation Engine

**Status:** backlog (nicht priorisiert)
**Erstellt:** 2026-03-22
**Trigger:** Nach Sprint O (CEO + Assistent + Reviewer-Loop muessen stabil sein)

## Was es ist

Ein System das erkennt wenn neue Skills gebaut werden
und sie automatisch fuer alle zukuenftigen Runs verfuegbar macht.

Drei Stufen (siehe `doc/architecture/dgdh-agent-architecture.md`):

1. **Reflexive Skill-Registrierung** — Git Snapshot erkennt neuen Skill,
   updated Registry automatisch. CEO + Assistent wissen beim naechsten Run
   was verfuegbar ist.

2. **Skill-Komposition** — Agenten schlagen vor bestehende Skills zu
   kombinieren. David approved.

3. **Skill-Creation als Meta-Skill** — Agenten erkennen wiederkehrende
   Use Cases und schlagen vor einen neuen Skill zu bauen.
   David approved + Reviewer-Gate. Immer.

## Warum es Sinn macht

Jedes neue Projekt das DGDH abarbeitet erzeugt Faehigkeiten.
Ohne diese Engine bleiben die Faehigkeiten implizit (in Commits vergraben).
Mit dieser Engine werden sie explizit (in der Skill-Registry, aufrufbar).

Das Flywheel: mehr Kunden → mehr Skills → schnellere Lieferung →
mehr Kunden. David macht weniger, nicht mehr.

## Voraussetzungen

- CEO V1 muss Delegation beweisen (Sprint M)
- Assistent muss Zerlegung beweisen (Sprint N)
- Reviewer-Loop muss Quality Gates beweisen (Sprint O)
- Erst danach ist die Grundlage da auf der Skill-Creation sicher aufbauen kann

## Rohbau der bereits existiert

- `plugin-dev-watcher.ts` — beobachtet Filesystem-Aenderungen
- `plugin-registry.ts` — verwaltet Plugin-Registrierung
- Git-Snapshot waere die persistente, commit-basierte Version davon

## Harte Grenze

David Geib hat das letzte Wort. Immer.
Auch wenn das System vorschlaegt einen Skill zu bauen — David approved.
Das ist in `company-hq/AGENT-CONSTITUTION.md` eingebacken und nicht verhandelbar.

## Nicht jetzt

Kein Sprint, kein Code-Change. Nur Backlog-Notiz.
Angehbar fruehestens nach Sprint O.
