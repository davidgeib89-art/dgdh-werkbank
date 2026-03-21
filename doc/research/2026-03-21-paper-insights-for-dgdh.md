# Paper Insights fuer DGDH

Hinweis: Alle Seitenangaben beziehen sich auf die PDF-Seiten von `doc/experimental/research.pdf`.

## 1. Executive Summary

Das Paper ist ein sehr breiter Survey ueber Code-LLMs, SWE-Agents, Tool-Use, Memory, Safety und Produktionsanwendungen. Fuer DGDH ist der groesste Wert nicht bei Training oder Benchmarks, sondern bei konkreten Runtime-Patterns fuer Worker, Reviewer und Engine. Am klarsten uebertragbar sind einfache gestufte Repair-Loops, review-spezifische Arbeitsteilung, tool-in-the-loop Validierung, explizite Tool-State-Maschinen und risk-adaptive Guardrails. Das Paper stuetzt unsere Rollenrichtung stark: spezialisierte Rollen und klare Handoffs tauchen mehrfach als erfolgversprechendes Muster auf. Gleichzeitig warnt es indirekt vor zu frueher Multi-Agent-Komplexitaet: vereinfachte Workflows sind oft stabiler, billiger und praktischer. Fuer Memory zeigt das Paper eine Richtung, die gut zu DGDH passt: kleine externe Memory-Slices und wiederverwendbare Skills statt immer groesserer Prompt-Dumps. Fuer Tooling ist MCP als request-response-state-update-reinvoke-Zyklus besonders relevant, weil es Interpretierbarkeit und Recoverability verbessert. Fuer Safety ist die wichtigste Botschaft, dass statische Sandbox-Schalter nicht reichen; gute Systeme kombinieren Vorab-Pruefung, Runtime-Policy-Enforcement und aktive Intervention. Fuer Reviewer ist besonders wertvoll, dass starke Systeme Review-Dimensionen trennen, Multi-File-Kontext beachten und statische Analyse vor das LLM schalten. Insgesamt gibt das Paper DGDH einige konkrete Upgrades fuer die aktuelle CEO -> Worker -> Reviewer-Lane, aber es liefert keinen Grund, jetzt schon eine groessere Agenten-Architektur aufzubauen.

## 2. Transferable Patterns

### [Agentless-Default-Flow]
- **Paper-Referenz:** p.120, Section 5.1.2 Software Development; Agentless [1114], PatchPilot [544]
- **Was es ist:** Das Paper beschreibt einen einfachen Drei-Stufen-Flow aus `localization -> repair -> patch validation` und betont, dass vereinfachte Workflows Systemkomplexitaet senken, Ressourcen besser nutzen und stabiler laufen.
- **Warum relevant fuer DGDH:** Das passt direkt zu unserer North-Star-Haltung. Fuer viele bounded Worker-Packets ist ein klarer Default-Flow plus Reviewer sinnvoller als frueh versteckte Zusatz-Agenten oder komplizierte Subrollen.
- **Umsetzungsaufwand:** klein
- **Prioritaet:** sofort

### [Repair-State-Machine]
- **Paper-Referenz:** p.189, Section 9.4 Code Repair and Verification Applications; RepairAgent [15]
- **Was es ist:** RepairAgent modelliert Bugfixing als explizite Zustandsmaschine mit den Phasen `fault localization`, `hypothesis generation`, `patch generation`, `validation` und `iterative refinement`. Der Zustand haelt fest, welche Hypothesen und Patches schon versucht wurden.
- **Warum relevant fuer DGDH:** Das ist ein sehr direktes Upgrade fuer Worker-Bugfix-Runs. Statt freiem Trial-and-Error koennte der Worker in einem sichtbaren, auswertbaren State-Loop arbeiten, waehrend der Reviewer gegen `doneWhen` und Validierungsergebnisse prueft.
- **Umsetzungsaufwand:** mittel
- **Prioritaet:** sofort

### [Reviewer-Matrix-und-Tiefe]
- **Paper-Referenz:** p.113, Section 5.1.2 Program Analysis, Agent-Based Review Frameworks; Hydra-Reviewer [847], CodeAgent [938]. p.191, Section 9.5 Pull Request Review and Quality Assurance; CodeRabbit [201]
- **Was es ist:** Gute Review-Systeme trennen Review in Dimensionen wie Logik, Security und Lesbarkeit, nutzen Rollen oder Routing fuer verschiedene Review-Typen und erlauben unterschiedliche Review-Tiefen von schnell bis tief semantisch.
- **Warum relevant fuer DGDH:** Unser Reviewer sollte nicht nur `accepted` oder `needs_revision` als Freitext liefern. Ein dimensionsbasiertes Urteil mit einstellbarer Tiefe passt direkt auf Reviewer-Packets und hilft David, schnelle Routine-Reviews von tieferen Sicherheits- oder Architektur-Checks zu unterscheiden.
- **Umsetzungsaufwand:** mittel
- **Prioritaet:** sofort

