---
source: claude-export
imported_at: 2026-04-03T15:03:23.396Z
conversation_uuid: 4be6d9d0-db45-40ed-a189-2bcfc4556aff
title: Claude Code Installation in WSL
message_count: 2
start_date: 2025-08-29T05:00:35.466399Z
end_date: 2025-08-29T05:00:52.452579Z
created_at: 2025-08-29T05:00:34.572063Z
updated_at: 2025-08-29T05:00:54.627182Z
---

# Claude Code Installation in WSL

**UUID:** `4be6d9d0-db45-40ed-a189-2bcfc4556aff`

**Messages:** 2

**Date Range:** Aug 29, 2025 - Aug 29, 2025

---

## Messages

### Message 1

**User** · Aug 29, 2025, 07:00 AM

Will Claude Code installier hab npm install -g @anthropic-ai/claude-code gemacht und wenn ich claude schreibe kommt aber 
PS Microsoft.PowerShell.Core\FileSystem::\\wsl.localhost\Ubuntu\home\holydave\MathEase> npm install -g @anthropic-ai/claude-code
>> 
added 10 packages, and changed 2 packages in 1s
11 packages are looking for funding
  run `npm fund` for details
PS Microsoft.PowerShell.Core\FileSystem::\\wsl.localhost\Ubuntu\home\holydave\MathEase> claude
claude : Die Benennung "claude" wurde nicht als Name eines Cmdlet, einer Funktion, einer Skriptdatei oder eines ausführbaren Programms erkannt. Überprüfen Sie die 
Schreibweise des Namens, oder ob der Pfad korrekt ist (sofern enthalten), und wiederholen Sie den Vorgang.
In Zeile:1 Zeichen:1
+ claude
+ ~~~~~~
    + CategoryInfo          : ObjectNotFound: (claude:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
PS Microsoft.PowerShell.Core\FileSystem::\\wsl.localhost\Ubuntu\home\holydave\MathEase>


### Message 2

**Assistant** · Aug 29, 2025, 07:00 AM

Der Nutzer hat Claude Code installiert (mit `npm install -g @anthropic-ai/claude-code`) und bekommt aber einen Fehler, wenn er `claude` ausführt. Der Fehler ist in PowerShell und besagt, dass "claude" nicht als Cmdlet, Funktion, Skriptdatei oder ausführbares Programm erkannt wird.

Das Problem liegt wahrscheinlich daran, dass das npm global bin directory nicht im PATH ist, oder dass er in einer Windows PowerShell Umgebung ist, aber npm in WSL (Windows Subsystem for Linux) installiert hat.

Aus dem Pfad kann ich sehen:
- Er ist in PowerShell (PS Microsoft.PowerShell.Core\FileSystem...)
- Er arbeitet mit WSL (\\wsl.localhost\Ubuntu\home\holydave\MathEase)
- Er hat npm in WSL ausgeführt, aber versucht claude in PowerShell auszuführen

Ich sollte ihm erklären, wie er das Problem lösen kann. Er muss entweder:
1. In WSL/Ubuntu Terminal wechseln und dort `claude` ausführen
2. Oder Claude Code in Windows PowerShell installieren

Ich sollte auch die Dokumentation von Claude Code checken, um sicherzugehen, dass ich die richtige Anleitung gebe.Das Problem liegt daran, dass Sie Claude Code in WSL (Ubuntu) installiert haben, aber versuchen es in Windows PowerShell auszuführen. Die beiden Umgebungen haben separate PATH-Variablen.

Hier sind die Lösungen:

**Option 1: Claude Code in WSL verwenden**
Wechseln Sie in ein Ubuntu/WSL Terminal und führen Sie dort `claude` aus:
```bash
# In WSL/Ubuntu Terminal
cd /home/holydave/MathEase
claude
```

**Option 2: Claude Code in Windows installieren**
Installieren Sie Claude Code direkt in Windows PowerShell:
```powershell
npm install -g @anthropic-ai/claude-code
```

**Option 3: WSL aus PowerShell heraus aufrufen**
Sie können auch WSL direkt aus PowerShell aufrufen:
```powershell
wsl claude
```

**Empfehlung:**
Ich empfehle Option 1 - verwenden Sie ein Ubuntu/WSL Terminal für die Entwicklung, da Sie bereits dort arbeiten. Öffnen Sie einfach ein WSL Terminal (Ubuntu) statt PowerShell, und führen Sie dort `claude` aus.

Falls Sie weitere Probleme haben oder Fragen zur Verwendung von Claude Code haben, kann ich Ihnen gerne weiterhelfen!


