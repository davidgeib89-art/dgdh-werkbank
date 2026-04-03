# Task Discovery

How to find, classify, and cut bounded work in DGDH-Werkbank / Paperclip.

> For execution details, see [AGENTS.md](../AGENTS.md). For live baton, see [CURRENT.md](../CURRENT.md). For firm direction, see [company-hq/AI-CONTEXT-START-HERE.md](../company-hq/AI-CONTEXT-START-HERE.md).

---

## Where Work Enters

New work enters through GitHub issues created via templates in `.github/ISSUE_TEMPLATE/`:

| Template | Use When | Auto-label |
|----------|----------|------------|
| `feature_request.md` | New capability or enhancement | `kind:feature` |
| `bug_report.md` | Something is broken | `kind:bug` |
| `chore.md` | Maintenance, refactoring, cleanup | `kind:chore` |

Issues then become visible to Paperclip agents through the Werkbank runtime and CLI.

---

## Label Taxonomy

We use exactly 6 labels. Labels are for lightweight classification, not project-management theater.

### Kind Labels

| Label | Meaning |
|-------|---------|
| `kind:feature` | New capability or enhancement |
| `kind:bug` | Defect or unexpected behavior |
| `kind:chore` | Maintenance, refactoring, cleanup |

### Status Labels

| Label | Meaning |
|-------|---------|
| `status:ready` | Human planning signal: clear enough to start, bounded enough to review |
| `status:active` | Human planning signal: currently being worked or intentionally in flight |
| `status:blocked` | Human planning signal: waiting on a dependency, decision, or external input |

### Rules

- An issue should have exactly one `kind:` label.
- Status labels are optional planning aids, not the canonical runtime truth surface.
- If `status:blocked` is applied, add a comment explaining the blocker.
- Do not add `priority:` or `size:` label families.

Important:
- GitHub labels help humans classify incoming work.
- Paperclip runtime issue status is the canonical truth used by CLI commands such as `paperclipai issue next`.

---

## CLI Discovery

Use the CLI to inspect what exists and what is currently work-ready in Paperclip runtime terms:

```bash
# See help for issue commands
pnpm paperclipai issue --help

# Check a specific issue's liveness and runtime truth
pnpm paperclipai issue liveness <issue-id>

# See issues grouped by Paperclip runtime status
pnpm paperclipai issue next
```

`paperclipai issue next` currently groups issues as:

- `ready`: issues in runtime status `todo`
- `active`: issues in runtime status `in_progress` or `in_review`
- `blocked`: issues in runtime status `blocked`

It is a useful task-discovery surface, but it is still a runtime-status view, not a full automatic "ready to cut" judge.

---

## What Makes a Reviewable Mountain

A genuinely reviewable mountain should have:

1. Bounded scope: describable in a few sentences
2. Clear entry point: where to start and what surface is in play
3. Clear exit criteria: what done means
4. No hidden dependency that will explode mid-run
5. A reviewable blast radius

`status:ready` should be used when a human believes those conditions are substantially true.

---

## Planning Language

We use these terms in planning documents such as [CURRENT.md](../CURRENT.md) and [MEMORY.md](../MEMORY.md):

| Term | Meaning |
|------|---------|
| **Core** | Real Werkbank / Paperclip mountains that advance the product |
| **Smaller** | Bounded fixes that remove real carrying-path friction |
| **Later** | Valid ideas deferred until a Core mountain needs them |
| **Slop** | Rejected work that adds process without adding reviewable reality |

These are planning terms, not GitHub labels.

---

## Flow Summary

```text
GitHub issue via template
  -> kind:feature / kind:bug / kind:chore
  -> optional human planning label: status:ready / status:active / status:blocked
  -> Paperclip runtime issue exists
  -> paperclipai issue next shows runtime-ready / runtime-active / runtime-blocked work
  -> execution, review, merge
  -> closed issue is the final completion signal
```

---

## References

- [AGENTS.md](../AGENTS.md) - execution rules, conventions, and commands
- [CURRENT.md](../CURRENT.md) - live baton: what is active now
- [MEMORY.md](../MEMORY.md) - stable cross-session truth
- [company-hq/AI-CONTEXT-START-HERE.md](../company-hq/AI-CONTEXT-START-HERE.md) - firm direction and canon index
- [Mission Autonomy Doctrine](../doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md) - how missions are structured
- [Predictive Delivery Doctrine](../doc/plans/2026-03-30-dgdh-predictive-delivery-doctrine.md) - branch truth, runtime truth, packet truth
