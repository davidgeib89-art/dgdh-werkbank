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

If a run smells like a known governed capability, check the skill layer before broad repo archaeology:

```powershell
pnpm paperclipai skill contract list --maturity verified
pnpm paperclipai skill contract use ceo-native-issue-handoff-primitives
pnpm paperclipai skill contract use same-session-resume-after-post-tool-capacity
```

Use this to compress rediscovery when the path is already proven.

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

## 6.1 Triad Readiness Check

Before launching a triad mission, prove the runtime is ready: DGDH company exists with CEO, Worker, and Reviewer agents all in `idle` status.

### Step 1 — Health Check

Check seeding status via API or CLI:

```powershell
$base = "http://127.0.0.1:3100"
Invoke-RestMethod "$base/api/health" | Select-Object -Property status, seedStatus
```

Or use the CLI:

```powershell
pnpm paperclipai runtime status
```

**What `seedStatus` fields mean:**
- `dgdhCompanyFound: true` — The DGDH company ("David Geib Digitales Handwerk") exists in the database
- `agentRolesFound.ceo/worker/reviewer: true` — An agent with that `roleTemplateId` exists for the company

**If `dgdhCompanyFound` is false:**
- Seeding did not run at startup
- Check DB connectivity (is the database running and accessible?)
- Ensure `ensureSeedData` was called at server startup
- Restart the server after fixing DB connectivity — seeding runs automatically on boot

### Step 2 — Preflight Check

Once health shows the company exists, verify full triad readiness:

```powershell
# Get the company ID
$companies = Invoke-RestMethod "$base/api/companies"
$company = $companies | Where-Object { $_.name -eq "David Geib Digitales Handwerk" } | Select-Object -First 1
$companyId = $company.id

# Run preflight check
Invoke-RestMethod "$base/companies/$companyId/agents/triad-preflight"
```

**Response fields:**
- `allRolesPresent: true` — All three role agents (ceo, worker, reviewer) exist
- `allAgentsIdle: true` — All present agents have status `"idle"`
- `triadReady: true` — Both conditions above are true (this is the launch signal)
- `roles[]` — Per-role details: `present`, `agentId`, `agentName`, `status`
- `blockers[]` — Human-readable list of what's blocking readiness

**If `triadReady: false`, check `blockers`:**
- Missing role (e.g., `"Missing reviewer role agent"`) — Seeding issue; restart server to trigger seeding backfill
- Busy agent (e.g., `"CEO Agent (ceo) is running"`) — Wait for completion or check stuck runs via `/api/issues/{id}/live-runs`

### Common Failure Modes

**"Seeding ran but runtimeConfig was empty"**
- Backfill happens automatically on next server startup
- Restart the server

**"Company exists but reviewer never wakes"**
- The reviewer may be stuck in a previous run
- Check `/api/companies/{id}/live-runs` for stuck runs
- Use the reviewer-wake-retry procedure if needed

**"Agents present but all busy"**
- Check `/api/issues/{id}/live-runs` for the specific company
- Look for runs stuck in `running` or `queued` status
- Consider resetting agent sessions if runs are truly stuck

### PowerShell Example: Full Check Sequence

```powershell
$base = "http://127.0.0.1:3100"

# 1. Health check
$health = Invoke-RestMethod "$base/api/health"
Write-Host "Health: $($health.status)"
Write-Host "DGDH Company: $($health.seedStatus.dgdhCompanyFound)"

# 2. Preflight (only if company exists)
if ($health.seedStatus.dgdhCompanyFound) {
    $companies = Invoke-RestMethod "$base/api/companies"
    $companyId = ($companies | Where-Object { $_.name -eq "David Geib Digitales Handwerk" }).id
    
    $preflight = Invoke-RestMethod "$base/companies/$companyId/agents/triad-preflight"
    Write-Host "Triad Ready: $($preflight.triadReady)"
    
    if ($preflight.blockers.Count -gt 0) {
        Write-Host "Blockers:"
        $preflight.blockers | ForEach-Object { Write-Host "  - $_" }
    }
}
```

Only proceed with triad mission launch when `triadReady: true`.

---

## 6.2 Starting a Triad Loop

Once `triadReady: true`, create and launch a bounded triad mission in one command:

```powershell
node cli/dist/index.js triad start `
  --title "Improve X in Y" `
  --objective "Add the missing Z so that W no longer requires manual repair" `
  --target-folder "server/src/services/" `
  --done-when "Z is implemented with tests, typecheck passes, no regressions" `
  --assign-to-ceo `
  --project-id $projectId `
  --company-id $companyId
```

The command:
1. Creates a parent issue with the full triad description format (`missionCell: triad-mission-loop-v1`, `reviewerFocus`, `reviewerAcceptWhen`, `reviewerChangeWhen`, `[NEEDS INPUT]: none`)
2. With `--assign-to-ceo`: finds the first idle CEO agent and assigns the issue to it, triggering the CEO loop immediately
3. Prints the issue identifier and ID so you can observe via `company-run-chain`

Without `--assign-to-ceo`, the issue is created in `todo` status for manual assignment later:

```powershell
$response = Invoke-RestMethod -Method Patch -Uri "$base/issues/$issueId" `
  -ContentType "application/json" -Body (@{ assigneeAgentId = $ceo.id; status = "todo" } | ConvertTo-Json -Depth 10)
```

