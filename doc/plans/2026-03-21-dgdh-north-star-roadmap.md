# DGDH North Star Roadmap

Date: 2026-03-21
Status: Aktuelle Leitlinie / immer lesen
Audience: David + jede AI, die in diesem Repo arbeitet

## 1. Wozu dieses Dokument da ist

Dieses Dokument ist der aktuelle North Star fuer DGDH.

Es beschreibt:

- wie die Firma mit AI-Agents arbeiten soll
- wie Paperclip dafuer umgebaut und vereinfacht werden soll
- welche Reihenfolge beim Ausbau gilt
- welche Dinge explizit **noch nicht** gebaut werden sollen

Wenn andere Dokumente aeltere Richtungen enthalten, gilt fuer die aktuelle Ausbaustufe:

> Dieses Dokument gewinnt fuer die operative Richtung.

## 2. Der Kern des Zielbilds

DGDH ist keine "autonome AI-Firma ohne Menschen".

DGDH ist eine **Mensch-Maschine-Symbiose-Firma**:

- David bleibt der menschliche CEO, Auftraggeber und finale Entscheider.
- AI-Agents sollen echte Arbeit leisten, aber innerhalb klarer Governance.
- Paperclip ist nicht die Vision, sondern das Betriebssystem dafuer.

Die Leitfrage bleibt:

> Entlastet das David real oder verschoenert es nur die Maschine?

## 3. Das Zielbild fuer die naechste echte Stufe

Die richtige Form fuer DGDH ist kurzfristig nicht:

- ein generischer Agent-Loop
- oder viele gleichgestellte Agents ohne klare Rollen

Die richtige Form ist:

1. `David`
   - menschlicher CEO
   - gibt Missionen und Freigaben
   - bleibt finale Autoritaet

2. `AI CEO / Mission Manager`
   - plant
   - zerlegt Auftraege in Work Packets
   - delegiert
   - sammelt Review-Ergebnisse ein
   - entscheidet ueber den naechsten Schritt

3. `Worker Agents`
   - fuehren klar abgegrenzte Pakete aus
   - schreiben Artefakte, Code, Inhalte, Rechercheergebnisse

4. `Reviewer Agents`
   - pruefen, ob das Ziel wirklich erreicht wurde
   - kontrollieren Qualitaet, Korrektheit, Abnahmefaehigkeit
   - liefern ein strukturiertes Urteil an den AI CEO

Das Ziel ist also:

> Mission -> Work Packets -> Worker -> Review -> CEO-Entscheidung -> naechster Schritt

## 4. Heartbeats: Was sie bei DGDH sein sollen

Ein Heartbeat soll bei DGDH **nicht** bedeuten:

- Agent wacht auf und sucht sich selbst Arbeit
- Agent scannt breit durchs Repo
- Agent macht ohne klaren Packet-Kontext irgendetwas

Ein Heartbeat soll bei DGDH bedeuten:

- genau ein bereits autorisiertes Work Packet ausfuehren oder fortsetzen
- auf ein klares Event reagieren
- im Idle-Fall hoechstens minimalen Status liefern

Die richtige Definition ist:

> Heartbeat = Ausfuehrungspuls fuer ein autorisiertes Work Packet, nicht Autonomie-Loop

Wichtig fuer die Governance-Interpretation:

- ein Heartbeat ist **nicht** der Moment, in dem David fuer jedes kleine Packet erneut gefragt wird
- kleine, klar begrenzte, normale Work-Packet-Runs sollen standardmaessig einfach laufen
- David soll nur bei echten Grenzfaellen bewusst eingebunden werden

Das Gegenbild waere:

- Mikro-Approvals fuer kleine bounded Tasks
- Operator klickt sich durch Routine-Ausfuehrung
- die AI delegiert nicht wirklich, sondern reicht Kleinstentscheidungen nach oben durch

Das widerspricht dem DGDH-Zielbild. David ist CEO, nicht Klick-Dispatcher fuer Routinearbeit.

## 5. Work Packets statt generischer Tickets

Paperclip hat schon gute Bausteine:

- Issues
- single assignee
- atomic checkout
- execution locks
- approvals
- routing

Aber die Intelligenz liegt heute noch zu sehr im Run und zu wenig in der Arbeitsstruktur.

Darum soll die Richtung sein:

- Heartbeats dummer machen (reiner Ausfuehrungspuls, keine eigene Intelligenz)
- Engine Thinking Layer smarter machen (Modellwahl, Kontext-Selektion, Governance)
- Work Packets smarter machen (klarere Scope/Done-Kriterien/Dependencies)
- den CEO-Agent smarter machen (Packet-Zerlegung, Review-Auswertung, naechster Schritt)

Das bedeutet:

- jede echte Arbeit braucht einen klaren Packet-Rahmen
- jedes Packet braucht Scope, Ziel, Done-Kriterium, Budget, Review-Bedarf
- spaeter muessen parent/child Packet-Beziehungen sauber modelliert werden

Fuer die operative Default-Richtung gilt:

- ein sauber begrenztes Packet soll standardmaessig ohne manuelles Approval laufen
- Approval darf nicht der Default fuer normale bounded Implementation-, Research- oder Review-Pakete sein
- wenn ein Packet klar, klein und innerhalb des erwarteten Arbeitsrahmens ist, soll die AI selbst ausfuehren

## 6. Ausbaustufe 1: Nur Gemini

Kurzfristig gilt bewusst:

- wir bauen **erst nur fuer Gemini**
- weil Gemini-Quotas aktuell am attraktivsten sind
- weil zwei Google AI Pro Accounts verfuegbar sind
- weil sich die Quotas alle 24h resetten

Das ist **kein** Widerspruch zum spaeteren Multi-Provider-Ziel.
Es ist die richtige Reihenfolge.

### Rollen in Stufe 1

In Ausbaustufe 1 sind alle produktiven Agenten Gemini-abgestimmt:

- `gemini-ceo`
- `gemini-worker`
- `gemini-reviewer`

Empfohlene Verteilung:

- CEO/Planung: eher `Gemini Pro`
- Worker: standardmaessig guenstiger und schneller, nur bei Bedarf teurer
- Review: je nach Stakes guenstig oder stark

## 7. Zwei getrennte Ebenen: Engine Layer vs Agent Layer

Es gibt zwei fundamental verschiedene Ebenen, die nicht verwechselt werden duerfen:

### Engine Thinking Layer (Infrastruktur)

