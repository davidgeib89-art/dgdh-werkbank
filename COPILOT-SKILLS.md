# COPILOT-SKILLS - Proven Operating Skills

Status: active
Audience: Copilot
Purpose: Keep the repeated development, testing, runtime, and Paperclip run skills in one durable place.

---

## 1. First Principle

The skill is not "do more".
The skill is "prove the next true thing with the smallest exact move".

In DGDH, the quality bar is:
- real company progress beats local activity
- explicit truth beats inferred truth
- the real path beats substitute proof paths
- boring repeatability beats clever improvisation

---

## 2. Starting The Local System

Canonical repo root:
- `c:\Users\holyd\DGDH\worktrees\dgdh-werkbank`

Default server start paths:
- `pnpm dev:watch` for active development
- `pnpm dev:once` for a more stable one-shot dev run
- `pnpm dev:server` when only the server matters

Important run facts:
- the dev runner can move from `3100` to the next free port if `3100` is busy
- the startup banner is more trustworthy than the port you expected
- prove runtime identity with the banner plus `/api/health` and `/api/companies` before trusting the server

If PowerShell command shape becomes fragile:
- stop composing clever multiline commands
- use a deterministic script or a fresh one-shot process instead

---

## 3. Database Handling

Default local dev DB behavior:
- leave `DATABASE_URL` unset to use embedded PGlite in dev

Useful commands:
- `pnpm db:generate` after schema changes
- `pnpm --filter @paperclipai/db migrate` when migrations must be applied

Local reset path:
- remove `data/pglite`
- restart the local server

Important quality rule:
- do not treat DB work as a separate meta lane when the real blocker is on the live company path
- change schema only when the product path truly needs it

---

## 4. Canonical Company Agent Runs In Paperclip

The proven control path is:
1. prove runtime identity
2. read `/api/companies`
3. read `/api/companies/{companyId}/agents`
4. create or reuse the exact project
5. create or update the exact issue
6. assign the issue to the responsible agent
7. observe the run through issue/run endpoints

Do not substitute this with raw wakeups for normal issue work.

Canonical truth endpoints:
- `/api/issues/{id}`
- `/api/issues/{id}/children`
- `/api/issues/{id}/company-run-chain`
- `/api/issues/{id}/active-run`
- `/api/issues/{id}/live-runs`
- `/api/issues/{id}/comments`
- `/api/heartbeat-runs/{runId}`
- `/api/heartbeat-runs/{runId}/events`
- `/api/heartbeat-runs/{runId}/log`

What worked best in recent runs:
- assignment beats raw wakeup
- `company-run-chain` is the narrowest operator truth surface for the normal company path
- if a CEO run blocks before child creation, fix packet truth first and rerun the same path

---

## 5. Packet Truth Skill

Execution-heavy issues should carry explicit packet truth before assignment:
- `targetFile`
- `targetFolder`
- `artifactKind`
- `doneWhen`

Recent proven reason codes for early packet failure:
- `target_file_missing`
- `target_folder_missing`
- `artifact_kind_missing`
- `donewhen_missing`
- `execution_scope_ambiguous`

Working rule:
- do not rely on vague prose to imply execution scope when the product path is meant to gate execution
- explicit packet truth is higher quality than smart guessing

Validation rule:
- always test both sides on the same runtime
- prove the negative path really stays blocked
- prove the ready path really reaches child creation

---

## 6. Testing Skill

Default verification ladder:
1. targeted file error checks when editing
2. `pnpm -r typecheck`
3. `pnpm test:run`
4. `pnpm build`

When isolating a blocker:
- run the narrowest relevant test first
- widen only when the focused test passes but the real path still fails

Quality rule:
- tests are not the finish line when the sprint is about the company path
- if the ask is about live execution, one fresh bounded company run is part of verification

---

## 7. Git Skill

Canonical branch truth:
- `main` is the operational branch

Important recent learning:
- `origin/main` may advance because the live company loop created fresh real work
- when that happens, fetch and integrate remote truth before pushing the local sprint result

Preferred push recovery:
1. `git fetch origin main`
2. inspect `HEAD..origin/main`
3. `git rebase origin/main`
4. push fast-forward

Do not force push over fresh live-run truth.

---

## 8. Shell Skill

Query budget rule:
- 1 unknown -> 1 to 3 focused commands

If a shell session starts carrying state risk:
- restart from a simpler command shape
- prefer script files for complex API validation
- do not spend many minutes debugging quoting when the company path is the real task

Anti-patterns:
- broad repo scans for facts one API call can answer
- noisy terminal harvesting after runtime identity is already proven
- repeated hunting for hidden completion hooks

---

## 9. What Helps Next Time

For Copilot to do better next time:
- load this file together with `COPILOT.md` and `EXECUTOR.md`
- default to exact API truth before repo archaeology
- move repeated run-control lessons into docs during the sprint
- prefer productizing truth over manually carrying it in chat

---

## 10. Post-Run Learning Skill

After every big sprint or substantial run, execute this explicit loop:
1. identify the assumptions made during the run
2. strip them away until only provable runtime/API/git/product truth remains
3. state what would have been more efficient and higher quality
4. promote the durable part into Copilot `.md` files
5. reflect the real result back to Codex as planner truth

The loop is not complete if the learning stayed only in chat.

Default Copilot files for this:
- `COPILOT.md` for role-level learning and reflection contract
- `COPILOT-SKILLS.md` for repeatable operating skills
- `EXECUTOR.md` for hard execution rules and anti-drift corrections

Quality rule:
- the goal is not self-description
- the goal is to reduce future rediscovery cost, raise quality, and compress David minutes on the next sprint

One sentence:

> Attach to the right runtime, drive the real company path, and turn repeated friction into durable operating skill.