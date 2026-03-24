# Research: Cloudflare Dynamic Workers / Code Mode -> DGDH Transfer Matrix

Date: 2026-03-24
Context: First-principles DGDH reading of the Cloudflare "Sandboxing AI agents, 100x faster" idea and the surrounding Code Mode argument.
Trigger: Use as an execution-compression and sandboxing filter. Do not treat it as a Cloudflare platform decision or as the next mandatory sprint.

## 1. Kurzurteil

This matters to DGDH not mainly because it is Cloudflare, but because it attacks a real agent bottleneck:

> too much token burn and too much failure surface from tool orchestration inside the context window

The wrong question is:

> "Should DGDH switch to Cloudflare Dynamic Workers now?"

The right question is:

> "Which parts of our agent work are actually small deterministic programs, and would they become cheaper and more reliable as bounded code execution instead of step-by-step tool conversation?"

## 2. Which assumptions sit behind the Code Mode argument

### A. Tool-chat is a bad default for many agent tasks

The Cloudflare thesis assumes many current agent interactions are inefficient because the model must repeatedly select from large tool surfaces, emit JSON, read intermediate outputs, and keep all of that in context.

### B. Models are already good enough at writing tiny programs

Instead of choosing tools step by step, the model can write a short program that composes several actions locally and returns only the useful result.

### C. The main blocker is safe execution, not raw model intelligence

If model-written code can run in a fast, isolated environment with narrow capabilities, code mode becomes operationally viable.

### D. Typed capability surfaces are better than giant tool zoos

The argument strongly prefers concise TypeScript interfaces over large MCP or OpenAPI surfaces for many cases.

### E. Extremely cheap, ephemeral sandboxes change the design space

If a new sandbox can start in milliseconds and be thrown away per task, it becomes realistic to use one-off execution as a normal agent primitive.

## 3. What remains fundamentally, provably true after removing the hype

### Truth 1. Tool selection inside the context window is expensive

Large tool surfaces cost tokens, create ambiguity, and invite drift. This is especially true when an agent is not doing creative reasoning, but routine multi-step operations.

### Truth 2. Many agent tasks are actually tiny programs

A lot of operations work is not "conversation" at all. It is:
- check state
- call several APIs
- compare outputs
- summarize blocker
- return one verdict

That is program-shaped work.

### Truth 3. Code execution needs a secure, capability-bounded environment

You cannot safely turn model output into executable code without isolation and strict capability control.

### Truth 4. Typed, narrow capability wrappers compress execution

If the model writes against a small, semantically sharp interface, it wastes fewer tokens than when it navigates a zoo of flat tools and verbose schemas.

### Truth 5. Observation and reasoning are healthier when separated

If state capture can happen in a bounded execution layer, the agent can spend more of its expensive cognition on interpretation and decision rather than on reconstructing state from raw steps.

## 4. Why this is relevant for DGDH specifically

This maps directly onto a pain David already feels:

- too many shell checks
- too many API polls
- too much run-state archaeology
- too many intermediate outputs in context
- too much mixing of observation and diagnosis

The core DGDH lesson is:

> Some agent work should later run as bounded execution-compression, not as sequential tool conversation.

That is especially plausible for:
- runtime truth checks
- run-state validation
- evidence collection
- Git/API/process reconciliation
- blocker detection
- operator truth summarization

## 5. Concrete DGDH candidates for this idea

Good later candidates:

1. `verifyCanonicalRuntime`
   - expected worktree
   - expected instance
   - expected branch
   - health / banner / company proof

2. `collectRunEvidence`
   - issue
   - active run
   - company-run-chain
   - PR / merge facts
   - freshness

3. `detectFirstRealBlocker`
   - compare issue status, run status, chain status, and truth sources
   - emit one blocker-oriented summary

4. `compareBrowserVsApiVsGitTruth`
   - reveal stale browser projection vs hard truth

5. `summarizeRunState`
   - one compact machine-readable and human-readable state object

Bad candidates:

- open strategy
- board-level doctrine
- soul / reflection
- large ambiguous architecture problems
- broad research judgement

Those are not execution-compression tasks. They remain reasoning tasks.

## 6. What DGDH should learn from this now

### A. Execution compression is a real principle

When a task is mostly a deterministic multi-step procedure, DGDH should eventually ask whether it belongs in bounded code execution instead of chatty tool orchestration.

### B. Narrow typed capability wrappers beat raw tool chaos

DGDH will likely benefit more from semantically cut capabilities such as:
- `getRunTruth(runId)`
- `verifyCanonicalMain()`
- `summarizeIssuePath(issueId)`
- `collectExecutionEvidence(runId)`

than from ever-larger low-level tool menus.

### C. Run observability is a prime candidate

The newer Run-Wahrheit direction becomes stronger in light of this research:

> the state capture layer may eventually be implemented partly as bounded microscripts against narrow capabilities, instead of as many separate shell and API turns

## 7. What is not actually "dran"

### Not now

- Cloudflare as a platform decision
- full TypeScript-first execution rewrite
- a universal code-mode refactor of DGDH
- a large new sandbox infrastructure sprint
- treating code mode as the answer to every agent weakness

### Why not

DGDH's current bottlenecks are still more basic:
- boringly reliable firm loop
- clear run truth
- lower David-minutes
- better packet truth

Code mode is a later accelerator for specific operation-shaped tasks, not the new center of gravity.

## 8. Transfer matrix

| Pattern | DGDH timing | Verdict |
| --- | --- | --- |
| Execution compression for deterministic multi-step ops | Soon | Strong principle |
| Narrow typed capability wrappers instead of raw tool zoos | Soon | Strong design direction |
| Bounded code execution for run-truth / evidence collection | Later | Likely high leverage if current pain persists |
| Observation separated from reasoning | Now | Strong operating principle |
| Ephemeral capability-bounded sandboxing as an execution primitive | Later | Plausible enabling layer |
| Cloudflare Dynamic Workers as platform choice | Not now | Product/platform decision too early |
| Full code-mode migration of the system | Not now | Overreach |
| Treating TypeScript execution as the new main story | Not now | Wrong center of gravity |

## 9. Concrete DGDH promotions from this research

### Promote now

1. Add an architectural rule: if a task is mostly deterministic multi-step operations work, evaluate later whether it should become bounded code execution rather than tool-chat.
2. Prefer semantically narrow capability surfaces over ever-broader low-level tool menus.
3. Treat observation-heavy token burn as execution-design debt, not only as prompt inefficiency.

### Put in the later backlog

1. A tiny bounded execution slot for run-truth and evidence-collection microscripts.
2. Typed capability wrappers around run-state, issue-state, Git truth, and operator truth surfaces.
3. A safe local-first sandbox story for operation-shaped agent code, if the value is proven.

### Explicitly do not promote now

1. Cloudflare-specific infrastructure migration.
2. New platform-film around sandboxing.
3. Rewriting broad reasoning work into code mode just because it sounds advanced.

## 10. One-sentence DGDH verdict

Cloudflare's Dynamic Workers and Code Mode matter to DGDH because they highlight a stronger future primitive for some agent work: less tool-chat, more secure, typed, ephemeral microscripts; DGDH should learn the execution-compression idea without mistaking it for an immediate platform or rewrite mandate.
