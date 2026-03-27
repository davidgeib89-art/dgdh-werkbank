# DGDH First Principles and Operating Doctrine

Date: 2026-03-24
Status: Kanonischer Drift-Anker / immer mitdenken
Audience: David + Planer + Coder + Reviewer + jede AI, die ueber `INIT.md` oder `REINIT.md` andockt

## 1. Wozu dieses Dokument da ist

Dieses Dokument verdichtet die juengsten strategischen Reflexionen in eine belastbare Arbeitslesart.

Es ersetzt nicht:
- `CURRENT.md` als Live Baton
- `MEMORY.md` als Stable-Facts-Karte
- den North Star als groessere Richtung

Es praezisiert, wie diese Dokumente gelesen werden sollen, damit kuenftige Sessions nicht wieder in geerbtes Denken oder unnoetige Meta-Sprints kippen.

Companion deep dive fuer Memory, Lernen und spaetere Selbstverbesserung:
- `doc/plans/2026-03-24-dgdh-memory-learning-self-improvement-first-principles.md`

Companion deep dive fuer die naechste groessere Firmenstufe:
- `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md`

## 2. Geerbte Annahmen, die wir bewusst entfernen

Diese Annahmen tauchen schnell wieder auf, sind fuer die aktuelle Phase aber nicht fundamental wahr:

1. Mehr parallele Agenten bedeuten automatisch mehr Firmenfaehigkeit.
2. Erst komplett Infrastruktur bauen, dann mit echten Runs anfangen.
3. Revenue ist in dieser Phase der eigentliche Beweis fuer Funktion.
4. Mehr Modelle oder Provider bedeuten automatisch mehr Faehigkeit.
5. Autonomie bedeutet: die Maschine arbeitet ohne David.
6. Ein guter Worker-Prompt allein entscheidet ueber gute oder schlechte Runs.
7. Review ist nur ein Qualitaets-Gate, sonst nichts.
8. Wenn ein echter Run weh tut, sollten wir zuerst mehrere Testlaeufe vorschalten.
9. Bedienwissen, Workflow-Policy und Recovery koennen einfach in Prompts verschwinden.

## 3. Was fundamental, beweisbar wahr bleibt

Wenn man die geerbten Annahmen entfernt, bleiben fuer DGDH diese belastbaren Wahrheiten:

1. David ist das einzige wirklich knappe Gut.
   Alles, was David-Minuten kostet ohne echte Entscheidung zu erfordern, ist Systemverlust.

2. DGDH ist eine governte David-Aufmerksamkeits-Kompressionsmaschine.
   Die Firma nimmt Richtung von David auf und verwandelt sie mit minimalen David-Beruehrpunkten in reale, reviewte, gemergte Arbeit.

3. Die Firmenkette ist nicht mehr nur Theorie.
   `Mission -> CEO -> Worker -> Reviewer -> Merge -> Summary` ist real bewiesen.

4. System-Identitaet und Zustandsfuehrung sind haerter als Modell-Magie.
   Wenn Home, Instance, Workspace oder DB-Identitaet schief sind, hilft keine Prompt-Brillanz.

5. Jeder Handoff ist eine Verlustquelle.
   Darum muessen Handoffs klein, strukturiert und kanonisch sein.

6. Review ist Gate und Sensor zugleich.
   Review schuetzt Qualitaet und liefert zugleich Daten ueber Drift, Prompt-Qualitaet und Systemverstaendnis.

7. Ein echter Lauf ist gleichzeitig Wertproduktion und Infrastrukturtest.
   Ein Lauf beweist, dass es geht. Wiederholte echte Laeufe beweisen, dass es traegt.

8. Revenue ist in dieser Phase ein Lagging Indicator.
   Capability, Zustandsfuehrung, Handoffs und Review-Wahrheit muessen zuerst tragen.

## 4. Die kanonische DGDH-These

