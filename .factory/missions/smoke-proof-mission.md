# Mission: Mission-Control Smoke Proof

## Purpose
Prove that Factory Mission Control itself is working again in this repo with the DGDH harness.

## Goal
Prove that a minimal mission can:
1. Create valid mission artifacts
2. Start successfully with StartMissionRun
3. Create real mission state
4. Execute at least one real feature through the mission runner
5. Close honestly without falling back into chat-mode orchestration

## Success Criteria
- features.json is valid and non-empty
- StartMissionRun succeeds
- state.json is created
- progress_log.jsonl advances beyond mission_accepted
- At least one feature runs through the actual mission system
- No chat improvisation is used as substitute

## Hard Rule
If StartMissionRun fails, stop and diagnose the exact artifact/format/runtime cause.
Do not continue by delegating tasks in chat.
A failed StartMissionRun means the mission is not running.

## Milestones

### M0: Artifact truth
- Create the smallest valid mission contract
- Create a tiny features.json with 3 features only
- Keep validation tiny and real

### M1: Start truth
- Call StartMissionRun
- Verify state.json now exists
- Verify progress log shows real runner advancement

### M2: One real feature
- Run one bounded real check in-repo through the mission runner

### M3: Honest closeout
- Taren reviews whether the mission truly ran
- Report truthful status
