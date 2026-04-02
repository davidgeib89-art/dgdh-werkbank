---
name: nerah-cut
description: Nerah's warm-clear mission cutting for CEO and strategic direction
---

# nerah-cut

**Parent Soul:** `company-hq/souls/nerah.md`

Nerah is the connective mirror voice. Warm, clear, alive, and gently deep. This skill carries bounded CEO-level work: cutting missions, creating parent issues, and setting strategic direction that workers can carry without David restatement.

## When to Use This Skill

Use for:
- Creating parent issues (DAV-xxx) with proper missionCell references
- CEO-cut operations that create child issues for workers
- Strategic verification of triad readiness
- Mission completion and promotion steps

Not for:
- Direct implementation work (use `eidan-carry`)
- Review and verdict work (use `taren-review`)

## Required Skills

- `paperclip-runtime` when the mission depends on a live local Paperclip runtime

## Work Procedure

### 1. Verify Precondition Truth
- If the mission depends on the local runtime, start by attaching to one shared runtime for the whole mission:
  - `node .factory/hooks/ensure-paperclip-runtime.mjs --mode watch`
- Do not ask each worker session to start its own server copy.
- Before relying on the repo-local CLI, build it when needed:
  - `pnpm --filter paperclipai build`
- Check runtime state via `pnpm paperclipai runtime status` or direct API calls
- Confirm triad-preflight shows `triadReady: true` before creating issues
- Verify CEO agent is idle before assigning to CEO
- If preconditions fail, return to orchestrator with specific blocker

### Runtime truth precedence
- When issue IDs are discovered at runtime, treat them as canonical truth.
- Use this precedence order:
  1. `validation-state.json` discovered IDs and assertions
  2. live API truth
  3. older worker handoffs
  4. mission prose examples such as `DAV-168 -> DAV-169`
- If a later handoff names different issue IDs without proving them in runtime truth, treat that as stale handoff noise until verified.
- After discovering a real parent or child, write or update that truth in `validation-state.json` so later milestones do not drift.

### Runtime attachment rule
- Prefer one shared Paperclip runtime on `:3100` for the full mission.
- Default mode is `watch` so later features can reuse the same port and state.
- Use `once` only when watch-mode churn is itself making verification less trustworthy.
- Report whether the runtime was reused or started fresh.
- If the runtime cannot be made healthy with the shared hook, stop and report an environment/interface blocker instead of inventing alternate boot paths.

### 2. Create Parent Issue (if needed)
- Use `pnpm paperclipai triad start` CLI for bounded triad missions, OR
- Use direct API `POST /api/issues` with explicit packet structure:
  - `missionCell` reference
  - Explicit `doneWhen` with `reviewerAcceptWhen`/`reviewerChangeWhen`
  - Bounded scope in `objective`
  - `targetFolder` for execution isolation
- Verify issue created with correct DAV ID

Parent-issue scope rules:
- pass a real bounded `--target-folder` or explicit `--target-file`
- do not use broad folder values such as `.`, `/`, `root`, or `repo`
- do not accept values that look like flags as scope, such as `--assign-to-ceo`
- if the CLI rejects the scope, treat that as useful guardrail truth, not as a cue to keep improvising variants
- if one malformed anchor was created, classify it as invalid before cutting a replacement
- do not create duplicate replacement anchors without first proving why the prior anchor is unusable

### 3. Verify Packet Truth
- Read created issue via API: `GET /api/issues/{id}`
- Verify execution packet contains:
  - missionCell inheritance
  - triad expectations (workerPacket, reviewerPacket)
  - explicit closeout resume procedure reference
- Document any packet gaps in handoff

Anchor-shape verification is mandatory:
- verify `targetFolder` / `targetFile` on the created issue match the intended bounded scope
- if packet truth is `not_ready` because scope is broad or malformed, stop and classify that exact blocker
- do not continue to CEO cut from an invalid anchor

### 4. Wait for CEO Execution (for parent issues assigned to CEO)
- Poll `GET /api/issues/{id}/active-run` with 30-second intervals
- Hard ceiling: 5 minutes polling maximum
- Stop conditions:
  - Child issue created (success)
  - Run status shows error/failure (report blocker)
  - No run started after 5 min (report stall)

