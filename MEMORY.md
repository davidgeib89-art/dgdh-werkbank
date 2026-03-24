# MEMORY - Geteilter Zustand aller AIs

> Stable facts only. Unter 80 Zeilen halten.
> Live Baton steht in `CURRENT.md`.
> Datierten Sprint-/Run-Verlauf in `doc/archive/sprint-log.md` auslagern.

## Pflicht-Dokumente
- `CURRENT.md` - live baton
- `SOUL.md` - gemeinsamer Wesensvertrag der DGDH-Agentenwelt
- `TRINITY.md` - shared Vertrag fuer Davids direkte Assistenten `Codex`, `ChatGPT` und `Copilot`
- `CODEX.md` - rollenscharfer Wiedereinstieg fuer Codex als Planner/Reviewer/Fallback-Coder
- `CHATGPT.md` - rollenscharfer Wiedereinstieg fuer ChatGPT als externer Planner/Reflektor
- `COPILOT.md` - duenne Copilot-Docking-Datei ueber `EXECUTOR.md`
- `EXECUTOR.md` - kompakter Regelkern fuer Copilot und andere ausfuehrende Langlauf-Agenten
- `doc/DGDH-AI-OPERATOR-RUNBOOK.md` - stabile Bedienungsanleitung fuer lokale DGDH-/Paperclip-Firmenruns
- `doc/plans/2026-03-24-dgdh-first-principles-operating-doctrine.md` - kanonische Verdichtung: DGDH als governte David-Aufmerksamkeits-Kompressionsmaschine
- `doc/plans/2026-03-24-dgdh-memory-learning-self-improvement-first-principles.md` - kanonische Lesart fuer Firmengedachtnis, Lernen, Self-Learning und Self-Improving
- `doc/plans/2026-03-24-dgdh-soul-layer-and-boardmeeting-direction.md` - warum `SOUL.md` eine gemeinsame Wesensschicht ist und wie sie unter Governance bleibt
- `doc/plans/2026-03-24-dgdh-ai-trinity-and-operator-stack.md` - aktueller AI-Stack, Rollenwahrheit und Run-/Quota-Oekonomie
- `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` - kanonische operative Richtung
- `doc/plans/2026-03-23-focus-freeze.md` - aktiver Kurzfrist-Fokus gegen Drift
- `doc/plans/2026-03-23-dgdh-leitdokument.md` - lebendige CEO-nahe Richtungsbeschreibung; hoehere Lesart fuer die aktuelle Phase
- `doc/plans/2026-03-23-firmenlauf-ux-direction.md` - spaetere UX-Richtung: Firmenlauf lesbar machen statt Library-Wechsel
- `doc/plans/2026-03-23-research-and-skills-direction.md` - kanonische Richtung fuer Skills, Guardrails und OSS-Adaption
- `doc/plans/2026-03-23-dgdh-evolution-lane-werkbank-baut-werkbank.md` - spaetere Evolution-Lane: kontrollierte replay-/benchmark-getriebene Selbstverbesserung statt freier Live-Selbstoptimierung
- `doc/plans/2026-03-23-research-role-and-skill-invocation-direction.md` - Researcher als spaeterer Spezialpfad; klare Trennung Rolle vs Skill
- `company-hq/research/2026-03-24-724-office-dgdh-transfer-matrix.md` - 724-office ist fuer DGDH nur als Primitive-Quelle relevant: file-layered identity, visible primitives, spaeter Memory/Diagnostics; nicht als self-evolving Zielarchitektur
- `company-hq/research/2026-03-24-airweave-dgdh-transfer-matrix.md` - Airweave ist fuer DGDH nur als Retrieval-/Architektur-Signal relevant: spaetere shared context capability und Domain/Adapter/Protocol-Trennung; nicht als Plattform- oder Integrationssprint
- `doc/plans/2026-03-23-chat-ai-docking-prompt.md` - neutrales Andock-Briefing fuer neue Chat-AI-Fenster
- `doc/plans/2026-03-23-working-triad.md` - kurze visuelle Referenz fuer David -> Planner -> Coder
- `doc/plans/2026-03-21-role-template-architecture.md` - Rollen-/Packet-Architektur
- `doc/plans/2026-03-21-gemini-engine-to-role-architecture-progress-report.md` - juengster Engine-Beweisstand
- `doc/archive/sprint-log.md` - datierte Sprint-Historie

