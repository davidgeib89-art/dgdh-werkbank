# PROMPT-RESOLVER-SCHEMA-DRAFT

Status: draft
Date: 2026-03-17
Scope: Dokumentarischer Stage-1-Entwurf fuer den spaeteren Prompt-Resolver (kein Code, kein Runtime-Umbau)

## 1. Purpose

- [confirmed] Dieses Schema verbindet die Architekturvertraege mit einer spaeteren technischen Resolver-Implementierung.
- [confirmed] Ziel ist deterministische, auditierbare und token-effiziente Prompt-Aufloesung.
- [confirmed] Dieses Dokument beschreibt nur Datenform, Regeln und Fehlerfaelle.

## 2. Resolver input (erwartete Eingaben)

Pflicht-Eingaben:

- [confirmed] `companyCore`: stabiler Kern (Mission, harte Governance, Token-Grundregeln).
- [confirmed] `governanceExecution`: Scope-, Tool-, Approval-, Audit-Felder.
- [confirmed] `taskDelta`: task-spezifische Ziele und Grenzen.
- [confirmed] `roleAddon`: kleine rollenspezifische Zusatzschicht.

Optionale Eingaben:

- [confirmed] `skillRepoDelta`: nur bei direkter Task-Relevanz.
- [confirmed] `resolverContext`: Metadaten wie runId, timestamp, actorRole, riskClass.

## 3. Layer schema (Pflicht / optional)

### 3.1 companyCore

- Pflicht: `mission_guardrails`, `governance_principles`, `token_discipline`, `behavior_separation`.
- Optional: `version_tag`.

### 3.2 governanceExecution

- Pflicht: `scope`, `tools`, `governance`, `audit`.
- Optional: `notes`.

### 3.3 taskDelta

- Pflicht: `objective`, `allowed_targets`, `acceptance_criteria`.
- Optional: `constraints`, `deadline_hint`.

### 3.4 roleAddon

- Pflicht: `role_name`, `role_mandate`, `role_limits`.
- Optional: `style_preferences`.

### 3.5 skillRepoDelta (optional layer)

- Pflicht wenn vorhanden: `relevance_reason`, `selected_artifacts`.
- Optional: `extract_window`.

## 4. Validierungsregeln

- [confirmed] Keine leeren Pflichtfelder.
- [confirmed] `allowed_targets` darf nicht leer sein, wenn `objective` datei-/scope-bezogen ist.
- [confirmed] `blocked_tools` und `allowed_tools` duerfen sich nicht schneiden.
- [confirmed] `approval_mode` muss zu `risk_class` passen.
- [confirmed] `decision_trace_required=true` erzwingt befuellte `reason_codes`.
- [confirmed] Optionaler Layer `skillRepoDelta` nur bei belegter Relevanz (`relevance_reason`).

## 5. Konfliktregeln (Fehler / Eskalation)

Fehler (hard fail):

- [confirmed] Layer-Reihenfolge verletzt.
- [confirmed] Pflichtfeld fehlt.
- [confirmed] Rolle versucht non-overridable Feld zu aendern.
- [confirmed] Tool-Policy widerspruechlich (`allowed_tools` vs `blocked_tools`).

Eskalation (stop + manual decision):

- [confirmed] Scope-Erweiterung ausserhalb `allowed_targets`.
- [confirmed] Unklare Approval-Zuordnung bei hoher Risikoklasse.
- [confirmed] Konflikt zwischen Task-Ziel und Governance-Prinzipien.

## 6. Non-overridable Felder (nie direkt aus Rolle)

- [confirmed] `governance.approval_mode`
- [confirmed] `governance.risk_class`
- [confirmed] `governance.budget_class`
- [confirmed] `scope.forbidden_changes`
- [confirmed] `tools.blocked_tools`
- [confirmed] `audit.decision_trace_required`

## 7. Delta-only Felder

Nur als Delta erlaubt (nicht im stabilen Core):

- [confirmed] `taskDelta.objective`
- [confirmed] `taskDelta.allowed_targets`
- [confirmed] `taskDelta.acceptance_criteria`
- [confirmed] `roleAddon.style_preferences`
- [confirmed] `skillRepoDelta.selected_artifacts`

## 8. Minimale Resolver-Ausgabe

Pflicht-Ausgabeobjekt:

- [confirmed] `resolvedPrompt`: final zusammengesetzter Prompt nach Layer-Reihenfolge.
- [confirmed] `resolvedPolicy`: finale Scope-/Tool-/Governance-Policy.
- [confirmed] `auditTrace`: Layer-Herkunft, angewandte Validierungen, Konfliktentscheidungen.
- [confirmed] `resolverDecision`: `ok | fail | escalated`.
- [confirmed] `reasonCodes`: maschinenlesbare Begruendung fuer fail/escalated.

## 9. Enforcement intent

- [confirmed] Resolver-Verhalten muss deterministisch und reproduzierbar sein.
- [confirmed] Jeder Output muss auf Input-Layer und Regeln rueckfuehrbar bleiben.
- [confirmed] Keine stillen Ueberschreibungen bei Policy-relevanten Feldern.
