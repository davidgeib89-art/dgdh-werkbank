---
source: claude-export
imported_at: 2026-04-03T15:03:23.396Z
conversation_uuid: 9f5e6278-d8be-40e3-9f1a-17cc9982d50e
title: Astro Keystatic Webdesign mit KI-Modellen
message_count: 18
start_date: 2026-03-14T14:21:08.612181Z
end_date: 2026-03-14T14:39:10.114128Z
created_at: 2026-03-14T14:21:07.477196Z
updated_at: 2026-03-14T14:39:10.123264Z
---

# Astro Keystatic Webdesign mit KI-Modellen

**UUID:** `9f5e6278-d8be-40e3-9f1a-17cc9982d50e`

**Messages:** 18

**Date Range:** Mar 14, 2026 - Mar 14, 2026

---

## Messages

### Message 1

**User** · Mar 14, 2026, 03:21 PM

Welches Model ist am schlausten zu nutzen für mich ich möchte Webdesign machen in einem Astro Keystatic Tech Stack und neue Contentelemente erzeugen.

*Files: 1773498033191_image.png*


### Message 2

**Assistant** · Mar 14, 2026, 03:21 PM

 The user is asking which model is best for their use case (web design with Astro/Keystatic tech stack and creating new content elements). They're using Claude Code based on the screenshot.

For coding tasks, especially web design and content creation, I'd recommend Sonnet as the best balance of capability and speed/cost. Opus is more powerful but slower. Let me give a practical recommendation.## Modellempfehlung für dein Use Case

Für **Webdesign mit Astro + Keystatic** und neue Content-Elemente erstellen empfehle ich:

### 🥇 **Sonnet (1M context)** – Beste Wahl für dich

**Warum?**
- **1M Token Kontext** = du kannst große Teile deines Projekts auf einmal einlesen lassen (mehrere Komponenten, Configs, Schemas gleichzeitig)
- **Schnell & präzise** bei Code-Aufgaben – ideal für iteratives Arbeiten
- Keystatic-Schemas + Astro-Komponenten gleichzeitig im Kontext halten → kein ständiges Nachladen
- Bestes **Preis-Leistungs-Verhältnis** für längere Coding-Sessions

---

### Wann die anderen Modelle?

| Modell | Sinnvoll wenn… |
|--------|----------------|
| **Opus (1M context)** | Sehr komplexe Architekturentscheidungen, schwierige Bugs – aber langsamer & teurer |
| **Opus** | Eher nicht nötig für Webdesign-Tasks |
| **Haiku** | Nur für sehr einfache, repetitive Tasks (zu schwach für komplexe Astro-Logik) |
| **MiniMax-M2.5** | Kein Anthropic-Modell – für Claude Code eher unüblich |

---

### Mein Tipp für deinen Workflow:
1. **Starte mit Sonnet (1M)** – reicht für 95% aller Webdesign-Aufgaben
2. Wechsle zu **Opus (1M)** nur wenn Sonnet bei einem spezifischen Problem nicht weiterkommt
3. Nutze den **großen Kontext** aktiv: lade deine `astro.config`, Keystatic-Schemas und relevante Komponenten direkt mit in den Chat


### Message 3

**User** · Mar 14, 2026, 03:25 PM

wie starte ich claude in der cli mit yolo mode


### Message 4

**Assistant** · Mar 14, 2026, 03:26 PM

 The user is asking about starting Claude in CLI with "yolo mode". This refers to Claude Code, the command-line tool. Let me check the skill for product self-knowledge first.
```
This block is not supported on your current device yet.
```

Let me check the Claude Code docs map to find info about yolo mode.
```
This block is not supported on your current device yet.
```


```
This block is not supported on your current device yet.
```

Good info. Let me summarize this clearly.## YOLO Mode in Claude Code

### 🚀 So startest du es

```bash
claude --dangerously-skip-permissions "Deine Aufgabe hier"
```

Oder gleichwertig:

```bash
claude --permission-mode bypassPermissions "Deine Aufgabe hier"
```

Beide Befehle sind funktional identisch – sie aktivieren den sogenannten **"Safe YOLO Mode"**: Claude arbeitet vollständig autonom ohne eine einzige Bestätigungsauffrage bis die Aufgabe abgeschlossen ist.

---

### ⚡ Nützliche Kombinationen

