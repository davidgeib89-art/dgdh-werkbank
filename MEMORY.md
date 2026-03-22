# MEMORY - Geteilter Zustand aller AIs

> Diese Datei wird von JEDER AI gelesen und gepflegt die in diesem Repo arbeitet.
> Halte sie aktuell. Die naechste AI (oder du selbst nach /compact) ist darauf angewiesen.
> Max ~333 Zeilen (Davids Lieblingszahl). Fakten, keine Prosa. Stabile Infos, keine Session-Details.

---

## Aktive Arbeitsdokumente

> **PFLICHT:** Lies diese Dokumente fuer den vollen aktuellen Kontext. Diese MEMORY.md ist nur eine Zusammenfassung.

| Dokument | Was drin steht |
|----------|----------------|
| `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` | Aktuelle Leitlinie — Zielbild, Rollen, Engine vs Agent Layer |
| `doc/plans/2026-03-21-role-template-architecture.md` | Role-Template-System — Packets 1+2 fertig (Design + Rollendefinitionen) |
| `doc/plans/2026-03-21-gemini-engine-to-role-architecture-progress-report.md` | Was zuletzt gebaut/gefixt wurde — Bruecke von Engine zu Rollen |

---

## DGDH Revenue Lane #1 — Web Design Produkt

**Das ist Davids erstes echtes Produkt und die Origin Story von DGDH.**

### Was ist es?
Astro 5 + Keystatic CMS OnePager-Template fuer kleine Unternehmen.
Hosting: Cloudflare Pages Free Tier. Kunde zahlt nur ~5€/Jahr fuer Domain.

### Repo & erster Kunde
- Template-Repo: `C:\Users\holyd\DGDH\worktrees\ferienwohnung-bamberger`
- Erster Kunde live: https://urlaub-bei-bambergers.de/ (Ferienwohnung Bamberger)
- Naechstes Projekt: Gleiche Site fuer Kunden-Tante, anderes Branding

### Content-Modell (alles statische Textdateien, keine DB!)
```
src/content/settings/site.json     → Branding, SEO, Theme, Kontakt
src/content/settings/profile.json  → Branchentyp (ferienwohnung | verein | other)
src/content/sections/*/            → Sections: showcase, highlights, pricing,
                                      testimonials, location, faq, poi, contact-form
twilight.config.yaml               → YAML-Fallback, Config via getResolvedSettings()
```

### Die Grosse Vision (AI-Workflow)
1. David legt Kundendaten in einen Ordner (Texte, Bilder, Logo, PDFs, Word-Dokumente)
2. **Ingestion-Schritt:** Kundendaten → Markdown normalisieren (markitdown-Ansatz)
3. DGDH-System forkt Template-Repo
4. Gemini-Worker liest normalisiertes Markdown + Schema → befuellt alle Content-Dateien
5. Push zu GitHub → Cloudflare deployt automatisch
6. David reviewed → fertig

**Warum das perfekt fuer AI ist:** Kein Backend, keine DB — nur strukturierte Textdateien.
Gemini kennt das Schema (keystatic.config.ts + content.config.ts) und weiss exakt was zu befuellen ist.

**Ingestion-Pattern (markitdown-inspiriert):** Kundenordner enthaelt oft PDFs, Word-Dokumente,
Bilder mit Text. Vor dem Worker-Run alles → Markdown normalisieren. Token-effizienter, reviewbar,
handoff-faehig. Ref: `github.com/microsoft/markitdown`

### Branchenprofile (geplant)
`ferienwohnung` ✅ | `verein` | `friseur` | `restaurant` | `handwerker` | ...

---

## CEO Profil

- **Name:** David Geib, geb. 29.10.1989, Meddersheim
- **Status:** Aktuell arbeitslos (~650 EUR/Monat), arbeitet Vollzeit an DGDH
- **Neurodivergent:** IQ ~133, wahrscheinlich ADHS + Autismus / Hochbegabung — maximale Mustererkennung
- **Motivation:** Geld verdienen → AI-Abos/Kontingente skalieren → Welt verbessern (Ziel: Psychologie studieren, Kinder foerdern)
- **Zeithorizont:** Wichtiges Gespraech 30.06 → danach 6-8 Wochen nicht verfuegbar. Bis dahin muss DGDH laufen.
- **Leitfrage:** Entlastet das David real oder verschoenert es nur die Maschine?

