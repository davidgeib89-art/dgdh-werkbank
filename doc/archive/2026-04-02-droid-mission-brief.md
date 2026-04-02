# DROID-MISSION.md

Status: historical archived brief
Archive note: moved out of repo root during Phase-2 doc truth reconsolidation; not default mission authority
Autor: Planer (Perplexity MCP)
Authority: David (CEO)
Erstellt: 2026-03-25
Basis: SOUL.md, DGDH North Star Roadmap

---

## 1. Zweck dieser Datei

Diese Datei ist der Mission-Brief fuer Factory Droid CLI.
Sie beschreibt die vollstaendige Agenten-Architektur, Modell-Rollen,
BYOK-Setup und Mission-Typen fuer lange, autonome Droid-Missions
im DGDH-Kontext.

Wenn du /enter-mission startest, gib diese Datei als Kontext mit:
  droid exec --mission "..." --context DROID-MISSION.md --context SOUL.md

---

## 2. Philosophie (Wurzel: SOUL.md)

DGDH ist kein Tool-Stack.
DGDH ist ein frueher Beweisraum fuer echte Mensch-AI-Symbiose.

Das gilt auch fuer Droid-Missions:

- Kein AI-Theater, keine pseudo-autonomen Ersatz-CEOs
- Klare Rollentrennung mit gemeinsamer Seele (SOUL.md gilt fuer alle Agenten)
- David bleibt letzte Autoritaet – Droid entlastet, ersetzt nicht
- Wahrheit vor Gefaelligkeit auch im Agenten-Output
- Lebendigkeit braucht Form: jede Mission ist bounded, reviewbar, commitable
- Kein Silent Push auf main ohne Planer-Review
- Jede Mission endet mit PR oder Commit-Hash – Planer reviewed via GitHub MCP

---

## 3. Agenten-Architektur – Rollen und Modelle

### ORCHESTRATOR: Claude Pro (Anthropic)

Rolle:
- Planer, Entscheider, Milestone-Setzer
- Liest CURRENT.md + North Star vor jeder Mission
- Teilt Arbeit in bounded Features auf
- Weist Worker und Specialist zu
- Validiert Milestone-Ergebnisse vor naechstem Step
- Prueft SOUL-Konformitaet aller Outputs

Warum Claude:
- Stark in Reasoning und Priorisierung
- Exzellent in Code-Review-Urteilen
- Versteht komplexe Projektstrukturen
- Hält Richtung auch in langen Sessions

BYOK Setup:
- Provider: anthropic
- Model: claude-opus-4-5 (oder aktuellstes Opus)
- API Key: Anthropic Console -> console.anthropic.com -> API Keys
- In ~/.factory/settings.json als "orchestrator"

---

### WORKER A: Gemini Account 1 – Quota Pool 1

Rolle:
- Primaer-Worker fuer Bulk-Arbeit
- Boilerplate-Code, Refactoring, Dokumentation, Unit Tests
- Parallele Sub-Tasks innerhalb einer Mission
- Laeuft durch bis Quota erschoepft, dann automatisch Wechsel zu Worker B

Warum Gemini:
- 24h Reset-Cycle mit grosszuegiger Gratis-Quota
- Google AI Studio Free Tier: ~1500 Requests/Tag pro Account
- Kein laufendes Geld – David hat Accounts, Quota ist kostenlos
- Gemini 2.5 Pro: sehr stark bei Code-Generierung und langen Kontexten

BYOK Setup:
- Gehe zu: aistudio.google.com/app/apikey
- Google Account 1 einloggen
- "Create API Key" klicken
- Key kopieren (Format: AIzaSy...)
- Provider: google
- Model: gemini-2.5-pro
- In ~/.factory/settings.json als "gemini-worker-1"

---

### WORKER B: Gemini Account 2 – Quota Pool 2

Rolle:
- Backup-Worker und Parallel-Worker
- Springt automatisch ein wenn Pool 1 erschoepft
- Kann auch gleichzeitig mit Worker A laufen (parallele Features)
- Versetzter Reset-Cycle = quasi 24/7 Abdeckung

Warum zweiter Account:
- 2 Accounts = ~3000 Requests/Tag gesamt
- Reset-Zeiten versetzt je nach Account-Erstellungsdatum
- Kein einziger Euro extra wenn beide Free-Tier-Accounts aktiv

