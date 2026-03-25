# CURRENT - Live Baton

focus: `restore-worker-delegatability-and-next-blocker-cut-v1`; Worker-Delegierbarkeit ist auf frischen Runtimes wiederhergestellt, kleine Packets routen wieder enger, und der naechste reale Engpass sitzt jetzt vor dem ersten CEO-Tool-Call
active_issue: `DAV-75`/`DAV-76`/`DAV-77` beweisen zusammen den neuen Stand: Worker `5061a67b-5c78-47a9-b59a-d71612cd6129` kommt nach `process_lost` und auch nach `blocked` wieder auf `idle`; der kleine CEO-Pfad routet auf frischer `3104`-Instanz als `small/low/blocked=false`, haengt aber in wiederholten `You have exhausted your capacity on this model`-Retries vor dem ersten echten Delegationsschritt

next:
  1) den jetzt engeren CEO-Blocker schneiden: warum bleibt `DAV-77` trotz `paperclipRoutingPreflight.selected.blocked = false` vor Child-Erzeugung in wiederholten Model-Capacity-Retries haengen
  2) danach denselben kleinen Pfad erneut bis hinter Child-Erzeugung und Worker-Run lesen, statt neue Arbeitsklassen oder UI-Lanes aufzumachen
  3) `healthStatus=critical` / `budgetStatus=hard_cap_exceeded` nur dann anfassen, wenn diese Surface wieder echte Zuweisung blockt; aktuell ist der Worker trotz Health-Surface wieder eligibel

blockers:
  - Der alte reine `assignment-to-run kickoff loss` ist fuer frische ready Packets nicht mehr der erste Blocker
  - `child created -> no eligible worker assignment` gilt nicht mehr als erster Blocker; Worker ist auf frischen Runtimes wieder `idle` und damit wieder delegierbar
  - `worker run blocked -> worker dauerhaft error` gilt ebenfalls nicht mehr; `blocked` finalisiert/reconciled jetzt wieder zu `idle`
  - Neuer primaerer Live-Blocker auf dem kleinen Delegationspfad: `routing.preflight unblockt korrekt, aber CEO haengt danach in repeated model-capacity retries before first tool call / before child creation`

strategy_anchor:
  - `doc/plans/2026-03-24-dgdh-first-principles-operating-doctrine.md`
  - `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
  - `doc/plans/2026-03-23-focus-freeze.md`

notes:
  - Git/runtime truth fuer diesen Truth Cut startete auf canonical worktree `c:\\Users\\holyd\\DGDH\\worktrees\\dgdh-werkbank`, branch `main`, `HEAD == origin/main == b161cf42282c74509ddeebf1377c351a7d2e9f7f`, Company `44850e08-61ce-44de-8ccd-b645c1f292be`
  - Der alte Worker-Fehlerlauf `e8c11351-d916-4c41-ab69-87c9ea54347e` war `failed` mit `errorCode = process_lost`; frische `3101`-Instanz zeigte danach denselben Worker per Agent-Truth-Reconcile wieder auf `status = idle`
  - `DAV-75` (`151a5720-21bb-4915-80ed-f95f3814c0b2`) / Parent-Run `b7af4b38-b009-4c62-8d33-2348ea493393` bewiesen zuerst die Wake-Context-Luecke: ohne `companyId`/`projectId` im Issue-Select fiel der Parent-Prompt auf `none`; nach Fix auf frischer `3102`-Instanz war der Prompt wieder vollstaendig
  - `DAV-76` (`bb1e2058-1837-4f3a-89de-3bfd12371404`) / Worker-Run `22d20039-829b-4a65-a592-7dda1307b554` bewies den naechsten geschnittenen Blocker: Child-Erzeugung und Worker-Zuweisung funktionieren wieder, aber ein `blocked`-Run mit `risk_high_large_implementation` stranderte den Worker erneut in `error`
  - Frische `3104`-Instanz zeigt nach Fix des Finalisierungs-/Reconcile-Pfads denselben Worker trotz letztem `blocked`-Run wieder auf `status = idle`
  - `DAV-77` (`9bbcbe06-9447-4645-bc92-06182bdaadce`) / Parent-Run `4c7d04a2-a655-4a96-bcda-d1eef7434b74` zeigt live den Router-Fix: `paperclipRoutingProposal.budgetClass = small`, `paperclipRoutingPreflight.selected.blocked = false`, `riskLevel = low`
  - Truth source `GET /api/heartbeat-runs/4c7d04a2-a655-4a96-bcda-d1eef7434b74/log` zeigt danach weiterhin wiederholte `You have exhausted your capacity on this model`-Retries; nach mehreren fokussierten Probes entstand noch kein Child-Issue, der Engpass sitzt also enger als vorher vor dem ersten echten Delegationsschritt
  - Konsequenz fuer den North-Star-Pfad: kein neuer Arbeitsklassen-, UI- oder Observability-Sprint ueber diese Stelle stapeln; zuerst CEO-Capacity-Haenger im kleinen Pfad schneiden

last_updated_by: Codex
updated_at: 2026-03-25
