# MEMORY - Geteilter Zustand aller AIs

> Stable facts only. Unter 80 Zeilen halten.
> Live Baton steht in `CURRENT.md`.
> Datierten Sprint-/Run-Verlauf in `doc/archive/sprint-log.md` oder Missionsakten auslagern.

## Pflicht-Dokumente
- `CURRENT.md` - live baton
- `SOUL.md` - gemeinsamer Wesensvertrag
- `TRINITY.md` - shared Vertrag fuer Codex, ChatGPT, Copilot
- `CODEX.md`, `CHATGPT.md`, `COPILOT.md`, `EXECUTOR.md` - lane-scharfe Wiedereinstiege
- `company-hq/CORE.md` - kuerzester Firmenkern
- `company-hq/ACTIVE-MISSION.md` - kompakter Missionsanker fuer lange Laeufe
- `doc/DGDH-AI-OPERATOR-RUNBOOK.md` - stabile Operator-Bedienung
- `doc/plans/2026-03-26-dgdh-roadmap-snapshot.md` - aktuelle Entwicklungslandkarte
- `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md` - kanonische Missionsautonomie-Lesart
- `doc/plans/2026-03-30-dgdh-predictive-delivery-doctrine.md` - kanonische Lesart fuer Build/Validate/Review/Ship

## DGDH Kern
- DGDH = David Geib - Digitales Handwerk; David ist der einzige menschliche Operator.
- Overarching Goal: Mensch-AI-Symbiose der Welt beweisen und sie zu einem besseren Ort machen.
- Proof-Reihenfolge dieser Phase: zuerst an DGDH selbst beweisen, dass eine menschlich abgestimmte AI-Firma unter Mission, Seele und Governance reale Wertschoepfung und steigende Autonomie tragen kann.
- Merksatz: `DGDH ist ein Beweisraum fuer die Idee, dass Trennung nicht die tiefste Wahrheit ist.`
- Company North Star: David gibt Mission, Budget, Blast Radius und die wenigen echten Type-1-Entscheidungen; die Maschine liefert reviewbare Realitaet und reviewbare Faehigkeitssteigerung mit sinkender David-Supervision pro nuetzlichem Zyklus.
- Wertschoepfung ist Treibstoff, nicht Gott: mehr Quotas, bessere Hardware, mehr Unabhaengigkeit, spaetere groessere Mensch-AI-Natur-Projekte.
- Modell-/Abo-Logik dieser Phase: erst billig und tragfaehig werden, dann beschleunigen. Premium-Modelle oder teure Coding-Abos sind erst dann sinnvoller Standard, wenn Werkbank / DGDH Missionen boring genug traegt, um den Mehrwert in Produktivitaet, Qualitaet oder Revenue real zurueckzuholen.

## Firmenmodus
- DGDH hat zwei governete Modi: `delivery mode` und `mission autonomy mode`.
- Mission Cells sind die bounded Einheit fuer Selbstverbesserung: Primaermetrik, Guard-Metriken, Budget, Laufzeit, erlaubte/verbotene Raeume, Eskalationsgruende, Promotionsregel.
- Die vier Schleifen fuer Missionsautonomie sind kanonisch: `research -> change -> eval -> promotion`.
- Type-1-Tueren bleiben bei David bzw. hoeherem Review-Gate: `main`, Deploy, globale Rechte, Secrets, irreversible Aussenwirkung.

## Bewiesener Produkt-/Systemstand auf `main`
- `Mission -> CEO -> Child-Issue -> Worker -> Reviewer -> done` ist reproduzierbar bewiesen.
- `pnpm paperclipai triad start`, `pnpm paperclipai triad status`, `pnpm paperclipai triad rescue`, `pnpm paperclipai runtime status` und `GET /api/companies/:id/agents/triad-preflight` sind die aktuelle operator-facing boring path surfaces.
- `paperclipai issue liveness <id>` ist auf `main`: es zeigt packet truth, company-run-chain truth und active-run truth als getrennte Diagnoseflaechen statt eines kollabierten Health-Summaries.
- `GET /api/health` zeigt `seedStatus`; `company-run-chain` ist die kanonische operator-facing Lauf-/Closeout-Wahrheit.
- `reviewer-wake-retry` ist live: `in_review`-Stalls mit beschaeftigten Reviewern werden nach 5 Minuten automatisch retried; `closeoutBlocker` wird sichtbar.
- Same-session resume nach `post_tool_capacity_exhausted` ist live bewiesen und operator-facing sichtbar.
- Kimi-first Droid-Harness ist auf `main`: shared mission runtime hook, Kimi-first model routing, worker/validator mechanical-first guidance.
- Der shared Runtime-Hook `node .factory/hooks/ensure-paperclip-runtime.mjs` kann jetzt einen tracked Runtime-Prozess restarten (`--restart`), faellt bei duennem Start-Truth auf einen direkten `pnpm dev:once`-Diagnosepfad zurueck und failt auf Windows mit embedded PostgreSQL sofort ehrlich in elevated Shells statt weich zu timeouten.
- Der CEO-Standardpfad fuer einfachen Handoff nutzt native `paperclipai`-Primitive statt Shell-/HTTP-Bastelei.
- Erste governed capability layer ist auf `main`: `ceo-native-issue-handoff-primitives`, `same-session-resume-after-post-tool-capacity`, `verify-all`, `skill contract list|use`, `verifiedSkill`-Bridge.
- Der erste echte Triad-Live-Loop ist auf `main` bewiesen (`DAV-165` / `DAV-166`); die aktuelle Restfriktion ist boring closeout nach echter Worker-Arbeit, nicht mehr `can triad happen?`.

