# Sprint Report: Work Engine — DGDH-fit, lean, founder-readable

**Date:** 2026-03-20
**Goal:** Bring Gemini Work Engine from "funktioniert" to "DGDH-fit"

## Was gebaut wurde

### A) Prompt Diet
- Default prompt template replaced: generic `"You are agent ... Continue your Paperclip work."` → DGDH-fit `"Du bist Agent ... in der DGDH Werkbank. Arbeite die zugewiesene Aufgabe strukturiert ab. Melde Ergebnis oder Blocker."`
- `renderPaperclipEnvNote` and `renderApiAccessNote` confirmed already OFF by default (`config.includePaperclipEnvNote: false`, `config.includeApiAccessNote: false`) — no change needed, already lean

### B) Skill Pruning
- Added `config.includeSkills` allowlist to `ensureGeminiSkillsInjected()` in gemini-local adapter
- When set (e.g. `["paperclip"]`), only allowed skills are symlinked — non-DGDH skills (`paperclip-create-agent`, `paperclip-create-plugin`, `para-memory-files`) are excluded
- When unset or empty, all skills are linked (backwards compatible)
- DGDH config can now set `includeSkills: ["paperclip"]` to match Engine V1 spec

### C) DGDH Runtime Defaults
- Session compaction defaults tightened per Engine V1 spec:
  - `maxSessionRuns`: 200 → **20**
  - `maxRawInputTokens`: 2,000,000 → **500,000**
  - `maxSessionAgeHours`: 72 → **48**
- These are defaults — `runtimeConfig.heartbeat.sessionCompaction` overrides per-agent still work

### D) Targeted Validation Tests
- New test file: `server/src/__tests__/dgdh-engine-defaults.test.ts` (8 tests)
- Validates: session compaction defaults, DGDH prompt template, skill filtering wiring, prompt diet guards
- Contract-style: reads source to verify spec compliance, catches regressions if defaults drift

## Validation
- `pnpm typecheck` — clean across all packages
- `pnpm test:run` — 97 files, 483 tests, 0 failures (up from 96/475)

## Invarianten erhalten
- Backwards compatibility: all defaults are overridable via existing config mechanisms
- No adapter interface changes — `includeSkills` is read from existing `config` bag
- Floor mode skill removal still works independently
- `removeMaintainerOnlySkillSymlinks` untouched

## Was NICHT angefasst wurde und warum
- **Skill content** (SKILL.md files): pruning is config-level, not content-level — skills themselves are unchanged
- **Dead code at heartbeat.ts ~3248**: marked TODO in previous sprint, separate cleanup commit
- **Approval loop (`awaiting_approval`)**: interim collapse to `blocked` remains — separate feature when approval UX is built
- **Flash/Pro routing policy**: no architectural need identified — routing policy JSON untouched

## Geänderte Dateien
| Datei | Änderung |
|-------|----------|
| `packages/adapters/gemini-local/src/server/execute.ts` | DGDH prompt, `includeSkills` allowlist |
| `server/src/services/heartbeat.ts` | Session compaction defaults 20/500k/48 |
| `server/src/__tests__/dgdh-engine-defaults.test.ts` | 8 contract tests (new) |
