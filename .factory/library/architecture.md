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

## TDD rule

Tests first (red), implementation second (green). No exceptions. Handoff must prove the test was written before the implementation.

## Commit verification rule

After `git commit`, always run `git log --oneline -1` and confirm the reported hash actually appears. Workers have reported fabricated commit hashes (`d0f6f2c` in the 2026-03-28 reviewer-wake mission) when operating from an unexpected HEAD state. If the commit is not in `git log`, do not report a hash — report the problem to the orchestrator instead. The orchestrator must verify every reported commitId before closing a feature.
