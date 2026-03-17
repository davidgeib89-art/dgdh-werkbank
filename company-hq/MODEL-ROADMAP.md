# Model Roadmap

Date: 2026-03-17
Status: Prioritized roadmap baseline

## Jetzt

1. Keep Codex and Claude Paperclip agents dormant.
2. Use Gemini as the only controlled live validation lane.
3. Keep main delivery velocity through Copilot + human governance.
4. Stabilize adapter interfaces so model IDs are decoupled from roles.

## Naechster Ausbau

1. Introduce routing policy abstraction:
   - role -> adapter -> model -> budget profile
2. Add provider profiles for low-cost experimentation:
   - Gemini variants
   - OpenRouter-backed options
   - DeepSeek-class cost-focused models
3. Add per-lane cost and quality scorecards.
4. Define reactivation checklist for dormant Codex/Claude lanes.

## Spaeter

1. Add local model lane on 4080 Super for selective workloads.
2. Add hybrid routing (local-first, cloud-fallback) by task class.
3. Enable controlled multi-agent collaboration only after token-governance KPIs hold.
4. Transition from Paperclip-first branding to platform-native product framing.

## Reactivation Policy for Dormant Lanes

Codex/Claude can move from Dormant to Controlled Pilot only if all are true:

1. Clear use case that Gemini lane cannot cover efficiently.
2. Expected quality gain is measurable.
3. Token envelope and stop conditions are predefined.
4. A rollback-to-dormant command path is tested.
5. Human owner commits to run monitoring.

## Architecture Priorities Behind the Roadmap

1. Adapter contracts stay stable while providers change.
2. Routing decisions are policy-driven, not hardcoded by model vendor.
3. Cost telemetry is available per run, per role, and per adapter.
