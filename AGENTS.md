# AGENTS.md

This repository is a pnpm workspace for Paperclip. It contains the server, UI, CLI,
shared packages, adapters, plugin SDK code, and examples.

Use this file as the default operating guide for coding agents working in this repo.

## Workspace shape

- Root workspace members: `server`, `ui`, `cli`, `packages/*`, `packages/adapters/*`, `packages/plugins/*`
- Server: Express + TypeScript + pino logging
- UI: React 19 + Vite + TypeScript
- CLI: Commander + TypeScript
- Shared contracts: `packages/shared`
- Database package: `packages/db`

## Tooling baseline

- Package manager: `pnpm@9.15.4`
- Node: `>=20`
- Module system: ESM (`"type": "module"`)
- TypeScript config is strict (`strict: true` in `tsconfig.base.json`)
- Test runner: Vitest
- E2E runner: Playwright
- There is no first-class root lint script today; do not invent one

## Install and bootstrap

- Install deps: `pnpm install`
- Start full local dev stack: `pnpm dev`
- Start one-shot local runtime: `pnpm dev:once`
- Start only server dev mode: `pnpm dev:server`
- Start only UI dev mode: `pnpm dev:ui`

## Build commands

- Build everything: `pnpm build`
- Build server only: `pnpm --filter @paperclipai/server build`
- Build UI only: `pnpm --filter @paperclipai/ui build`
- Build CLI only: `pnpm --filter paperclipai build`
- Build a package: `pnpm --filter <package-name> build`

## Typecheck commands

- Typecheck everything: `pnpm typecheck`
- Equivalent CI form: `pnpm -r typecheck`
- Typecheck server only: `pnpm --filter @paperclipai/server typecheck`
- Typecheck UI only: `pnpm --filter @paperclipai/ui typecheck`
- Typecheck CLI only: `pnpm --filter paperclipai typecheck`

## Test commands

- Run all tests in workspace: `pnpm test`
- Run all tests once: `pnpm test:run`
- Run E2E tests: `pnpm test:e2e`
- Run headed E2E tests: `pnpm test:e2e:headed`

## Single-test commands

- Run one test file from root: `pnpm vitest run server/src/__tests__/paperclip-env.test.ts`
- Run multiple exact files: `pnpm vitest run server/src/__tests__/paperclip-env.test.ts cli/src/__tests__/common.test.ts`
- Run one package-scoped test file:
  - Server: `pnpm --filter @paperclipai/server exec vitest run src/__tests__/paperclip-env.test.ts`
  - UI: `pnpm --filter @paperclipai/ui exec vitest run src/lib/inbox.test.ts`
- Run tests matching a name: `pnpm vitest run -t "routes CEO ready free_api packets to flash"`
- Prefer exact file paths over broad test discovery when validating a bounded change

## DB and CLI commands

- Generate DB artifacts: `pnpm db:generate`
- Run DB migrations: `pnpm db:migrate`
- Seed DB directly from package: `pnpm --filter @paperclipai/db seed`
- Run the local CLI entrypoint from repo root: `pnpm paperclipai --help`

## CI truth

PR verification currently does this:

1. `pnpm install --no-frozen-lockfile`
2. `pnpm -r typecheck`
3. `pnpm test:run`
4. `pnpm build`

If you change production code, aim to leave all four green.

## Lint/format reality

- There is no canonical root `lint` script
- There is no repo-standard ESLint/Biome setup to rely on
- There is no root formatting command to assume
- Do not add new lint tooling unless explicitly asked
- Preserve the existing formatting style in the touched file
- Use `pnpm check:tokens` only when token policy is relevant

## Copilot instruction carry-forward

The repo contains `.github/copilot-instructions.md`. Its rules should be treated as always-on:

- Work as a bounded executor, not an open-ended explorer
- Prefer exact issue IDs, paths, ports, and API routes from the prompt over repo-wide discovery
- Prefer issue/API/UI truth surfaces over shell when they answer the question directly
- Prefer exact reads over exploratory searches
- Use first-principles debugging in small steps
- Side paths get at most three tries; then stop and return to the main goal or report blocker
- If an issue or packet is `not_ready`, stop and report the missing input
- Before each tool call, ask whether it directly reduces uncertainty on the main goal
- For live diagnosis, use one to three focused probes, not repo-wide scans
- Read the smallest useful log slice
- Do not inspect editor/Copilot session internals unless explicitly asked
- State git truth precisely: local edits vs local commits vs pushed branch vs `origin/main`