```bash
# In einem bestimmten Verzeichnis starten
claude --dangerously-skip-permissions --cwd ~/projects/mein-astro-projekt "..."

# Session fortsetzen ohne Prompts
claude --dangerously-skip-permissions --resume meine-session
```

**Terminal-Alias** zum schnellen Starten (in `~/.bashrc` oder `~/.zshrc`):
```bash
alias yolo="claude --dangerously-skip-permissions"
```

---

### ⚠️ Was du wissen musst

Der Flag **auto-approvet alles** – jeden Bash-Befehl, jeden File-Edit, jeden Netzwerk-Request, jede MCP-Tool-Interaktion. Keine Bestätigung, keine Pause, keine Chance einen schlechten Befehl abzufangen.

**3 wichtige Sicherheitsregeln:**

1. **Git nutzen** – Vor jeder YOLO-Session:
```bash
git checkout -b yolo-experiment
git status  # muss clean sein
```

2. **Klare, begrenzte Tasks** – "Refactor dieses Modul" ist besser als "Verbessere den Code". YOLO Mode funktioniert am besten mit klar definierten Aufgaben.

3. **Hooks als Guardrails** – Hooks feuern auch im Bypass Mode. Ein `PreToolUse`-Hook kann bestimmte gefährliche Tool-Calls blockieren, auch wenn Permissions übersprungen werden.

---

### 💡 Für dein Astro + Keystatic Projekt

Ideal für YOLO Mode wäre z.B.:
- Mehrere neue Content-Elemente auf einmal generieren
- Bulk-Refactoring von Komponenten
- Lint-Fehler in der gesamten Codebase fixen


### Message 5

**User** · Mar 14, 2026, 03:27 PM

welcher ist der beste mcp um einen feedback loop zu haben fürs webdesignen


### Message 6

**Assistant** · Mar 14, 2026, 03:28 PM

 The user is asking about the best MCP (Model Context Protocol) server for having a feedback loop while doing web design. Let me search for this.
```
This block is not supported on your current device yet.
```

Good results. Let me give a clear recommendation based on the search results for web design feedback loops.## Beste MCPs für den Webdesign Feedback Loop

Für deinen **Astro + Keystatic** Stack gibt es eine klare Top-Auswahl:

---

### 🥇 **Playwright MCP** – Die beste Wahl

```bash
npx -y @modelcontextprotocol/server-playwright
```

Playwright MCP gibt deiner KI volle Browser-Kontrolle – navigieren, klicken, tippen, Screenshots machen und UI validieren – quer über Chromium, Firefox und WebKit. Das schließt den Feedback Loop komplett: Claude schreibt Code, öffnet den Browser, interagiert mit der UI, macht einen Screenshot und verifiziert das Resultat – alles ohne dass du etwas anfassen musst.

---

### 🥈 **Chrome DevTools MCP** – Für tieferes Debugging

Das Chrome DevTools MCP löst ein fundamentales Problem: Coding Agents können normalerweise nicht sehen, was ihr generierter Code im Browser tatsächlich macht – sie programmieren quasi mit verbundenen Augen. Mit diesem MCP kann Claude direkt in Chrome debuggen, Performance Traces aufzeichnen und Console Logs auswerten, um Bugs zu finden und zu fixen.

---

### 🥉 **Puppeteer MCP** – Einfachere Alternative

```bash
npx -y @modelcontextprotocol/server-puppeteer
```

Der Puppeteer MCP ermöglicht headless Chrome Automation mit Screenshots, PDF-Generierung, Formular-Ausfüllung und automatisierten Tests – besonders nützlich für visuelle Regression-Screenshots.

---

### 🔁 Dein idealer Feedback Loop Stack

| MCP | Zweck |
|-----|-------|
| **Playwright** | Browser öffnen → Screenshot → visuelles Feedback |
| **Chrome DevTools** | Console Errors, Network Requests, Performance |
| **Figma MCP** *(optional)* | Design-Specs direkt in den Context ziehen |

---

### 💡 Tipp für Astro

Starte deinen Dev Server, dann kannst du Claude so prompten:

> *"Öffne localhost:4321, mach einen Screenshot, prüfe ob das neue Content-Element korrekt dargestellt wird, und fix etwaige Darstellungsprobleme"*

Claude schreibt → baut → schaut → korrigiert – komplett autonom! 🚀


### Message 7

