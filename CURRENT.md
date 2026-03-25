# CURRENT - Live Baton

focus: `heartbeat-four-kernel-seams-v1`; `heartbeat.ts` ist jetzt repo-wahr auf vier Kernseams geschnitten (`prepareHeartbeatGeminiRouting`, Prompt/Context-Patch, Workspace/Session-Plan, Run-Finalization), die gezielten Contract-Tests sind gruen, und der frische Live-Probe `DAV-97` zeigt: `flash-first` plus `ready_packet_truth` bleiben intakt; der naechste echte Engpass sitzt weiter bei Capacity-Retries nach dem ersten echten Tool-Call
active_issue: `DAV-97` (`f4dd4367-d71b-4d3b-a1ec-1044160ad598`) / CEO-Run `22deb79d-dceb-4195-b7eb-21609c65dfe7` beweist auf frischer `3100`-Runtime den neuen Stand nach dem Seam-Split: `paperclipFixedModelLane = gemini-3-flash-preview`, `paperclipRoutingProposalMeta.parseStatus = not_attempted`, `fallbackReason = ready_packet_truth`, `paperclipSkillSelection.source = ready_packet_truth`; im Run-Log kommt zuerst der Pflicht-Call `GET /issues?parentId=...` plus `GET /agents`, danach schlagen wiederholte `You have exhausted your capacity on this model`-Retries ein; nach >60s entsteht noch kein Child

next:
  1) `gemini-post-tool-capacity-cooldown-state-v1` schneiden: warum der CEO auf dem kleinen Ready-Pfad nach erfolgreichem erstem Tool-Call in Capacity-Retries haengt statt Child-Create sauber zu Ende zu bringen
  2) den neuen Fast-Truth-Loop nutzen: zuerst Seam-/Replay-/Contract-Tests, dann genau ein Live-Proof auf frischer Runtime
  3) erst nach dem Capacity-Cut wieder an Child-Create-/Worker-Folgepfade gehen

blockers:
  - Der alte reine `assignment-to-run kickoff loss` ist fuer frische ready Packets nicht mehr der erste Blocker
  - `child created -> no eligible worker assignment` gilt nicht mehr als erster Blocker; `DAV-95 -> DAV-96` beweist wieder echte Worker-Belegung
  - `worker run blocked -> worker dauerhaft error` gilt ebenfalls nicht mehr; `blocked` finalisiert/reconciled jetzt wieder zu `idle`
  - `CEO claims Paperclip env vars are missing -> no tool calls` gilt nicht mehr; `DAV-88` und `DAV-95` zeigen echte Tool-Calls
  - Der extra `flash_lite_call` fuer fertige Ready-Packets gilt auf dem CEO-Pfad nicht mehr; `DAV-95` laeuft live mit `flash_lite_router_skipped_ready_packet_truth`
  - Neuer primaerer Live-Blocker auf dem kleinen Delegationspfad: `capacity exhausted after real tool calls`; `DAV-97` zeigt auf frischer `3100`-Runtime wieder denselben engeren Bruch: `GET child issues` und `GET agents` laufen, danach haengt der CEO in Capacity-Retries vor `POST child issue`

