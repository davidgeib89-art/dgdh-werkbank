# DGDH – CEO Kontext Dokument

> **Leitfrage:** *Entlastet das David real oder verschönert es nur die Maschine?*

Zuletzt aktualisiert: 2026-03-20
Version: 1.1

---

## 1. Mission in 5 Sätzen

- Wir bauen eine mensch-AI-Symbiose-Firma, geführt von David als einzigem Operator
- Paperclip ist das Substrat, nicht die Identität
- Token-Ökonomie ist Kern – wir optimieren auf echte Entlastung, nicht auf "autonomous theater"
- Governance first – keine Arbeit ohne klare Zustände, Budgets und Freigaberegeln
- Gemini zuerst – bis diese Lane stabil und nützlich ist, bleiben andere Lanes dormant

---

## 2. Current Phase

**Phase:** Golden Path / Work-Packet Continuity

**Hauptziel:** Work-Packet-Kontinuität – Approval/Resume verständlich im Hauptpfad, founder-readable trace vom Auftrag bis Ergebnis

**Nicht jetzt:**
- Neue Lanes (Claude/Codex reaktivieren)
- Neue Benchmark-Familien
- Neue Architekturflächen
- Meta-Governance erweitern

---

## 3. Current Bet

> **LLM-assisted intake + server-enforced execution + klare Operator-Signale** erzeugen mehr Nutzen pro Quota als blind stärkere Modelle.

**Was das bedeutet:**
- Flash-Lite ist das Mittel, nicht die Wette
- Intake/Proposal durch günstiges Modell
- Server-seitige Enforcement erzwingt Policy
- Klare Operator-Signale ermöglichen schnelle Entscheidung

---

## 4. Now / Next / Later

### NOW (Diese Woche/Monat)
- Work-Packet-Kontinuität
- Approval/Resume verständlich im Hauptpfad
- Founder-readable trace vom Auftrag bis Ergebnis
- Klare Status-Semantik (blocked vs awaiting_approval)

### NEXT (Nach State Truth)
- Approval UX / Operator Signals
- Wakeup/Fortsetzen verständlich
- Weniger mentale Last für David
- Flash-Lite Intake schärfen

### LATER (Nach Nutzenbeweis)
- Wiederholbare Standardarbeit stabilisieren
- Lane-Ausbau nur bei echter Lücke
- Claude/Codex reaktivieren unter strengen Bedingungen

### NOT NOW
- Multi-Agent-Komplexität
- Neue Architekturflächen
- Benchmark-Theater
- Romantische "mehr Autonomie"-Erweiterungen

---

## 5. Recent Wins (Letzte 30 Tage)

| Was | Warum wichtig |
|-----|----------------|
| Approval Loop Backend | Endlich saubere Trennung: Policy-Block vs. Mensch-freigabe nötig |
| Skill Filtering | Nur relevante Skills injecten, weniger Prompt-Müll |
| Session Compaction Tuning | 20 runs, 500k tokens, 48h – weniger Halluzination |
| Agent Health / State Truth | awaiting_approval korrekt behandelt, klare Status |
| Pipeline / Golden Path Tests | E2E-Tests für Routing-Logik und Approval-Flow |

**Letzter Commit:** `120930d` – feat(agent-health): add handling for awaiting_approval status

---

## 6. Aktueller Reifegrad

```
┌─────────────────────────────────────────────────────┐
│                    REIFEGRAD                        │
├─────────────────────────────────────────────────────┤
│  Architecture      ████████████████░░░░  80%        │
│  Governance        ████████████████░░░░  80%        │
│  Operator Surface  ████████░░░░░░░░░░░░  40% ← ENGPASS│
│  Produktive Work   ████░░░░░░░░░░░░░░░░  20%        │
└─────────────────────────────────────────────────────┘
```

**Ehrliches Bild:**
- Routing ist real ✓
- Approval Backend ist real ✓
- Health/Stats werden realer ✓
- Quota-Logik ist auf dem Weg ✓

**Aber:** Operator-Wahrnehmung ist noch nicht so gut wie das Backend.

---

## 7. Current Risks

| Risk | Warum relevant | Gegenmaßnahme |
|------|----------------|----------------|
| Approval Friction | Zu viele Tasks in awaiting_approval → David wird Bottleneck | UX/State Truth verbessern |
| Governance wächst schneller als Nutzen | Architektur toll, aber wenig echte Entlastung | Jedes Paket gegen Leitfrage testen |
| Flash-Lite spart weniger als gedacht | Router verbraucht selbst Tokens, falsche Escalation | Intake-Qualität messen |
| Stale Quota State | Snapshots veraltet → falsches Routing | Refresh-Logik überwachen |
| **Golden Path bricht Kontext** | Approval/Follow-up verliert Request-Kontext | Work-Packet-Kontinuität sicherstellen |

