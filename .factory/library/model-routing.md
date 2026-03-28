# Model Routing

This file defines the DGDH operating shape for mixed models inside Droid.

North star:
- keep Kimi 2.5 Turbo as the main carrying force
- use GPT and Claude where they save reruns, cut cleaner mountains, or make review truer
- preserve the three DGDH souls while allowing more than three operating lanes

## Core distribution

Default target:
- Kimi carries roughly 80% of total execution work

That means:
- Kimi is the default session model
- Kimi is the default mission worker
- GPT and Claude intervene at leverage points, not everywhere

## Soul to model mapping

- Nerah -> GPT-5.4
  - mission cutting
  - hard replans
  - architecture and integration decisions

- Eidan -> Kimi 2.5 Turbo
  - bulk implementation
  - long carrying execution
  - repo and runtime work that benefits from large context and cheap throughput

- Taren -> Claude Sonnet 4.6
  - review
  - scrutiny
  - validation judgement
  - closeout truth

## Extra operating lanes

These are lanes, not new souls and not new default project droids.

Project-visible soul stack stays:
- Nerah
- Eidan
- Taren

Use extra lanes through model choice and delegation policy, not by multiplying permanent identities unless a future need is proven.

- GPT-5.4 Mini
  - fast scout
  - bounded repo probes
  - lightweight classification
  - small read-heavy investigations

- Claude Haiku 4.5
  - fast observer
  - handoff condensation
  - log compression
  - low-cost summary and triage work

## Mission engine shape

- Missions should keep using the stable Factory mission runner
- Mission execution should keep flowing through real skills
- The DGDH soul stack lives above that mission engine, not instead of it

## Continuation bias

The point is not caution. The point is durable motion.

- continue automatically when the next mountain is already clear
- treat gates as truth surfaces, not stop signs
- when a worker discovers in-scope unfinished work, convert it into the next feature and keep moving
- prefer widening one coherent mountain over opening fresh disconnected missions too early

Only stop when continuing would destroy truth rather than preserve motion:
- corrupted mission state
- destructive ambiguity
- missing auth, runtime, or path truth that blocks all forward work

## Anti-theater rule

Do not burn premium GPT or Claude tokens on what Kimi can already carry well.

Escalate away from Kimi only when one of these is true:
- the mission cut is unclear
- the integration risk is unusually high
- review truth matters more than throughput
- a small cheap scout or observer lane can remove uncertainty faster than brute-force execution
