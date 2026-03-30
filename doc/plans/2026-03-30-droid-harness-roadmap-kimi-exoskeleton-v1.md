# DROID Harness Roadmap - Kimi Exoskeleton V1

Status: active bounded plan  
Audience: David, Codex/Taren, Droid/Nerah/Eidan/Taren  
Last updated: 2026-03-30

## Goal

Turn Droid into an exoskeleton for Kimi 2.5 Turbo so cheap worker throughput can carry most real work without increasing David supervision.

North-star reading:
- premium models should spend tokens on cutting, judgement, and high-risk integration
- Kimi should carry the bulk of implementation, bounded investigation, runtime probing, and mechanical validation
- the harness should remove ambiguity before the worker burns tokens on it

## First-principles truth

What is fundamentally true:
- most mission waste comes from ambiguity, not from lack of raw model intelligence
- cheap fast workers become high-leverage when the runtime, branch, packet, and validation surfaces are canonical
- review quality improves when cheap validation removes mechanical questions before premium judgement is invoked
- DGDH needs three living functions, not many identities:
  - cut and re-anchor
  - carry and verify
  - judge and close

Therefore:
- Kimi should be the default carrying lane not only for code, but also for bounded repo/runtime probes and standard validation
- premium lanes should be pulled in only when judgement quality is the actual bottleneck

## Core

### 1. Shared mission runtime
- every mission attaches to one canonical local Paperclip runtime on `:3100`
- workers reuse that runtime rather than starting ad-hoc server copies
- runtime attach/start is a hook, not a worker improvisation

### 2. Kimi-first planning probes
- during mission cutting, unresolved factual questions should be delegated to cheap worker probes early
- Nerah should keep the cut/judgement role but offload bounded repo/runtime discovery to Eidan/Kimi
- planning should only stay on the orchestrator when the remaining unknown is inherently strategic

### 3. Kimi-first mechanical validation
- package-scoped tests, API truth checks, route verification, and contract checking should default to Kimi
- premium validation should be reserved for:
  - user-judgement questions
  - merge-risk judgement
  - contradictory evidence
  - strategic review

### 4. Review-ready branch truth
- every promotable cut lands on a fresh review branch
- the mission ends with exact branch name, verification commands, and review-readiness
- no silent carry-over to the next mission

### 5. Failure-class routing
- every blocker must be classified early:
  - `strategy failure`
  - `applicability / harness failure`
  - `environment / interface failure`
  - `missing capability / guardrail`
- cheap workers should stop quickly on proven environment/harness blockers instead of thrashing

## Smaller

### 6. Contract size calibration
- small single-surface missions should use lighter validation contracts
- multi-surface missions keep richer contracts

### 7. Standard probe recipes
- repo probe
- runtime attach + health
- company inventory
- triad-preflight
- company-run-chain verification
- targeted package test + typecheck

### 8. Validation tiering
- Tier 1: cheap mechanical validation by Kimi
- Tier 2: Taren review only if Tier 1 passes or finds a real contradiction
- Tier 3: David only for Type-1, product judgement, or final merge trust

## Later

### 9. Explicit validator routing policy
- separate machine-readable routing rules for:
  - default worker model
  - default validator model
  - escalation triggers

### 10. Mission metrics
- measure:
  - worker time to first real artifact
  - worker reruns per mission
  - premium-token calls avoided
  - review-ready branches per mission

### 11. Auto-synthesized review packets
- have cheap lanes prepare compact evidence bundles before Taren review

## Slop

- adding more permanent identities
- broad mission-runner rewrites before the cheap path is sharpened
- using premium models for routine test-running or repo discovery
- full-suite validation by default on bounded package changes
- letting missions end in dirty branch ambiguity

## First implementation cut

1. shared mission runtime hook and skill
2. Kimi-first model routing guidance
3. Nerah planning rule: delegate bounded factual probes to Eidan/Kimi early
4. Taren review rule: cheap mechanical validation first, premium judgement second
5. branch/review-ready handoff discipline

## Success definition

- Kimi can carry most bounded missions with less orchestration overhead
- the orchestrator spends more time cutting than rediscovering
- the validator/reviewer spends more time judging than re-checking basic mechanics
- runtime and branch truth become boring enough that cheap lanes stop failing on preventable ambiguity
