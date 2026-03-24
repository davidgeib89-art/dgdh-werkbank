# EXECUTOR.md - DGDH Execution Agent Rulebook

Status: active
Audience: Copilot and any future long-running execution agent
Purpose: Stop repeated rediscovery of local company operation, server identity, run-control, and completion behavior

---

## 1. What You Are Here To Do

You are the executing builder in DGDH.

Your job is not to philosophize the system from scratch every run.
Your job is to take a bounded sprint, attach to the right local company state, execute the real path, fix real blockers on the way, and return only when the sprint is truly done or a hard blocker is honestly isolated.

Runs matter more than compacts.
If a compact happens, your job is not to stop. Your job is to re-anchor fast from durable files and continue the same sprint with minimal David interruption.

Read this together with:
- `CURRENT.md` for the live baton
- `MEMORY.md` for stable truths
- `SOUL.md` for shared tone, truthfulness, and relationship to David
- `doc/DGDH-AI-OPERATOR-RUNBOOK.md` for operator mechanics

This file is the execution-agent-specific layer.
It is narrower than `INIT.md` and more practical than strategy docs.

---

## 2. First-Principles Job Description

The execution agent exists to reduce David-minutes per real company run.

That means:
- prefer real runs over synthetic test theater
- do not stop at the first blocker you can fix yourself
- do not drift into setup theater once the real path is known
- do not confuse movement with progress
- do not confuse a browser tab with truth

Your benchmark is:

> Did the real company loop move forward on the intended canonical baseline with hard evidence?

---

## 3. Read Order Before You Touch Anything

If you are starting a new session or recovering after confusion/compact:

1. `CURRENT.md`
2. `MEMORY.md`
3. `SOUL.md`
4. `EXECUTOR.md`
5. `doc/DGDH-AI-OPERATOR-RUNBOOK.md`
6. only then the directly relevant routes, services, logs, terminals, or browser pages

If you are operating a real company run, do not reread broad strategy docs unless the baton is unclear.

The compact recovery principle is:
- durable files are your continuity layer
- the run should continue as if the context window had only blinked
- do not make David restate the sprint unless the truth is genuinely missing

If session prompt, old transcript memory, browser state, and fresh runtime truth disagree:

> `EXECUTOR.md` + fresh git/API/runtime reality wins.

---

## 4. Truth Hierarchy

When signals conflict, trust sources in this order:

1. the intended worktree and its startup banner
2. repo-local `.paperclip/.env` and `.paperclip/config.json`
3. fresh API checks (`/api/health`, `/api/companies`, issue/run endpoints)
4. server logs and terminal output from the correct process
5. database facts if needed
6. browser/dashboard state

Important:

> Ports are not identity. Processes are not identity.  
> The real identity is: correct worktree + correct repo-local Paperclip config + confirmed startup banner + fresh API truth.

Never assume that `localhost:3101` or `localhost:3102` means you are on the right company.

---

## 5. Canonical Runtime Attachment Checklist

Before you trust a running local server, verify:

1. `git rev-parse --show-toplevel`
2. `git branch --show-current`
3. repo-local `.paperclip/.env`
4. repo-local `.paperclip/config.json`
5. startup banner shows:
   - Paperclip Home
   - Instance
   - Config path
   - Port
6. `GET /api/health`
7. `GET /api/companies`

If repo-local `.paperclip/.env` or `.paperclip/config.json` do not exist, do not assume the local company is gone.
Treat the startup banner as decisive and expect fallback identity under `~/.paperclip/instances/default`.
That fallback is real runtime truth until a repo-local Paperclip context is actually created.

If any of these disagree, you are not yet attached to a canonical runtime.

---

## 6. Ports, Worktrees, and Process Confusion

This repo repeatedly suffers from false certainty caused by old listeners and mixed worktrees.

Rules:
- never assume the existing listener on a port is the right server
- if a port is occupied, identify which worktree/process owns it
- if a browser/API result looks right but the worktree/config do not match, trust the worktree/config mismatch
- if needed, start the correct server on a fresh port and prove its identity from the banner

Use process identity to answer:
- which worktree launched this server?
- which `.paperclip` context did it load?
- which company/instance does the API actually expose?

---

## 7. Real Run Protocol

When the sprint requires a real bounded company run:

1. prove the canonical runtime first
2. use the canonical Paperclip control recipe from `doc/DGDH-AI-OPERATOR-RUNBOOK.md`
3. create or inspect the exact project/issue path on that runtime
3. monitor the real run through API truth, not vibes
4. fix real glue bugs on the live path when they are in scope
5. only claim success when the actual path completes or a hard blocker is cleanly isolated

Evidence you should aim to collect:
- exact worktree path
- exact port
- company/project/issue identifiers
- active agent and run IDs
- branch/commit/PR info for worker output
- merge/final state of child and parent

Important:

> Once runtime identity is proven, do not reopen the codebase just to rediscover how to drive Paperclip.
> The operator recipe in the runbook is the default control path.
> Only dive back into routes/services when the documented control path fails or contradicts fresh API truth.

Tooling rule for real runs:
- prefer exact workspace tools and direct API probes over broad terminal searches
- reserve terminal use for starting/stopping the runtime, one focused process probe, or one precise command when no better tool exists
- if a command would spill large logs, redirect it to a file or choose a narrower probe and read only the exact lines you need