## DGDH Kern
- DGDH = David Geib - Digitales Handwerk; David ist der einzige menschliche Operator.
- DGDH ist eine governte David-Aufmerksamkeits-Kompressionsmaschine: David gibt Richtung, die Maschine soll mit minimalen David-Beruehrpunkten reale, reviewte, gemergte Arbeit liefern.
- Leitfragen: "Entlastet das David real?" UND "Wird die Firma faehiger - oder nur groesser?"
- Primaerer Messwert in dieser Phase: sinkende David-Minuten pro Firmenlauf; Revenue bleibt Lagging Indicator von Capability.
- Langfristige Richtung: David gibt die Richtung, die Maschine uebernimmt mit wachsender Modellfaehigkeit immer mehr Entscheidungen und Lieferung.
- Aktuelle Operator-Realitaet: David als Operator; Codex/GPT-5.4 als Planner/Reflektor und bei Bedarf bounded Coder; Copilot als langlaufender High-Power-Coder-Agent; ChatGPT als externer GPT-5.4-Reflektor; Gemini bleibt Reviewer/Researcher-Lane.
- Review ist Gate und Sensor zugleich: es schuetzt Qualitaet und liefert Drift-/Lernsignale fuer Packet, Handoff, Prompt und System.
- Firmengedachtnis ist gestufte Kompression statt Vollkontext: Betriebszustand -> episodisch -> semantisch -> prozedural -> strategisch.
- Lernen folgt fuer DGDH der Formel `Run -> Signal -> Verdichtung -> Promotion`.
- Researcher-Haltung: DGDH sucht aktiv OSS-Muster (wie Drop-box Handoffs, Skills), kopiert aber nur bei echtem Firmenhebel.
- Research ist spaeter wahrscheinlich nicht nur Haltung, sondern auch ein bewusst nutzbarer Spezialpfad / Spezialmitarbeiter; Skills standardisieren spaeter wiederkehrende Teile dieses Pfads.
- Guardrail-Logik: Asymmetrisch. CEO/Planer agieren offener und strategischer; Worker eng gefuehrt; Spezialaufgaben landen kuenftig in fixierten Skills (Progressive Disclosure).
- Wissensverteilung: Invarianten in Produktcode, Rollenverhalten in Role Templates, schmale wiederkehrende Spezialprozeduren spaeter in Skills, Bedienwissen im Operator-Runbook.
- `SOUL.md` ist die gemeinsame Wesens- und Beziehungsschicht der Firma: shared core ueber Rollen, aber unter Governance; sie ersetzt weder Memory noch Rollenlogik noch Skills.
- `TRINITY.md` plus `CODEX.md` / `CHATGPT.md` / `COPILOT.md` sind die durable Identity-Docks der direkten David-Assistenten; wenn einer driftet, soll David ihn ueber genau diese Datei wieder einklinken koennen.
- `EXECUTOR.md` ist die kompakte Execution-Schicht fuer Langlauf-Agenten: richtige Runtime-Identitaet vor API-Vertrauen, API vor Browser, Prozess vor Port und kein Completion-Loop-Theater.
- OSS-Research wird fuer DGDH per Primitive-Filter gelesen: uebernehmen wollen wir Muster wie file-layered identity, visible primitives und spaetere firm-memory/diagnostics; nicht ganze assistant-first oder self-evolving Produktidentitaeten.
- Retrieval ist fuer DGDH spaeter eine eigene Capability-Schicht, aber nicht die aktuelle Produktform: shared context/retrieval ja, Retrieval-Plattform- oder Integrationsbreiten-Sprint nein.
- Sobald der Firmenloop auf canonical `main` wiederholt boringly durchlaeuft, verschiebt sich der naechste Hebel von versteckter Bootstrap-Infra zu operator-facing Lesbarkeit: die richtige naechste Frage lautet dann nicht mehr "welcher Glue-Bug fehlt?", sondern "wie sieht David die Firmenwahrheit mit moeglichst wenig Minuten?"
- Self-Learning bedeutet spaeter governte Hypothesenbildung aus echten Firmenlaeufen; Self-Improving promoted bewaehrte Verbesserungen erst nach Replay/Benchmark/PR-Pruefung in den Standardbetrieb.
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
- Fuer spaetere Run-UI gilt: Lesestruktur und Operator-Orientierung sind wichtiger als ein Library-Wechsel; `Firmenlauf lesbar machen` ist der richtige Sprinttitel, nicht `ArrowJS testen`.
- Grosse, zusammenhaengende Coder-Sprints sind explizit erlaubt, wenn Scope und Reviewbarkeit klar genug sind.
- Copilot soll bevorzugt grosse DoneWhen-orientierte Sprints ziehen; knapper budgetierte Codex-Interaktionen werden fuer Reflexion, Sprint-Schnitt und gezielte Eingriffe genutzt.
- Reale Firmenlaeufe sind bevorzugte Prototyping-Schleifen; kein Test-Theater wenn ein echter Lauf bereits den naechsten Hebel sichtbar macht.
- Coder committen und pushen vor dem Bericht; Statusberichte beginnen mit `CODEX STATUSBERICHT`, `Von: Codex`, `An: Planer`.

