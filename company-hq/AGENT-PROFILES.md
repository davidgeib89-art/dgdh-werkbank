# Agent Profiles for Paperclip

## Human Operator

**Name:** David Geib

**Role in Paperclip:** Operator / Principal

**Responsibilities:**

- Sole authority to create Issues and assign them to Agents
- Approves architecture proposals from Architect-Claude
- Reviews Agent output in the Paperclip dashboard
- Controls budget limits and activation of all agent lanes
- Runs benchmark Issues to validate Agent behavior and token efficiency
- No Agent acts autonomously without David's explicit instruction

**Benchmark approach:**
A benchmark run = creating an Issue via the Paperclip API (identical to what the WebGUI does). This simultaneously tests end-to-end Issue processing (Gemini starts cleanly, agent runs to completion, result visible in dashboard) and captures token/cost data via Paperclip's built-in cost-scoring engine for future efficiency baselines. Heartbeat processing is out of scope for now — Issue processing is tested first.

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

## Agent 1: Builder-Codex

**Name in Paperclip:** `Builder-Codex`

**Adapter:** Codex (OpenAI Code Interpreter)

**Working Directory:** `~/DGDH/worktrees/paperclip-codex`

**Role Description:**
Specialized for implementation, refactoring, and file-level engineering work. Executes architecture specifications from the Architect-Claude review. Focuses on code quality, test coverage, and PR-ready output.

**Responsibilities:**

- Implement features as specified by the Architect
- Refactor code for clarity and performance
- Handle file creation, edits, and structure
- Run tests and validate builds
- Prepare commits with clear messages

**Budget:** $50/month (soft limit, Agent pauses at limit)

**Status:** Configured but dormant

- No Heartbeats enabled
- Wake-on-demand disabled
- No active Tasks assigned
- No assignment/automation triggers
- Paused by default
- Only activated by explicit David directive

---

## Agent 2: Architect-Claude

**Name in Paperclip:** `Architect-Claude`

**Adapter:** Claude Code

**Working Directory:** `~/DGDH/worktrees/paperclip-claude`

**Role Description:**
Reviews code changes, refines system design, proposes architecture decisions, and reflects on direction. Acts as a guard rail for quality and strategic coherence. Bridges the gap between David's vision and Builder-Codex's implementation.

**Responsibilities:**

- Review Builder-Codex pull requests and code quality
- Propose architecture improvements
- Refine and clarify specifications
- Challenge designs and suggest alternatives
- Maintain long-term coherence

**Budget:** $75/month (soft limit, Agent pauses at limit)

**Status:** Configured but dormant

- No Heartbeats enabled
- Wake-on-demand disabled
- No active Tasks assigned
- No assignment/automation triggers
- Paused by default
- Only activated by explicit David directive

---

## Agent 3: Research-Gemini (Controlled Test Lane)

**Name in Paperclip:** `Research-Gemini`

**Adapter:** `gemini_local`

**Working Directory:** `C:\Users\holyd\DGDH\worktrees\paperclip-gemini`

**Role Description:**
Deep analysis, alternative research, and fact-checking. Helps validate assumptions and explore design alternatives before Builder-Codex commits to implementation.

**Responsibilities:**

- Research alternative approaches
- Validate assumptions
- Fact-check design decisions
- Provide counterarguments to proposed directions

**Budget:** $30/month (soft limit)

**Status:** Ready for Issue-based benchmark run

- Role: `researcher`
- Model: `gemini-3-flash-preview` (fixed for benchmark #01 — no auto)
- Heartbeats disabled
- Wake-on-demand disabled (manual invoke only)
- No automation triggers
- No self-tasking and no follow-up task creation

**Benchmark #01 — Issue processing smoke test:**

- Trigger: David creates Issue via Paperclip API (same as WebGUI)
- Task: Single-file structured extraction, read-only, JSON output
- Metrics captured by Paperclip natively: duration, input_tokens, output_tokens, cost score
- Success criteria: Agent starts cleanly, result visible in dashboard, JSON valid, correct output
- Token baseline recorded here for future optimization comparison

---

## Workflow Governance

### How Tasks Are Created

1. David identifies work via chat with ChatGPT (Architect)
2. ChatGPT proposes assignment: Builder-Codex or both
3. David approves and creates Task in Paperclip
4. Task is assigned to specific Agent

### How Agents Are Activated

- Start: David @mentions Agent in Paperclip Task
- Work: Agent executes; posts updates to Task thread
- Review: Architect-Claude (or David) reviews in Paperclip
- Conclude: David marks Task complete

### Token Safety Defaults

- **Heartbeats**: Disabled (Agents do not auto-wake)
- **Wake-on-demand**: Disabled by default (manual run invoke only)
- **Event Triggers**: No assignment/automation triggers for dormant lanes
- **@mentions**: Only from David or Architect
- **Budgets**: Hard stop at limit; Agent pauses, does not retry

---

Last updated: 2026-03-17
Last updated by: David Geib (Operator)
