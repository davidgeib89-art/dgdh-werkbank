# CURRENT - Live Baton

focus: Sprint D abgeschlossen - Dual-Gemini-Failover
active_issue: none
next:
  1) Revenue Lane Ingestion - warten auf echte Kundendaten
  2) Naechster freigegebener Sprint laut Planer
blockers: none
notes:
- Arbeitsmodell ab 2026-03-22: Planer = Perplexity via Chat. Codex = grosse Operator-Sprints mit eigenem Debug-Loop, Console-Watch und aktiver Bedienung von Paperclip/Werkbank. Reviewer/Researcher = Gemini CLI. Claude = nur wenn wirklich noetig, um Quota zu schonen.
- Codex committed und pusht selbst. Commit-Hash im Statusbericht ist Pflicht. Planer reviewed den Diff direkt.
- Sprint A umgesetzt und lokal verifiziert: Loop-Stop fuehrt jetzt zu Workspace-Cleanup via `git checkout -- .`, blocked handoff und blocked Issue-Transition.
- Reviewer hat die Simplicity Criterion jetzt als explizite Pre-Accept-Rule.
- Sprint B umgesetzt und lokal verifiziert: Reviewer-accepted Child-Issues retriggern den CEO-Parent automatisch via Unassign/Reassign + Wakeup.
- Sprint D umgesetzt und lokal verifiziert: Gemini quota failover wechselt bei exhausted/RESOURCE_EXHAUSTED automatisch von Account 1 auf Account 2 und loggt den Wechsel.
- Planer-Entscheidung (Perplexity + Claude): Claudes Reihenfolge freigegeben
- DGD-32 bis DGD-39 alle done
- ceo.json hat [NEEDS INPUT] + Constitution-Check bereits - echtes Problem ist Auto-Retrigger
- Ingestion ohne Testdaten = Infrastruktur als Selbstzweck, warten
last_updated_by: Codex (Coder)
updated_at: 2026-03-22
