# Validation Contract: Second Live Triad Proof

**Mission:** Prove the second bounded triad loop (DAV-168 → DAV-169) with hardened closeout path  
**Mission Cell:** triad-closeout-boring-after-post-tool-capacity-v1  
**Company:** David Geib Digitales Handwerk (44850e08-61ce-44de-8ccd-b645c1f292be)

---

## Area: Foundation

### VAL-FOUNDATION-001: Triad preflight shows ready
`GET /api/companies/:id/agents/triad-preflight` returns `triadReady: true`, `allRolesPresent: true`, `allAgentsIdle: true`.
**Evidence:** API response JSON showing triadReady=true with no blockers.

### VAL-FOUNDATION-002: DAV-168 created with mission cell
Issue DAV-168 exists with `missionCell: triad-closeout-boring-after-post-tool-capacity-v1`, status=todo, assigned_to=CEO.
**Evidence:** GET /api/issues/DAV-168 response with missionCell field populated.

### VAL-FOUNDATION-003: DAV-168 packet contains triad expectations
Execution packet contains `triad.ceoCutStatus`, explicit `workerPacket` and `reviewerPacket` definitions.
**Evidence:** GET /api/issues/DAV-168/execution-packet or company-run-chain showing triad structure.

---

## Area: CEO Cut

### VAL-CUT-001: CEO creates child DAV-169
CEO execution of DAV-168 produces child issue DAV-169 with `parentId: DAV-168`.
**Evidence:** GET /api/issues?parentId=DAV-168 returns DAV-169, or company-run-chain shows child creation.

### VAL-CUT-002: DAV-169 assigned to Worker
DAV-169 has `assigned_to: Worker` after CEO cut.
**Evidence:** GET /api/issues/DAV-169 response showing assigned_to field.

### VAL-CUT-003: DAV-169 inherits mission cell
DAV-169 execution packet contains inherited missionCell reference and bounded scope.
**Evidence:** GET /api/issues/DAV-169/execution-packet showing missionCell and doneWhen criteria.

---

## Area: Worker Execution

### VAL-WORKER-001: Worker produces git truth
Worker execution creates isolated git branch with reviewable commits.
**Evidence:** Git log shows branch dgdh/issue-DAV-169-* with commits on origin.

### VAL-WORKER-002: Worker calls worker-pr
Worker successfully calls `worker-pr` API, creating PR with explicit URL.
**Evidence:** GET /api/issues/DAV-169 shows `worker_pull_request_created: true` with prUrl.

### VAL-WORKER-003: Worker calls worker-done
Worker successfully calls `worker-done` API with branch, commit, PR URL, summary.
**Evidence:** GET /api/issues/DAV-169 shows `worker_done_recorded: true`, status transitions to in_review.

### VAL-WORKER-004: Status in_review with reviewer assigned
DAV-169 status is `in_review` and `assigned_to: Reviewer`.
**Evidence:** GET /api/issues/DAV-169 response.

---

## Area: Reviewer Verdict

### VAL-REVIEWER-001: Reviewer receives assignment
Reviewer agent is assigned or woken for DAV-169.
**Evidence:** GET /api/issues/DAV-169/active-run shows reviewer-assigned run starting.

### VAL-REVIEWER-002: Reviewer reads handoff evidence
Reviewer execution reads worker result, PR, and commits.
**Evidence:** Heartbeat run log shows handoff read operation.

### VAL-REVIEWER-003: Reviewer submits explicit verdict
Reviewer calls `reviewer-verdict` API with `verdict: accepted` or `changes_requested`.
**Evidence:** POST /api/issues/DAV-169/reviewer-verdict returns 200, GET shows reviewerVerdict field.

### VAL-REVIEWER-004: Verdict contains reasoning
reviewerVerdict includes explicit `reasoning` field with substantive explanation.
**Evidence:** GET /api/issues/DAV-169 shows reviewerVerdict.reasoning is non-empty string.

---

## Area: Promotion

### VAL-PROMOTION-001: CEO merges PR to main
CEO execution merges PR to origin/main.
**Evidence:** Git log origin/main shows merge commit from PR, GitHub shows merged state.

### VAL-PROMOTION-002: DAV-169 status closed
DAV-169 status transitions to `closed` after merge.
**Evidence:** GET /api/issues/DAV-169 shows status=closed.

### VAL-PROMOTION-003: DAV-168 status closed
DAV-168 status transitions to `closed` after child promotion.
**Evidence:** GET /api/issues/DAV-168 shows status=closed.

### VAL-PROMOTION-004: Reduced manual rescue
The DAV-168/DAV-169 loop required less manual lane rescue than DAV-165/DAV-166.
**Evidence:** Documented comparison of manual interventions (rescue commands, David restatement, foreign run blocking) between loops. CEO queue was cleared without David intervention.

---

## Cross-Area Flows

### VAL-CROSS-001: Full triad state visible
company-run-chain shows complete triad progression: ready_to_build → in_execution → ready_for_review → ready_to_promote → closed.
**Evidence:** GET /api/issues/DAV-168/company-run-chain shows complete state chain.

### VAL-CROSS-002: Closeout blocker visible if deferred
If post_tool_capacity_exhausted occurs, triad.closeoutBlocker is explicitly visible in runtime.
**Evidence:** company-run-chain shows closeoutBlocker with resumePoint and nextPoint.

### VAL-CROSS-003: Hardened resume path
Deferred runs resume via scheduler with sameSessionPath=true and resumeSource=scheduler.
**Evidence:** resume run shows sameSessionPath=true, resumeSource=scheduler in run context.
