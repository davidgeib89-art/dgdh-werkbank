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

## TDD rule

Tests first (red), implementation second (green). No exceptions. Handoff must prove the test was written before the implementation.

## Commit verification rule

After `git commit`, always run `git log --oneline -1` and confirm the reported hash actually appears. Workers have reported fabricated commit hashes (`d0f6f2c` in the 2026-03-28 reviewer-wake mission) when operating from an unexpected HEAD state. If the commit is not in `git log`, do not report a hash — report the problem to the orchestrator instead. The orchestrator must verify every reported commitId before closing a feature.
