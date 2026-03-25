# CURRENT - Live Baton

focus: `boring-repeatable-work-class-v1` bleibt gestoppt; frische ready-Parent-Issues erzeugen auf canonical `main` wieder Parent-Runs, aber die Firma blockiert jetzt enger geschnitten bei Delegierbarkeit und Agent-Gesundheit
active_issue: `DAV-70` beweist, dass der CEO wieder bis zur Child-Erzeugung kommt (`DAV-72`), aber der einzige Worker ist `error` / `healthStatus=critical` / `budgetStatus=hard_cap_exceeded`; `DAV-71` zeigt zusaetzlich einen zweiten, engeren CEO-Haenger auf dem schwereren Test-Packet: wiederholte Model-Quota-Retries vor dem ersten Tool-Call

next:
  1) den Worker-Error selbst schneiden: warum steht `5061a67b-5c78-47a9-b59a-d71612cd6129` auf `error` mit `process_lost` / `hard_cap_exceeded`, und was ist der kleinste Weg zur wieder idle-faehigen Worker-Lane
  2) danach den zweiten CEO-Haenger separat schneiden: warum haengt `DAV-71` nach `routing.preflight` in wiederholten Model-Quota-Retries vor dem ersten Tool-Call
  3) erst nach diesen Beweisen den Arbeitsklassen-Sprint wieder aufmachen; davor kein `boring-repeatable-work-class`-Weiterbau

blockers:
  - Der alte reine `assignment-to-run kickoff loss` ist fuer frische ready Packets nicht mehr der erste Blocker
  - Neuer primaerer Blocker auf dem kleinen Delegationspfad: `child created -> no eligible worker assignment`
  - Neuer sekundaerer Blocker auf dem schwereren Delegationspfad: `routing.preflight -> repeated model-capacity retries before first tool call`

strategy_anchor:
  - `doc/plans/2026-03-24-dgdh-first-principles-operating-doctrine.md`
  - `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
  - `doc/plans/2026-03-23-focus-freeze.md`

notes:
  - Git/runtime truth waehrend dieses Truth Cuts: canonical worktree `c:\\Users\\holyd\\DGDH\\worktrees\\dgdh-werkbank`, branch `main`, `HEAD == origin/main == 9e01ccfe44cf4e9c3f1fc51561e9fee33044a5b6`, API `http://localhost:3100`, Company `44850e08-61ce-44de-8ccd-b645c1f292be`
  - `DAV-70` (`44cf2483-def2-47ee-ab4e-f58d03f95673`) bekam nach normaler CEO-Zuweisung sofort Parent-Run `2c485235-03c4-491c-aa97-be26042ed52b`
  - Truth source `GET /api/heartbeat-runs/2c485235-03c4-491c-aa97-be26042ed52b/log` zeigt erfolgreichen CEO-Delegationslauf mit erzeugtem Child `DAV-72` (`35fe7e36-8df0-4c24-9897-044d27eaa169`) und explizitem `[NEEDS WORKER]`
  - Der erste gebrochene Uebergang im kleinen ready-Doc-Packet ist damit nicht mehr `assignment -> no run` und auch nicht mehr `parent run -> no child`, sondern `child created -> no eligible worker assignment`
  - `GET /api/companies/:companyId/agents` zeigt den einzigen Worker `5061a67b-5c78-47a9-b59a-d71612cd6129` weiter auf `status = error`
  - `GET /api/agents/5061a67b-5c78-47a9-b59a-d71612cd6129/health` liefert `healthStatus = critical`, `budgetStatus = hard_cap_exceeded`, `usedTokens = 18666535`; letzter Lauf `e8c11351-d916-4c41-ab69-87c9ea54347e` `failed` mit `stopReason = process_lost`
  - `DAV-71` (`8211a20a-85d5-4607-b281-57d26807de52`) bekam nach normaler CEO-Zuweisung sofort Parent-Run `28ed9b85-ceda-4001-a3fc-a8cd0cfb13f1`
  - Truth source `GET /api/heartbeat-runs/28ed9b85-ceda-4001-a3fc-a8cd0cfb13f1/log` bleibt nach `routing.preflight` in wiederholten `You have exhausted your capacity on this model`-Retries vor dem ersten Tool-Call haengen
  - `76d5f1f` hat den frueheren bounded-multi-file-test Packet-Gate geoeffnet; die neue Reibung sitzt jetzt nicht mehr in Packet-Truth vor Run-Start, sondern in Worker-Gesundheit und schwerem CEO-Delegationspfad
  - Konsequenz fuer den North-Star-Pfad: kein neuer Arbeitsklassen- oder Lane-Ausbau ueber diese Live-Blocker; zuerst Worker-Gesundheit / Delegierbarkeit, dann den schwereren CEO-Quota-Haenger

last_updated_by: Codex
updated_at: 2026-03-25
