# CURRENT - Live Baton

focus: Canonical main wirklich runnable machen und danach den naechsten echten bounded Firmenlauf direkt von canonical main ziehen; die neue First-Principles-Doktrin ist dabei der Drift-Anker
active_issue: canonical-main build/runtime identity plus Folgebeweis unter den bestehenden Guardrails
next:
  1) build/typecheck blocker in `server/src/index.ts` / `server/src/config.ts` sauber fixen
  2) repo-lokale main-Paperclip-Identity und Migrations so haerten, dass `/api/health` und `/api/companies` im canonical-main-Worktree wieder die echte DGDH-Firma liefern
  3) danach einen echten Worker -> Reviewer -> Merge-Lauf von canonical main starten und nur reale Glue-Bugs on the fly fixen
blockers:
  - `pnpm -r typecheck` und `pnpm build` sind auf `9b7681358f3c2d7a39a04c929ee82fa6adb7569a` rot, weil `server/src/index.ts` `config.paperclipHome` / `config.paperclipInstanceId` nutzt, die im `Config`-Typ fehlen
  - die repo-lokale main-Instance `C:\\Users\\holyd\\.paperclip-worktrees\\instances\\main` bootet nicht; `server.log` zeigt `relation \"companies\" does not exist`
strategy_anchor:
  - `doc/plans/2026-03-24-dgdh-first-principles-operating-doctrine.md`
  - `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
  - `doc/plans/2026-03-23-focus-freeze.md`
notes:
  - DGDH ist eine governte David-Aufmerksamkeits-Kompressionsmaschine; primaerer Messwert ist sinkende David-Minuten pro Firmenlauf
  - Review ist Gate und Sensor
  - Invarianten in Produktcode, Rollenverhalten in Role Templates, Spezialprozeduren spaeter in Skills, Bedienwissen im Operator-Runbook
  - Kein Skill-/Prompt-Architektur-Umbau im aktuellen Sprint; erst canonical main runnable, dann echter Firmenlauf
last_updated_by: Codex
updated_at: 2026-03-24
