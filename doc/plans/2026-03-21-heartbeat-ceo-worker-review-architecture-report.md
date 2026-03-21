# Heartbeat, CEO, Worker, Review: DGDH Architecture Report

Date: 2026-03-21
Author: Codex
Status: Deep-research analysis, no production code changed

> Superseded for daily guidance by `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`.
> Dieses Dokument bleibt als Detailanalyse erhalten; die operative Leitlinie steht jetzt im North-Star-Dokument.

## 1. Executive Summary

Your target model is coherent for DGDH:

- David stays the human principal and final authority.
- Gemini becomes the first real production lane because quota is cheapest and resets every 24h.
- In expansion stage 1, it is correct to optimize for Gemini first and treat Claude/Codex as later lanes, not equal rollout priorities.
- Inside that Gemini lane, you want role separation:
  - a planning/delegation CEO agent on `Gemini Pro`
  - one or more worker agents for bounded execution
  - a reviewer/review-assistant agent that checks outcome quality before the CEO decides next steps

The important finding is this:

- Paperclip already has enough primitives for a first controlled version of this.
- Paperclip does not yet have a real CEO orchestration system.
- The current heartbeat model is too low-level to be the main abstraction for your company.
- The real domain abstraction you need is: `mission -> work packets -> issue graph -> specialized agents -> review gates -> CEO decision`.

In other words:

- Heartbeats should become the transport/execution pulse.
- Issues/work packets should become the governed unit of work.
- The CEO should not "wake up and freestyle".
- The CEO should operate on a queue of governed packets and create/delegate sub-packets intentionally.

So your intuition is right:

- "Paperclip is still a bit dumb" is accurate.
- It is not dumb because it lacks agents or heartbeats.
- It is dumb because orchestration is still mostly sequential and issue-centric, not mission-centric and manager-centric.

## 2. Direct Answer To The Heartbeat Question

### Recommended DGDH answer

A heartbeat in your company should **not** mean:

- "agent wakes up and thinks what it wants"
- "agent scans broadly for opportunities"
- "agent starts work without packet context"

A heartbeat in your company **should** mean:

- "the control plane grants one bounded execution slice"
- "the agent continues one assigned packet or one explicitly approved follow-up"
- "the run is resumable, attributable, budgeted, and stoppable"

So the target definition is:

> A heartbeat is a governed execution slice for one already-authorized work packet, not a generic autonomy loop.

That fits your Mensch-Maschine-Symbiose vision much better than the inherited generic scheduler model.

## 3. What Paperclip Already Supports Today

### 3.1 Org structure and manager lines exist

The current data model already supports hierarchy:

- Agents have a `role` and `reportsTo`.
- `ceo` is already a first-class role.
- Org trees and chain-of-command can already be derived.

Evidence:

- `packages/shared/src/constants.ts` defines role `ceo`.
- `packages/db/src/schema/agents.ts` stores `reports_to`.
- `server/src/services/agents.ts` implements `orgForCompany()` and `getChainOfCommand()`.
- `server/src/__tests__/invite-join-manager.test.ts` shows the system already prefers a root CEO where available.

This means:

- A CEO/worker tree is already structurally possible.
- The missing part is not the hierarchy itself.
- The missing part is what the CEO actually does with that hierarchy.

### 3.2 Single-assignee task execution is real and fairly solid

Issues already behave like bounded execution units:

- single assignee only
- atomic checkout semantics
- explicit `in_progress`
- run locks via `checkoutRunId` and `executionRunId`
- request depth already exists for delegated work lineage

Evidence:

- `packages/shared/src/types/issue.ts` contains `assigneeAgentId`, `checkoutRunId`, `executionRunId`, and `requestDepth`.
- `server/src/services/issues.ts` enforces one assignee and `in_progress` requiring an assignee.
- `doc/SPEC-implementation.md` explicitly says single assignee and atomic checkout are required.

This is good news:

- Your future CEO does not need a brand-new work system.
- It can build on issues/work packets.
- But issues need to become more explicitly "delegation packets" and less like generic tickets.

### 3.3 Heartbeat runtime is already resumable and queue-aware

The runtime already has useful execution mechanics:

- per-agent queued/running run management
- task-key based session reuse
- coalescing of same-scope wakes
- deferred issue execution behavior
- per-agent concurrency control

Evidence:

