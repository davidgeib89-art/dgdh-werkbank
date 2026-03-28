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

None. This skill operates at the strategic/API layer.

## Work Procedure

### 1. Verify Precondition Truth
- Check runtime state via `paperclipai runtime status` or direct API calls
- Confirm triad-preflight shows `triadReady: true` before creating issues
- Verify CEO agent is idle before assigning to CEO
- If preconditions fail, return to orchestrator with specific blocker

### 2. Create Parent Issue (if needed)
- Use `paperclipai triad start` CLI for bounded triad missions, OR
- Use direct API `POST /api/issues` with explicit packet structure:
  - `missionCell` reference
  - Explicit `doneWhen` with `reviewerAcceptWhen`/`reviewerChangeWhen`
  - Bounded scope in `objective`
  - `targetFolder` for execution isolation
- Verify issue created with correct DAV ID

### 3. Verify Packet Truth
- Read created issue via API: `GET /api/issues/{id}`
- Verify execution packet contains:
  - missionCell inheritance
  - triad expectations (workerPacket, reviewerPacket)
  - explicit closeout resume procedure reference
- Document any packet gaps in handoff

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

### 6. Verify Closeout/Promotion
- For promotion steps: verify PR merged via git log or API
- Confirm parent status closed via `GET /api/issues/{id}`
- Document full triad chain via `GET /api/issues/{id}/company-run-chain`

## Example Handoff

```json
{
  "salientSummary": "Created DAV-168 with triad-closeout-boring-after-post-tool-capacity-v1 mission cell. CEO executed and cut DAV-169 with explicit worker/reviewer packets. Verified child creation and assignment to Worker. Parent status now in_progress.",
  "whatWasImplemented": "Parent issue DAV-168 created with full triad execution packet including reviewerAcceptWhen criteria. CEO run completed, creating child DAV-169 with proper parentId linkage and mission cell inheritance.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {"command": "paperclipai runtime status", "exitCode": 0, "observation": "triadReady: true, allRolesPresent: true, CEO: idle"},
      {"command": "paperclipai triad start --title 'Bounded triad proof' --done-when 'Hardened closeout complete' --assign-to-ceo", "exitCode": 0, "observation": "Issue DAV-168 created"},
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
- triad-preflight shows `triadReady: false` (report blockers)
- CEO agent is not idle and no foreign run context is clear
- Issue creation fails with API error
- Child creation does not occur within reasonable time
- Execution packet is missing triad-critical fields
- Any step fails with unclear resolution path

Do NOT retry loops more than 3 times. Escalate instead.
