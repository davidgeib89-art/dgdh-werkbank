# CURRENT - Live Baton

focus: DGD-32 CEO-Aggregation retrigger
active_issue: DGD-32 (wieder offen als Parent-Aggregation)
next:
  1) DGD-32 CEO-Aggregation retrigger
blockers: none
notes:
- Planer-Rolle läuft ab jetzt in Perplexity (nicht Claude Code)
- Claude Code = nur Coder/Writer; Planer-Entscheidungen kommen von Perplexity
- Am Ende jeder Planer-Session in Perplexity bekommt Claude Code einen fertigen Write-Prompt für MEMORY.md / CURRENT.md
- DGD-38 done: Legal-Felder in content.config.ts + keystatic.config.ts, Keystatic zeigt alle 4 Felder, site.json speichert korrekt
- DGD-39 done: Footer + Impressum rendern Legal-Felder aus site.json konditional
- DGD-36 done: highlights unterstützen `image`/`link`, testimonials unterstützen `authorImage`/`link`
- git_worktree Policy aktiv; für DGD-38 pragmatisch auf project_primary umgestellt (Windows-Junctions holprig)
- Original-Astro-Workspace hat node_modules/Junction-Probleme - Verifikation weiterhin in temp copy
- Paperclip-Dashboard up: http://localhost:3100/api/health = ok
- pnpm dev:watch im Paperclip-Repo läuft
- DGD-32 bleibt offen bis CEO-Aggregation retriggered ist
- Researcher-Rolle geplant (noch kein Issue erstellt)
- Codex-CLI-Arbeit außerhalb Paperclip braucht danach formalen Worker-"Abholrunner" vor Review
last_updated_by: Codex (Coder)
updated_at: 2026-03-22