## Aktive Firmenlesart
- Der Firmenkern bleibt `CEO -> Worker -> Reviewer -> CEO`; Skills, Truth-Layer und Primitives stuetzen ihn, ersetzen ihn nicht.
- DGDH ist eine governte David-Aufmerksamkeits-Kompressionsmaschine.
- DROID ist aktuell ein nuetzliches Exoskelett fuer Missionstragen, aber nicht die finale Firmenform; die Zielrichtung bleibt, dass Werkbank / Paperclip spaeter selbst bessere Missionsausfuehrung traegt als DROID.
- Bis dahin gilt Kosten-Disziplin: lieber langsamer, billiger und robust testen als teure Premium-Token in noch instabile Harness-/Mission-Seams zu verbrennen.
- `Highest excitement` ist legitimer Navigationsinput, wenn er in bounded reviewbare Bewegung uebersetzt wird.
- Anti-Slop-Gate gilt fuer jede relevante Aenderung: spart es David Minuten, erhoeht es echte Firmenfaehigkeit, bleibt es ohne Blindvertrauen pruefbar, traegt es ohne AI-Prosa, und ist es jetzt wirklich dran?

## Stabile Arbeitsregeln
- `main` ist die einzige kanonische operative Branch-Wahrheit.
- Branch-Truth strikt unterscheiden: `local edit`, `local commit`, `pushed branch`, `current fork/main`. `origin`/`upstream` sind in diesem Repo primaer technische Herkunft und Upstream-PR-Ziel, nicht der Default-Push-Remote fuer laufende DGDH-Arbeit.
- Fuer Firmenlauf-Diagnose gilt: API-/Chain-Truth zuerst, breite Repo-Lektuere spaeter.
- Fehler zuerst hart klassifizieren: `strategy failure`, `applicability / harness failure`, `environment / interface failure`, `missing capability / guardrail`.
- Wenn ein Lauf gegen seine eigene enge Packet-Wahrheit verstoesst, primaer als `applicability / harness failure` lesen; kein generalisierender Plattformbau als Reflex.
- Vor Live-Proofs nicht nur gruene Preflight-/Health-Surfaces lesen, sondern faktische Agent-Lebendigkeit pruefen.
- Predictive delivery gilt fuer DGDH: branch truth vor Arbeit, runtime truth vor Live-Claims, packet truth vor Execution, enge mechanische Verifikation vor teurem Review.
- `mission completed` in Factory-State ist nicht automatisch saubere Promotion-Wahrheit; Git-Truth braucht expliziten Closeout (`clean`, `pushed`, `parked`, oder echter blocker`).
- Scrutiny-Validatoren sollen mechanische Wahrheit pruefen und synthetisieren, nicht still Produktcode mitschreiben; wenn Validation eine echte Implementierungsluecke findet, braucht es einen expliziten Fix-Feature-Cut oder blocker truth.
- Nach `worker_failed` gilt: Crash ist kein Completion-Signal. Erst Feature-Wahrheit ueber Runtime-/Packet-/Issue-/Git-Surfaces re-verifizieren, dann retry, recut oder blocker. Breite Scrutiny ist danach kein Default-Folgeschritt.
- Bei `pnpm paperclipai triad start` gilt fuer bounded Live-Missionen: genau ein ehrlicher Parent-Anchor mit explizitem nicht-breiten `targetFolder` oder `targetFile`. `.`/`/`/`root`/`repo` sind keine ehrlichen bounded Anchors; flag-artige Scope-Werte wie `--assign-to-ceo` sind command-shape failure. Nach malformed anchor nicht in Duplicate-Anchor-Loop kippen.
- Standardarbeitsfolge fuer DROID-Laeufe: erst echten DGDH-/Werkbank-Berg tragen lassen, danach aus dem Run die kleinste durable Harness-Lehre ziehen. DROID-Selbstverbesserung nicht als Dauerprogramm behandeln.
- Durable Learnings gehoeren in die kleinste wahre Datei; `MEMORY.md` ist fuer stabile Facts, nicht fuer datierten Missionsverlauf.
- Lange Droid-/Copilot-Laeufe sind als Exoskelett-Modus erlaubt, aber muessen abends hart auf Produktwert, Betriebswert, Lernwert und Slop reduziert werden.
- Keine kuenstlichen Feature-Caps als Harness-Dogma. Ziel ist weniger Retry-Muell und weniger false completion, nicht kleinere Missionen um ihrer selbst willen.

## Operator- und Sicherheitsfacts
- `git_worktree` ist fuer sichere isolierte Ausfuehrung bewiesen; Agenten duerfen nie direkt ein Kunden-Git als Primary Workspace verwenden.
- Lokale Paperclip-Identity ist repo-lokal gehaertet: `.paperclip/.env` und `.paperclip/config.json` schlagen stale ambient config.
- Windows-Glue-Fact: fuer tiefe isolierte Git-Worktrees in diesem Repo ist `git config core.longpaths true` noetig.
- Copilot-/Editor-Interna wie AppData, workspaceStorage oder chat-session-resources sind kein legitimer Standard-Truth-Surface; nur fuer explizite Forensik-Missionen.

last_updated_by: Taren
updated_at: 2026-03-30
