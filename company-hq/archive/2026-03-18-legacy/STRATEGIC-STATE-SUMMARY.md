# Strategic State Summary

## 1. Was DGDH eigentlich baut

- [confirmed] DGDH baut eine menschlich gefuehrte, governance-basierte AI-Operationsplattform, bei der Paperclip das technische Substrat ist und nicht die finale Produktidentitaet.
- [confirmed] David ist Board/Operator mit finaler Autoritaet fuer Ziele, Freigaben, Budgetgrenzen und Stop-Entscheidungen.
- [confirmed] Agenten sind spezialisierte, gleichberechtigte Ausfuehrungsrollen innerhalb harter Policy-Grenzen.
- [inferred] Der zentrale Unterschied zu klassischem Paperclip-Einsatz ist der Shift von "autonomem Agentenbetrieb" zu "regulierter Unternehmensfuehrung mit Audit- und Kostenkontrolle".

## 2. Was aktuell schon vorhanden ist

- [confirmed] Governance-Stack ist dokumentiert und versioniert: Constitution, Autonomy Modes, Budget Policy, Escalation Matrix, Idle Policy, Task Brief Template.
- [confirmed] Repo-/Worktree-Modell ist definiert: ein kanonisches Repo, ein aktiver Entwicklungs-Worktree, getrennte dokumentierte DGDH-Zentrale in company-hq.
- [confirmed] Runtime-/Dashboard-/Observability-Basis existiert: Run-Historie, Event-Stream, Kosten- und Usage-Felder, Heartbeat-Lifecycle.
- [confirmed] Gemini-Integration ist als kontrollierte Pilot-Lane etabliert, waehrend Codex/Claude-Lanes in Paperclip-Runtime dormant bleiben.
- [confirmed] Token-Economy ist als Policy verankert (Dormant -> Controlled Pilot -> Active Production mit Gates).
- [confirmed] Wichtige operative Entscheidungslinie: Build-Lane ueber Mensch + Copilot, Live-Lane nur eng kontrolliert.
- [inferred] Die aktuelle Infrastruktur ist ausreichend fuer kontrollierte Validierung, aber noch nicht fuer stabile Multi-Lane-Autonomie.

## 3. Was die strategischen Leitplanken sind

- [confirmed] Token-Sparsamkeit als Top-Prioritaet (Kosten als Governance-Objekt).
- [confirmed] Regulierte Autonomie statt freier Autonomie (One run = one work packet, Eskalation vor Scope-Ausweitung).
- [confirmed] Nachvollziehbarkeit und Auditierbarkeit sind Pflicht.
- [confirmed] Shared Memory als strategische Richtung fuer spaetere Effizienzsteigerung.
- [confirmed] Spezialisierung statt generischer Einheitsagent.
- [confirmed] Multi-Provider-/Abo-Strategie ist vorgesehen (Claude/Codex/Gemini + spaeter weitere kosteneffiziente Optionen).
- [inferred] OpenRouter-/Free-Model-Rollen sind realistisch als eng begrenzte Utility-Layer, nicht als Kern-Planungsrollen.

## 4. Zielbild fuer feste Rollen

- [confirmed] Feste Rollen sind strategisch konsistent mit Governance, Auditierbarkeit und Token-Disziplin.
- [inferred] Kernrollen, die sich bereits klar abzeichnen: Board, Strategy/Planning, Builder/Executor, Research/Review, QA/Audit, Memory/Archiv.
- [inferred] Teure/high-intelligence Rollen: Strategy/Planning, Architecture Review, High-Risk QA.
- [inferred] Spaetere low-cost/utility/batch Rollen: Extraktion, Klassifikation, Strukturierung, einfache Rewrites, Log-Sichtung.
- [confirmed] Dauerhafte Rolleninformationen sollten in stabilen Profilen liegen (Mandat, Grenzen, Eskalationsregeln, Budgetklasse, Toolrechte).
- [inferred] Task-Layer sollte nur variablen Auftrag enthalten (Ziel, Scope, Akzeptanzkriterien, Fristen, erlaubte Artefakte).

## 5. Vermutete Token-Optimierungshebel

- [confirmed] Teuer sind heute vor allem wiederholte Kontext-Reakquise, grosse statische Instruktionsflaechen und Session-Reset-Muster.
- [confirmed] Stabilere Session-/Prompt-Strategien und delta-orientierter Kontext sind dokumentierte Hebel.
- [inferred] Feste Rollen sparen Tokens, weil wiederkehrende Governance-/Arbeitslogik nicht pro Task neu erklärt werden muss.
- [inferred] Memory + Repo-Skills + strukturierter Kontext koennen Token senken, wenn sie kompakt, rollenspezifisch und delta-faehig bleiben.
- [open question] Wie stark Rollenhintergrund im Live-Prompt materialisiert wird, ist je Adapter noch nicht voll transparent.
- [open question] Risiko zu starrer Rollen: geringe Flexibilitaet bei neuartigen Aufgaben oder Grenzfaellen.

## 6. Offene Architekturfragen

- [open question] Wie wird die Rollenarchitektur technisch getrennt von Adapter-/Model-Routing umgesetzt (Role -> Adapter -> Model -> Budget), ohne Prompt-Drift?
- [open question] Welche Felder sind als kanonische Telemetrie fuer Governance-Entscheidungen verpflichtend?
- [open question] Wie wird Shared Memory repo-uebergreifend versioniert, validiert und budgetiert?
- [open question] Welche Policy-Gates sind fuer Aktivierung weiterer Provider-Lanes (jenseits Gemini) minimal erforderlich?
- [open question] Welche Teile bleiben Paperclip-Basislogik, welche werden DGDH-eigene Plattformlogik?

## 7. Empfohlene naechste Schritte

1. [confirmed] Rollen- und Routing-Vertrag als schlankes Architekturartefakt festziehen: Role -> Adapter -> Model -> Budget -> Approval-Mode.
2. [confirmed] Prompt-Schichtung explizit standardisieren: Company-Layer, Role-Layer, Task-Layer, Skill/Repo-Layer (mit Groessenlimits je Layer).
3. [inferred] Ein kleines Rollenpilot-Set (2-3 Rollen) zuerst in kontrollierten Runs gegen Token- und Qualitaetsmetriken testen.
4. [confirmed] Telemetriepflichten fuer Run-Audit festschreiben (Preflight, Invoke-Typ, Scope-Evidenz, Budgetnaehe, Eskalationsgrund).
5. [inferred] Erst nach stabilen Pilot-KPIs weitere Provider/low-cost Utility-Lane freischalten.

## Recommended role architecture hypothesis (draft)

- [confirmed] Board Operator (David): Zielvorgabe, Budget, Finalentscheidung, Kill-Switch.
- [inferred] Strategy Planner: Zerlegt Ziele in governte Work-Pakete und entscheidet Risikoklasse.
- [inferred] Builder Executor: Liefert Implementierung innerhalb enger Scope- und Testregeln.
- [inferred] Research Reviewer: Prueft Alternativen, Gegenhypothesen, Faktenlage.
- [inferred] QA Auditor: Validiert Akzeptanzkriterien, Policy-Compliance und Run-Qualitaet.
- [inferred] Memory Archivist: Pflegt verdichtete, rollenspezifische und wiederverwendbare Kontexte.
- [open question] Ops Runtime Steward als eigene Rolle: sinnvoll fuer Lane-Aktivierung, Observability-Health und Kostensteuerung.
- [open question] Low-cost Utility Workers: Aktivierung nur mit klarer Tool-/Scope-Box und sauberen Uebergabepunkten.
