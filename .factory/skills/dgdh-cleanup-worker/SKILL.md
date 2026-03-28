---
name: dgdh-cleanup-worker
description: Worker for DGDH company cleanup, audit, verification, and reflection tasks
---

# DGDH Cleanup Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

This skill handles:
- Runtime state audit (companies, agents, issues, projects, runs)
- Filesystem audit (.tmp/, doc/, root artifacts)
- Classification reports (keep/archive/delete decisions)
- Filesystem cleanup execution
- Database cleanup via API/CLI
- Startup verification (API health, triad preflight, CLI status)
- Sanity proof (test issue creation, triad readiness)
- Bounded triad proof (monitoring CEO/Worker/Reviewer loop)
- Reflection documentation

## Required Skills

**None.** This worker uses direct CLI commands and API calls. No specialized skills required.

## Operating guardrails

### Windows / PowerShell truth

- This repo runs on Windows PowerShell. Do not assume Unix shell helpers exist.
- Do not use `head`, `find`, `du`, `wc`, `xargs`, or `curl -sf` in PowerShell.
- Prefer:
  - `Invoke-RestMethod` or short Python scripts for API reads
  - `Get-ChildItem` for filesystem inventory
  - `Measure-Object` for counts
  - `Test-Path` before reading files you expect to exist

### Runtime audit truth

- For runtime/company audit features, prefer existing Paperclip API and CLI truth surfaces first.
- Do not use browser automation for simple runtime inventory.
- Do not spawn subagents for basic API fetches or file inventory unless the parent worker is truly blocked.
- Do not widen into repo/doc cleanup during runtime-state audit. Finish the audit first.

### No fabrication

- Never emit simulated, invented, or placeholder audit results.
- If a report file does not exist, do not pretend it exists. Create it or return to orchestrator with the blocker.
- If an API call, file read, or command fails twice for the same reason, stop retrying the same broken step and either switch to a smaller truthful method or return with a failure/partial handoff.

### Git / verification order

- For M1 audit features, do not run full-workspace typecheck or attempt commits before the audit report actually exists.
- First produce the audit artifacts and the structured report.
- Then run only the narrow verification needed for that feature.
- Only check git truth after the report exists and the feature has something real to hand off.

## Work Procedure

### For Audit Features (M1-F1, M1-F2, M1-F3)

1. **Start server if needed:** `pnpm dev:server` (verify port 3100)
2. **Execute API calls:** Use `Invoke-RestMethod` or a small Python script to get runtime state
   - Companies: `GET /api/companies`
   - Agents: `GET /api/agents?companyId=...`
   - Issues: `GET /api/issues?companyId=...&status=...`
   - Projects: `GET /api/projects?companyId=...`
   - Heartbeat runs: `GET /api/heartbeat-runs?companyId=...`
3. **Execute filesystem inventory:** Use PowerShell-native commands
   - `.tmp/` contents
   - `doc/archive/`, `doc/backlog/`
   - Root JSON files
4. **Produce structured reports:** Write markdown files with findings
5. **Verify report exists:** `Test-Path audit-output/runtime-state-audit-report.md`
6. **Run only narrow verification:** CLI/API checks relevant to the audit feature
7. **Commit reports only if explicitly requested by mission closeout truth**

### For Cleanup Features (M2-F4 through M2-F8)

1. **Verify classification approved:** Ensure M1-F3 report exists and is approved
2. **Backup before delete:** For uncertain items, archive before deletion
3. **Execute filesystem cleanup:**
   - `mv .tmp/revenue-image-pipeline-* company-hq/archive/tmp-pipelines/`
   - `mv doc/archive/* company-hq/archive/docs/`
   - `mv doc/backlog/* company-hq/archive/backlog/`
   - `mv *.json company-hq/archive/root-artifacts/` (selectively)
4. **Execute CLI cleanup:**
   - `pnpm paperclipai issue archive-stale --company-id <id> --older-than 30`
5. **Verify cleanup:** Re-run inventory commands, compare before/after
6. **Document results:** Write cleanup summary report
7. **Commit changes:** Stage and commit with clear message

### For Startup Verification (M3-F9, M3-F10, M3-F11)

1. **Start server:** `pnpm dev:server` on port 3100
2. **Wait for health:** `curl http://localhost:3100/api/health`
3. **Verify health response:** Check `status: healthy`, `seedStatus.dgdhCompanyFound: true`
4. **Triad preflight:** `curl http://localhost:3100/api/companies/<id>/agents/triad-preflight`
5. **Verify triad response:** Check `triadReady: true`, `allRolesPresent: true`, `allAgentsIdle: true`
6. **CLI status:** `pnpm paperclipai runtime status`
7. **Document results:** Capture all command outputs
8. **Commit verification report**

