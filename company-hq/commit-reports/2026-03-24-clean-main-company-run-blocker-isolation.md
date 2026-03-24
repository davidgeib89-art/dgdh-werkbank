# Sprint Report - Clean Main Company Run Blocker Isolation

Date: 2026-03-24
Author: Copilot

## Was gebaut wurde

- Clean-main Runtime-Identitaet auf `c:\Users\holyd\DGDH\worktrees\dgdh-werkbank` verifiziert.
- Frisches kanonisches Projekt auf dem aktuellen Worktree angelegt, nachdem das vorhandene Projekt noch auf den toten Alt-Worktree `dgdh-werkbank-main` zeigte.
- CEO-Rollenvorlage in `server/config/role-templates/ceo.json` geschaerft, damit der CEO vor Repo-Lesen zuerst den Pflicht-API-Check ausfuehrt und bei ausfuehrungspflichtigen Parent-Issues sofort paketisiert.
- Heartbeat-Guard in `server/src/services/heartbeat.ts` ergaenzt, damit `gemini_local`-Agenten mit `model=auto` keine explizite Model-Lane per Routing-Override aufgezwungen bekommen sollen.
- Durable Operator-/Executor-Learnings in `EXECUTOR.md` und `doc/DGDH-AI-OPERATOR-RUNBOOK.md` promoted.

## Was real validiert wurde

- Git-Baseline: richtiger Worktree, Branch `main`, sauberer Git-Status zu Sprintstart.
- Startup-Banner: `local_trusted`, Port `3100`, Home `C:\Users\holyd\.paperclip`, Instance `default`, Config `C:\Users\holyd\.paperclip\instances\default\config.json`.
- API: `/api/health` und `/api/companies` auf der selbst gestarteten kanonischen Runtime.
- Aktive Firma: `44850e08-61ce-44de-8ccd-b645c1f292be` (`David Geib Digitales Handwerk`).
- Reale Parent-Runs gestartet: `DAV-19`, `DAV-20`, `DAV-22`.
- `DAV-19`: CEO driftete in Repo-Lesen statt Packet-Delegation; das ist ueber `heartbeat-runs/{runId}/events` und `log` belegt.
- `DAV-20`: Prompt-Fix kam an; der CEO fuehrte jetzt die Pflicht-API-Reads fuer Child-Issues und Agents aus, blieb danach aber weiter haengen.
- `DAV-22`: Der explizite `--model gemini-3.1-pro-preview`-Pfad blieb trotz Heartbeat-Guard aktiv und der Run stallte erneut ohne Child-Issue.
- Verifikation gruen:
  - `pnpm -r typecheck`
  - `pnpm --filter @paperclipai/server exec vitest run src/__tests__/gemini-local-execute.test.ts src/__tests__/gemini-control-plane-resolver.test.ts src/__tests__/gemini-pipeline-e2e.test.ts`

## Erhaltende Invarianten

- Keine Branch-/Sidecar-/Alt-Worktree-Reaktivierung.
- Issue-Assignment blieb der Startpfad; kein Raw-Wakeup als Ersatzpfad.
- API-Truth schlug Dashboard-/Vibe-Signale.
- Nur Live-Pfad-Glue und durable Learnings angefasst; keine Produkt-/Repo-Neuauslegung.

## Nicht angefasst und warum

- Kein groesserer Routing-/Control-Plane-Umbau: der erste echte harte Restblocker ist noch nicht klein genug bewiesen.
- Keine neue Repo-lokale `.paperclip`-Konfiguration angelegt: die aktuelle Runtime lief verifiziert auf der Default-Instanz, und der Sprint zielte auf realen Firmenlauf statt Konfig-Theater.
- Kein Versuch, Parent-Issues manuell durch Worker/Reviewer-Endpunkte zu simulieren: der echte CEO->Worker->Reviewer-Pfad blieb das Ziel.

## Isolierter Restblocker

- Harter Restblocker: `gemini_local`-CEO-Runs koennen weiterhin mit explizitem `--model gemini-3.1-pro-preview` starten, obwohl der Agent via API `adapterConfig.model = auto` traegt.
- Dieser Pfad ist live belegt ueber `adapter.invoke.commandArgs` von `DAV-20` und `DAV-22`.
- Wirkung: reale bounded Parent-Runs bleiben auf dem CEO haengen, bevor Child-Issues entstehen.
