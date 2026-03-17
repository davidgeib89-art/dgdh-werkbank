# Validation Safety Policy

## Purpose

Governance-, Runtime-, and Heartbeat-validation must never consume real model tokens or trigger productive agent execution.

## Hard Rules

1. No live E2E validation against productive agents.
2. No test harness may call `adapter.execute` against a real adapter.
3. Governance validation must use only mock, dry-run, or explicitly test-only adapter paths.
4. Productive worker lanes and active agents are not test targets.
5. If a validation path cannot prove that `adapter.execute` is blocked, it is not an approved test path.

## Approved Test Modes

- Helper/unit validation via pure functions.
- Dry-run heartbeat runs marked with `executionMode: "dry_run"` or `isTestRun: true`.
- Test-server execution with `GOVERNANCE_TEST_MODE=true`, which hard-blocks `adapter.execute` for that process.
- Disposable dummy/test agents, separated from productive agents by purpose and naming.

## Forbidden Patterns

- Seeding `heartbeat_runs` or `agent_wakeup_requests` for a productive agent and letting the normal scheduler execute them.
- Hitting live wakeup endpoints for productive agents when the resulting run can reach a real adapter.
- Reusing productive Gemini, Claude, Codex, or other active operator lanes as validation targets.
- Assuming cancellation is safe after execution has already started.

## Required Safeguards

- Test runs must be explicitly marked as dry-run/test-run.
- The server must stop before `adapter.execute` whenever a run is marked as a test run.
- A dedicated test server may additionally enforce `GOVERNANCE_TEST_MODE=true` so every run in that process is adapter-blocked.
- Test harnesses must default to dummy/test agents and must not default to productive agent IDs.

## Incident Lesson

The prior governance E2E harness created real automation runs for a productive worker lane. Some runs reached real execution and consumed tokens before they were cancelled. Cancellation after start is not a safety control.
