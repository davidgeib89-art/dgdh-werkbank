# Agent Profiles for DGDH Phase 1

## Human Operator

**Name:** David Geib

**Role in Paperclip / DGDH:** Operator / Principal

**Responsibilities:**

- Sole authority to create Issues and assign active work
- Approves lane activation and task scope
- Reviews output in the dashboard
- Controls budget limits and activation of all provider lanes
- Decides when a benchmark is trustworthy enough to justify optimization work
- No agent acts autonomously without David's explicit instruction

**Current benchmark mindset:**
A benchmark run should be small, repeatable, and readable by the founder. The immediate goal is not maximum capability but a trustworthy token baseline for one fixed Gemini task.

---

## Governance Stack (Primary Entry)

All profile behavior is constrained by this governance stack:

- AGENT-CONSTITUTION.md
- AUTONOMY-MODES.md
- TASK-BRIEF-TEMPLATE.md
- ESCALATION-MATRIX.md
- BUDGET-POLICY.md
- IDLE-POLICY.md

Technical implementation reference:

- ../doc/plans/2026-03-16-dgdh-autonomous-governance-framework.md
- ../docs/guides/dgdh-governance-shift.md

## Phase-1 Operating Rule

Phase 1 is not about freezing final permanent roles too early.

- Real quota availability matters more than elegant theory.
- Gemini is the first measured worker lane because its quota envelope is strongest.
- Claude and Codex are specialist lanes that should be activated only when their extra quality is worth the tighter quotas.
- All lanes operate against the same canonical repo context: `~/DGDH/worktrees/dgdh-werkbank`.

## Lane 1: Gemini Primary Worker Lane

**Adapter:** `gemini_local`

**Working Directory:** `~/DGDH/worktrees/dgdh-werkbank`

**Role Description:**
Primary controlled worker lane for the next measurement phase. This lane should prove that DGDH can run bounded useful tasks, keep scope, and report token usage clearly enough to improve the system.

**Responsibilities:**

- Execute one fixed benchmark task repeatedly enough to establish token and quality baselines
- Handle small internal implementation, research, and structured output tasks
- Produce evidence that is compact and comparable across runs
- Help expose where the current Paperclip-based system wastes context or tokens
- Turn paid Gemini quota into useful bounded company work instead of leaving reset windows underused
- Help prepare the ground for later Claude and Codex attachment under the same token-discipline rules

**Status:** Controlled pilot / benchmark target

- No open-ended autonomy
- No follow-up task creation
- No automation triggers
- Manual invoke only
- One fixed benchmark packet first, then carefully chosen internal tasks
- Narrow custom tools are allowed when they reduce repeated context load and token waste

## Lane 2: Claude Specialist Lane

**Adapter:** Claude Code

**Working Directory:** `~/DGDH/worktrees/dgdh-werkbank`

**Role Description:**
High-intelligence lane for architecture, critique, reframing, and difficult reasoning work where the additional quality justifies the tighter quota.

**Responsibilities:**

- Review major design choices and system direction
- Propose architecture improvements
- Refine and clarify specifications
- Challenge designs and suggest alternatives
- Maintain long-term coherence

**Status:** Dormant specialist

- No Heartbeats enabled
- Wake-on-demand disabled
- No active tasks by default
- Activated only when Gemini is insufficient for the task or the upside is clearly worth the quota

## Lane 3: Codex Specialist Builder Lane

**Adapter:** Codex

**Working Directory:** `~/DGDH/worktrees/dgdh-werkbank`

**Role Description:**
Precision implementation lane for focused engineering work where Codex quality or speed is materially helpful.

**Responsibilities:**

- Focused implementation and refactoring
- Code-quality-sensitive work
- Tight file-level tasks with strong acceptance criteria
- Assistance on difficult engineering packets when quota is worth spending

**Status:** Dormant specialist

- No Heartbeats enabled
- Wake-on-demand disabled
- No active tasks by default
- Activated only for clearly justified engineering packets

---

## Immediate Benchmark Goal

The next benchmark should be designed for one purpose:

- give Gemini one fixed, bounded task,
- measure tokens per run,
- compare output quality across repeats,
- identify where the system wastes context or adds unnecessary complexity.

The first meaningful milestone after that is simple: Gemini should be able to complete real small company tasks cheaply enough and reliably enough that using the 24-hour resettable quota becomes an operational advantage.

Good benchmark properties:

- easy to inspect by eye
- small enough to rerun often
- useful enough to matter
- stable enough to compare token deltas after system changes

---

## Workflow Governance

### How Tasks Are Created

1. David identifies work through real need, curiosity, or highest-excitement direction.
2. A lane choice is proposed based on quota reality and task type.
3. David approves and creates the task in Paperclip.
4. The task is assigned to a specific lane or agent profile.

### How Agents Are Activated

- Start: David explicitly invokes the lane through the issue/task flow
- Work: the agent executes and posts updates to the task thread
- Review: David or a specialist lane reviews the output
- Conclude: David marks the task complete or routes the next bounded step

### Token Safety Defaults

- **Heartbeats**: Disabled unless explicitly justified
- **Wake-on-demand**: Manual only by default
- **Event Triggers**: No assignment or automation triggers for dormant lanes
- **Budgets**: Hard stop at limit; no blind retry behavior
- **Benchmark rule**: small fixed benchmark before broader optimization claims

---

Last updated: 2026-03-17
Last updated by: David Geib (Operator)
