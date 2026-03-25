# DROID-SETUP-PLAN.md

Status: draft v0.1
Authority: David (CEO)
Erstellt: 2026-03-25
System: Windows 11
Accounts: Claude Pro + Google AI Pro (1 Account aktiv)
Kein ChatGPT, kein API-Key noetig.

---

## Ziel

Factory Droid auf Windows 11 einrichten mit zwei Accounts:
- Claude Pro als Orchestrator (Planer, Ueberwacher, Entscheider)
- Gemini (Google AI Pro) als Worker (Hauptarbeit, Bulk, Implementierung)

Beide laufen ueber lokale OAuth-Proxies.
Kein einziger externer API-Key noetig.
Ziel: Droid laeuft autonom 1-2 Stunden, implementiert Features,
erstellt Commits/PRs, David prueft danach.

---

## Account-Inventar

Account         | Modell            | Proxy-Tool    | Port  | Rolle
----------------|-------------------|---------------|-------|------------------
Claude Pro      | claude-sonnet-4-6 | CLIProxyAPI   | 8317  | Orchestrator/Chef
Google AI Pro 1 | Gemini Flash 2.5  | geminicli2api | 8888  | Primaer-Worker

Tages-Quota Google AI Pro:
- Gemini Flash: ~1500 Requests/Tag -> Haupt-Worker
- Gemini Pro:   ~100 Requests/Tag  -> nur bei Architektur-Entscheidungen
- Reset: taeglich ca. 09:00 Uhr MEZ

---

## Schritt 1: Voraussetzungen pruefen (Windows 11)

```bash
# Node.js installiert?
node --version   # muss v18+ sein

# Python installiert?
python --version  # muss 3.9+ sein

# Falls nicht: nodejs.org und python.org
# Dann neu starten
```

---

## Schritt 2: Gemini CLI installieren und einloggen

```bash
# Gemini CLI global installieren
npm install -g @google/gemini-cli

# Einloggen mit Google Account (AI Pro Account)
gemini auth login
# Browser oeffnet sich -> Google Account auswaehlen -> fertig

# Testen
gemini "Hallo, bist du da?"
```

---

## Schritt 3: geminicli2api Proxy starten (Gemini Worker)

```bash
# Tool installieren
pip install geminicli2api

# Proxy starten (laeuft im Hintergrund)
geminicli2api --port 8888

# Proxy laeuft jetzt auf: http://localhost:8888/v1
# Dieser Proxy gibt Droid Zugang zur vollen AI-Pro-Quota
# NICHT schliessen waehrend Droid laeuft
```

---

## Schritt 4: CLIProxyAPI starten (Claude Orchestrator)

```bash
# Claude Code CLI installieren (beinhaltet Proxy-Funktion)
npm install -g @anthropic-ai/claude-code

# Proxy starten
npx cli-proxy-api
# Browser oeffnet sich -> Anthropic Account einloggen -> fertig

# Proxy laeuft auf: http://localhost:8317/v1
# NICHT schliessen waehrend Droid laeuft
```

---

## Schritt 5: Factory Droid installieren

```bash
npm install -g @factory-ai/cli

# Einloggen
droid login

# Version pruefen
droid --version
```

---

## Schritt 6: BYOK Config schreiben

Datei erstellen: `C:\Users\DEIN-NAME\.factory\settings.json`

```json
{
  "customModels": [
    {
      "model": "claude-sonnet-4-6",
      "displayName": "Claude Orchestrator",
      "baseUrl": "http://localhost:8317/v1",
      "apiKey": "not-needed",
      "provider": "anthropic",
      "maxOutputTokens": 32000
    },
    {
      "model": "gemini-2.5-flash",
      "displayName": "Gemini Worker Flash",
      "baseUrl": "http://localhost:8888/v1",
      "apiKey": "not-needed",
      "provider": "generic-chat-completion-api",
      "maxOutputTokens": 65536
    },
    {
      "model": "gemini-2.5-pro",
      "displayName": "Gemini Worker Pro",
      "baseUrl": "http://localhost:8888/v1",
      "apiKey": "not-needed",
      "provider": "generic-chat-completion-api",
      "maxOutputTokens": 32768
    }
  ],
  "mission": {
    "orchestratorModel": "Claude Orchestrator",
    "workerModels": ["Gemini Worker Flash"],
    "workerRotation": "auto",
    "quotaFallback": true
  }
}
```

