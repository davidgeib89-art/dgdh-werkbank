# DGDH Platform Vision

Date: 2026-03-17
Status: Canonical mainline for platform evolution

## 1. Purpose

DGDH builds a human-governed AI execution platform that can orchestrate different models, adapters, and runtimes under one policy layer.

Paperclip is the current technical substrate, not the final product identity.

## 2. Strategic Direction

1. Human-led governance remains the top control layer.
2. The platform must stay model-agnostic and adapter-agnostic.
3. Token economy is a first-class system concern, not an afterthought.
4. Runtime activation is explicit, controlled, and auditable.

## 3. Current Operating Line (Now)

1. Primary build lane: David + Copilot in repo.
2. Controlled live testing lane: Gemini only, with explicit guardrails.
3. Codex and Claude agents in Paperclip runtime: dormant by default.
4. No broad autonomous multi-agent runtime until cost and policy gates are met.

## 4. Target Architecture

The platform must separate four independent layers:

1. Role layer: what an agent is allowed to do.
2. Adapter layer: how a provider/runtime is executed.
3. Model layer: which model ID is selected.
4. Budget layer: when execution is allowed based on token and spend policy.

This separation prevents lock-in and allows route-by-policy instead of route-by-vendor.

## 5. Non-Goals (Current Phase)

1. No always-on autonomous swarm.
2. No uncontrolled heartbeat scheduling for dormant agents.
3. No vendor-specific architecture that blocks future provider rotation.

## 6. Success Criteria

1. Any role can be re-routed to another adapter/model without architecture rewrite.
2. Token spend per workflow can be predicted and capped.
3. Dormant agents remain fully configured but produce zero background token burn.
4. Controlled validation can be executed with one-click reactivation and one-click pause.

## 7. Canonical Companions

1. TOKEN-ECONOMY-STRATEGY.md
2. MODEL-ROADMAP.md
3. ../doc/plans/2026-03-17-dgdh-platform-evolution-strategy.md
