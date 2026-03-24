# Sprint Report - Productize Zero-Rescue Company Run Bootstrap

Date: 2026-03-24
Author: Copilot

## Was gebaut wurde

- Frische Projekte mit git-backed lokalem Primary-Workspace auto-bootstrappen jetzt serverseitig auf `executionWorkspacePolicy = isolated` plus `workspaceStrategy.type = git_worktree`, auch wenn der Create-Pfad keine explizite Policy mitsendet.
- Der New-Project-Dialog sendet den Workspace jetzt direkt im Projekt-Create-Pfad mit, statt den Workspace erst nachtraeglich separat anzulegen.
- `GET /api/issues/:id/company-run-chain` fasst die Firmenkette als lesbare Produktwahrheit zusammen: `assigned -> run started -> worker done -> reviewer assigned -> reviewer run -> merged -> parent done`.
- Die Issue-Detail-Seite zeigt diese Kette jetzt als kompakte Karte direkt im Produkt.

## Was real validiert wurde

- Die frische Projektanlage ohne manuelles `executionWorkspacePolicy`-Payload lieferte direkt die isolierte `git_worktree`-Policy zurueck: Projekt `2651f46c-04cb-4433-a55c-8baee1ce1c84`.
- Der frische bounded Firmenlauf lief ueber denselben Produktpfad:
  - Parent `DAV-33` -> `done`
  - Child `DAV-34` -> `merged`
  - PR `#16`
  - Branch `dgdh/issue-DAV-34-bootstrap-chain-proof`
  - Worker commit `0de480e4e67f879882ddd64ccfacbdc05e5bed80`
  - Worker run `4b766419-02ce-4d62-aa73-4dd9152adea5`
  - Reviewer run `e03480b4-eabc-4032-9b8d-4cc10c9788e6`

## Erhaltende Invarianten

- Basis blieb `main` im Worktree `c:\Users\holyd\DGDH\worktrees\dgdh-werkbank`.
- Startpfad blieb Issue-Assignment, nicht Raw-Wakeup.
- API-Truth blieb primaer gegenueber Dashboard- oder Vibe-Signalen.
- Kein neuer Infrastrukturfilm: nur Default-/Preset-Logik und eine schmale Chain-Sicht auf dem echten Pfad.

## Validierung

- `pnpm -r typecheck`
- `pnpm --dir server exec vitest run src/__tests__/project-routes-bootstrap-default.test.ts src/__tests__/issue-company-run-chain-route.test.ts --config vitest.config.ts`
- Frischer echter bounded Firmenlauf `DAV-33 -> DAV-34 -> merged -> parent done`

## Commits

- `84a7d8fbde54347a912bd0f2f51847cd64e53cdc` - `productize company run bootstrap defaults and chain visibility`