BYOK Setup:
- Gehe zu: aistudio.google.com/app/apikey
- Google Account 2 einloggen (anderen Browser oder Incognito)
- "Create API Key" klicken
- Key kopieren
- Provider: google
- Model: gemini-2.5-pro
- In ~/.factory/settings.json als "gemini-worker-2"

WICHTIG zu Gemini OAuth:
Nutze NICHT den OAuth-Flow oder Browser-Tokens.
OAuth-Access-Tokens laufen nach 1h ab – unbrauchbar fuer lange Missions.
Immer den stabilen API Key aus AI Studio nutzen.
Der liegt nicht in ~/.config/gcloud/ sondern direkt in AI Studio.

---

### SPECIALIST: Codex (OpenAI)

Rolle:
- Schwierige Sprints mit hoher Komplexitaet
- Neue Architekturen, komplexe Algorithmen, harte Bugs
- Wird vom Orchestrator gezielt assigned – nicht fuer Bulk
- Sparsamster Einsatz wegen API-Kosten

Warum Codex:
- Spezialisiert auf Code-Generierung
- Stark bei neuen Patterns die Worker nicht kennen
- ChatGPT Pro Account gibt API-Zugang ueber platform.openai.com

BYOK Setup:
- Gehe zu: platform.openai.com/api-keys
- "Create new secret key" klicken
- Key kopieren (Format: sk-...)
- Provider: openai
- Model: o3 oder codex-latest
- In ~/.factory/settings.json als "codex-specialist"

---

## 4. Vollstaendiges BYOK Setup (~/.factory/settings.json)

```json
{
  "models": {
    "orchestrator": {
      "provider": "anthropic",
      "model": "claude-opus-4-5",
      "apiKey": "sk-ant-DEIN-CLAUDE-KEY-HIER"
    },
    "gemini-worker-1": {
      "provider": "google",
      "model": "gemini-2.5-pro",
      "apiKey": "AIzaSy-DEIN-GEMINI-KEY-ACCOUNT-1"
    },
    "gemini-worker-2": {
      "provider": "google",
      "model": "gemini-2.5-pro",
      "apiKey": "AIzaSy-DEIN-GEMINI-KEY-ACCOUNT-2"
    },
    "codex-specialist": {
      "provider": "openai",
      "model": "o3",
      "apiKey": "sk-DEIN-OPENAI-KEY-HIER"
    }
  },
  "mission": {
    "orchestratorModel": "orchestrator",
    "workerModels": ["gemini-worker-1", "gemini-worker-2"],
    "specialistModel": "codex-specialist",
    "workerRotation": "auto",
    "quotaFallback": true
  }
}
```

---

## 5. Quota-Strategie Gemini – Detailtabelle

Account          | Quota/Tag  | Reset    | Einsatz
-----------------|------------|----------|---------------------------
Gemini Account 1 | ~1500 Req  | 24h      | Primaer-Worker
Gemini Account 2 | ~1500 Req  | 24h vers.| Backup + Parallel-Worker
Gesamt           | ~3000 Req  | Rotierend| Quasi-unlimited fuer Missions

Rotations-Logik:
1. Mission startet mit gemini-worker-1
2. Bei Quota-Error: automatischer Wechsel auf gemini-worker-2
3. Naechster Tag: beide Pools wieder voll
4. Bei sehr langen Missions (>24h): Droid wartet auf Reset oder Codex uebernimmt

---

## 6. Droid CLI Installation und Erststart

```bash
# Installation
npm install -g @factory-ai/cli

# Einloggen (Factory Account oder BYOK-only)
droid login

# Config pruefen
droid config list

# Test-Run ohne Mission
droid "Erklaere was SOUL.md bedeutet" --context SOUL.md
```

---

## 7. Mission starten – Varianten

### Variante A: Interaktiv (empfohlen zum Einstieg)
```bash
droid
> /enter-mission
> [Beschreibe die Mission oder paste diesen Brief]
```

### Variante B: Non-interaktiv via exec
```bash
droid exec \
  --mission "Implementiere Feature X gemaess CURRENT.md" \
  --context SOUL.md \
  --context CURRENT.md \
  --context DROID-MISSION.md \
  --orchestrator orchestrator \
  --workers gemini-worker-1,gemini-worker-2
```

