# MEMORY - Geteilter Zustand aller AIs

> Diese Datei wird von JEDER AI gelesen und gepflegt die in diesem Repo arbeitet.
> Halte sie aktuell. Die naechste AI (oder du selbst nach /compact) ist darauf angewiesen.
> Max ~150 Zeilen. Fakten, keine Prosa. Stabile Infos, keine Session-Details.

---

## Aktueller Stand (2026-03-21)

**Phase:** Echte Aufgaben - Enforced Routing aktiv, naechster Schritt: reale Arbeit

### Was funktioniert
- **Live Quota:** Echte Google-Quota-Daten fliessen via `gemini-quota-api.ts` ins Routing (flash=10%, pro=11%, flash-lite=9%)
- **Flash-Lite Router:** Liefert korrekte autonome Proposals (Modell, Bucket, Skills, Risk)
- **Issue Runs:** Starten sauber via `PATCH /api/issues/{id}` mit `assigneeAgentId`
- **Quota-Injection:** Automatisch vor jedem Run in die Routing-Pipeline
- **OAuth:** Credentials via Env Vars (`GEMINI_OAUTH_CLIENT_ID`, `GEMINI_OAUTH_CLIENT_SECRET`)
- **Enforced Routing:** `defaultMode: soft_enforced` -> Flash-Lite-Entscheidung steuert tatsaechlich welches Modell laeuft (`laneStrategy: soft_enforced_use_recommended`)

### Was NICHT funktioniert
- **Heartbeats broken:** Kein Issue-Kontext -> Gemini geht ohne Aufgabe rogue
- **Keine echte Entlastung:** Noch keine reale Aufgabe erledigt die David abnimmt

### Naechste Schritte (Prioritaet)
1. Erstes echtes Mini-Projekt: Gemini erledigt reale Aufgabe
2. Heartbeat-Konzept ueberdenken: Was sollen Heartbeats im DGDH-Kontext tun?

---

## Architektur-Entscheidungen (gefestigt)

- **Flash-Lite entscheidet, NICHT der Server.** Keine Heuristiken. Flash-Lite bekommt Task + Quota + Skills und entscheidet alles.
- **Issues IMMER mit projectId erstellen** - sonst kein Workspace-Lookup, Gemini faellt in agent-home
- **Skill-Matrix geloescht** - war deterministisch, David will das Flash-Lite autonom entscheidet
- **Token Caps = Warnings, kein hard stop** - timeoutSec ist der echte Guard
- **Gemini zuerst, aber Engine-Core provider-agnostisch.** Phase 1 optimiert auf Gemini; spaeter Claude/Codex mit gleichem Smart-Core, nur Quota/Model-Layer provider-spezifisch.
- **Heartbeats = Ausfuehrungspuls, nicht Autonomie-Loop.** DGDH-Zielbild: Heartbeat fuehrt genau ein bereits autorisiertes Work Packet aus.
- **Shared Memory spaeter neu denken.** Vorhandene Memory/Reflection-Basis ist nur Rohbau; Zielbild ist missions-/packet-/review-orientierte Handoff-Memory statt generischer Vollkontext.
- **North Star Pflichtdoku:** `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` ist die aktuelle Leitlinie und soll nach `INIT.md` + `MEMORY.md` immer gelesen werden.
- **MiniMax spaeter als bevorzugte Worker-Lane pruefen.** Heute keine erkennbare MiniMax-Spur im Repo; erst nach stabiler Gemini-Lane und stabilisiertem Firmenbetrieb integrieren.

---

## Wichtige IDs

| Was | ID |
|-----|-----|
| Company | `45b3b93e-8a30-4078-acc6-1c721b29b2ff` |
| Agent Research-Gemini | `9e721036-35b7-446e-a752-2df7a1a8caad` |
| Projekt Gemini Benchmark | `8534a922-eaf2-4495-a250-648b0d1ca96b` |

---

## Git-Status

- Branch: `docs/maintenance-20260321`
- Sauberer Commit `b4698dd`: Live Quota API + Flash-Lite Router Improvements
- Noch nicht gepusht (vorher: GitHub blockierte wegen hardcoded OAuth Secrets -> jetzt gefixt via Env Vars)
- 16 veraltete Docs archiviert nach `company-hq/archive/2026-03-21-pre-live-quota/`

---

## Letzter bewiesener Run (e05ffd57)

```txt
Quota:       flash=10%, pro=11%, flash-lite=9% (live, alle ok)
Router:      source=flash_lite_call, parseStatus=ok, accepted=true
Proposal:    research-light, small, flash, gemini-3-flash-preview
Latenz:      12.9s (Router) + 2.8s (Gemini-Ausfuehrung)
Ergebnis:    succeeded - README gelesen und zusammengefasst
Problem:     advisory only - Router-Empfehlung wurde nicht enforced
```

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

> Zuletzt aktualisiert: 2026-03-21 von Codex + Claude Code
