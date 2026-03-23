# Research: Hermes Agent — Was DGDH davon lernen kann

**Erstellt:** 2026-03-23
**Quelle:** https://github.com/NousResearch/hermes-agent
**Autoren:** Claude (Planer) + Perplexity (Planer, Ergaenzungen 2026-03-23)
**Zweck:** Reflexion fuer David + Perplexity + Codex — was ist direkt uebertragbar, was ist Zukunftsvision

---

## Was ist Hermes Agent?

Hermes ist ein selbst-verbessernder AI-Agent von Nous Research (MIT License, Python).
Kernaussage: **"The only agent with a built-in learning loop."**

Hermes loest eine andere Problemstellung als DGDH — es ist ein persoenlicher Assistent
fuer einen einzelnen Nutzer, kein Business-Automatisierungs-System. Aber die
Architektur-Entscheidungen sind auf einem anderen Level als der aktuelle DGDH-Stand.

---

## 1. Was direkt uebertragbar ist (jetzt)

### 1.1 Skills als User-Messages statt System-Prompt

**Hermes-Ansatz:**
Skills (Markdown-Dateien mit Instruktionen) werden als **User-Message** in die
Conversation injiziert — NICHT in den System-Prompt.

Warum: Jede Aenderung am System-Prompt bricht den Prompt-Cache komplett.
User-Messages koennen eingefuegt werden ohne den Cache zu invalidieren.
Das bedeutet: jeder Skill-Call kostet nur den neuen Token-Preis, nicht
den vollen System-Prompt-Preis.

**DGDH heute:**
Role-Templates werden als System-Prompt geladen. Bei jedem Run wird
der komplette System-Prompt neu berechnet.

**DGDH-Transfer:**
Wenn CEO, Worker, Reviewer ihre Kernidentitaet als kompakter System-Prompt
haben und **nur spezialisiertes Packet-Wissen als User-Message** reinkommt,
sinken die Token-Kosten pro Run erheblich. Das waere ein Sprint nach Sprint V.

---

### 1.2 Tool-Registry Pattern

**Hermes-Ansatz:**
```python
registry.register(
    name="example_tool",
    toolset="example",
    schema={...},
    handler=lambda args, **kw: example_tool(...),
    check_fn=check_requirements,  # Ist der Tool verfuegbar?
    requires_env=["EXAMPLE_API_KEY"],
)
```

Jeder Tool registriert sich selbst beim Import. Das System weiss automatisch
welche Tools verfuegbar sind (check_fn) und welche nicht.

**DGDH heute:**
Das Plugin-System hat eine aehnliche Idee, ist aber nicht so konsequent
umgesetzt. `plugin-dev-watcher.ts` + `plugin-registry.ts` existieren als Rohbau
aber sind nicht vollstaendig.

**DGDH-Transfer:**
Das `check_fn`-Muster ist direkt adaptierbar fuer Skills:
```ts
registry.register({
  name: "revenue-image-pipeline",
  packetType: "deterministic_tool",
  checkFn: () => isSharpInstalled() && hasTargetFolder(),
  handler: (args) => runImagePipeline(args),
})
```
Das waere die Basis fuer die Skill-Registry aus dem Backlog
(`doc/backlog/skill-creation-engine.md`).

---

### 1.3 Toolsets per Rolle

**Hermes-Ansatz:**
Jede Platform (CLI, Telegram, Discord) bekommt ein definiertes Toolset.
Ein Agent weiss exakt welche Tools er hat — kein "vielleicht gibt es dieses Tool".

```python
_HERMES_CORE_TOOLS = ["web_search", "terminal", "delegate_task", ...]

TOOLSETS = {
    "hermes-cli": {"tools": _HERMES_CORE_TOOLS},
    "hermes-telegram": {"tools": _HERMES_CORE_TOOLS},
    "safe": {"tools": ["mixture_of_agents"], "includes": ["web", "vision"]},
}
```

**DGDH heute:**
`allowedSkills` existiert in der Routing-Policy, aber es gibt keine
harte Durchsetzung welche Tools ein Worker vs. Reviewer vs. CEO hat.

**DGDH-Transfer:**
```json
{
  "ceo": ["delegate_to_worker", "create_issue", "close_issue", "summarize"],
  "worker": ["git_commit", "create_pr", "read_file", "write_file"],
  "reviewer": ["read_pr", "approve_pr", "reject_pr", "merge_pr"]
}
```
Jede Rolle bekommt **exakt** ihre Tools. Kein Tool ausserhalb des Sets.
Das ist die Code-Firewall fuer Rollen statt nur fuer Paths.

---

### 1.4 Delegate Task (Subagent-Spawning)

