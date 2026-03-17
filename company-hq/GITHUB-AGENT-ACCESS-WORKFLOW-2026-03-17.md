# GitHub Agent Access Workflow

**Status date:** 2026-03-17  
**Audience:** ChatGPT in agent mode, GitHub automation, board members  
**Purpose:** Enable agent-mode review of live active codebase without breaking existing worktree structure

---

## 1) Current Repo & Worktree Topology

### Main Repository
- **Repo:** `https://github.com/davidgeib89-art/paperclip`
  - Remotes: `origin` (davidgeib89-art fork) and `upstream` (paperclipai)
  - Main branch: `master` (production baseline)

### Working Directory Structure
```
~/DGDH/
  repos/paperclip-main         [main repo, branch: master]
  worktrees/
    paperclip-codex            [active development, branch: codex-work]
    paperclip-claude           [branch: claude-work]
    paperclip-gemini           [branch: gemini-work]
```

### Worktree Assignments (As Of 2026-03-17)
| Worktree | Branch | Remote | Purpose |
|----------|--------|--------|---------|
| paperclip-codex | **codex-work** | `origin/codex-work` | **PRIMARY: Active DGDH work** |
| paperclip-claude | claude-work | `origin/claude-work` | Secondary |
| paperclip-gemini | gemini-work | `origin/gemini-work` | Secondary |

---

## 2) Official Active Worktree: codex-work Branch

### GitHub Visibility
- **Remote branch:** `origin/codex-work`
- **Full URL:** `https://github.com/davidgeib89-art/paperclip/tree/codex-work`
- **Status:** Tracking and pushed to GitHub as of commit `1b941b09`

### Current Head
- **Commit:** `1b941b09` (chore: add DGDH governance board memo and re-sync state for agent review)
- **Timestamp:** 2026-03-17
- **Key files added:**
  - `company-hq/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md` (board decision doc)
  - `company-hq/DGDH-RE-SYNC-STATE-2026-03-17.md` (architecture snapshot)

### How ChatGPT Agent Mode Connects
1. **Direct link:** `https://github.com/davidgeib89-art/paperclip/tree/codex-work`
2. **Agent instruction:** "Review the live codebase at `origin/codex-work` in the Paperclip repository"
3. **File discovery:** Agent can browse all files in `/company-hq/`, `/packages/`, `/server/`, etc. at this branch state
4. **Review entry point:** See Section 3 (Review Entry Point) below

---

## 3) Review Entry Point for Agents

### Draft PR (When Needed)
- **Will be created as:** `codex-work` → `master` (draft, for tracking and review)
- **Purpose:** Central place for agent-mode review comments and decision tracking
- **Status:** To be created on demand (not auto-created; manual trigger when review checkpoint reached)
- **Link format:** Will be pinned in agent instructions once created

### Without PR: Direct Branch Review
- **Current approach:** Agents review `codex-work` branch directly via GitHub tree
- **Sufficient for:** Code discovery, artifact reading, decision audit
- **No PR needed until:** Ready to propose integration back to `master`

### Artifacts Always Accessible on codex-work
- **Governance docs:** `company-hq/` (Constitution, Budget, Autonomy, Token Strategy, Board Memo, Re-Sync State)
- **Source code:** All packages, server, adapters, skills
- **Tests & configs:** Full codebase view, including test suites and tsconfig
- **Agent can read:** JSON, TS, MD, logs, schemas without restriction

---

## 4) New Worktree Push Rule

**Rule (Effective 2026-03-17 onwards):**

After major development checkpoint or sprint end:

1. **Stage changes locally** in `~/DGDH/worktrees/paperclip-codex`
2. **Commit with clear message** (see template below)
3. **Push to GitHub:** `git push origin codex-work`
4. **Notify:** Agent instructions or board memo that refresh occurred
5. **Agent re-review:** Next agent mode session reads updated branch

### Commit Message Template
```
chore: [SPRINT/PHASE] governance and architecture update

- Concise summary of what changed
- Rationale for the change
- Any decision implications

This commit establishes the canonical state for agent review.
```

### Example
```
chore: PHASE-2 governance fill-ins and probe checklist

- Board memo thresholds now approved and locked
- Probe envelope confirmed (agentId, laneId, window)
- Stop authority chain defined
- Readout accountability assigned

Ready for controlled-live probe activation (pending board GO vote).
```

