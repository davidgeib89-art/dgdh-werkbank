# Harness Learnings For DGDH - 2026-03-18

Status: canonical extracted research note
Audience: David, Copilot, ChatGPT in agent mode, future DGDH implementation agents
Purpose: record the DGDH-relevant takeaways from harness research and separate immediate practical adoption from later-stage expansion

## Source Context

Primary source for this extraction:

- research/The Harness.md

This note does not treat that text as a direct build blueprint.
It translates the useful parts into DGDH operating guidance.

## Bottom Line

The research is directionally right for DGDH.

The strongest useful claim is not that a bigger multi-agent platform should be built now.
The strongest useful claim is that model quality alone will not solve DGDH's current bottleneck.
The environment around the model matters more than further abstract prompt debate.

For DGDH, this means:

- optimize the harness around the current shared core first
- reduce context waste before adding new capability layers
- improve feedback loops before expanding autonomy
- treat documentation as machine-usable operating infrastructure, not just human notes

## What The Research Confirms For DGDH

The research strongly confirms these existing DGDH directions:

1. The current bottleneck is mostly harness quality, not just model choice.
2. The inherited Paperclip issue and heartbeat path should be inspected and simplified before more layers are added.
3. Progressive disclosure is better than dumping large context into the model.
4. The repository should remain the system of record for agent-readable operating truth.
5. Small stable handoff artifacts matter if agents are expected to work across runs.
6. Mechanical checks and bounded workflows are more reliable than asking the model to self-govern everything.
7. Better feedback loops are usually a higher-leverage improvement than larger prompts.

## What DGDH Should Adopt Now

These are the most relevant immediate harness learnings for DGDH right now.

### 1. Progressive disclosure over context flooding

DGDH should keep pushing toward smaller, more deliberate context exposure.

Practical meaning:

- avoid broad repo dumps
- avoid large irrelevant search results
- prefer narrow file windows and bounded task packets
- prefer compact canonical entry documents that point to deeper documents when needed

Why it matters now:

- this directly supports the current goal of reducing Gemini token waste in the inherited Paperclip path

### 2. The repo is the system of record

DGDH should keep storing operating truth in versioned in-repo documents instead of relying on implicit memory or scattered chat state.

Practical meaning:

- keep company-hq as canonical operating context
- keep runtime maps and current-state reviews synchronized with system changes
- treat missing repo documentation as a harness gap, not a cosmetic issue

Why it matters now:

- other AIs can only reliably follow what is preserved and structured in the repo

### 3. Small stable session handoffs

DGDH should create compact handoff artifacts that survive across sessions and context resets.

Practical meaning:

- maintain current-state review documents
- maintain runtime maps for tricky system areas
- maintain benchmark packets and small explicit work packets
- prefer concise stable artifacts over giant omnibus instruction files

Why it matters now:

- this reduces re-orientation cost and prevents drift between sessions and agents

### 4. Improve feedback loops before adding autonomy

DGDH should prefer faster, tighter, earlier validation over broader freeform agent behavior.

Practical meaning:

- keep benchmark tasks small and inspectable
- favor read-only and dry-run analysis where possible during diagnosis
- use validation steps that catch mistakes early in the loop
- measure useful output, token cost, and repeatability together

Why it matters now:

- this is the shortest path to making Gemini cheaper and less dumb in practice

### 5. Mechanical constraints beat vague expectations

DGDH should keep turning important operating expectations into explicit bounded rules.

Practical meaning:

- clear role boundaries
- clear assignment path
- clear task packet scope
- clear update rules for canonical docs
- clear stop and escalation rules

Why it matters now:

- it lowers the amount of token-expensive self-correction the model has to do at runtime

## What DGDH Should Not Adopt Yet

The research also describes larger harness patterns that are real and useful, but not current DGDH priorities.

Do not treat these as immediate implementation requirements:

1. full multi-agent orchestration
2. broad parallel worktree fleets
3. large-scale browser automation by default
4. rich observability stacks designed for high-throughput product teams
5. aggressive merge philosophies built for agent-heavy PR volume
6. elaborate lifecycle platforms before one cheap useful benchmark loop already works

Reason:

- DGDH is still trying to establish one reliable low-cost productive lane inside the inherited system
- adding large harness layers too early would likely increase complexity before the current waste is understood

## DGDH Minimal Harness Hypothesis

The right near-term DGDH harness is minimal, not maximal.

It should include:

1. one shared core for all agents
2. one fixed founder-defined role model
3. one fixed benchmark packet
4. one compact current-state review
5. one runtime map for critical inherited system behavior
6. narrow context windows and bounded tool use
7. explicit measurement of token cost, output quality, and repeatability

This is enough to learn where the current system is wasting money and coherence.

## DGDH-Specific Interpretation Of "Harness Is Everything"

For DGDH, "harness is everything" should be interpreted narrowly and pragmatically.

It does not mean:

- build a giant agent platform immediately
- add every known framework pattern
- optimize for theoretical long-horizon autonomy before useful bounded work exists

It does mean:

- the execution environment matters more than more talk about prompts alone
- context discipline matters more than abstract ambition
- stable repo context matters more than hidden chat memory
- good feedback loops matter more than model mythology

## How This Changes DGDH Priorities

This research supports the following priority order for DGDH:

1. inspect the current inherited Gemini execution path
2. identify prompt and context waste inside that path
3. tighten the harness around one repeatable useful task
4. preserve the resulting operating truth in repo documents
5. only then decide which additional tools, memory, or automation layers are justified

## Maintenance Rule

This document should be revisited when any of these change materially:

- DGDH benchmark strategy
- startup and handoff conventions for agent sessions
- role/core architecture
- context loading strategy
- feedback-loop tooling and validation design
- decision to introduce richer automation or multi-agent orchestration

## Current Bottom Line

The research is useful for DGDH.

Not because it tells DGDH to build everything described in it.
It is useful because it gives strong external support for the path DGDH is already converging on:

- cut the inherited system before adding more
- treat repo context as operating infrastructure
- tighten the harness around one cheap useful loop
- keep the shared core small, explicit, and stable