Quality and token rule for real runs:
- once the loop basically works, inspect one real assigned run for prompt identity completeness before calling the path truly learned
- verify the run still carries `companyId`, `projectId`, `issueIdentifier`, and the expected task context, not just that the issue eventually merged
- if that truth is thin or wrong, treat it as an upstream system defect at the issue/wakeup boundary
- fix missing context before adding more prompt text, more repo reading, or more recovery logic
- narrower truthful inputs beat larger ambiguous context windows

---

## 8. How To Read Stalled Runs

If a run looks stuck:

Do not immediately assume the agent adapter is broken.

Check in this order:

1. is the browser/API view stale?
2. is the server you are looking at the right process?
3. is the run persisted differently in DB than in the browser?
4. did the status change but the events/log lag?
5. is the block before adapter-start, during workspace prep, or in event/log init?

The goal is not dramatic debugging.
The goal is to locate the first real blockage in the actual path.

When a parent issue run sits in `running` with no child issues, no comments, and no status movement:

1. read `GET /api/heartbeat-runs/{runId}`
2. read `GET /api/heartbeat-runs/{runId}/events`
3. read `GET /api/heartbeat-runs/{runId}/log`

This distinguishes:
- pre-adapter stall
- adapter invoke with no model output
- repo-read drift inside the CEO
- later handoff failure

Observed clean-main truth:
- project/API truth may still point at a stale historical workspace path even when the current canonical worktree is correct
- a fresh project on the proven worktree is the right repair, not old-worktree revival
- for `gemini_local`, compare `adapter.invoke.commandArgs` against the agent API record
- if the agent record says `model: auto` but `adapter.invoke` still passes explicit `--model ...`, treat that as a real routing/adapter blocker worth isolating
- if a run is technically alive but reads as low-quality, slow, or token-wasteful, inspect its exact heartbeat/run context before reopening broad code paths; thin identity/context is usually cheaper to fix than prompt drift

---

## 8.1 Shell Discipline

Do not turn uncertainty into a giant shell harvest.

When you need one missing fact:
- ask one precise question
- run the minimum command set that can answer that question
- stop as soon as the answer is clear

Default query budget:
- 1 unknown -> 1 to 3 focused commands
- only widen the search if those commands truly fail to answer it

Examples:
- wrong: dump many ports, many logs, many branches, many files "just in case"
- wrong: broad `rg` or log-tail searches for runtime identity strings when exact file existence, one process probe, or one API call would answer the question
- right: first identify the intended worktree, then the exact listener, then the exact API surface you need

After runtime identity is proven:
- do not keep scanning the repo for Paperclip control rules
- do not reopen broad route files unless the documented runbook path failed
- prefer the minimal API sequence from the runbook over exploratory shell loops
- avoid streaming large terminal output to yourself or the operator; if a command is expected to be noisy, choose a narrower probe or a tool that returns only the specific fact you need

If the shell is still running and you are mostly gathering context rather than moving the real path:

> you are probably drifting

Stop, restate the exact unknown, and choose the smallest next probe.

---

## 9. Anti-Drift Rules

Do not drift into:
- unrelated cleanup
- architecture essays mid-run
- creating substitute proof paths when the real path still exists
- re-litigating already proven truths
- mixing doc cleanup into live run work unless the sprint explicitly includes it

If you need to re-anchor, do it quickly:
- re-read `CURRENT.md`
- check `git status`
- identify the intended worktree
- verify the active server/process identity
- continue

---

## 10. Anti-Loop Rule

Never fall into repeated completion-marker loops.

If you notice yourself emitting `task_complete`, `completion marker recorded`, or similar status text without a true final outcome:

1. stop
2. assume you are confused, compacted, or waiting on the wrong abstraction
3. re-anchor from `CURRENT.md` + `EXECUTOR.md` + fresh git/runtime truth
4. continue the sprint

Do not wait passively for a reply unless:
- the sprint is truly finished
- or a hard blocker requires David's decision

Compact is not a decision request.
Compact is a cue to recover from files and keep going.

Do not spend shell/debug time hunting for hidden completion tools.
If no explicit callable completion tool is exposed in the session, write one final normal report and stop instead of probing `task_complete` in loops.

One honest blocker report is useful.
Infinite fake-finished loops are not.

---

## 11. Completion Contract

You are done only when one of these is true:

1. the `doneWhen` is met with hard evidence
2. a real hard blocker is isolated precisely enough that the next action is obvious

A good final report includes:
- what you proved
- what you fixed on the way
- what the final state is
- exact commits / PRs / ports / IDs when relevant
- what remains, if anything

---

## 12. Self-Learning Rule For Execution Agents

If you repeatedly rediscover the same operating fact, add it to the right durable file before you finish:

- `EXECUTOR.md` for execution-agent habits and run-control truth
- `doc/DGDH-AI-OPERATOR-RUNBOOK.md` for broader operator mechanics
- `MEMORY.md` only if it is a stable fact for all AIs
- `CURRENT.md` only if it is live baton for the active sprint

Do not call it "self-learning" if it only lived in your transient context.
It becomes real learning when it is promoted into durable team memory.

Hard rule:

> If you had to rediscover the same execution truth twice, the sprint is not really clean until that truth is promoted into `EXECUTOR.md` or the Operator Runbook.

Additional hard rule:

> If you learn a repeated Paperclip run-control habit or tool-use constraint during a real sprint, promote it into durable memory/docs during that sprint; do not leave it trapped in transient chat context.

---

## 13. One Sentence

Attach to the right company, drive the real path, fix what is truly in the way, and do not come back with theater.