### [Static-Analysis-im-Loop]
- **Paper-Referenz:** p.165, Section 7.4.2 Proactive Defense and Pre-Execution Validation
- **Was es ist:** Das Paper empfiehlt, klassische Analysewerkzeuge nicht separat neben dem Agenten laufen zu lassen, sondern ihre Findings strukturiert in einen `tool-in-the-loop`-Korrekturzyklus zurueckzuspeisen.
- **Warum relevant fuer DGDH:** Das ist ein sehr guenstiger Hebel fuer Worker und Reviewer. Lint, Tests, Security-Scanner oder Format-Checks koennen vor `accepted` oder vor riskanten Abschluessen automatisch als strukturierter Gegenbeweis in den Prompt zurueckfliessen.
- **Umsetzungsaufwand:** klein
- **Prioritaet:** sofort

### [Editable-Run-Plan-und-Fallback]
- **Paper-Referenz:** p.149, Section 6.3.2 Computer-Use Agents; OB-1, Wrap [729]
- **Was es ist:** Wrap fuehrt eine editierbare To-do-Liste waehrend des Runs und aktualisiert sie, wenn neue Informationen oder Abweichungen auftauchen. Zusaetzlich werden fehlgeschlagene Requests bei Tool-, Service- oder Rate-Limit-Problemen ueber alternative Modelle erneut versucht.
- **Warum relevant fuer DGDH:** Das adressiert zwei reale DGDH-Probleme gleichzeitig: Scope-Drift in laengeren Worker-Runs und Token-Verschwendung bei wiederholten Tool-/Command-Fehlern. Eine sichtbare Run-Plan-Liste plus Engine-Fallback-Lane wuerde Worker und Reviewer robuster machen.
- **Umsetzungsaufwand:** klein
- **Prioritaet:** sofort

### [Risk-Adaptive-Guardrails]
- **Paper-Referenz:** p.165-166, Sections 7.4.1-7.4.3; Progent [620], AgentSentinel [551], AgentSpec [1022], ShieldAgent [1253], Ctrl-Z [673]
- **Was es ist:** Das Paper argumentiert gegen starre Sandbox-Politiken und fuer dynamische Containment-Level, Guardian-/Monitor-Agenten, verifizierbare Runtime-Policies und aktive Intervention bis hin zu Undo/Resampling bei unsicheren Aktionen.
- **Warum relevant fuer DGDH:** DGDH arbeitet heute praktisch mit `sandbox=true/false`. Das Paper stuetzt klar den naechsten Schritt: Rechte und Guardrails pro Packet und Risiko zu staffeln, gefaehrliche Aktionen aktiv zu blocken und nicht nur passiv zu loggen.
- **Umsetzungsaufwand:** gross
- **Prioritaet:** bald

### [MCP-Tool-State-Maschine]
- **Paper-Referenz:** p.142, Section 6.1.2 Model Context Protocol; MCP [62, 405, 877]
- **Was es ist:** MCP wird als standardisiertes Protokoll mit strukturierten Nachrichten, expliziten Invocation-Semantiken und einem Zyklus aus `request -> response -> state update -> re-invocation` beschrieben.
- **Warum relevant fuer DGDH:** Genau dieses Modell passt auf unser Gemini-Tool-System. Es wuerde Tool-Nutzung besser resumierbar, debuggbar und provider-uebergreifend machen und die bestehende Evidence-/Telemetry-Schicht sauberer strukturieren.
- **Umsetzungsaufwand:** mittel
- **Prioritaet:** bald

### [Strukturiertes-Externes-Memory]
- **Paper-Referenz:** p.145, Section 6.2.3 Memory With Code; Voyager [1013], MemGPT [772]. p.139, Section 5.4 Future Trends; CodexGraph [624], KGCompass [1165], CGM [944]
- **Was es ist:** Das Paper beschreibt zwei verwandte Memory-Richtungen: validierte Skills als wiederverwendbaren ausfuehrbaren Code speichern und Kontext ueber explizite Read/Write-Mechanismen ausserhalb des Hauptprompts verwalten. Fuer groessere Repos wird zusaetzlich persistent strukturierte Repo-Memory als Zukunftsrichtung beschrieben.
- **Warum relevant fuer DGDH:** Das bestaetigt, dass unser Memory nicht in Richtung riesiger Transcript-Prompts wachsen sollte. Fuer CEO/Worker/Reviewer ist sinnvoller, kleine packetbezogene Memory-Slices und wiederverwendbare Skills/Handoffs bereitzustellen; spaeter kann daraus ein repo-bezogenes Kontext- oder Wissensmodell wachsen.
- **Umsetzungsaufwand:** mittel
- **Prioritaet:** bald