strategy_anchor:
  - `doc/plans/2026-03-24-dgdh-first-principles-operating-doctrine.md`
  - `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
  - `doc/plans/2026-03-23-focus-freeze.md`

notes:
  - Git/runtime truth fuer diesen Truth Cut startete auf canonical worktree `c:\\Users\\holyd\\DGDH\\worktrees\\dgdh-werkbank`, branch `main`, Company `44850e08-61ce-44de-8ccd-b645c1f292be`
  - Der alte Worker-Fehlerlauf `e8c11351-d916-4c41-ab69-87c9ea54347e` war `failed` mit `errorCode = process_lost`; frische `3101`-Instanz zeigte danach denselben Worker per Agent-Truth-Reconcile wieder auf `status = idle`
  - `DAV-75` (`151a5720-21bb-4915-80ed-f95f3814c0b2`) / Parent-Run `b7af4b38-b009-4c62-8d33-2348ea493393` bewiesen zuerst die Wake-Context-Luecke: ohne `companyId`/`projectId` im Issue-Select fiel der Parent-Prompt auf `none`; nach Fix auf frischer `3102`-Instanz war der Prompt wieder vollstaendig
  - `DAV-76` (`bb1e2058-1837-4f3a-89de-3bfd12371404`) / Worker-Run `22d20039-829b-4a65-a592-7dda1307b554` bewies den naechsten geschnittenen Blocker: Child-Erzeugung und Worker-Zuweisung funktionieren wieder, aber ein `blocked`-Run mit `risk_high_large_implementation` stranderte den Worker erneut in `error`
  - Frische `3104`-Instanz zeigt nach Fix des Finalisierungs-/Reconcile-Pfads denselben Worker trotz letztem `blocked`-Run wieder auf `status = idle`
  - `DAV-77` (`9bbcbe06-9447-4645-bc92-06182bdaadce`) / Parent-Run `4c7d04a2-a655-4a96-bcda-d1eef7434b74` zeigt live den Router-Fix: `paperclipRoutingProposal.budgetClass = small`, `paperclipRoutingPreflight.selected.blocked = false`, `riskLevel = low`
  - `DAV-86` (`ec49b4ad-7074-4fe1-9f97-f60e08a613ce`) / Parent-Run `58b01675-47a0-4d4c-81cc-8d112da42b9a` bewies den naechsten Zwischenstand: Windows-PTY/`AttachConsole failed` ist nicht mehr der erste Killer, aber der CEO behauptete trotz injiziertem Runtime-Env falsch, `PAPERCLIP_API_KEY`/`PAPERCLIP_RUN_ID` fehlten, und machte deshalb `tool_calls = 0`
  - Der neue Gemini-Adapter-Fix legt auf CEO/API-Pfaden den `Paperclip runtime note`-Block wieder explizit in den Prompt und sagt zusaetzlich klar: `PAPERCLIP_API_KEY` und `PAPERCLIP_RUN_ID` sind schon im Shell-Env des Runs vorhanden
  - Nach frischem Runtime-Reload auf `3100` zeigt `GET /api/heartbeat-runs/edcb1ea3-04ca-4986-8829-d2e4d193a15c/log` live den neuen Promptblock; der CEO macht daraufhin reale Tool-Calls (`child status`, `agents`) statt wieder am fehlenden-credentials-Maerchen zu stranden
  - Derselbe Live-Run `edcb1ea3-04ca-4986-8829-d2e4d193a15c` erzeugt danach Child `DAV-89` und weist es direkt dem Worker zu; `GET /api/issues?parentId=f3342630-eb17-46e7-aaa5-c8f0046d7966` und `GET /api/heartbeat-runs/307a1f4a-e9f7-40d2-81ef-bd6eba29a4bb` beweisen den echten Worker-Start
  - `ceo-fast-truth-loop-and-post-tool-capacity-cut-v1` ist jetzt repo-wahr: `server/src/services/heartbeat-gemini-routing.ts` kapselt die billige Routing-Vorstufe; `heartbeat.ts` orchestriert nur noch; neue Replay-Fixtures unter `server/src/__tests__/fixtures/heartbeat-routing/` decken `DAV-88`, `DAV-91` und den Worker-Fallback-Pfad ab
  - Live-Beweis `DAV-95` auf frischer `3101`-Runtime zeigt den neuen CEO-Standardpfad: `agentRole = ceo`, `paperclipSkillSelection.source = ready_packet_truth`, `paperclipRoutingProposal.taskType = bounded-implementation`, `paperclipRoutingPreflight.selected.selectedBucket = flash`, `tool_calls = 2`, Child `DAV-96` wird erstellt und direkt dem Worker zugewiesen
  - `DAV-96` / Worker-Run `74f821e2-fd4d-4dd2-9559-cf2e6b0f54fa` beweist direkt dahinter, dass derselbe Ready-Packet-Skip jetzt auch auf dem Worker-Pfad stabil bleibt: `selectedBucket = flash-lite`, `effectiveModelLane = gemini-2.5-flash-lite`, Run startet sofort nach CEO-Handoff
  - `heartbeat-four-kernel-seams-v1` ist repo-wahr: `heartbeat.ts` orchestriert jetzt ueber `heartbeat-prompt-context.ts`, `heartbeat-workspace-session.ts`, `heartbeat-run-finalization.ts` plus den bestehenden Routing-Seam; gezielte Tests decken Prompt-Patches, Session-/Workspace-Wahrheit, Finalization und Orchestrations-Reihenfolge ab
  - Live-Beweis `DAV-97` auf frischer `3100`-Runtime zeigt, dass der Seam-Split keine alte Routing-Regression eingefuehrt hat: `paperclipFixedModelLane = gemini-3-flash-preview`, `paperclipRoutingProposalMeta.parseStatus = not_attempted`, erster Tool-Call ist `GET child issues`/`GET agents`; der offene Blocker bleibt post-tool Capacity statt Router-/Prompt-Truth
  - Konsequenz fuer den North-Star-Pfad: der Default-Pfad ist jetzt billiger testbar und strukturierter codierbar; der naechste Sprint soll nicht mehr `heartbeat.ts`-Sumpf oder Ready-Packet-Routing schneiden, sondern die verbleibende post-tool Capacity-Instabilitaet als eigene blocker class isolieren

last_updated_by: Codex
updated_at: 2026-03-25
