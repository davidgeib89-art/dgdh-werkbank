# MEMORY - Geteilter Zustand aller AIs

> Stable facts only. Unter 80 Zeilen halten.
> Live Baton steht in `CURRENT.md`.
> Datierten Sprint-/Run-Verlauf in `doc/archive/sprint-log.md` auslagern.

## Pflicht-Dokumente
- `CURRENT.md` - live baton
- `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` - kanonische operative Richtung
- `doc/plans/2026-03-23-focus-freeze.md` - aktiver Kurzfrist-Fokus gegen Drift
- `doc/plans/2026-03-23-dgdh-leitdokument.md` - lebendige CEO-nahe Richtungsbeschreibung; hoehere Lesart fuer die aktuelle Phase
- `doc/plans/2026-03-23-research-and-skills-direction.md` - kanonische Richtung fuer Skills, Guardrails und OSS-Adaption
- `doc/plans/2026-03-23-chat-ai-docking-prompt.md` - neutrales Andock-Briefing fuer neue Chat-AI-Fenster
- `doc/plans/2026-03-23-working-triad.md` - kurze visuelle Referenz fuer David -> Planner -> Coder
- `doc/plans/2026-03-21-role-template-architecture.md` - Rollen-/Packet-Architektur
- `doc/plans/2026-03-21-gemini-engine-to-role-architecture-progress-report.md` - juengster Engine-Beweisstand
- `doc/archive/sprint-log.md` - datierte Sprint-Historie

## DGDH Kern
- DGDH = David Geib - Digitales Handwerk; David ist der einzige menschliche Operator.
- Leitfragen: "Entlastet das David real?" UND "Wird die Firma faehiger - oder nur groesser?"
- Langfristige Richtung: David gibt die Richtung, die Maschine uebernimmt mit wachsender Modellfaehigkeit immer mehr Entscheidungen und Lieferung.
- Planer = Perplexity im Chat; Codex = grosser Operator-Sprint-Coder; Reviewer/Researcher = Gemini CLI; Claude nur wenn wirklich noetig.
- Researcher-Haltung: DGDH sucht aktiv OSS-Muster (wie Drop-box Handoffs, Skills), kopiert aber nur bei echtem Firmenhebel.
- Guardrail-Logik: Asymmetrisch. CEO/Planer agieren offener und strategischer; Worker eng gefuehrt; Spezialaufgaben landen kuenftig in fixierten Skills (Progressive Disclosure).
- CEO-Modell-Richtung: Gemini Pro bevorzugt -> Flash -> Flash-Lite. (Claude/Codex mittelfristig als CEO plausibel).

## Phase und Prioritaet (Korrektur 2026-03-22)
- DGDH ist in der PROTOTYPING-PHASE. Wir bauen an einer grossen Zukunft.
- Aktive Lesart: Firmenfaehigkeit zuerst, `verein` nur optionaler Proof-Usecase; Details stehen im Leitdokument.
- Revenue ist NICHT der aktuelle Fokus. Revenue ist Teil der langfristigen Vision - es kommt wenn die Maschine wirklich faehig ist.
- Solange Abokosten unter ~100 EUR/Monat bleiben, koennen wir gross denken ohne Revenue-Druck.
- Die Multi-Agent-Kette (CEO -> Assistent -> Worker -> Reviewer) IST der richtige Fokus - das ist die Kernfaehigkeit die DGDH ausmacht.
- Kleine Usecases fuer aufkommende Projekte (Kunden, eigene Ideen) sind Gelegenheiten die Maschine zu testen - nicht das Hauptziel.
- FALSCH: "Wir muessen jetzt Revenue-Kunden durch die Pipeline schicken". RICHTIG: "Wir bauen die Maschine die das irgendwann automatisch kann."
- AIs sollen KEINEN Revenue-Druck auf David ausueben. Grosse Vision > kurzfristiger Output.
- Neue Provider testen wenn sie Mehrwert versprechen ist erlaubt (z.B. MiniMax 2.7M Coding Plan als Experiment).
- Solange Gemini-Quoten nicht ausgenutzt werden, kein Druck neue Provider anzubinden - aber im Hinterkopf behalten.
- Open-Source-Inspiration, neue Ideen und organische North-Star-Entwicklung sind erlaubt; der naechste Schritt bleibt trotzdem klar und bounded.
- Grosse, zusammenhaengende Coder-Sprints sind explizit erlaubt, wenn Scope und Reviewbarkeit klar genug sind.
- Coder committen und pushen vor dem Bericht; Statusberichte beginnen mit `CODEX STATUSBERICHT`, `Von: Codex`, `An: Planer`.

## Wichtige IDs
- Company: `45b3b93e-8a30-4078-acc6-1c721b29b2ff`
- CEO-Agent: `4e93472c-78f6-409a-9adf-dc57454ea17c`
- Reviewer-Agent: `9e721036-35b7-446e-a752-2df7a1a8caad`
- Worker-Agent: `fe5d3d60-9e8a-4e0c-b494-087d3518755c`
- Projekt Astro/Keystatic: `0bce43aa-2bb9-4572-9938-f556a3279149`
- Projekt Gemini Benchmark: `8534a922-eaf2-4495-a250-648b0d1ca96b`

