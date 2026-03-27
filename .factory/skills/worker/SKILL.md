---
name: worker
description: TypeScript server-side implementation worker for the DGDH Paperclip codebase. Writes tests first (TDD), implements to make them pass, verifies with pnpm test:run and pnpm -r typecheck.
---

# Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for all code implementation features in this mission:
- Adding activity log entries to existing route handlers
- Adding new exported functions/constants to heartbeat.ts
- Adding new test files (heartbeat-reviewer-wake-retry.test.ts)
- Extending existing test files
- Adding API response fields to existing routes
- Documentation-only updates (CURRENT.md, ACTIVE-MISSION.md, MEMORY.md)

## Required Skills

None. This is a pure TypeScript/Vitest implementation worker.

## Work Procedure

### Step 0: Read the feature description and AGENTS.md
Before touching any file, read:
1. The assigned feature's `description`, `preconditions`, `expectedBehavior`, and `verificationSteps` from features.json
2. `C:\Users\holyd\.factory\missions\3affaed3-5342-43af-aafc-33768b2beab2\AGENTS.md`
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

### Step 3: Run broader test suite
1. `pnpm test:run` — must pass with 143+ test files
2. `pnpm -r typecheck` — must exit 0 with no errors
3. If either fails, fix before proceeding

### Step 4: Scope check before handoff
Before calling worker-pr and worker-done:
1. Run `git diff --name-only` — confirm only the files listed in the feature's scope changed
2. If unexpected files appear, fix the scope problem
3. summary.files must match exactly what git shows

### Step 5: Commit and handoff
```
git add <files>
git commit -m "<scope>: <what changed>"
# then worker-pr → worker-done
```

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

- The file to be modified has unexpected structure that contradicts the feature description
- A TypeScript circular import issue arises when importing `REVIEWER_WAKE_RETRY_THRESHOLD_MS` from heartbeat.ts into issues.ts
- Any test failure that cannot be resolved within 2 attempts
- scope requires touching files outside the approved list in AGENTS.md
- A discovered issue is blocking and requires a different approach than specified
