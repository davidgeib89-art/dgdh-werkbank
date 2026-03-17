# EXTERNAL-RESEARCH-GATE-01

Status: draft — awaiting Board approval
Date: 2026-03-17
Scope: Freigabe-Artefakt fuer den ersten externen Architektur-Vergleichsdurchlauf

---

## 1. Objective

Konkrete Fragen, die dieser erste Durchlauf beantworten soll:

- [confirmed] Welche Memory-Architektur (Persistenz, Verdichtung, Write-Governance) zeigt in realen Open-Source-Repos die beste Balance aus Token-Effizienz und Auditierbarkeit?
- [confirmed] Welche Rollen-/Routing-Muster trennen stabil zwischen Planungs-, Build- und Review-Rollen, ohne Prompt-Drift zu zeigen?
- [confirmed] Welche Tool-/Skill-Governance-Mechanismen sind in DGDH/Paperclip praktisch integrierbar, ohne die operative Komplexitaet unverhaeltnismaessig zu erhoehen?

Kein allgemeines Survey. Nur Inputs fuer interne Architekturentscheidungen aus dem ROLE-ROUTING-CONTRACT und dem EXTERNAL-ARCHITECTURE-RESEARCH-PLAN.

---

## 2. Allowed scope

### Erlaubt in diesem Durchlauf

- [confirmed] Maximal 5 externe Repos oder Frameworks.
- [confirmed] Themen: Memory-Design, Rollen-/Routing-Modelle, Tool-/Skill-Governance-Patterns.
- [confirmed] Nur oeffentlich zugaengliche Repos oder Dokumentationen.
- [confirmed] Analyse auf Architekturebene (Doku, Code-Struktur, README, Design-Dateien).

### Ausdruecklich noch nicht in diesem Durchlauf

- [confirmed] Keine Implementierung oder Code-Uebernahme aus externen Repos.
- [confirmed] Keine Analyse von Provider-/Modell-Routing-Details (separater spaeterer Gate).
- [confirmed] Kein Benchmarking oder Messbetrieb gegen externe Systeme.
- [confirmed] Keine Bewertung von kommerziellen oder proprietaeren Plattformen.
- [confirmed] Keine Exploration jenseits der drei definierten Themen.

---

## 3. Budget / effort box

- [confirmed] Zeitbudget: max. 1 kompakter Research-Block, kein offenes iteratives Tiefer-Tauchen.
- [confirmed] Output-Budget: max. 1 strukturiertes Dokument als Ergebnis des Durchlaufs.
- [confirmed] Quellen: max. 5 Repos, kein Nachkauf weiterer Quellen ohne erneute Board-Freigabe.
- [confirmed] Keine offene Exploration, kein Scope-Wachstum ohne expliziten Stop und Neufreigabe.

---

## 4. Required output format

Der Research-Output des ersten Durchlaufs muss folgendes enthalten:

- [confirmed] Kurze Vergleichsmatrix: Repos in Zeilen, Evaluation-Kriterien in Spalten, Ampelwerte.
- [confirmed] Pro Repo: Kurzprofil (Zweck, Reifegrad, Kernkomponenten), Memory-Mechanik, Rollen-/Tool-Governance-Mechanik.
- [confirmed] Markierungsregeln: alle Aussagen als [confirmed], [inferred] oder [open question] belegt.
- [confirmed] Klare adopt/adapt/ignore-Empfehlung pro Quelle.
- [confirmed] Keine Theorieabschnitte ohne direkte Evidenz aus den untersuchten Quellen.
- [open question] Format fuer eventuelle Follow-up-Gates wird nach dem ersten Durchlauf entschieden.

---

## 5. Evaluation criteria

Verbindlich fuer alle untersuchten Quellen:

| Kriterium                  | Gewicht (qualitativ) | Erlaeuterung                                                           |
| -------------------------- | -------------------- | ---------------------------------------------------------------------- |
| Token-Effizienz            | hoch                 | Reduziert das Pattern Kontext-Overhead ohne Informationsverlust?       |
| Governance-Kompatibilitaet | hoch                 | Kompatibel mit DGDH-Ansatz (Approval-Gates, Eskalation, Auditpflicht)? |
| Auditierbarkeit            | hoch                 | Sind Entscheidungen und Zustaende nachvollziehbar im Event-Stream?     |
| Integrationsrisiko         | mittel               | Wie gross ist der Aufwand und das Risiko der Einbindung in Paperclip?  |
| Rollenklarheit             | mittel               | Werden Rollen sauber getrennt und sind Grenzen erkennbar?              |

---

## 6. Stop conditions

Der Durchlauf wird abgebrochen oder eskaliert wenn:

- [confirmed] Eine Quelle ausserhalb des erlaubten Scope-Bereichs untersucht werden wuerde.
- [confirmed] Der Output-Umfang die Budget-Box drohend ueberschreitet.
- [confirmed] Implementierungsideen entstehen, die sofortige Code-Aktion nahelegen.
- [confirmed] Neue Fragen entstehen, die eine eigene Freigabe (EXTERNAL-RESEARCH-GATE-02) erfordern.
- [confirmed] Keine klare Evidenz fuer eine Frage auffindbar ist — dann offen markieren, nicht weiter graben.

In allen Eskalationsfaellen: Durchlauf anhalten, Zwischenstand sichern, Board informieren.

---

## 7. Board decision hook

Nach Abschluss des ersten Durchlaufs wird Board-seitig folgendes zur Freigabe vorgelegt:

- [confirmed] Ausgefuellte Vergleichsmatrix mit adopt/adapt/ignore-Empfehlungen.
- [confirmed] Liste der offenen Architektur-Fragen, die durch den Research konkret adressiert oder ausgeschlossen wurden.
- [confirmed] Empfehlung zum naechsten Schritt (EXTERNAL-RESEARCH-GATE-02, interne Pilotimplementierung oder kein weiterer Research).
- [confirmed] Explizite Aussage: keine Implementierung ohne separaten Board-Entscheid.

Board-Freigabe-Entscheidung:

- [ ] GATE-01 genehmigt — erster Durchlauf darf starten.
- [ ] GATE-01 abgelehnt — Scope oder Zeitpunkt anpassen.
- [ ] GATE-01 genehmigt mit Auflagen (Auflagen hier eintragen).
