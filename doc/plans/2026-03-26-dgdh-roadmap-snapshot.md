# DGDH Roadmap Snapshot

Date: 2026-03-26
Status: Aktueller Entwicklungsstand zwischen North Star, Baton und naechsten echten Schritten
Audience: David + Codex + ChatGPT + Copilot + jede AI mit Repo-Kontext

## 1. Wozu dieses Dokument da ist

Dieses Dokument ist keine neue Vision und kein Ersatz fuer `CURRENT.md`.
Es ist die grobe Arbeitskarte fuer die aktuelle Entwicklung:

- wo DGDH gerade wirklich steht
- was schon `done enough` ist
- was jetzt `Core` ist
- was bewusst `Later` bleibt
- woran wir Drift erkennen

Kurz:

> North Star gibt Richtung.
> `CURRENT.md` gibt den naechsten Schritt.
> Diese Roadmap verbindet beides mit dem aktuellen Main-Stand.

## 1.1 Doctrine Update 2026-03-27

Die Roadmap wird ab jetzt mit einer schaerferen Firmenlesart gelesen:

> DGDH soll nicht nur reviewbare Arbeit delegieren.
> DGDH soll in governten Missionsraeumen die eigene Faehigkeit selbst steigern.

Der Companion dafuer ist:
- `company-hq/CORE.md`
- `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md`

## 2. Das stabile Herzstueck

Der Firmenkern bleibt:

1. David gibt Richtung.
2. CEO plant und zerlegt.
3. Worker fuehren klar abgegrenzte Pakete aus.
4. Reviewer pruefen hart gegen `doneWhen`.
5. CEO aggregiert, entscheidet und fuehrt den naechsten Schritt.

Das ist nicht ersetzt worden.
Skills, Truth-Layer und Primitive sind Unterbau, nicht neuer Firmenkern.

## 3. Was bereits geliefert ist

### Phase A - Core Loop Reality

Repo-wahr geliefert:

- `Mission -> CEO -> Worker -> Reviewer -> Merge -> Summary` ist real bewiesen.
- Review ist echtes Gate, nicht nur Dekoration.
- `reviewer accepted` retriggert den CEO-Parent automatisch.
- Der Firmenloop ist boring genug, um nicht mehr nur als Theorie zu gelten.

### Phase B - Truth and Recovery

Repo-wahr geliefert:

- Same-session resume ist reviewbar bewiesen.
- Operator-facing `company-run-chain` zeigt die Resume-Wahrheit sichtbar.
- Der alte Schmerz `was ist eigentlich passiert?` ist deutlich kleiner geworden.

### Phase C - Primitive Compression

Repo-wahr geliefert:

- Der CEO-Standardpfad fuer einfachen Issue-Handoff laeuft nativer und billiger.
- `issue list --parent-id`
- `agent list`
- `issue create`
- `issue assign`

Das ist nicht mehr nur Prompt-Idee, sondern echter bewiesener Run-Pfad.

### Phase D - First Governed Capability Layer

Repo-wahr geliefert:

- erster Skill-Contract-v1
- Verify-Gate-v1
- Promotion-/Maturity-State-v1
- erster Seed:
  - `ceo-native-issue-handoff-primitives`
- zweiter Seed:
  - `same-session-resume-after-post-tool-capacity`
- gemeinsamer Reuse-Pfad:
  - `paperclipai skill contract verify-all`
- operator-facing Reuse-Bridge:
  - `paperclipai skill contract list|use`
- runtime-facing Reuse-Bridge:
  - `verifiedSkill: <capabilityId>` on an issue packet injects the verified skill brief into wakeup context and `paperclipTaskPrompt`
- live proof:
  - `DAV-144` / run `fa452fcb-7d12-4f76-a545-d5f93d8f6850` shows the explicit skill bridge carrying `ceo-native-issue-handoff-primitives` into the real CEO path, which then executes the native handoff primitives and creates child `DAV-145`

Wichtig:

> Das ist noch keine Skill-Plattform.
> Es ist die erste kleine governed capability layer fuer bereits bewiesene Firmenfaehigkeiten.

## 4. Wo wir jetzt wirklich stehen

Wir sind nicht mehr in der Phase:

- "kann der Firmenloop ueberhaupt laufen?"
- "warum macht der CEO alles noch ueber Shell-/HTTP-Gefrickel?"

Wir sind jetzt in der Phase:

> Wie machen wir bewiesene wiederkehrende Firmenfaehigkeit durable,
> ohne in Skill-/Registry-/Self-Learning-Meta zu kippen?

Neu dazu:

Wir sind auch nicht mehr nur in der Phase:
- "welcher kleine Skill-Hebel ist als naechstes dran?"

Wir sind jetzt in der Phase:

> Wie bekommt die Firma einen bounded Selbstverbesserungsmodus,
> der tagelang autonom laufen darf, ohne in Tool-Thrash, Research-Schleifen oder Main-Risiko zu kippen?

Der naechste echte Test ist deshalb nicht mehr:

- koennen wir einen Skill-Contract bauen?
- koennen wir Skill-Reuse auf demselben Pfad beweisen?

sondern:

- spart diese kleine Skill-Layer auf realen Firmenlaeufen Wiederentdecken?
- wird sie im Alltag wirklich wiederverwendbar?
- bleibt ihr expliziter Skill->Run bridge path governbar und reviewbar?

