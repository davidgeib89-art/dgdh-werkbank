# MEMORY - Geteilter Zustand aller AIs

> Diese Datei wird von JEDER AI gelesen und gepflegt die in diesem Repo arbeitet.
> Halte sie aktuell. Die naechste AI (oder du selbst nach /compact) ist darauf angewiesen.
> Max ~150 Zeilen. Fakten, keine Prosa. Stabile Infos, keine Session-Details.

---

## Aktueller Stand (2026-03-21)

**Phase:** Engine Thinking Layer + Heartbeat Gate vollstaendig. Naechster Schritt: erste echte DGDH-Aufgabe + CEO-Agent-Rolle

### Was funktioniert (bewiesen in Run 97d945f8)
- **Live Quota:** Echte Google-Quota-Daten fliessen ins Routing
- **Engine Thinking Layer:** Flash als Thinking-Modell; Modellwahl, Skills, Budget, Risk, doneWhen
- **Model Override:** `resolvedConfig.model = effectiveModelLane` wenn `applyModelLane=true` (heartbeat.ts ~3261)
- **Context Injection:** `doneWhen`, `executionIntent`, `targetFolder` als "Engine directive" im Gemini-Prompt (execute.ts `renderEngineDirectiveNote`)
- **Enforced Routing:** `soft_enforced` -> Thinking-Layer steuert tatsaechlich welches Modell laeuft
- **Token Cap = Warning only:** Kein Run-Kill bei Ueberschreitung, nur warn-Log
- **Issue Runs:** Starten sauber via `PATCH /api/issues/{id}` mit `assigneeAgentId`
- **OAuth:** Credentials via Env Vars (`GEMINI_OAUTH_CLIENT_ID`, `GEMINI_OAUTH_CLIENT_SECRET`)
- **Heartbeat-Gate:** Kein Run ohne zugewiesenes Issue. Timer ohne Issue -> cancelled (agent=idle). Non-Timer ohne Issue -> blocked (policy stop). Ausnahme: `wakeReason=approval_approved`.

### Was noch fehlt
- **Kein Review-Layer:** doneWhen landet im Prompt aber niemand prueft ob Gemini es erfuellt hat
- **Keine CEO-Agent-Rolle:** Noch kein Agent der Missionen zerlegt und Work Packets erstellt

### Naechste Schritte (Prioritaet)
1. Erste echte DGDH-Aufgabe die David real entlastet
2. CEO-Agent-Rolle: Gemini Pro als Missions-Planer/Delegator (Agent-Rolle, NICHT Engine-Layer)
3. Review-Layer: Worker-done -> Reviewer-Agent -> CEO entscheidet

---

## Architektur-Entscheidungen (gefestigt)

- **Engine Thinking Layer entscheidet, NICHT der Server.** Keine Heuristiken. Thinking-Layer (Flash) bekommt Task + Quota + Skills und entscheidet alles.
- **Thinking Layer ≠ CEO.** Engine-Layer ist Infrastruktur (Modellwahl, Budget, Kontext-Selektion). CEO ist eine Agent-Rolle die plant/delegiert/reviewed. Zwei getrennte Ebenen.
- **Issues IMMER mit projectId erstellen** - sonst kein Workspace-Lookup, Gemini faellt in agent-home
- **Skill-Matrix geloescht** - war deterministisch, David will das Flash autonom entscheidet
- **Token Caps = Warnings, kein hard stop** - timeoutSec ist der echte Guard
- **Gemini zuerst, aber Engine-Core provider-agnostisch.** Phase 1 optimiert auf Gemini; spaeter Claude/Codex mit gleichem Smart-Core, nur Quota/Model-Layer provider-spezifisch.
- **Heartbeats = Ausfuehrungspuls, nicht Autonomie-Loop.** DGDH-Zielbild: Heartbeat fuehrt genau ein bereits autorisiertes Work Packet aus.
- **Keine Mikro-Approvals fuer normale bounded Tasks.** Das widerspricht dem DGDH-/North-Star-Zielbild. David soll nur bei echten Ausnahme-, Risiko- oder Grosslagen eingebunden werden.
- **Shared Memory spaeter neu denken.** Vorhandene Memory/Reflection-Basis ist nur Rohbau; Zielbild ist missions-/packet-/review-orientierte Handoff-Memory statt generischer Vollkontext.
- **Spaetere Governance != heutiges Stop-and-Ask.** Gewuenscht ist spaeter ein separater Reflexions-/Governance-Layer gegen Regeln fuer wirklich kritische/grosse Aufgaben, nicht Routine-Approval fuer kleine Runs.
- **Rollen werden kanonische Templates, nicht freie DB-Labels.** Zielbild: feste systemdefinierte Rollen (`CEO`, `Worker`, `Reviewer`) + optionaler operator-controlled append prompt; Rolle darf nicht vom Agenten selbst mutiert werden. Details: `doc/plans/2026-03-21-role-template-architecture.md`.
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

- Branch: `main` (aktuell)
- Letzter Commit `0d7698c`: Universal AI Init System + Roadmap + archivierte Docs
- Uncommitted Changes: heartbeat.ts (Gate), MEMORY.md, INIT.md, gemini-routing-policy.v1.json, North-Star-Roadmap
- Noch nicht gepusht

---

## Letzter bewiesener Run (97d945f8)

```txt
Router:      flash_lite_call, parseStatus=ok, cacheHit=false
Proposal:    research-light, small, flash, gemini-3-flash-preview
Intent:      review | doneWhen injiziert in Prompt
missingInputs: [] (kein fehlerhafter Skill-Eintrag mehr)
Token:       29,098 (83% von 35k cap) -> nur warn, kein fail
Ergebnis:    succeeded - README gelesen und zusammengefasst
Engine:      Modell, Kontext und Skills alle korrekt enforced
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

> Zuletzt aktualisiert: 2026-03-21 von Claude Code (Heartbeat Gate implementiert)
