# CURRENT - Live Baton

focus: End-to-End Kette mit echten Packets unter neuen Guardrails beweisen
active_issue: Smoke-Run mit Worker-PR-Gate + Reviewer + CEO-Aggregation
next:
  1) Echter Kettenlauf: Parent -> CEO -> Worker (PR) -> Reviewer -> CEO Aggregation
  2) Scope-Firewall beobachten: Drift-Faelle sammeln und Trigger fuer Option B pruefen
  3) Danach Sprint V: Worktree-Lifecycle-Management (nur falls weiter noetig)
blockers: keiner (T, T.1 und U sind implementiert und verifiziert)
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
- Fuer Projekt Astro/Keystatic zeigt der Project-Workspace auf den sicheren Template-only-Workspace `C:\\Users\\holyd\\DGDH\\worktrees\\astro-keystatic-template-geib`.
- Kein Kunden-Git mehr unter `C:\\Users\\holyd\\DGDH\\worktrees\\ferienwohnung-bamberger`; der bisherige Kunden-Stand wurde aus dem Agenten-Bereich nach `C:\\Users\\holyd\\Documents\\Websites\\kunden-archive\\ferienwohnung-bamberger` verschoben.
last_updated_by: Codex (Coder)
updated_at: 2026-03-23
