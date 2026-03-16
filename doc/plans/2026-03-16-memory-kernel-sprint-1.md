# Sprint 1: Memory Kernel (2026-03-16)

## Team Start Profile Standard

Canonical repo:

- C:/Users/holyd/DGDH/repos/paperclip-main

Implementation worktree for this sprint:

- C:/Users/holyd/DGDH/worktrees/paperclip-codex

Legacy repo policy:

- C:/Users/holyd/paperclip is archived as C:/Users/holyd/paperclip-legacy-readonly
- Do not run dev commands from the legacy path

Team start command profile (PowerShell):

```powershell
Set-Location C:/Users/holyd/DGDH/repos/paperclip-main
$env:PAPERCLIP_HOME = "$HOME/.paperclip-worktrees"
$env:PAPERCLIP_INSTANCE_ID = "master"
$env:PAPERCLIP_PORT = "3101"
pnpm dev
```

This profile standardizes:

- instance id: master
- app port: 3101
- isolated home root: ~/.paperclip-worktrees

## Why This Architecture

The Memory Kernel is intentionally small and composable:

1. Shared type layer (`packages/shared`) defines stable contracts.
2. DB layer (`packages/db`) persists structured memory rows.
3. Server service layer provides a `MemoryStore` abstraction.
4. Heartbeat integration only injects context and records outcomes.

This keeps current agent execution behavior stable while preparing retrieval/reflection capabilities.

## Scope and Kinds

Implemented scopes:

- personal
- company
- project
- social

Implemented kinds:

- fact
- episode
- lesson
- decision
- policy
- preference
- relationship
- skill

## Persistence Strategy

- New table: `memory_items`
- Retrieval now uses indexed filters + simple text matching (`summary`, `detail`, `tags`)
- No vector dependency in Sprint 1

This gives deterministic storage/retrieval with a clean upgrade path to semantic retrieval later.

## Reflection Hook (Prepared)

Prepared output contract:

```ts
type ReflectionOutput = {
  personal: MemoryItem[];
  company: MemoryItem[];
  project: MemoryItem[];
  social: MemoryItem[];
  discard: string[];
};
```

In Sprint 1, reflection is represented as `reflection-preview` assembly logic only.
Full reflective generation/scoring remains a Sprint 2+ concern.

## Integration Points Added

Before agent task execution:

- Heartbeat wake/enqueue path can hydrate contextual memory slices into run context.

After agent task execution:

- Heartbeat finalize path can persist an `episode` memory for run outcomes.

Both integrations are fail-open (memory failures do not block task execution).

## Future Adapter Path (MemOS/Mem0)

`MemoryStore` is the boundary for future adapters.
A future adapter can replace retrieval/scoring internals while preserving:

- `add`
- `search`
- `reinforce`
- `correct`

This avoids coupling core orchestration to a specific memory framework.
