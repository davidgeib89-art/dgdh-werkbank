# Sprint 3b: Memory Viewer / Debug-Board (2026-03-16)

## Status Clarification

Sprint 3b is not fully implemented yet.

Current state:

- Backend API foundation exists (viewer, viewer stats, reflection, promote, approve/reject/archive, retrieval trace).
- No dedicated UI page/route exists for a memory viewer or debug board.
- No UI API client for memory/governance endpoints exists.
- No end-to-end interaction flow for promote/correct/reinforce from the board exists.

Conclusion:

- Sprint 3a (Governance API + service wiring): done.
- Sprint 3b (Memory Viewer / Debug-Board UI): open.

## Sprint 3b Goal

Deliver an operator-facing board that makes memory state visible and actionable, with clear scope separation:

- company
- project
- personal
- social

## Required Capabilities

1. Overview of all memories

- Paginated table/list over governed memory items.
- Include governance fields (approval status, owner, archived, approvedBy/At).

2. Filtering

- scope, kind, agent, project.
- approval status and archived toggle.
- free-text query.

3. Reflection candidate visibility

- Run reflection for selected agent/project context.
- Show candidate list with reasons and source memory IDs.

4. Actions visible + usable

- promote selected reflection candidates.
- correct existing memory item fields.
- reinforce memory item importance/confidence.
- approve/reject/archive governance actions.

5. Clear scope separation

- Primary tabs: all, company, project, personal, social.
- Scope badges/colors in rows and detail panel.

## API Mapping (already available)

- GET /api/companies/:companyId/memory/viewer
- GET /api/companies/:companyId/memory/viewer/stats
- GET /api/companies/:companyId/memory/retrieval-trace
- POST /api/companies/:companyId/memory/reflect
- POST /api/companies/:companyId/memory/reflect/promote
- PATCH /api/companies/:companyId/memory/:memoryId
- POST /api/companies/:companyId/memory/:memoryId/reinforce
- POST /api/companies/:companyId/memory/:memoryId/approve
- POST /api/companies/:companyId/memory/:memoryId/reject
- POST /api/companies/:companyId/memory/:memoryId/archive

## Implementation Plan

Phase 1: UI data layer

- Add ui/src/api/memory.ts:

  - listViewer(filter)
  - getViewerStats()
  - getRetrievalTrace(params)
  - runReflection(input)
  - promoteReflection(input)
  - correctMemory(memoryId, patch)
  - reinforceMemory(memoryId)
  - approveMemory(memoryId, approvedBy)
  - rejectMemory(memoryId, reason)
  - archiveMemory(memoryId)

- Add query keys in ui/src/lib/queryKeys.ts for memory viewer data.

Phase 2: Page + route

- Add ui/src/pages/MemoryViewer.tsx.
- Add route in ui/src/App.tsx, example path:
  - /:companyPrefix/memory
- Add sidebar/nav entry near operations pages.

Phase 3: UX composition

- Top bar: scope tabs + filters.
- Left panel: memory list/table.
- Right panel: selected memory detail + actions.
- Secondary panel/section: reflection candidates and promote flow.
- Retrieval trace drawer (agent/project/text + preview by scope).

Phase 4: Mutations and optimistic refresh

- Wire mutations for promote/correct/reinforce and governance actions.
- Invalidate viewer/stats/trace queries after writes.
- Add clear error toasts for validation and permission failures.

Phase 5: Testing

- Unit tests for API client helpers.
- Component tests for filter state and action dispatch.
- Smoke test: create -> view -> correct -> reinforce -> reflect -> promote -> approve.

## Acceptance Criteria

1. User can list all memories with pagination and see governance metadata.
2. User can filter by scope/kind/agent/project and full-text.
3. User can inspect reflection candidates and promote selected items.
4. User can perform correct and reinforce on existing memories.
5. User sees clear separation of company/project/personal/social contexts.
6. User can execute governance actions (approve/reject/archive) from the board.
7. Retrieval trace can be requested and interpreted per scope before runs.

## Out of Scope for Sprint 3b

- Automated promotion without explicit user action.
- New semantic/vector retrieval implementation.
- Role/permission model redesign beyond current API auth checks.