**Hermes-Ansatz:**
`delegate_task` ist ein Tool das einen isolierten Subagenten spawnt.
Der Subagent bekommt eigenen Context, eigene Tools, eigenen Budget.
Parent wartet auf das Ergebnis.

**DGDH heute:**
CEO erstellt Issues die Worker bearbeiten — aber das laeuft ueber die DB,
nicht als direkter Subagent-Call. Der CEO wartet nicht aktiv.

**DGDH-Transfer:**
Langfristig interessant wenn CEO innerhalb eines einzelnen Runs
mehrere Worker parallel spawnen koennte statt ueber Issue-Kette zu gehen.
Aber: das ist Komplexitaet die wir jetzt NICHT brauchen. Erst wenn
die Issue-Kette zu langsam oder zu teuer wird. **Backlog, nicht jetzt.**

---

### 1.5 Session Search (FTS5 Cross-Session Memory)

**Hermes-Ansatz:**
Jedes Gespraech wird mit Volltextsuche indexiert. Agent kann vergangene
Sessions durchsuchen: "Wie haben wir das letzte Mal das Routing-Problem geloest?"

**DGDH heute:**
Kein Cross-Run-Memory fuer Agenten. CEO weiss nichts ueber vergangene Laeufe.

**DGDH-Transfer:**
CEO koennte Issue-History durchsuchen: "Gibt es schon einen aehnlichen Packet-Typ?"
Das wuerde Redundanz verhindern und Skill-Reuse ermoeglichen.
Konkret: `GET /api/companies/:id/issues?search=keyword` — sehr machbar.
**Backlog nach Sprint V.**

---

## 2. Was die grosse Vision bestaetigt

### 2.1 Closed Learning Loop = Skill-Creation Engine

Hermes' wichtigste Idee:
> "Autonomous skill creation after complex tasks. Skills self-improve during use."

Das ist **exakt** das was in `doc/backlog/skill-creation-engine.md` beschrieben ist.

Hermes macht es auf Einzelnutzer-Ebene (persoenliche Skills).
DGDH will es auf Business-Ebene machen (Unternehmens-Skills, wiederverwendbar
fuer Kunden und Projekte).

**Das bestaetigt: die Vision ist richtig. Und sie ist technisch loesbar.**

Der Unterschied: Hermes' Skills sind Markdown-Dateien.
DGDH-Skills sind API-Endpunkte mit Packet-Struktur, Review-Gates und David-Approval.
Das ist kontrollierter und sicherer — aber dieselbe Grundidee.

---

### 2.2 Trajectory Generation fuer RL

Hermes generiert strukturierte Trajektorien aus Agent-Laeufen:
Input → Tool-Calls → Ergebnis → Reward-Signal

Das wird genutzt um neue Modelle zu trainieren.

**DGDH-Langzeitvision:**
Wenn DGDH tausende von Packet-Runs hat (CEO-Mission → Worker-PR → Reviewer-Verdict),
hat DGDH ein einzigartiges Trainings-Dataset fuer business-spezifische AI.
Das koennte irgendwann genutzt werden um eigene Fine-Tunes zu machen
die besser auf DGDH-Tasks spezialisiert sind als Gemini/GPT.

**Jetzt irrelevant.** Aber das Konzept im Kopf behalten wenn Runs skalieren.

---

### 2.3 Multi-Platform Delivery (Telegram/Discord/Slack)

Hermes schickt Agent-Ergebnisse auf jede Messaging-Platform.
David koennte via Telegram mit DGDH-Agenten kommunizieren waehrend sie laufen.

**DGDH heute:** Paperclip-UI ist der einzige Kanal.

**DGDH-Zukunft:** Wenn der End-to-End-Lauf bewiesen ist, waere
"CEO postet Summary an David via Telegram" ein naheliegender naechster Schritt.
David bekommt eine Telegram-Nachricht: "Sprint abgeschlossen, 3 PRs gemergt,
hier ist die Summary." Das ist das Gefuehl von echtem autonomem Betrieb.

**Backlog nach Sprint V — aber sehr David-relevant.**

---

## 3. Was NICHT relevant ist (jetzt)

| Hermes-Feature | Warum nicht jetzt |
|----------------|------------------|
| Python-Framework komplett | DGDH ist TypeScript/Node — kein Port noetig |
| Browser-Automation | Kein aktueller Use Case in der Packet-Kette |
| RL Training / Atropos | Zu frueh — erst wenn 1000+ Runs vorhanden |
| TTS / Voice | Kein Use Case definiert |
| Home Assistant | Nicht relevant fuer Business-Workflows |
| Honcho User Modeling | Interessant fuer David-Profil, aber nicht Sprint-relevant |
| Skin/Theme System | CLI-Kosmetik, kein Mehrwert |

---

## 4. Prioritaet der Transfers

