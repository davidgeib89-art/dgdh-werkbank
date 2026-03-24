# CURRENT - Live Baton

focus: Die saubere Reconciliation von `origin/main` nach `main-local` ist erfolgt; jetzt den alten dirty Checkout isoliert halten und den naechsten echten Firmenlauf nur von einer sauberen synchronisierten Basis starten
active_issue: post-sync stabilization nach canonical-main proof plus sauberem `main-local`-Abgleich

next:
  1) fuer neue Arbeit eine saubere Basis auf dem jetzt synchronisierten `origin/main-local` verwenden statt den alten dirty Checkout blind weiterzufahren
  2) den alten lokalen `main-local`-Checkout nur bewusst und bounded reconciliieren; keine versehentliche Uebernahme der uncommitted `server/*`-Reste
  3) den naechsten bounded Firmenlauf von einer cleanen synchronisierten Basis starten
blockers:
  - der alte aktive Checkout `c:\\Users\\holyd\\DGDH\\worktrees\\dgdh-werkbank` ist weiterhin lokal dirty in `server/src/index.ts`, `server/src/middleware/auth.ts`, `server/src/services/ensure-seed-data.ts` und `server/src/types/express.d.ts`; dieser Checkout darf nicht mit der neuen kanonischen Basis verwechselt werden
  - direkte Arbeit auf diesem alten dirty Checkout bleibt riskant, bis er bewusst gegen den jetzt synchronisierten Remote-Stand aufgeraeumt oder ersetzt wurde
strategy_anchor:
  - `doc/plans/2026-03-24-dgdh-first-principles-operating-doctrine.md`
  - `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
  - `doc/plans/2026-03-23-focus-freeze.md`
notes:
  - Der echte bounded Firmenlauf ist geliefert und verifiziert: `DAV-18` endete `merged`, Parent `DAV-17` endete `done`, PR `#10` landete auf canonical `main`
  - Die kanonischen Proof-Commits auf `origin/main` sind `2eb751c30cd1bfc808349c8e8611ed20eb82aa98` (`[PAP-2] Proof of canonical main boot`), `0cc723c` (`[DAV-18] Add regression test for seeded agent runtimeConfig recovery`) und `6b453ce` (`fix(server): recover canonical main bootstrap state`)
  - `origin/main-local` wurde in einem sauberen Reconcile-Worktree per Merge-Commit mit `origin/main` synchronisiert; damit traegt der Remote jetzt sowohl die DGDH-Doku-/Trinity-Schicht als auch den canonical-main Beweis
  - Der Beweisartefakt liegt in `doc/archive/testrun/2026-03-24-canonical-main-bounded-proof.md` und dokumentiert `Status: Confirmed`, `boot: SUCCESS`, `health: green`, `companies: DGDH`
  - Waehrend dieser Verifikation lief lokal kein kanonischer Server; `/api/health` und `/api/companies` auf `3100` bis `3102` antworteten mit `ECONNREFUSED`, daher stammt die Wahrheit hier bewusst aus Git-/Artefakt- statt Live-Port-Signalen
  - Der Reviewer validierte den Worker-Artefakt real ueber `npx vitest run src/__tests__/ensure-seed-data.test.ts`; vier Tests liefen gruen
  - Ein zusaetzlicher lokaler Testversuch im Reconcile-Worktree scheiterte nicht am Produktcode, sondern daran, dass `npx vitest` in dieser Umgebung `vitest/config` nicht aufloesen konnte; fuer diesen Merge-Sync wurde darum kein neuer gruener Lauf behauptet
  - Kein Meta-Umbau als Reaktion: nur Truthfulness jetzt, saubere Baseline zuerst
last_updated_by: Codex (post-sync truth fix)
updated_at: 2026-03-24