- `server/src/services/heartbeat.ts` derives `taskKey`, `issueId`, and `workPacketId`.
- Same-scope wakes are coalesced.
- Issue execution can be deferred instead of duplicated.
- `startNextQueuedRunForAgent()` uses `maxConcurrentRuns`.

This means:

- Paperclip is not hardcoded to "one process in the whole company".
- It is closer to "one controlled queue per agent".
- Parallelism across multiple agents is possible in principle.

But:

- There is no higher-level planner deciding packet fan-out.
- There is no packet DAG or mission graph.
- There is no native "CEO creates 5 child packets and tracks them as a batch".

### 3.4 Governance pieces already exist

You already have a surprisingly good governance base for your vision:

- autonomy modes
- task brief template
- escalation matrix
- budget classes and hard caps
- idle policy
- approval service

Evidence:

- `company-hq/AUTONOMY-MODES.md`
- `company-hq/TASK-BRIEF-TEMPLATE.md`
- `company-hq/ESCALATION-MATRIX.md`
- `company-hq/BUDGET-POLICY.md`
- `company-hq/IDLE-POLICY.md`
- `company-hq/AGENT-CONSTITUTION.md`

And there is real enforcement work in runtime:

- governed sources require a `workPacketId`
- Phase B requires checkpoint approval
- hard token cap logic exists
- blocked and approval-needed routing states exist

Evidence:

- `server/src/services/heartbeat.ts`
- `server/src/__tests__/heartbeat-governance.test.ts`

This is the strongest foundation you already have.

## 4. What Paperclip Explicitly Does Not Yet Do Well Enough

### 4.1 There is no real autonomous CEO orchestration loop yet

The spec talks about a CEO:

- strategy proposal
- delegation
- board communication
- cascading structure

Evidence:

- `doc/SPEC.md` describes a default CEO and delegation hierarchy.
- `doc/SPEC-implementation.md` includes CEO strategy approval flow.

But the running system today does not implement a real CEO planner runtime.

What exists today is mostly:

- role labels
- org structure
- approvals
- issue assignment

What does not exist yet:

- CEO mission intake
- automatic decomposition of a complex request into child packets
- delegation planning across multiple agents
- portfolio-level progress review by a manager agent
- packet fan-out/fan-in orchestration

Conclusion:

- CEO is currently a structural role, not yet a real orchestrator behavior.

### 4.2 Heartbeats are still too generic for DGDH

Older runtime docs still describe heartbeats as a generic autonomous loop:

- timer
- assignment
- on-demand
- automation

Evidence:

- `doc/spec/agents-runtime.md`

That model is too broad for your current company phase because it encourages "wake and roam" behavior.

Your current governance docs already move in the opposite direction:

- no self-tasking without approved backlog
- one run one work packet
- idle means idle

Evidence:

- `company-hq/AGENT-CONSTITUTION.md`
- `company-hq/IDLE-POLICY.md`
- `company-hq/AUTONOMY-MODES.md`

This is an important mismatch:

- the inherited Paperclip heartbeat concept is broad
- the DGDH operating model is narrow and packet-driven

That mismatch is exactly why heartbeats feel wrong right now.

### 4.3 Approval model is still incomplete for your future org

Shared constants only declare:

- `hire_agent`
- `approve_ceo_strategy`

Evidence:

- `packages/shared/src/constants.ts`

But runtime already creates a third approval type:

- `routing_gate`

Evidence:

- `server/src/services/heartbeat.ts` creates approval `type: "routing_gate"`
- `server/src/routes/approvals.ts` already contains follow-up handling for `routing_gate`

This is a real architectural smell:

- implementation has grown beyond the shared contract
- the approval vocabulary is no longer fully synchronized

For your future CEO/worker/reviewer system, you will likely need more approval classes anyway, for example:

- mission approval
- packet scope expansion
- external publish/deploy approval
- client-facing handoff approval
- review exception approval

### 4.4 Review exists as a concept, not yet as a dedicated organizational loop

Current routing/control-plane already understands review intent:

- execution intent can be `review`
- routing can mark `needsApproval`
- runs can land in `awaiting_approval`

Evidence:

- `server/src/services/gemini-control-plane.ts`
- `server/src/services/gemini-routing.ts`
- `server/src/services/heartbeat.ts`

But this is not the same as having a reviewer agent lane.

Missing pieces:

- reviewer role profile
- review packet type
- structured review checklist/evidence contract
- CEO receiving review results as a first-class workflow
- "worker done -> review agent -> CEO decides" as a native run pattern

Today, review is mostly:

