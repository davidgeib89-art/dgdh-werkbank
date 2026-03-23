# CURRENT - Live Baton

focus: Firmenfaehigkeit zuerst - Reviewer Semantic Acceptance Guardrail V1 geschlossen; naechsten echten Firmenlauf unter gehaertetem Review fahren
active_issue: Reviewer Semantic Acceptance Guardrail V1; semantische Review-Wahrheit statt formaler Acceptance, danach naechster echter Firmenlauf
next:
  1) Revision-/Re-Review-Schleife nach echtem `changes_requested` auf DAV-13 sauber durchfahren
  2) policy-basierten `done`-Pfad fuer review-optionale Denk-/Aggregationsarbeit im echten Run beobachten
  3) nur noch reale Glue-Blocker zwischen Worker -> Reviewer -> Merge anfassen
blockers: kein neuer Meta-Blocker; naechster Produktionsschmerz liegt jetzt in der sauberen Revision-/Reviewer-/Merge-Fortsetzung nach realem semantischem `changes_requested`

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
- Delegation Guardrails V1: CEO-Template unterscheidet jetzt explizit Direct Answer Mode vs Delegation Mode; reine Denk-/Entscheidungs-/Aggregationsarbeit darf direkt beantwortet werden, operative Umsetzung muss delegiert werden.
- Review Policy V1: Packet-Metadaten `executionIntent` + `reviewPolicy` sind kanonisch; Aggregation behandelt review-optionale Packets nur bei Status `done` als komplett, waehrend Umsetzungs-/Artefakt-Arbeit weiter Approval braucht.
- Reviewer Semantic Acceptance Guardrail V1: Reviewer-Prompt fordert jetzt Semantic Compliance + Point-by-point verification; das Verdict-API blockt fehlende oder oberflaechliche `doneWhenCheck`-/`evidence`-Felder.
- Neuer Realbeweis 2026-03-23: DAV-12 -> DAV-13 lief real ueber CEO assignment -> Worker assignment -> Reviewer assignment; Reviewer gab fuer DAV-13 `changes_requested`, weil im Artefakt der Punkt `Semantic Truth Test` inhaltlich fehlte. Der False-Positive-Schmerz reproduzierte sich damit NICHT.
- Direkter Glue-Fix 2026-03-23: Worker-Prompt wurde nach realem `POST /api/issues/:id/worker-done`-400 gehaertet; `summary.files` muss jetzt explizit als JSON-Array gesendet werden, nicht als String.
- Leitdokument-Update: Firmenfaehigkeit zuerst; `verein` ist jetzt optionaler Proof-Usecase statt Pflichtanker.
- Neue spaetere Richtungsabsicherung: `doc/plans/2026-03-23-dgdh-evolution-lane-werkbank-baut-werkbank.md` setzt Self-Learning als replay-/benchmark-getriebene Evolution-Lane, nicht als Live-Produktionssprint.
- Handoff: Copilot uebernimmt ab dem naechsten Sprint die Coder-Rolle; erster Zielkontext ist der naechste reale Firmenlauf unter gehaertetem Review.
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
