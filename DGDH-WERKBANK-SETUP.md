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

# DGDH Werkbank Setup

**Status:** Live on GitHub  
**Date:** 2026-03-17  
**Folder:** `~/DGDH/worktrees/dgdh-werkbank`

---

## What This Is

The **DGDH Werkbank** is the active DGDH repository and working environment.

It exists to do three things well:

- keep the current company state readable,
- run controlled experiments under real quota constraints,
- evolve from internal test projects toward a genuinely working AI firm.

---

## Current State

- **Main branch:** `main`
- **Origin:** `https://github.com/davidgeib89-art/dgdh-werkbank.git`
- **Upstream reference:** `https://github.com/paperclipai/paperclip.git`
- **Current priority:** clean the docs, define a fixed Gemini benchmark, measure tokens per run, then optimize from evidence

The main current risk is not lack of ideas. It is unnecessary complexity without trustworthy measurements.

---

## Immediate Focus

The next cycle is:

1. smooth out outdated docs and roadmaps
2. make the current company intent readable again
3. define one fixed Gemini benchmark task
4. measure tokens per run
5. improve the system based on the measurements

The guiding rule is simple: fewer theories, more readable state, one repeatable benchmark, measured improvement.

---

## What This Repo Is For

- founder-led development of the company operating system
- governance and runtime experimentation under strict cost discipline
- small internal test projects and fun projects as the first true proof that the firm can ship
- later, larger useful projects and eventually external-facing value

---

## Folder Structure

```
~/DGDH/
  worktrees/
    dgdh-werkbank/         <- MAIN ACTIVE WORKSPACE
      packages/
      server/
      company-hq/
      skills/
      README.md
      package.json
      ...

  repos/
    paperclip-main/        <- upstream substrate reference
```

---

## Remote Setup

Current remotes:

```
origin     https://github.com/davidgeib89-art/dgdh-werkbank.git
upstream   https://github.com/paperclipai/paperclip.git
```

### What they do

**origin**

- active DGDH repo
- what ChatGPT agents should read
- where canonical progress is pushed

**upstream**

- Paperclip substrate reference
- source for selective syncs only
- not a target for blind merges

---

## Workflow

### For normal DGDH work

```powershell
cd ~/DGDH/worktrees/dgdh-werkbank
git add .
git commit -m "chore: PHASE-X <description>"
git push origin main
```

### For documentation cleanup

1. Prefer updating canonical docs over creating side docs.
2. Remove stale naming when it obscures the real current setup.
3. Keep roadmap language tied to measured next actions.

### For token optimization work

1. Pick one fixed Gemini task.
2. Run it through the real issue path.
3. Record input tokens, output tokens, duration, and output quality.
4. Change one system variable at a time.
5. Re-run and compare.

### For Paperclip feature updates

```powershell
git fetch upstream master
git log upstream/master -5 --oneline
```

Then selectively cherry-pick or manually port only what is worth taking.

---

## Key Files for Agent Access

Agents should start with:

- `company-hq/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md`
- `company-hq/DGDH-RE-SYNC-STATE-2026-03-17.md`
- `company-hq/MODEL-ROADMAP.md`
- `company-hq/GITHUB-AGENT-ACCESS-WORKFLOW-2026-03-17.md`
- `server/src/services/prompt-shadow-gate.ts`

---

## Decoupling from Paperclip

**Independent now:**

- governance docs
- DGDH-specific service logic
- roadmap and benchmark strategy
- company identity and repo structure

**Still selectively reusable from Paperclip:**

- heartbeat improvements
- adapter fixes
- shared utility updates

The point is not full isolation. The point is that DGDH now controls its own operating line.

---

## Next Steps

1. finish smoothing the canonical docs and roadmap
2. define the first fixed Gemini benchmark packet
3. run the benchmark through the real issue path
4. record token metrics and quality observations
5. decide what to simplify or redesign based on evidence

---

## Quick Links

- Repo: https://github.com/davidgeib89-art/dgdh-werkbank
- Main branch: https://github.com/davidgeib89-art/dgdh-werkbank/tree/main
- Governance docs: https://github.com/davidgeib89-art/dgdh-werkbank/tree/main/company-hq

---

**Ready for the first real optimization cycle.**
