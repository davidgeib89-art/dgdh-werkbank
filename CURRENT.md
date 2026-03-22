# CURRENT - Live Baton

focus: DGD-39 -> DGD-36 -> DGD-32 CEO-Aggregation
active_issue: DGD-39 (unblockiert; naechster Sprint)
next:
  1) DGD-39 (EU-Legal footer/impressum)
  2) DGD-36 (Generalize section components - komplexeste)
  3) DGD-32 CEO-Aggregation retrigger
blockers: none
notes:
- git_worktree Policy wurde aktiviert, dann fuer DGD-38 pragmatisch auf project_primary umgestellt
  (isolierte Checkouts auf Windows zu holprig fuer Verifikation - bewusster Zwischenzustand)
- DGD-38 Schema-Arbeit direkt im Astro-Repo erledigt (kein Paperclip-Worker-Run):
  content.config.ts + keystatic.config.ts haben Legal-Felder jetzt
- DGD-38 ist formal geschlossen; Evidenz:
  Keystatic zeigt alle 4 Legal-Felder; Save schreibt sie in `src/content/settings/site.json`
- Original-Astro-Workspace hat weiter node_modules/Windows-Junction-Probleme
  (`pnpm`-Shim kaputt, bestehende Installation unvollstaendig); Verifikation lief daher in temp copy
- Paperclip-Dashboard ist up (http://localhost:3100/api/health = ok)
- pnpm dev:watch im Paperclip-Repo laeuft wieder
- DGD-32 bleibt offen bis DGD-36/39 durch sind
- Researcher-Rolle geplant (Planer-Reflexion mit David, noch kein Issue erstellt)
last_updated_by: Codex (Coder)
updated_at: 2026-03-22
