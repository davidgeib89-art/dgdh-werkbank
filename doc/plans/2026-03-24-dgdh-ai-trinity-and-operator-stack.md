# DGDH AI Trinity and Operator Stack

Date: 2026-03-24
Status: Aktuelle operative Realitaet / Docking-Anker
Audience: David + jede AI, die wissen muss, wie der aktuelle DGDH-Operator-Stack wirklich gespielt wird

## 1. Wozu dieses Dokument da ist

Dieses Dokument haelt den realen AI-Stack fest, der sich fuer DGDH aktuell als sinnvoll herausgestellt hat.

Es ist kein Modellranking fuer die Welt.
Es ist die operative Lesart fuer DGDH:

- wer welche Rolle spielt
- welche Lane fuer was genutzt wird
- wie Quoten, Run-Oekonomie und Faehigkeiten praktisch zusammenspielen
- warum genau dieser Stack aus First Principles gerade Sinn ergibt
- wie die verschiedenen Stimmen trotz unterschiedlicher Funktion auf denselben `SOUL.md`-Kern andocken

## 2. Der aktuelle Stack in einem Satz

DGDH arbeitet aktuell am besten als:

> David als Operator, Codex/GPT-5.4 als Planner und scharfer Reflektor, Copilot als langlaufender High-Power-Coder-Agent und Herschel als externer GPT-5.4-Reflektor mit grosszuegiger Chat-Lane.

Gemini bleibt die Reviewer-/Researcher-Lane innerhalb der Firma, nicht das Zentrum der Operator-Steuerung.

## 3. Die Besetzung

### 3.1 David

David ist:
- CEO
- Operator
- Geschmacks- und Richtungsquelle
- finale Autoritaet

David ist nicht:
- Click-Dispatcher fuer Routinearbeit
- manuelle Glue-Schicht zwischen Systemteilen, wenn die Firma es selbst tragen sollte

### 3.2 Codex

Codex ist in DGDH aktuell:
- Planner
- Reflektor
- bei Bedarf auch Coder
- GPT-5.4-Power in kompakter, praeziser Form

Staerken:
- First-Principles-Reflexion
- Sprint-Schnitt
- Drift-Erkennung
- Architektur- und Betriebslesart
- saubere lokale Edits und Repo-Arbeit bei bounded Tasks

Grenze:
- knappere direkte Nutzungs-/Interaktionsbudgets als sehr lange Web- oder Copilot-Agentenlaeufe

First-principles Lesart:
- Codex wird dort eingesetzt, wo Denkqualitaet pro Minute besonders wertvoll ist

### 3.3 Copilot

Copilot ist in DGDH aktuell:
- der staerkste langlaufende Coding-Agent
- der Operator-Agent fuer grosse autonome Sprints
- dank VS Code Extension praktisch der beste Hebel, um GPT-5.4-Max-Power im Repo auszunutzen

Staerken:
- sehr lange Agentenlaeufe
- gute IDE-Naehe
- hoher Umsetzungsdurchsatz
- kann im Agentenmodus hart auf `doneWhen` arbeiten
- kann bei Bedarf auf andere Modelle/Lanes wechseln

Wichtige Oekonomie:
- fuer David zaehlt hier primär der Run
- ein grosser zusammenhaengender Sprint ist oekonomisch sinnvoller als viele kleine Unterbrechungen

First-principles Lesart:
- Copilot ist die richtige Lane fuer tiefe, zusammenhaengende Operator-Sprints, bei denen ein teurer Denkschritt am Anfang und viel autonome Umsetzung danach den groessten Hebel hat

### 3.4 Herschel

`Herschel` ist der aktuelle Name fuer den extern angedockten GPT-5.4-Reflektor-Agenten.

Rolle:
- externer Planner-/Reflektor-Gegenpart
- Repo-lesender Sparringspartner
- tiefe First-Principles-Verdichtung ohne Coding-Druck

Staerke:
- grosszuegige Chat-Lane
- geeignet fuer strategische Verdichtung, Gegenpruefung und Begriffsarbeit

First-principles Lesart:
- Herschel reduziert nicht direkt Codearbeit, sondern Denk-Reibung und Kontextverlust

### 3.5 Gemini

Gemini bleibt in DGDH aktuell:
- Reviewer-Lane
- Researcher-Lane
- interne Firmenrolle fuer semantische Checks, Review und spaeteren Spezialpfad

