# DGDH Repo Operating Model

Date: 2026-03-17
Status: Active operating note

## 1. Single Source of Truth

- Canonical git repository: `C:/Users/holyd/DGDH/repos/paperclip-main`
- Canonical active development worktree (current): `C:/Users/holyd/DGDH/worktrees/paperclip-codex`
- Canonical strategy/governance docs in repo: `company-hq/`

Interpretation:

- There is one repository history.
- Multiple worktrees may exist, but only one is active by policy at a time unless explicitly approved.

## 2. Activity States

### Active

- `worktrees/paperclip-codex` for implementation and integration.
- Gemini as controlled live validation lane.

### Dormant

- `worktrees/paperclip-claude`
- `worktrees/paperclip-gemini` can be active for controlled tests; otherwise dormant by default.

Dormant means:

1. agent paused
2. heartbeats disabled
3. wake-on-demand disabled
4. no assignment automation

### Legacy

- Paperclip naming in package/env/runtime internals is treated as technical legacy, not product identity.
- Old external docs under top-level `DGDH/company-hq` are transition copies after migration.

## 3. Upstream and Identity

- `upstream` remains `paperclipai/paperclip` for technical ancestry.
- Product/platform identity is DGDH platform.
- Future rename of local/repo paths to `dgdh-platform` is planned as a separate manual step.

## 4. Safe Path Conventions (Now)

Use these paths for current operations:

- Repo tasks and code changes: `worktrees/paperclip-codex`
- Canonical governance docs: `worktrees/paperclip-codex/company-hq`
- Strategy plans: `worktrees/paperclip-codex/doc/plans`

Avoid treating top-level `DGDH/company-hq` as canonical for new edits.

## 5. Manual High-Risk Steps (Not auto-executed)

The following are intentionally manual-only:

1. Rename `repos/paperclip-main` to `repos/dgdh-platform`
2. Rename/move worktree directories and re-register with git worktree commands
3. Rename GitHub repository or migrate origin to a new remote name
4. Archive or delete legacy worktrees

These steps should only be done with backup and explicit checkpoint verification.
