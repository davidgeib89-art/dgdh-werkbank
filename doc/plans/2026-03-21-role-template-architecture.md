# DGDH Role Template Architecture

Status: Working direction
Date: 2026-03-21
Purpose: Preserve the agreed direction for durable agent roles before compact/context loss.

## 1. Problem

The current Paperclip-style `role` field is too weak for DGDH.

Why it is insufficient:

- it is only a DB label
- it is not a durable source of truth
- if the DB is lost/reset, the real role definition is gone
- it does not encode real operational behavior
- it is too open-ended and not smart enough for roles like `CEO`

For DGDH, a role must be more than a title string.

## 2. Core Decision

DGDH should move away from "role as free DB text" and toward:

- fixed system-defined role templates
- selected explicitly when creating an agent
- not mutable by the agent itself
- extendable by a small operator-controlled prompt add-on

This is the desired hybrid:

- stable and governed by default
- flexible for David as system designer
- not flexible for the runtime system to rewrite on its own

## 3. Desired UX

When creating an agent, the UI should eventually offer a role dropdown such as:

- `CEO`
- `Worker`
- `Reviewer`

Later possible additions:

- `Researcher`
- `Architect`
- `Operator`

The user picks one of these canonical roles.

That role is then treated as:

- fixed by system definition
- not editable by the agent
- not re-authored dynamically by the runtime

## 4. Separation of Concerns

The correct split is:

### DB stores runtime assignment

The DB should store things like:

- which role template the agent uses
- which version of the template is assigned
- adapter/runtime config
- status, budget, org placement

The DB should **not** be the only place where the meaning of the role lives.

### Canonical role definition lives outside the DB

The real role definition should live in durable, versioned system assets.

Candidate shape:

- `roleTemplateId: "ceo"`
- `roleTemplateVersion: "v1"`

And the actual role content should come from:

- file-based role profiles in repo/company config
- or another durable versioned system source

This makes roles:

- portable
- versionable
- inspectable
- resilient to DB resets

## 5. Operator Add-On Prompt

Per agent, David should be able to attach an additional controlled prompt field.

Purpose:

- add company- or mission-specific nuance
- tune emphasis or style
- specialize the role without redefining its core identity

Important rule:

- the add-on extends the role
- it does not replace the role template

Good example:

- CEO template stays fixed
- David adds a short operator instruction like:
  - focus more on Om than on generic repo work
  - keep work packets very small
  - prefer documentation first

Bad example:

- operator add-on fully rewrites the role into something else

## 6. Role Mutability Rules

Critical governance rule:

- the system must not change an agent's canonical role on its own

Allowed:

- suggest a better role
- flag mismatch
- ask for human/system-owner decision

Not allowed:

- auto-switch `Worker` into `CEO`
- rewrite the assigned role template during runs
- mutate canonical role identity from within the agent loop

Reason:

- role identity is governance
- governance must remain outside autonomous runtime drift

## 7. Why This Fits DGDH Better Than Free Roles

This direction is better because it gives:

- stable identity
- reproducibility
- governance
- simpler onboarding in UI
- durable system behavior

It avoids:

- arbitrary prompt drift
- role chaos across agents
- losing role meaning when DB state disappears
- weak "CEO" labels that are not actually CEO systems

## 8. What Can Live Inside a Role Template Later

A role template should eventually be able to contain more than plain prompt text.

Possible contents:

- role prompt/core instruction
- planning behavior
- delegation behavior
- review expectations
- escalation rules
- output schema preferences
- model preferences
- allowed/default tools
- role-specific mini-logic

This is especially important for:

- `CEO`
- `Reviewer`

Because these are not just styles of writing. They are operating modes.

## 9. Immediate DGDH Direction

Near-term recommended path:

1. Introduce fixed role templates conceptually first.
2. Treat current DB `role` as insufficient/legacy.
3. Design the first canonical templates:
   - `CEO`
   - `Worker`
   - `Reviewer`
4. Add one operator-controlled append field.
5. Keep the runtime from self-mutating assigned roles.

## 10. Minimal First Data Shape

Exact schema can be decided later, but conceptually the first useful shape is:

```txt
agent.roleTemplateId
agent.roleTemplateVersion
agent.roleAppendPrompt
```

Possible semantics:

- `roleTemplateId`: canonical system role (`ceo`, `worker`, `reviewer`)
- `roleTemplateVersion`: stable template revision
- `roleAppendPrompt`: optional operator-authored add-on

## 11. Strategic Interpretation

This is not "moving away from Paperclip entirely."

It is:

- keeping Paperclip/DB for runtime coordination
- moving true agent-role identity into governed durable definitions

That matches the DGDH North Star:

- Engine Layer = infrastructure/runtime intelligence
- Agent Layer = durable roles with real operational identity

## 12. Immediate Follow-Up

The next design step after this document should be:

- define the minimal `CEO` role template
- define the minimal `Worker` role template
- define the minimal `Reviewer` role template
- decide where canonical role files live in repo/config
- decide how the UI dropdown maps to those templates

## 13. One-Sentence Summary

For DGDH, roles must become governed, durable role templates with an optional operator add-on prompt, not free DB labels and not runtime-mutable agent self-definitions.

## 14. Post-Compact Work Packets

These are the recommended next implementation packets to execute together after compact.

### Packet 1 - Define the first canonical role template system

Goal:

- decide the minimal technical shape for fixed role templates in DGDH

Scope:

- define where canonical role templates live
- define the minimal data contract between DB/runtime and role templates
- do not build UI yet
- do not migrate existing agents yet

Done when:

- there is one agreed technical design for:
  - `roleTemplateId`
  - `roleTemplateVersion`
  - `roleAppendPrompt`
- there is one agreed location for canonical role definitions
- the design is written down in repo docs so implementation can start without reinterpretation

Expected output:

- a short implementation design doc or extension of this plan

Why first:

- this removes ambiguity before any schema or UI work starts

### Packet 2 - Define the first 3 canonical roles

Goal:

- specify the first stable DGDH role templates:
  - `CEO`
  - `Worker`
  - `Reviewer`

Scope:

- define responsibility, boundaries, and output style of each role
- define what each role is explicitly not supposed to do
- keep this provider-agnostic even though Gemini is current runtime focus

Done when:

- each of the three roles has:
  - purpose
  - allowed operating mode
  - forbidden behavior
  - expected output pattern
  - escalation behavior

Expected output:

- three role template docs or one shared canonical role spec

Why second:

- the system shape is not useful until the first real roles exist

### Packet 3 - Add minimal backend support for role templates

Goal:

- make the runtime capable of storing and resolving fixed role template assignments

Scope:

- add backend fields for canonical role assignment
- preserve current behavior where possible
- do not yet wire final UI dropdown if it slows progress

Done when:

- an agent can persist:
  - `roleTemplateId`
  - `roleTemplateVersion`
  - `roleAppendPrompt`
- backend can resolve the assigned role payload for an agent

Expected output:

- schema/API/backend plumbing

Why third:

- after design and template definition, backend support is the first real implementation step

### Packet 4 - Build role prompt composition

Goal:

- construct the effective agent identity from:
  - canonical role template
  - optional operator append prompt
  - existing issue/mission/runtime context

Scope:

- implement composition logic only
- do not add autonomous role mutation
- do not let append prompt override core template identity

Done when:

- effective role prompt can be rendered deterministically
- append prompt extends but does not replace the template
- the composed role context is inspectable in debug/meta output

Expected output:

- role composition function plus debug visibility

Why fourth:

- this is where the architecture becomes operational

### Packet 5 - Add UI selection for fixed roles

Goal:

- make role templates selectable during agent creation/editing

Scope:

- add dropdown for canonical roles
- add optional append-prompt textarea
- do not expose free-form canonical role editing

Done when:

- user can create or edit an agent with:
  - fixed role template
  - optional operator append prompt

Expected output:

- minimal but clean UI flow

Why fifth:

- UX should come after the canonical model is real

### Packet 6 - Build minimal CEO V1 on top of the role system

Goal:

- make the first real `CEO` role useful

Scope:

- CEO reads a mission or large issue
- CEO outputs a mission summary and 3-5 work packets
- no full reviewer chain yet
- no self-modifying governance logic

Done when:

- one CEO agent can take one broad mission and produce structured small packets

Expected output:

- first practical agent-layer intelligence on top of fixed role templates

Why sixth:

- this is the first point where the role system starts paying back immediately

## 15. Recommended Execution Order

Recommended order after compact:

1. Packet 1 - canonical role template system definition
2. Packet 2 - define `CEO`, `Worker`, `Reviewer`
3. Packet 3 - backend support
4. Packet 4 - role prompt composition
5. Packet 5 - UI selection
6. Packet 6 - minimal CEO V1

## 16. What We Should Do Immediately After Compact

Start with Packet 1.

Reason:

- it is the smallest high-leverage step
- it resolves the architectural ambiguity first
- it makes all later backend/UI work cleaner
- it gives us the right contract before code spreads

Packet 1 should be treated as the next active task after compact.
