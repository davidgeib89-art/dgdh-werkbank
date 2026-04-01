# Architecture — Triad Closeout Mission

## The Triad Execution Loop

The triad is the core DGDH execution unit: CEO (parent issue) → Worker (child issue) → Reviewer (child issue) → CEO merge.

**Key types/routes:**
- Issues: `server/src/routes/issues.ts` — all issue CRUD, worker-done, reviewer-verdict, triad-preflight
- Heartbeat service: `server/src/services/heartbeat.ts` — runs agent sessions, manages state transitions, scheduler
- CEO service: `server/src/services/ceo.ts` — merge orchestration after reviewer accepts

**State transitions:**
```
todo → in_progress (worker assigned)
in_progress → in_review (POST /issues/:id/worker-done)
in_review → reviewer_accepted (POST /issues/:id/reviewer-verdict {verdict: "accepted"})
reviewer_accepted → done (CEO merge orchestrator)
```

## Heartbeat Scheduler

Lives in `server/src/index.ts`. Two `setInterval` calls:

1. **Heartbeat scheduler** (interval: `config.heartbeatSchedulerIntervalMs`, default ~60s):
   - `heartbeat.tickTimers()` — process timer-based wakeups
   - `heartbeat.reapOrphanedRuns()` — clean up lost runs
   - `heartbeat.resumeQueuedRuns()` — promote deferred capacity wakes, process queued runs
   - `heartbeat.scanAndRetryReviewerWakes()` — **MISSING from production, fixed in this mission**

2. **Backup scheduler** — unrelated, separate interval

## The Closeout Seam

The seam this mission fixes: the path from a completed worker run to a merged PR.

**Normal path:**
1. Worker run finishes → agent calls `POST /issues/:id/worker-done`
2. `worker-done` handler: sets issue `status = "in_review"`, finds idle reviewer, calls `heartbeat.wakeup(reviewer)`
3. Reviewer run starts → reads issue → calls `POST /issues/:id/reviewer-verdict { verdict: "accepted" }`
4. `reviewer-verdict` handler: sets `status = "reviewer_accepted"`, calls `ceoSvc.maybeRunCeoMergeOrchestratorAfterReviewerVerdict()`
5. CEO merge orchestrator: merges PRs, sets parent `done`

**Stall class 1 — No idle reviewer at worker-done time:**
- `worker-done` finds no idle reviewer, logs `issue.reviewer_wake_deferred`
- `scanAndRetryReviewerWakes()` should retry after 5 min — **but was never wired into the scheduler** (Gap 1)

**Stall class 2 — Reviewer wake retry lacks context:**
- When the retry fires, the context snapshot is minimal — no `workerRunId` or handoff summary
- Reviewer must make an extra API call to reconstruct context (Gap 3)

## The Resume / Capacity Path

When an agent run hits `post_tool_capacity_exhausted`:
1. Heartbeat detects it → `outcome = "blocked"`
2. `schedulePostToolCapacityResume()` creates a deferred wake in `agentWakeupRequests` with `status = "deferred_capacity_cooldown"`
3. After cooldown (~3 min), `promoteDuePostToolCapacityWakeups()` promotes the wake to `queued`
4. Scheduler runs → `resumeQueuedRuns()` processes the queued wake
5. New run starts with `paperclipPostToolCapacityCloseout` in context

**Closeout brief injection** (`heartbeat-prompt-context.ts`):
- `buildIssueTaskPrompt()` checks `context.postToolCapacityResume === true` to inject CLOSEOUT MODE BRIEF
- On 3rd resume (`resumeCount >= 2`): `postToolCapacityResume` is deleted from context → **brief is silently dropped** (Gap 2)
- Fix: preserve or restore the closeout brief gate when `paperclipPostToolCapacityCloseout` is present

## CLI Triad Commands

Lives in `cli/src/commands/client/triad.ts`. Registered via `registerTriadCommands(program)`.

Existing commands: `triad start`, `triad rescue`

New command added by this mission: `triad status <issue-id>`
- Calls `GET /api/issues/:id/company-run-chain`
- The response shape includes `children[].triad.reviewerWakeStatus` and `children[].triad.closeoutBlocker`
- Command displays human-readable stall diagnosis and pre-filled rescue command when stall is detected

## Post-Tool-Capacity Closeout Policy (Boundary Extraction)

The heartbeat service has a `resolvePostToolCapacityCloseoutTruth` function that decides what
an agent should do when it resumes after hitting model capacity limits.

**Before extraction**: Hardcoded `if (roleTemplateId === "worker")` / `if (roleTemplateId === "reviewer")`
switch in `heartbeat.ts`. The worker case already has its procedure in `worker.json`
(`closeoutResumeProcedure` field) but TypeScript ignores it.

**After extraction**:
- `reviewer.json` gets a structured `closeoutResumeProcedure` field (like worker.json)
- `role-templates.ts` exports `getCloseoutProcedureForRole(roleTemplateId)` that reads from the template JSON
- `heartbeat.ts resolvePostToolCapacityCloseoutTruth` calls the template service instead of its own hardcoded switch
- Roles without a closeoutResumeProcedure get the generic active-session default (e.g., CEO)

This makes closeout behavior template-driven for the roles that participate in the closeout path,
without changing behavior or adding new roles.