Die Engine ist **Infrastruktur die vor und um jeden Agent-Run herum laeuft**.
Sie macht den Run smart, aber sie IST NICHT der Agent.

Die Engine bekommt: Task-Prompt, Quota-Zustand, Shared Memory, Agent-Config.
Die Engine entscheidet: welches Modell, welches Budget, welcher Kontext, welches Risk-Level.
Die Engine injiziert: doneWhen, executionIntent, targetFolder, Memory-Slices in den Run.

Jeder Agent-Run — egal ob CEO, Worker oder Reviewer — geht durch diese Engine.

### Agent Layer (Rollen)

CEO, Worker und Reviewer sind **Agent-Rollen mit eigenen Prompts und Configs**.
Sie planen, fuehren aus und reviewen. Die Intelligenz dieser Rollen kommt aus ihrem Prompt,
ihrem Kontext und dem Modell das die Engine fuer sie gewaehlt hat.

Der CEO-Agent zerlegt Missionen in Work Packets. Das ist Agent-Arbeit, nicht Engine-Arbeit.
Der Worker-Agent fuehrt ein Packet aus. Die Engine hat vorher entschieden mit welchem Modell.
Der Reviewer-Agent prueft das Ergebnis. Die Engine hat vorher entschieden wie stark das Modell sein muss.

### Warum die Trennung wichtig ist

Wenn AIs den Engine Core lesen und dort "Work Packet Zerlegung" oder "plant vs implementiert"
sehen, bauen sie das in die Engine-Infrastruktur ein statt als Agent-Rolle.
Das fuehrt zu Over-Engineering der Engine und Unterentwicklung der Agent-Rollen.

Die klare Regel ist:

> Die Engine denkt ueber den Run nach. Der Agent denkt ueber die Aufgabe nach.

### Smart Engine Core statt Provider-Sonderwelten

Langfristig soll es **nicht** drei komplett getrennte Engines geben.

Es soll geben:

- einen gemeinsamen `Smart Engine Core` (die Thinking Layer)
- plus provider-spezifische Module fuer:
  - Quota-Erfassung
  - Modellkatalog
  - Provider-Limits
  - Adapter-spezifische Ausfuehrungsdetails

Das heisst: `Gemini Engine`, `Claude Engine`, `Codex Engine` sollen **denselben Kern** teilen.

Nur diese Schicht soll unterschiedlich sein:

- Quota-API / Quota-Zustaende
- Modellnamen
- Cooldown-/Rate-Limit-Semantik
- provider-spezifische Adapter-Anbindung

## 8. Was in welche Ebene gehoert

### 8.1 Engine Thinking Layer (Infrastruktur — laeuft vor jedem Run)

1. `Task Understanding`
   - analysiert den Task-Prompt
   - erkennt Task-Typ, Risiko, benoetigte Inputs
   - erkennt Ambiguitaet und fehlende Informationen

2. `Budget & Quota Layer`
   - waehlt Budget-Klasse (small/medium/large) als Orientierung
   - prueft Quota-Zustand aller verfuegbaren Modelle
   - Google-Quota ist der echte Hard Cap, nicht die Engine

3. `Provider Routing Layer`
   - waehlt das optimale Modell fuer diesen Run
   - mappt Task-Bedarf auf verfuegbare Modell-Lanes und Quotas
   - waehlt das billigste Modell das die Aufgabe gut genug loesen kann

4. `Context Injection Layer`
   - injiziert doneWhen, executionIntent, targetFolder in den Agent-Prompt
   - holt den kleinsten sinnvollen Memory-Slice
   - packt Governance-Constraints in den Kontext

5. `Governance Gates`
   - blockiert Runs bei fehlenden Inputs oder zu hohem Risiko
   - erzwingt Approval bei High-Risk-Operationen
   - deterministisch, kein LLM noetig

### 8.2 Agent-Rollen (CEO, Worker, Reviewer — sind KEINE Engine-Komponenten)

Diese Aufgaben gehoeren in die **Agent-Rollen**, nicht in die Engine:

- `Missionen in Work Packets zerlegen` → CEO-Agent
- `Entscheiden ob plan/implement/review` → CEO-Agent
- `Parallelisierung planen` → CEO-Agent
- `Review-Ergebnisse einsammeln und bewerten` → CEO-Agent
- `Klar abgegrenzte Pakete ausfuehren` → Worker-Agent
- `Ergebnis gegen Done-Kriterium pruefen` → Reviewer-Agent

Die Engine stellt sicher dass jeder Agent-Run mit dem richtigen Modell,
dem richtigen Kontext und den richtigen Guardrails laeuft.
Was der Agent dann TUT ist seine Sache — gesteuert durch seine Rolle und seinen Prompt.

## 9. Engine Thinking Layer: Nicht dogmatisch billig, sondern smart

Die Engine Thinking Layer ist die erste Denkebene bevor ein Agent-Run startet.

Aktueller Stand: Flash (nicht Flash-Lite) als Thinking-Modell.
Der Quota-Verbrauch dieser Ebene ist vernachlaessigbar (~1000 Tokens pro Routing-Call vs 5000-50000+ im eigentlichen Run).

Die richtige Meta-Policy fuer die Thinking Layer ist:

1. `Deterministische Guardrails zuerst`
   - fehlende Pflichtinputs, verbotene Zielbereiche, High-Risk-Mutationen
   - kein LLM noetig, rein regelbasiert

2. `Thinking Layer fuer alles was Kontext-Verstaendnis braucht`
   - Modellwahl, Budget-Einschaetzung, Skill-Selektion
   - Memory-Slice-Auswahl, Context-Zusammenstellung
   - Confidence-Assessment: ist genug Kontext da fuer einen guten Run?

3. `Staerkeres Thinking-Modell wenn die Entscheidung teuer ist`
   - wenn die Engine-Entscheidung selbst grossen Downstream-Schaden ausloesen kann
   - spaeter koennte die Engine selbst entscheiden ob sie Flash oder Pro fuer ihre eigene Analyse braucht

Wichtig: Die Thinking Layer entscheidet **ueber den Run**, nicht ueber die Aufgabe.
Ob plan/implement/review angesagt ist, entscheidet der CEO-Agent. Die Engine sorgt nur dafuer
dass der CEO-Agent das richtige Modell und den richtigen Kontext bekommt.

Wichtig ist auch, was diese Ebene **nicht** tun soll:

- keine Mikro-Governance fuer normale Kleinaufgaben
- kein staendiges Nachfragen bei bounded Tasks mit niedrigem Risiko
- keine Uebersetzung von "implementiere eine kleine klar definierte Sache" in Operator-Buerokratie

