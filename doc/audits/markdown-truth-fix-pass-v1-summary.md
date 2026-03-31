# Markdown Truth Fix Pass v1 Summary

Date: 2026-03-31
Source task list: `doc/audits/markdown-truth-audit-v1.md`
Scope discipline: high-risk `update` docs only; no archive/delete moves; no broad tree rewrite

## Files Updated
- `README.md`
- `INIT.md`
- `REINIT.md`
- `company-hq/AGENT-CONSTITUTION.md`
- `company-hq/AUTONOMY-MODES.md`
- `company-hq/ROADMAP.md`
- `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
- `docs/api/overview.md`
- `docs/cli/overview.md`
- `docs/adapters/overview.md`
- `docs/api/issues.md`
- `docs/api/agents.md`
- `docs/cli/control-plane-commands.md`
- `docs/agents-runtime.md`
- `docs/guides/openclaw-docker-setup.md`
- `docs/start/architecture.md`
- `docs/start/quickstart.md`
- `docs/start/what-is-paperclip.md`

## What Was False Before
### Root and high-authority entrypoints
- `README.md` still described an older adapter/runtime surface and a narrower product picture than the current repo actually ships.
- `INIT.md` still treated older docs as the primary canon, referenced an absent `CLAUDE.md`, and over-weighted older roadmap material.
- `REINIT.md` still described Codex as the default coder/executor lane instead of the current planner/reviewer/bounded-fix lane.

### Governance docs that could misroute agents
- `company-hq/AGENT-CONSTITUTION.md` still encoded the old Claude/Codex/Gemini role stack.
- `company-hq/AUTONOMY-MODES.md` still claimed mission operations were defined but not active.
- `company-hq/ROADMAP.md` still read as if the repo were in a Gemini-first worker-loop phase instead of the current mission-autonomy / predictive-delivery phase.
- `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` still presented itself as the sole first document for current operational direction.

### Public CLI/API/runtime docs
- `docs/api/overview.md` claimed all API requests require auth, which is false for `GET /api/health`.
- `docs/cli/overview.md` implied one flag story (`--api-base`) for all commands, which is false for `runtime` and `triad` commands.
- `docs/adapters/overview.md` still documented `openclaw` and omitted current built-in adapter types.
- `docs/api/issues.md` omitted current operator/triad truth surfaces such as `company-run-chain`, `active-run`, `live-runs`, reviewer/worker closeout routes, and stale-archive support.
- `docs/api/agents.md` omitted current adapter/status truth plus `triad-preflight` and live-run visibility endpoints.
- `docs/cli/control-plane-commands.md` omitted `issue liveness`, `runtime status`, and triad commands.
- `docs/agents-runtime.md` still described only the older adapter/runtime set and lacked the newer operator truth surfaces.
- `docs/guides/openclaw-docker-setup.md` still taught `adapterType=openclaw` and blurred local smoke overrides with the supported default product path.
- `docs/start/architecture.md`, `docs/start/quickstart.md`, and `docs/start/what-is-paperclip.md` still described an older repo/adapters/runtime picture.

## Evidence Used To Correct It
Primary evidence, not markdown folklore:
- `packages/shared/src/constants.ts`
  - current adapter types: `process`, `http`, `claude_local`, `codex_local`, `gemini_local`, `opencode_local`, `pi_local`, `cursor`, `openclaw_gateway`, `hermes_local`
  - current agent statuses including `pending_approval`
- `server/src/routes/health.ts`
  - `GET /api/health` is public and returns deployment/auth/seed status
- `server/src/routes/agents.ts`
  - `GET /api/companies/:companyId/agents/triad-preflight`
  - company and issue live-run visibility routes
- `server/src/routes/issues.ts`
  - `GET /api/issues/:id/company-run-chain`
  - worker/reviewer closeout and rescue routes
  - stale issue archive route
- `cli/src/commands/client/triad.ts`
  - `triad start`, `triad status`, `triad rescue`
  - `--api-url` for triad status/rescue
- `cli/src/commands/runtime/index.ts`
  - `runtime status` and `--api-url`
- `cli/src/commands/client/issue.ts`
  - `issue liveness`
- `packages/adapters/openclaw-gateway/doc/ONBOARDING_AND_TEST_PLAN.md`
  - supported product truth is `openclaw_gateway` only
  - device auth enabled by default in the supported onboarding contract
- `CURRENT.md`, `company-hq/ACTIVE-MISSION.md`, `company-hq/CORE.md`, `TRINITY.md`, `CODEX.md`, `COPILOT.md`
  - current lane split, mission-autonomy truth, and runtime/operator priorities

## Important Audit Correction
The audit queue referenced `validate-packet` as part of the current CLI surface.

Current workspace truth did not support documenting that as live product surface in this pass:
- `cli/src/commands/client/validate-packet.ts` is not present in this workspace
- therefore this pass did **not** document `issue validate-packet` as current truth
- if that command lands later on the current branch, it should be documented in a later narrow pass

## What Still Remains For Later Passes
- Archive/delete work from the audit has not been touched yet.
- Lower-risk `update` buckets have not been touched yet.
- Cross-link cleanup is still needed so older docs stop sending agents to demoted authority surfaces.
- Several public docs are now materially safer, but they still carry some older framing and could use a later product-language tightening pass after truth cleanup is complete.
- If `validate-packet` is merged into the current workspace later, CLI/API/operator docs should add it then from code truth, not from audit inertia.
- The generated/customer markdown under `shared/Kunde/...` still needs a human decision pass.

## Net Effect
This pass reduced the highest operational drift in the places most likely to waste David minutes:
- root re-entry docs
- governance docs that set role/mode truth
- public docs that operators and agents use to understand auth, adapters, runtime diagnosis, triad flows, and OpenClaw setup

The result is not prettier docs. It is a narrower and more trustworthy first read for future agents and operators.
