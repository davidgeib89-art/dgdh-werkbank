# STAGE-1-SHARED-MEMORY-PILOT

Status: draft
Date: 2026-03-17
Scope: Interne Stage-1-Pilotarchitektur fuer Shared Memory und rollenbasierte Governance auf DGDH/Paperclip

## 1. Purpose

- [confirmed] Dieses Artefakt uebersetzt den externen Research-Input in eine kleine, intern steuerbare Stage-1-Pilotarchitektur.
- [confirmed] Ziel ist kontrollierte Token-Reduktion bei hoher Auditierbarkeit und klaren Rollengrenzen.
- [confirmed] Keine Runtime- oder Codeaenderung durch dieses Dokument.

## Implementation order

- [confirmed] Shared Memory ist nicht der erste Implementierungsschritt.
- [confirmed] Prioritaet 1: token-effizienter Minimal-Core fuer alle Agenten.
- [confirmed] Prioritaet 1.1: minimale Prompt-Basis.
- [confirmed] Prioritaet 1.2: klare Prompt-Schichtung.
- [confirmed] Prioritaet 1.3: Rollen nur als kleine Zusatzschicht.
- [confirmed] Prioritaet 1.4: Routing-/Budgetlogik.
- [confirmed] Prioritaet 1.5: Scope-/Tool-Governance.
- [confirmed] Prioritaet 2: kleines Stage-1-Memory auf dem Minimal-Core.
- [confirmed] Prioritaet 2.1: Run Memory.
- [confirmed] Prioritaet 2.2: Documentation/Reflection Memory.
- [confirmed] Prioritaet 2.3: Company Memory nur als proposal plus Board-Freigabe.

## 2. Stage-1 Memory Typen

- [confirmed] Run Memory: fluechtiger Laufkontext pro Task/Run, wird nach Abschluss archiviert oder verworfen.
- [confirmed] Role Memory: rollenspezifische Arbeitsheuristiken und wiederkehrende Muster je Rolle.
- [confirmed] Company Memory: kanonisches Firmenwissen mit hoher Governance-Schwelle.
- [confirmed] Documentation/Reflection Memory: strukturierte Lessons Learned, Review-Notizen, Gegenhypothesen.

## 3. Rechte: Lesen, Schreiben, Promotion

### 3.1 Schreibrechte Stage 1

- [confirmed] Strategy/Planner: darf Run Memory und Documentation/Reflection Memory schreiben.
- [confirmed] Builder/Executor: darf Run Memory schreiben; kein direktes Schreiben in Company Memory.
- [confirmed] Research/Review: darf Documentation/Reflection Memory schreiben; Company Memory nur als Vorschlag.
- [confirmed] Board Operator (David): einzige finale Freigabeinstanz fuer Promotion nach Company Memory.

### 3.2 Was nur Vorschlag ist

- [confirmed] Alle Agenten-Write-Aktionen in Richtung Company Memory sind standardmaessig nur proposal.
- [confirmed] Proposal ohne Board-Freigabe bleibt nicht-kanonisch.

### 3.3 Promotionsregel (Stage 1)

- [confirmed] Promotion nach Company Memory nur bei expliziter Board-Freigabe.
- [inferred] Promotion-Kriterium soll mindestens enthalten: wiederholter Nutzen, Quellenklarheit, Rollenuebergreifende Relevanz.
- [open question] Ob ein fester Promotion-Counter (z. B. n-facher Recall) in Stage 1 bereits technisch erzwungen wird, bleibt offen.

## 4. Was Firmenwissen werden darf

- [confirmed] Darf Company Memory werden: freigegebene Architekturentscheidungen, Governance-Regeln, verifizierte Betriebsleitlinien.
- [confirmed] Darf nicht direkt Company Memory werden: rohe Agentennotizen, unbestaetigte Hypothesen, einmalige Taskdetails.
- [confirmed] Jeder Company-Memory-Eintrag braucht Provenance (Quelle, Rolle, Zeitpunkt, Freigabeinstanz).

## 5. Stage-1 Kernrollen und Modell-/Budgetrahmen

Pilot umfasst genau drei Kernagentenrollen plus Board:

- [confirmed] Strategy/Planner: Standardmodell high-intelligence lane (Claude oder Gemini), Budgetklasse medium.
- [confirmed] Builder/Executor: Standardmodell builder lane (Codex bevorzugt), Budgetklasse medium/large mit Taskgrenzen.
- [confirmed] Research/Review: Standardmodell research lane (Gemini bevorzugt), Budgetklasse small/medium.
- [confirmed] Board Operator: human final authority, manuelle Freigabe fuer kritische Entscheidungen und Promotions.

Spaetere Utility-Modelle (Stage 2+) nur fuer enge Teilaufgaben:

- [inferred] Extraktion, Klassifikation, Strukturierung, Log-Sichtung, einfache Rewrites.

## 6. Reflection / Documentation Einbindung

- [confirmed] Jeder abgeschlossene Pilot-Task liefert eine kurze Reflection in Documentation/Reflection Memory.
- [confirmed] Reflection dient als Input fuer Role Memory, nicht automatisch fuer Company Memory.
- [confirmed] Review-Rolle validiert Reflection-Qualitaet (confirmed/inferred/open question Markierung).

## 7. Kaskadenpraevention (harte Stage-1 Regeln)

- [confirmed] Keine autonome Multi-Agent-Kaskade ohne explizite Freigabe.
- [confirmed] Reflection- oder Review-Schritte laufen ohne freie Tool-Eskalation.
- [confirmed] Scope-Wachstum stoppt den Lauf und triggert Eskalation statt stiller Fortsetzung.
- [confirmed] Tool-Nutzung bleibt an Rollen- und Task-Scope gebunden.

## 8. Bewusst erst Stage 2+

- [confirmed] Automatisches Bayesian Trust Scoring fuer Schreibrechte.
- [confirmed] Vollautomatische Promotion in Company Memory.
- [confirmed] ML-basierte dynamische Router-Modelle.
- [confirmed] Breite Utility-Lane mit mehreren externen Providern.

## 9. Stage-1 Pilot-Erfolgskriterien

- [confirmed] Sinkender Kontext-/Token-Overhead bei stabiler Ergebnisqualitaet.
- [confirmed] Vollstaendige Nachvollziehbarkeit von Write- und Promotion-Entscheidungen.
- [confirmed] Keine unkontrollierten Agentenkaskaden.
- [confirmed] Klare Trennung zwischen proposal und kanonischem Firmenwissen.
