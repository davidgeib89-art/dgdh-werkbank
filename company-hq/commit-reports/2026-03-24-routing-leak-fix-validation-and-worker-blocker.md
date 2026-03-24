# Sprint Report - Routing Leak Fix Validation And Parent Closure

Date: 2026-03-24
Author: Copilot

## Was gebaut wurde

- Der echte `model=auto -> applyModelLane -> adapter.invoke --model ...`-Leak wurde in `server/src/services/gemini-routing.ts` gefixt.
- Die Routing-Regression wurde in `server/src/__tests__/gemini-routing-engine.test.ts` abgesichert:
  - `model: auto` bleibt stabil
  - explizite Modelle duerfen weiter aktiv auf eine Lane umgeschrieben werden

## Was real validiert wurde

- Gezielte Tests liefen gruen:
  - `gemini-routing-engine.test.ts`
  - `gemini-control-plane-resolver.test.ts`
  - `gemini-local-execute.test.ts`
  - `gemini-pipeline-e2e.test.ts`
- DAV-24 (`Real Company Progress From Clean Main Routing Fix Validation`) beweist den Routing-Fix live:
  - `adapter.invoke.commandArgs` enthielten nur `--output-format stream-json --approval-mode yolo --sandbox=none`
  - kein explizites `--model` mehr trotz `routing.preflight` auf `gemini-3.1-pro-preview`
  - der CEO erzeugte wieder echte Child-Issues `DAV-25` und `DAV-26`

## Live-Fortschritt nach dem Fix

- Der Worker musste erst per `POST /api/agents/:id/resume` aus einem alten `error`-Status geholt werden.
- Danach startete DAV-25 (`d68b3926-58c4-4f0e-a3d5-ebcdfe541e0b`) real und bewies erneut:
  - `adapter.invoke.commandArgs` ohne explizites `--model`
  - echter Work-Packet-Lauf auf sauberem `main`
- Anschliessend wurde DAV-25 auf den Reviewer uebergeben.
- Der Reviewer-Lauf `d342a486-c276-4eec-b33d-2d8d8e1b4461` startete sauber per Assignment und setzte DAV-25 auf `reviewer_accepted`.
- Der echte Merge-Schritt lief danach ebenfalls erfolgreich ueber `POST /api/issues/:id/merge-pr` mit PR `#12`; DAV-25 endete auf `merged`.

## Abschluss des Parent-Pfads

- DAV-26 wurde bewusst nicht mehr als Reflexions-/Doku-Arbeit ausgefuehrt, sondern als Seitenscope verworfen.
- Dazu wurde das Packet in eine optionale Entscheidungsaufgabe umgeschrieben und auf `done` geschlossen.
- Danach wurde DAV-24 als Parent-Issue auf `done` geschlossen.
- Damit ist der enge Pfad fuer diesen Sprint jetzt real beendet:
  - CEO erzeugt wieder Child-Issues
  - Worker laeuft durch
  - Reviewer laeuft durch
  - Merge landet
  - Parent wird geschlossen

## Erhaltende Invarianten

- Alles lief weiter auf kanonischem `main` im Worktree `c:\Users\holyd\DGDH\worktrees\dgdh-werkbank`.
- Kein Branch-/Sidecar-/Alt-Worktree-Revival.
- Issue-Assignment blieb der Startpfad.
- API-Truth blieb primaer gegenueber Dashboard- oder Vibe-Signalen.