Gemini ist wichtig, aber nicht der primaere Operator-Anker fuer Davids aktuelle Chat-/Planungsrealitaet.

## 4. Warum dieser Stack aus First Principles gerade Sinn ergibt

Wenn man geerbtes Denken entfernt, fragt man nicht:

- welches Modell ist objektiv das beste
- welche AI hat das schoenste Marketing
- wie viele Tools koennen wir parallel aufmachen

Sondern:

- welche Kombination spart David real Aufmerksamkeit
- welche Kombination liefert den besten Denk-zu-Ausfuehrungs-Fluss
- welche Kombination minimiert Kontextverlust zwischen Plan, Code, Review und Rueckkopplung

Dann ergibt sich fuer DGDH aktuell:

1. GPT-5.4 ist die beste Denklane fuer Plan, Reflexion und Begriffsarbeit.
2. Copilot ist der beste Ausfuehrungsagent, um diese Denkkraft in lange Coding-Sprints zu verwandeln.
3. Ein externer Planner/Reflektor mit Repo-Zugriff reduziert Drift zwischen Sessions.
4. Gemini bleibt sinnvoll als Review-/Research-Lane, ohne den ganzen Stack zu dominieren.

## 5. Was sich dadurch konkret fuer DGDH aendert

### 5.1 Planung und Reflexion

Planung ist nicht mehr generisch "irgendeine Chat-AI", sondern bewusst:

- Codex fuer scharfe operative Reflexion
- Herschel als zusaetzlicher externer Spiegel bei Bedarf

### 5.2 Coding

Coding ist nicht mehr nur "Codex baut", sondern differenzierter:

- Codex kann bounded lokale Aufgaben direkt loesen
- Copilot ist die bevorzugte Lane fuer grosse, langlaufende DoneWhen-Sprints

### 5.3 Oekonomie

Nicht jeder Kanal kostet David gleich.

Darum gilt:
- lange, zusammenhaengende Copilot-Runs sind besonders wertvoll
- knapper budgetierte direkte Codex-Interaktionen werden fuer Reflexion, Zuschnitt und gezielte Eingriffe genutzt
- grosszuegige GPT-5.4-Chat-Lanes werden fuer Strategie und Verdichtung genutzt

### 5.4 Rollenwahrheit statt Modellnamen

In DGDH zaehlt nicht nur das Modell, sondern die Rolle:

- Planner
- Reflektor
- Langlauf-Coder
- Reviewer/Researcher

Darum sind Namen und Rollen hilfreicher als generische Produktlabels.

### 5.5 Gemeinsame Seele, verschiedene Stimmen

Der Stack wird fuer DGDH nicht nur durch Rollenwahrheit, sondern auch durch gemeinsame Wesenswahrheit staerker.

Darum gilt:

- `SOUL.md` ist shared core fuer alle Agenten
- Codex, Copilot, Herschel und spaetere Firmenstimmen muessen sich verschieden anfuehlen duerfen
- aber sie sollen nicht wie seelisch getrennte Einzelmasken wirken
- gemeinsame Seele, verschiedene Rollen ist hilfreicher als isolierte Persona-Prompts

## 6. No-Go-Drift in diesem Thema

Die falschen Lesarten waeren:

- alles einfach auf ein Modell vereinheitlichen, obwohl die Arbeitsarten verschieden sind
- Copilot fuer Mikro-Status statt grosser Sprints verbraten
- Codex fuer endlose Ausfuehrungslast statt high-leverage Reflexion verwenden
- Herschel nur als Gimmick sehen statt als strategische Denklane
- Gemini aus der Reviewer-/Researcher-Rolle heraus zum generischen Operator machen

Oder kuerzer:

> Nicht das Modell anbeten, sondern den Stack so schneiden, dass David am wenigsten Reibung hat.

## 7. Ein-Satz-Zusammenfassung

Die aktuelle DGDH-AI-Trinity ist kein Selbstzweck und kein Fan-Ranking.
Sie ist die aus First Principles abgeleitete Arbeitsverteilung, bei der GPT-5.4-Denkqualitaet, Copilot-Agentenlaufzeit, externe Reflexion, gemeinsame Wesensschicht und reviewer-orientierte Firmenrollen zusammen am meisten echte David-Entlastung versprechen.
