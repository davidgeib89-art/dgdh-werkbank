# Sprint Report - Copilot First-Principles Learning Loop And Gate Stop

Date: 2026-03-25
Author: Copilot

## Was gebaut wurde

- Durable first-principles learnings aus den letzten realen Copilot-Laeufen in `COPILOT.md`, `EXECUTOR.md`, `CURRENT.md`, `MEMORY.md` und Repo-Run-Control-Memory verdichtet.
- Codex-Planer-Dock in `CODEX.md` um eine klare Recut-Regel erweitert: faellt eine frische CEO-Zuweisung schon vor dem Parent-Run aus, wird der groessere Sprint gestoppt und neu geschnitten.
- Gate-Stop fuer `boring-repeatable-work-class-v1` sauber im Baton verankert.
- Versehentlich erzeugtes Shell-Artefakt `task_complete.cmd` aus dem Repo entfernt.

## Welche Annahmen entfernt wurden

- Dass viel lokale Aktivitaet schon Firmenfortschritt bedeutet.
- Dass ein healthy `/api/health` plus `/api/companies` schon beweist, dass Issue-Zuweisung weiter echte Parent-Runs startet.
- Dass ein grosser Capability-Sprint trotz frischem Core-Loop-Verlust weiterlaufen darf.
- Dass breite Repo- oder Shell-Archaeologie schneller ist als ein exakter API-Probe auf den ersten blocker.
- Dass Completion-Hooks im Terminal gesucht oder im Shell-Kontext befriedigt werden sollten.

## Was stattdessen provably true blieb

- Nur Git-, Runtime- und API-Wahrheit auf demselben realen Pfad beweisen Firmenfortschritt.
- Ein Gate ist nur bestanden, wenn genau der Gate-Pfad laeuft, nicht wenn nur die Runtime allgemein gesund aussieht.
- Wenn eine frische CEO-Zuweisung `executionRunId = null` und leere `live-runs` hinterlaesst, liegt der erste Verlust vor jeder Arbeitsklasse.
- Derselbe Probe auf einer zweiten frischen Runtime ist die schnellste Art, stale-process-Theorien abzuraeumen.
- `task_complete` gehoert in die Chat-/Tool-Schicht, nicht in PowerShell.

## Was am besten funktioniert hat

- API-first statt Repo-first.
- Minimaler Gate-Probe statt frueher Sprint-Ausweitung.
- Frische Runtime auf neuem Port zum Entkoppeln von altem Prozessverhalten.
- Durable `.md`-Promotion waehrend des Sprints statt spaeteres Nachdenken aus dem Kopf.

## Was ich naechstes Mal anders mache

- Hartes Gate frueher als eigenen Probe behandeln, bevor ich ueber Arbeitsklasse oder Repeatability nachdenke.
- Bei scheinbar inertem Parent sofort `executionRunId`, Issue-Live-Runs und Company-Live-Runs lesen, statt spaeter Child-/Reviewer-Theorien zu bilden.
- Terminal-Kontext nur fuer echte Runtime-/Git-/API-Arbeit benutzen und Completion immer ausserhalb der Shell abschliessen.
- Remote-Wahrheit nach Live-Runs frueher integrieren, bevor ich den Abschlussbericht formuliere.

## Was real validiert wurde

- Canonical Git-Baseline auf `main`: `HEAD == origin/main == 2f9a09c21f63fec7d1e9c578fd2a8429d74496b6` zu Sprintbeginn.
- Port `3100`: Gate-Run `DAV-65` blieb nach CEO-Zuweisung bei `executionRunId = null`, ohne Issue-/Company-Live-Runs und ohne Child-Issue.
- Port `3101`: Runtime-Disambiguierungsprobe `DAV-66` zeigte denselben Verlust auf frischer Instanz.
- Daraus folgt: die erste neue Verlustklasse ist `assignment-to-run kickoff loss`, nicht Arbeitsklassen-Repeatability.

## Erhaltende Invarianten

- Kein Weiterbau des grossen Work-Class-Sprints gegen den expliziten Gate-Befehl.
- Keine neue Produktcode-Aenderung ohne zuerst den neuen ersten Verlust sauber zu schneiden.
- Truthfulness-Regel fuer `local edit` vs `local commit` vs `origin/main` beibehalten.

## Nicht angefasst und warum

- Kein Versuch, `assignment-to-run kickoff loss` in diesem Reflexionssprint schon technisch zu fixen: der Zweck hier war Lernen verdichten, Baton haerten und den Sprint sauber stoppen.
- Kein breiter neuer Plan-Doc-Umbau: die relevanten durable Docks existieren bereits und wurden nur punktuell geschaerft.