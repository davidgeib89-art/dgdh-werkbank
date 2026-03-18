# DGDH Gemini Integration Note

Date: 2026-03-17

## Why DGDH chooses Gemini CLI (local) first

DGDH chooses Gemini via local Gemini CLI as primary integration path because:

1. existing local OAuth-authenticated workflow is already in use
2. Windows local execution is the real operating context
3. model updates and auto mode need to be usable without API-key-only coupling
4. this path aligns with actual quota/account operations already available locally

## DGDH role definition for Gemini

Gemini is planned as the third core agent in DGDH with emphasis on:

- research
- review
- QA
- risk analysis
- architecture counter-check
- alternative proposals

Gemini is not the first-choice autonomous builder for open-ended repo execution in phase 1.

## Position relative to Claude and Codex

- Claude: strategy/planning anchor
- Codex: builder/executor anchor
- Gemini: reviewer/research/QA anchor

This separation keeps agent responsibilities legible and governance-compatible.

## Integration principles

1. adapter and model remain separate concerns
2. model policy supports auto, curated catalog entries, and custom ids
3. transcript readability is required for human oversight
4. governance-safe testing must avoid productive live runs during setup
