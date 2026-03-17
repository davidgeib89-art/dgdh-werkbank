# Governance Test Safety

## Why This Exists

An earlier governance E2E harness seeded live automation runs for a productive agent. That was enough to reach real adapter execution and consume tokens. The safe replacement is a dry-run path that never calls `adapter.execute`.

## Risky Paths Today

The following paths are inherently risky if they target productive agents without dry-run safeguards:

1. `heartbeat.wakeup(...)` for `automation`, `timer`, or `assignment` when the resulting run is allowed to execute normally.
2. Direct inserts into `heartbeat_runs` or `agent_wakeup_requests` followed by the normal scheduler.
3. Any harness that relies on cancelling runs after queueing them.
4. Any validation path that uses a real adapter module instead of a dry-run or mock result.

## Implemented Safeguards

### 1. Test-run markers

The heartbeat runtime now treats these as explicit non-live execution signals:

- `executionMode: "dry_run"`
- `isTestRun: true`
- `dryRun: true`
- `governanceTest: true`

### 2. Hard stop before adapter execution

When a run is marked as a test run, the heartbeat service returns a synthetic dry-run adapter result instead of calling `adapter.execute`.

This means governance validation can still exercise:

- work-packet enforcement
- phase checkpoint enforcement
- budget hard-cap handling

without any model call.

### 3. Process-wide safety mode

If the server process is started with `GOVERNANCE_TEST_MODE=true`, the same hard stop applies even when the run itself was not explicitly marked.

Use this only for dedicated validation processes. Do not enable it on the main productive server process.

## Safe Validation Strategy

Use one of these paths only:

1. Pure helper validation with `evaluateGovernanceDryRunValidation(...)`.
2. Dry-run heartbeat invocations with `executionMode: "dry_run"` and `isTestRun: true`.
3. A dedicated test server process with `GOVERNANCE_TEST_MODE=true`.

## Productive vs Test Agents

Keep these categories separate:

- Productive agents: Builder-Codex, real company operators, any agent expected to do real work.
- Test agents: disposable dummy agents created only for validation.

Rules:

1. Test harnesses must never default to a productive agent ID.
2. If a test needs an agent identity at all, use a dummy/test agent.
3. Builder-Codex must not be used as a governance validation target.

## Safe Validator

Use the token-free validator at `server/sandbox/governance-dry-run-validate.ts`.

It covers:

1. missing work packet
2. missing phase checkpoint
3. hard token cap reached
4. valid minimal dry-run

It is intentionally pure and does not talk to the API, DB, scheduler, or adapters.

## Operational Guidance

If you need deeper integration coverage later, build it on top of a mock adapter or a dedicated test-only adapter. Do not reintroduce a live harness that seeds normal heartbeat runs for productive agents.