Die spaetere richtige Governance-Richtung ist stattdessen:

- ein eigener Reflexions-/Governance-Layer fuer wirklich kritische Faelle
- nur eskalieren bei gefaehrlichen Mutationen, Scope-Explosion, unklaren Inputs, sehr grossen Kosten oder sonstigen Ausnahmesituationen
- Governance soll David vor Schaden schuetzen, nicht ihn in Routinearbeit hineinziehen

## 10. Shared Memory: Nicht mehr, sondern besser

Im Repo existiert bereits eine rudimentaere Memory-/Reflection-Basis:

- `server/src/services/memory.ts`
- `server/src/services/reflection.ts`
- `server/src/services/governance.ts`

Das ist brauchbarer Rohbau, aber noch **nicht** das Shared Memory, das DGDH spaeter braucht.

Die Zukunft darf nicht sein:

- alle Agents lesen alles
- riesige Context-Dumps
- chatartiger Memory-Brei

Die Zukunft soll sein:

- kleine, governed, querybare Handoffs

Das Zielbild fuer Shared Memory ist:

- `mission memory`
- `packet memory`
- `project/customer memory`
- `review memory`
- `agent-local working memory`
- `company policy memory`

Und die wichtigste Regel ist:

> retrieve the smallest useful memory slice, not the broadest possible history

*(Wichtiger Trigger für die Zukunft: Sobald Multi-Agent-Koordination startet oder DGDH-Infrastruktur-Code umgebaut wird, müssen wir auf einen getypten "Knowledge Graph" mit Blast-Radius-Analyse umsteigen. Siehe dazu: `company-hq/research/2026-03-21-knowledge-graph-memory-pattern.md`)*

### Handoff-Memory statt Brain-Soup

Die richtige Form fuer CEO/Worker/Reviewer ist:

- CEO schreibt Mission Summary
- Worker liest nur Mission + Packet + Zielprojekt-Slice
- Worker schreibt Completion Evidence
- Reviewer liest Mission + Packet + Worker Evidence
- CEO liest Reviewer Verdict + Mission State

Das ist die spaetere smarte Shared-Memory-Richtung.

### Strukturierte Handoff-Summaries (Inspiration: ReMe)

Damit Handoffs zwischen Rollen maschinell auswertbar sind, sollen Worker, Reviewer und CEO
ihre Ergebnisse in einem festen Schema liefern:

```
## Goal        — was sollte erreicht werden (= doneWhen)
## Result      — was wurde tatsaechlich gemacht
## Files Changed — welche Dateien, was geaendert
## Blockers    — was hat nicht funktioniert oder fehlt
## Next        — was sollte als naechstes passieren
```

Umsetzungsreihenfolge:

1. Zuerst rein als Prompt-Anweisung in den Role-Templates (zero code)
2. Spaeter optional als parsed/structured Output den der CEO maschinell lesen kann
3. Noch spaeter inkrementelle Summaries: neuer Run merged in bestehendes Summary statt Neuschreiben

Inspiration: `github.com/agentscope-ai/ReMe` — deren Summary-Schema (Goal, Constraints, Progress,
Key Decisions, Next Steps, Critical Context) ist ein gutes Referenzformat. Fuer DGDH angepasst
auf den Worker/Reviewer/CEO-Handoff-Kontext.

Wichtig: Das ersetzt nicht die spaetere querybare Shared-Memory-Architektur.
Es ist der einfachste erste Schritt der sofort die Handoff-Qualitaet verbessert.

### Patterns aus PentAGI (Inspiration: github.com/vxcontrol/pentagi)

PentAGI ist ein Multi-Agent-Pentesting-System. Anderer Use Case, aber die Orchestrierungs-Patterns
sind direkt uebertragbar auf DGDH's CEO/Worker/Reviewer-Modell.

**1. Loop-Detection im Adapter**

Problem: Gemini wiederholt fehlgeschlagene Commands (z.B. PowerShell-`&&`) und verbrennt Tokens.
PentAGI loest das mit einem Adviser-Agent der identische Tool-Calls erkennt (Schwelle: 5x).
DGDH-Ansatz: deterministische Regel im Gemini-Adapter — kein separater Agent noetig.
Wenn derselbe Command 3x fehlschlaegt, Warnung injizieren oder Run stoppen.

Umsetzung: im PowerShell-Fix mitbauen, profitiert jede Rolle sofort.

**2. Barrier-Tool fuer strukturiertes Run-Ende (`complete_task`)**

Problem: Worker/Reviewer hoeren einfach auf. Kein explizites "ich bin fertig"-Signal.
PentAGI loest das mit Barrier Functions (`FinalyTool`, `CodeResult`, `HackResult`).
DGDH-Ansatz: `complete_task`-Tool das der Agent am Ende aufrufen MUSS.
Das Tool erzwingt das strukturierte Handoff-Summary (Goal/Result/Files/Blockers/Next).

Verbindet zwei Patterns: Barrier (PentAGI) + Handoff-Summary (ReMe).
Umsetzung: nach CEO V1, als Verbindungsstueck zwischen Worker und Reviewer.

**3. Token-Budgets pro Rolle**

PentAGI gibt verschiedenen Agents verschiedene Token-Limits:
Generator (Opus) 4096, Coder (Sonnet) 2048, Searcher 1024.
DGDH-Ansatz: In Role-Templates als optionales Feld (`maxOutputTokens`):
- CEO: hoeher (plant, braucht Kontext)
- Worker: mittel (fuehrt aus)
- Reviewer: klein (prueft, braucht wenig Output)

Umsetzung: Feld in Role-Template-Schema ergaenzen, Engine liest es beim Routing.

**4. Generator + Refiner Zweistufen-Pattern (spaeter)**

PentAGI zerlegt Tasks in zwei Schritten: erst grob (Generator), dann verfeinert (Refiner).
DGDH-Ansatz fuer spaeter: CEO zerlegt Mission in Packets (Schritt 1).
Zweiter Pass reichert jedes Packet mit Projekt-Kontext an: targetFolder pruefen,
Dateien lesen, doneWhen schaerfen (Schritt 2).

Umsetzung: erst wenn CEO V1 bewiesen ist.

**5. Chain Summarization fuer lange Runs (spaeter)**

PentAGI komprimiert aeltere Messages, behaelt nur die letzten N Bytes intakt.
DGDH-Ansatz: relevant wenn CEO ueber mehrere Packets hinweg plant und
Kontext aus frueheren Reviews braucht. Aeltere Packet-Ergebnisse komprimieren,
aktuelle behalten.

