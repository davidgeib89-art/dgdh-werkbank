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
- **Role Template Registry:** `GET /api/role-templates` listet kanonische Templates fuer das Dashboard
- **Agent PATCH support:** `adapterConfig.roleTemplateId` + `roleAppendPrompt` koennen ueber `PATCH /api/agents/:id` gesetzt werden
- **Dashboard-Bruecke:** Agent-Edit-UI hat Rollen-Dropdown + Operator-Prompt und speichert ueber den bestehenden Save-Flow
- **Create-Flow gefixt:** Rollen-Dropdown + Operator-Prompt persistieren jetzt auch beim Neuanlegen eines Agents
- **Neue Agents erlauben On-Demand-Wakeups standardmaessig:** `wakeOnDemand=true`, damit Issue-Zuweisungen sofort Runs ausloesen koennen
- **Erste 3 Templates vorhanden:** `worker.json`, `ceo.json`, `reviewer.json`
- **Erster echter Worker-Beweis geschafft:** Run `720183d5-38f4-4407-a6c9-f09e5b6b9522` lief mit injiziertem `worker`-Template, Operator-Prompt, Quota-aware Routing und erfolgreicher Dateierstellung in sicherem Test-Repo
- **Routing/Quota im Worker-Beweis sinnvoll:** Thinking via Flash-Lite/Router, Execution auf `gemini-3-flash-preview` (`flash`-Bucket), Quota-Snapshot frisch und genutzt
- **Sandbox-Learning:** Gemini-Sandbox blockierte zunaechst lokal; fuer den Worker-Smoke-Test wurde `sandbox=false` genutzt. Sicherheit kam ueber sicheres Repo + Test-Branch, nicht ueber CLI-Sandbox
- **Minimaler Reviewer-Pfad gebaut:** Wenn ein `reviewer`-Agent ein Issue uebernimmt, bekommt er im Prompt automatisch den letzten non-reviewer Run desselben Issues als Review-Ziel (Run-ID, Worker-Agent, Summary, read-file evidence paths)
- **Reviewer blockt sauber ohne Ziel:** Wenn noch kein Worker-Run fuer das Issue existiert, wird der Reviewer-Prompt explizit auf `blocked` statt auf Ausfuehrung des Pakets gelenkt
- **Reviewer gehaertet:** `accepted` soll nur noch bei erfuelltem `doneWhen`, sauberem Scope und ohne unsupported claims/source drift vergeben werden; bei materiellen Zweifeln lieber `needs_revision`
- **Worker-Loop gehaertet:** `worker.json` fuehrt jetzt explizit einen `locate -> hypothesize -> patch -> validate` Default-Loop und verlangt ein kurzes strukturiertes Handoff (`Goal`, `Result`, `Files Changed`, `Validation`, `Blockers`, `Next`)
- **Reviewer in echten Runs bewiesen:** Erstlauf war zu weich, nach Haertung ist ein `accepted`-Urteil auf dem echten Test-Artefakt vertretbar; Review passiert wirklich statt Re-Implementation
- **Reviewer-Matrix gehaertet:** `reviewer.json` prueft jetzt entlang `Scope`, `Correctness`, `Evidence`, `Safety/Readiness` und soll vor `accepted` wenn sinnvoll schnelle Checks wie readback/lint/test/build nutzen
- **Reviewer-Matrix jetzt parseable:** Output-Format ist als feste Tabelle definiert (`Dimension | Status | Note`), damit spaeter CEO/Parser die Review-Dimensionen zuverlaessig lesen koennen
- **CEO V1 Template gebaut:** `ceo.json` enthaelt jetzt Constitution-Check, fixes Packet-Schema (`Titel`, `Ziel`, `Scope`, `doneWhen`, `targetFolder`, `Annahmen`, `[NEEDS INPUT]`) und festen Abschluss-Handoff
- **CEO auf Token-Disziplin geschaerft:** Kontextbudget jetzt explizit im Template (`max. 3-5 direkt relevante Dateien`, kein Codebase-Exploration-Loop, keine spekulativen/missing-file Suchen)
- **Minimale CEO-Delegationsbruecke vorbereitet:** Kein neues Tool noetig; Gemini bekommt schon Paperclip API Zugang. `execute.ts` injiziert jetzt auch `PAPERCLIP_PROJECT_ID`, und der API-Hinweis enthaelt ein PowerShell-sicheres Beispiel zum Erstellen unzugewiesener Child-Issues ueber `run_shell_command`
- **CEO-Delegation nachgeschaerft:** Nach dem ersten Rerun sucht der CEO nicht mehr nach `pc`/`paperclip`-CLI oder Subagent-Hilfe, sondern soll direkt `Invoke-RestMethod` gegen die bestehende Paperclip-HTTP-API verwenden
- **CEO-Live-Beweis geschafft:** Run `e204fe77-639d-4a3e-a2d3-4fd140a1331b` hat im richtigen Projekt/Workspace 4 echte unzugewiesene Child-Issues unter `DGD-32` erzeugt (`DGD-33` bis `DGD-36`) statt nur Prosa auszugeben
- **CEO-Budget deutlich verbessert:** Erster CEO-Planungsrun lag bei ~345k Input-Tokens; der echte Delegations-Beweis lag bei `61,877` Total-Tokens (`54,712` Input, `2,308` Output) mit 5 Tool-Calls
- **CEO braucht API-Hinweis automatisch:** `execute.ts` schaltet den Paperclip-API-Hinweis fuer `roleTemplateId=ceo` jetzt automatisch ein; der Live-Agent wurde zusaetzlich auf `includeApiAccessNote=true` gesetzt
- **Erste komplette Firmenkette bewiesen:** `DGD-32 -> DGD-33` lief als echte `CEO -> Worker -> Reviewer`-Kette durch. Worker-Run `63f52e05-3d6c-4518-900e-24c7902526f1` erzeugte `docs/schema-refinement-recommendations.md`, Reviewer-Run `fca4fe60-13a3-4348-b040-2aedc53d4fd7` akzeptierte, `DGD-33` ging automatisch auf `done`
- **Reviewer-Kontext-Fix gebaut:** Reviewer bekam anfangs nur Run-Metadaten und blockte deshalb trotz vorhandenem Artefakt. `heartbeat.ts` liefert jetzt zusaetzlich Worker-Handoff und erzeugte Artefaktpfade in den Review-Prompt
- **Issue-Lifecycle jetzt automatisch:** Erfolgreicher `worker`-Run zieht ein Issue im normalen Assignment-Flow auf `in_review` (auch wenn es vorher noch `todo` war); erfolgreicher `reviewer`-Run mit `Verdict: accepted` zieht auf `done`
- **Reviewer-Verdict-Parser gefixt:** `stdoutExcerpt` liegt bei Gemini als NDJSON/stream-json vor; `extractReviewerVerdict()` rekonstruiert jetzt Assistant-Content aus den JSON-Linien, damit `Verdict: accepted` auch in echten Run-Logs erkannt und `Issue -> done` wirklich ausgelost wird
- **Geschlossene Issues promoten keine alten deferred Runs mehr:** Nach `done`/`cancelled` werden deferred issue-execution wakes nicht mehr neu gestartet