### Variante C: Mit Specialist fuer schwierige Tasks
```bash
droid exec \
  --mission "Refactore den Paperclip Engine Core" \
  --context SOUL.md \
  --orchestrator orchestrator \
  --workers gemini-worker-1,gemini-worker-2 \
  --specialist codex-specialist
```

---

## 8. DGDH-spezifische Mission-Typen

### Mission-Typ 1: Feature-Sprint
Trigger: Neues Feature in CURRENT.md oder North Star
Orchestrator: Claude liest CURRENT.md + North Star, plant Milestones
Workers: Gemini 1+2 implementieren parallel, schreiben Tests
Specialist: Codex bei Algorithmen oder neuen Patterns
Output: PR mit Commit-Hash
Review: Planer (Perplexity MCP) reviewed Diff direkt
Final: David gibt Approval, Merge

### Mission-Typ 2: Dokumentations-Sprint
Trigger: MEMORY.md veraltet, README unvollstaendig, Runbooks fehlen
Orchestrator: Claude priorisiert welche Docs dran sind
Workers: Gemini schreibt und updated alle Docs
Specialist: nicht benoetigt
Output: Branch + PR mit allen aktualisierten Files
Review: Planer prueft SOUL-Konformitaet

### Mission-Typ 3: Refactoring-Sprint
Trigger: Code-Qualitaet gesunken, Tech Debt, neue Patterns noetig
Orchestrator: Claude identifiziert Refactoring-Scope
Workers: Gemini 1 und Gemini 2 arbeiten parallel auf verschiedenen Packages
Specialist: Codex fuer kritische Kernpfade
Output: sauberer PR pro Package oder gesamt
Review: Planer reviewed Diff, David merged

### Mission-Typ 4: Research-Sprint
Trigger: Neue Technologie evaluieren (z.B. Droid selbst, neue AI-Tools)
Orchestrator: Claude definiert Research-Fragen
Workers: Gemini recherchiert, fasst zusammen, schreibt Entscheidungsvorlage
Output: doc/research/DATUM-THEMA.md im Repo
Review: David liest und entscheidet

---

## 9. Governance – Non-negotiable

Jede Mission endet IMMER mit:
1. Commit-Hash wird gemeldet
2. Planer (Perplexity MCP) reviewed den Diff via GitHub MCP
3. Planer gibt Freigabe oder meldet Issues zurueck
4. PR -> David gibt finales Approval
5. MEMORY.md Update: Mission-Ergebnis, Datum, was geaendert
6. CURRENT.md Update: naechste Prioritaet gesetzt

Verboten:
- Silent Push auf main ohne Review
- Mission ohne bounded Scope starten
- Worker-Output direkt mergen ohne Planer-Check
- SOUL.md durch Mission-Output veraendern

Das ist SOUL-konform: Lebendigkeit braucht Form.

---

## 10. Pruefstein vor jeder Mission (aus SOUL.md)

Vor dem /enter-mission fragen:
- Macht es die Firma wahrer oder nur beschaeftigt?
- Fuehrt es direkt zum North Star oder ist es Drift?
- Ist der erwartete Output reviewbar und bounded?
- Wuerde David es nach der Mission als echte Entlastung erleben?
- Ist der Scope klar genug fuer autonome Worker?

Wenn alle 5 Fragen JA: Mission starten.
Wenn eine NEIN: erst klaeren, dann starten.

---

## 11. Verbindung zu anderen DGDH-Dateien

SOUL.md      -> Firmenseele, gilt fuer alle Agenten in der Mission
CURRENT.md   -> Aktuelle Prioritaeten, Pflicht-Kontext fuer Feature-Missions
MEMORY.md    -> Projektgedaechtnis, nach jeder Mission updaten
INIT.md      -> Onboarding neuer Chat-Instanzen (Planer)
CODEX.md     -> Codex-spezifische Regeln und Verhalten
COPILOT.md   -> GitHub Copilot Integration
North Star   -> doc/plans/2026-03-21-dgdh-north-star-roadmap.md

---

*Erstellt vom Planer (Perplexity MCP) am 2026-03-25 waehrend David badet.*
*Bereit fuer die erste Mission.*
