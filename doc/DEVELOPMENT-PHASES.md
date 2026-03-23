# DGDH Entwicklungsphasen

**Zweck:** Schneller Ueberblick fuer David + alle AIs. Kein Detail — nur Stand + Verweise.
**Detail lebt in:** `CURRENT.md` (naechster Schritt) + `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` (operative Richtung)
**Zuletzt aktualisiert:** 2026-03-23

---

## Phase 1 — Fundament (BEWIESEN)

Einzelne Bausteine existieren und funktionieren isoliert.

| Was | Beweis |
|-----|--------|
| Heartbeat-Loop laeuft stabil | server/src/services/heartbeat.ts |
| Gemini Dual-Failover (account_1 / account_2) | Sprint A-D |
| Lane Routing V1 — packetType + role steuern Modell | Sprint K |
| Revenue Lane bis deploy-faehigem Template-Build | Sprint E-I |
| CEO erstellt Packets aus Mission | Sprint M |
| Worker-PR-Gate — Worker committet + oeffnet PR | Sprint T.1 |
| Scope-Firewall — Worker bleibt in targetFolder | Sprint U |
| Reviewer-Verdict hat Konsequenzen | Sprint Q |
| CEO-Aggregation — Parent schliesst wenn Children done | Sprint R |
| CEO-Merge-Orchestrator — CEO merged akzeptierte PRs automatisch | Sprint T |

---

## Phase 2 — Kette zusammenfuegen (LAUFEND)

Die Einzelteile werden zu einem durchgehenden Ablauf verbunden.

| Was | Status | Verweis |
|-----|--------|---------|
| CEO-Merge-Orchestrator | BEWIESEN (Sprint T) | `CURRENT.md` |
| Erster echter End-to-End-Lauf ohne manuelle Eingriffe | **naechster Schritt** | `CURRENT.md` |

**Einziger offener Schritt:** Echter E2E-Testrun — CEO → Worker (PR) → Reviewer → CEO Merge → Summary.
Kein Blocker. Kein offener Sprint-Buchstabe. Einfach laufen lassen.

---

## Phase 3 — Qualitaet + Erweiterung (BACKLOG)

Die Kette laeuft — jetzt wird sie besser, guenstiger, smarter.

| Was | Prio | Verweis |
|-----|------|---------|
| Dynamische Toolsets per Rolle + Packet-Typ | nach E2E-Lauf | North Star §20 |
| CEO Prompt Hardening (4 Tweaks) | nach E2E-Lauf | `doc/backlog/ceo-prompt-hardening.md` |
| Stage-1-Skip fuer heavy-architecture | nach Sprint V | `doc/backlog/stage1-skip-heavy-architecture.md` |
| Stage-1-Classifier Rename (Architektur-Klarstellung) | nach Sprint V | `doc/backlog/stage1-classifier-rename.md` |
| Skills als User-Messages (Token-Cache) | wenn Kosten messbar | North Star §20 |
| Telegram-Delivery fuer CEO-Summary | nach E2E-Lauf | North Star §20 |
| Session Search fuer CEO (Issue-History) | wenn Redundanz auftritt | North Star §20 |
| Heartbeat Modular Refactor | nach CEO V1 stabil | `doc/backlog/heartbeat-modular-refactor.md` |
| Firm Memory Agent — semantische Gedaechtnis-Schicht | nach 10+ echten Runs | `doc/backlog/firm-memory-agent.md` |

---

## Phase 4 — Selbst-Verbesserung (VISION)

Die Maschine wird faehiger ohne dass David jedes Mal eingreift.

| Was | Voraussetzung | Verweis |
|-----|--------------|---------|
| Skill-Creation Engine — Reflexive Skill-Registrierung | Phase 3 stabil | `doc/backlog/skill-creation-engine.md` |
| Skill-Komposition — CEO schlaegt Kombinationen vor | Skill-Registry laeuft | North Star §19 |
| Provider-Abstraction-Layer (MiniMax, Codex in Kette) | E2E-Lauf bewiesen | North Star §12 |
| Trajectory Generation / RL-Training | 1000+ Runs vorhanden | `doc/research/2026-03-23-hermes-agent-research.md` |

**Harte Grenze:** David approves immer. Auch in Phase 4. In der Constitution eingebacken.
Verweis: `company-hq/AGENT-CONSTITUTION.md`, `doc/architecture/dgdh-agent-architecture.md`

---

## Meilensteine

| Meilenstein | Status |
|-------------|--------|
| Worker kann Code committen + PR oeffnen | BEWIESEN (Sprint T.1) |
| Reviewer hat Konsequenzen | BEWIESEN (Sprint Q) |
| CEO aggregiert wenn alle done | BEWIESEN (Sprint R) |
| CEO-Merge-Orchestrator laeuft automatisch | BEWIESEN (Sprint T) |
| **Erster E2E-Lauf ohne manuelle Eingriffe** | **naechster Meilenstein** |
| David bekommt Telegram-Nachricht von der Maschine | Phase 3 |
| Maschine erstellt ersten neuen Skill selbst | Phase 4 |
