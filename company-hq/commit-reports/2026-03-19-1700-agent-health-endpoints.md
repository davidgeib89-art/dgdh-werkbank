# Sprint: Agent Health Endpoints

**Date:** 2026-03-19 · **Author:** GitHub Copilot

## What was built

Two new read-only endpoints added to `server/src/routes/agents.ts`:

### `GET /api/agents/:id/health`

Lightweight single-agent health poll. Returns a compact JSON object — no history, no full routing payload. Designed for frequent polling (dashboards, monitors).

**Response fields:**

```json
{
  "agentId": "...",
  "agentName": "...",
  "adapterType": "gemini",
  "healthStatus": "ok | running | warning | degraded | critical | unknown",
  "budgetStatus": "ok | soft_cap_approaching | soft_cap_exceeded | hard_cap_exceeded | unknown",
  "usedTokens": 12400,
  "softCapTokens": 50000,
  "hardCapTokens": 100000,
  "totalCostCents": 38,
  "lastRun": {
    "id": "...",
    "status": "succeeded",
    "stopReason": "completed",
    "finishedAt": "...",
    "createdAt": "..."
  }
}
```

### `GET /api/companies/:companyId/agents/health`

Company-wide health overview — all agents in one call. Uses three parallel batch queries with a max-subquery join to get the latest run per agent. No N+1.

**Response fields:**

```json
{
  "companyId": "...",
  "count": 3,
  "agents": [
    {
      "agentId": "...", "agentName": "...", "role": "...",
      "adapterType": "gemini", "agentStatus": "active",
      "healthStatus": "ok", "budgetStatus": "ok",
      "usedTokens": 12400, "softCapTokens": 50000, "hardCapTokens": 100000,
      "totalCostCents": 38,
      "lastRun": { ... }
    }
  ]
}
```

## Implementation decisions

- **healthStatus logic** is identical to `/stats`: `unknown → critical → running → warning → degraded → ok`  
  Budget breaches gate harder than run errors; `cancelled` errors never degrade health.
- **budgetStatus thresholds** unchanged: 80% of soft cap = approaching, 100% soft = exceeded, 100% hard = hard cap exceeded.
- **No routing advisory changes** — these endpoints are read-only observability surfaces; they do not touch `gemini-routing.ts`.
- **Batch query pattern** for the company endpoint: `agentRuntimeState` in one query, latest run per agent in one `innerJoin` with a `max(createdAt)` subquery — three parallel queries total.
- All budget/health logic lives inline per endpoint (not a shared helper) to keep the codebase readable without premature abstraction.

## Files changed

- `server/src/routes/agents.ts` — ~200 lines added, two new `router.get` handlers

## Typecheck

`pnpm --filter @paperclipai/server typecheck` → **green**

## Suggested commit message

```
feat(server): add /agents/:id/health and /companies/:companyId/agents/health endpoints
```