- a property in routing / governance
- not a company operating loop

### 4.5 Multi-agent parallel work is possible mechanically, but not orchestrated intelligently

You said the important future is smart parallel work, not everything sequentially.

Current status:

- multiple agents can exist
- each agent can have queued/running work
- per-agent concurrency is configurable

But missing:

- dependency graph between child packets
- fan-out planning
- fan-in merge stage
- parallel packet scheduler with priorities and shared budget awareness
- lane-aware CEO decisioning such as "run 3 workers in parallel, then 1 reviewer"

So the truth is:

- parallel execution substrate: partly there
- intelligent orchestration: not there yet

## 5. Biggest Policy Conflict You Need To Resolve

Your current docs still say:

- David is the CEO
- no autonomous CEO agent

Evidence:

- `company-hq/VISION.md` says `No autonomous CEO agent: David is the human CEO.`

At the same time, the product spec and runtime structure clearly support a CEO agent concept.

And your new idea is now:

- David remains final authority
- but inside Paperclip there should be a Gemini CEO agent as planner/delegator

My recommendation is:

- keep David as human CEO and final authority
- rename the machine role concept mentally to `Operations CEO`, `Mission Manager`, or `Executive Agent`
- or explicitly document:
  - `Human CEO = David`
  - `AI CEO = operational delegation layer under David`

That avoids conceptual confusion.

Right now the docs conflict with your intended operating model.

This is not a code blocker.
It is a governance clarity blocker.

## 6. Recommended DGDH Model

### 6.1 Role model

For your next stage, the cleanest shape is:

1. `David`
   - final authority
   - approves mission-level work and risky operations
   - gives high-level Auftrag

2. `Gemini CEO`
   - uses `Gemini Pro`
   - transforms Auftrag into mission packets
   - creates or updates child issues
   - chooses which agents should do what
   - decides next action after review

3. `Gemini Worker`
   - uses mostly Flash / Flash-Lite unless escalated
   - executes bounded implementation/research/content packets
   - writes artifacts, comments, evidence

4. `Gemini Reviewer`
   - specialized review and acceptance checking
   - validates goal achievement, content quality, file correctness, regressions
   - reports structured acceptance verdict back to CEO

This gives you the symbiosis you want without pretending the machine is the ultimate authority.

### 6.2 Operating model

The right operating chain for DGDH is:

1. David gives one mission
2. CEO agent parses and scopes it
3. CEO agent creates governed child packets
4. Worker agents execute child packets
5. Reviewer agent checks outputs against packet brief
6. CEO agent decides:
   - accept
   - request revision
   - escalate to David
   - spawn next child packet

That is much better than "heartbeat timer wakes random worker".

## 7. How Your Example Auftrag Should Flow

Example:

> Gemini, du kennst Kunde Bamberger, geh mal in den Ordner Shared, da hab ich neue Bilder und Texte, researche ueber den Kunden und befuelle mein Astro + Keystatic Git des Kunden mit tollen Texten, Bildern und Daten, bereite alles so vor, dass es abnahmefaehig fuer den Kunden ist.

### 7.1 What the CEO should do first

The CEO agent should convert that into a mission with explicit packets such as:

- packet 1: inspect customer repo and content structure
- packet 2: inspect `Shared` folder assets and classify material
- packet 3: research customer identity, market, tone, proof points
- packet 4: draft page/content plan for Astro + Keystatic
- packet 5: implement content and media integration
- packet 6: review for acceptance readiness

### 7.2 Which parts can later run in parallel

Parallelizable:

- asset inspection
- customer research
- current site/repo inspection

Sequential after that:

- content plan synthesis
- actual repo population
- review

This is exactly why you need:

- CEO planning
- packet graph
- specialized worker/reviewer roles

and not just more generic heartbeats.

## 8. What Is Missing To Reach That State

### 8.1 A first-class work packet model in implementation

You already have packet language in governance docs and runtime context.
But it is still mostly a context field, not a full domain object.

What is missing:

- first-class persisted work packet entity or a stricter issue-as-packet convention
- parent/child packet semantics
- packet dependency status
- packet evidence schema
- packet review outcome schema

Current state:

- `workPacketId` exists in context and governance checks
- but not yet as a rich company object

### 8.2 CEO planner behavior

Missing:

- mission intake prompt/contract
- packet decomposition rules
- delegation heuristics
- budget distribution rules
- review routing rules

Today, Flash-Lite routing chooses model/bucket for a run.
That is useful, but it is not the same thing as company-level planning.

