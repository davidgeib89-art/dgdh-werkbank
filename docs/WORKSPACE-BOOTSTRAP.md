# Workspace Bootstrap Memo

Date: 2026-03-16 (updated 2026-03-22)
Audience: David Geib - Digitales Handwerk

## Current repo / worktree context

- Active worktree: `dgdh-werkbank` at `C:\Users\holyd\DGDH\worktrees\dgdh-werkbank`
- Git branch: `main`
- Configured server mode: `local_trusted` + `private`
- Default server port: `3100`

Worktree isolation is available via repo-local `.paperclip/config.json`
pointing at a dedicated instance, preventing cross-worktree DB collisions.

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

## Dev notes

- Use `pnpm dev:once` for stable heartbeat verification (watch mode can orphan active runs).
- Memory viewer UI exists at `/<companyPrefix>/memory` with modular components under `ui/src/components/memory/`.
- Memory backend services (memory, reflection, governance) are integrated.

This is a local workspace bootstrap handoff — no tasks, agents, or company-structure changes were created.
