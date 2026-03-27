# Mission Cell Starter Path V1

Status: active starter path
Authority: David
Lane: mission autonomy mode

## Purpose

Provide the first real start path for a mission cell on top of the current Paperclip carrier.

## Start Rule

Start a mission cell by referencing a durable contract in the issue itself:

`missionCell: mission-cell-starter-path-v1`

The issue must also carry explicit packet truth such as `doneWhen`, `artifactKind`, and bounded scope where relevant.

## Startup Sequence

1. Validate the contract with `paperclipai mission cell validate company-hq/mission-cells/mission-cell-starter-path-v1.json --json`.
2. Reference the mission cell in the issue description.
3. Let the runtime bridge inject the mission-cell brief into prompt and wakeup context.
4. Carry all Type-2 work inside the mission cell autonomously.
5. Escalate only at Type-1 or Oberreviewer triggers.
6. Promote only after replay, eval, and review truth exist.

## What This Answers

This starter path should answer directly:

- how a mission cell starts
- what it may decide on its own
- when it must escalate
- how risk is gated
- how replay and eval are read
- how improvement is promoted instead of merely produced