### 8.3 Dedicated review loop

Missing:

- review packet templates
- acceptance criteria normalization
- reviewer evidence output contract
- CEO-side consumption of review verdicts

### 8.4 Parallel orchestration semantics

Missing:

- packet dependency graph
- child-packet fan-out and fan-in
- shared mission status
- result aggregation back to CEO
- "wait for all / continue with subset / retry one child" behavior

### 8.5 Smarter context packaging

For token efficiency, the CEO must not resend the whole world every time.

Needed over time:

- mission summary memory
- packet-local context packs
- repo target hints
- artifact references instead of long prompt repetition
- compact review evidence rather than full logs

This is essential for Gemini economics.

## 9. Token-Efficient Interpretation For DGDH

Your quota situation suggests this strategy:

### CEO lane

- model: `Gemini Pro`
- use for:
  - mission decomposition
  - escalation decisions
  - final acceptance decisions
  - non-trivial planning or ambiguity resolution

### Worker lane

- default: Flash or Flash-Lite
- escalate only when packet complexity actually requires it
- execution packets must be narrow and file-targeted

### Review lane

- default: Flash for routine checks
- Pro only for high-stakes review or ambiguous quality judgments

### Principle

Use Pro for decisions.
Use Flash for production throughput.
Use Flash-Lite for cheap routing and triage.

That is fully aligned with your current Gemini routing work.

### 9.1 Reflection On The Smart Engine Direction

After your clarification, I would tighten the recommendation like this:

- build Gemini first
- but do **not** build a Gemini-only architecture
- build a provider-agnostic engine core with provider-specific quota/model adapters

That means your instinct is right:

- later you want a `Claude Engine`
- later you want a `Codex Engine`
- but the real design goal should be one shared `Agent Engine Core`

The provider-specific part should be as small as possible:

- quota ingestion
- model catalog
- provider limits / cooldown semantics
- provider-specific adapter execution details

Everything else should converge:

- mission intake interpretation
- packet decomposition
- risk and approval evaluation
- budget class logic
- work packet enforcement
- execution intent classification
- review routing
- memory retrieval policy
- reflection / self-check structure

So the long-term shape should be:

- `Engine Core`
- `Gemini Provider Module`
- `Claude Provider Module`
- `Codex Provider Module`

not:

- three unrelated agent engines

### 9.2 What The Smart Engine Core Should Actually Contain

The common core should own the logic that expresses "how DGDH thinks about work".

Recommended core responsibilities:

1. `Task Understanding Layer`
   - classify the Auftrag
   - detect ambiguity
   - estimate task shape, risk, and needed artifacts

2. `Work Packet Layer`
   - produce bounded packets
   - define done criteria
   - define evidence and review requirements

3. `Decision Layer`
   - choose execution intent
   - choose planning vs implementation vs review
   - choose whether parallelism is safe
   - choose whether approval is required

4. `Budget Layer`
   - assign budget class
   - enforce hard caps
   - decide whether the current packet deserves expensive reasoning

5. `Provider Routing Layer`
   - map packet requirements onto provider-specific quotas and model lanes
   - this is where Gemini vs Claude vs Codex differences should live

6. `Memory Layer`
   - retrieve only packet-relevant context
   - write compact reusable lessons and run episodes
   - support cross-agent shared context without dumping everything everywhere

That is the right place to be "smart".
Not in the heartbeat itself.

### 9.3 Reflection On The Router Question: Should Flash-Lite Decide?

Your question is exactly the right one.

My answer is:

- not always
- and probably not as the universal permanent rule

Right now `Flash-Lite decides everything` is useful because it is cheap and gives you movement.
But as a final architecture, it is probably too blunt.

The smarter design is a **tiered decision policy**:

1. `Deterministic guardrails first`
   - obvious hard rules should not require an LLM
   - examples:
     - missing required inputs
     - forbidden target area
     - client-facing publish request
     - high-risk external mutation

2. `Cheap router for routine packets`
   - easy bounded tasks can use Flash-Lite or Flash for routing

3. `Escalated router for ambiguous or high-stakes packets`
   - use a stronger model when the decision itself is consequential

Escalation triggers for the decision layer should include things like:

- packet is large or cross-project
- task is customer-facing
- multi-step delegation is needed
- quality bar is subjective, strategic, or editorial
- confidence is low
- prior attempts failed

So I would not lock yourself into:

