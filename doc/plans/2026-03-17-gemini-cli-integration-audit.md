# Gemini CLI Integration Audit (Windows, DGDH)

Date: 2026-03-17
Scope: Paperclip fork in `worktrees/paperclip-codex`

## 1. Current State (Ist-Zustand)

### 1.1 Gemini adapter/provider/model registry locations

- Server adapter registration: `server/src/adapters/registry.ts`
- Gemini adapter package entry: `packages/adapters/gemini-local/src/index.ts`
- Gemini server execute path: `packages/adapters/gemini-local/src/server/execute.ts`
- Gemini environment test path: `packages/adapters/gemini-local/src/server/test.ts`
- Gemini UI parser: `packages/adapters/gemini-local/src/ui/parse-stdout.ts`

### 1.2 Model names / dropdown options

- UI dropdown source: `GET /api/companies/:companyId/adapters/:type/models`
- Route implementation: `server/src/routes/agents.ts`
- Server model fetch entry: `listAdapterModels(...)` in `server/src/adapters/registry.ts`
- Before this sprint, Gemini model list used static package fallback only.

### 1.3 Output readability issues (root causes)

- Gemini parser emitted generic/raw tool labels and had less semantic normalization than Codex/Cursor.
- Tool-call/result pairing was weaker when tool IDs were not preserved from assistant content events.
- Shell-shaped tool outputs were rendered as unstructured payload strings in many cases.

### 1.4 Where runtime/transcript translation should happen

- Primary hook: `packages/adapters/gemini-local/src/ui/parse-stdout.ts`
- Secondary presentation layer: `ui/src/components/transcript/RunTranscriptView.tsx`
- Adapter-level normalization should happen first; transcript component should remain adapter-agnostic.

### 1.5 Windows-sensitive spots

- Command resolution and PATH inheritance: `ensureCommandResolvable(...)`, `ensurePathInEnv(...)`
- `command` override behavior (`gemini`, `gemini.cmd`, absolute path) in execute/test flows
- Absolute `cwd` handling and creation on Windows paths
- OAuth session dependency in user home (`~/.gemini`) and skills symlink target (`~/.gemini/skills`)
- Exit code / timeout handling via child process runner in adapter utils

## 2. Sprint Target Architecture (Sollbild)

### 2.1 Adapter and model separation

- Adapter remains `gemini_local` (CLI execution orchestration only).
- Model selection is independent data: auto, catalog entries, or custom string.

### 2.2 Model selection policy

- Default: `auto`
- Catalog: static fallback + environment-driven additive model list
- Custom: explicit free-text model id from UI

### 2.3 Observability/readability

- Parse Gemini stream-json into normalized transcript primitives with readable phase names.
- Preserve tool call IDs where possible for stable call/result grouping.
- Normalize command execution output summaries for the transcript UI.

### 2.4 Governance compatibility

- No mandatory live execution required for registry/parser validation.
- Validation path can stay in dry-run/unit space and remain compatible with governance safety policy.

## 3. Implemented in This Sprint

### 3.1 Model registry modernization

- Added `listGeminiModels()` with dedupe and env overrides:
  - `packages/adapters/gemini-local/src/server/models.ts`
- Exported in adapter server API:
  - `packages/adapters/gemini-local/src/server/index.ts`
- Wired into server adapter registry:
  - `server/src/adapters/registry.ts`
- Behavior:
  - fallback package models retained
  - additive env model ids from `PAPERCLIP_GEMINI_MODELS` and `GEMINI_MODELS`
  - supports CSV/newline/semicolon and JSON-array format

### 3.2 Custom model field in UI

- Added custom model entry option to model dropdown for Gemini/OpenCode:
  - `ui/src/components/AgentConfigForm.tsx`

### 3.3 Better readable Gemini transcript events

- Improved parser normalization:
  - tool name phase mapping (for example read/edit/command buckets)
  - preserve `toolUseId` on assistant tool call events
  - shell-shaped tool result summarization
- File:
  - `packages/adapters/gemini-local/src/ui/parse-stdout.ts`

### 3.4 Tests added/updated

- Updated Gemini parser tests:
  - `server/src/__tests__/gemini-local-adapter.test.ts`
- Added Gemini model catalog tests:
  - `server/src/__tests__/gemini-local-models.test.ts`

## 4. Remaining Gaps / Follow-up

1. Optional CLI model discovery (`gemini models ...`) is not yet enabled; current approach is fallback + env overrides.
2. Further semantic phase extraction can be expanded if Gemini stream event schema stabilizes for planning/research/edit phases.
3. Dedicated Windows smoke checks for `gemini.cmd` path variants should be added to CI or local setup scripts.

## 5. Safe Validation Strategy

- Preferred: unit tests for parser/model catalog and dry-run governance/runtime paths.
- Explicitly avoided: live productive Gemini agent runs and broad token-consuming exploratory executions.
