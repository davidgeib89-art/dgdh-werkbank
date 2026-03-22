> **Ueberholt durch North Star Roadmap 2026-03-21.** Siehe: `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`

# DGDH Platform Evolution Strategy

Date: 2026-03-17
Scope: Platform direction, token efficiency, and model-agnostic rollout

## 1. Executive Summary

This plan locks in a model-agnostic, token-efficient evolution line:

1. Paperclip remains the technical substrate.
2. DGDH platform identity becomes the strategic product direction.
3. Codex/Claude Paperclip agents stay dormant until explicit reactivation gates pass.
4. Gemini is the only approved controlled live lane for current runtime validation.

## 2. Policy Artifacts Anchored

1. company-hq/PLATFORM-VISION.md
2. company-hq/TOKEN-ECONOMY-STRATEGY.md
3. company-hq/MODEL-ROADMAP.md

## 3. Operating Model

1. Build mode (default)
   - David + Copilot implementation loop.
   - No autonomous background swarm.
2. Validation mode (controlled)
   - Single-lane Gemini smoke tests.
   - Explicit approval and immediate post-run review.
3. Expansion mode (future)
   - Additional providers/models only after governance and budget gates pass.

## 4. Dormant Agent Handling (Codex/Claude)

Dormant is implemented operationally, not just conceptually:

1. Agent paused.
2. Heartbeat disabled.
3. Wake-on-demand disabled.
4. Removed from assignment/automation pathways.
5. Profile preserved for fast reactivation.

## 5. Architecture Work Packages

### WP1: Routing Contract

Define a single route contract:

- input: role, task class, risk class, budget profile
- output: adapter type, model id, execution policy

### WP2: Cost Telemetry Layer

Normalize usage data across adapters into one comparable schema.

### WP3: Reactivation Controls

Create a deterministic reactivation checklist and rollback-to-dormant command set.

## 6. Milestones

1. M1 (now): Strategy docs are canonical and cross-referenced.
2. M2 (next): Routing contract draft implemented behind feature flag.
3. M3 (next): Cost telemetry baseline dashboard per adapter/model.
4. M4 (later): Controlled second provider pilot beyond Gemini.
5. M5 (later): Hybrid local+cloud routing experiments.

## 7. Risks and Mitigations

1. Risk: Policy drift across documents.
   - Mitigation: keep these three company-hq docs as canonical source.
2. Risk: accidental token burn from dormant profiles.
   - Mitigation: enforce paused + heartbeat off + wake-off + no assignments.
3. Risk: architecture lock-in to one model vendor.
   - Mitigation: keep route contract provider-neutral.

## 8. Immediate Next Task

Implement WP1 skeleton in code with no live-run dependency:

1. add typed route policy config shape
2. add resolver function with unit tests
3. wire resolver to adapter selection path behind a feature flag
