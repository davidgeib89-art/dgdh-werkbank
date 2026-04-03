# Task Discovery

How to find, classify, and cut bounded work in DGDH-Werkbank / Paperclip.

> For execution details, see [AGENTS.md](../AGENTS.md). For live baton, see [CURRENT.md](../CURRENT.md). For firm direction, see [company-hq/AI-CONTEXT-START-HERE.md](../company-hq/AI-CONTEXT-START-HERE.md).

---

## Where Work Enters

New work enters through **GitHub issues** created via templates in `.github/ISSUE_TEMPLATE/`:

| Template | Use When | Auto-label |
|----------|----------|------------|
| `feature_request.md` | New capability or enhancement | `kind:feature` |
| `bug_report.md` | Something is broken | `kind:bug` |
| `chore.md` | Maintenance, refactoring, cleanup | `kind:chore` |

Issues graduate to **company issues** via the Werkbank runtime and become visible to agents through the CLI.

---

## Label Taxonomy

We use exactly 6 labels. No more, no less. Labels are for classification, not project management theater.

### Kind Labels (What it is)

| Label | Meaning |
|-------|---------|
| `kind:feature` | New capability or enhancement |
| `kind:bug` | Defect or unexpected behavior |
| `kind:chore` | Maintenance, refactoring, cleanup |

### Status Labels (Where it stands)

| Label | Meaning |
|-------|---------|
| `status:ready` | Clear enough to start. Bounded scope. No blockers. |
| `status:active` | Currently in execution by an agent |
| `status:blocked` | Waiting on dependency, decision, or external input |

**Rules:**
- An issue should have exactly one `kind:` and one `status:` label at any time.
- `status:ready` means the issue is ready to be picked up by `paperclipai issue next`.
- `status:active` is set automatically when work begins.
- `status:blocked` requires a comment explaining the blocker.

---

## How Bounded Mountains Are Cut

### CLI Discovery

Use the CLI to see what is ready to work:

```bash
# See help for issue commands
pnpm paperclipai issue --help

# Check a specific issue's readiness (packet truth, chain truth, active-run truth)
pnpm paperclipai issue liveness <issue-id>
```

### What Makes a "Ready" Mountain

A `status:ready` issue should have:

1. **Bounded scope** — Can be described in 2-3 sentences
2. **Clear entry point** — Where to start, what files to touch
3. **Clear exit criteria** — What "done" looks like
4. **No hidden dependencies** — Everything it needs is already true
5. **Single-file or small surface** — Prefer changes that fit in reviewable diffs

### Planning Language (Not Labels)

We use these terms in planning documents like [CURRENT.md](../CURRENT.md) and [MEMORY.md](../MEMORY.md):

| Term | Meaning |
|------|---------|
| **Core** | Real Werkbank / Paperclip mountains that advance the product |
| **Smaller** | Bounded harness fixes that remove carrying-path friction |
| **Later** | Valid ideas deferred until a Core mountain needs them |
| **Slop** | Rejected — adds process without adding reviewable reality |

These are planning terms, not labels. Do not create `priority:` or `size:` labels.

---

## Flow Summary

```
GitHub Issue (template) 
    ↓
kind:feature / kind:bug / kind:chore + status:blocked
    ↓
Scope clarified → status:ready
    ↓
paperclipai issue next → picked up by agent
    ↓
status:active → execution → PR → review → merge
    ↓
Done (no label needed — closed is the signal)
```

---

## References

- [AGENTS.md](../AGENTS.md) — Execution rules, conventions, and commands
- [CURRENT.md](../CURRENT.md) — Live baton: what is active now
- [MEMORY.md](../MEMORY.md) — Stable cross-session truth
- [company-hq/AI-CONTEXT-START-HERE.md](../company-hq/AI-CONTEXT-START-HERE.md) — Firm direction and canon index
- [Mission Autonomy Doctrine](../doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md) — How missions are structured
- [Predictive Delivery Doctrine](../doc/plans/2026-03-30-dgdh-predictive-delivery-doctrine.md) — Branch truth, runtime truth, packet truth
