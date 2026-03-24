# DGDH Working Triad

Status: aktiv
Date: 2026-03-23
Updated: 2026-03-24
Purpose: Kurze visuelle Referenz dafuer, wie David und die aktuelle AI-Trinity praktisch zusammenspielen.

## Kurzform

David fuehrt.  
Codex schneidet und reflektiert.  
Copilot zieht grosse Sprints durch.  
Herschel spiegelt auf First Principles.

## Warum diese Form aktuell Sinn ergibt

Aus First Principles zaehlt nicht, welche AI "cool" ist, sondern:

- welche Lane David am meisten Aufmerksamkeit spart
- welche Lane am besten fuer tiefe Reflexion taugt
- welche Lane am besten fuer lange Coding-Sprints taugt
- welche Lane den wenigsten Kontextverlust zwischen Planung und Umsetzung erzeugt

Darum ist die aktuelle Lesart:

- **David** = Operator / CEO / Geschmack / Finale Richtung
- **Codex** = GPT-5.4 Planner + Reflektor + bei Bedarf bounded Coder
- **Copilot** = langlaufender High-Power-Coder-Agent fuer grosse DoneWhen-Sprints
- **Herschel** = externer GPT-5.4-Reflektor mit Repo-Zugriff fuer Gegenpruefung und Verdichtung

Gemini bleibt zusaetzlich die Reviewer-/Researcher-Lane innerhalb der Firmenlogik.

## Visuell

```text
        [ David ]
 CEO / Operator / Vision / Entscheider
               |
               v
        [ Codex / GPT-5.4 ]
 Planner / Sprint-Schnitt / Reflexion
               |
               v
          [ Copilot ]
  grosser Agenten-Coder / lange Sprints
               |
               v
     Status / Evidenz / Resultat / Diff
               |
               v
 [ Codex ] <-> [ Herschel / GPT-5.4 ]
 Reflexion         externer Spiegel
               |
               v
            [ David ]
      finale Richtung / naechster Zug
```

## Rollen

### David
- CEO und Operator
- gibt Richtung, Prioritaet und Geschmack
- trifft finale Entscheidungen

### Codex
- Haupt-Planer und Haupt-Reflektor
- denkt in First Principles
- schneidet grosse bounded Sprints
- kann bei Bedarf auch selbst lokal bauen

### Copilot
- Haupt-Coder fuer lange Agentenruns
- nutzt IDE-Naehe und starke Agentik
- soll moeglichst in grossen zusammenhaengenden Sprints arbeiten, nicht in Mikro-Unterbrechungen

### Herschel
- externer Planner-/Reflektor-Agent
- liest das Repo
- dient als zusaetzlicher Spiegel fuer First-Principles-Verdichtung und Gegencheck

## Arbeitsregel

- Vision bleibt lebendig
- naechster Schritt bleibt bounded
- nicht das Modell ist heilig, sondern die Rolle im Stack
- alle Stimmen docken an denselben `SOUL.md`-Kern an, statt seelisch zu zerfallen
- Copilot bekommt grosse Sprints, weil das oekonomisch und agentisch am meisten Hebel hat
- Codex konzentriert sich auf Reflexion, Zuschnitt, Drift-Schutz und gezielte Eingriffe
- Herschel wird fuer tiefere Gegenreflexion genutzt, nicht fuer Dauer-Mikroplanung
- keine AI ersetzt David als CEO