**User** · Mar 14, 2026, 03:28 PM

wie füg ich das in claude code ein?


### Message 8

**Assistant** · Mar 14, 2026, 03:28 PM

 The user wants to know how to add MCP servers to Claude Code.
```
This block is not supported on your current device yet.
```

Good, I have enough info. Let me provide a clear guide on adding Playwright MCP to Claude Code.## MCP in Claude Code hinzufügen

Es gibt **2 Wege** – CLI-Befehl oder Config-Datei direkt bearbeiten:

---

### ✅ Weg 1: Per CLI-Befehl (schnellster Weg)

Für **Playwright** und **Puppeteer** einfach im Terminal ausführen:

```bash
# Playwright MCP hinzufügen (global für alle Projekte)
claude mcp add playwright --scope user -- npx -y @modelcontextprotocol/server-playwright

# Puppeteer MCP hinzufügen
claude mcp add puppeteer --scope user -- npx -y @modelcontextprotocol/server-puppeteer
```

Danach prüfen ob es geklappt hat:
```bash
claude mcp list
```

---

### ✅ Weg 2: Config-Datei direkt bearbeiten

Das hat mehrere Vorteile: vollständige Übersicht aller Konfigurationen auf einmal, einfaches Kopieren zwischen Maschinen, und Support für komplexe Setups die durch den CLI-Wizard schwierig wären.

Config-Datei öffnen:
```bash
# macOS
code ~/.claude.json

# oder
nano ~/.claude.json
```

Dort einfügen:
```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    },
    "puppeteer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

---

### 📁 Scopes – wo wird gespeichert?

Mit `--scope user` wird die Konfiguration für alle Projekte verfügbar. Mit `--scope project` wird sie in der `.mcp.json` des Projekts gespeichert und ist damit mit dem Team teilbar.

| Scope | Wann nutzen |
|-------|------------|
| `--scope user` | Playwright, Puppeteer → für alle Projekte |
| `--scope project` | Projektspezifische Tools → ins Repo comitten |

---

### 🔄 Nach dem Hinzufügen

Claude Code neu starten, dann kannst du in der Session einfach sagen:

> *„Öffne localhost:4321 und mach mir einen Screenshot vom Hero-Bereich"*

Claude erkennt automatisch wann es Playwright braucht und nutzt es! 🚀


### Message 9

**User** · Mar 14, 2026, 03:28 PM

PS C:\Users\holyd\Documents\Websites\general\astro-keystatic-template-geib> claude mcp add playwright --scope user -- npx -y @modelcontextprotocol/server-playwright
>>
error: unknown option '-y'
PS C:\Users\holyd\Documents\Websites\general\astro-keystatic-template-geib>


### Message 10

**Assistant** · Mar 14, 2026, 03:29 PM

 The user is on Windows and getting an error with the `-y` flag. Let me search for the correct Windows syntax.
```
This block is not supported on your current device yet.
```

The issue is clear: on Windows, npx requires a `cmd /c` wrapper. The official docs confirm this.Das ist ein bekanntes Windows-Problem! Auf nativem Windows (nicht WSL) benötigen lokale MCP Server die `cmd /c` Wrapper-Syntax – ohne sie bekommt man "Connection closed" Fehler, weil Windows `npx` nicht direkt ausführen kann.

---

### ✅ Der richtige Befehl für Windows:

```powershell
claude mcp add playwright --scope user -- cmd /c npx -y @playwright/mcp@latest
```

Das `--` trennt Claude-Optionen von der eigentlichen Server-Command, danach kommt `cmd /c npx -y ...`.

---

### Danach prüfen:

```powershell
claude mcp list
```

Du solltest sowas sehen:
```
playwright: connected
```

---

### Oder direkt die Config-Datei bearbeiten

Falls der CLI-Befehl weiter zickt, einfach die JSON-Datei direkt editieren:

```powershell
notepad $env:USERPROFILE\.claude.json
```

Und dort einfügen:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@playwright/mcp@latest"]
    }
  }
}
```

Der `cmd /c` Wrapper löst das Problem – ohne ihn starten MCP Server wie Playwright, Sequential Thinking oder Context7 auf Windows nicht korrekt.


### Message 11

**User** · Mar 14, 2026, 03:29 PM