## Import conventions

- Use ESM imports and include `.js` on local runtime imports in TypeScript files
- Prefer `import type` for type-only imports
- Group imports roughly as: Node built-ins, external packages, workspace packages, local imports
- Keep imports explicit; avoid wildcard imports
- In UI code, alias imports like `@/api/plugins` are acceptable where already configured

## Type and schema conventions

- Prefer explicit interfaces or type aliases for public shapes
- Use narrow string unions for domain concepts when possible
- Parse unknown input before use; do not trust raw `unknown` or request payloads
- Shared request/response validation belongs in `packages/shared` with Zod
- Infer TS types from Zod schemas where that keeps contracts synchronized
- Keep strict-null handling explicit; use `null` intentionally, not implicitly

## Naming conventions

- Types, interfaces, classes: `PascalCase`
- Functions, variables, helpers: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE` only for true constants; otherwise `camelCase`
- Test names should describe behavior, not implementation details
- Prefer descriptive domain names such as `routingPreflight`, `issueRef`, `contextPatch`

## Formatting conventions

- Follow the surrounding file exactly
- The codebase commonly uses double quotes, semicolons, and trailing commas where valid
- Prefer small helper functions over deeply nested inline logic
- Keep lines readable; wrap long object literals and conditionals the way nearby code does
- Avoid churn in untouched formatting

## Error-handling conventions

- Fail closed on invalid input
- In server routes, validate with Zod and return structured `res.status(...).json({ error: ... })`
- Use repo error helpers like `HttpError`, `forbidden`, and `unauthorized` where applicable
- In services, log operational failures with `logger.warn` / `logger.error`
- Avoid `console.*` in production server code; use `pino` logger instead
- `console.*` is acceptable in tests and CLI output paths when it is part of the contract
- Include actionable error text; preserve details when safe

## Server conventions

- Routes stay thin: validate input, enforce auth/access, call services, shape response
- Business logic should live in services, not route handlers
- Use `validate(...)` middleware and shared schemas where possible
- Prefer small pure helpers for derived values and normalization
- Be careful with runtime context, issue truth, and agent/session state; these paths are sensitive

## UI conventions

- Prefer typed props and small focused helpers
- Reuse shared types from `@paperclipai/shared`
- Keep derived presentation logic in `ui/src/lib/*` when it is reusable
- Preserve existing React patterns already in the file
- Do not introduce a new state management library without being asked

## CLI conventions

- Keep CLI commands thin: parse options, resolve context, call API client, print output
- Use `handleCommandError(...)` for user-facing failures
- Keep human-readable output stable; JSON output must remain machine-friendly
- Respect env-based defaults like `PAPERCLIP_API_URL`, `PAPERCLIP_COMPANY_ID`, and `PAPERCLIP_RUN_ID`

## Testing conventions

- Use Vitest with `describe`, `it`, and `expect`
- Add targeted tests for the touched behavior instead of broad speculative coverage
- Prefer exact regression tests for bugs in routing, prompts, env propagation, and packet truth
- Keep tests deterministic; mock external process execution where needed
- When changing shared contracts, update both behavior and contract tests if they exist

## Agent operating guidance for this repo

- Make the smallest reviewable change that proves the requested truth
- Do not add new tools, providers, or architecture unless the task explicitly requires it
- Prefer canonical config/routing fixes over local hacks
- Do not commit logs, generated runtime artifacts, or local investigation files unless asked
- If you must stop, report the narrowest proven blocker and the exact commands/tests already run
- For live-run observation, prefer short one-shot API reads over long polling loops
- If you do poll, set a hard ceiling before you start (normally <= 2 minutes) and stop early on terminal truth such as `active-run = null`, `company-run-chain` no longer advancing, a new child issue becoming `not_ready`, or the same unchanged snapshot repeating a few times
- Never wait only for the hoped-for success state; always include explicit stop conditions for alternate terminal outcomes so you do not get stuck after the run has already ended
