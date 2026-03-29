---
name: dgdh-workbench-expert
description: >
  Become expert in DGDH, Paperclip, and the DGDH Werkbank operating model.
  Use when the task touches DGDH strategy, governance, mission autonomy,
  Paperclip architecture, Werkbank runtime behavior, self-improvement,
  work-packet design, review loops, heartbeats, or changes inside this repo.
---

# DGDH Workbench Expert

Use this skill whenever the task is about DGDH, Paperclip, Werkbank, mission
autonomy, governance, routing, heartbeats, roles, reviews, or self-improving
the system.

Do not read the whole repo by default. Load the smallest canonical set that
answers the task.

## Canonical Read Order

Start here for repo truth:

1. `INIT.md`
2. `CURRENT.md`
3. `MEMORY.md`
4. `company-hq/AI-CONTEXT-START-HERE.md`

Then load the compact direction core:

1. `company-hq/CORE.md`
2. `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md`
3. `company-hq/VISION.md`
4. `doc/plans/2026-03-24-dgdh-first-principles-operating-doctrine.md`

Load these when the task touches execution behavior, autonomy, or review rules:

1. `company-hq/AGENT-CONSTITUTION.md`
2. `company-hq/AUTONOMY-MODES.md`
3. `company-hq/BUDGET-POLICY.md`
4. `company-hq/ESCALATION-MATRIX.md`
5. `company-hq/IDLE-POLICY.md`

Load these when the task is about Paperclip or repo structure:

1. `docs/guides/dgdh-repo-operating-model.md`
2. `docs/start/core-concepts.md`
3. `docs/start/architecture.md`
4. `skills/paperclip/SKILL.md`
5. `EXECUTOR.md` when runtime or execution flow is involved

## Operating Rules

- Prefer the canonical implementation repo `dgdh-werkbank` over sibling worktrees.
- Treat `CURRENT.md` as live baton truth and `MEMORY.md` as stable cross-session truth.
- Do not load archived docs unless the task explicitly needs historical evidence.
- Separate the layers correctly:
  - product code for invariants and runtime truth
  - role templates and prompts for agent behavior
  - skills for repeatable narrow procedures
- Do not answer from inherited lore or vague repo impressions. Read the files.

## Self-Improvement Rules

When asked to improve DGDH itself, stay mission-bounded:

1. Work on exactly one bounded improvement at a time.
2. Prefer reversible Type-2 changes first.
3. Stop and escalate at Type-1 boundaries:
   - `main`
   - deploy/release
   - secrets
   - provider credentials
   - global policy mutations
   - broad irreversible migrations
4. Optimize for real DGDH capability, not architecture theater.
5. Prioritize state clarity, handoffs, review truth, merge hygiene, operator recovery,
   and mission-cell execution over decorative abstraction.

## Output Shape

For substantial work, structure conclusions as:

1. `Goal`
2. `Result`
3. `Files Changed`
4. `Blockers`
5. `Next`

If there is no active bounded packet or mission cell, do not invent a broad
new program. Propose the smallest next bounded move instead.