After assignment, observe with:

```powershell
Invoke-RestMethod "$base/issues/$issueId/company-run-chain"
Invoke-RestMethod "$base/issues/$issueId/active-run"
```

---

## 6.3 Rescuing a Stalled Closeout

When a worker makes real progress but hits `post_tool_capacity_exhausted` before calling `worker-done`, the closeout stalls. The worker PR exists, the branch exists, but the handoff to reviewer never fires. This section documents the rescue path.

### Overview

Stalls happen when:
- Worker consumed tool capacity after creating a PR but before calling `worker-done`
- Next resume point is `resume_existing_session_worker_closeout` or `resume_existing_session_reviewer_verdict`
- The deferred wakeup hasn't fired (scheduler ordering or agent state mismatch)

The rescue command manually completes the stalled handoff without losing the work already done.

### Step 1 — Diagnose the Stall

Check the company run chain to identify the stall type:

```powershell
$base = "http://127.0.0.1:3100"
$childId = "<child-issue-id>"

Invoke-RestMethod "$base/issues/$childId/company-run-chain"
Invoke-RestMethod "$base/issues/$childId/active-run"
```

Look for:
- `closeoutBlocker` in the triad data — indicates where the stall occurred
- `nextResumePoint` in the deferred state:
  - `resume_existing_session_worker_closeout` → worker rescue needed (PR exists, needs `worker-done` call)
  - `resume_existing_session_reviewer_verdict` → reviewer rescue needed (worker done, needs verdict)

If the child issue shows `nextResumePoint = resume_existing_session_worker_closeout`, proceed to Step 2. If `nextResumePoint = resume_existing_session_reviewer_verdict`, skip to Step 3.

### Step 2 — Worker Rescue (Closeout Path)

Required information:
- PR URL (check GitHub or `git log` on the worker's branch)
- Branch name
- Commit hash of the final worker commit

Command:

```powershell
paperclipai triad rescue `
  --issue-id <childIssueId> `
  --pr-url <url> `
  --branch <branch> `
  --commit <hash>
```

What happens after:
- Server records the PR, branch, and commit
- Worker-done state is marked complete
- Idle reviewer is assigned automatically
- Reviewer wake is queued (no manual wakeup needed)

### Step 3 — Reviewer Rescue (Verdict Missing)

Use this only after reading the worker output and confirming the change is acceptable.

Command:

```powershell
paperclipai triad rescue `
  --issue-id <childIssueId> `
  --reviewer-verdict accepted
```

Alternative if changes are required:

```powershell
paperclipai triad rescue `
  --issue-id <childIssueId> `
  --reviewer-verdict changes_requested
```

### PowerShell Example: Full Rescue Sequence

```powershell
$base = "http://127.0.0.1:3100"
$parentId = "<parent-issue-id>"

# 1. Get the child issue ID from company-run-chain
$chain = Invoke-RestMethod "$base/issues/$parentId/company-run-chain"
$childId = $chain.children[-1].issueId

Write-Host "Child issue: $childId"

# 2. Check active run for resume point
$active = Invoke-RestMethod "$base/issues/$childId/active-run"
$resumePoint = $active.runContext.deferredState.nextResumePoint
Write-Host "Resume point: $resumePoint"

# 3. Worker rescue (if needed)
if ($resumePoint -eq "resume_existing_session_worker_closeout") {
    # Get PR details from git
    $branch = git -C .paperclip/worktrees/$childId branch --show-current
    $commit = git -C .paperclip/worktrees/$childId rev-parse HEAD
    $prUrl = "https://github.com/davidgeib/dgdh-paperclip/pull/<pr-number>"
    
    paperclipai triad rescue `
      --issue-id $childId `
      --pr-url $prUrl `
      --branch $branch `
      --commit $commit
}

# 4. Reviewer rescue (if needed)
if ($resumePoint -eq "resume_existing_session_reviewer_verdict") {
    paperclipai triad rescue `
      --issue-id $childId `
      --reviewer-verdict accepted
}
```

---

### 7.1 Skill-Layer Reuse Shortcut

Use the skill-layer shortcut when you recognize one of the seeded paths:

- CEO native child handoff
- same-session resume after post-tool capacity

Operational rule:

- `skill contract list` tells you what is already verified
- `skill contract use <capabilityId>` gives the shortest bounded reuse brief
- `skill contract verify` or `verify-all` proves the evidence again on the current runtime when needed
- when the run should explicitly reuse a verified skill, attach it on the issue packet with `verifiedSkill: <capabilityId>` so the runtime prompt carries the brief without broad rediscovery

This is intentionally not a router or registry.
It is the smallest operator-facing bridge from `verified` to `used`.

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

> **Kickoff-Probe Rule:** Perform a minimal, non-destructive API check (e.g., `GET /api/companies`) right at the start to verify connectivity and identity before assigning issues or creating projects. This prevents "kickoff loss" before committing to a run.

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
} | ConvertTo-Json -Depth 10

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
  description = "Real bounded run on the proven canonical local baseline.`nverifiedSkill: ceo-native-issue-handoff-primitives"
  status = "todo"
  priority = "medium"
} | ConvertTo-Json -Depth 10

