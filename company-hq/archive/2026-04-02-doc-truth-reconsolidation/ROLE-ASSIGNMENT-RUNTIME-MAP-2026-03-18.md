# Role and Assignment Runtime Map - 2026-03-18

Status: canonical runtime map
Audience: David, Copilot, ChatGPT in agent mode, future DGDH implementation agents
Purpose: document how roles, agent assignment, issue routing, and heartbeat execution currently work in the inherited Paperclip substrate for DGDH

## Why This Document Exists

This document exists to prevent role-system confusion.

Paperclip supports company-specific agent records and role values in the database.
That can look like a fluid role system.
In practice, the current runtime path is more constrained:

- allowed role values are globally bounded in code
- a concrete issue is assigned to an agent id, not to an abstract role
- heartbeat execution runs through the assigned agent record
- the agent role currently affects some governance and permission behavior, but it is not yet the main deep runtime driver for prompt execution

For DGDH, this matters because the current optimization target should stay stable.
The founder-defined DGDH role model should therefore override or constrain the more generic Paperclip flexibility.

## Canonical DGDH Interpretation

- DGDH currently treats roles as founder-defined and fixed.
- Paperclip database flexibility is not the source of truth for DGDH role design.
- The source of truth for DGDH roles is the company-hq governance stack.
- Any runtime behavior that depends on role selection should be evaluated against DGDH docs first, not against generic product flexibility.

## Runtime Map

### 1. Allowed role vocabulary is globally fixed

Paperclip does not allow arbitrary role names at the type/validation level.
The global role list is defined in:

- packages/shared/src/constants.ts
- packages/shared/src/validators/agent.ts

Current global role set:

- ceo
- cto
- cmo
- cfo
- engineer
- designer
- pm
- qa
- devops
- researcher
- general

Interpretation:

- the system is not fully free-form at the role name level
- flexibility begins after this point, when a company agent record stores one of those allowed values

### 2. Concrete agent records are company-specific database records

Agents are stored in the agents table with companyId plus role.
The core schema is in:

- packages/db/src/schema/agents.ts

Important fields:

- id
- companyId
- name
- role
- adapterType
- adapterConfig
- runtimeConfig
- permissions

Interpretation:

- a role is currently attached to a specific company agent record
- this is the main source of the current Paperclip role fluidity impression

### 3. Agent creation writes the chosen role into the DB

Agent creation currently normalizes the incoming role and stores it in the agent record.
Primary implementation:

- server/src/services/agents.ts

Important behavior:

- if no role is provided, role defaults to general
- permissions are normalized partly from the role
- the role is persisted on the agent row

Interpretation:

- this is one of the best override points for DGDH if role choices should become fixed

### 4. Issues assign work to an agent id, not to a role

The issues schema stores assigneeAgentId.
Primary schema:

- packages/db/src/schema/issues.ts

Important fields:

- assigneeAgentId
- checkoutRunId
- executionRunId
- assigneeAdapterOverrides
- executionWorkspaceSettings

Interpretation:

- the real work-routing key is agent id
- role matters indirectly through the chosen agent, not as the direct assignment target

### 5. Issue changes wake the assigned agent

When an issue is created or updated and has an assigneeAgentId, the heartbeat service wakes that specific agent.
Primary implementation:

- server/src/routes/issues.ts

Important behavior:

- create path enqueues a wakeup for issue.assigneeAgentId
- update path also enqueues wakeups for issue.assigneeAgentId under bounded conditions
- contextSnapshot typically carries issueId and a small source marker

Interpretation:

- the current runtime path follows assigneeAgentId first
- role is not the dispatch primitive here

### 6. Heartbeat execution reloads the concrete agent record

When a heartbeat run starts, it reloads the agent by agentId.
Primary implementation:

- server/src/services/heartbeat.ts

Important behavior:

- the run stores agentId and companyId
- the service fetches the current agent record from the database
- issue-specific overrides and workspace settings are loaded after that

Interpretation:

- the concrete DB agent is the runtime identity anchor
- if DGDH wants deterministic role behavior, the agent load path is another strong override point

### 7. Adapter execution currently receives the agent record, but role is not the deep adapter contract

The heartbeat eventually calls adapter.execute with the loaded agent.
Primary implementation:

- server/src/services/heartbeat.ts
- packages/adapter-utils/src/types.ts

Important behavior:

- adapter.execute receives the agent object from heartbeat
- the minimal adapter-facing AdapterAgent type includes id, companyId, name, adapterType, and adapterConfig
- role is not part of the minimal adapter-facing contract in adapter-utils

Interpretation:

- role is currently less central to the deepest execution path than it appears from the UI or DB model
- the real execution path depends more on agent identity, adapter configuration, context, and issue/workspace state

### 8. Role currently has real effect mainly in governance and permissions

The role field does still matter today, but mostly in narrower governance and permission checks.
Primary implementations:

- server/src/services/agent-permissions.ts
- server/src/routes/issues.ts
- server/src/routes/agents.ts
- server/src/routes/access.ts

Current notable behavior:

- ceo implies canCreateAgents by default
- some management or approval-style paths explicitly special-case ceo
- scheduler and UI payloads also surface the stored role value

Interpretation:

- role is currently a meaningful governance marker
- role is not yet a mature resolver-driven runtime operating layer

## Practical DGDH Conclusion

The current Paperclip role system is best understood like this:

- globally bounded role labels
- company-specific agent records in the DB
- issue routing by assigneeAgentId
- heartbeat execution by agentId
- limited governance and permission impact from role
- weak deep execution coupling from role

This means DGDH does not need to rip out the whole role system first.
The cleaner move is:

1. freeze role choices for DGDH
2. make DGDH docs the source of truth for those roles
3. add runtime overrides at the company-specific boundaries
4. later decide whether role should become a stronger resolver input

## Best Override Points For DGDH

If DGDH wants hard founder-defined roles, the strongest near-term override points are:

1. agent create and update validation
2. agent load normalization for the DGDH company
3. permission normalization derived from the DGDH role contract
4. later, prompt/resolver layer construction if DGDH wants role to become a stronger runtime layer

In plain terms:

- do not start by rewriting adapters
- do not start by rewriting every generic Paperclip role concept
- start where DGDH company agent records are created, updated, and reloaded

## Maintenance Rule

This document is not a one-time note.
It is a standing runtime map.

It must be reviewed and updated whenever any of the following change:

- agent schema fields related to role, permissions, adapter config, or runtime config
- issue assignment semantics
- heartbeat wakeup semantics
- heartbeat run context construction
- adapter-facing agent contract
- permission derivation from role
- DGDH-specific role override logic

When a future change affects this area, the change is not complete until this document is either:

- confirmed still accurate, or
- updated in the same change set

## Required Companion Context For Future AI Work

When an AI agent works on DGDH role logic, issue assignment, heartbeat routing, or role-based governance behavior, it should load at least these documents first:

- CURRENT-STATE-REVIEW-2026-03-17.md
- ROLE-ROUTING-CONTRACT.md
- MINIMAL-CORE-PROMPT-CONTRACT.md
- AGENT-PROFILES.md
- ROLE-ASSIGNMENT-RUNTIME-MAP-2026-03-18.md

## Current Bottom Line

For DGDH today:

- the role system should be treated as effectively fixed
- the generic Paperclip company-level flexibility should be treated as secondary
- the real runtime path is agent-id-first, not role-name-first
- role still matters, but mainly as governance and permission metadata
- the correct first engineering move is to impose DGDH-specific control at the company/agent boundary
