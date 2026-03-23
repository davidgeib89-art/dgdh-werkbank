# CURRENT - Live Baton

focus: Firmenfaehigkeit zuerst - sichtbarer CEO/Worker-Assignment-Run ist real wieder da; den kanonischen Worker->Reviewer->Merge-Pfad weiter boringly reliable machen
active_issue: CEO-Assignment-Run DAV-6 / DAV-7 ueber normalen Pfad; Heartbeat-Gate gefixt, Worker-Handoff jetzt der naechste Engpass
next:
  1) DAV-7 auf sauberem Worker-Handoff-Pfad erneut durchlaufen lassen (`worker-pr` -> `worker-done`)
  2) danach Reviewer ueber normalen Assignment-Pfad starten und CEO-Auto-Retrigger bis Merge pruefen
  3) nur noch echte Glue-Blocker im kanonischen Firmenpfad anfassen
blockers: CEO/Worker-Assignment-Start ist gefixt; aktueller Realblocker fuer DAV-7 war der Worker-Handoff ueber `gh pr create` statt `worker-pr`/`worker-done`

leitdokument_update (2026-03-23):
  doc: `doc/plans/2026-03-23-dgdh-leitdokument.md`
  operative_lesart:
    - Firmenfaehigkeit und reale Entlastung stehen ueber einem einzelnen Website-Usecase
    - `verein` bleibt ein guter moeglicher Proof, ist aber kein heiliges Pflichtziel
    - Open-Source-Inspiration und organische North-Star-Entwicklung sind erlaubt
    - Der naechste Schritt bleibt trotzdem klar, bounded und reviewbar
    - Grosse, klare Coder-Sprints sind explizit erlaubt

focus_freeze (2026-03-23 bis ca. 2026-04-02):
  doc: `doc/plans/2026-03-23-focus-freeze.md`
  allowed_priorities:
    - E2E-Firmenloop boringly reliable
    - naechster echter Faehigkeits-Beweis (`verein` ist optional)
  anti_drift_rule: Erhoeht das direkt Loop-Zuverlaessigkeit, Firmenfaehigkeit oder echte Vorarbeit? Wenn nein -> Backlog.
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
- Sichtbarkeits-Beweis 2026-03-23: aktiver Watcher `pnpm dev:watch` lief real; auf der aktiven lokalen DGDH-Company wurde Agent `Codex Dashboard Proof` erstellt und Issue `DAV-5` zugewiesen.
- Echter sichtbarer Run: `bbb60863-4be0-4207-bd47-c1cdbd5d33a2` lief ueber `assignment` von `14:56:26Z` bis `14:56:45Z`, war im Company-`live-runs`/Dashboard sichtbar und schrieb Transcript-Output plus Abschluss.
- Vorlauf-Gate bestaetigt: manueller Run `dd016ffa-1f69-479c-b4d1-cf9e42cc8c5d` blockte korrekt mit `Heartbeat gate: no issue assigned. Assign an issue before waking the agent.`
- Neuer Proof 2026-03-23: `DAV-6` (CEO) und `DAV-7` (Worker) liefen real ueber den normalen Assignment-/Automation-Pfad sichtbar in `live-runs`; CEO-Run `2c9bec50-8bf4-4c42-9996-330a293d8db5` aggregierte sauber und setzte den Parent auf `blocked/waiting`, solange `DAV-7` noch keine Approval hatte.
- Root-Cause-Fix 2026-03-23: DGDH-Seed und Heartbeat-Gate respektieren jetzt `wakeOnAssignment`/`wakeOnAutomation`, sodass normale Issue-Zuweisungen wieder echte Runs erzeugen.
- Worker-Realstand 2026-03-23: Run `efecc4d2-72c0-4d01-be96-89a1a8907e73` erzeugte real Datei, Branch, Commit und Push fuer `DAV-7`, blieb aber beim Handoff am falschen PR-Pfad (`gh pr create`) haengen; Worker-Template wurde direkt auf `worker-pr` + `worker-done` gehaertet.
- Leitdokument-Update: Firmenfaehigkeit zuerst; `verein` ist jetzt optionaler Proof-Usecase statt Pflichtanker.
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
- Neu 2026-03-23: `doc/plans/2026-03-23-research-and-skills-direction.md` dokumentiert gewollte spaetere Auslagerung in Skills (Progressive Disclosure) und asymmetrische Guardrails (CEO offen, Worker eng).
- CEO-Modell-Prioritaet ist fixiert: Pro -> Flash -> Flash-Lite (Claude/Codex mittelfristig plausibel).
- OSS-Researcher-Haltung ist aktiv, ordnet sich aber dem E2E-Loop-Fokus (Focus Freeze) unter.
last_updated_by: Codex
updated_at: 2026-03-23
