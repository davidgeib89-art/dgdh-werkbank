# CURRENT - Live Baton

focus: Focus Freeze aktiv - 1) E2E-Firmenloop boringly reliable, 2) primitive `verein`-Capability
active_issue: E2E-Testrun - CEO -> Worker (PR) -> Reviewer -> CEO Merge -> Summary
next:
  1) E2E-Testrun: Kette einmal vollstaendig durchlaufen lassen, Ergebnis beobachten
  2) Nur echte Loop-Blocker fixen bis der Firmenloop boringly reliable ist
  3) Danach: `verein`-Profil-Layer / Mapping / primitive Vereinswebsite als naechste vertikale Capability
blockers: keiner (T, T.1, U und Merge-Orchestrator sind implementiert und verifiziert)

focus_freeze (2026-03-23 bis ca. 2026-04-02):
  doc: `doc/plans/2026-03-23-focus-freeze.md`
  allowed_priorities:
    - E2E-Firmenloop boringly reliable
    - primitive `verein`-Capability
  anti_drift_rule: Erhoeht das direkt Loop-Zuverlaessigkeit oder `verein`-Capability? Wenn nein -> Backlog.
  metrics:
    - Abschlussrate
    - Manual Minutes Saved
    - Primitive-to-Better Delta
  not_now:
    - Firm Memory Agent
    - Skill-Creation Engine
    - neue Provider/Lanes
    - Assistant-Ausbau als Pflichtglied
    - Heartbeat Modular Refactor ohne akuten Blocker
    - Telegram/Comfort-Layer
    - Meta-Reflexionsschichten

sprint_v_scope (2026-03-23, David + Perplexity + Claude):
  Ziel: CEO merged alle accepted Children-PRs sauber durch
  - CEO prueft: alle Children status=reviewer_accepted? -> Merge-Sequenz starten (created_at ASC)
  - POST /api/issues/:id/merge-pr: GitHub REST merge -> Erfolg: Branch weg, Issue closed
  - Konflikt: Issue status=merge_conflict, CEO meldet David - KEIN Auto-Retry (Sprint W)
  - Nach Merge aller Children: CEO Summary als Comment auf Parent-Issue
  doneWhen: echter Lauf merged sauber durch; Konflikt-Fall erkannt + reported, nicht gecrasht
  Auto-Retry: explizit NICHT gebaut (kommt erst wenn echte Konflikt-Daten vorliegen)
brainstorm_backlog (2026-03-22, David + Perplexity + Claude):
  - Planer-Reflexionen als Shared Memory (umgesetzt in North Star Section 10)
  - CEO Prompt Hardening: 4 Tweaks gebuendelt nach Sprint P -> `doc/backlog/ceo-prompt-hardening.md`
    (flexible Packet-Zahl, Mission-Typen, Direkt-vs-Kette, Selbst-Reflection)
  - Reflect-Skill als horizontales Tool fuer alle Rollen (spaeter, nach Smoke Run)
  - Skill-Creation Engine (spaeter, nach Sprint S) -> `doc/backlog/skill-creation-engine.md`
  - Smoke Customer Run Konzept -> `doc/backlog/smoke-customer-run.md` (noch nicht erstellt)
  - Agent Architecture kanonisch dokumentiert -> `doc/architecture/dgdh-agent-architecture.md`
notes:
- Arbeitsmodell ab 2026-03-22: Planer = Perplexity via Chat. Codex = grosse Operator-Sprints mit eigenem Debug-Loop, Console-Watch und aktiver Bedienung von Paperclip/Werkbank. Reviewer/Researcher = Gemini CLI. Claude = nur wenn wirklich noetig, um Quota zu schonen.
- Codex committed und pusht selbst. Commit-Hash im Statusbericht ist Pflicht. Planer reviewed den Diff direkt.
- `MEMORY.md` bleibt Stable-Facts-only; datierte Sprint-Historie lebt in `doc/archive/sprint-log.md`.
- Fokus-Freeze fuer die naechsten Tage: erst Firmenloop haerten, dann `verein`-Capability. Kein Seitensprung in Zukunfts-Backlogs.
- Revenue-Lane-Richtung: zuerst DGDH-Faehigkeit bauen, nicht einen einzelnen Kundenfall zu Ende improvisieren.
- Sprint E geliefert: deterministische `sharp`-Pipeline per API-Route `/api/companies/:companyId/revenue-lane/image-pipeline/process`.
- Sprint F geliefert: Flash-Lite-basierter Content-Extractor per API-Route `/api/companies/:companyId/revenue-lane/content-extractor/process`.
- Sprint G geliefert: deterministischer Schema-Fill per API-Route `/api/companies/:companyId/revenue-lane/schema-fill/process`.
- Sprint I geliefert: deterministischer Template-Apply per API-Route `/api/companies/:companyId/revenue-lane/template-apply/process`.
- Lane Routing V1 geliefert: `packetType + role` entscheiden die Lane; `deterministic_tool` blockt LLM-Calls hart.
- Sprint T geliefert: `POST /api/issues/:id/worker-done` ist Source of Truth fuer Worker-Abschluss; `prUrl`, `branch`, `commitHash` und Summary sind Pflicht.
- Sprint T.1 geliefert: Worker kann PRs via GitHub REST API erstellen (`POST /api/issues/:id/worker-pr` + `createGitHubPR`), ohne `gh` CLI.
- Sprint T.1 Smoke-Beweis: echter PR `#1` wurde erstellt und bewusst ohne Merge geschlossen.
- Sprint U geliefert: Prompt-basierte Scope-Firewall ist live (Worker blockt ausserhalb `targetFolder`, Reviewer fordert Revision bei Scope-Verstoss).
- Option B (Code-Firewall) ist als Backlog dokumentiert: `doc/backlog/scope-firewall-code.md`.
- Fuer Projekt Astro/Keystatic zeigt der Project-Workspace auf den sicheren Template-only-Workspace `C:\Users\holyd\DGDH\worktrees\astro-keystatic-template-geib`.
- Kein Kunden-Git mehr unter `C:\Users\holyd\DGDH\worktrees\ferienwohnung-bamberger`; der bisherige Kunden-Stand wurde aus dem Agenten-Bereich nach `C:\Users\holyd\Documents\Websites\kunden-archive\ferienwohnung-bamberger` verschoben.
last_updated_by: Codex (Strategy Freeze)
updated_at: 2026-03-23
