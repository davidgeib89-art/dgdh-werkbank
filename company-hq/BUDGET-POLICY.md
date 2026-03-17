# DGDH Budget Policy

Version: 1.0
Priority: token efficiency first

## Budget Classes

### Small Task

- diagnose: 8k tokens
- implementation: 20k tokens
- verification: 7k tokens
- hard cap per run: 35k tokens
- max runtime: 30 minutes
- max files changed: 8

### Medium Task

- diagnose: 15k tokens
- implementation: 45k tokens
- verification: 15k tokens
- hard cap per run: 75k tokens
- max runtime: 90 minutes
- max files changed: 20

### Large Task

- diagnose: 25k tokens
- implementation: 75k tokens
- verification: 25k tokens
- hard cap per run: 125k tokens
- max runtime: 180 minutes
- max files changed: 40

## Absolute Safety Caps

- absolute hard cap per run: 150k tokens
- absolute hard cap per work packet (all retries combined): 250k tokens
- auto-stop if verify budget is exhausted before minimum acceptance checks

## Phase Allocation Rules

- phase A cannot consume phase B budget by default
- unused diagnose budget can move to verification, not implementation
- implementation overrun requires escalation before next action

## Retry Policy

- max retries per packet: 2
- each retry must have narrower scope or explicit escalation approval
- retry without changed strategy is not allowed

## Reporting Minimum

At run end, report:

- budget class
- estimated tokens used by phase
- hard-cap proximity
- whether escalation was required

## Governance

- David approves policy changes.
- Claude may propose tuned values per mission.
- Paperclip should enforce caps pre-run and mid-run.
