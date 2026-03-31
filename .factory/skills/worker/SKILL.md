---
name: worker
description: TypeScript server-side implementation worker for the DGDH Paperclip codebase. Writes tests first (TDD), implements to make them pass, verifies with pnpm test:run and pnpm -r typecheck.
---

# Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for all code implementation features in this mission:
- Adding/modifying route handlers and service functions
- Adding new exported functions/constants to large service files
- Creating new test files or extending existing ones
- Adding API response fields to existing routes
- Documentation-only updates (CURRENT.md, ACTIVE-MISSION.md, MEMORY.md)
- Live proof attempts (observe runtime, record outcome or blocker)

## Required Skills

None. This is a pure TypeScript/Vitest implementation worker.

## Work Procedure

### Step 0: Read the feature description and AGENTS.md
Before touching any file, read:
1. The assigned feature's `description`, `preconditions`, `expectedBehavior`, and `verificationSteps` from features.json
2. The mission AGENTS.md (path is in mission context)
3. The specific files mentioned in the feature description (read relevant sections, not the whole file)

### Step 1: TDD — Write failing tests FIRST
For every new behavior, write the test before the implementation:
1. Read the existing test file(s) to understand the mock setup pattern
2. Add new `it(...)` cases to the test file
3. Run `pnpm vitest run server/src/__tests__/<file>.test.ts` and confirm the tests FAIL with the expected failure (missing function, missing field, etc.)
4. Note the exact failure message — include it in the handoff

### Step 2: Implement to make tests pass
1. Make the minimal code change that satisfies the test
2. Follow existing patterns exactly: same import style, same error handling, same logging pattern
3. Add TypeScript types for all new parameters and return values
4. Run `pnpm vitest run server/src/__tests__/<file>.test.ts` again and confirm tests PASS

### Step 2.1: Break local read loops softly

Repeatedly rereading the same code slice is not progress.

- Do not read the same file slice more than twice with the same or near-identical offset/limit.
- After the second same-slice read:
  1. summarize in one or two sentences what that slice already proved
  2. take one different action:
     - read the adjacent region
     - grep for the exact symbol
     - inspect the test that exercises it
     - inspect the caller or helper
     - make the smallest candidate edit
- If one alternate move still does not unblock you, return to the orchestrator instead of spending more time in a read loop.

### Step 3: Validate touched files and typecheck
1. Run only the directly touched test files: `pnpm vitest run server/src/__tests__/<touched-file>.test.ts` — must pass
2. `pnpm -r typecheck` — must exit 0 with no errors
3. If either fails, fix before proceeding
4. Only run `pnpm test:run` (full suite) if momentum allows; it is secondary, not mandatory

**Current-state rule**: Verification claims must match the current branch state at handoff time. If later edits touched the same surface, rerun the targeted verification before reporting success. Do not rely on an earlier green result from a now-stale state.

### Step 4: Scope check and commit verification
Before handoff:
1. Run `git diff --name-only` — confirm only in-scope files changed
2. If unexpected files appear, fix the scope problem
3. Stage and commit: `git add <files>; git commit -m "<scope>: <what changed>"`
4. **Verify the commit actually landed**: run `git log --oneline -1` and confirm the hash matches what you will report. If `git log` does not show your commit, do NOT report a commit hash — report `no commit` and explain why.
5. Do not report fabricated or assumed commit hashes. The orchestrator verifies them.

### Step 5: Handoff
Report the commit hash from `git log --oneline -1`, not from memory.

If there is still in-scope unfinished work, write it in `whatWasLeftUndone`.
Do not convert an unresolved same-surface problem into a clean completion summary.

## Example Handoff

```json
{
  "salientSummary": "Added 'issue.reviewer_wake_deferred' activity log entry to worker-done handler when no idle reviewer found. Wrote 2 new test cases in issue-worker-done-route.test.ts (red→green proven). pnpm test:run: 144 files, 733 passed.",
  "whatWasImplemented": "In server/src/routes/issues.ts worker-done handler (~line 1491): added logActivity call when reviewerAgent is null, logging action 'issue.reviewer_wake_deferred'. Added 2 test cases to issue-worker-done-route.test.ts covering the no-reviewer path.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "pnpm vitest run server/src/__tests__/issue-worker-done-route.test.ts",
        "exitCode": 0,
        "observation": "7 tests pass (was 5, added 2 new: 'logs reviewer_wake_deferred when no reviewer idle' and 'returns reviewerWakeQueued false when no reviewer')"
      },
      {
        "command": "pnpm test:run",
        "exitCode": 0,
        "observation": "143 test files, 733 tests passed, 9 skipped"
      },
      {
        "command": "pnpm -r typecheck",
        "exitCode": 0,
        "observation": "No type errors"
      }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      {
        "file": "server/src/__tests__/issue-worker-done-route.test.ts",
        "cases": [
          {
            "name": "logs reviewer_wake_deferred activity entry when no reviewer agent is idle",
            "verifies": "VAL-WAKE-001 — deferred activity log recorded"
          },
          {
            "name": "returns reviewerWakeQueued: false when no idle reviewer exists",
            "verifies": "VAL-WAKE-001 — response shape when no reviewer"
          }
        ]
      }
    ]
  },
  "discoveredIssues": [],
  "tddProof": "Test 'logs reviewer_wake_deferred activity entry when no reviewer agent is idle' failed with 'Expected mockLogActivity to have been called with action: issue.reviewer_wake_deferred' before the logActivity call was added to the no-reviewer branch."
}
```

## When to Return to Orchestrator

Return with a clear reason — never pause silently. The reason must be specific enough for the orchestrator to act without re-reading the full session.

Return when:
- The file to be modified has unexpected structure that contradicts the feature description
- A circular import issue blocks an import that the feature spec assumed would work
- Any test failure that cannot be resolved within 2 attempts
- Scope requires touching files outside the approved list in AGENTS.md
- A discovered issue is blocking and requires a different approach than specified
- `git log --oneline -1` does not show your commit after `git commit` (HEAD drift — do not guess)
- the same file slice keeps being reread after one forced alternate move (local read-loop)

**Pausing rule**: If you must pause before completing a feature, write the exact reason in `whatWasLeftUndone` before pausing. "Pausing to think" is not a reason. State what was done, what the next concrete step is, and what specific uncertainty caused the pause.
