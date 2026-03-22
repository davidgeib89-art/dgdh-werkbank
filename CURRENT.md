# CURRENT - Live Baton

focus: Sprint G abgeschlossen - Revenue Lane Schema Fill Worker
active_issue: none
next:
  1) Sprint H: Template-Apply Worker, der `processed/site-output/` kontrolliert in das Astro/Keystatic-Template uebertraegt
  2) Spaeter: Packet-Type -> Lane Routing fuer deterministic_tool / free_api / premium_model / local_model weiter haerten
blockers: none
notes:
- Arbeitsmodell ab 2026-03-22: Planer = Perplexity via Chat. Codex = grosse Operator-Sprints mit eigenem Debug-Loop, Console-Watch und aktiver Bedienung von Paperclip/Werkbank. Reviewer/Researcher = Gemini CLI. Claude = nur wenn wirklich noetig, um Quota zu schonen.
- Codex committed und pusht selbst. Commit-Hash im Statusbericht ist Pflicht. Planer reviewed den Diff direkt.
- Revenue-Lane-Richtung korrigiert: zuerst DGDH-Faehigkeit bauen, nicht einen einzelnen Kundenfall zu Ende improvisieren.
- Sprint E geliefert: deterministische `sharp`-Pipeline per API-Route `/api/companies/:companyId/revenue-lane/image-pipeline/process`.
- Sprint F geliefert: Flash-Lite-basierter Content-Extractor per API-Route `/api/companies/:companyId/revenue-lane/content-extractor/process`.
- Sprint G geliefert: deterministischer Schema-Fill per API-Route `/api/companies/:companyId/revenue-lane/schema-fill/process`.
- Output ist reviewbar: `processed/manifest.json` fuer Bilder, `processed/content-draft.json` fuer strukturierten Content-Draft und `processed/site-output/` als Template-faehiger Content-/Asset-Stand.
- Realer Lauf gegen `shared/Kunde/Unbekannt Bamberger Tante` erzeugt 7x `hero/gallery/thumb` in `webp+jpg`, alles unter 200 KB.
- Realer Sprint-F-Lauf gegen `shared/Kunde/Unbekannt Bamberger Tante` erzeugt korrekt `source: "no_input"` mit allen Content-Feldern `null`, weil dort aktuell nur Bilder vorliegen.
- Realer Sprint-G-Lauf gegen `shared/Kunde/Unbekannt Bamberger Tante` erzeugt `processed/site-output/` mit 21 kopierten Bild-Assets, allen benoetigten Content-Dateien und 14 expliziten Platzhaltern statt leerer Felder.
- Fuer Projekt Astro/Keystatic zeigt der Project-Workspace jetzt auf den sicheren Template-only-Workspace `C:\Users\holyd\DGDH\worktrees\astro-keystatic-template-geib`.
- Kein Kunden-Git mehr unter `C:\Users\holyd\DGDH\worktrees\ferienwohnung-bamberger`; der bisherige Kunden-Stand wurde aus dem Agenten-Bereich nach `C:\Users\holyd\Documents\Websites\kunden-archive\ferienwohnung-bamberger` verschoben.
last_updated_by: Codex (Coder)
updated_at: 2026-03-22