---

## Schritt 7: Setup testen

```bash
# Einfacher Test ob alles verbunden ist
droid config list

# Kurzer Test-Prompt
droid "Sag Hallo und nenne dein Modell"

# Wenn Antwort kommt: alles korrekt
```

---

## Schritt 8: Erste Mission starten

```bash
droid
> /enter-mission
```

Empfohlener erster Mission-Brief:
```
Du bist Orchestrator in einer DGDH-Mission.
Lies diese Dateien aus dem Repo davidgeib89-art/dgdh-werkbank:
- SOUL.md (Firmenseele, dein Nordstern)
- CURRENT.md (aktuelle Prioritaeten)

Deine Aufgabe:
1. Identifiziere das naechste konkrete implementierbare Feature
2. Zerlege es in maximal 3 Milestones
3. Implementiere Milestone 1 vollstaendig mit Tests
4. Erstelle einen Commit und melde den Hash
5. Warte auf Review

Halte dich an SOUL.md: bounded, reviewbar, kein Theater.
```

---

## Rollenteilung im Betrieb

**Claude Orchestrator (localhost:8317):**
- Plant Milestones, entscheidet Reihenfolge
- Weist Gemini Worker Aufgaben zu
- Validiert nach jedem Milestone
- Stoppt bei Drift (Worker >20 Min ohne Commit)
- Sparsam einsetzen: nur Chef-Entscheidungen

**Gemini Worker Flash (localhost:8888):**
- Implementiert alle Features
- Schreibt Tests, erstellt Commits
- Laeuft durch bis Quota erschoepft
- Reset: 09:00 Uhr MEZ

**Gemini Worker Pro (localhost:8888, selbes Proxy):**
- Nur fuer Architektur-Entscheidungen
- Max 100 Req/Tag – nur wenn Flash nicht reicht

---

## Anti-Drift Regeln

1. Jede Mission braucht SOUL.md als Kontext
2. Maximale Milestone-Groesse: 20 Minuten
3. Jeder Milestone endet mit einem Commit
4. Stop-Conditions:
   - Worker >20 Min ohne Commit -> Orchestrator greift ein
   - Tests rot nach Milestone -> Mission stoppt
   - Output widerspricht SOUL.md -> Mission stoppt
5. David prueft alle 1-2 Stunden den PR/Commit-Stand

---

## Langfristige Account-Strategie

**Jetzt:**
- Google Account 1 -> Droid Worker (diese Entwicklungsphase)
- Claude Pro -> Droid Orchestrator

**Spaeter (wenn Paperclip operational):**
- Google Account 1 bleibt in Droid
- Google Account 2 geht in Paperclip als Self-Improvement-Worker
- Paperclip verbessert sich dann taeglich selbst in 24h-Zyklen

---

## Verbundene Dateien im Repo

```
SOUL.md          -> Firmenseele, Pflicht-Kontext jeder Mission
CURRENT.md       -> Aktuelle Prioritaeten
DROID-MISSION.md -> Detaillierte Mission-Typen
MEMORY.md        -> Nach jeder Mission updaten
INIT.md          -> Onboarding neuer Planer-Instanzen
```

---

> **Hinweis:** CLI-Befehle und Config-Syntax wurden nicht gegen live Droid-Dokumentation
> verifiziert. Vor erstem Setup gegen https://docs.factory.ai gegenchecken.

Status nach Setup: Droid laeuft auf Windows 11,
Claude orchestriert, Gemini arbeitet,
David gibt Richtung und reviewt.

Erstellt vom Planer (Perplexity) am 2026-03-25.
