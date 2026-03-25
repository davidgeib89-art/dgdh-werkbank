# CURRENT - Live Baton

focus: `boring-repeatable-work-class-v1` ist am Gate gestoppt; die erste neue Reibung auf canonical `main` ist noch vor jeder Arbeitsklasse eine assignment-to-run kickoff loss im Core-Loop
active_issue: frisch zugewiesene CEO-Parent-Issues erzeugen auf canonical `main` gerade keinen Parent-Run mehr; ohne `executionRunId`, `live-runs` oder Child-Erzeugung darf kein grosser Arbeitsklassen-Sprint weiterlaufen

next:
  1) den neuen Pre-Child-Core-Loop-Verlust erst sauber isolieren: warum erzeugt CEO-Zuweisung auf canonical `main` keinen Parent-Run mehr
  2) erst nach diesem Beweis den Arbeitsklassen-Sprint wieder aufmachen; davor kein `boring-repeatable-work-class`-Weiterbau
blockers:
  - Gate-Run blockiert schon vor Child-Erzeugung: `DAV-65` auf Port `3100` und `DAV-66` auf frischer `3101`-Instanz blieben beide nach CEO-Zuweisung ohne `executionRunId`, ohne `live-runs` und ohne Child-Issue
strategy_anchor:
  - `doc/plans/2026-03-24-dgdh-first-principles-operating-doctrine.md`
  - `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
  - `doc/plans/2026-03-23-focus-freeze.md`
notes:
  - Gate fuer `boring-repeatable-work-class-v1` ist negativ: `DAV-65` (`3513d870-5769-48bd-8bff-b95df5ccbdca`) auf canonical `main` / Port `3100` blieb nach normaler CEO-Zuweisung auf `todo`, `executionRunId = null`, `live-runs = []`, `company-live-runs = []`; CEO blieb `idle`
  - Runtime-Disambiguierung bestaetigt denselben Core-Loop-Verlust auf frischer Runtime: `DAV-66` (`9e624c47-11ff-4acb-ae99-d058f2b0dd63`) auf frischer `3101`-Instanz blieb nach derselben CEO-Zuweisung ebenfalls ohne `executionRunId` und ohne `live-runs`
  - Die neue erste Verlustklasse ist damit keine Arbeitsklassen-Reibung, sondern `assignment-to-run kickoff loss` vor dem ersten Parent-Run; truth source sind `GET /api/issues/:id`, `GET /api/issues/:id/live-runs`, `GET /api/companies/:companyId/live-runs` und Agent-Status auf `3100` und `3101`
  - Konsequenz fuer den North-Star-Sprint: sofortiger Stop. Solange eine frische CEO-Zuweisung keinen Parent-Run erzeugt, ist keine `boringly repeatable work class` ernsthaft bewiesen
  - `DAV-61` -> `DAV-62` beweist die neue Restklasse live: Worker-Handoff und Reviewer-Run liefen durch (`d6d283cf-1c7e-4100-b278-0d68e5fac09c`, `e5b11f6e-84b2-45d8-98df-bb87034d2d46`), aber `POST /api/issues/:id/reviewer-verdict` strandete danach an `GitHub pull request lookup failed (404): Not Found`; der Child-Issue-Status blieb `reviewer_accepted`, waehrend der Reviewer-Run `running` blieb
  - Die minimale Produktantwort ist jetzt auf canonical `main` gelandet: nicht aufloesbare PR-Metadaten werden im CEO-Merge-Service als expliziter `merge_conflict` geloggt und zurueckgegeben, statt den Reviewer-/Merge-Pfad mit einem rohen Fehler abzubrechen
  - Live-Revalidierung des Fixes lief auf einer frischen Serverinstanz auf Port `3101`, weil der alte 3100-Prozess weiter alten Code servierte: derselbe `DAV-62`-`merge-pr`-Call liefert jetzt sauber `status = merge_conflict` mit Message `GitHub pull request lookup failed (404): Not Found`, und der persistierte Issue-Status sprang auf `merge_conflict`
  - Frischer bounded Firmenlauf `DAV-63` auf canonical main ist wieder gestartet; Child `DAV-64` wurde im selben Firmenpfad vom CEO erzeugt und dem Worker zugewiesen, war beim Handoff aber noch nicht terminal und beweist darum noch keine neue Verlustklasse
  - Der Produktfix fuer den ersten Post-Handoff-Verlust ist jetzt auf canonical `main` gelandet (`d6a7ea2`): die kanonische Issue-Branch-Wahrheit wird fuer Worker schmal doppelt sichtbar gemacht, im live Prompt ueber `PAPERCLIP_WORKSPACE_BRANCH` und im Role-Template als Reuse-Regel fuer Commit-/PR-/worker-done-Handoffs
  - Die zugehoerigen Tests `heartbeat-issue-prompt-context` und `role-templates` decken die neue Branch-Reuse-Wahrheit explizit ab
  - Lokale Verifikation fuer diesen bounded Fix ist gruen: gezielte Vitest-Tests, `pnpm -r typecheck`, `pnpm test:run`, `pnpm build`
  - Planner-Lehre: der erste lokale Post-Handoff-Verlustkandidat ist nicht neue Observability allgemein, sondern schmale Worker-Handoff-Branch-Wahrheit; der naechste grosse Sprint wird erst nach frischer Live-Reibung geschnitten
  - Execution-Packet-Readiness-V1 ist jetzt produktisiert: Issues tragen strukturierte `executionPacketTruth` mit `targetFile`, `targetFolder`, `artifactKind`, `doneWhen`, `status` und kleinen `reasonCodes`; die Issue-Detail-Seite zeigt diese Wahrheit direkt vor dem Run
  - Assignment-/Status-Wakeups blocken execution-heavy Issues jetzt frueh auf `not_ready`, statt den CEO erst spaet im Parent-Run an `missing_inputs` haengen zu lassen
  - Die minimalen `reasonCodes` fuer fruehe Packet-Blocker sind jetzt `target_file_missing`, `target_folder_missing`, `artifact_kind_missing`, `donewhen_missing` und `execution_scope_ambiguous`
  - Frische Live-Validierung auf lokaler API: `DAV-52` blieb sichtbar `not_ready` ohne echten Run; `DAV-53` war `ready`, startete sauber und erzeugte Child `DAV-54` fuer die bounded Runbook-Aenderung
  - Die Issue-Detail-Seite zeigt jetzt fuer Firmenlaeufe eine kleine operator-facing Truth-Surface: `Issue`, `Company`, `Project`, `Active run`, `Context` plus die schmale Kette `assigned -> run started -> worker done -> reviewer assigned -> reviewer run -> merged -> parent done`
  - DAV-35/DAV-36 validieren den neuen Surface-Sprint live: DAV-35 endete `done`, Child DAV-36 endete `merged`, PR `#17`, Worker-Run `f9cceee9-0d27-4791-afc8-b3178bc1d4a8`, Reviewer-Run `aab00521-9b04-4eb4-bf6d-20ae23fe3e16`
  - Der erste echte Blocker im Validierungslauf war kein Infrastrukturfehler, sondern Packet-Wahrheit: der CEO-Parent-Run `6ca52f5e-da45-4a35-a2ac-1339a34b29a8` blockte mit `missing_inputs` / `target_file_not_specified`; nach explizitem `Target file: doc/DGDH-AI-OPERATOR-RUNBOOK.md` lief die Kette normal durch
  - Die Chain-Surface zaehlt `merged` jetzt auch dann korrekt als abgeschlossen, wenn ein Child-Issue `status = merged` und PR-Evidenz hat, aber `completedAt` fehlt; Fallback ist `updatedAt` statt unsichtbarer halb-fertiger Merge-Sicht
  - Frische Projekte mit git-backed lokalem Primary-Workspace bootstrappen jetzt produktseitig automatisch auf `executionWorkspacePolicy = isolated` mit `workspaceStrategy.type = git_worktree`; der kanonische Create-Pfad braucht dafuer kein manuelles Sonderpayload mehr
  - `GET /api/issues/:id/company-run-chain` liefert jetzt die schmale Kettenwahrheit `assigned -> run started -> worker done -> reviewer assigned -> reviewer run -> merged -> parent done` fuer Parent-/Child-Laeufe an einer Stelle
  - Die naechste Leverage-Frage ist nicht mehr "wie wird diese Kettenwahrheit fuer David sichtbar?", sondern "welche Packet-/Run-Wahrheit fehlt noch, bevor der erste Child-Handoff startet?"
  - DAV-33/DAV-34 validieren den neuen Pfad live: Projekt `2651f46c-04cb-4433-a55c-8baee1ce1c84` wurde frisch ohne explizite `executionWorkspacePolicy` angelegt und kam trotzdem direkt mit isolierter `git_worktree`-Policy zurueck
  - Im frischen Validierungslauf endete Parent `DAV-33` `done`, Child `DAV-34` `merged`, PR `#16`, Branch `dgdh/issue-DAV-34-bootstrap-chain-proof`, Worker-Run `4b766419-02ce-4d62-aa73-4dd9152adea5`, Reviewer-Run `e03480b4-eabc-4032-9b8d-4cc10c9788e6`, Worker-Commit `0de480e4e67f879882ddd64ccfacbdc05e5bed80`
  - Der Produktisierungs-Commit auf canonical `main` / `origin/main` ist `84a7d8fbde54347a912bd0f2f51847cd64e53cdc` (`productize company run bootstrap defaults and chain visibility`)
  - Der echte bounded Firmenlauf ist geliefert und verifiziert: `DAV-18` endete `merged`, Parent `DAV-17` endete `done`, PR `#10` landete auf canonical `main`
  - Die kanonischen Proof-Commits auf `origin/main` sind `2eb751c30cd1bfc808349c8e8611ed20eb82aa98` (`[PAP-2] Proof of canonical main boot`), `0cc723c` (`[DAV-18] Add regression test for seeded agent runtimeConfig recovery`) und `6b453ce` (`fix(server): recover canonical main bootstrap state`)
  - Die DGDH-Doku-/Trinity-/Soul-/Executor-Schicht ist jetzt auf `main` gelandet; `main` ist damit wieder die einzige gemeinsame operative Branch-Wahrheit
  - `main-local` wurde lokal und remote entfernt; frische Operator- und Executor-Arbeit startet nur noch auf `main`
  - Der Beweisartefakt liegt in `doc/archive/testrun/2026-03-24-canonical-main-bounded-proof.md` und dokumentiert `Status: Confirmed`, `boot: SUCCESS`, `health: green`, `companies: DGDH`
  - Clean-main Runtime ist jetzt real bewiesen: `c:\\Users\\holyd\\DGDH\\worktrees\\dgdh-werkbank`, Branch `main`, Startup-Banner `local_trusted` auf Port `3100`, Firma `44850e08-61ce-44de-8ccd-b645c1f292be`
  - Die reale Laufzeit hing dabei mangels repo-lokaler `.paperclip/.env` / `config.json` an der Default-Instanz unter `C:\\Users\\holyd\\.paperclip\\instances\\default`
  - Reale Parent-Runs `DAV-19`, `DAV-20` und `DAV-22` haben den alten CEO-/Routing-Blocker sichtbar gemacht; Details liegen in `company-hq/commit-reports/2026-03-24-clean-main-company-run-blocker-isolation.md`
  - Copilot hat den CEO auf API-first / sofortige Packetisierung bei execution-lastigen Parent-Issues geschaerft und den eigentlichen `model=auto`-Leak in `server/src/services/gemini-routing.ts` gefixt; der fruehere Heartbeat-Guard bleibt als defensiver Schutz bestehen
  - DAV-24 beweist den Routing-Fix live: `adapter.invoke.commandArgs` enthielt kein explizites `--model` mehr und der CEO erzeugte erstmals wieder echte Child-Issues (`DAV-25`, `DAV-26`) auf sauberem `main`
  - DAV-25 lief jetzt den ganzen Schlusspfad: Worker-Run `d68b3926-58c4-4f0e-a3d5-ebcdfe541e0b`, Reviewer-Lauf `d342a486-c276-4eec-b33d-2d8d8e1b4461`, danach echter Merge ueber `POST /api/issues/:id/merge-pr` mit PR `#12`; Endstatus `merged`
  - DAV-26 wurde bewusst als Meta-Seitenscope verworfen und als optionale Entscheidungsaufgabe auf `done` geschlossen, statt noch eine Reflexionsdatei in den Sprint zu ziehen
  - DAV-24 ist damit jetzt real auf `done`; der enge CEO -> Worker -> Reviewer -> Merge -> Parent-Close-Pfad fuer den Routing-Leak ist live beendet
  - Der erste echte Blocker im neuen Clean-Main-Firmenlauf war nicht mehr Routing, sondern der Reviewer-Handoff: `worker-done` setzte nur `in_review`, ohne Reviewer zuzuweisen oder zu wecken; das ist jetzt im Live-Pfad gefixt
  - Der zweite echte Blocker war fehlende Projekt-Isolation bei frisch erzeugten Projekten: ohne `executionWorkspacePolicy` lief der Worker im Human-Main-Worktree, zog Branch-Baggage in die PR und blockierte den Merge-Scope-Guard
  - Der durable Operator-Fix ist jetzt im Runbook verankert: frische Clean-Main-Projekte werden fuer echte Firmenlaeufe mit `executionWorkspacePolicy = isolated + git_worktree` angelegt
  - DAV-31 beweist den korrigierten Pfad live: Parent `DAV-31` endete `done`, Child `DAV-32` endete `merged`, PR `#15`, Branch `dgdh/issue-98769978-d330-4705-819b-4add3f21bed5`, Commit `aba3648605c8a1aa6438dbcfc4a768b3ddba103a`
  - Im korrigierten Lauf blieb der Human-Worktree auf `main`, waehrend das Child explizit `executionWorkspaceSettings.mode = isolated` trug und der Reviewer danach automatisch startete
  - Validiert wurden `pnpm -r typecheck` sowie gezielte Server-Tests fuer `gemini-local`, control-plane resolver und gemini pipeline; kein voller `pnpm test:run` oder `pnpm build` in diesem Sprint behauptet
  - Fuer den Routing-Fix liefen zusaetzlich die gezielten Tests `gemini-routing-engine`, `gemini-control-plane-resolver`, `gemini-local-execute` und `gemini-pipeline-e2e` gruen
  - Kein Meta-Umbau als Reaktion: der Sprint endet bewusst ohne neue Reflexionsdatei; der naechste Schritt ist wieder echter Firmenfortschritt
last_updated_by: Copilot (gate stopped by assignment-to-run kickoff loss)
updated_at: 2026-03-25
