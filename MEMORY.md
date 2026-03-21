# MEMORY - Geteilter Zustand aller AIs

> Diese Datei wird von JEDER AI gelesen und gepflegt die in diesem Repo arbeitet.
> Halte sie aktuell. Die naechste AI (oder du selbst nach /compact) ist darauf angewiesen.
> Max ~150 Zeilen. Fakten, keine Prosa. Stabile Infos, keine Session-Details.

---

## Aktive Arbeitsdokumente

> **PFLICHT:** Lies diese Dokumente fuer den vollen aktuellen Kontext. Diese MEMORY.md ist nur eine Zusammenfassung.

| Dokument | Was drin steht |
|----------|----------------|
| `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` | Aktuelle Leitlinie — Zielbild, Rollen, Engine vs Agent Layer |
| `doc/plans/2026-03-21-role-template-architecture.md` | Role-Template-System — Packets 1+2 fertig (Design + Rollendefinitionen) |
| `doc/plans/2026-03-21-gemini-engine-to-role-architecture-progress-report.md` | Was zuletzt gebaut/gefixt wurde — Bruecke von Engine zu Rollen |

---

## Aktueller Stand (2026-03-21)

**Phase:** Engine bewiesen + Role-Architecture Design fertig. Naechster Schritt: minimaler Smoke-Test (worker.json in echtem Gemini-Run).

### Was funktioniert (bewiesen in echten Runs)
- **Live Quota:** Echte Google-Quota-Daten fliessen ins Routing
- **Engine Thinking Layer:** Flash als Thinking-Modell; Modellwahl, Skills, Budget, Risk, doneWhen
- **Model Override:** `resolvedConfig.model = effectiveModelLane` wenn `applyModelLane=true`
- **Context Injection:** `doneWhen`, `executionIntent`, `targetFolder` als "Engine directive" im Gemini-Prompt
- **Enforced Routing:** `soft_enforced` -> Thinking-Layer steuert welches Modell laeuft
- **Token Cap = Warning only:** Kein Run-Kill bei Ueberschreitung, nur warn-Log
- **Issue Runs:** Starten sauber via `PATCH /api/issues/{id}` mit `assigneeAgentId`
- **Heartbeat-Gate:** Kein Run ohne zugewiesenes Issue
- **Routine-Approval deaktiviert:** Normale bounded Tasks laufen ohne manuelles Approval (North-Star-konform)
- **Evidence-Fallback:** Server-seitiger `tool.evidence` Event wenn Gemini `read_file` mit leerem Output liefert (sha256, preview, byte count)
- **Path-Normalization:** `trimIssueText()` bereinigt HTML-Entities und Markdown-Escaping vor Agent-Prompt

### Was noch fehlt
- **Kein Review-Layer:** doneWhen landet im Prompt aber niemand prueft ob Gemini es erfuellt hat
- **Keine CEO-Agent-Rolle in Runtime:** Design steht (Packet 2), aber noch nicht im System aktiv
- **Role-Templates noch nicht implementiert:** Packets 1+2 (Design) fertig, Packets 3-6 (Implementation) offen

### Naechste Schritte (Prioritaet)
1. **Smoke-Test:** `worker.json` systemPrompt in echten Gemini-Run injizieren, echte Aufgabe testen
2. Wenn Smoke-Test funktioniert: Packet 3 (Backend-Felder fuer roleTemplateId etc.)
3. Erste echte DGDH-Aufgabe die David real entlastet

---

## Architektur-Entscheidungen (gefestigt)

- **Engine ≠ CEO.** Engine = Infrastruktur (Modellwahl, Budget, Kontext). CEO = Agent-Rolle (plant, delegiert, reviewed).
- **Rollen = kanonische Templates.** Feste systemdefinierte Rollen (`CEO`, `Worker`, `Reviewer`) in `server/config/role-templates/*.json`. Nicht vom Agenten selbst mutierbar. Details: `doc/plans/2026-03-21-role-template-architecture.md`.
- **Packets 1+2 fertig.** Template-System definiert + drei Rollen spezifiziert. Packets 3-6 erst nach Beweis.
- **Beweis vor Infrastruktur.** Smoke-Test mit echter worker.json vor DB-Migration/UI-Dropdown.
- **Keine Mikro-Approvals.** David = CEO-Entscheidungen, nicht Klick-Dispatcher fuer Routine.
- **Heartbeats = Ausfuehrungspuls.** Genau ein autorisiertes Work Packet, nicht Autonomie-Loop.
- **Gemini zuerst.** Engine-Core provider-agnostisch, aber Phase 1 nur Gemini.
- **Issues IMMER mit projectId erstellen** - sonst kein Workspace-Lookup
- **Token Caps = Warnings** - timeoutSec ist der echte Guard
- **MiniMax spaeter** - erst nach stabiler Gemini-Lane und Firmenbetrieb

---

## Wichtige IDs

| Was | ID |
|-----|-----|
| Company | `45b3b93e-8a30-4078-acc6-1c721b29b2ff` |
| Agent Research-Gemini | `9e721036-35b7-446e-a752-2df7a1a8caad` |
| Projekt Gemini Benchmark | `8534a922-eaf2-4495-a250-648b0d1ca96b` |

---

## Wie Issue-Run starten

```txt
# Assign (triggert sofort einen Run):
PATCH /api/issues/{id}
Body: {"assigneeAgentId": "9e721036-35b7-446e-a752-2df7a1a8caad"}

# Re-trigger (unassign + reassign):
PATCH /api/issues/{id}  Body: {"assigneeAgentId": null}
# warten
PATCH /api/issues/{id}  Body: {"assigneeAgentId": "9e721036-..."}

# NICHT: POST /api/agents/{id}/wakeup - das ist Heartbeat ohne Kontext!
```

---

> Zuletzt aktualisiert: 2026-03-21 von Claude Code (MEMORY aktualisiert auf Post-Engine-Stand + aktive Arbeitsdokumente verlinkt)
