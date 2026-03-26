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

Der naechste echte Test ist deshalb nicht mehr:

- koennen wir einen Skill-Contract bauen?
- koennen wir Skill-Reuse auf demselben Pfad beweisen?

sondern:

- spart diese kleine Skill-Layer auf realen Firmenlaeufen Wiederentdecken?
- wird sie im Alltag wirklich wiederverwendbar?
- bleibt er governbar und reviewbar?

## 5. Aktuelle Prioritaetenfolge

### `Core now`

1. Firmenloop weiter boring und reviewbar halten.
2. Die kleine Skill-Layer im Alltag gegen echten Reuse-Hebel pruefen.
3. Nur wenn der Hebel real ist:
   - zweiten kleinen Seed-Skill anfuegen
   - Verify-Evidence haerten

### `Likely next`

1. Reuse-Hebel der zwei Seeds im Alltag pruefen
2. Verify-Modell von rohen Marker-Checks Richtung haertere Evidence bewegen, wenn es noetig wird
3. hoechstens ein dritter kleiner Seed, wenn derselbe Pfad weiter traegt

### `Later`

- lokale Skill-Registry
- Skill-Router / Retrieval
- Replay-backed Skill Promotion
- governed evolution lane
- breitere operator-facing Run-Wahrheit

### `Not now`

- Skill-Plattform
- Self-Learning als neue Ideologie
- Registry-/DB-/UI-Breitensprint
- neue grosse Provider-/Routing-Romantik

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

## 9. Der knappste Satz

> DGDH hat den Firmenloop nicht ersetzt, sondern begonnen, ihn mit reviewbarer Truth, nativen Primitives und einem ersten governten Capability-Container zu unterbauen.
