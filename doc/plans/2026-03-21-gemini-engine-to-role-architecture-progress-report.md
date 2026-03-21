# DGDH Progress Report - From Gemini Engine Completion to Role Architecture

Date: 2026-03-21
Status: Working report / context preservation
Audience: David + future AIs after compact

## 1. Why This Document Exists

This document captures what was actually developed in the last hours, from the point where the Gemini-based Engine Thinking Layer was already proven through the current role-template architecture work.

It is meant to preserve:

- what is already working
- what was tested in reality
- what broke and why
- what was fixed
- why the next logical step is not more engine cleverness but durable agent roles

This is not a generic summary.
It is the concrete bridge between:

- "the Gemini engine now works"
- and
- "DGDH now needs its first real digital employees"

Update later the same day:

- the first real Worker-role run has now been executed successfully end-to-end
- the role-template path is no longer just architecture; it has operational proof
- the next constraint is no longer "can roles be injected?" but "how do we review and tighten worker behavior?"

Update after paper review later the same day:

- the North Star direction is confirmed
- the next operational improvement is not "more agents" but sharper worker/reviewer behavior
- near-term order is now:
  - harden `worker.json` with a visible execution loop
  - harden `reviewer.json` with a fixed review matrix and pre-accept checks
  - then build `CEO V1`

## 1.1 Outcome reached after this report was started

The originally planned next step in this report was "start Packet 3."

That is no longer the correct live state.

Since then, the team completed the first real Worker-role proof in production-like conditions:

- a new Gemini worker agent was created from the dashboard
- the canonical `worker` role template was assigned in the UI
- an operator append prompt was added
- an issue was assigned through the normal issue flow
- the role prompt was injected automatically into the Gemini run
- the run executed in a safe non-customer repo/worktree
- the agent completed the task and created the requested file

The successful proof run was:

- `720183d5-38f4-4407-a6c9-f09e5b6b9522`

This changes the interpretation of the whole role-template effort:

- before: "promising architecture and smoke-test path"
- now: "end-to-end worker role behavior proven in a real run"

## 1.2 What the successful Worker proof actually showed

The successful run proved more than one thing at once.

### What was proven

- Dashboard -> API -> adapterConfig -> heartbeat role resolution -> Gemini execute path works as one chain
- `roleTemplateId = "worker"` is actually resolved and injected at runtime
- `roleAppendPrompt` is appended and visible in the effective run prompt
- issue assignment can trigger a real worker run when `wakeOnDemand` is enabled
- quota-aware routing still works with role injection enabled
- the worker produced the requested artifact in the target repo
- `read_file` evidence fallback still works inside the role-based flow

### What was chosen by the engine

For the successful worker proof, the engine behavior was sensible:

- thinking/routing model: Flash-Lite router path
- execution bucket: `flash`
- execution model: `gemini-3-flash-preview`
- task type: `bounded-implementation`
- risk: `low`
- approval: not required

This was aligned with the actual task shape: a short bounded documentation task with limited scope and low risk.

### What still needs tightening

The worker was good, but not yet perfect.

The generated result showed slight scope drift:

- in the last section it referenced `GEMINI.md`, even though that file was not in the explicitly allowed source list

That matters because it confirms the next real need:

- not more role-template theory first
- but a reviewer/checking layer that can verify whether the worker stayed inside allowed evidence and packet scope

## 1.3 Important implementation learnings from the successful proof

The successful role run also clarified some practical operational truths.

### Sandbox learning

The first attempt to run the worker role did not fail because of the role system.
It failed because Gemini sandbox execution on the local machine required a sandbox command that was not available.

For the successful proof run, the practical decision was:

- use `sandbox=false` for this test agent
- keep safety through the safe repo/worktree and dedicated test branch

This was the right short-term move.
It avoided blocking the proof on local sandbox infrastructure while still protecting customer code.

### Wake-on-demand learning

Issue assignment only becomes a real "employee workflow" if the assigned agent can actually wake on assignment.

That led to a direct product improvement:

- new agents now default to `wakeOnDemand=true`

Without that change, assignment could silently save while no run actually started.

### Workspace safety learning

During setup, it became clear that the issue's project workspace was accidentally pointing at a live customer repo rather than the intended safe test repo.

That was corrected before the successful run.

This was an important reminder:

- a good worker role is not enough
- project/workspace resolution must also be trustworthy, or agent success becomes dangerous

## 2. Starting Point

At the start of this phase, the most important engine foundations were already in place and proven.

### Proven engine baseline

