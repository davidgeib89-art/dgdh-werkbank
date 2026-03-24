# CURRENT - Live Baton

focus: `main` ist die gemeinsame kanonische Basis; der frische bounded Firmenlauf auf clean main ist jetzt wieder real bis Merge/Parent-Close geliefert
active_issue: Zero-Rescue Company Run From Clean Main abgeschlossen; naechster Sprint kann den naechsten echten Firmenhebel auf derselben kanonischen Basis ziehen

next:
  1) den naechsten echten Firmenpfad wieder auf sauberem `main` ziehen, aber frische Projekte nur noch mit isolierter `git_worktree`-Policy anlegen
  2) nur direkt im Live-Pfad bewiesene Execution-Learnings weiter promoten; kein Reflexions-/Doku-Seitengleis ohne harte Not
blockers:
  - fuer diesen Sprint kein offener Restblocker mehr: DAV-31 ist `done`, DAV-32 ist `merged`
strategy_anchor:
  - `doc/plans/2026-03-24-dgdh-first-principles-operating-doctrine.md`
  - `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
  - `doc/plans/2026-03-23-focus-freeze.md`
notes:
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
last_updated_by: Copilot (post-DAV-24 merged-close completion)
updated_at: 2026-03-24
