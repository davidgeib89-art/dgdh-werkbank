# EXTERNAL-ARCHITECTURE-RESEARCH-PLAN

Status: draft
Date: 2026-03-17
Scope: Gezielter, spaeter freizugebender Research-Plan fuer externe Architekturquellen

## 1. Purpose

- [confirmed] Externer Research dient dazu, interne Architekturentscheidungen belastbarer und schneller zu machen.
- [confirmed] Fokus ist nicht "mehr Ideen", sondern bessere Entscheidungssicherheit fuer Rollenrouting, Memory-Design und Tool-Governance.
- [confirmed] Der Plan soll offene Fragen aus der internen Architekturarbeit systematisch aufloesen.

Interne Architekturfragen, die dadurch besser entschieden werden sollen:

- [open question] Welche Memory-Patterns reduzieren Tokenkosten, ohne Governance-Transparenz zu verlieren?
- [open question] Welche Rollen-/Agentenmodelle sind stabil bei klaren Eskalations- und Approval-Gates?
- [open question] Welche Tool-/Skill-Strukturen sind robust genug fuer DGDH auf Paperclip-Substrat?

## 2. Research domains

- [confirmed] Memory-Architekturen.
- [confirmed] Rollen-/Agentenarchitekturen.
- [confirmed] Tool-/Skill-Oekosysteme.
- [confirmed] Multi-Repo-/Shared-Context-Muster.
- [confirmed] Kosteneffiziente Utility-Agent-Patterns.

## 3. Non-goals

- [confirmed] Keine breite, unkontrollierte Exploration.
- [confirmed] Keine sofortige Uebernahme externer Patterns.
- [confirmed] Keine Implementierung vor interner Architekturentscheidung.

## 4. Evaluation criteria

- [confirmed] Token-Effizienz.
- [confirmed] Governance-Kompatibilitaet.
- [confirmed] Auditierbarkeit.
- [confirmed] Rollenklarheit.
- [confirmed] Technische Integrierbarkeit in DGDH/Paperclip.
- [confirmed] Risiko / Komplexitaet.

## 5. Research method

Vergleichsablauf pro externer Quelle (Repo/Library/Framework):

1. [confirmed] Kurzprofil erfassen: Ziel, Reifegrad, Wartung, Lizenz, Kernkomponenten.
2. [confirmed] Architektur-Extraktion gegen feste Schablone: Rollenmodell, Memory-Modell, Toolzugriff, Routing-Logik, Audit-Pfade.
3. [confirmed] Mapping auf DGDH-Fragen: Welche internen Open Questions werden konkret adressiert?
4. [confirmed] Bewertung entlang der Evaluation criteria mit kurzer Begruendung.
5. [confirmed] Ampelvorschlag: adoptierbar, begrenzt nutzbar, nur Beobachtung, verwerfen.

Artefakte, die pro Repo extrahiert werden sollen:

- [confirmed] Architekturdiagramm in Textform (Rollen, Datenfluss, Kontrollpunkte).
- [confirmed] Memory-Mechanik (Persistenz, Verdichtung, Validierung, Zugriffskontrolle).
- [confirmed] Tool-/Skill-Mechanik (Capabilities, Scope-Grenzen, Sicherheitsmodell).
- [confirmed] Governance-Signale (Audit-Events, Approval-Modelle, Eskalationspfade).
- [confirmed] Kostenhinweise (Token-/Compute-Hebel, bekannte Trade-offs).

Markierungsregeln fuer Aussagen:

- [confirmed] Nur mit klarer, repo-naher Evidenz aus Code/Doku.
- [inferred] Abgeleitete Interpretation aus mehreren Evidenzen, explizit als inference markiert.
- [open question] Wenn Evidenz fehlt oder widerspruechlich ist; explizit fuer interne Klaerung markieren.

## 6. Expected outputs

- [confirmed] Vergleichsmatrix ueber priorisierte externe Quellen.
- [confirmed] Memory-Pattern-Review mit Uebertragbarkeit auf DGDH.
- [confirmed] Tool-/Library-Shortlist mit Risiko- und Integrationshinweisen.
- [confirmed] Konkrete Empfehlungen fuer DGDH (adopt, adapt, ignore).

## 7. Gating

Was zuerst intern entschieden sein muss:

- [confirmed] Rollen- und Routing-Vertrag (Role -> Adapter -> Model -> Budget -> Approval) ist freigegeben.
- [confirmed] Prompt-Schichtung und Delta-Prinzip sind intern verbindlich.
- [confirmed] Minimaler Rollenpilot und dessen KPIs sind definiert.

Wann externer Research freigegeben wird:

- [confirmed] Nach Board-Freigabe auf Basis der internen Gate-Dokumente.
- [confirmed] Nur mit klarer Scope-Box (Themen, Quellenzahl, Zeitbudget, Ergebnisformat).

Wann aus Research Implementierung folgen darf:

- [confirmed] Erst nach separater Architekturentscheidung mit dokumentierter Begruendung.
- [confirmed] Nur als kontrollierter Pilot mit Messpunkten fuer Token, Qualitaet und Governance-Compliance.

## Initial research questions

- [open question] Welche konkrete Memory-Architektur (inkl. Verdichtung + Write-Governance) zeigt in realen Repos die beste Balance aus Token-Effizienz und Auditierbarkeit?
- [open question] Welche Rollen-/Routing-Muster trennen nachweislich stabil zwischen Planungs-, Build- und Review-Rollen ohne Prompt-Drift?
- [open question] Welche Tool-/Skill-Governance-Muster sind praktisch integrierbar in DGDH/Paperclip, ohne operative Komplexitaet unverhaeltnismaessig zu erhoehen?
