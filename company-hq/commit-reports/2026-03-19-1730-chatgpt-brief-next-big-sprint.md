# ChatGPT Agent Briefing: Next Big Sprint (No Reflection Loops)

Date: 2026-03-19
Operator: David (Founder/Operator)

## 1) Operating Mode (Critical)

- We do BIG autonomous sprints.
- No micro-gates and no repeated reflection loops during implementation.
- Flow is strictly:
  1. decide sprint,
  2. implement fully,
  3. run validation/typecheck,
  4. one reflection,
  5. optional adjustment for next sprint.
- Goal: David should intervene as little as possible.

## 2) Current Product Context

- Project: DGDH Werkbank control plane.
- Existing stats work already done in server routes:
  - routing history in stats,
  - warnings + datasource,
  - budget summary,
  - top-level health status.
- New health endpoints were just added:
  - GET /api/agents/:id/health
  - GET /api/companies/:companyId/agents/health
- Typecheck currently green on server filter.

## 3) Problem We Need To Solve Next

Current risk is logic drift and operator overload:

- Health/budget decision logic is duplicated across endpoints.
- Without a tested central decision function, behavior can diverge silently.
- Operator needs fast company-level signal, not long payload scanning.

## 4) Proposed Next Big Sprint (Decision Draft)

Sprint Name: Health Decision Engine + Operational Summary

Scope:

1. Extract one shared health evaluation function used by all relevant endpoints.
2. Add matrix-style tests for budget/run combinations (including cancelled edge-cases).
3. Extend company health response with summary block:
   - counts per healthStatus,
   - counts per budgetStatus,
   - highestSeverity,
   - atRiskAgents (compact list).
4. Keep routing policy advisory-first and unchanged.
5. Keep implementation read-only on execution flow (observability sprint, no write operations).

Definition of Done:

- All relevant server typechecks pass.
- New tests pass reliably.
- Existing endpoint behavior remains compatible except additive summary fields.
- One final reflection document only (no interim reflection cycles).

## 5) What We Need From You (ChatGPT Agent)

Provide a single compact reflection with this structure:

1. Validate or challenge the sprint scope.
2. Top 3 technical risks and mitigation.
3. Minimal test matrix you consider mandatory.
4. Go/No-Go recommendation for immediate implementation.

Constraints for your answer:

- No multi-round planning loop.
- No request for operator micro-approvals unless truly blocking.
- Decide pragmatically and move toward implementation readiness.
