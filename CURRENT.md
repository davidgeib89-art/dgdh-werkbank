# CURRENT - Live Baton

focus: git_worktree aktivieren → DGD-38 → DGD-39 → DGD-36 → DGD-32 CEO-Aggregation
active_issue: DGD-32 (parent, bleibt offen bis alle Kinder done)
next:
  1) git_worktree-Policy per API aktivieren (kein Code, nur PATCH /api/projects/0bce43aa...)
  2) DGD-38 (Keystatic schema sync — legt taxId/vatId/etc. an, DGD-39 hängt daran)
  3) DGD-39 (EU-Legal footer/impressum — erst nach DGD-38 unblockiert)
  4) DGD-36 (Generalize section components — komplexeste, läuft dann mit Sicherheitsnetz)
  5) DGD-32 CEO-Aggregation retrigger
blockers: DGD-39 hängt an DGD-38 (Legal-Felder noch nicht im Schema)
notes:
- DGD-34 done/accepted (new-customer.mjs, Worker+Reviewer-Chain sauber durchgelaufen)
- git_worktree Infrastruktur existiert real in workspace-runtime.ts, nur Policy nicht aktiviert
- Teardown/PR/Rollback noch nicht fertig verdrahtet — bewusst zurückgestellt
- SHOW_EXPERIMENTAL_ISSUE_WORKTREE_UI = false (UI versteckt, Policy per API setzen)
- Projekt Astro/Keystatic ID: 0bce43aa-2bb9-4572-9938-f556a3279149
last_updated_by: Claude Code
updated_at: 2026-03-22
