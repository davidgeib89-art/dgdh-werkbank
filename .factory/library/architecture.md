# Architecture — DGDH Paperclip Triad System

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

Existing commands: `triad start`, `triad rescue`, `triad status <issue-id>`

`triad status <issue-id>`:
- Calls `GET /api/issues/:id/company-run-chain`
- Response shape includes `children[].triad.reviewerWakeStatus` and `children[].triad.closeoutBlocker`
- Displays human-readable stall diagnosis and pre-filled rescue command when stall is detected

## CLI Issue Commands

Lives in `cli/src/commands/client/issue.ts`. Registered via `registerIssueCommands(program)`.

Existing commands: `issue list`, `issue get`, `issue create`, `issue update`, `issue assign`, `issue unassign`, `issue comment`, `issue checkout`, `issue release`, `issue archive-stale`

**Pending — Second Triad Proof mission deliverable:**
`issue validate-packet <id>`:
- Calls server-side packet resolution logic (or reuses `executionPacketTruth` from `GET /api/issues/:id`)
- Reports whether the packet is ready, what fields are missing, and what packetType was inferred
- Exit 0 for ready packet; exit 1 for not-ready
- Supports `--json` flag for machine-readable output: `{ status: "ready" | "not_ready", reasonCodes?: string[] }`
- Files: `cli/src/commands/client/issue.ts` (new subcommand) + `cli/src/__tests__/issue-validate-packet.test.ts`
- Pattern: follow existing `issue list` / `issue get` command structure

## Packet Readiness

The server exposes `executionPacketTruth` on `GET /api/issues/:id`.

Key fields:
- `executionPacketTruth.status`: `"ready"` | `"not_ready"` | `"not_applicable"`
- `executionPacketTruth.artifactKind`: `"code_patch"` | `"multi_file_change"` | `"doc_update"` | etc.
- `executionPacketTruth.targetFolder`: folder path when artifact is folder-scoped
- `executionPacketTruth.targetFile`: file path when artifact is file-scoped
- `executionPacketTruth.reasonCodes`: array of reason strings when `not_ready`

**Critical convention:** When `targetFolder` is set and no specific file is named, use `artifactKind: multi_file_change`. Using `code_patch` with only a folder is invalid and results in `not_ready` packet truth.

## Gap Status (as of 2026-03-30)

- Gap 1 (reviewer wake never wired): **FIXED** — `scanAndRetryReviewerWakes()` is now wired in scheduler
- Gap 2 (closeout brief drop on 3rd resume): **FIXED** — `forceFreshSession` fallback preserves closeout brief
- Gap 3 (reviewer wake lacks context): Status unknown — may still require API call to reconstruct
