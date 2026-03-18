# GitHub Agent Access Workflow

**Status date:** 2026-03-17  
**Audience:** ChatGPT in agent mode, GitHub automation, board members  
**Purpose:** Enable agent-mode review of the real active DGDH Werkbank codebase

---

## 1) Current Repo and Worktree Topology

### Main Active Repository

- **Repo:** `https://github.com/davidgeib89-art/dgdh-werkbank`
  - Remote: `origin`
  - Upstream reference: `https://github.com/paperclipai/paperclip`
  - Main branch: `main`

### Working Directory Structure

```
~/DGDH/
  repos/
    paperclip-main         [reference substrate only]
  worktrees/
    dgdh-werkbank          [active development, branch: main]
```

### Current assignments

| Working directory | Branch   | Purpose                      |
| ----------------- | -------- | ---------------------------- |
| `dgdh-werkbank`   | `main`   | Primary active DGDH work     |
| `paperclip-main`  | `master` | Upstream substrate reference |

---

## 2) Official Active Review Line

### GitHub visibility

- **Remote branch:** `origin/main`
- **Full URL:** `https://github.com/davidgeib89-art/dgdh-werkbank/tree/main`
- **Status:** Official review entry for the active DGDH codebase

### How ChatGPT agent mode connects

1. **Direct link:** `https://github.com/davidgeib89-art/dgdh-werkbank/tree/main`
2. **Agent instruction:** "Review the live codebase at `origin/main` in the DGDH Werkbank repository"
3. **File discovery:** the agent can browse `/company-hq/`, `/packages/`, `/server/`, and the rest of the repo directly
4. **Review entry point:** start with the governance docs before reading implementation details

---

## 3) Review Entry Point for Agents

### Direct branch review

- **Current approach:** agents review `main` directly in the DGDH Werkbank repo
- **Sufficient for:** code discovery, artifact reading, audit, and roadmap understanding
- **No PR required:** unless a formal external integration target is introduced later

### Recommended reading order

1. `company-hq/DGDH-RE-SYNC-STATE-2026-03-17.md`
2. `company-hq/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md`
3. `company-hq/MODEL-ROADMAP.md`
4. `DGDH-WERKBANK-SETUP.md`
5. relevant server and adapter files

---

## 4) Push Rule

After a meaningful checkpoint:

1. Stage changes locally in `~/DGDH/worktrees/dgdh-werkbank`
2. Commit with a clear message
3. Push to GitHub with `git push origin main`
4. Let agents review `main`

### Meaningful checkpoints include

- roadmap or governance clarifications
- benchmark-task definition changes
- token-measurement changes
- resolver or gate logic changes
- probe packet or ops changes

### Minor changes can be batched

- typo fixes
- formatting cleanup
- minor wording improvements

---

## 5) What Stays Local and What Goes Remote

### Stays local

- build artifacts
- secrets and environment files
- scratch work not ready for review

### Goes remote

- source code
- governance and decision documents
- benchmark definitions
- roadmap and architecture docs
- tests and configs needed for understanding the live state

The rule is simple: if an agent needs it to understand the current truth, it belongs in GitHub.

---

## 6) Agent Instructions for Accessing the Live Codebase

When you need to review the **live active codebase**:

- **Repository:** `https://github.com/davidgeib89-art/dgdh-werkbank`
- **Branch:** `main`
- **Direct URL:** `https://github.com/davidgeib89-art/dgdh-werkbank/tree/main`

### Key files to start with

- `company-hq/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md`
- `company-hq/DGDH-RE-SYNC-STATE-2026-03-17.md`
- `company-hq/MODEL-ROADMAP.md`
- `DGDH-WERKBANK-SETUP.md`
- `server/src/services/prompt-shadow-gate.ts`

### Refresh cadence

After major checkpoints, `main` is updated and becomes the new canonical review point.

---

## 7) Summary for Quick Reference

| Item               | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| Active worktree    | `~/DGDH/worktrees/dgdh-werkbank`                             |
| Active branch      | `main`                                                       |
| Remote URL         | `https://github.com/davidgeib89-art/dgdh-werkbank/tree/main` |
| Governance docs    | `company-hq/`                                                |
| Agent access       | direct GitHub branch review                                  |
| Push rule          | commit + `git push origin main`                              |
| Upstream reference | `paperclipai/paperclip`                                      |

---

## 8) Troubleshooting

### "Agent can't see the latest files"

Check whether `git log origin/main` shows the latest commit.

### "Should I create a PR?"

Not by default. Direct branch review is enough for the current phase.

### "What about Paperclip updates?"

Use `upstream` as a reference and selectively sync only what is worth taking.

### "Can other people push to main?"

Only if they have permission to the `dgdh-werkbank` repo and understand the canonical push rule.

---

**Created:** 2026-03-17  
**Scope:** Define official GitHub visibility for DGDH Werkbank  
**Next Review:** After the first real Gemini benchmark and token-readout cycle
