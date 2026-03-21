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

### Handoff-Memory statt Brain-Soup

Die richtige Form fuer CEO/Worker/Reviewer ist:

- CEO schreibt Mission Summary
- Worker liest nur Mission + Packet + Zielprojekt-Slice
- Worker schreibt Completion Evidence
- Reviewer liest Mission + Packet + Worker Evidence
- CEO liest Reviewer Verdict + Mission State

Das ist die spaetere smarte Shared-Memory-Richtung.

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

## 15. Praktische Zielarchitektur

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

## 16. Der wichtigste Satz in diesem Dokument

> Erst Gemini sauber. Dann Firmenbetrieb sauber. Dann MiniMax als bevorzugte naechste Worker-Lane. Alles auf einer gemeinsamen Engine Thinking Layer, nicht auf drei Sonderwelten. Die Engine denkt ueber den Run nach. Die Agents denken ueber die Aufgabe nach.

## 17. Verweise

- Fruehere Detailanalyse: `doc/plans/2026-03-21-heartbeat-ceo-worker-review-architecture-report.md`
- Bestehende Firmenrichtung: `company-hq/ROADMAP.md`
- CEO-Kontext: `company-hq/DGDH-CEO-CONTEXT.md`
- Vision: `company-hq/VISION.md`
