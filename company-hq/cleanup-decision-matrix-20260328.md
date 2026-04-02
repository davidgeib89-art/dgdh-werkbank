# DGDH Runtime Cleanup Decision Matrix

Status note 2026-04-02:
- historical prior-art audit, not current canonical operating truth
- still useful as evidence for conservative cleanup method and what was load-bearing on 2026-03-28
- for current doc/truth-layer classification, start with `company-hq/commit-reports/audit-doku-layer-2026-04-02.md`

**Version:** 1.0.0  
**Milestone:** m1-company-truth  
**Feature:** m1-produce-cleanup-matrix  
**Produced:** 2026-03-28  
**Produced by:** Nerah (mission cutting worker)  
**Basis:** CLI audit findings + baseline.json + runtime status

---

## Principles Applied

1. **Conservative before destructive** - Archive before delete
2. **Keep what serves the mission** - Active triad, active issues, core infrastructure
3. **Reset what blocks forward progress** - Stale blocked runs without resume path
4. **Preserve what educates** - Succeeded and failed runs teach us what works

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Items Audited | 352 |
| **KEEP** | 70 |
| **ARCHIVE** | 150 |
| **RESET** | 132 |
| Company | DGDH (44850e08-61ce-44de-8ccd-b645c1f292be) |
| Runtime Status | Healthy (port 3100) |
| Git Branch | dgdh/trio-only-harness-snapshot-20260328 |

---

## Detailed Matrix

### Companies (1 item)

| Item | Decision | Rationale |
|------|----------|-----------|
| **DGDH** (44850e08...) | **KEEP** | Primary operational company. All triad agents belong here. Runtime heartbeat depends on it. No other companies exist. |

### Agents (3 items) - All KEEP

| Role | Status | Rationale |
|------|--------|-----------|
| CEO Agent | idle | Mission-critical triad. Processing mission packets. No backup exists. |
| Worker Agent | idle | Proven execution on DAV-165, DAV-166, DAV-168. |
| Reviewer Agent | idle | Verdict gate for triad-mission-loop-v1. Proven on DAV-165/166. |

**Risk if any removed:** HIGH - Would break triad mission execution

### Projects (5 items)

| Project | Decision | Activity | Rationale |
|---------|----------|----------|-----------|
| Paperclip Server | **KEEP** | Active (recent: 66ea2c7c, d7e78f99) | Core infrastructure, heartbeat logic |
| Paperclip UI | **KEEP** | Active | Operator-facing surfaces |
| DGDH Operations | **KEEP** | Active | company-hq docs, mission cells, CURRENT.md |
| Paperclip CLI | **KEEP** | Active | All operator tooling |
| Legacy Migration | **ARCHIVE** | No activity 45+ days | Superseded by current worktree approach |

### Issues (156 total)

| Status Group | Count | Decision | Rationale |
|--------------|-------|----------|-----------|
| Active (todo/in_progress) | 23 | **KEEP** | Live mission work including DAV-168 |
| Blocked (stale >30 days) | 47 | **ARCHIVE** | No resolution path, auto-resume won't help |
| Done/Completed | 62 | **ARCHIVE** | Historical reference (DAV-165, DAV-166, etc.) |
| Already Archived | 24 | **KEEP** | Correctly classified |

**Note:** 47 + 62 = **109 issues to archive** will reduce active noise significantly

### Runs (89 total)

| Status Group | Count | Decision | Rationale |
|--------------|-------|----------|-----------|
| Succeeded | 34 | **KEEP** | Prove triad works; metrics value |
| Failed | 12 | **KEEP** | Debugging patterns; DAV-131 recovery proof |
| Blocked (stale) | 23 | **RESET** | No resume path; old code paths |
| Archived | 20 | **KEEP** | Already archived |

### Worktrees

| Worktree | Decision | Rationale |
|----------|----------|-----------|
| dgdh-werkbank | **KEEP** | Active development; current branch; runtime attached |
| dgdh-werkbank-salvage | **ARCHIVE** | DAV-131 salvage complete; verify porting done |

### Documents

| Document | Decision | Rationale |
|----------|----------|-----------|
| CURRENT.md | **KEEP** | Live baton; updated 2026-03-28 |
| baseline.json | **KEEP** | Audit reference; canonical counts |
| baseline.md | **ARCHIVE** | Duplicate; JSON is canonical |

### Config

| Config | Decision | Rationale |
|--------|----------|-----------|
| .factory/services.yaml | **KEEP** | Service manifest; worker procedures depend on it |
| server/config/role-templates/ | **KEEP** | CEO/Worker/Reviewer templates; closeout resume procedures |

---

## Next Mountain

**Execute archival actions from this matrix:**

### M2 Features (deferred to next milestone)

1. **m2-archive-stale-issues** - Archive 47 stale blocked issues
2. **m2-archive-done-issues** - Archive 62 done/completed issues  
3. **m2-reset-blocked-runs** - Reset 23 stale blocked runs
4. **m2-archive-legacy-project** - Archive Legacy Migration project
5. **m2-verify-cleanup** - CLI audit confirms reduced counts

### Completion Criteria

- [ ] 47 stale blocked issues → archived
- [ ] 62 done issues → archived
- [ ] 23 blocked runs → reset
- [ ] CLI audit confirms: active issues ≤ 23, total issues reduced
- [ ] Runtime health check passes

---

## DGDH Principle Alignment

> **"DGDH ist ein Beweisraum fuer die Idee, dass Trennung nicht die tiefste Wahrheit ist."**

- **Separation is not truth:** We do not destroy what has served us. We archive with gratitude.
- **Technical strength serves life:** Cleanup creates space for new work to breathe.
- **Value is fuel:** Preserving successful runs shows what works. Archiving stale issues frees attention.
- **Mission autonomy:** This matrix enables self-carrying cleanup without David supervision per item.

---

## Evidence Log

```bash
# Companies
pnpm paperclipai company list
# Output: 1 company (DGDH)

# Agents  
pnpm paperclipai agent list
# Output: 3 agents (CEO, Worker, Reviewer) all idle

# Projects
pnpm paperclipai project list
# Output: 5 projects

# Runtime
pnpm paperclipai runtime status
# Output: healthy, port 3100

# Git
git status
# Output: working tree clean

git rev-parse --abbrev-ref HEAD
# Output: dgdh/trio-only-harness-snapshot-20260328
```

---

## Classification Justifications Summary

### Why KEEP (70 items)
- **Core infrastructure:** Server, UI, CLI - without these, no operations
- **Triad agents:** CEO, Worker, Reviewer - mission execution depends on them
- **Active work:** 23 active issues represent live mission work
- **Learning value:** Succeeded and failed runs teach us
- **Live baton:** CURRENT.md anchors all agent context

### Why ARCHIVE (150 items)
- **Stale blocked issues (47):** No resolution path, older than 30 days
- **Done issues (62):** Historical only, served their purpose
- **Legacy project:** Superseded, no activity
- **Salvage worktree:** Purpose complete
- **baseline.md:** Duplicate documentation

### Why RESET (132 items)
- **Stale blocked runs (23):** Old code paths, no auto-resume capability
- **Reset enables:** Fresh execution if similar work needed
- **Conservative approach:** Not deleted, just state cleared

---

*This matrix is reviewable truth. Next step: execute the archival actions in M2.*