### Was noch fehlt
- **CEO noch nicht live bewiesen:** Template und Prompt stehen, aber es gibt noch keinen echten CEO-Run der Mission -> Work-Packet-Issues im Dashboard erzeugt
- **Kein automatischer Worker -> Reviewer Chain:** Der minimale Reviewer ist nutzbar, aber noch nicht automatisch nach Worker-Abschluss verdrahtet
- **Rollen noch nicht voll ausgereift:** Reviewer urteilt jetzt brauchbar, aber operative Effizienz ist noch nicht ideal (z. B. PowerShell-`&&`-Fehlversuche)
- **Quota-Observability weiter schaerfen:** Snapshot wird gespeichert + wiederverwendet, aber fruehere `0%`-Drift zeigt, dass Refresh-/Darstellungslogik noch weiter verifiziert werden sollte

### Naechste Schritte (Prioritaet)
1. **Zweite CEO-Kette fahren:** z. B. `DGD-35` oder `DGD-36`, damit wir sehen ob der Erfolg reproduzierbar ist und nicht nur ein Gluecksfall
2. **Kleinen Shell-/Tooling-Fix fuer Gemini ziehen:** PowerShell-`&&` vermeiden und `node-pty/AttachConsole`-Laerm rund um `run_shell_command` spaeter entschlacken
3. **Tool-/Guardrail-Loop spaeter ziehen:** nach 1-2 weiteren CEO-basierten Packet-Runs MCP-/policy-aehnlicher machen und Checks tiefer in den Loop zurueckfuehren

---

## Architektur-Entscheidungen (gefestigt)

- **Engine ≠ CEO.** Engine = Infrastruktur (Modellwahl, Budget, Kontext). CEO = Agent-Rolle (plant, delegiert, reviewed).
- **Rollen = kanonische Templates.** Feste systemdefinierte Rollen (`CEO`, `Worker`, `Reviewer`) in `server/config/role-templates/*.json`. Nicht vom Agenten selbst mutierbar. Details: `doc/plans/2026-03-21-role-template-architecture.md`.
- **Packets 1+2 fertig.** Template-System definiert + drei Rollen spezifiziert. Packets 3-6 erst nach Beweis.
- **Paper-Review schaerft die Reihenfolge.** Erst Worker-Loop haerten, dann Reviewer-Matrix, dann CEO V1; grosser Tool-/Guardrail-Ausbau erst danach.
- **Beweis vor Infrastruktur.** Smoke-Test mit echter worker.json vor DB-Migration/UI-Dropdown.
- **Smoke-Test-Pfad existiert bereits im Code.** `server/config/role-templates/worker.json` ist angelegt; `adapterConfig.roleTemplateId = "worker"` und optional `roleAppendPrompt` werden in `heartbeat.ts` aufgeloest und als `paperclipRoleTemplatePrompt` in Gemini-Prompts injiziert.
- **Dashboard kann Rollen jetzt bedienen.** Rolle + Operator-Prompt laufen ueber bestehendes `adapterConfig` JSON; kein neues DB-Schema, keine Migration.
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

> Zuletzt aktualisiert: 2026-03-21 von Claude Code (MEMORY aktualisiert auf Post-Engine-Stand + aktive Arbeitsdokumente verlinkt)
