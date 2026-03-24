# CURRENT - Live Baton

focus: `main` ist die gemeinsame kanonische Basis; naechster Schritt ist der naechste echte Firmenlauf auf `main`, aber jetzt gegen den neu belegten CEO-/gemini_local-Blocker statt gegen Branch-Theater
active_issue: clean-main company run blocker isolation nach DAV-19 / DAV-20 / DAV-22

next:
  1) den `gemini_local`-Routing-/Adapterpfad weiter eingrenzen, der trotz `adapterConfig.model = auto` noch explizit `--model gemini-3.1-pro-preview` in `adapter.invoke.commandArgs` landet
  2) danach den bounded CEO -> Worker -> Reviewer -> Merge-Pfad auf sauberem `main` erneut ziehen
  3) nur direkt im Live-Pfad bewiesene Execution-Learnings weiter promoten; kein Seitenscope
blockers:
  - echter harter Restblocker belegt: `gemini_local`-CEO-Runs koennen weiter mit explizitem `--model gemini-3.1-pro-preview` starten, obwohl die Agent-API `adapterConfig.model = auto` zeigt
  - Wirkung im Live-Pfad: Parent-Issues erzeugen keine Child-Issues; `DAV-22` endete als Run `succeeded` mit `errorCode: budget_hard_cap_reached`, waehrend das Parent-Issue `todo` blieb
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
  - Reale Parent-Runs `DAV-19`, `DAV-20` und `DAV-22` haben den neuen CEO-/Routing-Blocker sichtbar gemacht; Details liegen in `company-hq/commit-reports/2026-03-24-clean-main-company-run-blocker-isolation.md`
  - Copilot hat den CEO auf API-first / sofortige Packetisierung bei execution-lastigen Parent-Issues geschaerft und in `heartbeat.ts` einen engen Guard gegen blindes Model-Lane-Forcing fuer `gemini_local` mit `model=auto` ergaenzt
  - Validiert wurden `pnpm -r typecheck` sowie gezielte Server-Tests fuer `gemini-local`, control-plane resolver und gemini pipeline; kein voller `pnpm test:run` oder `pnpm build` in diesem Sprint behauptet
  - Kein Meta-Umbau als Reaktion: jetzt den isolierten Live-Blocker loesen und den Firmenlauf erneut ziehen
last_updated_by: Codex (post-DAV-22 blocker truth sync)
updated_at: 2026-03-24
