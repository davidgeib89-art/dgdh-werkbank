# Commit Report

## Summary

- Built Gemini quota spine v1 with founder-readable /stats surface and advisory routing preflight.

## Why

- Shift from benchmark loop to practical control-plane building for DGDH.
- Make account/bucket/model/budget decisions visible before and after runs.

## Changed

- Added founder-readable endpoint `GET /api/agents/:id/stats`.
- Added advisory Gemini routing preflight service with policy file.
- Wired routing preflight into heartbeat run flow and persisted quota snapshot metadata.
- Slimmed default Gemini prompt path by making API/env notes opt-in.
- Included a small follow-up fix to keep route diff minimal after endpoint addition.

## Files

- server/src/routes/agents.ts: exposes `/agents/:id/stats` with runtime/run/cost snapshot.
- server/src/services/gemini-routing.ts: resolves advisory routing decision (task->bucket->model lane).
- server/config/gemini-routing-policy.v1.json: founder-editable routing policy source.
- server/src/services/heartbeat.ts: executes preflight, emits routing event, persists quota snapshot.
- packages/adapters/gemini-local/src/server/execute.ts: default prompt de-bloat via opt-in notes.

## Decisions

- Routing is advisory-first (no automatic magic switching in v1).
- Policy is file-based and founder-editable, not LLM-routed.
- Keep preflight decision visible in run context/events and runtime state.
- Keep default prompt lean unless explicit config opts into verbose notes.

## Risks / Notes

- No automatic quota-window polling integrated yet; bucket state still depends on configured runtime hints.
- `toolCalls` in stats depends on usage payload shape from adapter/runtime.
- Endpoint is read-only and intentionally minimal; no new UI added in this sprint.

## Validation

- Ran `pnpm --filter @paperclipai/server typecheck` successfully.
- Ran `pnpm --filter @paperclipai/adapter-gemini-local typecheck` successfully earlier in sprint.
- Confirmed worktree clean after commit fix-up.

## Next Step

- Run one live advisory preflight cycle and verify `/api/agents/:id/stats` output against an actual run, then decide on soft-enforced mode rollout.