Umsetzung: erst wenn Runs laenger werden als ein einzelnes Packet.

### Patterns aus Spec-Kit (Inspiration: github.com/github/spec-kit)

GitHub's Spec-Kit (72k+ Stars) formalisiert genau das Pattern das DGDH als
CEO → Worker → Reviewer baut:

```
Spec-Kit:  Specify → Plan    → Tasks   → Implement
DGDH:     Mission → CEO     → Packets → Worker → Review
```

Das validiert unsere Architektur-Richtung. Konkret uebertragbar:

**1. Strukturiertes Packet-Template fuer CEO-Output (sofort in CEO V1)**

CEO soll Work Packets nicht frei formulieren sondern in festem Format:

```
## Titel
## Ziel — was soll am Ende existieren
## Scope — was genau geaendert/erstellt wird
## doneWhen — messbare Abnahmekriterien
## targetFolder — wo im Repo
## Annahmen — was der CEO angenommen hat
## [NEEDS INPUT] — was unklar ist und David entscheiden muss
```

Der `[NEEDS INPUT]`-Marker (Spec-Kit: `[NEEDS CLARIFICATION]`) ist zentral:
statt bei Unklarheit zu raten, markiert der CEO explizit was er nicht weiss.
David sieht im Dashboard sofort welche Packets Klaerung brauchen.

Gehoert direkt in den `ceo.json` systemPrompt.

**2. Constitution-Check im CEO-Prompt (sofort in CEO V1)**

Spec-Kit hat eine `constitution.md` mit unverhaenderbaren Prinzipien die bei
jedem Schritt gecheckt werden. DGDH hat North Star + Leitfrage + NO-GOs,
aber verstreut und nicht im CEO-Prompt.

Kompakter Pruefblock direkt im CEO-Template:

- Entlastet das David real? Wenn nein → nicht erstellen
- Ist der Scope klar genug fuer einen Worker? Wenn nein → `[NEEDS INPUT]`
- Passt es ins Budget (kleine bounded Tasks)? Wenn nein → kleiner schneiden
- Braucht es Review? → defaultNeedsReview setzen

Kein separates File — rein als Prompt-Anweisung im CEO-Template.

**3. Traceability: Packet → Run → Evidence → Verdict (nach CEO V1)**

Spec-Kit verbindet jede Anforderung bidirektional mit Implementation und Tests.
DGDH-Ansatz: CEO-Packet hat doneWhen, Worker referenziert via Issue,
Reviewer prueft gegen doneWhen. Fehlt noch: CEO liest nach Review ob Packet
wirklich erledigt ist und entscheidet naechsten Schritt.

Das ist der spaetere CEO-Loop ueber `parentIssueId` + Child-Issue-Verdicts.

**4. Feature-Branch pro Work Packet (spaeter)**

Spec-Kit erstellt pro Feature einen Branch. DGDH-Ansatz: jedes CEO-Packet
koennte einen eigenen Branch bekommen. Worker arbeitet auf Branch,
Reviewer prueft Branch, Merge bei accepted. Erst relevant wenn mehrere
Packets parallel laufen.

### Patterns aus Karpathy autoresearch (Inspiration: github.com/karpathy/autoresearch)

Ein autonomer Forschungsagent der nachts in einem Endlosloop Code schreibt, trainiert und bewertet.
Anderer Use Case (Neural Architecture Search), aber drei Patterns sind direkt uebertragbar.

**1. Simplicity Criterion im Reviewer-Prompt (sofort)**

Karpathy's `program.md` enthaelt einen Satz der direkt Davids Leitfrage spiegelt:
> "Simplicity criterion: All else being equal, simpler is better. A small improvement that adds ugly
> complexity is not worth it. An improvement of ~0 but much simpler code? Keep."

DGDH-Ansatz: Dieses Kriterium gehoert als explizite Pre-Accept-Rule in `reviewer.json`:
Wenn der Worker signifikante Komplexitaet fuer minimalen Gewinn hinzugefuegt hat → `needs_revision`.
Nicht als neue Dimension der Review-Matrix, sondern als Erweiterung der Pre-Accept-Rules.

Umsetzung: naechstes kleines Template-Edit in reviewer.json, zusammen mit dem naechsten Packet.

**2. Single File Modification + Fixed Constraints (bestaetigt, kein neues Packet)**

Karpathy zwingt den Agenten: nur `train.py` anfassen, `prepare.py` ist read-only, hartes Zeitlimit.
Das bestaetigt unseren `targetFolder`/`targetFiles`-Ansatz in Work Packets.

Ergaenzung fuer Worker-Prompt: "Wenn das Problem ausserhalb deines Scope liegt, brich ab und melde
Blocked — umbau das halbe Repo nicht."

Diese Regel ist bereits implizit im worker.json — kein eigenes Packet, nur Verstaerkung beim naechsten
Template-Update.

**3. Git Reset Rollback-Loop (Phase 5 — nicht jetzt)**

Karpathy nutzt Git als State-Machine: Code aendern → commit → Experiment → wenn schlechter: `git reset`.
Das wuerde bei DGDH bedeuten: Reviewer gibt `needs_revision` → Engine macht `git reset --hard`
auf Stand vor dem Worker-Run → naechster Versuch startet sauber.

Warum nicht jetzt: erfordert koordinierten Branch-/Reset-Mechanismus zwischen Reviewer-Urteil und Engine.
Das ist Phase-5-Infrastruktur.

Lightweight-Version haben wir schon: Worker-Prompt sagt "adapt once, then report blocked" statt
blind in Repair-Loops zu laufen.

Trigger fuer echten Git-Rollback: wenn Worker-Runs nachweislich im Repair-Rabbit-Hole stecken und
Reviewer-Urteil allein nicht reicht um den Zustand zu bereinigen.

### Patterns aus markitdown (Inspiration: github.com/microsoft/markitdown)

Ein schlankes Python-Tool das beliebige Dateien (PDF, Word, Excel, Bilder, Audio, HTML, CSV, ZIP,
YouTube-URLs) in Markdown konvertiert — speziell fuer LLM-Pipelines gebaut.

