# DGDH Evolution Lane - Werkbank baut Werkbank

Datum: 2026-03-23
Status: Kanonische spaetere Richtung, nicht aktueller Hauptsprint
Zweck: Haelt fest, wie DGDH spaeter kontrollierte Selbstverbesserung baut, ohne jetzt in freie Meta-Architektur oder Live-Selbstoptimierung abzudriften.

## 1. Klares Urteil

DGDH soll spaeter Self-Learning und Self-Emerging bekommen.

Aber nicht als freie Selbstoptimierung in Live-Production.

Der richtige Pfad ist:

> kontrollierte, benchmark-getriebene Selbstverbesserung

Das heisst:

- keine stille Live-Selbstmodifikation
- keine "die Agenten lernen halt irgendwie"-Erzaehlung
- keine Persona-Magie als Haupthebel
- stattdessen Replay, Benchmarks, Rubrics, Memory, Tracking und harte Human-Merge-Gates

## 2. Was HyperAgents fuer DGDH wirklich zeigt

Aus `doc/experimental/hyperagents.pdf` sind fuer DGDH vor allem diese Punkte relevant:

1. Der groesste Hebel ist nicht nur bessere Task-Arbeit, sondern bessere Verbesserung der Task-Arbeit.
2. Der Kernhebel ist metacognitive self-modification: nicht nur Outputs verbessern, sondern den Verbesserungsmechanismus selbst.
3. Die Gewinne kamen nicht primaer aus "sei rigoros"-Prompts, sondern aus strukturierten Verfahren:
   - Checklisten
   - Decision Rules
   - explizite Kriterien
   - persistent memory
   - performance tracking
   - Bias-/Regression-Erkennung
4. Das Ganze lief gesandboxed und mit human oversight.
5. Selbst dort war der aeussere Loop nicht grenzenlos frei. Auch das ist fuer DGDH die nuetzerne Lesart: erst kontrollieren, dann lockern.

## 3. Was fuer DGDH jetzt kanonisch sein soll

### 3.1 Nicht Persona-Voodoo, sondern Verfahren

Fuer DGDH gilt spaeter bevorzugt:

- Checklisten statt Attituede
- Rubrics statt Bauchgefuehl
- Decision Trees statt losem Rollen-Sprech
- explizite Acceptance-/Rejection-Kriterien statt "wirkt gut"

Das gilt besonders fuer Review, Delegation und CEO-Aggregation.

### 3.2 Memory als operativer Datenkoerper

`MEMORY.md` bleibt wichtig fuer Menschen und fuer stabilen Repo-Kontext.

Fuer echte Selbstverbesserung braucht DGDH spaeter zusaetzlich maschinenlesbare Laufdaten:

- Mission
- Packet / doneWhen
- gefordertes Ergebnis
- geliefertes Ergebnis
- Reviewer-Verdict
- war das Verdict spaeter korrekt oder false positive / false negative
- erster echter Schmerz / Blocker
- welche Regel, Rubric oder Prompt-Aenderung geholfen haette

Kurz:

> Nicht nur Journal. Operativer Lernkoerper.

First-principles Nachschaerfung:

- Firmengedachtnis ist gestufte Kompression, nicht Vollkontext
- der haerteste Memory-Layer ist zuerst kanonischer Betriebszustand
- episodische Laufdaten sind Rohmaterial, nicht schon Weisheit
- semantische Muster muessen erst verdichtet werden, bevor sie Verhalten aendern
- prozedurale Promotion landet spaeter in Guardrails, Templates oder Skills

### 3.3 Go with the flow nur mit Fitness-Funktion

"Go with the flow" ist fuer DGDH nur dann sinnvoll, wenn ein neuer Weg in Replay oder Benchmark real gewinnt.

Sonst ist es oft nur:

- shiny detour
- Agententheater
- Selbsttaeuschung

## 4. Evolution Lane fuer DGDH

Die Evolution Lane ist spaeter eine eigene Ausbaurichtung:

> Werkbank baut Werkbank.

Aber sie ist bewusst getrennt vom aktuellen Firmenloop-Fokus.

### Phase 0 - Voraussetzungen schaffen

Noch keine freie Selbstoptimierung. Nur die noetigen Bausteine:

- strukturierte Reviewer-Rubrics
- maschinenlesbare Run-Metadaten
- Fehlerklassen fuer wiederkehrende Schmerzen
- kompakte Post-Run-Reflections
- Replay-faehige Archive echter Firmenlaeufe

Minimal wichtige Fehlerklassen:

- false_approval
- false_reject
- scope_drift
- delegation_failure
- handoff_stall
- merge_conflict
- review_gap

### Phase 1 - Replay Learning

Sobald genug echte Firmenlaeufe existieren:

- altes Run-Archiv als Benchmark-Set nutzen
- Templates, Rubrics und Policies offline dagegen verbessern
- nie blind live umschalten
- Ergebnis immer als PR / Diff gegen Branch oder Worktree

Ziel:

> nicht live lernen, sondern erst im Rueckspiegel besser werden

Kompakte Lernformel:

> Run -> Signal -> Verdichtung -> Promotion

### Phase 2 - Meta-PR Lane

Spaeter darf ein Meta-Worker bounded Aenderungen an der Werkbank selbst vorschlagen, zum Beispiel:

- `ceo.json` schaerfen
- Reviewer-Rubrics verbessern
- Retry-/Escalation-Regeln haerten
- kleine Checklisten- oder Skill-Bausteine bauen
- Routing-Policies gezielt nachschaerfen

Wichtig:

> Ergebnis ist immer ein PR an David, nie ein stiller Produktionswechsel

### Phase 3 - Kontrollierte Selbstverbesserung

Erst spaeter:

- canary benchmark
- held-out Faelle
- Regressionscheck
- Human review
- Human merge

Erst danach darf eine Verbesserung in den Live-Loop.

## 5. Drei Dinge, die ab jetzt als Zielbild gelten

### A. Jeder echte Firmenlauf soll Lernmaterial erzeugen

Nicht nur Status und Kommentar, sondern spaeter auch:

- Was war die Mission?
- Was wurde verlangt?
- Was wurde geliefert?
- War der Review korrekt?
- Wo lag der erste Schmerz?
- Welche Regel haette geholfen?

### B. Review-Qualitaet wird selbst zum Lernobjekt

Nicht nur Worker-Leistung wird bewertet.

Auch Review bekommt spaeter Marker wie:

- false approval
- false reject
- evidence missing
- scope miss
- doneWhen miss

### C. Selbstverbesserung laeuft zuerst gegen Replay, nicht gegen live production

Das ist der zentrale Guardrail.

Wenn DGDH sich spaeter selbst verbessert, dann zuerst:

- offline
- benchmark-getrieben
- replay-basiert
- PR-basiert

Nicht:

- ungeprueft
- live
- still
- irreversibel

## 6. Was explizit nicht gemeint ist

Nicht jetzt:

- freie CEO-Selbstoptimierung in Production
- neue allgemeine Workflow-Engine
- n8n-artige Meta-Orchestrierung
- Skills-Projekt als Flucht aus dem Firmenloop
- offenes Capability-Framework fuer alles

Dieses Dokument soll die Richtung sichern, nicht einen neuen Plattform-Sprint ausloesen.

## 7. Warum das fuer DGDH spaeter einer der staerksten Hebel ist

Der eigentliche Exponentialhebel ist nicht nur:

> Aufgaben besser loesen

sondern:

> den Mechanismus verbessern, mit dem DGDH Aufgaben besser loest

Also spaeter:

- bessere Delegationsregeln
- bessere Review-Rubrics
- bessere Retry-Entscheidungen
- bessere Handoffs
- bessere Meta-Policies

## 8. Operative Einordnung gegen Drift

Dieses Dokument aendert den aktuellen Fokus nicht.

Der aktuelle Fokus bleibt:

- Firmenloop boringly reliable
- echte sichtbare Runs
- Review- und Merge-Pfade haerten
- reale Glue-Blocker loesen

Die Evolution Lane ist:

- ja, gewollt
- ja, strategisch wichtig
- aber nein, nicht der aktuelle Hauptsprint

## 9. Ein-Satz-North-Star

> DGDH soll nicht nur Aufgaben besser loesen, sondern den Mechanismus verbessern, mit dem DGDH Aufgaben besser loest.
