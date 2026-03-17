# DGDH Idle Policy

Version: 1.0

## Principle

Idle means idle.
No approved work packet means no autonomous exploration.

## Allowed While Idle

- check assigned queue at lightweight interval
- publish short idle status heartbeat
- report blockers requiring human input
- wait/sleep

## Not Allowed While Idle

- invent new major tasks
- broad repository scans without assignment
- expensive diagnostics on speculative topics
- multi-agent ping-pong without active packet

## Idle Loop (target behavior)

1. check queue metadata only
2. if no approved packet, emit compact idle status
3. sleep until next lightweight interval
4. repeat

## Idle Status Payload (minimal)

- agent role
- current mode
- queue state: empty or pending
- blocker flag
- timestamp

## Idle Exit Condition

Agent exits idle only if:

- valid task brief exists
- packet is assigned
- required approval state is satisfied

## Guardrail

Any action outside allowed idle behavior is policy violation and must be escalated.
