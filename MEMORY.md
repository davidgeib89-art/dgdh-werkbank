# MEMORY - Geteilter Zustand aller AIs

> Stable facts only. Unter 80 Zeilen halten.
> Live Baton steht in `CURRENT.md`.
> Datierten Sprint-/Run-Verlauf in `doc/archive/sprint-log.md` auslagern.

## Pflicht-Dokumente
- `CURRENT.md` - live baton
- `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` - kanonische operative Richtung
- `doc/plans/2026-03-21-role-template-architecture.md` - Rollen-/Packet-Architektur
- `doc/plans/2026-03-21-gemini-engine-to-role-architecture-progress-report.md` - juengster Engine-Beweisstand
- `doc/archive/sprint-log.md` - datierte Sprint-Historie

## DGDH Kern
- DGDH = David Geib - Digitales Handwerk; David ist der einzige menschliche Operator.
- Leitfrage: Entlastet das David real oder verschoenert es nur die Maschine?
- Planer = Perplexity im Chat; Codex = grosser Operator-Sprint-Coder; Reviewer/Researcher = Gemini CLI; Claude nur wenn wirklich noetig.
- Coder committen und pushen vor dem Bericht; Statusberichte beginnen mit `CODEX STATUSBERICHT`, `Von: Codex`, `An: Planer`.

## Wichtige IDs
- Company: `45b3b93e-8a30-4078-acc6-1c721b29b2ff`
- CEO-Agent: `4e93472c-78f6-409a-9adf-dc57454ea17c`
- Reviewer-Agent: `9e721036-35b7-446e-a752-2df7a1a8caad`
- Worker-Agent: `fe5d3d60-9e8a-4e0c-b494-087d3518755c`
- Projekt Astro/Keystatic: `0bce43aa-2bb9-4572-9938-f556a3279149`
- Projekt Gemini Benchmark: `8534a922-eaf2-4495-a250-648b0d1ca96b`

## Stabile Arbeitsregeln
- `CURRENT.md` traegt Fokus, naechsten Schritt und Blocker; `MEMORY.md` bleibt kompakt und stabil.
- Wenn du stabile Facts oder Architektur aenderst, update `MEMORY.md` vor Handoff.
- High-Risk-Lokalops an DB, Workspace-Routing oder Ordnerstruktur bekommen vor Ausfuehrung einen kurzen Heads-up an den Planer, wenn es zeitlich geht.
- Issues immer mit `projectId` anlegen, sonst kein Workspace-Lookup.
- Direkte Codex-CLI-Arbeit ausserhalb eines Paperclip-Worker-Runs braucht spaeter einen formalen Worker-Abholrunner vor Review.

## Astro/Keystatic Workspace-Sicherheit
- Live Primary Workspace fuer Projekt `0bce43aa-2bb9-4572-9938-f556a3279149`: `C:\Users\holyd\DGDH\worktrees\astro-keystatic-template-geib`
- Ursprungs-Template ausserhalb des Agenten-Bereichs: `C:\Users\holyd\Documents\Websites\general\astro-keystatic-template-geib`
- Kunden-Git ausserhalb des Agenten-Bereichs: `C:\Users\holyd\Documents\Websites\kunden-archive\ferienwohnung-bamberger`
- Agenten duerfen nie direkt ein Kunden-Git als Primary Workspace verwenden.

## Bewiesener Systemstand
- `Mission -> CEO -> Child-Issue -> Worker -> Reviewer -> done` ist reproduzierbar bewiesen.
- CEO Aggregation Mode ist bewiesen; Parent bleibt bei Luecken offen und erzeugt Follow-up statt blind zu schliessen.
- `reviewer accepted` retriggert den CEO-Parent automatisch.
- Loop-Detection `5x stop` macht Workspace-Cleanup (`git checkout -- .`) plus blocked Handoff.
- Reviewer-Simplicity-Criterion ist live.
- Dual-Gemini-Failover schaltet bei exhausted / `429` / `RESOURCE_EXHAUSTED` von `account_1` auf `account_2`.
- `git_worktree` ist fuer Astro/Keystatic aktiv (`isolated`, `allowIssueOverride=true`).

## Revenue Lane Foundation
- Revenue Lane baut wiederverwendbare DGDH-Faehigkeiten, nicht Einzelfall-Abschluesse.
- Packet-Kette: `CEO -> Image Preprocessing -> Content Extraction/Draft -> Schema Fill -> Review`.
- Image Packet Pipeline = `deterministic_tool`, Route `/api/companies/:companyId/revenue-lane/image-pipeline/process`.
- Content Extraction Worker = `free_api` auf Gemini Flash-Lite, Route `/api/companies/:companyId/revenue-lane/content-extractor/process`.
- Schema Fill Worker = `deterministic_tool`, Route `/api/companies/:companyId/revenue-lane/schema-fill/process`.
- Template-Apply Worker = `deterministic_tool`, Route `/api/companies/:companyId/revenue-lane/template-apply/process`, schreibt kontrolliert nur in den sicheren Template-Workspace und nie in ein Kunden-Git.
- Revenue-Lane-Ende-zu-Ende ist bis zum sicheren Astro/Keystatic-Template-Build bewiesen; lokaler Build-Nachweis im Template-Workspace erfolgt bei Bedarf via `npm ci` + `npm run build`.
- Naechster Architektur-Schritt: `Packet -> Lane Routing` fuer `deterministic_tool / free_api / premium_model / local_model`.