## 3. Bestaetigung bestehender Entscheidungen

- **Rollen statt freier Agenten-Schwarm:** p.130 zeigt mit ChatDev und MetaGPT role-spezialisierte, hierarchische Workflows; p.131 beschreibt OpenCode mit klar getrennten Plan-, Build- und Hilfsrollen. Das stuetzt unsere CEO -> Worker -> Reviewer-Richtung.
- **Shared-Context-Handoffs sind der richtige Glue:** p.143 beschreibt A2A explizit als Delegation, Informationsaustausch, Resultat-Integration und iterative Verfeinerung ueber Shared Context. Das stuetzt unsere Richtung mit strukturierten Handoffs.
- **Menschliche Kontrolle bleibt wertvoll:** p.131 hebt bei Aider bewusst Human-AI-Collaboration statt Vollautonomie hervor; p.140 spricht von interaktiven Feedback-Loops unter menschlicher Anleitung. Das passt zu David als echtem CEO.
- **Explizite Planungsartefakte statt vager Freitext:** p.144 beschreibt CodePlan/pseudocode-basierte Planung als Ambiguitaetsreduktion. Das passt gut zu unseren Packet-Templates mit `doneWhen`, `targetFolder` und klarer Scope-Grenze.
- **Memory sollte klein und gezielt sein:** p.145 und p.139 stuetzen explizit externe, strukturierte Memory-Mechanismen statt bloesser Kontextvergroesserung. Das ist konsistent mit unserer Handoff-Memory-Richtung.

## 4. Warnungen

- **Mehr Agenten ist nicht automatisch besser:** p.120 sagt explizit, dass vereinfachte Workflows praktischer und stabiler sein koennen; p.108 warnt vor steigender Systemkomplexitaet und abnehmendem Grenznutzen bei mehr Sampling/Iteration. DGDH sollte also weiter proof-first bleiben.
- **Statische Sandbox-Politiken sind eine Sackgasse:** p.165 beschreibt das Capability-Gap-Problem: zu restriktiv blockiert echte Arbeit, zu permissiv oeffnet unnötige Risiken. `sandbox=true/false` taugt als Zwischenzustand, nicht als Endarchitektur.
- **Staerkere Modelle koennen tool-avers und ueberheblich werden:** p.145 beschreibt, dass leistungsfaehigere Modelle eher auf interne Text-Reasoning vertrauen und dadurch Fehler machen koennen. Fuer DGDH heisst das: bei verifizierbaren Aufgaben Tool-/Code-Nutzung nicht komplett dem Modell ueberlassen.
- **LLM-Review ohne guten Kontext wird laut, aber nicht unbedingt brauchbar:** p.191 warnt vor verbosem oder irrelevanten Feedback und False Positives, wenn Codebase-Kontext fehlt. Der Reviewer muss also hart auf relevantes Scope, betroffene Dateien und `doneWhen` geerdet bleiben.
- **LLM-Code ist ohne Vorpruefung weiter sicherheitsanfaellig:** p.165 nennt typische Schwachstellen wie SQL Injection, XSS und unsichere Dateioperationen. Fuer DGDH ist das ein klares Argument gegen `accepted`, nur weil ein Run formal `succeeded` ist.

## 5. Nicht relevant

- **pp.9-36 Code foundation models und Modellgeschichte:** gute Hintergrundlage, aber nicht direkt umsetzbar fuer ein API-orchestriertes DGDH-System.
- **pp.37-98 Benchmarks, Metriken und Evaluations-Taxonomien:** interessant fuer Forschung, aber DGDH optimiert auf reale Runs und operatorischen Nutzen statt Leaderboards.
- **pp.132-138 Fine-tuning, SFT und RL-Trainingsrezepte:** fuer Modellbauer relevant, fuer unsere aktuelle API-/Routing-/Governance-Lage nicht der Engpass.
- **pp.182-188 IDE assistants und cloud-native coding platforms:** benachbartes Feld, aber DGDH baut eine governte Agentenfirma und kein IDE-Produkt.
- **pp.150-159 Pre-training Data Governance, Lizenzfilter, Bias-Mitigation:** strategisch wichtig auf Modellebene, aber kein kurzfristiges Runtime-Pattern fuer CEO/Worker/Reviewer.
