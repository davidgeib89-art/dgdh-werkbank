# DGDH Focus Freeze

Status: aktiv
Date: 2026-03-23
Window: bis ca. 2026-04-02 oder bis der Fokus explizit ersetzt wird
Purpose: Kontextdrift fuer die naechsten Tage stoppen und die Firma auf zwei konkrete Beweisziele einfrieren.

## Warum dieser Freeze existiert

DGDH hat aktuell viele plausible naechste Schritte:

- E2E-Orchestrierung haerten
- Revenue Lane erweitern
- Memory/Skills/Provider weiterdenken
- Infrastruktur refactoren

Ohne harten Fokus fuehrt das zu Drift.

Darum gilt fuer die naechsten Tage:

- keine neue Meta-Architektur
- keine neue Zukunftsebene
- keine "auch noch schnell"-Nebenexpansion

Erst die aktuelle Firmenfaehigkeit beweisen, dann wieder oeffnen.

## Erlaubte Prioritaeten

### Prioritaet 1: Firmenloop boringly reliable

Ziel:

- `CEO -> Worker -> Reviewer -> Merge -> Summary` muss real, wiederholt und ohne Theater funktionieren

Erlaubt:

- echte E2E-Laeufe
- blockerfixes fuer diesen Loop
- reviewer-tuning wenn Revisions-Loops oder Pingeligkeit echte Fortschritte blockieren
- merge-/approval-/summary-fixes wenn sie den Loop direkt betreffen

Nicht gemeint:

- neue Rollen einfuehren
- neuen Architekturfilm starten
- Heartbeat aus Prinzip refactoren

### Prioritaet 2: Primitive `verein`-Capability

Ziel:

- aus dem bestehenden Astro/Keystatic-Core eine primitive, funktionierende Vereinswebsite erzeugen koennen

Minimum-Definition:

- Build laeuft sauber
- sichtbare Ferienwohnungslogik dominiert nicht mehr
- Hero, Kurzbeschreibung, Kontakt und mindestens 3 passende Vereins-Sections sind sinnvoll befuellt
- Ergebnis wirkt roh aber brauchbar, nicht kaputt oder peinlich

Wichtige Interpretation:

- das ist kein Revenue-Ziel
- das ist der Beweis, dass DGDH eine konkrete Arbeitssorte wiederholt liefern kann

## Sequenz der naechsten Schritte

1. E2E-Firmenloop stabilisieren
2. `verein`-Profil-Layer / Mapping / Section-Komposition produktisieren
3. primitive Vereinswebsite in einem ersten Lauf erzeugen
4. einen zweiten Qualitaetslauf etablieren (`primitive -> better`)

## Anti-Drift-Regel

Jeder neue Vorschlag wird nur an einer Frage gemessen:

> Erhoeht das direkt die Zuverlaessigkeit des Firmenloops oder die primitive `verein`-Capability?

Wenn nein:

- nicht jetzt
- backloggen
- weiter

## Drei Pflicht-Metriken

### 1. Abschlussrate

- Wie oft kommt eine Mission wirklich bis Output + Review + Abschluss?

### 2. Manual Minutes Saved

- Wie viele Minuten Nacharbeit muss David nach einem Run noch selbst machen?

### 3. Primitive-to-Better Delta

- Kann Run 2 Run 1 sichtbar verbessern, statt nur anders zu machen?

## Nicht jetzt

- Firm Memory Agent
- Skill-Creation Engine
- neue Provider-/Lane-Expansion
- Assistant-Ausbau als Pflichtglied
- Heartbeat Modular Refactor ohne akuten Blocker
- Telegram-/Comfort-Layer
- allgemeine Meta-Reflexionsschichten
- Revenue-Einzelfall-Abschluss als Selbstzweck

## Operator-Regel

Fuer die naechsten Tage entwickelt DGDH nicht "die allgemeine autonome Firma".

DGDH entwickelt:

- einen zuverlaessigen Firmenloop
- plus eine konkrete vertikale Arbeitsfaehigkeit

Erst wenn diese beiden Dinge bewiesen sind, wird der Fokus wieder geoeffnet.
