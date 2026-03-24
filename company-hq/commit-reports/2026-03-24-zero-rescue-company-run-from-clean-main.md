# Sprint Report - Zero-Rescue Company Run From Clean Main

Date: 2026-03-24
Author: Copilot

## Was gebaut wurde

- Der `worker-done`-Pfad weist jetzt direkt einen idle Reviewer zu, setzt den Issue-Assignee auf diesen Reviewer und queued sofort den Reviewer-Wakeup.
- Das Operator-Runbook verlangt fuer frische Clean-Main-Firmenlaeufe jetzt explizit `executionWorkspacePolicy = isolated` mit `workspaceStrategy.type = git_worktree`.

## Was real blockiert hat

- Erster Live-Blocker: Child-Issues blieben nach `worker-done` auf `in_review`, aber ohne Reviewer-Zuweisung und ohne Reviewer-Run.
- Zweiter Live-Blocker: ein frisch per Minimal-Rezept erzeugtes Projekt ohne Isolations-Policy liess den Worker im Human-Main-Worktree laufen; dadurch landete fremde Branch-Baggage in der PR und der Merge-Scope-Guard blockierte real.

## Was real validiert wurde

- Canonical Runtime erneut bewiesen: `c:\Users\holyd\DGDH\worktrees\dgdh-werkbank`, Branch `main`, Port `3100`, aktive Firma `44850e08-61ce-44de-8ccd-b645c1f292be`.
- Der Reviewer-Handoff-Fix lief live: Child-Issue ging nach Worker-Handoff mit Reviewer-Assignee in den Reviewer-Run statt im assignee-losen `in_review` zu haengen.
- Der isolierte Rerun lief danach komplett:
  - Parent `DAV-31` endete `done`
  - Child `DAV-32` endete `merged`
  - PR `#15`
  - Branch `dgdh/issue-98769978-d330-4705-819b-4add3f21bed5`
  - Commit `aba3648605c8a1aa6438dbcfc4a768b3ddba103a`
- Im korrigierten Lauf blieb der Human-Worktree nachweislich auf `main`, waehrend das Child `executionWorkspaceSettings.mode = isolated` trug.

## Erhaltende Invarianten

- Alles blieb auf kanonischem `main` im Worktree `c:\Users\holyd\DGDH\worktrees\dgdh-werkbank`.
- Kein Seitbranch-Theater als neue operative Basis; der versehentlich vom Worker gezogene Human-Branch wurde als Symptom des Isolationsfehlers behandelt und bounded zurueck auf `main` gebracht.
- Issue-Assignment blieb der Startpfad fuer echte Runs.
- API-Truth blieb primaer gegenueber Dashboard- oder Vibe-Signalen.

## Validierung

- Gezielter Route-Test fuer `worker-done` lief gruen.
- Der eigentliche Beweis ist der frische reale Firmenlauf `DAV-31 -> DAV-32 -> merged -> parent done`.