PS C:\Users\holyd\Documents\Websites\general\astro-keystatic-template-geib> claude mcp add playwright --scope user -- cmd /c npx -y @playwright/mcp@latest
error: unknown option '-y'
PS C:\Users\holyd\Documents\Websites\general\astro-keystatic-template-geib>


### Message 12

**Assistant** · Mar 14, 2026, 03:29 PM

 The issue is that the `-y` flag is being parsed by the `claude mcp add` command itself. The user needs to edit the JSON config directly instead.Der CLI-Befehl schluckt das `-y` als eigene Option. **Direkt die Config-Datei bearbeiten** ist hier der einfachste Weg:

```powershell
notepad $env:USERPROFILE\.claude.json
```

Falls die Datei noch nicht existiert, wird sie neu erstellt. Folgenden Inhalt einfügen/ergänzen:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@playwright/mcp@latest"]
    }
  }
}
```

Falls in der Datei schon anderer Inhalt steht, das `"mcpServers"` Block einfach darin ergänzen (nicht die ganze Datei ersetzen).

Danach Claude Code neu starten und prüfen:

```powershell
claude mcp list
```


### Message 13

**User** · Mar 14, 2026, 03:31 PM

hilf mir

*Attachments: 1 file(s)*


### Message 14

**Assistant** · Mar 14, 2026, 03:31 PM

 The user shared their `.claude.json` file. I can see there's no `mcpServers` at the top level (user scope). I need to add the playwright MCP server there. Let me tell them exactly what to add and where.Ich sehe die Datei – es fehlt einfach der `mcpServers` Block auf oberster Ebene. Du musst ihn direkt nach der ersten `{` einfügen.

**Öffne die Datei:**
```powershell
notepad $env:USERPROFILE\.claude.json
```

**Füge diese Zeilen direkt nach der ersten `{` ein:**

```json
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@playwright/mcp@latest"]
    }
  },
```

Das Ergebnis soll so aussehen:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@playwright/mcp@latest"]
    }
  },
  "numStartups": 12,
  "installMethod": "unknown",
  ...
```

Danach:
1. Datei speichern
2. Claude Code neu starten
3. Prüfen mit `claude mcp list`


### Message 15

**User** · Mar 14, 2026, 03:32 PM

bei mir geht 3x vscode auf wenn ich in vscode terminel claude code aufrufe


### Message 16

**Assistant** · Mar 14, 2026, 03:32 PM

 The user is saying that when they run Claude Code in the VS Code terminal, 3 VS Code windows open. This is a known issue with Claude Code on Windows where it tries to open a browser for authentication or something similar.
```
This block is not supported on your current device yet.
```

This is a known bug in Claude Code v2.1.68+ on Windows. The fix is to unset the TERM_PROGRAM environment variable in the VS Code terminal settings.Das ist ein bekannter Bug in Claude Code v2.1.68+ auf Windows! VSCode's integriertes Terminal setzt die Umgebungsvariable `TERM_PROGRAM=vscode`. Claude Code erkennt das und versucht sich mit der IDE zu verbinden – dabei öffnet jede MCP-Server-Initialisierung ein neues Fenster. 3 MCP Server konfiguriert = 3 Fenster.

---

### ✅ Fix: `TERM_PROGRAM` in VSCode deaktivieren

Öffne VSCode Settings (JSON) mit `Ctrl+Shift+P` → **"Open User Settings (JSON)"** und füge hinzu:

```json
{
  "terminal.integrated.env.windows": {
    "TERM_PROGRAM": ""
  }
}
```

Das verhindert, dass Claude Code VSCode als Terminal erkennt und die Extra-Fenster öffnet.

---

### Alternativ: Claude direkt über die Extension nutzen

Die VSCode Extension bietet eine native grafische Oberfläche direkt in der IDE – das ist der empfohlene Weg, Claude Code in VSCode zu nutzen. Dann brauchst du `claude` im Terminal gar nicht mehr aufrufen:

- `Ctrl+Shift+P` → **"Claude Code: Open"**
- Oder das Claude-Icon in der Seitenleiste

---

### Status

Der Bug ist noch nicht gefixt – Issues wurden als Duplikate geschlossen, aber das Problem ist in v2.1.69 weiterhin vorhanden. Der `TERM_PROGRAM`-Workaround ist aktuell die zuverlässigste Lösung.


### Message 17

**User** · Mar 14, 2026, 03:38 PM

