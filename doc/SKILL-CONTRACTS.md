# Skill Contracts

Skill Contracts turn an implicit behavior into a governed, verifiable company capability.

## Why this exists

Without contracts, capabilities are scattered across prompts, code paths, and memory.
With contracts, each capability is:

- named
- versioned
- bounded by allowed/forbidden actions
- backed by explicit verification evidence
- promotable, quarantinable, and rollbackable

## Contract format

Use JSON with schema version `v1`.

Core sections:

- `contract`: purpose, scope, guardrails, success/failure modes, rollback plan
- `primitives`: atomic required actions and their evidence markers
- `verify`: run IDs and marker requirements used for proof

## Runtime bridge (current)

The current explicit runtime bridge is issue-level opt-in via description metadata:

```text
verifiedSkill: ceo-native-issue-handoff-primitives
```

When present on an issue packet, the run path carries the skill in two places:

- wakeup/run context includes the requested capability ids and resolved verified skill refs
- the generated `paperclipTaskPrompt` injects a compact verified skill brief for the run

This is intentionally explicit and small.
It is not automatic skill discovery, a router, or retrieval.

Reference example:

- `company-hq/capabilities/ceo-native-issue-handoff-primitives.v1.json`
- `company-hq/capabilities/same-session-resume-after-post-tool-capacity.v1.json`

## CLI commands

Validate schema and structure:

```bash
pnpm paperclipai skill contract validate company-hq/capabilities/ceo-native-issue-handoff-primitives.v1.json
```

Validate with JSON output:

```bash
pnpm paperclipai skill contract validate company-hq/capabilities/ceo-native-issue-handoff-primitives.v1.json --json
```

List reusable skills before rediscovering a known path:

```bash
pnpm paperclipai skill contract list --maturity verified
```

Show the shortest operator reuse brief for one skill:

```bash
pnpm paperclipai skill contract use ceo-native-issue-handoff-primitives
```

Attach a verified skill explicitly to an issue packet:

```text
verifiedSkill: ceo-native-issue-handoff-primitives
```

Verify evidence against real heartbeat run logs:

```bash
pnpm paperclipai skill contract verify company-hq/capabilities/ceo-native-issue-handoff-primitives.v1.json
```

Verify with explicit API base and machine-readable output:

```bash
pnpm paperclipai skill contract verify company-hq/capabilities/ceo-native-issue-handoff-primitives.v1.json \
  --api-base http://127.0.0.1:3114 \
  --json
```

Verify all seeded contracts in one reusable pass:

```bash
pnpm paperclipai skill contract verify-all --api-base http://127.0.0.1:3114 --json
```

Use a custom contract directory:

```bash
pnpm paperclipai skill contract verify-all --dir company-hq/capabilities --api-base http://127.0.0.1:3114
```

## Verification model (current)

Current method: `heartbeat_run_log_markers`

Pass conditions:

- all required primitive marker sets are present in collected run evidence
- all explicit `requiredMarkers` are present
- evidence appears in at least `minDistinctRuns` runs

If verification fails, treat the capability as not promoted.

## Reuse proof rule (v1)

`v1` is considered reuse-capable only when the same CLI verify path can validate more than one contract without custom code.

`v1` becomes operationally useful when the same CLI surface also lets an operator or AI:

- list which verified skills already exist
- open one skill by capability id instead of rediscovering its file path
- copy the shortest reuse/verify path back into a real run

Current seeded contracts:

- `ceo-native-issue-handoff-primitives`
- `same-session-resume-after-post-tool-capacity`

## Suggested maturity flow

1. `draft`: contract authored, no proof
2. `verified`: contract passed bounded proof against real run evidence
3. `promoted`: verified and approved for reuse as a default path
4. `quarantined`: known regression; usage suspended
5. `deprecated`: retired capability

## Guardrail

Do not call a capability promoted by prose alone.
Promotion requires a contract + verify report tied to real evidence.
