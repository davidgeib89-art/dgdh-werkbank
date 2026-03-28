# Architecture

Key architectural decisions and patterns for this mission.

---

## Heartbeat service pattern

`heartbeat.ts` is a monolithic 5382-line service file. It exports `heartbeatService(db)` which returns a function object. New functions go inside this closure. New exported helpers (constants, pure functions) go at module scope before the `heartbeatService` function.

**Do not extract sub-files.** Keep additions inside the existing file.

## Worker-done endpoint structure

`server/src/routes/issues.ts` contains all issue routes including the triad handoff endpoints:
- `POST /issues/:id/worker-pr` — records PR creation
- `POST /issues/:id/worker-done` — transitions to in_review + wakes reviewer
- `POST /issues/:id/reviewer-verdict` — records verdict + triggers CEO retrigger
- `GET /issues/:id/company-run-chain` — operator-facing chain summary

## Activity log pattern

```typescript
await logActivity(db, {
  companyId,
  actorType: "agent" | "user" | "system",
  actorId,
  agentId,
  runId,
  action: "issue.<verb>",
  entityType: "issue",
  entityId: issueId,
  details: { ... },
});
```

New activity actions follow `"issue.<verb>"` naming. The activity log is the audit trail — always log state transitions.

## Reviewer wake retry design

New constant (module scope in heartbeat.ts):
```typescript
export const REVIEWER_WAKE_RETRY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
```

New function (inside heartbeatService closure):
```typescript
async function scanAndRetryReviewerWakes() { ... }
```

Call it from the main exported heartbeat function alongside existing work.

## company-run-chain field addition

`reviewerWakeStatus` is added as an optional field on the `reviewer_assigned` stageShape. It is derived at query time from: (a) active reviewer runs, (b) activity log entries for wake events, (c) time elapsed since issue entered in_review. Null for non-triad issues.

## ensure-seed-data — ALREADY COMPLETE (do not re-implement)

`server/src/services/ensure-seed-data.ts` is a complete seeding service that:
- Reads `server/config/seed/dgdh-firm.json` which defines the DGDH company + CEO Agent / Worker Agent / Reviewer Agent
- Creates company + agents in a transaction if missing
- Backfills empty `runtimeConfig` for existing agents
- Has 4 regression tests in `server/src/__tests__/ensure-seed-data.test.ts`
- Takes a `db: Db` parameter

The agents use `gemini_local` adapter with `model: "auto"` and `roleTemplateId: "ceo"|"worker"|"reviewer"`, plus `wakeOnAssignment: true, wakeOnAutomation: true`.

**Do not create new seeding logic. The seed path already exists.** The gap is that readiness is not *visible* — no single call tells an operator whether the seed ran, whether the company exists, or whether agents are idle.

## CLI command pattern

CLI commands follow Commander.js conventions. Each command lives in `cli/src/commands/<category>/`. New categories need an index.ts that creates the Command and adds subcommands. The root `cli/src/commands/index.ts` adds the category command via `.addCommand()`. All API calls use `api` from `../../lib/api`.

## Companies route pattern

Company-scoped routes live in `server/src/routes/companies.ts`. New GET endpoints that read company state (like preflight) should validate the companyId param, find the company or 404, then query agents. Use the `agentService(db)` for agent queries (it has `list()` and similar). For preflight-style endpoints look at how the company-run-chain route works: find company, assert access, return structured shape.

## Agents route pattern

Agent-scoped routes live in `server/src/routes/agents.ts` (large file). Company-agent-scoped routes like triad preflight can be added there under `/companies/:companyId/agents/triad-preflight`. They use `agentService(db).list()` to get all agents for a company, then filter by `adapterConfig.roleTemplateId`. Agent status comes from `agent.status` field (idle/running/error/paused/terminated).

## Health route pattern

`server/src/routes/health.ts` defines `GET /` (mapped to `/api/health`). It returns `{ status: "ok" }` plus optionally `{ db: "connected"|"unavailable" }` when db is provided. Extending it with seed status requires reading company + agents from db inside the health handler. Keep the existing `{ status: "ok" }` field unchanged for backward compatibility. Add seed status as an optional field.

## Rescue route pattern (triad-repeatability mission)

`POST /issues/:id/worker-rescue` is an operator-facing composite endpoint in `server/src/routes/issues.ts`. It combines worker-pr + worker-done in one call with a state validation gate:
- 404 if issue not found
- 422 if issue is in a terminal status (done, merged, cancelled, reviewer_accepted)
- 200 { success: true } on success

Schema defined locally (not in packages/shared): reuses `submitWorkerDoneSchema` fields: `{ prUrl, branch, commitHash, summary }`.

Reference for tests: `server/src/__tests__/issue-worker-done-route.test.ts` (existing mock setup pattern).

## Archive-stale route pattern (triad-repeatability mission)

`POST /companies/:companyId/issues/archive-stale` in `server/src/routes/issues.ts`:
- Body: `{ daysOld: number (positive int), dryRun?: boolean }`
- Dry run: returns `{ archived: 0, issueIds: [...] }` without updating DB
- Real run: sets `status = "cancelled"` for matching todo/blocked issues older than N days
- Returns `{ archived: N, issueIds: [...] }`

Excluded statuses from archival: `in_progress`, `in_review`, `merged`, `done`, `reviewer_accepted`.

## Rescue CLI pattern (triad-repeatability mission)

`paperclipai triad rescue` extends `registerTriadCommands` in `cli/src/commands/client/triad.ts`.
Two paths:
1. Worker rescue: `--issue-id --pr-url --branch --commit [--summary]` → POST /api/issues/:id/worker-rescue
2. Reviewer rescue: `--issue-id --reviewer-verdict` → POST /api/issues/:id/reviewer-verdict

## Closeout prompt brief pattern (triad-repeatability mission)

In `server/src/services/heartbeat-prompt-context.ts`: when context snapshot contains a resume state with `nextResumePoint` in `["resume_existing_session_worker_closeout", "resume_existing_session_reviewer_verdict"]`, inject a role-specific closeout brief as a high-priority system message prepended to the prompt patch. The brief must explicitly name the API calls the agent should make (worker-pr + worker-done for worker; reviewer-verdict for reviewer).

## TDD rule

Tests first (red), implementation second (green). No exceptions. Handoff must prove the test was written before the implementation.

## Commit verification rule

After `git commit`, always run `git log --oneline -1` and confirm the reported hash actually appears. Workers have reported fabricated commit hashes (`d0f6f2c` in the 2026-03-28 reviewer-wake mission) when operating from an unexpected HEAD state. If the commit is not in `git log`, do not report a hash — report the problem to the orchestrator instead. The orchestrator must verify every reported commitId before closing a feature.