**1. Markdown als kanonisches Zwischenformat (sofort relevant fuer Revenue Lane #1)**

Problem: Kundenordner enthalten PDFs, Word-Dokumente, Bilder mit Text, Excel-Tabellen.
Gemini-Worker bekommt heute rohe Dateien oder muss selbst parsen — das kostet Tokens und ist fehleranfaellig.

DGDH-Ansatz: Ingestion-Schritt vor dem Worker-Run:
- Kundenordner → alles normalisieren zu Markdown
- Markdown ist token-effizient, reviewbar von David, handoff-faehig zwischen Rollen
- Worker bekommt sauberes Markdown statt heterogene Rohdaten

Direkt relevant fuer den Web-Design-AI-Workflow: Kunde gibt PDFs und Word-Texte her,
markitdown-Schritt macht daraus strukturiertes Markdown, dann befuellt der Worker das Schema.

**2. Schmales Ingestion-Tool statt Tool-Zoo (Architektur-Prinzip)**

markitdown hat eine einzige Funktion: `convert_to_markdown(uri)`.
Das ist das Gegenteil von "Agent bekommt Dateisystem-Zugang und macht was er will."

DGDH-Prinzip: Kontext standardisieren bevor agentisch gearbeitet wird.
CEO/Worker/Reviewer bekommen normalisierte Inputs — keine heterogenen Rohdaten.

**3. Plugin-System fuer Konverter (spaeter)**

markitdown hat optionale Dependency-Gruppen (`[pdf]`, `[docx]`, `[pptx]`) und ein Plugin-System.
DGDH-Ansatz fuer spaeter: Ingestion-Layer modular erweitern ohne den Worker-Kern anzufassen.
Neue Formate (z.B. Buchungsplattform-HTML, Bewertungsportale) als eigene Konverter ergaenzen.

Trigger: wenn Revenue Lane #1 mehr als 2-3 Kundenformate hat.

**4. MCP-Server fuer engen Tool-Zugang (bestaetigt bestehende Richtung)**

markitdown bietet einen MCP-Server (`markitdown-mcp`) statt direktem Dateisystem-Zugang.
Das bestaetigt die in Section 10 dokumentierte MCP-Tool-State-Maschine:
Agents bekommen engen, definierten Tool-Zugang statt breite Filesystem-Macht.

### Patterns aus supermemory (Inspiration: github.com/supermemoryai/supermemory)

Ein Memory-/Context-Produkt mit API, MCP, SDKs, Project-Scoping und visualisiertem Memory-Graph.
Nicht alles davon passt zu DGDH. Aber einige Patterns sind fuer die Firmen-Architektur sehr stark.

**1. Scopes statt globales Memory (sofort relevant)**

supermemory arbeitet mit `containerTag` / Projekt-Scopes statt einer einzigen globalen Memory-Masse.
Das passt direkt zu DGDH.

DGDH-Richtung:
- Shared Memory immer klein und scoped halten
- primaere Scopes: `company -> project -> issue/work-packet`
- CEO darf Parent-/Mission-Scope lesen
- Worker liest standardmaessig nur Packet-Scope + minimalen Mission-Slice
- Reviewer liest Packet + Worker-Evidence + relevanten Mission-Slice

Das ist die operative Form von:

> retrieve the smallest useful memory slice, not the broadest possible history

**2. Versionierte Handoff-Relationen statt flacher History (spaeter, aber sehr passend)**

supermemory modelliert Relationen wie `updates`, `extends`, `derives` zwischen Memory-Eintraegen.
Das ist fuer DGDH deutlich nuetzlicher als ein allgemeines "AI erinnert sich halt".

DGDH-Uebersetzung:
- Worker-Handoff `updates` den aktuellen Packet-Status
- Reviewer-Verdict `derives` aus Worker-Evidence + Packet-Definition
- CEO-Missionsstatus `extends` sich durch Child-Packet-Handoffs

Dadurch wird Memory nicht nur suchbar, sondern auditierbar:
welcher Stand ist aktuell, was ersetzt was, und welches Urteil basiert auf welcher Evidenz.

Trigger fuer Umsetzung:
- erst nachdem strukturierte Handoff-Summaries parsed/gespeichert werden
- kein neues generisches Memory-System vorher

**3. Kleiner MCP-Surface fuer Memory/Context statt Tool-Wildwuchs (bestaetigt Richtung)**

supermemorys MCP-Server bleibt relativ eng:
- `memory`
- `recall`
- `context`
- wenige zusaetzliche Discovery-/Graph-Tools

Das ist ein gutes Pattern fuer DGDH.
Wenn DGDH spaeter Memory per MCP exponiert, dann nicht als Tool-Zoo, sondern als kleine,
klare Surface fuer Handoffs und Kontext.

Moegliche DGDH-Form spaeter:
- `write_handoff`
- `recall_handoff`
- `issue_context`
- `list_scopes`

Wichtig:
- immer company- und issue-scoped
- kein offener "such mal ueber alles" Default

**4. Per-Run / Per-Turn Context-Cache (sofort als Engine-Prinzip relevant)**

supermemory cached Memory-Injection pro Turn, damit Tool-Call-Fortsetzungen nicht denselben
Kontext immer wieder neu holen.

DGDH-Ansatz:
- ein Heartbeat-/Run-Kontext soll denselben Memory-Slice nicht mehrfach frisch berechnen
- Tool-Fortsetzungen und kleine Mehrschritt-Loops sollen denselben aufgeloesten Kontext wiederverwenden
- spart Tokens, Latenz und senkt Drift

Das ist kein Produkt-Feature fuer David, aber ein sehr gutes Engine-Prinzip.

**5. Was wir explizit NICHT kopieren sollten**

Nicht die richtige Phase fuer DGDH:
- personal-assistant-first Memory als Hauptprodukt
- globale User-Profile als zentrale Architektur
- Connector-Flaechen (Gmail, Drive, Notion, etc.) vor stabiler Firmen-Lane

Die richtige Uebersetzung ist:

> nicht "Supermemory fuer alles", sondern "sauberes, scoped Handoff-Memory fuer CEO -> Worker -> Reviewer"

### Patterns aus Hermes-Agent (Inspiration: github.com/NousResearch/hermes-agent)

Ein produktionsreifer Open-Source-Agent mit file-based Memory, SQLite-Transcript-Recall,
Context-Compression und Skills-System. Echter Code, echte Implementierung — nicht nur Konzept.

**1. Drei Speicher-Ebenen strikt trennen (sofort als Prinzip relevant)**

Hermes trennt:
- `MEMORY.md` — stabiles, langlebiges Wissen (bleibt ueber Sessions)
- SQLite + FTS5 — Transcript-Recall, durchsuchbare Run-Geschichte
- Skills-Dateien — wiederverwendbare, progressive-disclosure-faehige Faehigkeiten

DGDH-Uebersetzung:
- **Stable Memory** → MEMORY.md + role-templates (was das System wissen soll)
- **Run Recall** → Heartbeat-Run-Logs + Reviewer-Verdicts (was tatsaechlich passiert ist)
- **Skills** → Paperclip-Skills-Dateien (bereits vorhanden als `.gemini/skills/`)

Das sind drei verschiedene Schichten mit unterschiedlichen Lebenszyklen.
Sie duerfen nicht vermischt werden — das ist Hermes' wichtigstes Architektur-Prinzip.

**2. Frozen Memory Snapshot pro Run / Issue (sofort als Engine-Prinzip relevant)**

Hermes erstellt zu Beginn jeder Session einen frozen Snapshot des stabilen Memory.
Der Run liest immer gegen diesen Snapshot — nicht gegen live-mutierende Dateien.

DGDH-Uebersetzung:
- Pro Issue-Run: einmal Memory/Kontext einfrieren, dann konsistent verwenden
- Verhindert dass ein laufender Worker-Run durch parallele Aenderungen in Drift geht
- Einfachste Form: Heartbeat liest Kontext am Run-Start einmalig, injiziert ihn fix

Umsetzungsaufwand: klein (konzeptionell schon so implementiert durch Context-Injection-Layer).
Explizit machen und dokumentieren.

**3. Context Compression Flush + Structured Handoff (bald, nach CEO-Kette stabil)**

Hermes hat `context_compressor.py`: wenn der Kontext zu gross wird, nicht blind kuerzen,
sondern strukturiert flushen — wichtige Erkenntnisse in kompaktem Format behalten.

Das ist direkter Vorgaenger unserer Handoff-Summary-Idee. Hermes macht es mit echter Compression.

DGDH-Ansatz:
- Worker/Reviewer sollen am Run-Ende nicht einfach aufhoeren (`complete_task`-Barrier)
- Das Barrier-Tool erzwingt den Compression-Flush in strukturierter Form: Goal/Result/Files/Blockers/Next
- Spaeter: wenn CEO ueber mehrere Packets hinweg plant, Compression der aelteren Packet-Ergebnisse

Trigger: nach CEO-Kette stabil, als Verbindungsstueck zwischen Barrier-Tool und Memory-Schicht.

**4. Memory Security Scanning (spaeter, als Reviewer-Erweiterung)**

Hermes scannt Memory-Writes auf Injection-Versuche bevor sie in MEMORY.md landen.
Das ist relevant sobald Agents Memory schreiben duerfen — ein kompromittierter Worker koennte
sonst MEMORY.md mit falschen Annahmen befuellen.

DGDH-Ansatz: erst relevant wenn Agents selbst MEMORY.md oder andere shared Memory-Slices
schreiben duerfen. Bis dahin: nur Menschen schreiben MEMORY.md.

**5. Was wir explizit NICHT kopieren**

- Tiefes User-/Persona-Profiling via Honcho — kein Consumer-Produkt
- Globales persoenliches Gedaechtnis — widerspricht issue-scoped Memory-Prinzip
- `nudge_interval` / `creation_nudge_interval` Config — Hermes-spezifisches Consumer-Pattern

### Patterns aus AlphaClaw (Inspiration: AlphaClaw / OpenClaw Wrapper)

Ein "Betriebssystem-Wrapper" der einen AI-Agenten monatelang stabil laufen laesst.
Fokus: Zero-SSH-Management, Watchdog-Stabilitaet, gefuehrte Operator-Workflows.

**1. Proaktive Operator-Notification (sofort, klein)**

AlphaClaw schickt Telegram-Nachrichten wenn ein Agent crasht oder im Loop steckt.
DGDH-Ansatz: David soll nicht das Dashboard pollen muessen. Wenn ein Run nach X Minuten
kein Ergebnis liefert, im Loop haengt oder mit `failed` endet, bekommt David aktiv ein Signal.

Das ist *der* echte Wert aus diesem Pattern — nicht das Auto-Repair selbst (Timeout haben wir,
Git-Reset ist im Karpathy-Pattern), sondern die Notification.

Trigger fuer Umsetzung: sobald CEO-Delegation laeuft und mehrere Runs parallel aktiv sein koennen.
Dann ist Dashboard-Polling keine Option mehr — David muss push-benachrichtigt werden.

**2. Anti-Drift Prompt Injection (bereits implementiert — Bestaetigung)**

AlphaClaw injiziert bei jedem Run frische AGENTS.md + TOOLS.md als System-Prompt.
DGDH macht das bereits: `paperclipRoleTemplatePrompt` wird bei jedem Heartbeat-Run
aus dem Role Template geladen und in den Gemini-Prompt injiziert.

Das ist kein neues Packet — es ist eine Bestaetigung dass wir das richtige Pattern schon haben.
Konsequenz: Role Templates gut halten = Anti-Drift ist automatisch erledigt.

**3. Diff-View + Inline-Approve im Dashboard (Phase 4)**

AlphaClaw bietet In-Browser File Explorer mit Diff-View fuer Zero-SSH-Workflows.
DGDH-Ansatz fuer Phase 4: wenn Reviewer `needs_revision` oder `uncertain` zurueckgibt,
sieht David im Dashboard den Code-Diff und kann inline approven oder abweisen — kein Terminal.

Minimalversion: Run zeigt betroffene Dateien + Diff-Link. Approve-Button fuer Reviewer-Eskalation.
Volle IDE-im-Browser ist weit spaeter. Erst wenn Worker-Reviewer-Loop bewiesen ist.

### API-Palette fuer Revenue Lane #1 und CEO/Worker-Enrichment

Referenz: `github.com/public-apis/public-apis` — kuratierte Liste freier und freemium APIs.
Nicht jetzt umsetzen. Aber wenn der AI-Workflow bewiesen ist, sind das die naechsten Hebel.

**Prioritaet 1 — sofort relevant wenn Web-Design-Lane laeuft**

| API | Zweck | Kosten | Notiz |
|-----|-------|--------|-------|
| Nominatim (OpenStreetMap) | Geocoding fuer Lage-Sektion | gratis, kein Key | Jede kleine Firma braucht Karte. Worker befuellt lat/lng automatisch aus Adresse. |
| Microlink / OpenGraphr | Link-Metadaten, OG-Preview | Freemium | POI-Links, Partner-Links mit automatischen Vorschaubildern anreichern. |
| LibreTranslate | Uebersetzung | Open Source / self-host | Wenn Kunden mehrsprachige Site wollen. Auch auf eigenem Server betreibbar. |

**Prioritaet 2 — sinnvoll wenn Ingestion-Pipeline steht**

| API | Zweck | Kosten | Notiz |
|-----|-------|--------|-------|
| CloudConvert / iLovePDF | Dokumenten-Konvertierung | Freemium | Kundenordner mit PDFs/Word → saubere Artefakte fuer Worker. Ergaenzung zu markitdown. |
| ApiFlash / ScreenshotAPI | Web-Screenshot | Freemium | Competitor-Analyse fuer CEO-Planungsruns. "Wie sehen aehnliche Sites aus?" |
| Kickbox / Disify | E-Mail-Validierung | Freemium | Kontaktformular-Qualitaet pruefen bevor Kunde live geht. |

**Prioritaet 3 — spaeter / bei Bedarf**

| API | Zweck | Notiz |
|-----|-------|-------|
| Wikidata / Wikipedia | Firmen- und Ortsanreicherung | Fuer Kunden mit lokalem Kontext (Geschichte, Sehenswuerdigkeiten) |
| OpenCage / Geoapify | Erweitertes Geocoding | Wenn Nominatim fuer spezielle Faelle nicht reicht |
| Sendgrid / Mailtrap | E-Mail-Tests | Kontaktformular-Testing in Staging-Umgebung |
| DetectLanguage | Spracherkennung | Wenn Kundeninhalte gemischsprachig ankommen |

**Was wir nicht brauchen**
- Blockchain, Auth-Anbieter, Stock-Market-Daten — kein Bezug zu Revenue Lane #1 oder DGDH-Agenten

**Naechster konkreter Schritt wenn bereit:**
Nominatim zuerst — kein API-Key, gratis, direkter Wert fuer jede Kunden-Site.
Worker befuellt `location`-Section automatisch: Adresse → lat/lng → Karte einbettbar.

## 11. Multi-Agent-Arbeit: Erst smart strukturieren, dann parallelisieren

Ja, das spaetere Ziel ist intelligente parallele Arbeit.

Aber nicht sofort und nicht blind.

Vor echter paralleler Multi-Agent-Arbeit fehlen noch:

- Packet-Graph / Dependencies
- parent-child Beziehungen
- fan-out / fan-in Semantik
- Aggregation von Ergebnissen
- CEO-Entscheidungen ueber `wait all`, `continue subset`, `retry child`

Darum gilt:

- erst Packet- und CEO-Logik sauber machen
- dann kontrollierte Parallelisierung

## 12. Provider-Erweiterung nach Gemini

### 12.1 Reihenfolge

Die geplante Reihenfolge ist:

1. Gemini sauber machen
2. DGDH-Firmenbetrieb auf dieser Basis stabilisieren
3. erst dann den naechsten Provider integrieren

### 12.2 MiniMax als bevorzugter naechster Kandidat

Sobald Gemini stabil ist und die Firma die noetige Reife erreicht hat, ist `MiniMax` ein sehr interessanter naechster Kandidat.

Warum MiniMax fuer spaeter attraktiv ist:

- angeblich sehr gutes Preis-/Leistungsverhaeltnis
- hohe Limits fuer wenig Geld
- sparsame, praezise Worker-Rolle koennte sehr gut passen
- geeignet als starke Arbeiterbiene unter einem noch intelligenteren Entscheidungsmodell darueber

Aktueller Repo-Stand heute:

- im aktuellen Repo gibt es **keine** erkennbare MiniMax-Adapter-/Provider-Spur
- lokal wurde bei der Suche nach `MiniMax` / `minimax` nichts gefunden

Das bedeutet:

- MiniMax ist **nicht jetzt**
- aber MiniMax ist ein klarer spaeterer Ausbaukandidat

### 12.2.1 Browser Use CLI + MiniMax als externe Tool-Kombination

Unabhaengig von der DGDH-internen MiniMax-Integration gibt es eine externe Anwendung:

**Browser Use CLI** ist ein AI-gesteuertes Browser-Automation-Tool (open source, Python).
Einsatzgebiet ausserhalb DGDH: Davids Ferienwohnung-Kunden (Web Design Nebenlane).

- Preise/Verfuegbarkeit von Airbnb, Booking.com automatisch checken
- Buchungsformulare auf Kunden-Websites testen
- Content-Updates auf mehreren Plattformen

Browser Use CLI unterstuetzt OpenAI-kompatible APIs. MiniMax kann damit direkt genutzt werden:

```python
llm = ChatOpenAI(
    model="minimax-text-01",
    base_url="https://api.minimax.chat/v1",
    api_key="..."
)
```

Das ist kein DGDH-Infrastruktur-Thema — es ist ein externes Freelance-Tool das bei Bedarf aktiviert wird.

### 12.3 Wie MiniMax spaeter eingefuegt werden soll

MiniMax soll spaeter **nicht** als Sonderwelt eingebaut werden.

Es soll eingefuegt werden als:

- gemeinsamer `Smart Engine Core`
- plus `MiniMax Provider Module`

Wahrscheinliche spaetere Rolle:

- `MiniMax Worker Lane`

nicht zuerst:

- CEO-Lane
- Governance-Lane

## 13. Wann MiniMax erst dran ist

MiniMax kommt **erst dann**, wenn Gemini und die Firma einen klaren Reifegrad erreicht haben.

Die relevanten Gates sind:

1. `Gemini Lane stabil`
   - Routing sinnvoll
   - Heartbeats sauber packet-basiert
   - echte Aufgaben werden brauchbar erledigt
   - Review-Loop funktioniert

2. `DGDH Betriebsmodell stabil`
   - Mission -> Packet -> Worker -> Review -> CEO funktioniert
   - David wird wirklich entlastet
   - Governance und Budgets sind nicht nur auf Papier

3. `Engine Core ausreichend abstrahiert`
   - Provider-Unterschiede sind sauber getrennt
   - neue Lane kann ohne Architekturbruch eingefuegt werden

Erst danach:

- MiniMax integrieren
- danach optional weitere Lanes wie Claude/Codex unter denselben Kern ziehen

## 13.5 DGDH Revenue Lane #1 — Web Design als erstes echtes Produkt

Das ist Davids Origin Story und der erste konkrete Use Case fuer DGDH als AI-Mensch-Symbiose-Firma.

### Was bereits existiert

Ein fertiges Astro 5 + Keystatic CMS OnePager-Template:
- **Hosting:** Cloudflare Pages Free Tier, 0 EUR laufende Kosten
- **Kunde zahlt:** ~5€/Jahr fuer Domain — das ist der gesamte Kostenblock
- **Erster Kunde live:** https://urlaub-bei-bambergers.de/
- **Repo:** `C:\Users\holyd\DGDH\worktrees\ferienwohnung-bamberger`

### Warum das perfekt fuer DGDH-AI ist

Alle Inhalte liegen als **statische Textdateien in Git** — keine Datenbank, kein Backend:

```
src/content/settings/site.json     → Branding, SEO, Theme, Kontakt
src/content/settings/profile.json  → Branchentyp
src/content/sections/*/            → Sections: showcase, highlights, pricing,
                                      testimonials, location, faq, poi, contact-form
```

Das Schema ist in `keystatic.config.ts` und `src/content.config.ts` vollstaendig definiert.
Ein Gemini-Worker kann das Schema lesen und weiss exakt welche Felder er befuellen muss.

### Der Ziel-Workflow (was DGDH hier leisten soll)

```
David legt Kundendaten in Ordner
         ↓
DGDH forkt Template-Repo
         ↓
Gemini-Worker befuellt alle Content-Dateien nach Schema
         ↓
Push zu GitHub → Cloudflare deployt automatisch
         ↓
David reviewed kurz → lieferbar
```

### Branchenprofile (Template-Familie)

Fester Shared Core + variable Branchenprofile:

| Profil | Status |
|--------|--------|
| `ferienwohnung` | ✅ fertig, Kunde live |
| `verein` | geplant |
| `friseur` / `kosmetik` | geplant |
| `restaurant` / `cafe` | geplant |
| `handwerker` | geplant |

### Technische Constraints (non-negotiable)

- `output: "static"` in Astro — kein SSR ausser Keystatic OAuth-Route
- Worker-Bundle unter 3 MB (Cloudflare Free Tier Limit)
- Kein eigenes Formular-Backend, keine Buchungslogik, kein Plugin-System
- Config immer ueber `getResolvedSettings()` — nie direkt lesen

## 14. Was explizit noch nicht getan werden soll

- kein romantischer Multi-Agent-Ausbau bevor eine Lane stabil ist
- keine Provider-Sammlung ohne echten Betriebsbeweis
- kein Shared-Memory-Ausbau als Selbstzweck
- keine neue Meta-Architektur ohne direkten Nutzen
- keine dogmatische Bindung an ein einziges billiges Router-Modell

### 14.1 Paperclip-Branding jetzt nicht priorisieren

Die Codebasis traegt noch stark `Paperclip`-Branding und generische Paperclip-Dokumentation.
Das ist real ein Kontextdrift-Risiko fuer AIs.

Trotzdem gilt aktuell:

- **kein Full-Rebrand jetzt**
- **kein komplettes Herausloesen von Paperclip jetzt**

Warum:

- der direkte Nutzen ist im Moment kleiner als der Nutzen aus funktionierenden Agenten
- erst muss die Firma praktisch laufen
- erst muss echte Entlastung fuer David bewiesen sein
- `INIT.md`, `MEMORY.md` und dieses North-Star-Dokument reduzieren die Drift schon jetzt deutlich

Darum ist die Regel:

> Erst wenn Agents real und wiederholt fuer David arbeiten, wird Rebranding auf DGDH priorisiert.

Bis dahin bleibt die Haltung:

- operativ DGDH-first denken
- technisch vorhandene Paperclip-Altlasten tolerieren
- Rebranding bewusst verschieben, statt es als Ablenkung vor die produktive Agentenarbeit zu ziehen

## 15.1 Governance-Richtung fuer die naechste Phase

Kurzfristige Arbeitsregel:

- normale bounded Tasks laufen ohne Routine-Approval
- Approval ist **nicht** das Standard-Gegenstueck zu jedem `implement`-Run
- wenn das aktuelle System kleine Tasks staendig stoppt, ist das ein Zeichen fuer zu grobe Policy, nicht fuer richtige Governance

Spaeteres Zielbild:

- separater AI-Reflexionsschritt gegen ein klares Regelwerk
- Eskalation nur bei wirklich grossen, riskanten oder teuren Vorhaben
- David trifft CEO-Entscheidungen auf Missions- und Ausnahmeebene, nicht fuer winzige operative Schritte
## 16. Praktische Zielarchitektur

### Infrastruktur-Ebene (Engine)

- `Engine Thinking Layer` — erste Denkebene vor jedem Run (Modellwahl, Budget, Kontext, Governance)
- `Provider Modules` — Gemini/Claude/Codex-spezifische Quota-APIs und Adapter
- `Governed Shared Handoff Memory` — kompakte, querybare Memory-Slices statt Vollkontext
- `Heartbeat Runtime` — transportiert autorisierte Work Packets zur Ausfuehrung

### Agent-Ebene (Rollen)

- `David` — menschlicher CEO, gibt Missionen und Freigaben
- `AI CEO / Mission Manager` — Agent-Rolle: plant, zerlegt, delegiert, sammelt Reviews
- `Worker Agents` — Agent-Rolle: fuehren klar abgegrenzte Pakete aus
- `Reviewer Agents` — Agent-Rolle: pruefen Ergebnisse gegen Done-Kriterien

### Zusammenspiel

> Die Engine macht jeden Agent-Run smart (richtiges Modell, richtiger Kontext, richtige Guardrails).
> Die Agents machen die eigentliche Arbeit (planen, ausfuehren, pruefen).
> Shared Memory verbindet die Rollen ueber kompakte Handoffs.
> Die Engine denkt ueber den Run nach. Die Agents denken ueber die Aufgabe nach.

## 17. Der wichtigste Satz in diesem Dokument

> Erst Gemini sauber. Dann Firmenbetrieb sauber. Dann MiniMax als bevorzugte naechste Worker-Lane. Alles auf einer gemeinsamen Engine Thinking Layer, nicht auf drei Sonderwelten. Die Engine denkt ueber den Run nach. Die Agents denken ueber die Aufgabe nach.

## 18. Verweise

- Fruehere Detailanalyse: `doc/plans/2026-03-21-heartbeat-ceo-worker-review-architecture-report.md`
- Bestehende Firmenrichtung: `company-hq/ROADMAP.md`
- CEO-Kontext: `company-hq/DGDH-CEO-CONTEXT.md`
- Vision: `company-hq/VISION.md`
