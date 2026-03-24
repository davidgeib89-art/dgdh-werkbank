# Run-Truth Observability Direction

Date: 2026-03-24
Status: Richtungsanker / spaeterer Produkthebel, kein automatischer Sofortsprint
Audience: David + Codex + Copilot + jede AI, die Firmenlaeufe testet oder verifiziert

## 1. Ausgangsfrage

Beim Testen echter Firmenlaeufe faellt auf, dass ein erheblicher Teil der Agentenkosten nicht fuer Problemlogik, sondern fuer Zustandsrekonstruktion draufgeht:

- Shells oeffnen
- Prozesse pruefen
- API pollen
- Git-Status lesen
- Browser misstrauen
- Run-/Issue-/PR-Zustaende indirekt zusammensetzen

Die Frage ist deshalb nicht nur:

> "Ist Copilot ineffizient?"

Sondern:

> "Fehlt DGDH eine billige, kanonische Zustandsoberflaeche, so dass Agenten staendig eigene kleine Observability-Systeme aus Shell-, API- und Git-Probes improvisieren?"

## 2. First-Principles-Lesart

Wenn man die geerbte Annahme entfernt, dass mehr Kommandos automatisch mehr Gewissheit bedeuten, bleiben fuer echte Firmenlaeufe nur wenige harte Wahrheiten:

1. Ein ausfuehrender Agent muss wissen, **was gerade laeuft**.
   - welcher Run
   - welcher Parent-/Child-Pfad
   - welcher Agent
   - welcher Status

2. Er muss wissen, **wo es wirklich laeuft**.
   - Worktree
   - Branch
   - Commit
   - Instanz
   - Prozess-/Banner-Identitaet

3. Er muss wissen, **wo der letzte harte Uebergang war**.
   - queued
   - running
   - worker done
   - reviewer assigned
   - reviewer run
   - merged
   - blocked
   - failed

4. Er muss wissen, **was der erste echte Schmerz ist**.
   - Shell-/Process-Fehler
   - API stale
   - Event lag
   - Merge-/PR-Blocker
   - falscher Runtime-Kontext
   - Browser zeigt nur Projektion statt Wahrheit

5. Er muss wissen, **welche Quelle wahr ist und welche nur Sicht ist**.
   - API
   - Git
   - runtime banner
   - DB
   - browser projection
   - inference

Wenn diese Wahrheiten nicht kompakt und maschinenlesbar verfuegbar sind, bezahlt jede Session dieselbe Wahrheit immer wieder neu mit Tokens.

## 3. Der eigentliche Hebel

Der tiefere Hebel ist nicht nur "Tokens sparen".

Der eigentliche Hebel ist:

> state reconstruction work von cognition trennen

Heute machen Agenten oft beides gleichzeitig:

- Zustand rekonstruieren
- Problem loesen

Das ist teuer und driftanfaellig.

Gesunder waere eine Trennung:

### A. State capture / truth condensation

Das System verdichtet:
- was laeuft
- wo
- mit welcher Wahrheit
- wo der erste Bruch ist

### B. reasoning / fixing

Erst danach entscheidet der Agent:
- was ist der echte Blocker?
- was ist der kleinste noetige Fix?
- was ist der naechste Schritt?

## 4. Was DGDH daraus machen sollte

Nicht "noch ein Testsystem".

Besser:

- **Run-Wahrheitsschicht**
- **Execution Observability Layer**
- **Run State / Operator Truth Layer**

Der Zweck ist nicht QA-Theater, sondern:

- Agentenlaeufe billiger machen
- Zustand lesbarer machen
- Drift senken
- Wahrheitshierarchie operationalisieren
- Shell-/API-/Terminal-Archaeologie reduzieren
- David-Minuten pro Firmenlauf senken

## 5. Was schon existiert und was noch fehlt

Schon vorhanden:

- `company-run-chain` als schmale Kettenwahrheit
- operator-facing Truth-Surface auf der Issue-Detail-Seite
- bessere Wakeup-Kontexte
- klare Runbook-Regeln fuer Truth-Hierarchie

Noch nicht wirklich vorhanden:

- eine kompakte kanonische Sicht, die **Run-Status + Run-Identitaet + Truth-Quelle + Frische + ersten Blocker** gemeinsam verdichtet

Die bestehende Truth-Surface ist also kein Fehlstart, sondern der Vorbau. Die neue Idee ist die naechste Schicht darauf.

## 6. Minimaler sinnvoller Scope

### Packet: `run-truth-surface-v1`

Ziel:
Agenten und Operator sollen den realen Zustand eines Firmenlaufs mit minimalen Tool-/Tokenkosten sehen koennen.

### Sollte enthalten

1. Kanonischer Run-State
   - `run_id`
   - `issue_id`
   - `parent_issue_id`
   - `agent_id`
   - `execution_intent`
   - `current_status`
   - `started_at`
   - `updated_at`

2. Run-Identitaet
   - `active_worktree`
   - `branch`
   - `current_commit`
   - `instance_id`
   - `port`
   - `project_id`
   - `company_id`

3. Firmenketten-Signale
   - `worker_state`
   - `reviewer_state`
   - `pr_number`
   - `pr_state`
   - `merge_state`

4. Truth-source tagging
   - `api`
   - `git`
   - `runtime_banner`
   - `db`
   - `browser_projection`
   - `inferred`

5. Freshness / confidence
   - `fresh`
   - `stale`
   - `inconsistent`
   - `unverified`

6. Ein blocker-orientierter Summary-Satz
   - `No active server bound to canonical worktree`
   - `PR open, reviewer not completed`
   - `Browser stale vs API fresh`
   - `Run merged in control plane, local branch not reconciled`

### Moeglicher spaeterer Implementationspfad

Wenn genau diese Beobachtungsschicht weiter zu viele Tokens ueber Shell-/API-/Git-Roundtrips verbraucht, ist ein spaeterer Kandidat:

- bounded code execution
- kleine typisierte Capability-Wrapper
- ephemere Mikroskripte fuer State Capture

Dann wuerde die Run-Wahrheit nicht nur ueber viele Toolturns rekonstruiert, sondern teilweise ueber kleine, sichere Mehrschrittprozeduren verdichtet.

## 7. Was bewusst nicht gebaut werden sollte

Nicht jetzt:

- Grafana-/Datadog-/Dashboard-Theater
- Metrik-Waelder
- Rohlog-Zentralisierung als erste Antwort
- Enterprise-Observability-Film
- neue Plattformschicht ohne klaren David-Minuten-Hebel

Erst braucht DGDH:

> verdichtete Wahrheit statt mehr Rohrauschen

## 8. Timing fuer DGDH

Das ist kein automatischer Sofortsprint.

Es ist dann dran, wenn der naechste echte Schmerz nicht mehr fehlende Firmenkette oder Packet-Wahrheit ist, sondern:

- zu viel Shell-/API-/Git-Rekonstruktion
- zu hohe Tokenkosten fuer Monitoring statt Denken
- wiederholte Verwechslung von Browser-Sicht und harter Wahrheit
- zu viele David-Minuten fuer "was passiert da gerade?"

## 9. Ein-Satz-Verdict

Wenn Copilot zu viele Tokens fuer Shell-, API- und Terminal-Archaeologie verbrennt, ist die richtige Antwort nicht nur besseres Prompting, sondern eine billige, kanonische Run-Wahrheitsschicht, die Status, Identitaet, Wahrheit, Frische und ersten Blocker kompakt sichtbar macht.
