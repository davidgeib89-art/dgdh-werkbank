# CURRENT - Live Baton

focus: Sprint E abgeschlossen - Revenue Lane Image Packet Pipeline
active_issue: none
next:
  1) Sprint F: Content Extraction Worker auf billiger Lane, primaer Gemini Flash-Lite
  2) Spaeter: Packet-Type -> Lane Routing fuer deterministic_tool / free_api / premium_model / local_model weiter haerten
blockers: none
notes:
- Arbeitsmodell ab 2026-03-22: Planer = Perplexity via Chat. Codex = grosse Operator-Sprints mit eigenem Debug-Loop, Console-Watch und aktiver Bedienung von Paperclip/Werkbank. Reviewer/Researcher = Gemini CLI. Claude = nur wenn wirklich noetig, um Quota zu schonen.
- Codex committed und pusht selbst. Commit-Hash im Statusbericht ist Pflicht. Planer reviewed den Diff direkt.
- Revenue-Lane-Richtung korrigiert: zuerst DGDH-Faehigkeit bauen, nicht einen einzelnen Kundenfall zu Ende improvisieren.
- Sprint E geliefert: deterministische `sharp`-Pipeline per API-Route `/api/companies/:companyId/revenue-lane/image-pipeline/process`.
- Output ist reviewbar: `processed/`-Ordner plus `manifest.json` mit source->variant Mapping, Byte-Groessen und Qualitaet.
- Realer Lauf gegen `shared/Kunde/Unbekannt Bamberger Tante` erzeugt 7x `hero/gallery/thumb` in `webp+jpg`, alles unter 200 KB.
last_updated_by: Codex (Coder)
updated_at: 2026-03-22
