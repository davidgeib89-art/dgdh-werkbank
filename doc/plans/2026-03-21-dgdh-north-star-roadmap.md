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

- Heartbeats dummer machen
- Work Packets smarter machen
- den CEO smarter machen

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

## 7. Smart Engine Core statt Provider-Sonderwelten

Langfristig soll es **nicht** drei komplett getrennte Engines geben.

Es soll geben:

- einen gemeinsamen `Smart Agent Engine Core`
- plus provider-spezifische Module fuer:
  - Quota-Erfassung
  - Modellkatalog
  - Provider-Limits
  - Adapter-spezifische Ausfuehrungsdetails

Das heisst:

- `Gemini Engine`
- `Claude Engine`
- `Codex Engine`

sollen **denselben Kern** teilen.

Nur diese Schicht soll unterschiedlich sein:

- Quota-API / Quota-Zustaende
- Modellnamen
- Cooldown-/Rate-Limit-Semantik
- provider-spezifische Adapter-Anbindung

Alles andere soll gleich gedacht werden:

- Task Understanding
- Packet-Zerlegung
- Budget-Klassen
- Risk/Approval-Entscheidungen
- Execution Intent
- Review Routing
- Memory Retrieval
- Reflection / Self-Check

## 8. Was im Smart Engine Core stecken soll

Der gemeinsame Core soll ausdruecken, **wie DGDH ueber Arbeit denkt**.

Er soll mindestens diese Layer haben:

1. `Task Understanding`
   - versteht den Auftrag
   - erkennt Ambiguitaet
   - erkennt Task-Typ, Risiko, benoetigte Inputs

2. `Work Packet Layer`
   - erzeugt begrenzte Pakete
   - formuliert Done-Kriterien
   - definiert Evidence und Review-Bedarf

3. `Decision Layer`
   - plant vs implementiert vs reviewed
   - entscheidet, ob Parallelisierung sicher ist
   - entscheidet, ob Freigabe noetig ist

4. `Budget Layer`
   - waehlt Budget-Klasse
   - erzwingt Hard Caps
   - entscheidet, wann starke Reasoning-Kosten gerechtfertigt sind

5. `Provider Routing Layer`
   - mappt Packet-Bedarf auf Provider-Quotas und Modell-Lanes

6. `Memory Layer`
   - holt nur den kleinsten sinnvollen Kontext
   - schreibt kompakte wiederverwendbare Handoffs
   - vermeidet Vollkontext-Muell

## 9. Routing: Nicht dogmatisch billig, sondern smart billig

Die aktuelle Frage ist richtig:

> Sollte fuer Routing und Modellwahl wirklich immer das billigste Modell entscheiden?

Meine klare Antwort:

- nein, nicht immer

Die richtige Meta-Policy ist:

1. `Deterministische Guardrails zuerst`
   - manches darf gar kein LLM entscheiden
   - z.B. fehlende Pflichtinputs, verbotene Zielbereiche, klare High-Risk-Mutationen

2. `Billiges Routing fuer Routine`
   - einfache begrenzte Pakete duerfen billig geroutet werden

3. `Staerkeres Routing fuer teure Fehlentscheidungen`
   - wenn die Entscheidung selbst grossen Downstream-Schaden ausloesen kann, muss die Entscheidungsinstanz besser werden

Das bedeutet praktisch:

- einfache Worker-Pakete koennen billig geroutet werden
- CEO-/Planungs-Pakete sollten **nicht** standardmaessig vom billigsten Modell entschieden werden
- Review-Pakete brauchen je nach Stakes unterschiedlich starke Urteilsqualitaet

Die richtige Formel ist also nicht:

- `Flash-Lite entscheidet immer`

sondern:

- `die Engine waehlt das billigste Modell, das die Routing-Entscheidung mit genug Qualitaet und Confidence treffen kann`

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

Das angestrebte Bild ist:

- `David`
- `AI CEO / Mission Manager`
- `Worker Lanes`
- `Reviewer Lanes`
- `Smart Engine Core`
- `Provider Modules`
- `Governed Shared Handoff Memory`
- `Packet Graph / Orchestration Layer`

Kurz:

> Heartbeats transportieren Arbeit.
> Work Packets strukturieren Arbeit.
> Der Engine Core denkt ueber Arbeit nach.
> Provider Module liefern Modelle und Quotas.
> Shared Memory verbindet die Rollen ueber kompakte Handoffs.

## 16. Der wichtigste Satz in diesem Dokument

> Erst Gemini sauber. Dann Firmenbetrieb sauber. Dann MiniMax als bevorzugte naechste Worker-Lane. Alles auf einem gemeinsamen Smart Engine Core, nicht auf drei Sonderwelten.

## 17. Verweise

- Fruehere Detailanalyse: `doc/plans/2026-03-21-heartbeat-ceo-worker-review-architecture-report.md`
- Bestehende Firmenrichtung: `company-hq/ROADMAP.md`
- CEO-Kontext: `company-hq/DGDH-CEO-CONTEXT.md`
- Vision: `company-hq/VISION.md`
