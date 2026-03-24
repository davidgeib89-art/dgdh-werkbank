# Sprint Report - Routing Leak Fix Validation And Reviewer Acceptance

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

## Offene Restwahrheit

- DAV-26 bleibt `todo` und unassigned.
- DAV-24 bleibt als Parent-Issue noch `todo`.
- Damit ist der finale CEO -> Worker -> Reviewer -> Merge-/Parent-Close-Pfad auf sauberem `main` noch nicht komplett bis zum Ende bewiesen, aber der urspruengliche Routing-Leak ist live beseitigt und mindestens ein Child-Paket lief bis `reviewer_accepted`.

## Erhaltende Invarianten

- Alles lief weiter auf kanonischem `main` im Worktree `c:\Users\holyd\DGDH\worktrees\dgdh-werkbank`.
- Kein Branch-/Sidecar-/Alt-Worktree-Revival.
- Issue-Assignment blieb der Startpfad.
- API-Truth blieb primaer gegenueber Dashboard- oder Vibe-Signalen.
