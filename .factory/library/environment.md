# Environment

Environment variables, external dependencies, and setup notes for DGDH cleanup mission.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## PostgreSQL (Embedded)

**Host:** localhost
**Port:** 54329
**Mode:** Embedded (password protected)

**Access:**
- Prefer API/CLI for all operations
- If DB access truly required, credentials in `.env` file (untracked)
- Never commit credentials to git

## Node.js / pnpm

**Node:** >=20
**pnpm:** 9.15.4
**Module System:** ESM

## Paperclip CLI

**Entry point:** `pnpm paperclipai`
**Key commands:**
- `paperclipai runtime status`
- `paperclipai triad start`
- `paperclipai triad rescue`
- `paperclipai issue archive-stale`

## Platform Notes

**Windows:**
- Git worktrees need `core.longpaths true`
- Use PowerShell or CMD for CLI commands
- Embedded PostgreSQL runs as local process
