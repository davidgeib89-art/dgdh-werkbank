# User Testing

Testing surface, required tools, and resource costs for DGDH cleanup mission.

**What belongs here:** Validation surfaces, tools needed, concurrency limits.

---

## Validation Surfaces

### 1. API Endpoints

**Surface:** HTTP REST API on port 3100
**Tools:** curl, fetch
**Cost:** Low (~50ms per request)

**Key endpoints:**
- `GET /api/health` - Health check
- `GET /api/companies/:id/agents/triad-preflight` - Triad readiness
- `GET /api/issues/:id/company-run-chain` - Execution monitoring

### 2. CLI Commands

**Surface:** `paperclipai` binary via pnpm
**Tools:** Direct shell execution
**Cost:** Low (~1-2s per command)

**Key commands:**
- `paperclipai runtime status`
- `paperclipai triad start`
- `paperclipai issue archive-stale`

### 3. Filesystem

**Surface:** Local directories (.tmp/, doc/, root)
**Tools:** ls, find, mv, rm
**Cost:** Low (local filesystem ops)

## Validation Concurrency

**Max concurrent validators:** 1

**Rationale:**
- Cleanup mission is sequential by nature
- API server runs on single port (3100)
- No parallel execution needed
- Single worker handles all features

**Resource usage:**
- API server: ~200MB RAM
- CLI commands: ephemeral, no background processes
- Filesystem ops: negligible

## Testing Strategy

**For audit features:**
1. Start server: `pnpm dev:server`
2. Execute API calls, capture responses
3. Execute filesystem commands, capture listings
4. Stop server

**For cleanup features:**
1. Verify classification report exists
2. Execute cleanup commands
3. Verify with re-audit
4. Document before/after

**For proof features:**
1. Start server
2. Create test issue / triad parent
3. Poll company-run-chain every 30s
4. Max wait: 10 minutes
5. Document full chain
6. Stop server

## Required Setup

**Before testing:**
- `pnpm install` completed
- Port 3100 available
- No other Paperclip instance running

**During testing:**
- Server process managed (start/stop cleanly)
- API responses logged
- CLI outputs captured
