# Research: Knowledge Graph Memory & Blast Radius Pattern

Date: 2026-03-21
Context: Analyzed the `Understand-Anything` repository for future DGDH memory architecture.
Trigger: **Implement only when moving to Phase 5 (Multi-Agent Coordination) or when autonomous infrastructure refactoring begins.**

## 1. The Core Problem It Solves

Currently, DGDH uses simple `grep` and file reads for Worker/Reviewer loops. This is efficient and sufficient for flat, static customer projects (e.g., Astro templates). 

However, once the CEO agent starts orchestrating *parallel* work packets or when agents begin modifying the complex DGDH infrastructure (Paperclip Engine) autonomously, flat file reads fail to capture **referential integrity** (e.g., "Worker A changed a type in `shared` that Worker B needs in `server`").

## 2. The Pattern to Adopt (When the Time is Right)

Instead of dumping raw code into the LLM context, we parse the target repository into a structured, typed JSON Knowledge Graph.

### A. Typed Graph as Machine Memory
Extract symbols via AST (Tree-sitter) into a strictly typed JSON:
- **Nodes:** `file`, `function`, `class`, `concept`
- **Edges:** `imports`, `calls`, `reads_from`, `depends_on`

**Agent Interaction:** The AI is instructed via prompt to query this `knowledge-graph.json` using `jq` instead of grepping the codebase blindly. This drastically reduces token consumption for architecture-wide context gathering.

### B. Blast Radius Risk Assessment (For Reviewer Agent)
When a Worker finishes a packet, the Reviewer does not just look at the code diff. A tool computes the "Blast Radius" mathematically:
1. Maps changed files to Graph Nodes.
2. Finds 1-hop and 2-hop neighbor nodes via edges (`calls`, `imports`).
3. Outputs a quantitative risk score.

**Example output for Reviewer:**
> "- **Cross-layer impact**: Changes span 2 architectural layers.
>  - **Wide blast radius**: 7 components affected downstream."

The Reviewer uses this hard data to decide if the Worker's tests cover the actual blast radius, enforcing a quantitative standard for `accepted` vs `needs_revision`.

## 3. Why Not Now?

- **Overhead:** Building an AST parser for simple Markdown/JSON Astro templates is overkill.
- **Focus:** The basic Worker-Reviewer loop and CEO V1 must be proven on simple tasks first.
- **Trigger:** We build this exactly when the Reviewer Agent starts missing side-effects on complex code changes, or when parallel Multi-Agent work creates collision risks.
