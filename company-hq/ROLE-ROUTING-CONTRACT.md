# ROLE-ROUTING-CONTRACT

Status: draft
Date: 2026-03-17
Scope: Operativer Rollen- und Routing-Vertrag fuer DGDH auf Paperclip-Substrat

## 1. Purpose

- [confirmed] Dieser Vertrag legt verbindlich fest, wie Rollen, Modelle, Budgets und Freigabemodi zusammenspielen.
- [confirmed] Ziel ist token-effiziente, auditierbare und governance-konforme Ausfuehrung.
- [confirmed] Keine Runtime-Aenderung durch dieses Dokument; es ist ein Architekturvertrag.

## 2. Role Routing Matrix

| Rolle                  | Hauptzweck                                                 | Standardmodell / bevorzugter Provider                       | Budgetklasse | Approval-Mode               | Erlaubte Toolklasse                       | Eskalationspflicht |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- | ------------ | --------------------------- | ----------------------------------------- | ------------------ |
| Board Operator (David) | Zielvorgabe, Priorisierung, Freigaben, Stop/Kill-Switch    | n/a (human)                                                 | n/a          | manual_only                 | alle Kontroll- und Freigabefunktionen     | nein               |
| Strategy / Planner     | Paketierung, Risikoklasse, Architekturentscheidungsentwurf | Claude oder Gemini (high-intelligence lane)                 | medium       | manual_required_for_phase_b | read, analyze, plan, no write by default  | ja                 |
| Builder / Executor     | Implementierung innerhalb klarer Scope-Box                 | Codex (bevorzugt) oder Claude/Codex kompatible Builder-Lane | medium/large | policy_with_human_override  | read, write, targeted test, bounded shell | ja                 |
| Research / Review      | Gegenhypothesen, Faktencheck, Alternativen, QA-Vorpruefung | Gemini (bevorzugt), spaeter optional OpenRouter review lane | small/medium | manual_or_policy_by_risk    | read, grep/search, no write by default    | ja                 |

Verbindliche Regeln zur Matrix:

- [confirmed] Rolle bestimmt zuerst Arbeitsmodus; Modellwahl ist nachgelagert.
- [confirmed] Approval-Mode ist an Rolle und Risikoklasse gebunden, nicht an Providernamen.
- [confirmed] Eskalationspflicht gilt fuer alle Agentenrollen ausser Board Operator.

## 3. Prompt Schichtung (verbindlich)

### 3.1 Layer Reihenfolge

1. Company Layer
2. Role Layer
3. Task Layer
4. Skill/Repo Layer
5. Memory Layer

### 3.2 Dauerhaft vs Delta

- [confirmed] Company Layer: dauerhaft, klein, stabil; nicht pro Run neu ausgeschmueckt.
- [confirmed] Role Layer: dauerhaft pro Rolle; Mandat, Grenzen, Eskalation, Budgetlogik.
- [confirmed] Task Layer: variabel, run-spezifisch, klein und explizit scope-begrenzt.
- [confirmed] Skill/Repo Layer: nur relevante Ausschnitte; keine repo-weite Vollflaeche.
- [confirmed] Memory Layer: primaer delta-basiert, verdichtet, role-spezifisch.

### 3.3 Groessen- und Wiederholungsprinzip

- [confirmed] Was stabil ist, wird nicht bei jedem Run erneut voll materialisiert.
- [confirmed] Nur Task-Delta und Memory-Delta sollen pro Run dominant variieren.
- [inferred] Wenn ein Layer dauerhaft gross wird, muss vor Rollout ein Kompaktierungsmechanismus definiert werden.

## 4. Token Optimierungsregeln

- [confirmed] Keine unnoetige Wiederholung von statischen Governance- und Rolleninhalten pro Run.
- [confirmed] Memory vor Vollkontext: zuerst verdichtete Kontexte, dann nur bei Bedarf Tiefenabruf.
- [confirmed] Session-Reuse ist Standard, sofern Governance/Sicherheitsregeln nicht dagegen sprechen.
- [confirmed] Teure Modelle sind fuer high-intelligence Aufgaben reserviert (Strategie, komplexe Architektur, kritische QA).
- [confirmed] Guenstige Utility-Modelle duerfen nur in enger Tool- und Scope-Box laufen.
- [confirmed] Utility-Lane ohne autonome Zielaenderung oder freie Exploration.

## 5. Utility Model Policy (inkl. spaetere OpenRouter/free lane)

- [confirmed] Utility-Rollen sind auf klar definierte Teilaufgaben beschraenkt (Extraktion, Klassifikation, Strukturierung, kleine Rewrites, Log-Sichtung).
- [confirmed] Kein autonomes Scope-Wachstum in Utility-Rollen.
- [confirmed] Kein Zugriff auf sensitive oder kostenkritische Kontexte ohne explizites Gate.
- [open question] Welche konkreten Provider/Modelle die Utility-Lane zuerst belegen, wird separat entschieden.

## 6. Minimaler Rollenpilot (Phase 1)

- [confirmed] Pilotrollen: Strategy / Planner, Builder / Executor, Research / Review.
- [confirmed] Board Operator (David) bleibt Aufsicht und finale Freigabeinstanz.
- [confirmed] Pilotziel: Routing- und Prompt-Schichtung validieren, nicht maximale Autonomie.
- [confirmed] Pilotmetriken: Token pro Run, Scope-Treue, Eskalationsqualitaet, Nachvollziehbarkeit im Event-Stream.

## 7. Open Decisions vor Implementierung

- [open question] Exakte Standardmodellzuordnung pro Rolle fuer jede Betriebsphase (Dormant, Pilot, Active).
- [open question] Konkrete Budget-Schwellen je Rolle und Taskklasse in produktiver Belastung.
- [open question] Finales Approval-Mapping bei Mischfaellen zwischen policy- und human-gate.
- [open question] Verbindliche Memory-Writerechte pro Rolle (wer schreibt kanonisch, wer nur Ephemera).
- [open question] Pflichtfelder fuer run-level Audit-Telemetrie als harte Definition.

## 8. Internal vs External Research Strang

### 8.1 Internal (jetzt priorisiert)

- [confirmed] Rollenvertrag stabilisieren.
- [confirmed] Prompt-Schichtung und Delta-Regeln praezisieren.
- [confirmed] Pilotkriterien und Gate-Logik festziehen.

### 8.2 External (nachgelagert, gezielt)

- [confirmed] Externe Repo-Research ist vorgesehen, aber nicht vor Rollenvertragsabschluss.
- [confirmed] Research soll gezielt liefern: Memory-Design-Muster, Rollenframeworks, Tool/Skill-Oekosysteme, Multi-Repo-Shared-Context, Utility-Agent-Patterns.
- [confirmed] Externer Research liefert Entscheidungsinput, ersetzt aber keine interne Governance-Entscheidung.

## 9. Enforcement Intent

- [confirmed] Gewuenschtes Zielbild fuer technische Umsetzung: Role -> Adapter -> Model -> Budget -> Approval als policy-gesteuerter Resolver.
- [confirmed] Jede Ausfuehrung muss auf den Resolver, nicht auf implizite Prompt-Drift, zurueckfuehrbar sein.
