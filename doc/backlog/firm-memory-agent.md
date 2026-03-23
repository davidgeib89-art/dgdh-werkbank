# Backlog: Firm Memory Agent

**Status:** backlog
**Erstellt:** 2026-03-23
**Autoren:** Claude + Perplexity
**Trigger:** Nach 10+ abgeschlossenen echten Runs (Begründung unten)
**Verweis:** North Star §19 (Reflexiver Loop), `doc/research/2026-03-23-hermes-agent-research.md`

---

## Problem

DGDH-Agenten lernen nicht aus vergangenen Runs.
CEO hat keine Ahnung was Worker letzte Woche falsch gemacht hat.
Jeder Sprint beginnt bei Null — kein institutionelles Gedächtnis.

Eine echte Firma erinnert sich. DGDH noch nicht.

---

## Was DGDH bereits hat (zwei von drei Schichten)

| Gedächtnis-Schicht | Was | Status |
|--------------------|-----|--------|
| **Episodisch** | Was in jedem Run passiert ist | ✅ Issues-DB, Verdicts, Summaries |
| **Semantisch** | Muster die sich über Runs ergeben | ❌ **fehlt — das ist Firm Memory** |
| **Prozedural** | Wie Dinge gemacht werden | ✅ Skills-Backlog (Skill-Creation Engine) |

Firm Memory ist nicht ein neues System — es ist die Brücke zwischen zwei Systemen
die schon existieren. Eine Lücke schließen, kein Neubau.

---

## Was der Firm Memory Agent macht

Ein Background-Agent (kein eigener Heartbeat-Slot) läuft periodisch,
liest abgeschlossene Issues + Verdicts, extrahiert Muster via Flash-Lite,
schreibt kompakte Learnings in einen persistenten Store.

Vor jedem CEO/Worker/Reviewer-Run wird der relevante Auszug als
`additionalContext` injiziert — nicht als System-Prompt (Token-Cache bleibt intact).

```
Abgeschlossene Issues + Verdicts
        ↓
Flash-Lite: "Was war das häufigste Problem der letzten 10 Runs?"
        ↓
firm-memory/learnings.json  ←  persistenter Store (git-tracked)
        ↓
Heartbeat-Prompt-Builder: inject als additionalContext
        ↓
CEO / Worker / Reviewer bekommt Kontext — entscheidet selbst
```

---

## Drei Phasen

### Phase 1 — Memory Accumulation

- Cron oder einmalig nach jedem 10. Run
- Liest alle abgeschlossenen Issues + Reviewer-Verdicts + CEO-Summaries
- Flash-Lite-Modell extrahiert:
  - Häufigste `changes_requested` Gründe
  - Packet-Typen die länger dauern als erwartet
  - CEO-Missionen die zu Reviewer-Ablehnung führten
- Output: `server/config/firm-memory/learnings.json`
- **Wichtig:** Jedes Learning bekommt `timestamp` + `runCount` (Konfidenz)

### Phase 2 — Whisper Injection

- Heartbeat-Prompt-Builder liest `firm-memory/learnings.json`
- Rollenspezifische Filterung:
  - CEO: Mission-Patterns, häufige Fehler-Typen
  - Worker: Scope-Tipps, häufige Reviewer-Kritik
  - Reviewer: Was Reviewer zuletzt häufig bemängelt hat
- Injection als `additionalContext` — kein System-Prompt
- `additionalContext` im Heartbeat-Prompt-Builder existiert bereits — kein neuer Mechanismus nötig

### Phase 3 — Proaktive Reflexion (Skill-Creation Engine)

- Firm Memory erkennt: "Wir machen X zum 5. Mal manuell"
- Schlägt neuen Skill vor → CEO präsentiert David → David approves → Sprint
- Das ist der reflexive Loop aus North Star §19

---

## Kritisches Design-Detail: Verfallsdatum + Konfidenz

**Risiko (Perplexity):** Firm Memory kann falsche Patterns einbrennen.
Wenn frühe Runs alle denselben Bug hatten (der längst gefixt ist),
würde Phase 1 diesen Bug als "häufiges Problem" einlernen — obwohl er
nicht mehr existiert.

**Lösung von Anfang an im Design:**

```json
{
  "learnings": [
    {
      "pattern": "Worker überschreitet targetFolder bei heavy-architecture Packets",
      "frequency": 4,
      "confidence": 0.8,
      "firstSeen": "2026-03-23",
      "lastSeen": "2026-03-30",
      "expiresAfter": 30,
      "status": "active"
    }
  ]
}
```

- `expiresAfter`: Learnings älter als N Tage ohne neuen Beleg → `status: "stale"`, werden nicht mehr injiziert
- `confidence`: steigt mit Frequency, sinkt mit Alter
- David kann Learnings manuell auf `status: "dismissed"` setzen

---

## Trigger: erst nach 10+ echten Runs

**Begründung (Perplexity):**
Zu wenige Runs → falsche Patterns → schlechte Whispers.

- Weniger als 10 Runs: zu wenig Signal, zu viel Rauschen
- 10 echte Runs: realistisch erreichbar sobald E2E-Lauf stabil ist
- Bis dahin: Backlog — danach logischer nächster Schritt

---

## Abgrenzung zu ähnlichen Projekten

| Projekt | Gedächtnis für | Review-Gate |
|---------|---------------|-------------|
| claude-subconscious (Letta) | Einen einzelnen Coder | Nein |
| Hermes Agent | Skills eines Agenten | Nein |
| **DGDH Firm Memory** | **Die gesamte Firma (CEO+Worker+Reviewer)** | **Ja (David approves)** |

---

## Was NICHT gebaut wird (jetzt)

- Kein externer Dienst (kein Letta-API-Key)
- Kein autonomes Handeln auf Basis von Learnings (nur Empfehlungen)
- Kein neuer Heartbeat-Slot (Background-Only)
- Kein Training / Fine-Tuning auf Basis von Learnings (Phase 4 Vision)
