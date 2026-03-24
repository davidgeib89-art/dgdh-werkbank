# DGDH AI Operator Runbook

Status: Stable operating guide for AI coders and operators
Audience: Codex, Copilot, Gemini CLI, Claude, ChatGPT and similar repo-working AIs
Purpose: Avoid repeated rediscovery of how to operate the local DGDH/Paperclip company loop

---

## 1. What This Document Is

This is the compact "how to drive the machine" guide.

Use it together with:
- `INIT.md` / `REINIT.md` for role and working style
- `MEMORY.md` for stable facts
- `CURRENT.md` for the live baton and active sprint
- `EXECUTOR.md` if you are the active long-running execution agent

This document is not the live baton and not a strategy doc.
It should stay stable, operational, and boring.

---

## 2. Core Operating Principle

The recurring bottleneck is usually not model intelligence.
It is losing track of the canonical local company state and the canonical run-control path.

Default operating rule:
- first make sure you are attached to the right local Paperclip identity
- then use the issue-driven company loop
- then observe the real run
- then fix real blockers on the fly

Do not rediscover the machine from scratch every run.

### 2.1 First-Principles Operating Lens

DGDH is a governed David-attention-compression machine.

In practice this means:
- optimize for fewer David minutes per real company run
- prefer real runs over test theater
- treat review as gate and sensor
- do not open meta-architecture while an operational blocker is active

---

## 3. Read Order Before Acting

If you need to operate the DGDH company loop:

1. `CURRENT.md`
2. `MEMORY.md`
3. this runbook
4. only then the directly relevant files, routes, or UI pages

If the run is about architecture or product direction, also read the current North Star and active plan docs.

---

## 4. Canonical Local Identity

Paperclip identity is defined by the effective local home/config/instance context.
If you get this wrong, the company can look "missing" even when nothing is deleted.

Current rules:
- Repo-local `.paperclip/.env` and `.paperclip/config.json` are the canonical local override when present.
- Stale ambient worktree env should not override the repo when there is no repo-local Paperclip context.
- Without a repo-local Paperclip context, Paperclip falls back to the default local instance under `~/.paperclip/instances/default`.

Practical meaning:
- Do not trust inherited `PAPERCLIP_HOME` / `PAPERCLIP_INSTANCE_ID` blindly.
- Prefer running commands from the intended repo/worktree root.
- Treat repo-local `.paperclip` as source of truth when it exists.
- If repo-local `.paperclip/.env` and `.paperclip/config.json` are absent, use the startup banner to confirm the fallback default instance under `~/.paperclip/instances/default` instead of assuming the company is missing.

Quick checks:

```powershell
git rev-parse --show-toplevel
Get-ChildItem .paperclip -Force
git branch --show-current
git worktree list
```

---

## 5. Human Workspace vs Firm Workspaces

Keep the human/operator workspace separate from issue execution workspaces.

Desired pattern:
- Human workspace stays on the normal main worktree
- firm execution happens in issue-scoped isolated git worktrees
- issue worktrees live under `.paperclip/worktrees/...` unless configured otherwise

Do not casually use the human main checkout as the issue execution branch checkout.

Windows note:
- deep worktree paths in this repo may require `git config core.longpaths true`

---

## 6. Starting the Local System

Preferred local dev paths:

```powershell
pnpm dev:watch
```

Use when you actively develop and can tolerate watch-mode restarts.

```powershell
pnpm dev:once
```

Use when you want the more stable verification path without watch/hot reload churn.

Important:
- Running inside a configured worktree should auto-load repo-local `.paperclip/.env`.
- Do not manually export Paperclip env vars unless you know why you are overriding the local context.

---

## 7. Canonical Run Control

For real issue work, use issue-driven wakeup paths.

Canonical path:
- create/update the issue with the right `projectId`
- ensure it is in a runnable status such as `todo`
- assign the responsible agent via the issue flow

Important:
- For issue work, use issue assignment/update paths
- Do not use `POST /api/agents/{id}/wakeup` as a substitute for issue execution
- A raw agent wakeup without an assigned issue is only a heartbeat nudge and can correctly block with `no_assigned_issue`