- "Flash-Lite always routes"

I would lock yourself into:

- "The engine picks the cheapest model that can make a good routing decision with enough confidence."

That is much smarter and more future-proof.

### 9.4 Recommended Routing Meta-Policy

For DGDH, the clean policy is:

- cheap deterministic checks first
- then low-cost routing if task is obviously routine
- then stronger routing only if ambiguity or stakes justify it

Practical interpretation:

- Worker packet with clear file target and clear done criteria:
  - cheap router is enough

- CEO planning packet:
  - do not use the cheapest router by default
  - this is usually worth better reasoning because a bad plan multiplies downstream waste

- Review packet:
  - router should decide whether cheap review is enough or whether stronger judgment is required

So yes:

- for many CEO/planning decisions, `Flash-Lite` is probably too cheap as the sole judge
- `Flash` may be the better default routing brain
- `Pro` should be used when the decision itself has large downstream cost

### 9.5 Shared Memory: What Exists And Why It Must Be Rethought

There is already a memory/reflection base in the repo, but it is not yet the shared-operational memory you actually want.

What exists today:

- `server/src/services/memory.ts`
  - stores structured memory items
  - hydrates run context across scopes
  - records run episodes

- `server/src/services/reflection.ts`
  - derives reviewable lesson/decision candidates from episodes
  - does not auto-commit

- `server/src/services/governance.ts`
  - governs approval/archive behavior for memory items

- `company-hq/DGDH-GEMINI-ENGINE-V1-2026-03-19.md`
  - already describes memory as wired in but not DGDH-tuned

That is useful groundwork.
But it is still too primitive for the future company model.

Why it is not enough:

- it is mostly per-agent/per-project retrieval
- it is not packet-graph aware
- it is not CEO/worker/reviewer workflow aware
- it does not express mission state cleanly
- it does not yet behave like cross-agent operational memory

For your future system, shared memory should not mean:

- giant shared prompt dump
- broad semantic recall of everything
- freeform autobiographical chat residue

It should mean:

- compact, governed, queryable operational memory

The most important future memory scopes are probably:

- `mission memory`
- `packet memory`
- `project/customer memory`
- `review memory`
- `agent-local working memory`
- `company policy memory`

And the main retrieval rule should be:

> retrieve the smallest useful memory slice that helps the current packet, not the broadest possible history.

### 9.6 Shared Memory Recommendation For Your CEO/Worker/Reviewer Model

I would redesign shared memory around handoff contracts, not around generic recall.

That means:

- CEO writes mission summary memory
- worker reads only mission + packet + target-project slice
- worker writes completion evidence memory
- reviewer reads mission + packet + worker evidence
- CEO reads reviewer verdict + mission state, then decides

This is much smarter than all agents reading all memory.

The right mental model is:

- memory as governed handoff substrate

not:

- memory as universal brain soup

That will save tokens and reduce drift.

## 10. Recommended Heartbeat Redesign For DGDH

### 10.1 What heartbeats should become

Heartbeats should have only three valid company meanings:

1. `continue_assigned_packet`
2. `react_to_explicit_event`
3. `emit_minimal_idle_status`

### 10.2 What should be removed conceptually

Heartbeats should stop meaning:

- broad polling for work
- autonomous repo exploration
- strategic self-direction

### 10.3 Practical DGDH rule

For DGDH, the preferred wake sources should become:

- `assignment`
- `automation` tied to explicit approval/review/system events
- maybe very light `timer` only for idle status or stuck-run recovery

And not:

- broad timer-driven work seeking

This matches your own current conclusion that raw heartbeats without issue context go rogue.

## 11. Concrete Gap Analysis: Today vs. Your Target

### Supported today

- CEO role exists
- hierarchy exists
- workers can be assigned issues
- atomic task ownership exists
- routing and model selection exist
- approval gates exist
- review can be expressed as intent
- multiple agents can run

### Partially supported

- governed work packets
- manager chain
- approval-driven follow-up wakes
- parallelism across agents
- CEO strategy approval idea

### Not yet supported well enough

- real CEO mission planner
- real worker/reviewer operating system
- parent/child packet orchestration
- batch parallel delegation
- structured review workflow
- mission-level memory and aggregation
- smart packet graph scheduling

## 12. Recommended Build Path

### Phase 1: Fix the meaning of heartbeats

Goal:

- Heartbeat is only execution transport.
- No more generic autonomous roaming.

Definition:

