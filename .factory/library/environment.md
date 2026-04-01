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

## Factory mission runtime

- Factory missions should attach to one shared Paperclip runtime on `:3100` for the duration of the mission.
- Canonical attach/start hook:
  - `node .factory/hooks/ensure-paperclip-runtime.mjs --mode watch`
- The hook is idempotent:
  - if `:3100` is already healthy, it reuses that runtime
  - if not, it starts the shared runtime carrier and waits for `/api/health`
  - on Windows, the carrier uses `node scripts/dev-runner.mjs` directly instead of a fragile `cmd.exe /c pnpm.cmd ...` wrapper
  - if a tracked runtime stays unhealthy, it can restart that tracked process once
  - if startup truth stays thin, it runs one direct `pnpm dev:once` diagnostic and reports the real blocker
- Force a fresh tracked restart when needed:
  - `node .factory/hooks/ensure-paperclip-runtime.mjs --mode watch --restart`
- Override mode only when needed:
  - `FACTORY_PAPERCLIP_RUNTIME_MODE=once`
- Windows note:
  - embedded PostgreSQL cannot start from an elevated Windows shell
  - in that case the hook should fail fast with explicit blocker truth; do not widen into scheduler/user/privilege workaround work inside the mission
- Runtime logs and status live in:
  - `.factory/runtime/paperclip-runtime-3100.json`
  - `.factory/runtime/paperclip-runtime-3100.out.log`
  - `.factory/runtime/paperclip-runtime-3100.err.log`
- Do not start separate ad-hoc runtime copies per worker session.