Useful rule:
- If a packet should start immediately, use `todo`, not `backlog`

Known important endpoints:
- `PATCH /api/issues/{id}` with `{"assigneeAgentId":"..."}`
- `POST /api/issues/:id/worker-pr`
- `POST /api/issues/:id/worker-done`
- `POST /api/issues/:id/reviewer-verdict`
- `POST /api/issues/:id/merge-pr`

### 7.1 Minimal Paperclip Control Recipe

Use this when you are the execution agent and need to drive one real bounded run without rediscovering the machine.

Assume:
- you already proved the correct worktree + `.paperclip` + startup banner
- you know the real API port from that banner
- API truth beats browser state
- use exact tools or direct API/file probes first; do not start with broad terminal scans when one precise check would answer the question

PowerShell pattern:

```powershell
$base = "http://127.0.0.1:3101/api"
```

1. Read the company truth first.

```powershell
$companies = Invoke-RestMethod "$base/companies"
$company = $companies | Where-Object { $_.status -eq "active" } | Select-Object -First 1
$companyId = $company.id
```

2. Read the agent truth before assigning anything.

```powershell
$agents = Invoke-RestMethod "$base/companies/$companyId/agents"
$ceo = $agents | Where-Object { $_.role -eq "ceo" -or $_.adapterConfig.roleTemplateId -eq "ceo" } | Select-Object -First 1
$worker = $agents | Where-Object { $_.adapterConfig.roleTemplateId -eq "worker" } | Select-Object -First 1
$reviewer = $agents | Where-Object { $_.adapterConfig.roleTemplateId -eq "reviewer" } | Select-Object -First 1
```

3. Reuse a project when it already exists. Only create one when the run truly needs a fresh scope.

Validate the existing project workspace before reuse.
If the project points at a stale historical worktree path, create a fresh project on the proven current worktree instead of reviving the stale path.

```powershell
$projects = Invoke-RestMethod "$base/companies/$companyId/projects"
```

Minimal create payload if needed:

```powershell
$projectBody = @{
  name = "Canonical Run $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  status = "planned"
  workspace = @{
    name = "primary"
    cwd = (git rev-parse --show-toplevel)
    isPrimary = $true
  }
} | ConvertTo-Json -Depth 8

$project = Invoke-RestMethod -Method Post -Uri "$base/companies/$companyId/projects" -ContentType "application/json" -Body $projectBody
$projectId = $project.id
```

For the canonical product path, a fresh project that includes a git-backed local primary workspace now auto-applies isolated `git_worktree` execution policy even when the payload omits `executionWorkspacePolicy`.
Only send an explicit policy when you want to override that default or when the project does not have a git-backed local primary workspace.

4. Create the parent issue through the company issue path.

```powershell
$issueBody = @{
  projectId = $projectId
  title = "Bounded canonical company run"
  description = "Real bounded run on the proven canonical local baseline."
  status = "todo"
  priority = "medium"
} | ConvertTo-Json -Depth 8

$issue = Invoke-RestMethod -Method Post -Uri "$base/companies/$companyId/issues" -ContentType "application/json" -Body $issueBody
$issueId = $issue.id
```

5. Start the loop by assigning the issue, not by raw wakeup.

```powershell
$assignBody = @{
  assigneeAgentId = $ceo.id
  status = "todo"
} | ConvertTo-Json -Depth 8

Invoke-RestMethod -Method Patch -Uri "$base/issues/$issueId" -ContentType "application/json" -Body $assignBody
```

Do not substitute this with `POST /api/agents/{id}/heartbeat/invoke` unless the sprint is specifically about heartbeat recovery. Raw wakeup is not the normal issue-execution path.

6. Observe the run from API surfaces first.

```powershell
Invoke-RestMethod "$base/issues/$issueId"
Invoke-RestMethod "$base/issues/$issueId/children"
Invoke-RestMethod "$base/issues/$issueId/company-run-chain"
Invoke-RestMethod "$base/issues/$issueId/comments"
Invoke-RestMethod "$base/issues/$issueId/live-runs"
Invoke-RestMethod "$base/issues/$issueId/active-run"
Invoke-RestMethod "$base/companies/$companyId/live-runs"
```

