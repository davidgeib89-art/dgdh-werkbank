---
name: worker
description: Implements task-discovery features (GitHub templates, doc, CLI command)
---

# Worker Skill

## When to Use This Skill

This skill is used for implementing task-discovery features:
- Creating GitHub issue and PR templates
- Creating task-discovery documentation
- Adding CLI commands for issue visibility

## Required Skills

None required for this skill - uses standard file operations.

## Work Procedure

1. **Read the feature specification** from features.json to understand what's required

2. **GitHub Templates (for m1-github-templates feature):**
   - Create `.github/ISSUE_TEMPLATE/feature_request.md` with title, labels, description sections
   - Create `.github/ISSUE_TEMPLATE/bug_report.md` with reproduction steps field
   - Create `.github/ISSUE_TEMPLATE/chore.md` for maintenance tasks
   - Create `.github/PULL_REQUEST_TEMPLATE.md` with description and related issues sections

3. **Task-Discovery Doc (for m1-task-discovery-doc feature):**
   - Create `doc/TASK-DISCOVERY.md`
   - Document work entry (GitHub issues → company issues)
   - Document classification method (status labels)
   - Document bounded mountain cutting (reference liveness command)
   - Document 6-label taxonomy: kind:feature, kind:bug, kind:chore, status:ready, status:blocked, status:active
   - Reference AGENTS.md, CURRENT.md without duplicating content

4. **CLI Command (for m2-cli-task-discovery-command feature):**
   - Add `issue next` subcommand to cli/src/commands/client/issue.ts
   - Query issues by status (ready, active, blocked)
   - Display identifier, title, status, assignee in output
   - Test command with `pnpm paperclipai issue next`

5. **Verification:**
   - Run `pnpm paperclipai issue --help` to verify command registered
   - Check all files exist at specified paths

## Example Handoff

```json
{
  "salientSummary": "Created GitHub issue templates, PR template, and task-discovery doc. Added issue next CLI command.",
  "whatWasImplemented": "3 issue templates (feature, bug, chore), PR template, doc/TASK-DISCOVERY.md with label taxonomy, paperclipai issue next command",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm paperclipai issue --help", "exitCode": 0, "observation": "next command shown" },
      { "command": "test -f .github/ISSUE_TEMPLATE/feature_request.md", "exitCode": 0, "observation": "template exists" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- If CLI build fails and cannot be fixed
- If feature requirements are ambiguous
- If validation assertions cannot be met
