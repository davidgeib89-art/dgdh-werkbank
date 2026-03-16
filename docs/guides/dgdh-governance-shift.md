# DGDH Governance Shift: Engineering Note

Date: 2026-03-16

## Summary

Paperclip development now follows a governance-first direction.
The system goal is a regulated autonomous company, not open-ended autonomous exploration.

## What Changed

Before:

- agent autonomy could drift into broad exploration
- runtime behavior was tuned mainly for capability

Now:

- autonomy is policy-bounded
- every run should map to one governed work packet
- budget and escalation controls are first-class requirements

## Build-Phase vs Target-Phase Roles

Build phase:

- ChatGPT and Copilot were architecture and implementation accelerators

Target phase:

- David + Claude + Codex + Gemini + Paperclip only
- ChatGPT/Copilot are not part of steady-state operating model

## Engineering Impact Areas

1. Run orchestration

- enforce packet validation before wakeup/invoke

2. Budget control

- phase-aware hard caps and stop behavior

3. Checkpointing

- explicit phase A to B approval gate

4. Idle behavior

- queue-check and lightweight heartbeat only

5. Memory strategy

- compact reusable summaries for token savings
- avoid expensive full-history replay

## Practical Guidance

- prefer minimal evidence outputs
- avoid broad diagnostics unless required by task brief
- escalate before expanding scope
- treat constitution and budget policy as hard constraints

## Related Governance Docs

- company-hq/AGENT-CONSTITUTION.md
- company-hq/AUTONOMY-MODES.md
- company-hq/TASK-BRIEF-TEMPLATE.md
- company-hq/ESCALATION-MATRIX.md
- company-hq/BUDGET-POLICY.md
- company-hq/IDLE-POLICY.md
