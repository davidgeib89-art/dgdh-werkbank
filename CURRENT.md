# CURRENT - Live Baton

focus: `main` ist die gemeinsame kanonische Basis; der `gemini_local`-Routing-Leak ist auf dem Live-Pfad gefixt und DAV-25 hat auf sauberem `main` bereits `reviewer_accepted` erreicht
active_issue: post-routing-leak validation closure nach DAV-24 / DAV-25 / DAV-26

next:
  1) DAV-26 gezielt ziehen oder bewusst verwerfen; aktuell ist das zweite Child-Issue noch `todo` und unassigned
  2) danach den bounded CEO -> Worker -> Reviewer -> Merge-/Parent-Close-Pfad auf sauberem `main` bis zum echten Abschluss beweisen
  3) nur direkt im Live-Pfad bewiesene Execution-Learnings weiter promoten; kein Seitenscope
blockers:
  - kein aktiver Routing-Blocker mehr: DAV-24 erzeugte Child-Issues, DAV-25 lief ohne explizites `--model`, der Worker-Run `d68b3926-58c4-4f0e-a3d5-ebcdfe541e0b` endete `succeeded`, und der Reviewer-Lauf `d342a486-c276-4eec-b33d-2d8d8e1b4461` setzte DAV-25 auf `reviewer_accepted`
  - verbleibende offene Pfadwahrheit: DAV-26 ist noch `todo` und unassigned, DAV-24 selbst steht weiter auf `todo`; damit ist der finale Parent-/Merge-Abschluss noch nicht live bewiesen
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
  - DAV-25 beweist jetzt den naechsten erreichten Stand statt eines Blockers: Worker-Run `d68b3926-58c4-4f0e-a3d5-ebcdfe541e0b` lief erfolgreich durch und der Reviewer-Lauf `d342a486-c276-4eec-b33d-2d8d8e1b4461` setzte das Issue auf `reviewer_accepted`
  - Validiert wurden `pnpm -r typecheck` sowie gezielte Server-Tests fuer `gemini-local`, control-plane resolver und gemini pipeline; kein voller `pnpm test:run` oder `pnpm build` in diesem Sprint behauptet
  - Fuer den Routing-Fix liefen zusaetzlich die gezielten Tests `gemini-routing-engine`, `gemini-control-plane-resolver`, `gemini-local-execute` und `gemini-pipeline-e2e` gruen
  - Kein Meta-Umbau als Reaktion: naechster Live-Schritt ist jetzt verbleibende Child-/Parent-Close-Wahrheit statt weiterer Routing-Arbeit
last_updated_by: Copilot (post-DAV-25 reviewer acceptance)
updated_at: 2026-03-24
