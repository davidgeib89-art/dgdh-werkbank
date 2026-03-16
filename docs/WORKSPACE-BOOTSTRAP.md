# Workspace Bootstrap Memo

Date: 2026-03-16
Audience: David Geib - Digitales Handwerk

## Current repo / worktree context

- Repo/worktree: `paperclip-codex` at `C:\Users\holyd\DGDH\worktrees\paperclip-codex`
- Git branch: `codex-work` tracking `origin/codex-work`
- Worktree mode: enabled via repo-local `.paperclip/`
- Configured server mode: `local_trusted` + `private`
- Configured server port in `.paperclip/config.json`: `3101`
- Current heartbeat API URL in this agent session: `http://127.0.0.1:3102`
- Note: both `3101` and `3102` currently answer `/api/health`; confirm which server is the intended manual QA target before testing
- Embedded Postgres dir: `C:\Users\holyd\.paperclip-worktrees\instances\codex-work\db`
- Embedded Postgres port: `54330`
- Storage dir: `C:\Users\holyd\.paperclip-worktrees\instances\codex-work\data\storage`
- Current git state is not clean. Tracked edits exist in `README.md`, `doc/DEVELOPING.md`, `packages/shared/src/constants.ts`, `server/src/services/heartbeat.ts`, `server/src/services/issues.ts`, `ui/src/components/Sidebar.tsx`, `ui/src/lib/company-routes.ts`, and `ui/src/pages/MemoryViewer.tsx`. Untracked files currently include this memo and `ui/src/components/memory/`.

This worktree is isolated from the default Paperclip instance. The repo-local
`.paperclip/config.json` points at a dedicated instance under
`C:\Users\holyd\.paperclip-worktrees\instances\codex-work`, which is the right
setup for supervised local development without cross-worktree DB collisions.

## Important folders

- `server/`: Express API, routes, services, heartbeat runtime, adapters, backend tests
- `ui/`: React/Vite board UI, routes, pages, API clients, and component library
- `packages/db/`: Drizzle schema, migrations, and DB client wiring
- `packages/shared/`: shared constants, types, validators, and API contracts
- `cli/`: Paperclip CLI commands and local operator tooling
- `doc/`: internal product, engineering, and runbook docs
- `docs/`: published or handoff-style docs; this memo lives here
- `skills/`: runtime skills available to agents in this workspace
- `.agents/skills/`: contributor helper skills shipped with the repo
- `.paperclip/`: worktree-local Paperclip config and env wiring

## Memory implementation status

Memory work is already present in this branch history and in the current tree:

- `40ef25e`: memory service + DB integration
- `aa5f847`: reflection engine
- `a1ddba6`: governance features
- `6663d64`: memory viewer UI + smoke-test docs
- `e122fab`: follow-up fix for memory API base URL and MemoryViewer state handling

Current code status:

- DB model exists in `packages/db/src/schema/memory_items.ts` with migrations
  `0030_memory_kernel.sql` and `0031_memory_governance.sql`
- Shared contracts exist in `packages/shared/src/types/memory.ts` and
  `packages/shared/src/validators/memory.ts`
- Backend routes exist in `server/src/routes/memory.ts`
- Backend services exist in:
  - `server/src/services/memory.ts`
  - `server/src/services/reflection.ts`
  - `server/src/services/governance.ts`
- Heartbeats already integrate memory:
  - hydrate run context into `paperclipMemory`
  - persist episode memories after runs
- Server-side tests exist for memory/governance/reflection:
  - `server/src/__tests__/memory-service.test.ts`
  - `server/src/__tests__/memory-smoke.test.ts`
  - `server/src/__tests__/reflection.test.ts`
  - `server/src/__tests__/governance.test.ts`

UI status:

- A `MemoryViewer` page exists at `ui/src/pages/MemoryViewer.tsx`
- The board route exists at `/:companyPrefix/memory`
- Sidebar navigation includes a Memory entry
- API client exists at `ui/src/api/memory.ts`
- Current local WIP splits the viewer into smaller pieces under
  `ui/src/components/memory/`

Important limitation:

- `ui/src/api/memory.ts` currently exposes read-oriented operations
  (`viewer`, `stats`, `reflect`, `retrieval-trace`), but not the full
  mutation/governance surface implied by the backend (`approve`, `reject`,
  `archive`, `correct`, `reinforce`, `promote`)
- I did not find dedicated UI tests for the memory viewer page yet

## Known UI / debug notes

- `pnpm dev` watch restarts are currently a real debug hazard for heartbeat and
  memory verification. Local doc changes in `doc/DEVELOPING.md` now recommend
  `pnpm dev:once` as the stable verification path because touching `server/src`
  or imported workspace packages can orphan active runs.
- Local WIP also adds company-prefixed handling for the Memory route. The
  changes in `ui/src/components/Sidebar.tsx` and `ui/src/lib/company-routes.ts`
  suggest `/memory` was not fully aligned with the `/<companyPrefix>/...`
  routing model and is being corrected.
- Memory viewer UI is being modularized in the current tree. `MemoryViewer.tsx`
  now delegates filters, list items, detail display, and reflection cards into
  `ui/src/components/memory/`, which should make later governance actions
  easier to add without keeping the page monolithic.
- There are currently no open UI TypeScript errors from the checks I ran:
  `pnpm --filter @paperclipai/ui typecheck` passes, and `pnpm -r typecheck`
  also passes across the workspace. If someone expects active UI type errors,
  re-check against a different branch or earlier state.
- The main environment oddity right now is the port mismatch between config
  (`3101`) and this running agent session (`3102`). Because both health
  endpoints respond successfully, it is worth clarifying which server instance
  should be used for manual browser verification.

## Recommended next supervised steps

1. Decide whether `3101` or `3102` is the canonical local server for this
   worktree and remove the ambiguity before doing supervised browser QA.
2. Decide whether memory should remain read-mostly for now or whether the next
   implementation step is the board mutation/governance flow.
3. If memory work continues, verify `/<companyPrefix>/memory` manually using
   `pnpm dev:once` and confirm which actions are intentionally missing versus
   actually broken.
4. Add targeted UI coverage for the memory viewer once the intended governance
   behavior is locked down.
5. Update any stale plan/docs that still describe the memory viewer as missing;
   the viewer exists, and the remaining uncertainty is mostly around routing,
   mutation coverage, and test depth.

No tasks, agents, heartbeats, or company-structure changes were created from
this memo. This is only a local workspace bootstrap handoff.
