---
name: shared-package-worker
description: Worker for implementing and testing shared package utilities, validators, and types
---

# Shared Package Worker

## When to Use This Skill

Features in the `@paperclipai/shared` package that involve:
- Adding new validation helpers, schemas, or types
- Creating test coverage for shared utilities
- Setting up package-level test infrastructure

## Required Skills

None - this worker uses standard file operations and Vitest.

## Work Procedure

1. **Read and understand the target file**
   - Read the existing file(s) to understand patterns and conventions
   - Note existing imports, exports, and coding style

2. **Write tests first (RED)**
   - Create or update the test file with test cases BEFORE implementation
   - Tests must fail initially (demonstrating they test something real)
   - Use Vitest patterns: `describe`, `it`, `expect`
   - Follow existing test patterns from other packages if available
   - Include edge cases and error cases

3. **Implement the feature (GREEN)**
   - Add the implementation to make tests pass
   - Follow existing code patterns in the file
   - Use proper TypeScript types
   - Ensure exports are correct

4. **Verify with typecheck**
   - Run `pnpm -r typecheck` to ensure TypeScript compiles
   - Fix any type errors

5. **Run tests to confirm**
   - Run `pnpm vitest run packages/shared` to execute tests
   - Verify all tests pass
   - If tests fail, fix the implementation

6. **Final verification**
   - Verify the implementation matches the feature description
   - Ensure all exports are present
   - Run `pnpm -r typecheck` one more time to confirm no regressions

## Example Handoff

```json
{
  "salientSummary": "Added validateIssueStatusTransition helper function and comprehensive tests. The function validates status transitions with business rules, returning { valid, reason? }. All 8 test cases pass, typecheck clean.",
  "whatWasImplemented": "Created validateIssueStatusTransition function that takes { from, to } IssueStatus values and returns validation result with reason for failures. Added 8 Vitest test cases covering allowed transitions, blocked transitions, same status, and invalid inputs. Created packages/shared/vitest.config.ts to include shared package in test workspace.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm -r typecheck", "exitCode": 0, "observation": "TypeScript compiles without errors" },
      { "command": "pnpm vitest run packages/shared", "exitCode": 0, "observation": "All 8 tests pass" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      {
        "file": "packages/shared/src/validators/issue.test.ts",
        "cases": [
          { "name": "allows backlog -> in_progress", "verifies": "Allowed transition returns valid: true" },
          { "name": "blocks done -> in_progress", "verifies": "Blocked transition returns valid: false with reason" },
          { "name": "allows same status", "verifies": "backlog -> backlog is valid" },
          { "name": "rejects invalid status", "verifies": "Unknown status returns valid: false with reason" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Preconditions are not met (e.g., target file doesn't exist, dependencies missing)
- Type errors that cannot be resolved within the feature scope
- Test failures that indicate design flaws or ambiguous requirements
- Discovery that the approach needs fundamental change
