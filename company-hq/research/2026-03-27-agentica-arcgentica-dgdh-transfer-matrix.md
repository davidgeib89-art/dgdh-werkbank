# Research: Agentica / ARCgentica -> DGDH Transfer Matrix

Date: 2026-03-27
Context: First-principles DGDH reading of `symbolica-ai/agentica-python-sdk`, `symbolica-ai/arcgentica`, and the public ARC-AGI-3 benchmarking harness.
Trigger: Use as a later research-lab and translation filter. Do not treat this as the next core integration sprint or as a new company center of gravity.

## 1. Kurzurteil

Agentica matters to DGDH less as a stack to adopt and more as proof that stateful, code-first agent execution can be dramatically stronger than a naked model call on interactive tasks.

The wrong question is:

> "Should DGDH import Agentica now so we become AGI faster?"

The right question is:

> "Which parts of Agentica's execution model reduce reconstruction, wrapper-slop, and supervision in ways that translate into the DGDH firm loop?"

ARCgentica is especially useful here because it shows what a highly agentic, stateful, code-executing harness looks like under benchmark pressure. That makes it a good architecture lab, not a direct product blueprint for DGDH.

## 2. Which assumptions sit behind the Agentica / ARCgentica story

### A. Stateful execution beats stateless prompt reconstruction

Agentica assumes agents should keep live state, lifecycle, and execution continuity rather than repeatedly rebuilding intent from chat text and tool outputs.

### B. Direct object references are better than wrapper-heavy tool schemas

The SDK is built around passing functions, classes, live objects, and SDK references directly into the agent runtime instead of translating everything into separate MCP-style wrappers or brittle schemas.

### C. Code execution is a core primitive, not an auxiliary trick

ARCgentica treats writing and running Python as a normal reasoning primitive for solving tasks, not as an exceptional fallback.

### D. Sub-agent delegation should be natural and state-aware

Agentica assumes nested or delegated agents should share sharply scoped context without requiring heavy orchestration DSLs or a lot of explicit message glue.

### E. Benchmark performance can reveal useful architecture truths

The ARC work assumes that strong results on interactive exploration tasks can expose real design advantages in state, planning, delegation, and execution.

## 3. What remains fundamentally, provably true after removing the hype

### Truth 1. Stateful execution can reduce reconstruction

If an agent can keep a real working context, it may spend less effort re-reading, re-planning, and re-deriving what it already discovered.

That maps directly onto DGDH pain:
- repeated repo archaeology
- repeated prompt reconstruction
- repeated shell / API rediscovery

### Truth 2. Direct primitives are often cheaper than wrapper stacks

Passing a live function or object can be much cleaner than forcing everything through broad, schema-heavy tool surfaces.

For DGDH this reinforces a direction already visible in the native `paperclipai` primitive cuts:
- fewer generic shell / HTTP detours
- more capability-native execution
- less wrapper prose

### Truth 3. Some agent work is code-shaped rather than chat-shaped

ARCgentica makes the strongest case for this:
- generate code
- run code
- inspect result
- iterate

That does not mean all DGDH work should become code execution, but it does strengthen the later idea that some operation-shaped tasks belong in bounded execution capsules rather than in conversational tool loops.

### Truth 4. Benchmark harness wins are not the same as firm-loop wins

ARC-AGI-3 is explicitly a developer harness for benchmarking agentic workflows on an interactive corpus.
That makes it useful for architectural thinking, but not automatically the right north star for a governed human-AI firm.

### Truth 5. More agentic power is only good if supervision does not explode

DGDH's real filter still holds:

> Does this save David minutes on a real firm run, or does it create a stronger-looking system that needs even more supervision?

## 4. What seems strongest for DGDH specifically

### A. Stateful execution capsule

This is the clearest transferable idea.

DGDH already has partial equivalents:
- same-session resume
- verified skills
- explicit skill -> run bridge

Agentica strengthens the case that a later bounded `stateful-execution-capsule-v0` could be valuable for some paths.

### B. Live primitive brief instead of wrapper-slop

Agentica's direct function / object orientation reinforces a DGDH lesson:

> capability-native primitives beat broad indirection when the operation is already well understood.

This is aligned with:
- native `paperclipai` primitives
- skill briefs
- explicit verified capability references

### C. Bounded subagent state handoff

This is interesting, but only if it remains governance-friendly.

The translation question for DGDH is not "how do we let agents spawn lots of agents?"
It is:

> "How do we make CEO -> Worker -> Reviewer handoffs carry the smallest sufficient working state without re-bloating prompt context or multiplying supervision?"

## 5. What is benchmark-specific and should not be overread

### A. ARC rewards exploration-heavy, interactive solving

That makes state, retries, code execution, attempts, and parallelism unusually valuable.

### B. ARCgentica carries benchmark harness mass

The repo uses:
- multiple attempts
- retries
- many sub-agents
- high concurrency
- result aggregation

Those are real strengths for a benchmark harness, but not obviously the next best thing for DGDH's current firm-loop economics.

### C. High benchmark scores do not automatically mean better firm operations

A system can be excellent at interactive puzzle-solving while still being too heavy, too supervision-hungry, or too benchmark-specific for a real governed company loop.

## 6. Transfer matrix

| Pattern | DGDH timing | Verdict |
| --- | --- | --- |
| Stateful execution instead of repeated reconstruction | Soon | Strong principle |
| Direct capability primitives instead of wrapper-heavy indirection | Now | Strong principle already reinforced |
| Bounded subagent handoff with sharper state cut | Soon | Likely useful, but must stay governable |
| Code-first execution for some operation-shaped tasks | Later | Plausible research direction |
| Benchmark harness as architecture lab | Now | Good research use |
| ARC score chasing as company priority | Not now | Wrong center of gravity |
| Importing Agentica as a second production runtime | Not now | Too heavy, wrong phase |
| Copying ARCgentica's benchmark harness form into DGDH core | Not now | Benchmark-form mismatch |

## 7. Concrete DGDH promotions from this research

### Promote now

1. Keep hardening native capability primitives over generic shell / wrapper paths.
2. Keep treating state retention and anti-reconstruction as a first-class design goal.
3. Read stateful execution as reinforcement for same-session resume, verified skills, and explicit skill -> run bridging.

### Put in the later backlog

1. `agentica-translation-spike-v1`
2. `stateful-execution-capsule-v0`
3. `live-primitive-brief-v0`
4. `bounded-subagent-state-handoff-v0`

### Explicitly do not promote now

1. Agentica core integration into the main DGDH runtime
2. A second permanent Python agent stack beside the current core
3. ARC-AGI optimization as the company north star
4. "We build AGI now" as a planning frame

## 8. Suggested future spike shape

If DGDH studies this further, the right next research cut is:

`agentica-translation-spike-v1`

DoneWhen:
- one short principles note
- one tiny local repro or a justified stop
- one `Agentica -> DGDH` translation note
- one verdict per idea:
  - adopt
  - later
  - do not adopt
- one sentence per idea:
  - does it save David minutes or not?

## 9. One-sentence DGDH verdict

Agentica and ARCgentica matter to DGDH because they prove that stateful, direct, code-capable agent execution can unlock big gains on interactive tasks, but for DGDH they should currently serve as a translation lab for sharper state, primitives, and handoffs, not as a new production core or an AGI-chasing identity shift.
