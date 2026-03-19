# Commit Report

## Summary
- Fixed Gemini routing/model-lane consistency and validated `/api/agents/:id/stats` with a real live run.

## Why
- `/stats` could become semantically misleading when policy bucket and configured model diverged.
- V1 needed explicit configured vs recommended vs effective model lane fields before further rollout.

## Changed
- Routing preflight now computes and stores:
  - configuredModelLane
  - recommendedModelLane
  - effectiveModelLane
  - selectedBucket / configuredBucket / effectiveBucket
- Heartbeat routing event message now logs selected bucket + effective model lane.
- `/stats` now exposes configured/recommended/effective model lanes and selected bucket explicitly.
- Backward-compatible `currentModelLane` now maps to effective model lane.

## Files
- server/src/services/gemini-routing.ts: core consistency fix in preflight model/bucket semantics.
- server/src/services/heartbeat.ts: routing preflight event log now reports effective lane.
- server/src/routes/agents.ts: `/stats` payload extended for founder-readable lane clarity.

## Decisions
- Keep advisory-first behavior; no new automatic switching logic added.
- Make lane semantics explicit in API instead of implicit inference.
- Keep `currentModelLane` for compatibility, but treat it as effective lane.

## Risks / Notes
- Live test run failed with `adapter_failed` (`YOLO mode is enabled...`) but still produced valid stats surface.
- Bucket state remains `unknown` unless runtime provides bucket-state hints.
- No UI changes in this sprint; API-level clarity only.

## Validation
- `pnpm --filter @paperclipai/server typecheck` passed.
- Live health check on updated server at `127.0.0.1:3110` passed.
- Real run executed: `517fd167-9374-4530-a123-b2b2f2ef424d`.
- Live `/stats` read after run returned all three model-lane fields and bucket fields.

## Next Step
- Decide whether to set `routingPolicy.mode=soft_enforced` for one controlled agent and run a bounded verification task.
