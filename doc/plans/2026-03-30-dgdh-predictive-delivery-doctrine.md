# DGDH Predictive Delivery Doctrine

Date: 2026-03-30  
Status: canonical operating doctrine for how DGDH wants to build, validate, and ship  
Audience: David + every AI that works in this repository

## 1. Why this exists

DGDH does not want to scale by adding more reactive QA, more review theater, or more human interruption.

DGDH wants to ship with confidence by moving quality earlier:

- before execution
- during execution
- before merge

instead of mostly at the end.

Short form:

> Quality in DGDH should be predictive first, reactive second.

## 2. What we are rejecting

These habits are not the target state:

- QA as a late final gate that catches what upstream ambiguity created
- asking reviewers to rediscover basic truth that the worker should already have proven
- broad validation by default on every small cut
- branch ambiguity between missions
- runtime ambiguity between local servers, old ports, and stale process assumptions
- giant mission prompts that compensate for weak harnesses
- premium-model judgement being wasted on mechanical checks

Reactive QA still exists.
But it is no longer the main place where confidence should be created.

## 3. First-principles truth

What is fundamentally true:

1. Most expensive software mistakes are not caused by lack of effort.
   They come from wrong assumptions about context, runtime state, blast radius, or downstream effects.

2. Most slowdowns do not come from writing code.
   They come from reconstructing truth after it has already fragmented.

3. Most review pain does not come from missing intelligence.
   It comes from cheap work arriving without clean evidence.

4. Confidence does not come from one giant check at the end.
   It comes from a chain of smaller truthful checks that remove uncertainty early.

5. A fast cheap worker becomes high leverage when the harness removes ambiguity before the worker burns time on it.

Therefore DGDH should optimize not for "more QA" but for:

- earlier truth
- narrower truth
- cheaper truth
- more reusable truth

## 4. The DGDH delivery model

DGDH builds confidence in four stages:

### 4.1 Before execution

Before a mission or implementation run starts, the system should know:

- which branch is canonical
- whether the runtime is attached and healthy
- whether the packet is actually ready
- which verification surfaces are canonical
- whether the mountain is small enough to review honestly

If these are unknown, the run is not "moving fast."
It is starting with debt.

### 4.2 During execution

During implementation, the worker should prove the smallest truths first:

- exact test slice
- exact package typecheck or build
- exact runtime/API truth
- exact branch/commit truth

The worker should not default to:

- broad workspace sweeps
- improvised alternate runtimes
- DB backdoors when API truth exists
- simulated confidence from prose

### 4.3 Before merge

By review time, mechanical truth should already exist.

The reviewer should mostly answer:

- Is this really the right cut?
- Is the evidence coherent?
- Is the user-facing or merge-risk judgement acceptable?
- Is this actually complete, or only promising?

Review should not be the first place where basic operational truth appears.

### 4.4 After merge

After merge, live proof still matters.
But post-merge validation should confirm a well-shaped cut, not rescue a badly-shaped one.

Every substantial run should also leave behind better future predictability:

- a sharper skill
- a better hook
- a better truth surface
- a better doctrine sentence

## 5. The five predictive gates

Every meaningful Droid or AI mission in DGDH should try to satisfy these gates:

### Gate 1: Branch truth

The mission starts from a clean canonical base and ends with explicit git truth:

- fresh branch
- exact commits
- pushed review branch or explicit blocker

No silent carry-over between mountains.

### Gate 2: Runtime truth

The mission uses one canonical runtime when live runtime matters.

- one shared mission runtime
- one canonical port
- one health surface
- one company truth

No ad-hoc process mythology.

### Gate 3: Packet truth

The issue or feature packet must be actually runnable.

- correct artifact kind
- correct target file/folder truth
- explicit doneWhen
- explicit reviewer truth where needed

If the packet is `not_ready`, the right move is to fix packet truth, not to improvise around it.

### Gate 4: Verification truth

Verification should be the narrowest truthful surface first:

- targeted test
- package-scoped typecheck/build
- exact API read
- exact chain/status read

Broader checks are escalation, not default ritual.

### Gate 5: Review truth

Review is for judgement, not for basic rediscovery.

The reviewer should receive:

- exact branch
- exact commands run
- exact files changed
- exact blocker if incomplete

## 6. Role economics

DGDH should spend intelligence where judgement matters and spend cheap throughput where mechanics matter.

### Nerah / Orchestrator

Use for:

- cutting the mountain
- replanning
- conflict resolution
- deciding what is Core vs Slop

Do not waste Nerah on repo rediscovery a cheaper worker can perform.

### Eidan / Worker

Use for:

- bulk implementation
- bounded probes during planning
- runtime attachment and factual checks
- mechanical validation

The worker should not be treated as a confused junior if the harness can remove the confusion first.

### Taren / Reviewer

Use for:

- judgement
- user-surface truth
- contradiction handling
- merge/promotion decisions

Do not spend Taren on repeating broad mechanical validation that a cheap worker should already have done.

## 7. What this means for Droid

Droid is not mainly valuable because it can run three agents.
Droid is valuable because it can carry one bounded mountain for a long time with less David supervision.

Therefore:

- mission prompts for the orchestrator should be truth-dense, not over-scripted
- worker and validator behavior should live mostly in the harness, skills, hooks, and truth surfaces
- one mission should be able to run for hours and still produce evening-reviewable branch truth

The target day shape is:

1. morning: David + planner cut one real mountain
2. day: Droid carries it with minimal interruption
3. evening: reviewable reality exists
4. only then: review, merge, doctrine upgrade, next mountain

## 8. Anti-small-small rule

DGDH does not want fake bigness.
But it also does not want endless tiny cuts that never add up to a real overnight carry.

So:

- small cuts are good when they strengthen the substrate for a larger carry
- once the substrate is strong enough, the next mission should again be a larger coherent mountain

The question is not:

> "Can we split this smaller?"

The question is:

> "What is the largest still-reviewable mountain that can carry while David is away?"

## 9. Deployment with confidence

DGDH should read "deployment confidence" as:

- the branch is clear
- the runtime is clear
- the packet is clear
- the narrow validation is green
- the reviewer only has real judgement left

Confidence is not:

- confidence theater
- broad end-stage QA as compensation for earlier ambiguity
- a giant checklist detached from the actual cut

## 10. The shortest version

> In DGDH, quality should be created upstream by clear branches, clear runtime, clear packets, cheap mechanical proof, and focused judgement, so long Droid missions can ship real reviewable work with less David supervision.
