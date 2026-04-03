---
source: claude-export
imported_at: 2026-04-03T15:03:23.396Z
conversation_uuid: 0140b409-4674-44e6-93c3-ce8be3b0230f
title: GitHub AI Agents Installation
message_count: 6
start_date: 2025-08-29T05:09:30.905136Z
end_date: 2025-08-29T05:12:53.355289Z
created_at: 2025-08-29T05:09:29.225488Z
updated_at: 2025-08-29T05:12:53.355289Z
---

# GitHub AI Agents Installation

**UUID:** `0140b409-4674-44e6-93c3-ce8be3b0230f`

**Messages:** 6

**Date Range:** Aug 29, 2025 - Aug 29, 2025

---

## Messages

### Message 1

**User** · Aug 29, 2025, 07:09 AM

https://github.com/contains-studio/agents/tree/main

will das bei mir Installieren für mich in einzelnen Schritten durch die Installation


### Message 2

**Assistant** · Aug 29, 2025, 07:09 AM

Der Nutzer möchte, dass ich die Installation des GitHub Repositories "https://github.com/contains-studio/agents/tree/main" in einzelnen Schritten erkläre. Dafür sollte ich zunächst den Inhalt des Repositories anschauen, um zu verstehen, was es ist und welche Installationsschritte notwendig sind.

Ich werde das Repository mit web_fetch abrufen, um die README-Datei und andere relevante Dateien zu sehen.Ich schaue mir das Repository an, um Ihnen eine detaillierte Installationsanleitung zu geben.
```
This block is not supported on your current device yet.
```

Perfekt! Jetzt habe ich alle notwendigen Informationen über das Repository. Es handelt sich um eine Sammlung von spezialisierten AI-Agenten für Claude Code. Die Installation ist ziemlich einfach und in der README bereits gut erklärt. Ich werde die Schritte auf Deutsch und detailliert erklären.

Die wichtigsten Informationen:
1. Es ist eine Sammlung von AI-Agenten für Claude Code
2. Die Installation erfolgt durch Klonen des Repos und Kopieren in das Claude Code Agenten-Verzeichnis
3. Die Agenten sind in verschiedene Kategorien unterteilt (Engineering, Design, Marketing, etc.)

Ich sollte auch erwähnen, dass Claude Code installiert sein muss, damit das funktioniert.Perfekt! Das ist eine Sammlung von spezialisierten AI-Agenten für **Claude Code**. Hier ist die komplette Schritt-für-Schritt Installationsanleitung:

## Voraussetzungen

**Wichtig**: Sie benötigen **Claude Code** (das Kommandozeilen-Tool von Anthropic). Falls Sie es noch nicht haben:
- Infos und Installation: https://docs.anthropic.com/en/docs/claude-code

## Installation der Agenten

### Schritt 1: Repository klonen
```bash
git clone https://github.com/contains-studio/agents.git
```

### Schritt 2: In das heruntergeladene Verzeichnis wechseln
```bash
cd agents
```

### Schritt 3: Agenten in Claude Code Verzeichnis kopieren

**Option A (automatisch):**
```bash
cp -r * ~/.claude/agents/
```

**Option B (manuell):**
1. Öffnen Sie Ihren Datei-Explorer
2. Navigieren Sie zu Ihrem Home-Verzeichnis
3. Gehen Sie in den Ordner `.claude/agents/` (versteckter Ordner)
4. Kopieren Sie alle Dateien aus dem heruntergeladenen `agents` Ordner hinein

### Schritt 4: Claude Code neustarten
```bash
# Falls Claude Code läuft, beenden und neu starten
claude code
```

## Was Sie erhalten

Die Agenten sind in Kategorien organisiert:

**🔧 Engineering**: `ai-engineer`, `backend-architect`, `frontend-developer`, etc.
**🎨 Design**: `ui-designer`, `ux-researcher`, `whimsy-injector`, etc.  
**📈 Marketing**: `content-creator`, `growth-hacker`, `tiktok-strategist`, etc.
**📊 Product**: `feedback-synthesizer`, `trend-researcher`, etc.

## Verwendung

Die Agenten werden automatisch aktiviert, wenn Sie relevante Aufgaben beschreiben:

```bash
# Beispiele:
"Create a new app for tracking meditation habits" → rapid-prototyper
"Make this loading screen more fun" → whimsy-injector  
"What's trending on TikTok that we could build?" → trend-researcher
```

Fertig! Die Agenten stehen Ihnen nun in Claude Code zur Verfügung. Testen Sie es einfach mit einer Aufgabenbeschreibung.


### Message 3