### AI Stack & Budget (~100 EUR/Monat)
| Tool | Kosten | Rolle |
|------|--------|-------|
| Claude Code | ~20 EUR | Builder, Architekt, CLI |
| Codex (OpenAI) | ~20 EUR | CLI Worker |
| Gemini AI Pro x2 | ~40 EUR | Primaere Worker-Lane (Quotas resetten taeglich) |
| MiniMax Coding Plan | ~20 EUR | Arbeitsbiene fuer guenstige Massenarbeit (2.7M Context) |

**Regel:** Jeder Euro muss sich in echter Entlastung oder Einnahmen niederschlagen.

---

## Aktueller Stand (2026-03-21)

**Phase:** Engine bewiesen + Worker und Reviewer in echten Runs bewiesen. CEO V1 ist live als Planungs- und Delegationsrolle bewiesen, und die erste vollstaendige Kette ist geschafft: `Mission -> CEO -> Child-Issue -> Worker -> Reviewer -> done`.

### Was funktioniert (bewiesen in echten Runs)

**Engine-Schicht:**
- Live Quota, Enforced Routing (`soft_enforced`), Context Injection, Token Cap = Warning, Heartbeat-Gate, Routine-Approval deaktiviert

**Rollen (alle 3 Templates bewiesen):**
- `worker.json`: `locate → hypothesize → patch → validate` Loop + strukturierter Handoff
- `reviewer.json`: 4 Dimensionen (Scope/Correctness/Evidence/Safety), parseable Matrix-Tabelle, Pre-Accept-Rules
- `ceo.json`: Constitution-Check, Packet-Schema mit `[NEEDS INPUT]`, Token-Budget max 3-5 Dateien, API-Hinweis automatisch aktiv

**Infrastruktur:**
- Role Template Registry (`GET /api/role-templates`), Agent PATCH support, Dashboard Rollen-Dropdown + Create-Flow
- Evidence-Fallback, Path-Normalization, `wakeOnDemand=true` fuer neue Agents
- PowerShell `&&`→`;` Normalisierung; Loop-Detection 3x=warn / 5x=stop (`errorCode: loop_detected`)
- `[NEEDS INPUT]` Dashboard: Marker aus `issue.description` → gelber Hinweis-Block + Edit/Comment-CTAs

**Kette bewiesen (reproduzierbar):**
- `DGD-32 → DGD-33` und `DGD-32 → DGD-35` liefen als `CEO → Worker → Reviewer → done`
- CEO-Budget: ~345k Tokens (erster Run) → 61,877 Tokens (nach Haertung)
- Reviewer-Kontext-Fix: `heartbeat.ts` liefert Worker-Handoff + Artefaktpfade in Review-Prompt
- Issue-Lifecycle automatisch: Worker → `in_review`; Reviewer `accepted` → `done`

### Was noch fehlt
- **Kein automatischer Worker → Reviewer Chain:** Manuell zuweisen noetig
- **CEO Parent-Aggregation fehlt:** DGD-32 bleibt `todo` bis Child-Issues manuell aggregiert werden
- **Quota-Observability:** Refresh-/Darstellungslogik noch nicht voll verifiziert

### Naechste Schritte (Prioritaet)
1. **`ceo.json` [NEEDS INPUT]-Feinschliff:** Eine Zeile ergaenzen — Marker soll durch echte Antwort ersetzt, nicht nur geloescht werden
2. **CEO Parent-Aggregation:** DGD-32 schliessen wenn Children done — CEO-Review-Run der Child-Verdicts aggregiert
3. **Tool-/Guardrail-Loop:** MCP-aehnlicher, Checks tiefer in den Loop — erst nach Parent-Aggregation

---

## Architektur-Entscheidungen (gefestigt)