Perplexity-Korrektur (2026-03-23): Telegram steht hoeher als in der Claude-Erstliste,
weil David der einzige menschliche Operator ist. "Nachts arbeitet die Maschine,
morgens bekommt David eine Telegram-Nachricht: 3 PRs gemergt, hier die Summary"
— das ist der Moment wo DGDH sich wie eine echte Firma anfuehlt.

| # | Was | Wann | Sprint-Einordnung |
|---|-----|------|--------------------|
| 1 | Toolsets per Rolle + Packet-Typ | Direkt nach erstem E2E-Lauf | Sprint W |
| 2 | Skills als User-Messages (Cache) | Sobald Token-Kosten messbar werden | Sprint X |
| 3 | Telegram-Delivery fuer CEO-Summary | Nach erstem echten Lauf | Sprint X parallel |
| 4 | Session Search fuer CEO (Issue-History) | Erst wenn CEO redundante Packets erstellt | Sprint Y |
| 5 | Tool-Registry mit check_fn (Skill-Registry Basis) | Nach Smoke-Run | Skill-Creation Engine |
| 6 | Trajectory Generation | Wenn 1000+ Runs | Viel spaeter |

---

## 5. Eine Sache die DGDH besser macht

Hermes hat **keinen Review-Gate**.

Ein Hermes-Agent kann Skills erstellen, modifizieren, und deployen
ohne menschliche Genehmigung. Das ist schnell, aber riskant fuer
Business-Kontext.

DGDH hat:
- David approves immer (Constitution)
- Reviewer-Gate vor CEO-Aggregation
- harte `targetFolder`-Scope-Firewall

Das ist **bewusst kontrollierter** als Hermes. Fuer ein Business-System
das reale Kunden-Daten und Code bearbeitet ist das richtig.
Hermes ist fuer einen technischen Einzelnutzer gebaut.
DGDH ist fuer eine Firma mit echtem Output gebaut.

---

## 6. Direkter Querverweis zu aktuellen Backlog-Items

| Backlog-Item | Hermes-Entsprechung |
|-------------|---------------------|
| `skill-creation-engine.md` | Closed Learning Loop + autonomous skill creation |
| `stage1-classifier-rename.md` | Toolset-basiertes Routing (nicht Gemini-spezifisch) |
| `heartbeat-modular-refactor.md` | Hermes' saubere Trennung: registry.py ← tools/*.py ← model_tools.py ← run_agent.py |

---

## 4.1 Perplexitys Key-Ergaenzung: Dynamische Toolset-Komposition

**`toolset_distributions.py` — unterschaetzt in der Claude-Erstversion**

Hermes hat nicht nur statische Toolsets per Rolle — es hat eine
**probabilistische / dynamische Toolset-Komposition**: je nach Task-Typ
bekommt ein Agent dynamisch ein anderes Toolset zusammengestellt.

Das ist eine direkte Verbindung zum DGDH Stage-1-Classifier:

```
Stage-1 klassifiziert Packet: taskClass = "bounded-implementation"
         ↓
Toolset-Resolver waehlt: ["write_file", "git_commit", "create_pr", "terminal"]
         ↓
Worker startet mit exakt diesen Tools — kein Tool mehr, kein Tool weniger
```

Ein `deterministic_tool`-Worker benoetigt andere Tools als ein
`heavy-architecture`-Worker. Der Stage-1-Classifier weiss das bereits —
er muss nur noch das Toolset steuern, nicht nur den Bucket/das Modell.

**Das macht den Stage-1-Classifier noch wertvoller als bisher beschrieben.**
Er ist nicht nur ein Routing-Entscheider — er koennte der Toolset-Konfigurator
fuer den nachgelagerten Worker sein.

## 4.2 run_agent.py = 368KB — das Warnsignal

Hermes hat alles in eine riesige Datei gepackt. DGDH hat `heartbeat.ts`
als Parallelfall. Der Unterschied: wir haben das Warnsignal frueh erkannt
(`doc/backlog/heartbeat-modular-refactor.md`) und handeln bevor es zum
Problem wird. Hermes zeigt was passiert wenn man es nicht tut.

---

## Fazit fuer Perplexity + Codex

**Sofort nutzbar:** Toolset-per-Rolle-Idee fuer Sprint W (klare Tool-Grenzen).

**Bestaetigt:** Skill-Creation Engine (Hermes beweist dass es technisch loesbar ist).

**Inspiriert:** Telegram-Delivery als naechster Comfort-Layer nach Sprint V.

**Nicht nachmachen:** Den offenen Learning-Loop ohne Review-Gate.
DGDH-Kontrolle ist ein Feature, keine Einschraenkung.

Das Hermes-Repo ist ein Blick in die Zukunft der DGDH-Maschine —
aber wir bauen das kontrollierter und business-tauglicher.