---

## 5) What Stays Local, What Goes Remote

### Stays Local (Only In Worktree)
- Temporary build artifacts (`dist/`, `node_modules/`, `.next/`, etc.)
- Local secrets, environment files (`.env.local`, credentials)
- IDE scratch folders (`.vscode/` workspace settings)
- Uncommitted exploratory work

**Rule:** Only tracked, reviewed, and decision-affecting content gets pushed.

### Goes Remote on codex-work
- Source code (`packages/`, `server/`, `skills/`, `cli/`)
- Governance and decision documents (`company-hq/`)
- Test suites and configurations
- README, AGENTS.md, contribution guides
- Architecture research and design docs

**Rule:** Everything an agent needs to understand current state and decisions.

---

## 6) Agent Instructions for Accessing Live Codebase

**For ChatGPT Agent Mode (or audit bots):**

> When you need to review the **live active codebase**:
>
> **Repository:** `https://github.com/davidgeib89-art/paperclip`  
> **Branch:** `codex-work` (the official active development line)  
> **Direct URL:** `https://github.com/davidgeib89-art/paperclip/tree/codex-work`  
> **Key files to start:**
>   - `company-hq/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md` (current decision scope)
>   - `company-hq/DGDH-RE-SYNC-STATE-2026-03-17.md` (architecture snapshot)
>   - `server/src/services/prompt-shadow-gate.ts` (resolver gate logic)
>   - `packages/adapters/gemini-local/src/server/models.ts` (currently in development)
>
> **Refresh cadence:** After major sprints or decision checkpoints, the `codex-work` branch is updated with new governance artifacts.
>
> **For audit or decision-validation:** Read the governance docs first (they explain what is live, what is shadow, and what requires board approval).

---

## 7) Minimal Rule for Ongoing Visibility

**One Rule to Rule Them All:**

> **Every major governance decision or architecture checkpoint → commits to codex-work → push to GitHub**
>
> This ensures agents and humans always see the same canonical state.

### Examples of "Major" Checkpoints
- Board memo updates or approval sign-offs
- Resolver or gate logic changes that affect governance
- New probe window configs or threshold sets
- Role routing or token budget changes
- Architecture decisions that affect multiple layers

### Examples of "Minor" (Can Batch or Skip)
- Typo fixes or formatting
- Internal refactoring with no external API change
- Test-only updates
- Comment/doc clarifications

**Judgment:** When in doubt, push. Costs nothing, gains visibility.

---

## 8) No PR Needed Right Now

**Current status:** The `codex-work` branch is **ready for agent review as-is**.

**PR creation trigger:** Only when you want to formally propose codex-work → master merge.

**Until then:** Agents and board review directly from the branch.

**Advantage:** Simpler workflow, faster iteration, no PR review bottleneck on governance docs.

---

## 9) Summary for Quick Reference

| Item | Value |
|------|-------|
| **Active worktree** | `~/DGDH/worktrees/paperclip-codex` |
| **Active branch** | `codex-work` |
| **Remote URL** | `https://github.com/davidgeib89-art/paperclip/tree/codex-work` |
| **Last sync** | 2026-03-17, commit `1b941b09` |
| **Governance docs** | All in `company-hq/` |
| **Agent access** | Direct GitHub branch + governance docs |
| **Push rule** | After major checkpoint, commit + `git push origin codex-work` |
| **Review entry** | `codex-work` branch directly; PR optional |

---

## 10) Troubleshooting

### "Agent can't see the latest files"
→ Check: Did you commit and push? `git log origin/codex-work` should show your commit.

### "Should I create a PR?"
→ Only if you're ready to propose merge back to master. For now, branch review is sufficient.

### "What if I need to sync with master?"
→ In the codex worktree: `git fetch origin` then `git rebase origin/master` (if needed). **But check with team first—this is a major integration action.**

### "Can other team members push to codex-work?"
→ Yes, if they have permission to `davidgeib89-art/paperclip`. Use the same commit + push rule.

### "What about upstream (paperclipai)?"
→ Keep upstream as reference/sync only. Push always goes to `origin` (your fork). Integration back to upstream is a separate, formal process (PR to paperclipai/paperclip).

---

**Created:** 2026-03-17  
**Scope:** Define official GitHub visibility for local codex-work development  
**Next Review:** After first agent-mode audit of codex-work branch