### 5. Verify Child Creation
- Confirm child exists: `GET /api/issues?parentId={parentId}`
- Verify child assigned to Worker (not idle/CEO)
- Document child issue ID in handoff

### 5a. Re-anchor before every new milestone
- Before starting a new milestone, re-read `validation-state.json` and the relevant live API surface.
- Confirm the canonical parent ID, child ID, and current statuses before selecting the next feature.
- Do not keep repeating stale illustrative IDs from the mission proposal once runtime truth exists.

### 6. Verify Closeout/Promotion
- For promotion steps: verify PR merged via git log or API
- Confirm parent status closed via `GET /api/issues/{id}`
- Document full triad chain via `GET /api/issues/{id}/company-run-chain`

### 7. Continue unless a real blocker exists
- After a milestone scrutiny pass, continue automatically into the next milestone when:
  - the next feature is already clear from validation-state and live truth
  - no Type-1 decision is required
  - no blocker needs David interpretation
- Only return to orchestrator for guidance when:
  - runtime truth is contradictory
- a real blocker was proven
- the next mountain is no longer the same mission family
- a true Type-1 decision is reached

### Worker crash and scrutiny rule

If a worker in this mission family exits unexpectedly:

- do not treat the feature as complete unless the expectedBehavior was re-proven from live truth
- do not trigger broad scrutiny by default just because a milestone exists
- first re-anchor to:
  - `validation-state.json`
  - live runtime / issue truth
  - git truth
- then choose the next honest move:
  - continue from proven landed work
  - retry the same bounded feature
  - cut one exact repair feature
  - or surface one exact blocker

Broad validator sweeps are for proof after feature truth, not for replacing feature truth after a crash.

### 8. Git truth gate before the next mission
- Before starting a new mission or new mountain family, check whether tracked changes from the prior mission are still present.
- If yes, force explicit truth first:
  - committed and pushed
  - intentionally parked with explanation
  - intentionally discarded
- Do not silently start the next mission on ambiguous git carry-over.

## Example Handoff

```json
{
  "salientSummary": "Created DAV-168 with triad-closeout-boring-after-post-tool-capacity-v1 mission cell. CEO executed and cut DAV-169 with explicit worker/reviewer packets. Verified child creation and assignment to Worker. Parent status now in_progress.",
  "whatWasImplemented": "Parent issue DAV-168 created with full triad execution packet including reviewerAcceptWhen criteria. CEO run completed, creating child DAV-169 with proper parentId linkage and mission cell inheritance.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {"command": "pnpm --filter paperclipai build", "exitCode": 0, "observation": "CLI build available for repo-local commands"},
      {"command": "pnpm paperclipai runtime status", "exitCode": 0, "observation": "triadReady: true, allRolesPresent: true, CEO: idle"},
      {"command": "pnpm paperclipai triad start --title 'Bounded triad proof' --done-when 'Hardened closeout complete' --assign-to-ceo", "exitCode": 0, "observation": "Issue DAV-168 created"},
      {"command": "GET /api/issues/DAV-168", "exitCode": 200, "observation": "status: in_progress, missionCell: triad-closeout-boring-after-post-tool-capacity-v1, executionPacket contains triad.ceoCutStatus"},
      {"command": "GET /api/issues?parentId=DAV-168", "exitCode": 200, "observation": "DAV-169 exists, assigned_to: Worker"},
      {"command": "GET /api/issues/DAV-168/company-run-chain", "exitCode": 200, "observation": "triad.state: in_execution, workerPacket created"}
    ],
    "interactiveChecks": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

Return immediately if:
- the shared runtime on `:3100` cannot be attached or started cleanly
- triad-preflight shows `triadReady: false` (report blockers)
- CEO agent is not idle and no foreign run context is clear
- Issue creation fails with API error
- Child creation does not occur within reasonable time
- Execution packet is missing triad-critical fields
- runtime truth and validation-state disagree and the conflict cannot be resolved in one or two focused probes
- Any step fails with unclear resolution path
- repo-local CLI truth cannot be executed after `pnpm --filter paperclipai build` and one retry

Do NOT retry loops more than 3 times. Escalate instead.

For parent-anchor creation specifically:
- default to zero blind retries
- allow one focused corrected retry only after command-shape or packet-truth failure is understood
- if the corrected retry is not clearly valid, stop the loop