---

## 8. Reflektionsboard

### A. North Star
- Welche Arbeit nimmt DGDH David diese Woche **real** ab?
- Welche Lane erzeugt echten Output?
- Wo spart das System messbar Zeit, Geld oder mentale Last?

### B. Operator Burden
- Wo muss David zu oft manuell eingreifen?
- Welche Freigaben sind wirklich nötig?
- Wo erzeugt das System mehr Nachdenken als Entlastung?

### C. Token Economy
- Spart Flash-Lite real Kosten oder nur theoretisch?
- Wo wird zu früh eskaliert?
- Wo wird zu billig entschieden und später teuer korrigiert?

### D. State Truth
- Zeigt die Oberfläche den echten Zustand?
- Gibt es versteckte Zwischenzustände?
- Ist klar, was gestoppt, blockiert oder approval-waiting ist?

### E. Governance vs Nutzen
- Baut dieses Paket echte Sicherheit?
- Oder nur neue Prozessschichten?
- Wird Governance kleiner, klarer, härter – oder nur mehr?

### F. Produktive Realität
- Welche 3 Pakettypen funktionieren zuverlässig?
- Welche 3 Pakettypen funktionieren noch nicht?
- Was ist der echte nächste Engpass?

---

## 9. Harte Priorisierungsregel

### GO, wenn:
- State Truth verbessert
- Approval-Reibung senkt
- Quota besser nutzt
- Wiederholbaren Arbeitstyp stabilisiert
- David direkt entlastet

### NO-GO, wenn:
- Nur architektonisch elegant
- Nur künftige Möglichkeiten vorbereitet
- Neue Meta-Schichten ohne heutigen Nutzen
- Nur "agentischer" aussieht

---

## 10. Roadmap-Bild

```text
HEUTE ──────────────────────────────────────────────▶

Phase A: STATE TRUTH
├── klare Status-Semantik
├── Approval sichtbar
├── Quota/Pools sichtbar
└── David versteht die Lage ohne Repo-Dive

Phase B: OPERATOR SIGNALS
├── Approval UX
├── Wakeup/Fortsetzen verständlich
└── weniger mentale Last

Phase C: FLASH-LITE SHARPENING
├── Intake/Proposal schärfen
├── Enforcement sauber
├── Toolwahl an Budget koppeln
└── billiger entscheiden, gezielter eskalieren

Phase D: REPEATABLE WORK
├── kleine interne Standardpakete
├── wiederholbare Erfolgsmuster
└── echte Entlastung statt Systempflege

Phase E: EXPANSION BY PROOF
├── Claude/Codex nur bei echter Lücke
├── mehr Autonomie nur bei stabiler Governance
└── Ausbau folgt Nutzen, nicht Fantasie
```

---

## 11. Für AIs: Quick Context

```
╔══════════════════════════════════════════════════════╗
║  DU BIST NEU HIER?                                   ║
╠══════════════════════════════════════════════════════╣
║  1. David ist CEO + einziger Operator                ║
║  2. Gemini = primäre Worker-Lane                     ║
║  3. Token-Ökonomie = Kern                            ║
║  4. Leitfrage: "Entlastet das David real?"           ║
║  5. Phase: State Truth + Operator Signals            ║
║  6. NICHT: neue Lanes, mehr Architektur              ║
╚══════════════════════════════════════════════════════╝
```

---

## 12. Offene Fragen

- [ ] **Welche 1–2 Auftragstypen laufen heute already through den Golden Path?**
- [ ] Wie messen wir "erfolgreiche Arbeit" objektiv?
- [ ] Wann ist Approval-Friction zu hoch?
- [ ] Flash-Lite Escalation-Rate?
- [ ] Golden Path Continuity robust genug?

---

## 13. Lebendes Dokument – Update-Pflichtfelder

> **Bei jedem Update exakt 3 Felder:**

| Feld | Inhalt |
|------|--------|
| **Phase** | Aktuelle Phase (z.B. Golden Path / Work-Packet Continuity) |
| **Größter Engpass** | Was aktuell das größte Hindernis ist |
| **Welcher Auftragstyp liefert heute realen Nutzen?** | Konkrete Antwort, nicht Theorie |

---

> **Letzter Satz:** *Erst muss die Maschine für David klar, steuerbar und nützlich werden — dann darf sie größer, autonomer und mehrspurig werden.*