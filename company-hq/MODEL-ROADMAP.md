# Model Roadmap

Date: 2026-03-17
Status: Prioritized roadmap baseline

## Jetzt

1. Clean and simplify the canonical documentation so current operating reality is readable again.
2. Optimize the shared core used by all agents before splitting attention across role-specific prompt behavior.
3. Inspect the current Paperclip issue and heartbeat path as it exists today and understand exactly what the first active role receives.
4. Cut down prompt, context, and workflow waste inside that inherited path before adding new system layers.
5. Use Gemini as the first measured worker lane because quota availability is strongest there.
6. Define one fixed, repeatable benchmark task and record tokens per run.
7. Use the remaining current quota windows to collect real benchmark evidence before the next reset.
8. Keep Claude and Codex dormant unless a task clearly justifies spending their tighter quotas.
9. Keep main delivery velocity through David plus repo assistance while runtime behavior is being clarified.

## Naechster Ausbau

1. Introduce a practical routing abstraction:
   - task class -> provider lane -> budget profile
2. Add per-lane cost and quality scorecards.
3. Build narrow task-specific tools where tool use is cheaper and more reliable than repeatedly expanding prompt context.
4. Add memory, external skills, or other capability expansion only after one Gemini task is already lean and stable.
5. Reduce prompt and context waste based on measured runs rather than speculative redesign.
6. Define reactivation checklist for Claude and Codex based on actual benchmark evidence.
7. Add provider profiles for low-cost experimentation once baseline telemetry is trustworthy.

## Spaeter

1. Add local model lane on 4080 Super for selective workloads.
2. Add hybrid routing (local-first, cloud-fallback) by task class.
3. Enable controlled multi-agent collaboration only after token-governance KPIs hold.
4. Transition from Paperclip-first branding to platform-native product framing.
5. Expand from internal fun and test projects to larger useful products and then external value.

## Reactivation Policy for Dormant Lanes

Codex/Claude can move from Dormant to Controlled Pilot only if all are true:

1. Clear use case that Gemini cannot cover efficiently enough.
2. Expected quality gain is measurable.
3. Token envelope and stop conditions are predefined.
4. A rollback-to-dormant command path is tested.
5. Human owner commits to run monitoring.

## Architecture Priorities Behind the Roadmap

1. Adapter contracts stay stable while providers change.
2. Routing decisions are policy-driven, not hardcoded by model vendor.
3. A shared core should stay common across agents; role behavior remains a thinner layer above it.
4. Cost telemetry is available per run, per role, and per adapter.
5. The first optimization cycle starts only after a trustworthy Gemini benchmark exists.
6. Repeated firm work should move into tools or compact structured flows whenever that lowers token spend.
7. New capability layers are justified only after the current inherited execution path has been made lean for one real task.