**User** · Aug 29, 2025, 07:11 AM

wo finde ich den claude/agents ordner


### Message 4

**Assistant** · Aug 29, 2025, 07:11 AM

Der Nutzer fragt, wo sich der ~/.claude/agents/ Ordner befindet. Das ist ein versteckter Ordner im Home-Verzeichnis. Ich sollte erklären, wie man diesen Ordner findet, je nach Betriebssystem und ob er bereits existiert oder erstellt werden muss.Der `~/.claude/agents/` Ordner befindet sich in Ihrem Home-Verzeichnis. Hier ist, wie Sie ihn finden oder erstellen:

## Windows

### Option 1: Über Eingabeaufforderung/PowerShell
```cmd
# Zum Home-Verzeichnis navigieren
cd %USERPROFILE%

# Claude-Ordner erstellen (falls nicht vorhanden)
mkdir .claude
mkdir .claude\agents

# Ordner öffnen
explorer .claude\agents
```

### Option 2: Über Datei-Explorer
1. Öffnen Sie den Datei-Explorer
2. Geben Sie in die Adressleiste ein: `%USERPROFILE%`
3. Falls der `.claude` Ordner nicht existiert, erstellen Sie ihn
4. Darin erstellen Sie den `agents` Ordner

## macOS/Linux

### Terminal-Befehle:
```bash
# Prüfen ob der Ordner existiert
ls -la ~/.claude/

# Falls nicht vorhanden, erstellen:
mkdir -p ~/.claude/agents

# Ordner öffnen (macOS):
open ~/.claude/agents

# Ordner öffnen (Linux):
nautilus ~/.claude/agents
```

### Finder (macOS):
1. Drücken Sie `Cmd + Shift + G`
2. Geben Sie ein: `~/.claude/agents`
3. Falls der Pfad nicht existiert, gehen Sie zu `~` und erstellen die Ordner manuell

## Versteckte Dateien anzeigen

**Windows**: Im Datei-Explorer → Ansicht → Häkchen bei "Ausgeblendete Elemente"

**macOS**: Im Finder `Cmd + Shift + .` drücken

**Linux**: In den meisten Dateimanagern `Strg + H`

## Ordnerstruktur nach Installation

Nach der Installation sollte es so aussehen:
```
~/.claude/agents/
├── design/
├── engineering/
├── marketing/
├── product/
├── project-management/
├── studio-operations/
├── testing/
└── bonus/
```

Falls Claude Code noch nicht installiert ist, wird der `.claude` Ordner möglicherweise noch nicht existieren - dann müssen Sie ihn manuell erstellen.


### Message 5

**User** · Aug 29, 2025, 07:12 AM

finde den ordner nicht hilf mir einfacher


### Message 6

**Assistant** · Aug 29, 2025, 07:12 AM

Der User findet den ~/.claude/agents Ordner nicht und möchte eine einfachere Anleitung. Ich sollte das System erkennen und eine sehr einfache, schrittweise Anleitung geben.

Da ich nicht weiß, welches Betriebssystem er verwendet, sollte ich für die gängigsten Systeme (Windows, macOS) sehr einfache Anleitungen geben.Kein Problem! Ich helfe Ihnen Schritt für Schritt. 

## Welches System verwenden Sie?

### 📱 Für Windows:

1. Drücken Sie `Windows-Taste + R`
2. Tippen Sie: `%USERPROFILE%` 
3. Drücken Sie Enter
4. **Falls Sie keinen `.claude` Ordner sehen:**
   - Rechtsklick → "Neuer Ordner" → Name: `.claude`
   - Doppelklick auf `.claude`
   - Rechtsklick → "Neuer Ordner" → Name: `agents`

### 🍎 Für Mac:

1. Öffnen Sie den Finder
2. Drücken Sie `Cmd + Shift + G`
3. Tippen Sie: `~/.claude/agents`
4. **Falls Fehler "Ordner nicht gefunden":**
   - Tippen Sie nur: `~`
   - Drücken Sie Enter
   - Rechtsklick → "Neuer Ordner" → Name: `.claude`
   - Gehen Sie in den `.claude` Ordner
   - Rechtsklick → "Neuer Ordner" → Name: `agents`

## Dann weiter:

**Nach dem Ordner finden/erstellen:**
1. Laden Sie die Agenten herunter: https://github.com/contains-studio/agents/archive/refs/heads/main.zip
2. Entpacken Sie die ZIP-Datei
3. Kopieren Sie ALLE Ordner aus `agents-main` in Ihren `agents` Ordner

**Welches System haben Sie?** Dann kann ich gezielter helfen!