$issue = Invoke-RestMethod -Method Post -Uri "$base/companies/$companyId/issues" -ContentType "application/json" -Body $issueBody
$issueId = $issue.id
```

For bounded implementation packets, specify the concrete target file or target folder in the issue description when you already know it.
Otherwise the routing preflight can legitimately stop the CEO run with `missing_inputs` before any child issue is created.

If the packet should consciously reuse a verified skill, add `verifiedSkill: <capabilityId>` to the description.
That keeps the bridge explicit, reviewable, and small.

5. Start the loop by assigning the issue, not by raw wakeup.

```powershell
$assignBody = @{
  assigneeAgentId = $ceo.id
  status = "todo"
} | ConvertTo-Json -Depth 10

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

Polling rule for live proofs:

- start with one-shot reads, not an open-ended watch loop
- if polling is necessary, set a hard timeout before starting (normally <= 2 minutes)
- stop immediately on terminal non-success truth too, not only on hoped-for success
- terminal stop conditions include:
  - `GET /issues/{id}/active-run` returns `null`
  - `company-run-chain` stops changing across a few polls
  - a child issue appears with `executionPacketTruth.status = not_ready`
  - the parent/child issue reaches a stable non-progressing state

If one of those happens, stop the loop and inspect the exact blocking surface once.

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


> **Triad Live-Loop Launch Note:** Before launching a bounded triad mission, prove the canonical runtime with `GET /api/health` and `GET /api/companies`, then read the active company agents so the CEO lane is not silently already occupied. Treat `GET /api/issues/{id}/active-run` and `GET /api/issues/{id}/company-run-chain` as the real launch proof after assignment, not the issue creation alone.

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

### 7.4 Execution Packet Readiness Standards

To ensure a smooth transition from CEO to Worker and avoid `missing_inputs` stalls, execution packets (child issues) should follow a formal readiness structure. The CEO is responsible for defining these fields clearly in the description:

- **Titel**: A concise, descriptive name for the task.
- **Ziel**: The intended outcome or "why" of the task.
- **Scope**: Explicit boundaries of the work to prevent scope creep.
- **targetFile**: The primary file to be created or modified (if known).
- **targetFolder**: The directory context for the execution.
- **artifactKind**: The nature of the output (e.g., `code_patch`, `doc_update`, `config_change`).
- **doneWhen**: Clear, verifiable criteria that must be met for the task to be considered finished.
- **Annahmen**: Relevant assumptions or constraints.
- **[NEEDS INPUT]**: Must be explicitly set to `none` for the packet to be "ready". If not `none`, the worker may block until the input is provided.

Adhering to this format allows the routing and execution engines to proceed autonomously without pausing for manual clarification.

### 7.5 PowerShell JSON Depth Tip

When using `Invoke-RestMethod` with a JSON body in PowerShell, always use `-Depth 10` (or higher) with `ConvertTo-Json`.

PowerShell's default depth for `ConvertTo-Json` is 2, which often truncates nested objects in Paperclip payloads (like `workspace` or `adapterConfig`), leading to silent API failures or "missing field" errors.

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

### 14.2 Triad Live-Loop Launch Note

Use one fresh parent issue with `missionCell: triad-mission-loop-v1` and explicit worker/reviewer packet truth: `targetFile` or `targetFolder`, `artifactKind`, `doneWhen`, `reviewerFocus`, `reviewerAcceptWhen`, and `reviewerChangeWhen`.

If the parent or child falls into `post_tool_capacity_exhausted`, prefer the existing same-session resume path over creating a parallel packet. The honest next proof is the resumed run, reviewer handoff, and reviewer verdict, not a duplicate kickoff.

---

## 15. Post-Handoff Loss Classes

A **loss class** is a systematic drop in context or intent during the handoff between agents (e.g., from CEO to Worker).

### 15.1 Identifying Loss Classes

To diagnose a loss class, compare the **intended baseline** (the child issue packet) against the **actual worker behavior**:
- **Scope Leak**: The worker touches files outside the `targetFolder` or `Scope` field.
- **Criteria Decay**: The implementation misses specific constraints defined in the `doneWhen` field.
- **Tool Selection Failure**: The worker reverts to generic file-searching when the CEO provided a specific target file.

If a loss class is identified, promote the missing constraint into the **Execution Packet Readiness Standards (#7.4)** or the agent's role template to prevent future recurrence.

---

## 14.4. Keep This Document Stable

This runbook should only contain repeatable operating truth.

Do not turn it into:
- a sprint log
- a theory document
- a giant architecture dump
- a replacement for `CURRENT.md`

If something is only true for the current sprint, it belongs in `CURRENT.md` or a dated plan doc, not here.
