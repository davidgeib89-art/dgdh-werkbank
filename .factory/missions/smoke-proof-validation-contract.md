# Validation Contract: Mission-Control Smoke Proof

## Area: Mission Artifacts

### VAL-ARTIFACT-001: Mission artifacts exist
The mission directory contains valid mission.md, validation-contract.md, features.json, and AGENTS.md.
Evidence: file existence check

### VAL-ARTIFACT-002: features.json is valid
features.json contains a non-empty features array with valid schema.
Evidence: file read, schema validation

### VAL-ARTIFACT-003: Mission state created
After StartMissionRun, state.json exists in the mission directory.
Evidence: file existence check after start

## Area: Mission Runner

### VAL-RUNNER-001: StartMissionRun succeeds
The StartMissionRun call returns without error and mission runner starts.
Evidence: API response, state.json exists

### VAL-RUNNER-002: Progress log advances
progress_log.jsonl shows entries beyond mission_accepted.
Evidence: file read, log entries

### VAL-RUNNER-003: At least one feature executes
At least one feature runs through the actual mission runner (not chat fallback).
Evidence: progress log shows feature execution, worker handoff exists

## Area: Honest Closeout

### VAL-CLOSEOUT-001: Closeout review completes
Taren skill executes and provides verdict on mission success.
Evidence: worker handoff with explicit verdict

### VAL-CLOSEOUT-002: Truthful status reported
Final report explicitly states what was proven, what failed, and whether Mission Control is trustworthy.
Evidence: closeout report artifact
