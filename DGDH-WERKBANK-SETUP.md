# DGDH Werkbank Setup

**Status:** Ready for GitHub push  
**Date:** 2026-03-17  
**Folder:** `~/DGDH/worktrees/dgdh-werkbank`

---

## What Is This?

The **DGDH Werkbank** is your dedicated, decoupled working environment for governance, prompt resolution, probe operations, and agent orchestration. It's independent from Paperclip's main repository but can selectively sync important updates.

---

## Current State

- **Main branch:** Contains full codex-work codebase from previous Paperclip fork
- **Remotes:**
  - `origin` → local bare repo at `~/DGDH/repos/dgdh-werkbank-init`
  - `upstream` → Paperclip main repo (for feature syncing only)
- **Ready for:** Push to GitHub as `davidgeib89-art/dgdh-werkbank`

---

## How to Push to GitHub

### Step 1: GitHub Repo Creation

Go to https://github.com/new and create:
- **Owner:** davidgeib89-art
- **Repo name:** `dgdh-werkbank`
- **Description:** "DGDH Werkbank - Governance, Prompt Resolver, and Agent Operations"
- **Public** ✓
- **Do NOT initialize** (leave blank!)
- Click **Create repository**

### Step 2: Configure Origin Remote

Once repo is created, update the local remote:

```powershell
cd c:\Users\holyd\DGDH\worktrees\dgdh-werkbank

# Update origin to point to GitHub
git remote set-url origin https://github.com/davidgeib89-art/dgdh-werkbank.git

# Verify
git remote -v
```

### Step 3: Push to GitHub

```powershell
cd c:\Users\holyd\DGDH\worktrees\dgdh-werkbank

git push -u origin main
```

**Done!** Your repo is now live at `https://github.com/davidgeib89-art/dgdh-werkbank`

---

## Folder Structure

```
~/DGDH/
  worktrees/
    dgdh-werkbank/         ← MAIN ACTIVE WORKSPACE (you are here)
      packages/            ← Core adapters, utilities
      server/              ← Heartbeat, services, gates
      company-hq/          ← All governance documents
      skills/              ← Agent skills
      README.md
      package.json
      ...

  repos/
    paperclip-main/        ← Original Paperclip base (archived)
    dgdh-werkbank-init/    ← Bare repo (internal)
```

---

## Remote Setup

After GitHub push, your remotes will be:

```
origin     https://github.com/davidgeib89-art/dgdh-werkbank.git
upstream   https://github.com/paperclipai/paperclip.git
```

### What They Do

**origin:** Your GitHub fork
- Push your DGDH changes here
- This is what ChatGPT agents read

**upstream:** Paperclip main
- Pull feature updates selectively
- Only use for `git cherry-pick` or `git merge` of specific commits

---

## Workflow: How to Update

### For New DGDH Governance Work

```powershell
cd ~/DGDH/worktrees/dgdh-werkbank

# Make changes
# ... edit files ...

# Commit
git add .
git commit -m "chore: PHASE-X <description>"

# Push to GitHub
git push origin main
```

### For Paperclip Feature Updates

**Check upstream:**
```powershell
git fetch upstream master
git log upstream/master -5 --oneline
```

**Selectively merge (example: heartbeat fix):**
```powershell
git cherry-pick <commit-hash>
# or
git merge --no-commit --no-ff upstream/master -- packages/adapters/
git commit -m "chore: sync Paperclip <feature> update"
git push origin main
```

**NO automatic syncs.** You control what comes in.

---

## Key Files for ChatGPT Agent Access

After GitHub push, agents will read these:

- `company-hq/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md` → Current decision scope
- `company-hq/DGDH-RE-SYNC-STATE-2026-03-17.md` → Architecture snapshot
- `company-hq/GITHUB-AGENT-ACCESS-WORKFLOW-2026-03-17.md` → How to use this repo
- `server/src/services/prompt-shadow-gate.ts` → Resolver gate logic
- `packages/adapters/gemini-local/src/server/` → Adapter implementations

---

## Decoupling from Paperclip

**What's independent:**
- All governance (`company-hq/`)
- DGDH-specific services (gates, probe operations)
- Your decision history and board records

**What you can still sync:**
- Heartbeat improvements
- Adapter bug fixes
- Package compatibility updates
- (You cherry-pick, not auto-merge)

**What breaks:**
- Direct worktree sharing (Claude/Gemini names are gone ✓)
- Tight coupling to Paperclip release schedule
- Confusion about "which codebase is active" (now: one clear line)

---

## Tech Debt & Cleanup

**Done:**
- ✅ Removed `paperclip-claude` worktree
- ✅ Removed `paperclip-gemini` worktree
- ✅ Created dedicated `dgdh-werkbank` repo
- ✅ Paperclip as optional upstream

**Remaining (Optional):**
- `paperclip-codex` worktree can be archived/deleted (reference only now)
- `paperclip-main` repo can be archived (reference only)
- Clean up old branches in forks (not critical)

---

## Next Steps

1. **Create repo on GitHub** (see "How to Push to GitHub" above)
2. **Run:** `git remote set-url origin https://github.com/davidgeib89-art/dgdh-werkbank.git`
3. **Run:** `git push -u origin main`
4. **Verify:** Visit `https://github.com/davidgeib89-art/dgdh-werkbank` and check all files are there
5. **Inform ChatGPT:** Update agent instructions to point to new repo URL

---

## Quick Links (After GitHub Push)

- **Repo:** https://github.com/davidgeib89-art/dgdh-werkbank
- **Main Branch:** https://github.com/davidgeib89-art/dgdh-werkbank/tree/main
- **Board Memo:** https://github.com/davidgeib89-art/dgdh-werkbank/blob/main/company-hq/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md
- **Governance:** https://github.com/davidgeib89-art/dgdh-werkbank/tree/main/company-hq

---

## File Ownership

**In dgdh-werkbank (your responsibility):**
- All `company-hq/` docs
- `server/src/services/prompt-shadow-gate.ts`
- `packages/` DGDH-specific mods
- README, package.json, build configs (DGDH-customized)

**From Paperclip (reference only, don't edit):**
- Core heartbeat logic (unless critical bugfix)
- Base adapter structure
- Shared utilities (update via cherry-pick)

---

**Ready to push!** 🚀
