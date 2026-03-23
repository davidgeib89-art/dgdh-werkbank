# Scope-Firewall Code (Option B)

Status: Backlog
Owner: Codex/Planner

## Goal

Add an engine-level scope firewall that automatically blocks Worker completion when file changes leave `targetFolder`.

## Trigger (activation rule)

Activate this backlog item when either condition is met:

1. One real scope violation is documented in a production-like run.
2. Reviewer reports scope drift in two consecutive runs.

## Planned behavior

- Parse changed files from Worker run evidence.
- Compare each changed file against packet `targetFolder`.
- If any file is outside `targetFolder`:
  - Force issue status to `blocked` (never `done`/`in_review` via implicit path).
  - Emit explicit activity log event with offending paths.
  - Require a corrected Worker re-run.

## Out of scope for Option B

- No DAG orchestration.
- No auto-merge logic.
- No reviewer-flow redesign.
