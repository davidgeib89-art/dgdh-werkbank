# company-hq (Canonical In-Repo)

This directory is the canonical, versioned home for DGDH governance, platform strategy, and operating context.

## Start Here

Primary entrypoint for any new AI or contributor:

- `AI-CONTEXT-START-HERE.md`

## Canonical repo context

- Primary repo: `dgdh-werkbank`
- Primary branch: `main`
- Primary working directory: `~/DGDH/worktrees/dgdh-werkbank`

## Active Canonical Set

These are current operating documents and should be preferred over historical material:

- `CURRENT-STATE-REVIEW-2026-03-17.md`
- `VISION.md`
- `MODEL-ROADMAP.md`
- `AGENT-CONSTITUTION.md`
- `AGENT-PROFILES.md`
- `AUTONOMY-MODES.md`
- `BUDGET-POLICY.md`
- `ESCALATION-MATRIX.md`
- `IDLE-POLICY.md`
- `TASK-BRIEF-TEMPLATE.md`
- `ROLE-ROUTING-CONTRACT.md`
- `MINIMAL-CORE-PROMPT-CONTRACT.md`
- `ROLE-ASSIGNMENT-RUNTIME-MAP-2026-03-18.md`
- `HARNESS-LEARNINGS-FOR-DGDH-2026-03-18.md`
- `GEMINI-BENCHMARK-PACKET-01-2026-03-17.md`
- `GEMINI-MICRO-BENCHMARK-SUITE-2026-03-18.md`
- `MORPH-INTEGRATION-PLAN-2026-03-18.md`

## Probe-01 Track Docs

Load these when working on controlled-live probe decisions:

- `BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md`
- `CONTROLLED-LIVE-PROBE-01-BOARD-PACKET.md`
- `CONTROLLED-LIVE-PROBE-01-DECISION-BRIEF.md`
- `CONTROLLED-LIVE-PROBE-01-OPS-CHECKLIST.md`
- `CONTROLLED-LIVE-GATE-01-SHADOW-REVIEW.md`

## External Agent Prompts

- `CHATGPT-AGENT-REPO-ONBOARDING-PROMPT-2026-03-18.md`

## Archive

Legacy and superseded docs were moved to:

- `archive/2026-03-18-legacy/`

Treat archive docs as historical context, not default operating truth.

## Change-coupled context rules

- If a change touches role logic, issue assignment, heartbeat routing, or role-based permissions, review and update `ROLE-ASSIGNMENT-RUNTIME-MAP-2026-03-18.md` in the same change set when needed.
- If a change affects current operating behavior, review `AI-CONTEXT-START-HERE.md` in the same change set.

## Note on top-level mirror

A top-level `DGDH/company-hq` folder may still exist during transition. New canonical edits should happen in this in-repo directory.
