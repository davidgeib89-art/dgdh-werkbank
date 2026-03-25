# CURRENT - Live Baton

focus: die erste lokale Produktantwort auf die Post-Handoff-Reibung ist jetzt issue-branch-truth im Worker-Handoff; der aktuelle Hebel ist diesen engen Fix auf canonical `main` zu landen und erst danach den naechsten Downstream-Verlust neu zu lesen
active_issue: `PAPERCLIP_WORKSPACE_BRANCH` wird jetzt nach Workspace-Realize in den live `paperclipTaskPrompt` gehoben und im Worker-Template als kanonische Reuse-Regel erzwungen; `run-truth-surface-v1` ist damit vorerst wieder nur spaeterer Kandidat, nicht der aktuelle Sprint

next:
  1) den Worker-Branch-Truth-Fix auf `main` landen und Baton-/Memory-Wahrheit synchron halten
  2) erst nach dieser Landung den naechsten echten Live-Verlust wieder vom selben Firmenlauf-Pfad lesen; moegliche Restklassen bleiben Reviewer-, Merge-, Recovery- oder Run-Truth-Reibung
blockers:
  - kein neuer Bereichsblocker ist bewiesen; offene Restpflicht ist die erneute Live-Revalidierung nach Landung des engen Worker-Handoff-Fixes
strategy_anchor:
  - `doc/plans/2026-03-24-dgdh-first-principles-operating-doctrine.md`
  - `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
  - `doc/plans/2026-03-23-focus-freeze.md`
notes:
  - Der lokale Produktfix fuer den ersten Post-Handoff-Verlust sitzt schmal in `server/src/services/heartbeat.ts` und `server/config/role-templates/worker.json`: die kanonische Issue-Branch-Wahrheit wird fuer Worker jetzt doppelt sichtbar gemacht, im live Prompt ueber `PAPERCLIP_WORKSPACE_BRANCH` und im Role-Template als Reuse-Regel fuer Commit-/PR-/worker-done-Handoffs
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
last_updated_by: Codex (post-Copilot worker-branch-truth landing prep)
updated_at: 2026-03-25
