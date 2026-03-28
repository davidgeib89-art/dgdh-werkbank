# Architecture

## Mission Autonomy Architecture

**Mission Cells:** The bounded execution container for self-improvement missions.

**Location:** `company-hq/mission-cells/*.json`

**Key Mission Cells:**
- `triad-mission-loop-v1.json` - Core triad loop definition
- `triad-closeout-boring-after-post-tool-capacity-v1.json` - Hardened closeout
- `mission-cell-starter-path-v1.json` - Generic mission starter

## Triad Role Architecture

**CEO (Chief Executive Officer):**
- Cuts missions into bounded child issues
- Makes Type-1 decisions (main, deploy, secrets)
- Aggregates results and promotes

**Worker (Eidan pattern):**
- Executes bounded implementation
- Produces git/PR truth
- Handles closeout via worker-pr/worker-done

**Reviewer (Taren pattern):**
- Verifies execution quality
- Gives explicit verdict (accepted/changes_requested)
- Gates promotion

## Closeout Path Hardening

**post_tool_capacity_exhausted:**
- Run finalizes with errorCode and deferredState
- Resume point explicitly set
- Scheduler resumes with sameSessionPath=true

**Commands:**
- `paperclipai issue worker-pr` - Create PR
- `paperclipai issue worker-done` - Worker completion
- `paperclipai issue reviewer-verdict` - Reviewer verdict
- `paperclipai triad rescue` - Rescue stalled closeouts

## Runtime Bridge

**Issue Description Packet:**
- `missionCell: <id>` - Binds issue to mission cell
- `verifiedSkill: <id>` - Binds issue to capability
- Execution context injected into paperclipTaskPrompt

**Wakeup Context:**
- `resume_existing_session_worker_closeout` - Worker resume
- `resume_existing_session_reviewer_verdict` - Reviewer resume
