# User Testing

Validation surface and resource cost classification for DGDH Runtime Cleanup Mission.

## Validation Surface

### CLI Surface
- **Tool:** Direct CLI commands via `pnpm paperclipai`
- **Commands used:**
  - `pnpm paperclipai company list`
  - `pnpm paperclipai agent list`
  - `pnpm paperclipai project list`
  - `pnpm paperclipai issue list`
  - `pnpm paperclipai runtime status`
  - `pnpm paperclipai triad start`
- **Setup:** Requires Paperclip CLI to be built and configured
- **Auth:** Uses local Paperclip instance credentials

### API Surface
- **Tool:** curl or equivalent HTTP client
- **Endpoints:**
  - `GET /api/health` - runtime health check
  - `GET /api/companies/:id/agents/triad-preflight` - triad readiness
  - `GET /api/issues/:id/company-run-chain` - run chain observation
- **Setup:** Requires Paperclip server running on port 3100
- **Auth:** Bearer token from local Paperclip instance

### Git Surface
- **Tool:** Native git commands
- **Commands:**
  - `git rev-parse --abbrev-ref HEAD`
  - `git status --porcelain`
  - `git log --oneline`
- **Setup:** None required, standard git

## Validation Concurrency

### Resource Classification

**CLI/API Validators:**
- Memory per instance: ~50-100 MB
- CPU: Low (mostly waiting on API responses)
- Processes spawned: 1 (CLI process)

**Git Validators:**
- Memory per instance: ~10 MB
- CPU: Negligible
- Processes spawned: 1 (git process)

### Machine Capacity
- Total RAM: Check available (assumed 16GB+)
- Available headroom: ~70% of free RAM
- Conservative limit: **5 concurrent validators**

### Isolation Approach
- Each validator runs independently
- No shared state between validators
- No browser instances required
- File system operations are read-only except for git commits

## Dry Run Notes

Pre-flight checks:
1. Verify `pnpm paperclipai --help` works
2. Verify runtime on port 3100 responds to health check
3. Verify git commands work in worktree
4. Verify no stale processes blocking ports

## Known Limitations

- Requires local Paperclip server (port 3100) for full validation
- Some CLI commands may require specific company context
- API endpoints require valid authentication
