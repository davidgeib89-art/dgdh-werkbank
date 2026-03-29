# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Required Environment Variables

From `.env.example`:
```
DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip
PORT=3100
SERVE_UI=false
```

No `.env` file exists in the repo — the server reads from `.env.example` defaults or process environment.

## Platform Notes

- **Windows:** `fs.mkdtemp` requires the parent directory to exist. The `.tmp/` directory in the repo root is NOT committed. Tests that use `.tmp/` as a parent must create it in `beforeAll` with `{ recursive: true }`.
- **Node path:** `process.cwd()` in tests resolves to the repo root (where `pnpm test:run` is invoked).

## Embedded Postgres

The server manages an embedded Postgres instance on port 13100. Workers must not interact with it directly.

## DGDH Seed Data

The running server on port 3100 has DGDH company seeded with CEO, Worker, and Reviewer agents (`agentRolesFound: { ceo: true, worker: true, reviewer: true }`). This is confirmed via `GET /api/health`.