- every non-manual production wake must map to a packet
- idle behavior is metadata-only
- timer behavior becomes minimal or disabled

### Phase 2: Introduce CEO packet planning on top of issues

Goal:

- do not invent a giant new subsystem yet
- use issues as temporary packet objects

Add conceptually:

- mission issue
- child execution issues
- review issue
- explicit parent/child chain

### Phase 3: Create three Gemini role profiles

Goal:

- same provider, different behavior contracts

Profiles:

- `gemini-ceo`
- `gemini-worker`
- `gemini-reviewer`

The difference should primarily live in:

- prompt contract
- allowed actions
- budget defaults
- approval rules
- preferred model lane

### Phase 4: Add structured review handoff

Goal:

- worker done is not final
- review becomes a first-class gate

### Phase 5: Add parallel packet fan-out

Goal:

- CEO can delegate independent sub-packets in parallel
- CEO waits on structured summaries, not raw run logs

That is the first real step toward your desired "smart parallel work".

## 13. My Strongest Recommendation

Do **not** try to make heartbeats more autonomous.

Do this instead:

- make heartbeats dumber
- make packets smarter
- make the CEO smarter

That is the clean route for DGDH.

Why:

- autonomy belongs in planning and delegation, not in idle execution loops
- token efficiency comes from bounded context, not from freeform agent wandering
- human-machine symbiosis works best when David gives missions and the system turns them into governed packets

## 14. Key Risks If You Build This Wrong

### Risk 1: pseudo-CEO without governance

If the CEO agent can create unlimited work or widen scope freely, token burn and chaos will explode.

### Risk 2: reviewer is only symbolic

If review is not structurally separated from execution, "done" will mean "worker thinks done", not "goal actually achieved".

### Risk 3: parallelism before packet graph

Parallel work before dependency and aggregation semantics will create noise, duplicate effort, and unclear ownership.

### Risk 4: doc drift

Your current docs still partly encode an older org model.
If you do not update that, the repo will keep fighting your real intention.

## 15. Final Conclusion

Your new direction makes sense.

The right near-term company operating model is not:

- one generic Gemini loop
- or many equal agents

It is:

- David as human authority
- one Gemini CEO planner
- one Gemini worker lane
- one Gemini reviewer lane
- one provider-agnostic smart engine core underneath, with Gemini-specific quota/model modules first
- all governed through bounded work packets

Paperclip can already support the first controlled version of that model.
But it cannot yet support the full intelligent parallel company you are imagining.

To get there, the biggest missing piece is not another adapter or another heartbeat.

The biggest missing piece is:

> a real orchestration layer that turns missions into governed packet graphs and routes them through CEO -> worker -> reviewer -> CEO loops.

The next most important architectural principle after that is:

> keep the engine core shared across Gemini, Claude, and Codex, and keep provider differences pushed down into quota/model provider modules.

## 16. Repo Evidence Used

- `company-hq/VISION.md`
- `company-hq/AGENT-CONSTITUTION.md`
- `company-hq/AUTONOMY-MODES.md`
- `company-hq/TASK-BRIEF-TEMPLATE.md`
- `company-hq/ESCALATION-MATRIX.md`
- `company-hq/BUDGET-POLICY.md`
- `company-hq/IDLE-POLICY.md`
- `company-hq/DGDH-GEMINI-ENGINE-V1-2026-03-19.md`
- `doc/SPEC.md`
- `doc/SPEC-implementation.md`
- `doc/spec/agents-runtime.md`
- `packages/shared/src/constants.ts`
- `packages/shared/src/types/agent.ts`
- `packages/shared/src/types/issue.ts`
- `packages/db/src/schema/agents.ts`
- `packages/db/src/schema/approvals.ts`
- `server/src/services/agents.ts`
- `server/src/services/issues.ts`
- `server/src/services/heartbeat.ts`
- `server/src/services/gemini-control-plane.ts`
- `server/src/services/gemini-routing.ts`
- `server/src/services/memory.ts`
- `server/src/services/reflection.ts`
- `server/src/services/governance.ts`
- `server/src/services/approvals.ts`
- `server/src/routes/agents.ts`
- `server/src/routes/issues.ts`
- `server/src/routes/approvals.ts`
- `server/src/routes/issues-checkout-wakeup.ts`
- `server/src/__tests__/heartbeat-governance.test.ts`
- `server/src/__tests__/gemini-pipeline-e2e.test.ts`
- `server/src/__tests__/invite-join-manager.test.ts`
