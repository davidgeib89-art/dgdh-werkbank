---
title: Gemini Local
summary: Gemini CLI local adapter setup and configuration
---

The `gemini_local` adapter runs Google's Gemini CLI locally. It supports session persistence with `--resume`, skills injection, and structured `stream-json` output parsing.

## Prerequisites

- Gemini CLI installed (`gemini` command available)
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` set, or local Gemini CLI auth configured

## Configuration Fields

| Field                  | Type    | Required | Description                                                                                                      |
| ---------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `cwd`                  | string  | Yes      | Working directory for the agent process (absolute path; created automatically if missing when permissions allow) |
| `model`                | string  | No       | Gemini model to use. Defaults to `auto`.                                                                         |
| `promptTemplate`       | string  | No       | Prompt used for all runs                                                                                         |
| `instructionsFilePath` | string  | No       | Markdown instructions file prepended to the prompt                                                               |
| `env`                  | object  | No       | Environment variables (supports secret refs)                                                                     |
| `timeoutSec`           | number  | No       | Process timeout (0 = no timeout)                                                                                 |
| `graceSec`             | number  | No       | Grace period before force-kill                                                                                   |
| `yolo`                 | boolean | No       | Pass `--approval-mode yolo` for unattended operation                                                             |

## Session Persistence

The adapter persists Gemini session IDs between heartbeats. On the next wake, it resumes the existing conversation with `--resume` so the agent retains context.

Session resume is cwd-aware: if the working directory changed since the last run, a fresh session starts instead.

If resume fails with an unknown session error, the adapter automatically retries with a fresh session.

## Skills Injection

The adapter symlinks Paperclip skills into the Gemini global skills directory (`~/.gemini/skills`). Existing user skills are not overwritten.

## Environment Test

Use the "Test Environment" button in the UI to validate the adapter config. It checks:

- Gemini CLI is installed and accessible
- Working directory is absolute and available (auto-created if missing and permitted)
- API key/auth hints (`GEMINI_API_KEY` or `GOOGLE_API_KEY`)
- A live hello probe (`gemini --output-format json "Respond with hello."`) to verify CLI readiness

## Model Catalog Strategy

Gemini model selection is adapter-independent and supports three paths:

1. `auto` (default)
2. discovered/fallback catalog entries shown in the UI dropdown
3. explicit custom model ids entered manually in the dropdown

For fast model updates without code changes, Paperclip also merges optional env-driven model ids into the Gemini catalog:

- `PAPERCLIP_GEMINI_MODELS`
- `GEMINI_MODELS`

Both support comma/newline/semicolon-delimited values, and JSON array format is also accepted.

Examples:

```powershell
$env:PAPERCLIP_GEMINI_MODELS = "gemini-2.5-pro,gemini-2.5-flash-preview"
```

```powershell
$env:GEMINI_MODELS = '["gemini-2.5-flash-preview",{"id":"gemini-custom-enterprise","label":"Gemini Enterprise"}]'
```

This keeps Gemini model updates low-friction on Windows and avoids hard-coupling Paperclip to a single stale list.

## Windows Local Setup Notes

- Default executable is `gemini` (override with `adapterConfig.command` if needed).
- PATH discovery uses the runtime process environment plus adapter env overrides.
- OAuth session-based auth is supported by default (no API key required if `gemini auth login` is already done).
- Explicit API keys (`GEMINI_API_KEY` / `GOOGLE_API_KEY`) are optional and switch billing classification to API mode.
- Working directory (`cwd`) must be an absolute path; Paperclip validates/creates it when possible.
- On Windows, keep command overrides explicit (for example full path to `gemini.cmd`) if PATH differs between shell and service context.
