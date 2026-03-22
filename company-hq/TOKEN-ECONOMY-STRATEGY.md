# Token Economy Strategy

Date: 2026-03-17
Status: Active policy baseline

## 1. Principle

Token usage is treated like a governed operating budget. Every autonomous capability must justify its token burn.

## 2. Operational States

1. Dormant
   - Agent status is paused.
   - heartbeat.enabled is false.
   - wakeOnDemand is false.
   - No tasks are assigned.
   - No automation paths target this agent.
2. Controlled Pilot
   - Explicitly approved runs only.
   - Narrow scope and short window.
   - Logs and token usage are reviewed after each run.
3. Active Production
   - Allowed only after pilot metrics are stable.
   - Budget ceilings and kill-switches are enforced.

## 3. Current Enforcement Line

1. Codex is an active Sprint-Coder (Controlled Pilot, ab 2026-03-22).
2. Gemini is the active Reviewer lane (Controlled Pilot).
3. Claude operates as Planer (external, not in Paperclip runtime).
4. David + AI-assisted flow remains the default implementation path.

## 4. Practical Dormant Procedure

For any dormant agent profile:

1. Set agent to paused.
2. Disable heartbeat schedule.
3. Disable wake-on-demand.
4. Remove from task assignment rotation.
5. Remove from automation triggers.
6. Keep profile documented for future reactivation.

This keeps optional capacity available without recurring token cost.

## 5. Run Classes and Cost Expectations

1. Simulation run
   - Zero live provider calls.
   - Used for parser, mapping, and policy validation.
2. Smoke run
   - Single minimal live run for path verification.
   - Used after integration milestones only.
3. Throughput run
   - Multi-task or repeated runs.
   - Disabled by default in current phase.

## 6. Policy Gates Before Expansion

All gates must pass before moving an agent from Dormant to Controlled Pilot:

1. Adapter environment test passes.
2. Transcript readability and tool mapping are acceptable.
3. Rollback path is documented.
4. Budget ceiling and stop condition are configured.
5. Human owner is explicitly assigned.

## 7. Review Cadence

1. Weekly: token spend and failed-run analysis.
2. Monthly: provider price/performance re-evaluation.
3. Milestone-based: go/no-go for expanding active lanes.