## Stabile Arbeitsregeln
- `CURRENT.md` traegt Fokus, naechsten Schritt und Blocker; `MEMORY.md` bleibt kompakt und stabil.
- Planer (Perplexity MCP) kann das private Repo lesen, aber Commit-Verifikation laeuft ueber Branch-Namen (`sha='main'`), nicht ueber rohen Commit-Hash.
- Wenn du stabile Facts oder Architektur aenderst, update `MEMORY.md` vor Handoff.
- High-Risk-Lokalops an DB, Workspace-Routing oder Ordnerstruktur bekommen vor Ausfuehrung einen kurzen Heads-up an den Planer, wenn es zeitlich geht.
- Issues immer mit `projectId` anlegen, sonst kein Workspace-Lookup.
- Direkte Codex-CLI-Arbeit ausserhalb eines Paperclip-Worker-Runs braucht spaeter einen formalen Worker-Abholrunner vor Review.

## Astro/Keystatic Workspace-Sicherheit
- Live Primary Workspace fuer Projekt `0bce43aa-2bb9-4572-9938-f556a3279149`: `C:\Users\holyd\DGDH\worktrees\astro-keystatic-template-geib`
- Ursprungs-Template ausserhalb des Agenten-Bereichs: `C:\Users\holyd\Documents\Websites\general\astro-keystatic-template-geib`
- Kunden-Git ausserhalb des Agenten-Bereichs: `C:\Users\holyd\Documents\Websites\kunden-archive\ferienwohnung-bamberger`
- Agenten duerfen nie direkt ein Kunden-Git als Primary Workspace verwenden.

## Bewiesener Systemstand
- `Mission -> CEO -> Child-Issue -> Worker -> Reviewer -> done` ist reproduzierbar bewiesen.
- CEO Aggregation Mode ist bewiesen; Parent bleibt bei Luecken offen und erzeugt Follow-up statt blind zu schliessen.
- `reviewer accepted` retriggert den CEO-Parent automatisch.
- CEO-Merge-/Konflikt-Logging toleriert jetzt nicht-persistierte API-Run-IDs; freie `runId`s landen in `details.apiRunId` statt den Loop ueber `activity_log.run_id` (UUID-FK) zu crashen.
- Loop-Detection `5x stop` macht Workspace-Cleanup (`git checkout -- .`) plus blocked Handoff.
- Reviewer-Simplicity-Criterion ist live.
- Worker-Abschluss hat jetzt ein hartes API-Gate: `POST /api/issues/:id/worker-done` mit Pflichtfeldern `prUrl`, `branch`, `commitHash`, `summary`.
- Worker kann GitHub-PRs direkt via REST API erstellen (`POST /api/issues/:id/worker-pr` -> `createGitHubPR`), ohne `gh` CLI-Abhaengigkeit.
- Prompt-Scope-Firewall V1 ist aktiv: Worker blockt ausserhalb `targetFolder`, Reviewer fordert bei Scope-Verstoss Revision.
- Harte Code-Firewall (Option B) bleibt Backlog und wird erst bei dokumentiertem Trigger aktiviert (`doc/backlog/scope-firewall-code.md`).
- Dual-Gemini-Failover schaltet bei exhausted / `429` / `RESOURCE_EXHAUSTED` von `account_1` auf `account_2`.
- `git_worktree` ist fuer Astro/Keystatic aktiv (`isolated`, `allowIssueOverride=true`).
- End-to-End Multi-Agent-Kette (Sprint S) laeuft durch (Prototyp-Reife), produziert aber isolierte Worktree-Inseln.
- Naechster Fokus fuer Produktionsreife: Merge-Orchestrator, harte Review-Gates, Scope-Firewall.

## Revenue Lane Foundation (langfristige Capability, nicht aktueller Fokus)
- Revenue Lane baut wiederverwendbare DGDH-Faehigkeiten, nicht Einzelfall-Abschluesse.
- Revenue-Pipelines sind funktional (Sprint E-I) aber NICHT der aktuelle Sprint-Fokus.
- Revenue kommt organisch wenn die Agent-Kette reif genug ist - kein kuenstlicher Druck.
- Packet-Kette: `CEO -> Image Preprocessing -> Content Extraction/Draft -> Schema Fill -> Review`.
- Image Packet Pipeline = `deterministic_tool`, Route `/api/companies/:companyId/revenue-lane/image-pipeline/process`.
- Content Extraction Worker = `free_api` auf Gemini Flash-Lite, Route `/api/companies/:companyId/revenue-lane/content-extractor/process`.
- Schema Fill Worker = `deterministic_tool`, Route `/api/companies/:companyId/revenue-lane/schema-fill/process`.
- Template-Apply Worker = `deterministic_tool`, Route `/api/companies/:companyId/revenue-lane/template-apply/process`, schreibt kontrolliert nur in den sicheren Template-Workspace und nie in ein Kunden-Git.
- Revenue-Lane-Ende-zu-Ende ist bis zum sicheren Astro/Keystatic-Template-Build bewiesen; lokaler Build-Nachweis im Template-Workspace erfolgt bei Bedarf via `npm ci` + `npm run build`.
- Lane Routing V1 ist live: `packetType + role` steuern die Lane; `deterministic_tool` blockiert LLM-Calls hart.
- Naechster Architektur-Schritt: Rollen-/Packet-Reifegrad weiterhaerten (CEO-Spec-Qualitaet, Branchenprofile, spaeter `local_model`-Aktivierung).