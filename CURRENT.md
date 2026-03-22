# CURRENT - Live Baton

focus: Sprint P (Assignment-Logik) laeuft — Codex arbeitet
active_issue: Verdrahtung der Multi-Agent-Kette
next:
  1) Sprint P: Assignment-Logik (erstellte Issues landen bei Workern)
  2) Sprint Q: Reviewer-Feedback-Loop
  3) Sprint R: CEO-Aggregation
  4) Sprint S: Smoke Customer Run (erster End-to-End-Lauf)
blockers: none
brainstorm_backlog (2026-03-22, David + Perplexity + Claude):
  - CEO Prompt Hardening: 4 Tweaks gebuendelt nach Sprint P → `doc/backlog/ceo-prompt-hardening.md`
    (flexible Packet-Zahl, Mission-Typen, Direkt-vs-Kette, Selbst-Reflection)
  - Reflect-Skill als horizontales Tool fuer alle Rollen (spaeter, nach Smoke Run)
  - Skill-Creation Engine (spaeter, nach Sprint S) → `doc/backlog/skill-creation-engine.md`
  - Smoke Customer Run Konzept → `doc/backlog/smoke-customer-run.md` (noch nicht erstellt)
  - Agent Architecture kanonisch dokumentiert → `doc/architecture/dgdh-agent-architecture.md`
notes:
- Arbeitsmodell ab 2026-03-22: Planer = Perplexity via Chat. Codex = grosse Operator-Sprints mit eigenem Debug-Loop, Console-Watch und aktiver Bedienung von Paperclip/Werkbank. Reviewer/Researcher = Gemini CLI. Claude = nur wenn wirklich noetig, um Quota zu schonen.
- Codex committed und pusht selbst. Commit-Hash im Statusbericht ist Pflicht. Planer reviewed den Diff direkt.
- `MEMORY.md` bleibt Stable-Facts-only; datierte Sprint-Historie lebt in `doc/archive/sprint-log.md`.
- Revenue-Lane-Richtung: zuerst DGDH-Faehigkeit bauen, nicht einen einzelnen Kundenfall zu Ende improvisieren.
- Sprint E geliefert: deterministische `sharp`-Pipeline per API-Route `/api/companies/:companyId/revenue-lane/image-pipeline/process`.
- Sprint F geliefert: Flash-Lite-basierter Content-Extractor per API-Route `/api/companies/:companyId/revenue-lane/content-extractor/process`.
- Sprint G geliefert: deterministischer Schema-Fill per API-Route `/api/companies/:companyId/revenue-lane/schema-fill/process`.
- Sprint I geliefert: deterministischer Template-Apply per API-Route `/api/companies/:companyId/revenue-lane/template-apply/process`.
- Output ist reviewbar: `processed/manifest.json` fuer Bilder, `processed/content-draft.json` fuer strukturierten Content-Draft, `processed/site-output/` als Template-Stand und danach kontrollierter Apply in den sicheren Template-Workspace.
- Realer Sprint-I-Lauf gegen `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output` hat in `C:\Users\holyd\DGDH\worktrees\astro-keystatic-template-geib` `34` Pfade angewendet und `3` veraltete Managed-Pfade geloescht.
- Echter `npm run build` im sicheren Template-Workspace ist nach lokalem `npm ci` gruen; damit ist die Revenue-Lane-Foundation bis zum deploy-faehigen Template-Build bewiesen.
- Sprint J liefert die Zielausrichtung als Prototyp-zu-Plattform-Richtung: heutige Kundenarbeit ist Sandkasten fuer generische Agent-Faehigkeiten, die spaeter fuer viele Kunden wiederverwendbar laufen.
- Prototyping-Phase bleibt explizit: schneller iterieren, ehrlich Gaps markieren, Fundament richtig bauen statt Einzelfall-Perfektion.
- Sprint K liefert Lane Routing V1: `packetType + role` entscheiden die Lane; `deterministic_tool` blockt LLM-Calls hart und setzt `blockReason=deterministic_tool_no_llm_call`.
- Routing-Entscheidungen sind jetzt transparent im `routingReason` sichtbar (Lane, Quelle, packetType, Rolle, Bucket, Modell, Grund).
- Fuer Projekt Astro/Keystatic zeigt der Project-Workspace auf den sicheren Template-only-Workspace `C:\Users\holyd\DGDH\worktrees\astro-keystatic-template-geib`.
- Kein Kunden-Git mehr unter `C:\Users\holyd\DGDH\worktrees\ferienwohnung-bamberger`; der bisherige Kunden-Stand wurde aus dem Agenten-Bereich nach `C:\Users\holyd\Documents\Websites\kunden-archive\ferienwohnung-bamberger` verschoben.
last_updated_by: Claude (Planer)
updated_at: 2026-03-22
