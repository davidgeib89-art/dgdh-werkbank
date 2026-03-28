# Architecture

Architectural decisions and patterns for DGDH cleanup mission.

**What belongs here:** System structure, key patterns, boundary definitions.

---

## System Layers

```
┌─────────────────────────────────────┐
│  CLI / API Surface                  │  <- Cleanup commands here
├─────────────────────────────────────┤
│  Paperclip Server (port 3100)       │  <- Health, triad preflight
├─────────────────────────────────────┤
│  Embedded PostgreSQL (port 54329)   │  <- Prefer API over direct DB
├─────────────────────────────────────┤
│  Filesystem (.tmp/, doc/, root)     │  <- Direct cleanup allowed
└─────────────────────────────────────┘
```

## Protected Core

**Never cleanup:**
- `.paperclip/worktrees/` - Active isolation infrastructure
- `server/`, `ui/`, `cli/`, `packages/*` - Core code
- CEO, Worker, Reviewer agent definitions

## Cleanup Hierarchy

**Preferred approaches (in order):**
1. CLI commands (`paperclipai issue archive-stale`)
2. API endpoints (`GET /api/health`, `GET /api/companies/:id/agents/triad-preflight`)
3. Direct DB queries (only for irreducible residue)
4. Filesystem operations (for .tmp/, doc/, root artifacts)

## Key API Endpoints

- `GET /api/health` - Server health and seed status
- `GET /api/companies` - List companies
- `GET /api/companies/:id/agents/triad-preflight` - Triad readiness
- `GET /api/issues/:id/company-run-chain` - Full execution chain
- `GET /api/heartbeat-runs` - Run status and history