gibts sonst noch mcps oder sonstige Dinge die ich nutzen kann in Claude Code um ihn zu einem besseren Webdesigner zu machen?


### Message 18

**Assistant** · Mar 14, 2026, 03:39 PM

 The user wants to know about MCPs and other tools to make Claude Code better at web design. Let me search for this.
```
This block is not supported on your current device yet.
```


```
This block is not supported on your current device yet.
```

Good results. Let me compile a comprehensive answer about MCPs and other tools for web design with Claude Code.Hier ist eine komplette Übersicht – aufgeteilt in MCPs und andere Tricks:

---

## 🔌 Die wichtigsten MCPs für Webdesign

### 1. **Figma MCP** – Design-to-Code
Figmas offizieller Dev Mode MCP Server gibt deiner KI direkten Zugriff auf die Live-Struktur deines Figma-Designs – Hierarchie, Auto-Layout, Variants, Text Styles, Spacing Tokens und Komponent-Referenzen. Claude generiert Code gegen das echte Design statt aus einem Screenshot zu raten.

```powershell
# In ~/.claude.json eintragen (Windows-Variante):
"figma": {
  "type": "stdio",
  "command": "cmd",
  "args": ["/c", "npx", "-y", "@composio/mcp@latest", "setup", "figma", "--client", "claude"]
}
```

---

### 2. **Context7 MCP** – Aktuelle Doku für Astro, Tailwind etc.
Besonders wertvoll bei Frameworks die sich schnell weiterentwickeln: Next.js, React, Vue, Astro. Context7 holt aktuelle API-Patterns aus den echten Docs statt veraltete Patterns aus dem Training zu halluzinieren.

```powershell
# ~/.claude.json:
"context7": {
  "type": "stdio",
  "command": "cmd",
  "args": ["/c", "npx", "-y", "@upstash/context7-mcp@latest"]
}
```

Nutzen mit: `"use context7"` in deinen Prompts, z.B.:
> *„Erstelle eine Astro Content Collection mit dem neuen Schema-System. use context7"*

---

### 3. **Playwright MCP** – Visueller Feedback Loop
*(hast du bereits – gut!)*

---

### 4. **Desktop Commander** – God Mode Filesystem
Besser als das Standard-Filesystem MCP: Terminal-Zugriff, Port-Management, Dev-Server starten/stoppen, alles ohne das Terminal zu verlassen.

```powershell
"desktop-commander": {
  "type": "stdio",
  "command": "cmd",
  "args": ["/c", "npx", "-y", "@wonderwhy-er/desktop-commander"]
}
```

---

## 📄 CLAUDE.md – Der größte Hebel überhaupt

Der eigentliche Durchbruch kommt mit einer gut konfigurierten `CLAUDE.md` Datei im Projektstamm – Claude liest sie vor jeder Aktion und kennt damit immer den Projektkontext.

Erstelle eine `.claude/CLAUDE.md` in deinem Astro-Projekt:

```markdown
# Projekt: Astro Keystatic Template

## Tech Stack
- Astro 5.x
- Keystatic CMS
- Tailwind CSS v4
- TypeScript

## Design-Prinzipien
- Mobile-first
- Komponenten liegen in /src/components
- Content-Elemente in /src/components/content/
- Farben aus design-tokens.ts verwenden, nie hardcoden

## Keystatic-Regeln
- Neue Content-Elemente immer als Keystatic-Schema anlegen
- Schema-Datei: keystatic.config.ts

## Verbotenes
- Keine Inline-Styles
- Kein !important in CSS
- Keine direkten DOM-Manipulationen
```

---

## ⚡ Empfohlenes Setup für dich

Deine komplette `~/.claude.json` mcpServers Section:

```json
"mcpServers": {
  "playwright": {
    "type": "stdio",
    "command": "cmd",
    "args": ["/c", "npx", "-y", "@playwright/mcp@latest"]
  },
  "context7": {
    "type": "stdio",
    "command": "cmd",
    "args": ["/c", "npx", "-y", "@upstash/context7-mcp@latest"]
  },
  "desktop-commander": {
    "type": "stdio",
    "command": "cmd",
    "args": ["/c", "npx", "-y", "@wonderwhy-er/desktop-commander"]
  }
}
```

Figma MCP würde ich nur dazunehmen wenn du aktiv mit Figma arbeitest – sonst kostet es unnötig Context-Tokens.