`/issues/{id}/company-run-chain` is the narrowest single read for the normal company path: `assigned -> run started -> worker done -> reviewer assigned -> reviewer run -> merged -> parent done`.

If the loop basically works but quality, speed, or token use still looks wrong, inspect one exact run before reopening the repo:

```powershell
$active = Invoke-RestMethod "$base/issues/$issueId/active-run"
$runId = $active.runId
Invoke-RestMethod "$base/heartbeat-runs/$runId"
Invoke-RestMethod "$base/heartbeat-runs/$runId/events"
Invoke-RestMethod "$base/heartbeat-runs/$runId/log"
```

Use that read to verify the run still carries real company/task identity, not just that the issue later merged.
If `companyId`, `projectId`, or issue identity is thin or missing in the run context, fix the upstream issue/wakeup context first.
Do not compensate for missing truth by widening prompts, adding more repo-reading steps, or starting a broader diagnostic sweep.

7. Only step into manual worker/reviewer endpoints when the real loop needs recovery or the sprint explicitly targets those handoffs.

The canonical handoff endpoints remain:
- `POST /api/issues/:id/worker-pr`
- `POST /api/issues/:id/worker-done`
- `POST /api/issues/:id/reviewer-verdict`
- `POST /api/issues/:id/merge-pr`

But in a normal healthy company run, the operator should not manually simulate the whole chain from the start. The operator should attach, assign, observe, and only intervene where the live path genuinely stalls.

### 7.3 Query Budget Rule

Do not rediscover operation by shell volume.

If one fact is missing, use the smallest probe that can answer it.

Good pattern:
- missing company id -> `GET /api/companies`
- missing agent id -> `GET /api/companies/:companyId/agents`
- missing issue state -> `GET /api/issues/:id`
- missing live run state -> `GET /api/issues/:id/live-runs` or `GET /api/issues/:id/active-run`

Bad pattern:
- scanning many logs, routes, env vars, ports, and repo files before asking the direct API question

Operational rule:

> prefer one direct API or process check over broad shell harvesting

Tooling corollary:
- prefer workspace tools for exact file existence, file reads, searches, and diagnostics
- use the terminal mainly for runtime boot, one focused process inspection, or one precise command with bounded output
- if a boot command is noisy, capture to a file and read only the startup identity or failure lines you actually need

Only widen the search when the direct probe failed or contradicted another stronger truth source.

If a CEO/worker run is `running` but produces no child issues, no comments, and no status movement, use the heartbeat-run read surfaces before reopening code:
- `GET /api/heartbeat-runs/{runId}`
- `GET /api/heartbeat-runs/{runId}/events`
- `GET /api/heartbeat-runs/{runId}/log`

Current clean-main lesson:
- `adapter.invoke` is the decisive place to compare effective CLI args against agent API truth
- if `gemini_local` shows agent `adapterConfig.model = auto` but `adapter.invoke.commandArgs` still includes explicit `--model gemini-3.1-pro-preview`, treat that as a real live-path blocker
- this blocker is different from prompt drift; prompt drift shows repo/file reads, while model-override stalls can freeze before any meaningful model output

Promotion rule:
- if a run reveals a repeated operator or tool-use learning, promote it into this runbook or `EXECUTOR.md` in the same sprint instead of relying on chat memory

### 7.2 Dashboard vs API Rule

The dashboard is a secondary read surface, not the primary truth source.

Useful board path:

```text
http://127.0.0.1:3101/DAV/dashboard
```

Use it to visualize what the API already says.
Do not use it as a substitute for:
- `/api/companies`
- `/api/companies/:companyId/agents`
- `/api/issues/:id`
- `/api/issues/:id/children`
- `/api/issues/:id/live-runs`
- `/api/issues/:id/active-run`

---

## 8. Observing a Real Run

When a run is live, read multiple surfaces together:

- dashboard / company live-runs
- issue page and issue comments (includes a compact **company run truth strip** visualizing the path: `assigned -> run started -> worker done -> reviewer assigned -> reviewer run -> merged -> parent done`)
- inbox for human-action blockers
- git state / worktree state

