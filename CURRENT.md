# CURRENT - Live Baton

focus: DGD-39 -> DGD-36 -> DGD-32 CEO-Aggregation
active_issue: DGD-39 (EU-Legal Footer/Impressum — nächster Sprint)
next:
  1) DGD-39 (EU-Legal Footer: Impressum-Seite rendern + Footer-Links aus Legal-Feldern in site.json)
  2) DGD-36 (Generalize section components — komplexeste Aufgabe, erst nach DGD-39 done)
  3) DGD-32 CEO-Aggregation retrigger (erst wenn DGD-36 + DGD-39 done)
blockers: none
notes:
- Planer-Rolle läuft ab jetzt in Perplexity (nicht Claude Code)
- Claude Code = nur Coder/Writer; Planer-Entscheidungen kommen von Perplexity
- Am Ende jeder Planer-Session in Perplexity bekommt Claude Code einen fertigen Write-Prompt für MEMORY.md / CURRENT.md
- DGD-38 done: Legal-Felder in content.config.ts + keystatic.config.ts, Keystatic zeigt alle 4 Felder, site.json speichert korrekt
- git_worktree Policy aktiv; für DGD-38 pragmatisch auf project_primary umgestellt (Windows-Junctions holprig)
- Original-Astro-Workspace hat node_modules/Junction-Probleme — Verifikation weiterhin in temp copy
- Paperclip-Dashboard up: http://localhost:3100/api/health = ok
- pnpm dev:watch im Paperclip-Repo läuft
- DGD-32 bleibt offen bis DGD-36/39 durch sind
- Researcher-Rolle geplant (noch kein Issue erstellt)
- Codex-CLI-Arbeit außerhalb Paperclip braucht danach formalen Worker-"Abholrunner" vor Review
last_updated_by: Perplexity (Planer)
updated_at: 2026-03-22
