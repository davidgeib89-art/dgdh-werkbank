# CURRENT - Live Baton

focus: Sprint F abgeschlossen - Revenue Lane Content Extraction Worker
active_issue: none
next:
  1) Sprint G: Schema Fill Worker, der `content-draft.json` + `manifest.json` in das Astro/Keystatic-Template mappt
  2) Spaeter: Packet-Type -> Lane Routing fuer deterministic_tool / free_api / premium_model / local_model weiter haerten
blockers: none
notes:
- Arbeitsmodell ab 2026-03-22: Planer = Perplexity via Chat. Codex = grosse Operator-Sprints mit eigenem Debug-Loop, Console-Watch und aktiver Bedienung von Paperclip/Werkbank. Reviewer/Researcher = Gemini CLI. Claude = nur wenn wirklich noetig, um Quota zu schonen.
- Codex committed und pusht selbst. Commit-Hash im Statusbericht ist Pflicht. Planer reviewed den Diff direkt.
- Revenue-Lane-Richtung korrigiert: zuerst DGDH-Faehigkeit bauen, nicht einen einzelnen Kundenfall zu Ende improvisieren.
- Sprint E geliefert: deterministische `sharp`-Pipeline per API-Route `/api/companies/:companyId/revenue-lane/image-pipeline/process`.
- Sprint F geliefert: Flash-Lite-basierter Content-Extractor per API-Route `/api/companies/:companyId/revenue-lane/content-extractor/process`.
- Output ist reviewbar: `processed/manifest.json` fuer Bilder und `processed/content-draft.json` fuer strukturierten Content-Draft.
- Realer Lauf gegen `shared/Kunde/Unbekannt Bamberger Tante` erzeugt 7x `hero/gallery/thumb` in `webp+jpg`, alles unter 200 KB.
- Realer Sprint-F-Lauf gegen `shared/Kunde/Unbekannt Bamberger Tante` erzeugt korrekt `source: "no_input"` mit allen Content-Feldern `null`, weil dort aktuell nur Bilder vorliegen.
- Fuer Projekt Astro/Keystatic muss der Project-Workspace auf das Template-Repo `C:\Users\holyd\Documents\Websites\general\astro-keystatic-template-geib` zeigen, nicht auf einen Kunden-Worktree.
last_updated_by: Codex (Coder)
updated_at: 2026-03-22