Useful read surfaces:
- `GET /api/companies/:companyId/live-runs`
- `GET /api/issues/:issueId/live-runs`
- board inbox page

What counts as real evidence:
- an actual run record appears
- transcript or live output exists
- issue status changes coherently
- worker/reviewer handoff artifacts exist
- git branch/worktree effects match the issue path

Do not trust a single surface in isolation.

---

## 9. Canonical Worker and Reviewer Handoffs

Worker completion is not "I think I am done."
The canonical handoff is the API path:

- `worker-pr` creates or records the PR
- `worker-done` records `prUrl`, `branch`, `commitHash`, and structured summary

Reviewer completion is the API path:
- `reviewer-verdict`

Merge is the API path:
- `merge-pr`

Do not replace these with ad hoc CLI-only behavior if the canonical Paperclip route exists.

---

## 10. Merge Hygiene

`main` must only receive the intended issue scope.

Current guardrail:
- merge scope is checked against canonical `worker-done.summary.files`
- unexpected files should block the merge before they land on `main`

Interpretation:
- if merge is blocked because file scope diverges, do not bypass it blindly
- fix the issue branch or the worker handoff so the expected scope is truthful again

This is a protection against branch baggage leaking onto `main`.

---

## 10.1 Where Truth Belongs

Keep the operating truth in the right layer:
- workflow invariants and company-state truth belong in product code
- CEO/Worker/Reviewer behavior belongs in role templates
- narrow repeatable specialist procedures can become skills later
- operator drive/recovery patterns belong in this runbook

If one of these truths only exists as tribal knowledge in a prompt or chat, expect rediscovery cost later.

---

## 11. Common Failure Modes

### Wrong company or "missing" company
- suspect home/config/instance mismatch first
- verify repo-local `.paperclip` and effective worktree context
- do not assume data loss

### Manual wakeup did nothing useful
- check whether there was an assigned issue
- raw wakeup is not the same as issue-driven execution

### No run appears in live-runs
- verify assignment path
- verify agent wake policy (`wakeOnAssignment`, `wakeOnAutomation`)
- verify the issue is runnable and correctly scoped

### Worktree problems
- check `git worktree list`
- verify the expected `.paperclip/worktrees/...` path exists
- on Windows, consider `git config core.longpaths true`

### Merge blocked
- read the blocked message
- compare PR file scope with `worker-done.summary.files`
- fix the real scope mismatch instead of forcing the merge

---

## 12. Operating Posture

David's preferred operating posture for coders:
- large bounded sprints
- real runs as prototyping loops
- fix real blockers on the fly
- no endless pre-proof test theater

So:
- do not stop at every small blocker
- do not open meta-scope while a real loop is in flight
- if a run exposes a narrow real weakness, fix it and continue
- report those freestyle fixes clearly at the end

---

## 13. When To Escalate

Escalate when one of these is true:
- the next step requires a real architecture or strategy decision
- the fix would exceed sprint scope in a non-trivial way
- the canonical local identity is still ambiguous after direct checks
- the company loop is blocked by a real hard stopper you cannot remove safely

Do not escalate just because a real run surfaced a normal glue bug.

---

## 14. Minimum End-of-Sprint Report

A useful report includes:
- result: done / partial / blocked
- hard evidence: run ids, issue ids, worktree paths, branch/merge result
- what was fixed on the fly
- what remains open
- commit hash and push target

If stable operating facts changed, update `MEMORY.md`.
If only the live handoff changed, update `CURRENT.md`.

### 14.1 Copilot Reflection Follow-Up

If David wants a post-run reflection from Copilot, the canonical prompt now lives in:
- `COPILOT.md`

Use that prompt after a real agent run when the goal is:
- execution learning
- CEO/Worker/Reviewer reflection
- truthful handoff back to Codex
- bounded creative next-step intuition under `SOUL.md`

---

## 15. Keep This Document Stable

This runbook should only contain repeatable operating truth.

Do not turn it into:
- a sprint log
- a theory document
- a giant architecture dump
- a replacement for `CURRENT.md`

If something is only true for the current sprint, it belongs in `CURRENT.md` or a dated plan doc, not here.
