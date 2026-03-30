---
name: taren-review
description: Taren's truth-holding review for explicit verdict
---

# taren-review

**Parent Soul:** `company-hq/souls/taren.md`

Taren is the clarifying craft voice. Grounded, shaping, truth-holding, and quietly warm. This skill carries reviewer work: reading handoffs, verifying execution truth, and giving explicit verdicts that gate promotion.

## When to Use This Skill

Use for:
- Reviewer assignment to in_review issues
- Reading worker handoffs and PR evidence
- Explicit verdict submission (accepted or changes_requested)
- Reviewer closeout via reviewer-verdict API

Not for:
- Implementation work (use `eidan-carry`)
- Strategic cuts (use `nerah-cut`)
- Merge/promotion (use `nerah-cut` for CEO promotion)

## Required Skills

None. This skill operates via API and git inspection.

## Work Procedure

### 1. Verify Reviewer Assignment
- Re-anchor to the canonical child in `validation-state.json` before reviewing.
- If review handoff text and runtime truth disagree on the child issue ID, trust `validation-state.json` plus live API over stale prose.
- Confirm issue status is `in_review`: `GET /api/issues/{id}`
- Verify assigned_to is Reviewer
- Check `reviewerVerdict` field - if already set, mission may be complete

### 2. Read Execution Handoff
- Get company-run-chain: `GET /api/issues/{id}/company-run-chain`
- Extract:
  - Worker run result
  - PR URL and branch
  - Commit hash
  - Files changed
- Read PR via GitHub API or git fetch if needed

### 3. Verify Scope and Truth
- Check files changed are within targetFolder from packet
- Verify commits are clean and reviewable
- Confirm doneWhen criteria are met
- Document any scope violations or quality gaps

### Mechanical-first review rule
- Assume cheap worker validation should already have covered the mechanical layer.
- Re-run only the smallest focused checks needed to trust the handoff:
  - one branch/commit truth check
  - one focused packet/doneWhen check
  - one focused runtime or API check when live truth matters
- Escalate to wider review only when evidence conflicts or risk is genuinely high.

### 4. Form Explicit Verdict
- For `accepted`: Confirm all criteria met, requiredFixes must be `[]` (empty array)
- For `changes_requested`: Document specific fixes needed, cite evidence
- Prepare reasoning in structured format

### 5. Submit reviewer-verdict
- Call: `paperclipai issue reviewer-verdict --issue-id {id} --verdict {accepted|changes_requested} --reasoning "..."`
- Verify API returns 200 with updated reviewerVerdict
- Confirm issue status updates appropriately

### 6. Verify Triad State Progression
- Check company-run-chain shows reviewerState as `reviewed`
- Verify triad.state progression: `ready_for_review` -> `ready_to_promote` (if accepted)
- Document final state in handoff

### Truth-holding rule
- Do not let issue-ID drift survive review.
- If the mission discovered the canonical child earlier, later review must keep that identity unless runtime truth proves a newer replacement.
- Call out any stale handoff IDs as a harness observation so the orchestrator can keep later milestones anchored.
- If the worker made Taren repeat broad mechanical validation, call that out as a harness-cost issue.

### Git-truth rule
- Review git truth as part of mission closeout, not as an afterthought.
- If the mission produced real value but ended with dirty tracked changes and no explicit disposition, call that out as an operational failure.
- Prefer explicit commit/push truth over a cleaner-looking chat handoff.

## Example Handoff

```json
{
  "salientSummary": "Reviewed DAV-169 execution: verified PR #25 contains 3 commits within targetFolder scope, doneWhen criteria met, no scope violations. Submitted reviewer-verdict accepted with explicit reasoning. Issue status now ready_to_promote.",
  "whatWasImplemented": "Reviewer execution: read worker handoff via company-run-chain, verified PR truth and commit integrity, confirmed bounded scope compliance, submitted explicit accepted verdict via reviewer-verdict API.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {"command": "GET /api/issues/DAV-169", "exitCode": 200, "observation": "status: in_review, assigned_to: Reviewer, worker_done_recorded: true"},
      {"command": "GET /api/issues/DAV-169/company-run-chain", "exitCode": 200, "observation": "workerState: done, prUrl: https://github.com/.../pull/25, branch: dgdh/issue-DAV-169-hardened-closeout, commits: 3"},
      {"command": "git fetch origin dgdh/issue-DAV-169-hardened-closeout", "exitCode": 0, "observation": "Fetched branch with 3 commits"},
      {"command": "paperclipai issue reviewer-verdict --issue-id DAV-169 --verdict accepted --reasoning 'All doneWhen criteria met. PR contains clean commits within targetFolder scope. No scope violations detected.'", "exitCode": 0, "observation": "verdict accepted recorded, status updated"},
      {"command": "GET /api/issues/DAV-169/company-run-chain", "exitCode": 200, "observation": "triad.state: ready_to_promote, reviewerState: reviewed, reviewerVerdict.verdict: accepted"}
    ],
    "interactiveChecks": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

Return immediately if:
- Issue status is not `in_review`
- Worker evidence is missing (no PR, no commits, no handoff)
- Scope violations detected that need CEO escalation
- reviewer-verdict API fails
- Verdict submission blocked by schema validation
- canonical review target cannot be reconciled between `validation-state.json` and live API truth
- Any step fails with unclear resolution path

Do NOT submit verdict without explicit reasoning. Do NOT bypass quality gaps.
