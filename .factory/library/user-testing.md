# User Testing Surface

## Validation Surface

**Primary Surface:** API endpoints via CLI and HTTP

**CLI Tools:**
- `paperclipai runtime status` - Runtime health and triad readiness
- `paperclipai agent status` - Agent state visibility
- `paperclipai triad start` - Create triad parent issues
- `paperclipai issue list` - Issue discovery
- `paperclipai issue worker-pr` - Worker PR submission
- `paperclipai issue worker-done` - Worker closeout
- `paperclipai issue reviewer-verdict` - Reviewer verdict
- `paperclipai triad rescue` - Stalled closeout rescue

**HTTP API:**
- `GET /api/health` - Basic health check
- `GET /api/companies/:id/agents/triad-preflight` - Triad readiness
- `GET /api/companies/:id/agents` - Agent status
- `GET /api/issues/:id` - Issue details
- `GET /api/issues/:id/company-run-chain` - Full triad chain
- `GET /api/issues/:id/active-run` - Current run status
- `POST /api/issues/:id/worker-pr` - Create PR
- `POST /api/issues/:id/worker-done` - Worker completion
- `POST /api/issues/:id/reviewer-verdict` - Reviewer verdict

**Tools Used:**
- PowerShell `Invoke-RestMethod` for HTTP API
- CLI commands for operator-facing operations
- Git commands for branch/PR verification

## Resource Cost Classification

**CLI Commands:**
- Cost: Very low (< 1 second, no background processes)
- Can run: Sequentially, no concurrency limits

**API Calls:**
- Cost: Low (~100-500ms per call)
- Can run: Up to 10 concurrent, but sequential preferred for clarity

**Git Operations:**
- Cost: Medium (network latency to origin)
- Can run: Sequential only to avoid conflicts

**Max Concurrent Validators:** 1 (this is a single-path runtime proof, not parallel testing)