### For Sanity Proof (M4-F12, M4-F13)

1. **Create test issue:** `pnpm paperclipai issue create --company-id <id> --project-id <id> --title "Sanity Test"`
2. **Capture issue ID:** Store for verification
3. **Check triad preflight:** Verify ready for the company
4. **Check for queue interference:** `GET /api/heartbeat-runs?companyId=<id>&status=queued`
5. **Verify no pending runs:** Ensure queue is clear
6. **Clean up test issue:** Archive or delete after verification
7. **Document results**
8. **Commit verification report**

### For Bounded Triad Proof (M4-F14, M4-F15)

1. **Create parent issue:** `pnpm paperclipai triad start --title "Cleanup Proof" --objective "Verify triad works after cleanup" --done-when "PR merged" --target-folder "doc/test-proof" --assign-to-ceo --company-id <id>`
2. **Capture parent issue ID:** Store for monitoring
3. **Poll company-run-chain:**
   - `GET /api/issues/<parent-id>/company-run-chain`
   - Poll every 30 seconds
   - Max wait: 10 minutes
4. **Verify phases sequentially:**
   - Parent execution started
   - Child created
   - Worker assigned
   - Worker run started
   - Worker done (PR created)
   - Reviewer assigned
   - Reviewer run started
   - Reviewer verdict recorded
   - Merged (if accepted)
5. **Check for closeout success:** Verify `worker-pr`, `worker-done`, `reviewer-verdict` all recorded
6. **Document full chain:** Capture all API responses
7. **Write proof report:** Document that triad carried without manual rescue
8. **Commit proof report**

### For Reflection Features (M5-F16 through M5-F20)

1. **Review all previous milestones:** Read completed feature handoffs
2. **Extract key learnings:**
   - What was cleaned (specific items, counts)
   - What became autonomous (new self-carrying behaviors)
   - David dependencies (what still needs human)
   - Harness learning (one key improvement)
3. **Identify next mountain:** Based on proof results, what's the next bounded mission
4. **Write reflection.md:** Structured sections for each reflection area
5. **Commit reflection:** Stage and commit with clear message

## Example Handoff

```json
{
  "salientSummary": "Audited runtime state: 1 company, 3 agents (ceo/worker/reviewer all idle), 47 issues (12 todo, 8 in_progress, 27 done), 5 projects. Archived 89 stale .tmp/ directories and 6 old doc/archive/ files. Runtime now clean and triad-ready.",
  "whatWasImplemented": "Completed full runtime audit via API and filesystem inventory. Enumerated all companies, agents, issues, projects, and heartbeat runs. Classified .tmp/ contents (89 stale pipeline directories), doc/archive/ (6 old docs), doc/backlog/ (8 speculative items), and root JSON artifacts (4 benchmark files). Executed cleanup: moved stale content to company-hq/archive/, archived 23 old issues via CLI. Verified startup: API health passes, triad preflight shows all roles present and ready.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "curl http://localhost:3100/api/health",
        "exitCode": 0,
        "observation": "Returns {status: 'healthy', seedStatus: {dgdhCompanyFound: true, agentRolesFound: ['ceo', 'worker', 'reviewer']}}"
      },
      {
        "command": "curl http://localhost:3100/api/companies/44850e08-61ce-44de-8ccd-b645c1f292be/agents/triad-preflight",
        "exitCode": 0,
        "observation": "Returns {triadReady: true, allRolesPresent: true, allAgentsIdle: true, roles: [...], blockers: []}"
      },
      {
        "command": "ls -la .tmp/ | wc -l",
        "exitCode": 0,
        "observation": "Before: 94 entries, After: 2 entries (reduced by 92)"
      },
      {
        "command": "pnpm paperclipai issue archive-stale --company-id 44850e08-61ce-44de-8ccd-b645c1f292be --older-than 30",
        "exitCode": 0,
        "observation": "Archived 23 stale issues"
      }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

**Standard return conditions:**
- Feature completed successfully (successState: "success")
- Feature failed but reason is clear (successState: "failure")
- Partial completion with known gaps (successState: "partial")

**Must return to orchestrator:**
- Cleanup would touch protected core (.paperclip/worktrees/, core infrastructure)
- Database access needed but credentials not available
- API server fails to start or health check fails
- Triad preflight shows missing roles or agents not idle
- Triad proof stalls for >10 minutes without progress
- Git state becomes ambiguous (untracked changes, merge conflicts)
- Uncertainty about whether an item is safe to delete
- You are about to report simulated or invented output instead of real tool evidence
- A required report file still does not exist after the data-fetching step completed
