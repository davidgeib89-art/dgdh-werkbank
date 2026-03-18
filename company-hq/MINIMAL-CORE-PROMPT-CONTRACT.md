# MINIMAL-CORE-PROMPT-CONTRACT

Status: draft
Date: 2026-03-17
Scope: Verbindliche Stage-1-Spezifikation fuer den token-effizienten Minimal-Core aller Agenten

## 1. Purpose

- [confirmed] Dieser Vertrag definiert den kleinsten gemeinsamen Prompt-Core fuer alle Agentenrollen.
- [confirmed] Ziel ist maximale Token-Disziplin bei klarer Governance und auditierbarer Ausfuehrung.
- [confirmed] Rollenlogik liegt ueber dem Core als kleine Zusatzschicht, nicht als Core-Ersatz.
- [confirmed] Der erste Optimierungsfokus gilt dem gemeinsamen Core, nicht getrennten Spezial-Core-Versionen pro Rolle.
- [confirmed] Gemini ist nur die erste Rolle, an der dieser gemeinsame Core praktisch gemessen und verbessert wird.

## 2. Prompt layers (verbindlich)

Reihenfolge ist verpflichtend:

1. Company Core Layer
2. Governance/Execution Layer
3. Task Delta Layer
4. Role Add-on Layer
5. Optional Skill/Repo Delta Layer

## 3. Inhalt des Minimal-Core

Pflichtinhalt im Company Core Layer:

- [confirmed] Mission-kritische Grundausrichtung.
- [confirmed] Harte Governance-Prinzipien (Freigabe, Eskalation, Verantwortlichkeit).
- [confirmed] Token-Disziplin-Grundregeln.
- [confirmed] Verbindliche Trennung zwischen planning, execution und review-Verhalten.

Pflichtinhalt im Governance/Execution Layer:

- [confirmed] Scope-Grenzen (allowed target, forbidden expansion).
- [confirmed] Tool-Grenzen (erlaubte Toolklassen, verbotene Toolnutzung).
- [confirmed] Approval-Mapping (wann policy reicht, wann Board/Human noetig ist).
- [confirmed] Abbruch-/Eskalationsbedingungen bei Scope- oder Governance-Verletzung.

## 4. Was nicht dauerhaft in den Core gehoert

- [confirmed] Task-spezifische Details, Dateipfade, Einmalziele.
- [confirmed] Lange Rollenbeschreibungen, historische Ausfuehrungsprotokolle.
- [confirmed] Breite Repo-Kontexte ohne aktuellen Taskbezug.
- [confirmed] Unbestaetigte Hypothesen oder Research-Rohmaterial.

## 5. Delta- und Groessenregeln

- [confirmed] Task Delta Layer bleibt klein und nur auf aktuellen Auftrag bezogen.
- [confirmed] Role Add-on Layer bleibt klein und beschreibt nur Mandat/Grenzen der Rolle.
- [confirmed] Skill/Repo Delta Layer wird nur bei direkter Relevanz eingebracht.
- [confirmed] Stabile Inhalte werden nicht pro Run neu ausgeschrieben.

## 6. Struktur fuer Scope-/Tool-/Governance-Felder

Verbindliche Feldgruppen im Governance/Execution Layer:

- [confirmed] scope: target, allowed_changes, forbidden_changes, escalation_trigger.
- [confirmed] tools: allowed_tools, blocked_tools, allowed_depth, no_exploration_flag.
- [confirmed] governance: approval_mode, risk_class, budget_class, stop_conditions.
- [confirmed] audit: reason_codes, decision_trace_required, outcome_classification.

## 7. Rolle als kleine Zusatzschicht

- [confirmed] Rollen duerfen Core-Regeln nicht ueberschreiben.
- [confirmed] Rollen duerfen nur Zusatzlogik liefern (Arbeitsstil, Prioritaet, Eskalationsverhalten).
- [confirmed] Bei Konflikt gewinnt immer Company Core plus Governance/Execution Layer.
- [confirmed] Das vorhandene Paperclip-Rollensystem kann weiter genutzt werden, aber zuerst muss der gemeinsame Core fuer alle Rollen schlank und stabil sein.

## 8. Token-Disziplin-Regeln (Stage 1)

- [confirmed] Core bleibt kompakt und stabil; keine unnoetige Wiederholung.
- [confirmed] Task-Deltas statt Vollkontext ist Standard.
- [confirmed] Keine freie Kontextakkumulation ueber mehrere Runs ohne Zweckbindung.
- [confirmed] Teure Modelle nur fuer high-intelligence Aufgaben; Utility-Logik bleibt eng begrenzt.

## 9. Enforcement intent

- [confirmed] Zielbild: deterministischer Prompt-Resolver nach Layer-Reihenfolge.
- [confirmed] Jede Ausfuehrung muss auf Scope-, Tool- und Governance-Felder rueckfuehrbar sein.
- [confirmed] Abweichungen von Layer- oder Token-Regeln sind eskalationspflichtig.
