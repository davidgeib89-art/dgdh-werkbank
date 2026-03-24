# CURRENT - Live Baton

focus: `main` ist jetzt die gemeinsame kanonische Basis; naechster Schritt ist wieder echter Firmenfortschritt auf `main` statt Branch-/Sync-Theater
active_issue: one-branch stabilization auf `main` plus naechster echter bounded Firmenlauf

next:
  1) neue Arbeit nur noch von einer sauberen `main`-Basis starten
  2) alte Sidecar-/Legacy-Pfade (`main-local`, alter Copilot-Sidecar, alte Reconcile-Worktrees) nicht mehr als aktive Basen verwenden
  3) den naechsten bounded Firmenlauf direkt von `main` ziehen und dabei nur echte Produktionsblocker fixen
blockers:
  - kein neuer harter Repo-Blocker bestaetigt; die naechste Wahrheit muss wieder aus einem echten Firmenlauf auf sauberem `main` kommen
  - der alte Ordner `c:\\Users\\holyd\\DGDH\\worktrees\\dgdh-werkbank-main` liegt noch physisch herum, ist aber kein aktiver Git-Worktree mehr und darf nicht als Startbasis verwechselt werden
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
  - Waehrend dieser Verifikation lief lokal kein kanonischer Server; `/api/health` und `/api/companies` auf `3100` bis `3102` antworteten mit `ECONNREFUSED`, daher stammt die Wahrheit hier bewusst aus Git-/Artefakt- statt Live-Port-Signalen
  - Der Reviewer validierte den Worker-Artefakt real ueber `npx vitest run src/__tests__/ensure-seed-data.test.ts`; vier Tests liefen gruen
  - Ein zusaetzlicher lokaler Testversuch im Reconcile-Worktree scheiterte nicht am Produktcode, sondern daran, dass `npx vitest` in dieser Umgebung `vitest/config` nicht aufloesen konnte; fuer diesen Merge-Sync wurde darum kein neuer gruener Lauf behauptet
  - Kein Meta-Umbau als Reaktion: jetzt wieder echter Firmenfortschritt auf `main`
last_updated_by: Codex (one-branch main stabilization)
updated_at: 2026-03-24
