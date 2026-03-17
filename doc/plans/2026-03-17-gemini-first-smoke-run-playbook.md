# Gemini First Live Smoke Run Playbook (DGDH)

## Goal

Run exactly one very small live Gemini task to verify:

1. Gemini CLI discovery on Windows
2. Local auth/OAuth session health
3. Model selection path (Auto first, Custom fallback if needed)
4. Transcript/runtime readability
5. Stable completion without scope drift

## Agent Configuration

- Name: Research-Gemini
- Adapter type: gemini_local
- Role: researcher (or qa)
- Working directory: C:\Users\holyd\DGDH\worktrees\paperclip-gemini
- Command: gemini (or explicit path to gemini.cmd if PATH differs)
- Model: auto (preferred)
- Heartbeat interval: disabled
- Wake on demand: enabled
- Permissions.canCreateAgents: false

## Model Policy

1. Start with Auto.
2. If Auto behaves unexpectedly, use a single explicit custom model string.
3. Suggested fallback custom model string: gemini-2.5-pro

## Live Run Guardrails

- One run only.
- No heartbeat scheduling.
- No follow-up task creation.
- No self-tasking.
- No parallel Gemini runs.
- No repo exploration beyond explicit task scope.
- Abort and report if scope becomes ambiguous.

## Mini Smoke Task (Paste into Paperclip)

Title: Gemini smoke: one-file summary

Description:
Read only docs/WORKSPACE-BOOTSTRAP.md and create docs/GEMINI-SMOKE.md.
Write 5-8 sentences summarizing the bootstrap steps in plain language.
Do not read or modify any other files.
Do not run tests.
Do not execute build/dev commands.
Do not create follow-up tasks.
After writing docs/GEMINI-SMOKE.md, stop.

## Definition of Done

- Exactly one new file created: docs/GEMINI-SMOKE.md
- Summary length is 5-8 sentences
- No other file changes
- No follow-up task creation
- Run ends cleanly with a clear final status

## Observation Checklist

- Selected model is visible and expected (Auto or explicit custom)
- Adapter environment checks indicate CLI/auth availability
- Transcript lines are understandable enough to follow tool steps
- Tool calls are traceable (read/write actions are clear)
- Scope remains constrained to the single requested source file and output file
- Token usage stays small and does not spike unexpectedly
- Final run status is succeeded (or a cleanly reported blocked/failure reason)