- **Engine ≠ CEO.** Engine = Infrastruktur (Modellwahl, Budget, Kontext). CEO = Agent-Rolle (plant, delegiert, reviewed).
- **Rollen = kanonische Templates.** Feste systemdefinierte Rollen (`CEO`, `Worker`, `Reviewer`) in `server/config/role-templates/*.json`. Nicht vom Agenten selbst mutierbar. Details: `doc/plans/2026-03-21-role-template-architecture.md`.
- **Beweis vor Infrastruktur.** Kette bewiesen (2x reproduziert) bevor neue Infrastruktur.
- **Dashboard bedient Rollen.** Rolle + Operator-Prompt ueber `adapterConfig` JSON; kein DB-Schema, keine Migration.
- **Keine Mikro-Approvals.** David = CEO-Entscheidungen, nicht Klick-Dispatcher fuer Routine.
- **Heartbeats = Ausfuehrungspuls.** Genau ein autorisiertes Work Packet, nicht Autonomie-Loop.
- **Gemini zuerst.** Engine-Core provider-agnostisch, aber Phase 1 nur Gemini.
- **Strukturierte Handoff-Summaries (inspiriert von ReMe).** Worker/Reviewer/CEO sollen Ergebnisse in festem Schema liefern: Goal, Result, Files Changed, Blockers, Next. Macht Handoffs maschinell auswertbar. Zuerst als Prompt-Anweisung, spaeter parsed Output. Ref: `github.com/agentscope-ai/ReMe`
- **Shared Memory soll strikt scoped sein (inspiriert von supermemory).** Nicht globales Profil-Memory, sondern kleine Slices pro `company -> project -> issue/work-packet`; spaeter mit Relations wie `updates|extends|derives` zwischen Handoffs. Ref: `github.com/supermemoryai/supermemory`
- **Loop-Detection im Adapter (inspiriert von PentAGI).** Wenn Gemini denselben fehlerhaften Command 3x wiederholt (z.B. PowerShell-`&&`), soll der Adapter warnen/stoppen statt Tokens zu verbrennen. PentAGI nutzt Schwelle 5x identische Tool-Calls + max 10 Gesamt. Unser Ansatz: deterministische Regel im Adapter, kein separater Agent.
- **`complete_task` Barrier-Tool (inspiriert von PentAGI).** Worker/Reviewer sollen am Run-Ende ein explizites Tool aufrufen das strukturiertes Ergebnis erzwingt (statt einfach aufzuhoeren). Verbindet Handoff-Summaries mit klarem Run-Ende. PentAGI: `FinalyTool`/`CodeResult`/`HackResult`. Ref: `github.com/vxcontrol/pentagi`
- **Token-Budgets pro Rolle (inspiriert von PentAGI).** CEO bekommt hoeheres Token-Budget (plant, braucht Kontext), Worker mittel, Reviewer klein. In Role-Templates als Feld, nicht hardcoded. PentAGI: Generator 4096, Coder 2048, Searcher 1024.
- **CEO-Output als strukturiertes Packet-Template (inspiriert von Spec-Kit).** CEO soll Work Packets nicht frei formulieren sondern in festem Format: Titel, Ziel, Scope, doneWhen, targetFolder, Annahmen, `[NEEDS INPUT]`-Marker fuer Unklarheiten. `[NEEDS INPUT]` ist besser als raten — David sieht sofort was Klaerung braucht. Ref: `github.com/github/spec-kit` (Specify → Plan → Tasks → Implement = Mission → CEO → Packets → Worker → Review). Gehoert direkt in den `ceo.json` systemPrompt.
- **Constitution-Check im CEO-Prompt (inspiriert von Spec-Kit).** Kompakter Pruefblock bevor Packets erstellt werden: Entlastet es David real? Scope klar genug fuer Worker? Passt ins Budget? Braucht Review? Kein separates File, rein als Prompt-Anweisung.
- **CEO braucht API-Hinweis automatisch.** Der erste CEO-Delegationslauf blieb bei Prosa/Snippets stehen, weil `includeApiAccessNote` im Agent-Config fehlte. Fix-Richtung: fuer `roleTemplateId=ceo` den Paperclip-API-Hinweis im Gemini-Adapter automatisch einschalten und explizit sagen: echte `run_shell_command`-POSTs ausfuehren, keine Demo-Kommandos ausgeben.
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

> Zuletzt aktualisiert: 2026-03-22 von Claude Code (PowerShell-Fix + Loop-Detection + [NEEDS INPUT]-Dashboard ergaenzt, veraltete Eintraege bereinigt, unter 150 Zeilen)