## 5. Aktuelle Prioritaetenfolge

### `Core now`

1. Firmenloop weiter boring und reviewbar halten.
2. `mission-autonomy-lane-v1` als neuen Firmenmodus schneiden.
3. Dafuer zuerst:
   - `mission-contract-v1`
   - `type1-type2-decision-policy-v1`
   - `oberreviewer-risk-gate-v1`
   - `replay-eval-promotion-v1`
4. Die kleine Skill-Layer, Resume-Truth und Audit-/Routing-Haertungen als Unterbau fuer diesen Modus lesen, nicht als Endpunkt.

### `Likely next`

1. Erste echte 24-72h Mission Cell gegen eine scharfe Zielfunktion fahren
2. Reuse-Hebel der vorhandenen Seeds innerhalb dieser Mission Cells messen
3. Verify-/Eval-Modell von rohen Marker-Checks Richtung haertere Evidence bewegen, wenn es fuer Promotion noetig wird

### `Later`

- lokale Skill-Registry
- Skill-Router / Retrieval
- Replay-backed Skill Promotion
- governed evolution lane
- breitere operator-facing Run-Wahrheit
- OpenAI Codex Plugins als spaetere Codex-Enablement-Schicht: DGDH-Kontext, Skills, MCP-/App-Integrationen fuer Codex sauber buendeln, aber ausdruecklich nicht als Ersatz fuer `company-hq/capabilities/*` oder als neuer Firmenkern
- `agentica-translation-spike-v1` als spaetere Research-Lane: Agentica / ARCgentica auf 1-2 uebersetzbare Prinzipien fuer DGDH reduzieren, vor allem stateful execution, direkte Primitive und bounded state handoff
- `onyx-lite-or-mcp-shadow-search-spike-v1` als spaetere Research-/Enablement-Lane: Onyx auf einen kleinen shared context/search/action Hebel fuer bestehende Clients reduzieren statt Voll-Plattform

### `Not now`

- Skill-Plattform
- freie Selbstoptimierung als Romantik
- Registry-/DB-/UI-Breitensprint
- neue grosse Provider-/Routing-Romantik
- Codex-Plugin-Sprint als Hauptfokus vor dem Nachweis, dass der aktuelle `verifiedSkill`-/Reuse-Pfad auf weiteren echten Laufklassen sichtbar Minuten spart
- Agentica- oder ARC-Integration als neuer Core-Stack, zweite Produktionsruntime oder AGI-/Benchmark-Hauptmythos vor dem weiteren Beweis, dass der aktuelle Firmenloop und Skill-Reuse im Alltag sichtbar Minuten spart
- Voll-Onyx als neue Hauptoberflaeche, zweites schweres AI-System oder Connector-/Feature-Breitensprint vor dem Nachweis, dass ein kleiner shared search/action layer real Rekonstruktionszeit spart

## 6. Wie Skills richtig zu lesen sind

Skills sind fuer DGDH aktuell:

- keine Ersatz-Rollen
- keine freie Selbstoptimierung
- keine neue Firmenidentitaet

Skills sind aktuell:

- benannte wiederkehrende Faehigkeiten
- bounded by contract
- mit Verify-Gate
- mit Maturity-State
- mit echter Evidence statt nur Prosa

Der Satz dafuer ist:

> Skills ersetzen den CEO/Worker/Reviewer-Loop nicht.
> Sie werden zur ersten prozeduralen Gedaechtnisschicht darunter.

## 7. Wie wir Drift erkennen

Wir driften, wenn:

- wir so reden, als waere `v1` schon breite durable Learning-Infrastruktur
- wir Registry/Router bauen, bevor der erste Seed echten Reuse-Hebel beweist
- wir wieder mehr AI-Aktivitaet als reviewbare Firmenfaehigkeit produzieren
- die Baton-Wahrheit hinter dem Main-Stand herhaengt
- der Firmenloop selbst wieder schlechter lesbar oder fragiler wird

Wir bleiben auf Kurs, wenn:

- David schneller urteilen kann
- wiederkehrende Faehigkeiten weniger neu rekonstruiert werden muessen
- neue Schichten den Firmenloop stuetzen statt verdecken
- wir zwischen `Core`, `Later`, `too fat` und `slop` weiter ehrlich unterscheiden

## 8. Praktische Arbeitsregel fuer neue Chats

Wenn eine AI neu andockt, sollte sie aus dieser Roadmap vor allem drei Dinge mitnehmen:

1. Der Firmenkern ist weiter `CEO -> Worker -> Reviewer -> CEO`, nicht irgendein freier Agentenschwarm.
2. Primitive Compression und erster Skill-Contract-v1 sind bereits auf `main` geliefert.
3. Der naechste echte Hebel ist enger Reuse-/Capability-Hebel, nicht sofort Plattformbau.
4. Die naechste groessere Firmenstufe heisst nicht freie Autonomie, sondern mission-bounded Selbstverbesserung mit Eval-/Promotion-Kern.

## 9. Der knappste Satz

> DGDH hat den Firmenloop nicht ersetzt, sondern begonnen, ihn mit reviewbarer Truth, nativen Primitives und einem ersten governten Capability-Container zu unterbauen - damit daraus als naechste Stufe ein mission-bounded Selbstverbesserungsmodus werden kann.
