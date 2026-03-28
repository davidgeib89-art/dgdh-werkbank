---
name: cli-worker
description: DGDH CLI implementation worker for Paperclip. Writes tests first, implements CLI commands, verifies with typecheck and build.
---

# CLI Worker

## When to Use This Skill

CLI command implementations in the `paperclipai` CLI package that:
- Add new subcommands to existing command groups
- Follow existing patterns from `cli/src/commands/client/`
- Require API integration with backend endpoints
- Need both human-readable and JSON output modes

## Required Skills

None. This worker handles CLI implementation directly.

## Work Procedure

1. **Read existing patterns first**
   - Read `cli/src/commands/client/agent.ts` for current `agent` command patterns
   - Read `cli/src/commands/client/common.ts` for helper functions
   - Read `cli/src/index.ts` to understand registration pattern

2. **Write tests first (TDD)**
   - Create test file in `cli/src/__tests__/` following existing patterns
   - Mock API responses using vi.fn()
   - Test both success and error paths
   - Test both JSON and human-readable output
   - If the command shows or transforms domain state, add at least one non-happy-path state-matrix test
   - Name the valid states explicitly before implementation when the feature is about status, health, readiness, or summaries
   - Run tests to confirm they fail (red phase)

3. **Implement the command**
   - Add to existing `cli/src/commands/client/agent.ts`
   - Use `addCommonClientOptions`, `resolveCommandContext`, `printOutput`
   - Follow ESM import conventions with `.js` extensions
   - Use TypeScript strict mode
   - Call the appropriate API endpoints
   - Preserve explicit domain states unless the contract explicitly says to map them
   - Do not silently default non-running states to `idle` or non-error states to `ok`

4. **Verify implementation**
   - Run tests: `pnpm --filter paperclipai exec vitest run src/__tests__/agent-status.test.ts`
   - Run typecheck: `pnpm --filter paperclipai typecheck`
   - Run build: `pnpm --filter paperclipai build`
   - Manual test: `pnpm paperclipai agent status --help`

5. **Commit with clear message**
   - Use conventional commit format: `feat(cli): add agent status command`

## Example Handoff

```json
{
  "salientSummary": "Implemented `paperclipai agent status` command showing agent runtime state with idle/busy status, current/last run info, and triad readiness. Tests cover JSON and human output modes. Typecheck and build pass.",
  "whatWasImplemented": "Added `agent status` subcommand to cli/src/commands/client/agent.ts. Fetches /api/companies/:id/agents/health for triad status, /api/companies/:id/agents for agent list, /api/companies/:id/live-runs for current activity. Shows per-agent: id, name, role, status (idle/running), currentRun (if busy), lastRun (if idle). Supports --json flag for programmatic use. Added 4 test cases covering happy path, error handling, JSON output, and empty state.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {"command": "pnpm --filter paperclipai exec vitest run src/__tests__/agent.test.ts", "exitCode": 0, "observation": "4 tests passed, 0 failed"},
      {"command": "pnpm --filter paperclipai typecheck", "exitCode": 0, "observation": "no errors"},
      {"command": "pnpm --filter paperclipai build", "exitCode": 0, "observation": "build completed successfully"},
      {"command": "pnpm paperclipai agent status --help", "exitCode": 0, "observation": "shows usage with -C, --company-id required option and --json flag"}
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      {
        "file": "cli/src/__tests__/agent.test.ts",
        "cases": [
          {"name": "status shows agents with current runs", "verifies": "Human-readable output with id, name, role, status, currentRun"},
          {"name": "status --json returns valid JSON", "verifies": "JSON output mode produces parseable agent array"},
          {"name": "status handles empty agent list", "verifies": "Graceful handling when company has no agents"},
          {"name": "status shows last run for idle agents", "verifies": "Idle agents display last completed run info"}
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- API endpoint doesn't exist or returns unexpected format
- Existing command patterns are inconsistent or unclear
- Typecheck or build fails with errors outside your changes
- Test infrastructure issues (missing mocks, etc.)
- The feature description says "show status" or similar but does not specify which domain states must be preserved