DGDH ist eine governte David-Aufmerksamkeits-Kompressionsmaschine.
Sie nimmt Richtung von David auf und verwandelt sie mit minimalen David-Beruehrpunkten in reale, reviewte, gemergte Arbeit.
David ist das einzige wirklich knappe Gut; alles ohne echte Entscheidungsnotwendigkeit muss aus seiner Aufmerksamkeit herauskomprimiert werden.
Nicht bessere Prompts allein skalieren DGDH, sondern bessere Zustandsfuehrung, bessere Handoffs und bessere Rollenlogik.
Invarianten gehoeren in Produktcode, Rollenverhalten in Role Templates, Spezialprozeduren spaeter in Skills.
Review ist Gate und Sensor zugleich: Es schuetzt Qualitaet und erzeugt Lernsignale ueber Systemdrift.
Ein Lauf beweist, dass es geht; wiederholte Laeufe beweisen, dass es traegt.

## 4.1 Doktrin-Update 2026-03-27

Die bisherige Lesart war fuer Delivery stark, aber fuer die naechste Firmenstufe noch zu eng.

Ab jetzt gilt zusaetzlich:

> DGDH soll nicht nur Arbeit aus Davids Aufmerksamkeit herauskomprimieren.
> DGDH soll in governten Missionsraeumen auch die eigene Faehigkeit selbst steigern.

Das bedeutet:
- neben `delivery mode` gibt es kuenftig `mission autonomy mode`
- nicht freie Selbstmutation, sondern Mission Cells mit Metrik, Budget, Blast Radius und Promotion-Gate
- David bleibt fuer die echten Type-1-Entscheidungen zustaendig, nicht fuer jede reversible Type-2-Verbesserung

## 5. Was sich operativ dadurch aendert

### 5.1 Der primaere Messwert

Der relevante Benchmark ist in dieser Phase nicht Umsatz, nicht Tokenverbrauch und nicht eine schoene Architekturfolie.

Der relevante Benchmark ist:

> Wie viele David-Minuten hat dieser Firmenlauf gekostet?

Hilfsmetriken bleiben nuetzlich, aber sie sind dem untergeordnet:
- System-Zuverlaessigkeit
- Review-Qualitaet
- Merge-Hygiene
- Quota-Effizienz

## 5.2 Die Prioritaetenfolge fuer die aktuelle Phase

Wenn ein Sprint oder eine Idee unklar ist, gilt diese Reihenfolge:

1. kanonischer Zustand / eindeutige Firmenidentitaet
2. CEO-Qualitaet
3. Handoff-Qualitaet
4. Review-Wahrheit
5. Merge-Zuverlaessigkeit
6. Quota- und Routing-Effizienz

## 5.3 Reale Runs schlagen Test-Theater

Die Firma lernt bevorzugt in echten, bounded Firmenlaeufen.

Darum gilt:
- reale Runs sind Prototyping-Schleifen, nicht nur spaete Beweistests
- wenn ein echter Run einen engen Glue-Bug sichtbar macht, wird er im Sprint on the fly gefixt
- wir brauchen nicht drei kuenstliche Testfirmenlaeufe, wenn ein echter Lauf den naechsten Hebel schon offenlegt
- Freestyle ist erlaubt, solange er den laufenden Firmenkern stabilisiert und im Bericht transparent gemacht wird

## 5.4 GitHub- und Merge-Arbeit ist kein Seitenthema

PR-Erstellung, Reviewer-Handoff, Merge-Hygiene, Branch-Cleanup und Worktree-Isolation sind nicht "nur Git".
Sie sind Teil der eigentlichen Firmenmaschine.

Wenn dort Reibung entsteht, ist das Kernarbeit und kein unproduktiver Nebenkriegsschauplatz.

## 5.5 Keine Meta-Umbauten waehrend operative Blocker aktiv sind

Wenn die Firma gerade an canonical state, Merge, Review oder Runtime-Identity haengt, ist jetzt nicht die Zeit fuer:
- Skill-System-Rebuild
- Prompt-Architekturfilm
- Provider-Sammlung
- Parallelisierungsromantik
- Test-Marathons ohne echten Firmenlauf