The repo had already reached a meaningful engine milestone:

- Engine Thinking Layer was active and proven in a real run
- Flash was established as the current engine thinking model
- model override via `applyModelLane` worked
- context injection for `doneWhen`, `executionIntent`, and `targetFolder` worked
- token caps were treated as warnings, not hard run killers
- issue-based run triggering via `PATCH /api/issues/{id}` was the intended path

This mattered because it meant DGDH was no longer operating with a dumb execution pipe.
The system could already:

- inspect a task
- choose a model lane
- inject execution framing
- and run with real quota-aware routing

That is the moment where the engine stopped being purely conceptual.

## 3. What We Developed In This Session

### 3.1 We clarified the DGDH North Star around approval and work packets

One of the biggest tensions in the current system was the mismatch between:

- the desire for governance
- and the reality that micro-approvals were dragging David back into routine operations

We clarified and documented that the intended DGDH direction is:

- Heartbeat is an execution pulse for an already authorized work packet
- normal bounded tasks should run without manual approval
- David should not become a click-dispatcher for tiny work decisions
- later governance should be a smarter reflection layer for genuinely critical cases

This direction was written into:

- `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
- `MEMORY.md`

This was not cosmetic documentation.
It changed how the system should be interpreted:

- governance must protect David from damage
- governance must not force David to manually babysit ordinary execution

### 3.2 We disabled routine approval gating in the runtime path

Once the direction was clear, the runtime behavior was brought back in line with it.

The old `needsApproval` flow was too eager.
It could stop small bounded tasks even when they were exactly the kind of work DGDH wants agents to do autonomously.

We changed that behavior.

#### Code changes

In `server/src/services/gemini-control-plane.ts`:

- `needsApproval` was effectively neutralized for the current normal execution path

In `server/src/services/heartbeat.ts`:

- the live routing-gate approval path that parked runs in `awaiting_approval` was removed from the active flow

This means:

- routine runs should execute directly
- the approval infrastructure still exists as a concept
- but it is no longer allowed to block the team on small work

#### Why that mattered

Without this change, the system contradicted the North Star.

Instead of:

- mission
- packet
- agent executes

the actual behavior was drifting toward:

- mission
- routing
- David clicks approve
- tiny task runs

That is not operational relief.
That is bureaucracy with AI wrapped around it.

### 3.3 We investigated a real trust problem in Gemini tool evidence

After approval friction was removed, a real Gemini issue surfaced.

A run completed successfully, but the `read_file` tool events in the log had:

- `status: success`
- `output: ""`

This was important because DGDH needs to trust not just that a run "looks good", but that it actually consumed the intended evidence.

If an agent says it read source files but the event log shows empty tool outputs, then one of two bad things is true:

- the logging layer is lying by omission
- or the agent is synthesizing without auditable source evidence

Either way, that is a serious control-plane weakness.

### 3.4 We verified the issue was in the streamed Gemini tool output, not only in UI

We checked the raw run data, not just the frontend.

The important conclusion was:

- the empty `read_file` results were already present in the raw streamed Gemini event data
- therefore this was not just an Approval page issue or transcript rendering issue
- the observability gap was real

This was a turning point because it shifted the problem from:

- "maybe the UI is incomplete"

to:

- "the control plane currently cannot prove that source files were actually read"

### 3.5 We added deterministic `read_file` evidence fallback in the server

To fix that trust gap without adding extra model tokens, we implemented server-side evidence fallback.

When Gemini emits:

- a `tool_use` for `read_file`
- followed by a `tool_result` with empty output

the server now:

- remembers the referenced file path
- reads the file itself from the active workspace
- emits a structured `tool.evidence` event

The evidence payload includes:

- relative path
- byte count
- sha256 hash
- short preview

This was implemented in:

- `server/src/services/heartbeat.ts`

#### Why this was the smart fix

It was cheaper and more robust than asking the model to "summarize what it read" after every file access.

That alternative would have been worse because:

- it spends more tokens
- it still relies on model narration instead of tool-grounded evidence
- it is less deterministic

The chosen fix aligned with DGDH's needs:

- cheap
- auditable
- deterministic
- useful for later reviewer/governance layers

### 3.6 We discovered a second real bug: prompt path corruption

After evidence logging was fixed, another problem became visible.

A later run failed with:

- `File not found.`

The important part was not the tool failure itself, but why it happened.

The prompt handed to Gemini contained corrupted file references such as:

- `OM\_CANON.md`

Gemini then interpreted those as broken paths like:

- `OM/_CANON.md`

This means the failure was not primarily "the model being dumb."
The system handed the model malformed path text.

### 3.7 We fixed issue text normalization to stop broken escaped paths

The root cause was prompt/input rendering.

We updated `trimIssueText(...)` in:

- `server/src/services/heartbeat.ts`

so that issue text is normalized more aggressively before reaching the agent.

The normalization now handles:

- common HTML entities
- markdown escaping like `\_`, `\.`, and similar patterns

This restored clean file path text in the final assignment prompt.

#### Why this mattered

A control plane cannot expect robust agent behavior if it hands agents broken task text.

This fix made the system more honest:

- if the task text is intended to say `OM_CANON.md`
- then the agent now actually receives `OM_CANON.md`

### 3.8 We re-ran the OM mission brief task and verified both fixes in reality

The next run showed the combined result of both fixes:

- the prompt paths were correct
- Gemini used the intended relative repo paths
- the `read_file` outputs were still empty from Gemini's side
- but the new server-side `tool.evidence` events appeared correctly

That gave us a meaningful verification point:

- prompt corruption fixed
- evidence fallback working
- routing still healthy
- task completed successfully

This was one of the most valuable moments in the session because it proved the fixes were not only theoretical.

## 4. What We Tested

This phase included both code-level verification and real-run verification.

### 4.1 Typechecks and targeted tests

The following checks were run successfully after the no-routine-approval changes:

- `pnpm --filter @paperclipai/server typecheck`
- `pnpm exec vitest run src/__tests__/gemini-control-plane-resolver.test.ts src/__tests__/agent-state-truth.test.ts src/__tests__/dgdh-engine-defaults.test.ts`

This verified that the server-side policy changes did not immediately break the targeted engine/control-plane tests that were updated alongside them.

Additional successful checks during the session:

- `pnpm --filter @paperclipai/server typecheck` after the `read_file` evidence work
- `pnpm --filter @paperclipai/server typecheck` after the path-normalization fix
- `pnpm --filter @paperclipai/ui typecheck` and `pnpm --filter @paperclipai/server typecheck` were also previously green when the human-readable approval UI change was introduced earlier in the chain

### 4.2 Real run inspections

We looked at real runs instead of trusting only tests.

Important inspected runs:

- `4afa31a6-4b57-405f-8079-6c834316d965`
  - showed that routing/model choice was sensible
  - revealed empty successful `read_file` outputs in raw run logs

- `0a9d5153-ce3c-49a0-958c-6e0fe5b1ce73`
  - showed the prompt/path corruption problem directly
  - `read_file` returned visible `File not found` results

- `7ccb2733-c993-40b5-9828-79172b463ff0`
  - verified corrected file paths
  - verified `tool.evidence` events for the source files
  - confirmed that the run became much more trustworthy

These run inspections were critical because they tested the actual system behavior, not just compile-time expectations.

## 5. What We Learned About The Current Engine

By the end of this phase, the engine looked meaningfully stronger than at the beginning.

### 5.1 What is now true

The current Gemini-oriented engine can now:

- route a run with real task understanding
- choose a model lane against quota conditions
- inject operational execution framing
- run without micro-approval blocking normal tasks
- preserve evidence when Gemini leaves `read_file` outputs empty
- avoid malformed escaped-path prompts in common assignment flows

That is a real step up from "agent runner plus vibes."

### 5.2 What is still missing

Even with the engine improvements, the system still lacks a higher-order work structure.

Specifically:

- no true CEO role yet
- no true worker/reviewer split yet
- no reliable review layer for `doneWhen`
- no durable role identity beyond weak DB-style role semantics

This means the engine is becoming good at preparing and executing runs, but the company layer above the run is still underdeveloped.

That is exactly why the next step changed.

## 6. Why We Now Need Roles

This is the most important conclusion of the whole session.

The next bottleneck is no longer mainly "make routing smarter."
The next bottleneck is:

- who plans the work
- who executes the work
- who checks the work

### 6.1 The engine is not the CEO

One of the most important architectural clarifications in the North Star is:

> The engine thinks about the run. The agent thinks about the task.

This means:

- the engine should choose model, budget, context, and guardrails
- but the engine should not become the place where mission decomposition lives

If we keep stuffing planning intelligence into the engine, two bad things happen:

- the infrastructure becomes overcomplicated
- the actual company roles remain vague and weak

DGDH does not need an ever more baroque router.
It needs its first real operating roles.

### 6.2 DGDH needs digital employees, not just stronger prompts

The current system is reaching the point where stronger routing alone gives diminishing returns.

What DGDH needs next is a stable loop like this:

- David gives mission
- CEO converts mission into work packets
- Worker executes one packet
- Reviewer checks against `doneWhen`
- CEO decides next step

That is not just prompt engineering.
That is the beginning of an actual operating model.

### 6.3 Why free `role` labels are not enough

The existing Paperclip-style role concept is too weak for this purpose.

A free DB field like `role = "CEO"` is not enough because:

- it is not durable
- it is not versioned
- it is not specific enough
- it can disappear with DB state
- it does not encode operational boundaries

For DGDH, a role has to mean:

- purpose
- scope
- constraints
- output pattern
- escalation behavior

That is why we moved toward canonical role templates.

### 6.4 Why this follows naturally from what we just built

This role push is not a random new idea.
It is the direct result of the engine maturing.

Once the engine can:

- route
- frame
- guard
- and execute reliably

the next missing layer is not more execution plumbing.
It is the company structure above the plumbing.

In other words:

- the engine now has enough intelligence to support roles
- but the roles do not yet have enough definition to use that engine properly

That is the gap we are now closing.

## 7. What We Defined For The New Role Direction

We documented the role-template architecture in:

- `doc/plans/2026-03-21-role-template-architecture.md`

### 7.1 Packet 1 outcome

We defined the first technical role-template system direction:

- canonical templates should live in repo files
- recommended location: `server/config/role-templates/`
- JSON is the preferred first format
- the minimal runtime fields should be:
  - `roleTemplateId`
  - `roleTemplateVersion`
  - `roleAppendPrompt`

We also defined:

- canonical role identity must not be mutable by the agent itself
- the operator append prompt extends the role but does not replace it
- DB assignment and canonical role meaning must stay separate

### 7.2 Packet 2 outcome

We defined the first three canonical DGDH roles:

- `CEO`
- `Worker`
- `Reviewer`

For each of them we documented:

- core purpose
- allowed operating mode
- forbidden behavior
- expected output pattern
- escalation behavior

The important point is that these are not generic "AI personalities."
They are the first draft of actual digital employees for DGDH.

## 8. Why These Three Roles Specifically

These are the right first three because together they create the minimum useful operating loop.

### CEO

Needed because mission decomposition is currently too dependent on David.

The CEO role exists to:

- take a bigger objective
- make it legible
- split it into packets
- decide what should happen next

This is the role that gives DGDH leverage instead of just agent output.

### Worker

Needed because execution must stay bounded.

The Worker role exists to:

- take one packet
- complete it honestly
- avoid strategic drift
- produce a concrete result

This is the role that turns planning into artifacts.

### Reviewer

Needed because `doneWhen` is currently framing, not actual acceptance.

The Reviewer role exists to:

- inspect what the worker produced
- compare it to packet intent
- return an operational verdict

This prevents "agent said it is done" from being the same thing as "the work is actually good."

### Together

Together these roles form the first real DGDH loop:

- intent
- packetization
- execution
- acceptance
- next decision

That is the first shape that starts to resemble a company instead of a collection of isolated runs.

## 9. Strategic Interpretation

The biggest strategic shift in these hours was this:

At first the center of gravity was still in the engine.
By the end of the session, the center of gravity had moved upward.

The engine is now good enough that the main missing thing is no longer:

- "Can Gemini be routed smartly enough?"

The main missing thing is now:

- "Can DGDH define and run its first stable roles well enough?"

That is a healthier place to be.

It means:

- the infrastructure is maturing
- the company layer can now become the primary design surface

## 10. Recommended Next Step

The smartest immediate continuation after this report is not full Packet 3.

It is a minimal smoke-test:

- create a first `worker.json`
- inject its `systemPrompt` into a real Gemini run
- give it one real bounded task
- compare behavior against a non-role-guided baseline

Why this is the right next move:

- it is the shortest path to proof
- it tests whether role identity improves execution before backend plumbing is built
- it can falsify the role idea early if the prompt design is weak

If that smoke-test succeeds, then Packet 3 becomes justified:

- add minimal backend support for
  - `roleTemplateId`
  - `roleTemplateVersion`
  - `roleAppendPrompt`

If the smoke-test does not produce a clear gain, role content should be revised before schema or UI work expands.

## 11. One-Sentence Summary

In the last hours, DGDH moved from "the Gemini engine can think and route" to "the engine is now strong enough that the next real bottleneck is defining the first durable digital employee roles: CEO, Worker, and Reviewer."