## Wichtige IDs
- Projekt Astro/Keystatic: `0bce43aa-2bb9-4572-9938-f556a3279149`
- Projekt Gemini Benchmark: `8534a922-eaf2-4495-a250-648b0d1ca96b`

## Stabile Arbeitsregeln
- `CURRENT.md` traegt Fokus, naechsten Schritt und Blocker; `MEMORY.md` bleibt kompakt und stabil.
- `main` ist die einzige kanonische operative Branch-Wahrheit. `main-local` ist nur noch Legacy-/Uebergangsrest und soll nicht mehr als aktive Sprint-Basis verwendet werden.
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
- `worker-pr` toleriert jetzt wie `worker-done`/`reviewer-verdict` nicht-persistierte API-Run-IDs; freie `runId`s landen in `details.apiRunId` statt am `activity_log.run_id`-FK zu crashen.
- GitHub-PR/Merge-Service faellt jetzt bei fehlenden Prozess-Env-Variablen auf vorhandene Git-Credentials und den `origin`-Remote-Slug zurueck; `worker-pr`, Merge und CEO-Summary laufen damit auch in lokalem Dev-Setup ohne explizites `GITHUB_TOKEN`/`GITHUB_REPOSITORY` im Serverprozess.
- Prompt-Scope-Firewall V1 ist aktiv: Worker blockt ausserhalb `targetFolder`, Reviewer fordert bei Scope-Verstoss Revision.
- Harte Code-Firewall (Option B) bleibt Backlog und wird erst bei dokumentiertem Trigger aktiviert (`doc/backlog/scope-firewall-code.md`).
- Dual-Gemini-Failover schaltet bei exhausted / `429` / `RESOURCE_EXHAUSTED` von `account_1` auf `account_2`.
- `git_worktree` ist fuer Astro/Keystatic aktiv (`isolated`, `allowIssueOverride=true`).
- Frische Projekte mit git-backed lokalem Primary-Workspace auto-bootstrappen jetzt auf `executionWorkspacePolicy = isolated` mit `workspaceStrategy.type = git_worktree`, auch wenn der Create-Pfad keine explizite Policy mitsendet; repo-only oder nicht-git-backed Workspaces brauchen weiter explizite Policy oder Preset.
- `GET /api/issues/:id/company-run-chain` liefert jetzt die schmale Kettenwahrheit `assigned -> run started -> worker done -> reviewer assigned -> reviewer run -> merged -> parent done` fuer Parent-/Child-Laeufe.
- End-to-End Multi-Agent-Kette (Sprint S) laeuft durch (Prototyp-Reife), produziert aber isolierte Worktree-Inseln.
- Dashboard-Sichtbarkeit fuer echte Agenten-Runs ist lokal bewiesen: ein zugewiesenes Issue triggert einen sichtbaren `codex_local`-Run im Dashboard/`live-runs` mit laufendem Transcript und Abschluss.
- Ein manueller Heartbeat ohne zugewiesenes Issue blockt erwartbar am Gate `no_assigned_issue`; fuer sichtbare reale Runs muss der bestehende Issue-Assignment-Pfad genutzt werden.
- DGDH-Seed-Agenten tragen jetzt eine explizite Heartbeat-Runtime-Policy fuer `wakeOnAssignment`/`wakeOnAutomation`; der bisherige Seed ohne diese Flags erzeugte trotz korrekter Issue-Zuweisung keine echten Runs.
- Der Heartbeat-Gate unterscheidet jetzt wieder source-spezifisch zwischen `assignment`, `automation` und `on_demand`, statt alle Nicht-Timer-Wege unter einem gemeinsamen `wakeOnDemand`-Schalter zu blocken.
- `gemini_local` haelt jetzt `adapterConfig.model = auto` auch unter `applyModelLane` stabil; die Routing-Preflight-Lane darf weiter gerechnet werden, aber der CLI-Adapter bekommt in diesem Fall kein erzwungenes explizites `--model` mehr.
- Das Worker-Role-Template erzwingt jetzt fuer kanonische PR/Handoffs den Paperclip-Pfad `worker-pr` -> `worker-done` statt `gh pr create`.
- Das CEO-Role-Template erzwingt fuer execution-lastige Parent-Issues jetzt API-first statt Repo-Read-Drift: Child-Status-Check zuerst, dann Agent-Read, dann direkte Packetisierung statt breiter Repo-Lektuere.
- Delegation Guardrails V1 sind live: CEO darf direkt nur Denk-/Entscheidungs-/Aggregationsarbeit erledigen; operative Umsetzung, Code, Datei-, Git-, PR- und Merge-Arbeit muss delegiert werden.
- Review Policy V1 ist kanonisch: review-optionale Packets sind nur fuer reine Denk-/Plan-/Aggregationsarbeit mit expliziter Packet-Policy erlaubt; alles mit Umsetzung, Datei-Aenderung, Code, Git/PR/Merge oder konkretem Artefakt bleibt review-required/default-on.
- Reviewer Semantic Acceptance Guardrail V1 ist live: Reviewer-Prompt verlangt semantische Punkt-fuer-Punkt-Pruefung; `POST /api/issues/:id/reviewer-verdict` verlangt jetzt substantive `doneWhenCheck` + `evidence`, sodass oberflaechliche oder fehlende Begruendungen nicht mehr accepted durchrutschen.
- Der reale DAV-12/DAV-13-Baton-Pfad ist bewiesen: `changes_requested -> worker revision -> reviewer re-review -> merge -> summary` lief fachlich durch.
- Isolierte Git-Worktree-Ausfuehrung ist im DGDH-Repo real bewiesen: DAV-13 lief in `C:\Users\holyd\DGDH\worktrees\dgdh-werkbank\.paperclip\worktrees\DAV-13-reviewer-semantic-truth-artifact-implementation`; der Human-Main-Worktree blieb separat.
- Windows-Glue-Fact: fuer tiefe isolierte Git-Worktrees in diesem Repo ist lokal `git config core.longpaths true` noetig.
- Merge-Hygiene-Fact: alte Issue-Branch-Historie kann versehentlich branch baggage auf `main` ziehen; die fremden `hyperagents.pdf`-Artefakte wurden danach bounded wieder aus `main` entfernt.
- Lokale Paperclip-Identity ist gehaertet: repo-lokale `.paperclip/.env` und `.paperclip/config.json` schlagen stale ambient `PAPERCLIP_HOME`/`PAPERCLIP_INSTANCE_ID`/`PAPERCLIP_CONFIG`; ohne lokalen Kontext faellt Paperclip auf `~/.paperclip/instances/default` zurueck.
- Reviewer-Review-Target nutzt fuer Worker-Handoffs kanonisch `issue.worker_done_recorded` plus `issue.worker_pull_request_created`; rohes Worker-stdout ist nur Fallback.
- Der reale DAV-16-Lauf ist geliefert: Worker -> Reviewer -> merge lief mit echten GitHub-Spuren; der Parent DAV-15 endete danach `done` mit Merge-Summary.
- Der reale DAV-17/DAV-18-Lauf auf canonical `main` ist geliefert: Worker erstellte PR #10 fuer den Regressionstest zu `ensure-seed-data`, Reviewer validierte den Test real mit `npx vitest run src/__tests__/ensure-seed-data.test.ts`, `DAV-18` endete `merged`, Parent `DAV-17` endete `done`.
- Der reale DAV-24/DAV-25-Schlusspfad ist geliefert: nach Fix des `model=auto`-Routing-Leaks erzeugte der CEO auf sauberem `main` wieder echte Child-Issues, `DAV-25` lief durch Worker -> Reviewer -> Merge bis `merged`, `DAV-24` endete danach `done`.
- `POST /api/issues/:id/worker-done` weist jetzt auf dem Live-Pfad einen idle Reviewer zu, setzt den Issue-Assignee auf diesen Reviewer und queued sofort den Reviewer-Wakeup; der fruehere `in_review`-Stillstand ohne Reviewer-Run ist damit beseitigt.
- Issue-Create/Assign/Status/Checkout/Wakeup-Kontexte tragen jetzt wieder reiche Firmenwahrheit statt nur `issueId`: `companyId`, `projectId`, `goalId`, `parentId` und `issueIdentifier` werden im `contextSnapshot` mitgegeben, damit nachfolgende Runs nicht mehr unnötig auf `companyId/projectId = none` degradieren.
- Der reale DAV-31/DAV-32-Lauf auf canonical `main` ist geliefert: neues isoliertes Projekt, Worker blieb aus dem Human-Main-Worktree heraus, Reviewer startete automatisch, PR `#15` landete und Parent `DAV-31` endete `done`.
- Der reale DAV-33/DAV-34-Lauf validiert die Produktisierung live: frisches Projekt ohne manuelle `executionWorkspacePolicy` kam direkt mit isolierter `git_worktree`-Policy zurueck, Child `DAV-34` endete `merged` (PR `#16`), Parent `DAV-33` endete `done`.
- Reviewer-Verdict-Contract-Fact: `POST /api/issues/:id/reviewer-verdict` akzeptiert bei `accepted` nur `requiredFixes: []`; `"none"` oder `["none"]` werden vom Schema abgewiesen.
- Evolution Lane ist kanonisch als spaetere Richtung gesetzt: kontrollierte Selbstverbesserung laeuft replay-/benchmark-getrieben, PR-basiert und mit Human-Merge, nicht als freie Live-Selbstoptimierung.

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