Erst wenn der operative Kern wieder traegt, duerfen hoehere Schichten wieder nach vorne.

## 6. Wo welche Wahrheit hingehoert

Damit Wissen nicht wieder diffus in Prompts und implizite Gewohnheiten zerfaellt, gilt diese Verteilung:

| Wahrheit | Kanonischer Ort | Beispiele |
| --- | --- | --- |
| Workflow-Invarianten und Zustandswahrheit | Produktcode | Run-Control, Merge-Guardrails, Workspace-/Identity-Regeln, API-Gates |
| Rollenverhalten und Urteilsmuster | Role Templates | CEO-, Worker-, Reviewer-Haltung; strukturierte Handoffs; Review-Anweisungen |
| Schmale wiederkehrende Spezialprozeduren | Skills (spaeter, nur wenn der Bedarf real ist) | klar eingegrenzte Create-Agent-, Release- oder Research-Prozeduren |
| Bedienwissen und Recovery | Operator-Runbook | wie man die Maschine startet, beobachtet, verifiziert und korrekt andockt |
| Live Fokus und akuter Blocker | `CURRENT.md` | aktiver Sprint, naechster Schritt, harte Restblocker |
| Stabile Facts und Architekturentscheide | `MEMORY.md` | bewiesene Pfade, Guardrails, kanonische Regeln |

## 7. Rollenfolgen aus dieser Doktrin

### 7.1 Planer

Der Planer optimiert nicht fuer Aktivitaet, sondern fuer reale David-Entlastung.

Das bedeutet:
- Sprints gross und bounded schneiden
- Drift gegen North Star und aktuelle Phase stoppen
- Freestyle-Fixes nach einem echten Run kontrollieren, nicht vorher verbieten
- nur bei echten Richtungs- oder Risikofragen bremsen

### 7.2 Coder

Der Coder arbeitet in grossen, doneWhen-orientierten Operator-Sprints.

Das bedeutet:
- echte Runs aktiv fahren
- normale Glue-Blocker selbst loesen
- neue reale Schwachstellen im laufenden Sprint fixen, wenn sie im Scope liegen
- erst mit Ergebnis oder hartem Stopper zurueckkommen
- on-the-fly-Fixes am Ende transparent berichten

### 7.3 Reviewer

Der Reviewer prueft gegen `doneWhen`, aber lernt zugleich fuer die Firma.

Das bedeutet:
- kein Praeferenz-Review
- keine romantische Acceptance
- `needs_revision` als Lernsignal fuer Packet, Handoff, Prompt oder System, nicht nur fuer "Worker war schlecht"

## 8. Was wir gerade bewusst nicht tun

Die folgenden Dinge koennen spaeter richtig sein, sind aber fuer die aktuelle Phase nicht der naechste Hebel:

- Skill-Creation-Engine als Meta-Sprint
- gross angelegter Prompt-/Role-Template-Umbau ohne aktuellen Schmerz
- neue Provider nur weil sie spannend sind
- mehr gleichzeitige Agenten als Komplexitaets-Imitation
- Revenue-Druck als Ersatz fuer echte Firmenfaehigkeit
- Vorab-Perfektion statt realer Firmenlaeufe

## 9. Konsequenz fuer die aktuelle Phase

Die aktuelle Kernaufgabe lautet nicht:
"noch eine neue Schicht erfinden".

Sie lautet:
- kanonischen Zustand sauber halten
- den naechsten echten Firmenlauf von canonical main aus durchziehen
- reale Glue-Bugs on the fly fixen
- daraus stabile Learnings in Produktcode, Templates, Runbook und Baton zurueckfuehren

Der operative Nordsternsatz dafuer ist:

> Wir bauen nicht die perfekte Maschine auf dem Papier. Wir ziehen den naechsten echten Firmenlauf durch und machen die Maschine dabei besser.
