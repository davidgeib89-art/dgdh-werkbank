# Markdown Truth Audit v1

Date: 2026-03-31
Scope: all tracked `.md` files in this repository (`git ls-files '*.md'` = 380 files)
Method: first-principles audit against current code, current git truth, current DGDH runtime/operator docs, and current harness behavior
Primary evidence used:
- `package.json`
- `CURRENT.md`
- `MEMORY.md`
- `company-hq/AI-CONTEXT-START-HERE.md`
- `company-hq/ACTIVE-MISSION.md`
- `company-hq/CORE.md`
- `doc/DGDH-AI-OPERATOR-RUNBOOK.md`
- `README.md`
- `docs/start/*`, `docs/api/*`, `docs/cli/*`, `docs/adapters/*`
- `doc/PRODUCT.md`, `doc/SPEC.md`, `doc/CLI.md`, `doc/DEVELOPING.md`
- `packages/shared/src/constants.ts`
- `server/src/routes/health.ts`
- recent git history through `git log --no-merges`

## Executive Summary
Repo-level doc health is split, not uniformly bad. The DGDH execution kernel is strong: `AGENTS.md`, the baton files, mission contracts, soul/dock docs, the operator runbook, and the active `.factory` skill substrate are mostly coherent and backed by current repo/runtime truth. The larger problem is the perimeter: public product docs, old `doc/` manuals, stale root artifacts, and dated strategic files in active-looking locations still compete for authority.

Major drift patterns:
- multiple conflicting entrypoints for new agents
- public docs that still describe an older Paperclip adapter/API/CLI surface
- dated plans and roadmaps left in active folders after newer doctrine landed
- old Gemini-/Claude-centric governance docs that no longer match the current Trinity, Copilot lane, or mission-autonomy mode
- one-off root artifacts and setup notes that still look authoritative long after the repo shape changed

Biggest risks caused by stale docs:
- wrong runtime assumptions (`--api-base` vs `--api-url`, auth assumptions, triad/operator route omissions)
- wrong mission framing (older Gemini-first lane assumptions, old role maps, inactive mission-autonomy claims)
- wrong git/promotion assumptions (older setup docs and historical root artifacts)
- wasted David minutes from reading the wrong “important” file first

Current docs are helping autonomous execution only where the docs are narrow, active, and close to runtime truth. Outside that kernel they are hurting more than helping, because stale files still occupy prominent paths and names.

## Assumption Strip-Down
Common documentation assumptions stripped away for this audit:
- that a markdown file is current because it exists
- that a central-sounding filename is authoritative
- that public docs match current code/runtime
- that dated plans are harmless if left in active folders
- that a draft is better than no doc

What remains fundamentally true:
- code, tests, routes, CLI flags, and current git state are the primary truth surfaces
- `CURRENT.md`, `MEMORY.md`, `company-hq/ACTIVE-MISSION.md`, `AGENTS.md`, `company-hq/CORE.md`, and `doc/DGDH-AI-OPERATOR-RUNBOOK.md` are the real DGDH operating anchors
- historical docs are only safe when their path clearly scopes them as historical
- stale docs in active-looking paths are operational hazards, not neutral clutter

## Classification Legend
Reason codes used in the classification tables:
- `K1` canonical active truth surface
- `K2` active scoped operator/product/reference doc
- `K3` scoped historical/research/backlog record; low risk because the path already demotes it
- `K4` active skill/prompt/harness substrate
- `U1` active docs lag current code/runtime/product surface
- `U2` active entrypoint/governance/strategy doc conflicts with current canon
- `A1` dated but still sitting in an active-looking path; should move to archive
- `A2` duplicate or superseded authority; keeping it in place creates false gravity
- `D1` orphan/duplicate artifact with no durable value
- `H1` generated/customer content; human must decide whether it is fixture, sample, or accidental residue

## Classification Table
### Root, Agent Docks, Prompt Surface
| Path | Category | Confidence | Operational Importance | Truth Status | First-Principles Status | Short Reason |
|---|---|---:|---:|---|---|---|
| `.agents/skills/create-agent-adapter/SKILL.md` | keep | high | medium | accurate | sound | `K4` active skill substrate |
| `.agents/skills/dgdh-workbench-expert/SKILL.md` | keep | high | high | accurate | sound | `K4` active repo skill |
| `.agents/skills/doc-maintenance/SKILL.md` | keep | high | medium | accurate | sound | `K4` active maintenance skill |
| `.agents/skills/doc-maintenance/references/audit-checklist.md` | keep | high | low | accurate | sound | `K4` scoped skill reference |
| `.agents/skills/doc-maintenance/references/section-map.md` | keep | high | low | accurate | sound | `K4` scoped skill reference |
| `.agents/skills/pr-report/SKILL.md` | keep | high | medium | accurate | sound | `K4` active skill substrate |
| `.agents/skills/pr-report/references/style-guide.md` | keep | high | low | accurate | sound | `K4` scoped skill reference |
| `.agents/skills/release-changelog/SKILL.md` | keep | high | medium | accurate | sound | `K4` active skill substrate |
| `.agents/skills/release/SKILL.md` | keep | high | medium | accurate | sound | `K4` active skill substrate |
| `.changeset/README.md` | keep | high | low | accurate | sound | `K2` active tooling reference |
| `.claude/skills/design-guide/SKILL.md` | keep | high | medium | accurate | sound | `K4` active design skill |
| `.claude/skills/design-guide/references/component-index.md` | keep | high | low | accurate | sound | `K4` scoped design reference |
| `.github/agents/eidan.agent.md` | keep | high | medium | accurate | sound | `K2` active agent definition |
| `.github/copilot-instructions.md` | keep | high | high | accurate | sound | `K1` active instruction root |
| `.github/prompts/dgdh-truth-cut.prompt.md` | keep | high | medium | accurate | sound | `K2` active bounded prompt |
| `.hermes.md` | keep | medium | medium | accurate | sound | `K2` active Hermes dock |
| `AGENTS.md` | keep | high | high | accurate | sound | `K1` canonical repo operating guide |
| `CHATGPT.md` | keep | high | high | accurate | sound | `K1` active lane dock |
| `CODEX.md` | keep | high | high | accurate | sound | `K1` active lane dock |
| `CONTRIBUTING.md` | keep | medium | medium | partly stale | partially sound | `K2` still useful contribution entrypoint; no direct contradiction found |
| `COPILOT-SKILLS.md` | keep | high | high | accurate | sound | `K1` active Copilot skill layer |
| `COPILOT.md` | keep | high | high | accurate | sound | `K1` active lane dock |
| `CURRENT.md` | keep | high | high | accurate | sound | `K1` live baton truth |
| `DGDH-WERKBANK-SETUP.md` | archive | high | low | materially stale | unsound | `A2` contradictory old setup/remotes history in root |
| `DROID-MISSION.md` | archive | high | medium | materially stale | unsound | `A2` draft external droid brief superseded by `.factory` + mission contracts |
| `EXECUTOR.md` | keep | high | high | accurate | sound | `K1` active executor truth |
| `INIT.md` | update | high | high | materially stale | partially sound | `U2` active entrypoint still points at stale/absent canon |
| `MEMORY.md` | keep | high | high | accurate | sound | `K1` stable shared facts |
| `README.md` | update | high | high | materially stale | partially sound | `U1` public overview lags current adapters/CLI/runtime/docs shape |
| `REINIT.md` | update | high | high | materially stale | partially sound | `U2` active re-entry file conflicts with current Codex role and canon |
| `SOUL.md` | keep | high | high | accurate | sound | `K1` active soul contract |
| `TRINITY.md` | keep | high | high | accurate | sound | `K1` active direct-assistant contract |
| `ZERO_RESCUE.md` | delete | high | low | materially stale | unsound | `D1` orphan proof artifact with no durable operational value |
| `baseline.md` | delete | high | low | materially stale | unsound | `D1` duplicate text snapshot already superseded by `baseline.json`/cleanup matrix |
| `cli/CHANGELOG.md` | keep | high | low | accurate | sound | `K3` time-scoped release history |

### company-hq Canonical, Governance, and Root-Level Company Docs
| Path | Category | Confidence | Operational Importance | Truth Status | First-Principles Status | Short Reason |
|---|---|---:|---:|---|---|---|
| `company-hq/ACTIVE-MISSION.md` | keep | high | high | accurate | sound | `K1` compact-safe mission anchor |
| `company-hq/AGENT-CONSTITUTION.md` | update | high | high | materially stale | partially sound | `U2` governance file still encodes stale role stack |
| `company-hq/AGENT-PROFILES.md` | archive | high | medium | materially stale | unsound | `A1` dated Gemini-first lane sheet in active location |
| `company-hq/AI-CONTEXT-START-HERE.md` | keep | high | high | accurate | sound | `K1` canonical AI entrypoint |
| `company-hq/AUTONOMY-MODES.md` | update | high | high | materially stale | partially sound | `U2` says mission operations not active; current mission says they are |
| `company-hq/BUDGET-POLICY.md` | keep | medium | high | accurate | sound | `K1` governance core |
| `company-hq/CLAUDE-CODE-INIT.md` | archive | high | medium | materially stale | unsound | `A2` Claude-specific init frozen in pre-Trinity era |
| `company-hq/CORE.md` | keep | high | high | accurate | sound | `K1` shortest canonical heart |
| `company-hq/DGDH-CEO-CONTEXT.md` | keep | high | high | accurate | sound | `K1` canonical CEO orientation |
| `company-hq/DGDH-GEMINI-ENGINE-V1-2026-03-19.md` | keep | medium | medium | partly stale | partially sound | `K2` still referenced technical spec; future spot-check advisable |
| `company-hq/ESCALATION-MATRIX.md` | keep | medium | high | accurate | sound | `K1` governance core |
| `company-hq/HARNESS-LEARNINGS-FOR-DGDH-2026-03-18.md` | archive | high | medium | materially stale | partially sound | `A1` dated learning digest superseded by newer runbook/doctrine |
| `company-hq/IDLE-POLICY.md` | keep | medium | high | accurate | sound | `K1` governance core |
| `company-hq/MINIMAL-CORE-PROMPT-CONTRACT.md` | keep | medium | medium | accurate | sound | `K1` active contract doc |
| `company-hq/MODEL-ROADMAP.md` | archive | high | medium | materially stale | unsound | `A1` dated Gemini-centric roadmap in active location |
| `company-hq/README.md` | keep | high | medium | accurate | sound | `K1` directory index |
| `company-hq/ROADMAP.md` | update | high | high | materially stale | partially sound | `U2` still presents outdated Gemini/CEO-V1 phase as current |
| `company-hq/ROLE-ASSIGNMENT-RUNTIME-MAP-2026-03-18.md` | archive | high | medium | materially stale | unsound | `A1` dated runtime map left in active root |
| `company-hq/ROLE-ROUTING-CONTRACT.md` | keep | medium | medium | accurate | sound | `K2` active contract-shaped doc |
| `company-hq/TASK-BRIEF-TEMPLATE.md` | keep | medium | high | accurate | sound | `K1` governance core |
| `company-hq/TOKEN-ECONOMY-STRATEGY.md` | keep | medium | medium | accurate | sound | `K2` referenced strategy doc |
| `company-hq/VALIDATION-SAFETY-POLICY.md` | keep | medium | medium | accurate | sound | `K2` active safety policy |
| `company-hq/VISION.md` | keep | high | high | accurate | sound | `K1` canonical company vision |
| `company-hq/cleanup-decision-matrix-20260328.md` | archive | high | low | partly stale | partially sound | `A1` dated operational cleanup artifact in canonical root |

### company-hq Archived History, Commit Reports, Research, Souls
| Path | Category | Confidence | Operational Importance | Truth Status | First-Principles Status | Short Reason |
|---|---|---:|---:|---|---|---|
| `company-hq/archive/README.md` | keep | high | low | accurate | sound | `K3` archive index |
| `company-hq/archive/2026-03-18-legacy/CHATGPT-AGENT-EXPERT-PROMPT.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-18-legacy/DGDH-GEMINI-INTEGRATION-NOTE.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-18-legacy/DGDH-PROMPT-CORE-SHADOW-INTEGRATION-SPRINT-NOTE.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-18-legacy/DGDH-RE-SYNC-STATE-2026-03-17.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-18-legacy/EXTERNAL-ARCHITECTURE-RESEARCH-PLAN.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-18-legacy/EXTERNAL-RESEARCH-GATE-01.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-18-legacy/GITHUB-AGENT-ACCESS-WORKFLOW-2026-03-17.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-18-legacy/PLATFORM-VISION.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-18-legacy/PROMPT-RESOLVER-MILESTONE-NOTE.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-18-legacy/PROMPT-RESOLVER-SCHEMA-DRAFT.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-18-legacy/STAGE-1-SHARED-MEMORY-PILOT.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-18-legacy/STRATEGIC-STATE-SUMMARY.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/AI-HANDOFF-GEMINI-RUNTIME-PARITY-2026-03-18.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/BOARD-MEMO-PROBE-01-STATUS-2026-03-17.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/CHATGPT-AGENT-REPO-ONBOARDING-PROMPT-2026-03-18.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/CONTROLLED-LIVE-GATE-01-SHADOW-REVIEW.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/CONTROLLED-LIVE-PROBE-01-BOARD-PACKET.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/CONTROLLED-LIVE-PROBE-01-DECISION-BRIEF.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/CONTROLLED-LIVE-PROBE-01-OPS-CHECKLIST.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/CURRENT-STATE-REVIEW-2026-03-17.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/GEMINI-BENCHMARK-PACKET-01-2026-03-17.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/GEMINI-MICRO-BENCHMARK-SUITE-2026-03-18.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/GEMINI-T1-BASELINE-ANALYSIS-2026-03-18.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/GEMINI-T1-BENCHMARK-DESIGN-V2-2026-03-18.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/GEMINI-T1-DRY-RUN-CHECKBERICHT-2026-03-18.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/HANDOFF-gemini-routing-engine-2026-03-20.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/IMPLEMENTATION-PLAN-gemini-routing-engine.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/archive/2026-03-21-pre-live-quota/MORPH-INTEGRATION-PLAN-2026-03-18.md` | keep | high | low | accurate | sound | `K3` explicitly archived history |
| `company-hq/commit-reports/2026-03-19-1220-routing-consistency-stats-live.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1235-keep-sync-fix.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1310-quota-spine-v1-stats.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1415-routing-rationale-stats.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1435-health-decision-engine-sprint.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1505-route-contract-tests-health-endpoints.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1515-stats-route-contract-tests.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1520-runtime-task-sessions-contract-tests.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1530-stats-routing-history.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1600-stats-history-warnings.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1605-live-execution-read-surfaces-contract-tests.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1610-execution-observability-list-contract-tests.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1615-gemini-engine-control-plane-core.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1620-stats-budget-summary.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1640-stats-health-status.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1700-agent-health-endpoints.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1730-chatgpt-brief-next-big-sprint.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1750-gemini-quota-ingestion-persistence.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1830-gemini-quota-producer-refresh-path.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1900-quota-storage-boundary-correction.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1930-llm-assisted-routing-stage1-guardrails.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1945-routing-blocked-execution-gate-sprint.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-1950-policy-gate-status-semantics-sprint.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-2000-flash-lite-router-call-integration.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-2035-flash-lite-router-reliability-hardening.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-2110-flash-lite-work-packet-enforcement-sprint.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-19-2130-e2e-pipeline-chain-tests.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-20-approval-loop-v1-sprint.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-20-golden-path-continuity-v1-sprint.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-20-state-truth-sprint.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-20-work-engine-dgdh-fit-sprint.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-24-clean-main-company-run-blocker-isolation.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-24-productize-zero-rescue-company-run-bootstrap.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-24-routing-leak-fix-validation-and-worker-blocker.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-24-zero-rescue-company-run-from-clean-main.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/commit-reports/2026-03-25-copilot-first-principles-learning-loop-and-gate-stop.md` | keep | high | low | accurate | sound | `K3` scoped historical commit report |
| `company-hq/mission-contracts/eidan-triad-closeout-boring-v1.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/eidan-triad-loop-launch-v1.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/first-live-mission-cell-proof-v1.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/long-autonomy-mission-template.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/mission-autonomy-lane-v1.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/mission-cell-starter-path-v1.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/oberreviewer-risk-gate-v1.md` | keep | high | medium | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/repeatable-live-mission-cell-proof-v1.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/replay-eval-promotion-v1.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/self-learning-loop-1-initiation.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/triad-closeout-boring-after-post-tool-capacity-v1.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/triad-mission-loop-v1.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/mission-contracts/type1-type2-decision-policy-v1.md` | keep | high | high | accurate | sound | `K1` active mission contract |
| `company-hq/research/2026-03-21-knowledge-graph-memory-pattern.md` | keep | medium | low | unknown | partially sound | `K3` scoped research, not canon |
| `company-hq/research/2026-03-22-code-review-graph-review-research.md` | keep | medium | low | unknown | partially sound | `K3` scoped research, not canon |
| `company-hq/research/2026-03-24-724-office-dgdh-transfer-matrix.md` | keep | medium | low | unknown | partially sound | `K3` scoped research, not canon |
| `company-hq/research/2026-03-24-airweave-dgdh-transfer-matrix.md` | keep | medium | low | unknown | partially sound | `K3` scoped research, not canon |
| `company-hq/research/2026-03-24-cloudflare-code-mode-dgdh-transfer-matrix.md` | keep | medium | low | unknown | partially sound | `K3` scoped research, not canon |
| `company-hq/research/2026-03-24-error-monitoring-agent-dgdh-transfer-matrix.md` | keep | medium | low | unknown | partially sound | `K3` scoped research, not canon |
| `company-hq/research/2026-03-27-agentica-arcgentica-dgdh-transfer-matrix.md` | keep | medium | low | unknown | partially sound | `K3` scoped research, not canon |
| `company-hq/research/2026-03-27-onyx-dgdh-transfer-matrix.md` | keep | medium | low | unknown | partially sound | `K3` scoped research, not canon |
| `company-hq/research/The Harness.md` | keep | medium | low | unknown | partially sound | `K3` scoped research, not canon |
| `company-hq/souls/README.md` | keep | high | medium | accurate | sound | `K2` active soul profile index |
| `company-hq/souls/david-seed.md` | keep | high | medium | accurate | sound | `K2` active soul sublayer |
| `company-hq/souls/eidan.md` | keep | high | medium | accurate | sound | `K2` active soul subprofile |
| `company-hq/souls/nerah.md` | keep | high | medium | accurate | sound | `K2` active soul subprofile |
| `company-hq/souls/taren.md` | keep | high | medium | accurate | sound | `K2` active soul subprofile |

### `.factory` Droids, Library, Missions, Skills
| Path | Category | Confidence | Operational Importance | Truth Status | First-Principles Status | Short Reason |
|---|---|---:|---:|---|---|---|
| `.factory/droids/eidan.md` | keep | high | medium | accurate | sound | `K4` active droid profile |
| `.factory/droids/nerah.md` | keep | high | medium | accurate | sound | `K4` active droid profile |
| `.factory/droids/taren.md` | keep | high | medium | accurate | sound | `K4` active droid profile |
| `.factory/library/architecture.md` | keep | medium | medium | accurate | sound | `K4` active factory library |
| `.factory/library/environment.md` | keep | medium | medium | accurate | sound | `K4` active factory library |
| `.factory/library/first-principles-mission-cutting.md` | keep | high | high | accurate | sound | `K4` active mission-cutting substrate |
| `.factory/library/kimi-role-stack-smoke-mission.md` | keep | medium | medium | accurate | sound | `K4` active factory library |
| `.factory/library/model-routing.md` | keep | medium | medium | accurate | sound | `K4` active factory library |
| `.factory/library/orchestrator-lessons.md` | keep | high | medium | accurate | sound | `K4` active lessons substrate |
| `.factory/library/user-testing.md` | keep | medium | low | accurate | sound | `K4` active factory library |
| `.factory/missions/second-triad-proof-validation-contract.md` | keep | high | medium | accurate | sound | `K4` active mission artifact |
| `.factory/missions/smoke-proof-AGENTS.md` | keep | high | medium | accurate | sound | `K4` active mission artifact |
| `.factory/missions/smoke-proof-mission.md` | keep | high | medium | accurate | sound | `K4` active mission artifact |
| `.factory/missions/smoke-proof-validation-contract.md` | keep | high | medium | accurate | sound | `K4` active mission artifact |
| `.factory/skills/cli-worker/SKILL.md` | keep | high | medium | accurate | sound | `K4` active worker skill |
| `.factory/skills/eidan-carry/SKILL.md` | keep | high | medium | accurate | sound | `K4` active worker skill |
| `.factory/skills/eidan/SKILL.md` | keep | high | high | accurate | sound | `K4` active worker skill |
| `.factory/skills/nerah-cut/SKILL.md` | keep | high | medium | accurate | sound | `K4` active planner skill |
| `.factory/skills/nerah/SKILL.md` | keep | high | high | accurate | sound | `K4` active planner skill |
| `.factory/skills/paperclip-runtime/SKILL.md` | keep | high | medium | accurate | sound | `K4` active runtime skill |
| `.factory/skills/taren-review/SKILL.md` | keep | high | medium | accurate | sound | `K4` active review skill |
| `.factory/skills/taren/SKILL.md` | keep | high | high | accurate | sound | `K4` active review skill |
| `.factory/skills/triad-hardening-worker/SKILL.md` | keep | high | medium | accurate | sound | `K4` active worker skill |
| `.factory/skills/worker/SKILL.md` | keep | high | high | accurate | sound | `K4` active worker skill |

### `doc/` Legacy Manuals, Active Runbook, Plans, Specs
| Path | Category | Confidence | Operational Importance | Truth Status | First-Principles Status | Short Reason |
|---|---|---:|---:|---|---|---|
| `doc/CLAUDE-ARCHITECTURE.md` | archive | high | low | materially stale | unsound | `A2` Claude-era architecture duplicate |
| `doc/CLAUDE-WORKFLOW.md` | archive | high | low | materially stale | unsound | `A2` Claude-era workflow duplicate |
| `doc/CLI.md` | archive | high | medium | materially stale | partially sound | `A2` legacy CLI manual superseded by current CLI/docs |
| `doc/DATABASE.md` | archive | medium | low | partly stale | partially sound | `A2` duplicate of newer deploy/dev database docs |
| `doc/DEPLOYMENT-MODES.md` | keep | medium | medium | accurate | sound | `K2` still referenced deployment truth |
| `doc/DEVELOPING.md` | keep | high | high | accurate | sound | `K1` active development truth |
| `doc/DEVELOPMENT-PHASES.md` | archive | medium | low | materially stale | unsound | `A1` dated phase framing no longer canonical |
| `doc/DGDH-AI-OPERATOR-RUNBOOK.md` | keep | high | high | accurate | sound | `K1` active operator truth |
| `doc/DOCKER.md` | archive | medium | low | partly stale | partially sound | `A2` duplicate of newer deploy/docker docs |
| `doc/GOAL.md` | archive | high | medium | materially stale | unsound | `A2` outdated Paperclip ambition doc in active root |
| `doc/OPENCLAW_ONBOARDING.md` | keep | high | medium | accurate | sound | `K2` active onboarding checklist |
| `doc/PRODUCT.md` | archive | high | medium | materially stale | unsound | `A2` draft duplicate authority superseded by README/docs/code |
| `doc/PUBLISHING.md` | archive | medium | low | unknown | partially sound | `A2` low-evidence legacy release/publishing doc |
| `doc/README-draft.md` | delete | high | low | materially stale | unsound | `D1` abandoned draft superseded by README/docs |
| `doc/RELEASING.md` | archive | medium | low | unknown | partially sound | `A2` low-evidence legacy release doc |
| `doc/SKILL-CONTRACTS.md` | keep | medium | medium | accurate | sound | `K2` still-relevant reference doc |
| `doc/SPEC-implementation.md` | archive | high | low | materially stale | unsound | `A2` implementation draft duplicate |
| `doc/SPEC.md` | archive | high | medium | materially stale | unsound | `A2` outdated draft spec duplicate authority |
| `doc/TASKS-mcp.md` | archive | high | low | materially stale | unsound | `A2` outdated task-model doc |
| `doc/TASKS.md` | archive | high | low | materially stale | unsound | `A2` outdated task-model doc |
| `doc/UNTRUSTED-PR-REVIEW.md` | keep | high | medium | accurate | sound | `K2` active security workflow |
| `doc/architecture/dgdh-agent-architecture.md` | archive | medium | low | materially stale | partially sound | `A1` dated architecture note in active path |
| `doc/archive/2026-02-23-cursor-cloud-adapter.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/2026-03-13-agent-evals-framework.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/CLIPHUB.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/PHASE-2-WRITE-OPERATIONS.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/SMOKE-TEST-PHASE1.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/cliphub-plan.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/sprint-log.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/testrun/2026-03-23-delegation-guardrails-production-proof.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/testrun/2026-03-23-e2e-proof.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/testrun/2026-03-23-reviewer-semantic-real-run.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/testrun/2026-03-23-visible-ceo-assignment-run.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/testrun/2026-03-24-bootstrap-chain-proof.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/archive/testrun/2026-03-24-canonical-main-bounded-proof.md` | keep | high | low | accurate | sound | `K3` scoped archive |
| `doc/backlog/ceo-prompt-hardening.md` | keep | medium | low | unknown | partially sound | `K3` scoped backlog park |
| `doc/backlog/ceo-v2-tiered-pre-packet-check.md` | keep | medium | low | unknown | partially sound | `K3` scoped backlog park |
| `doc/backlog/firm-memory-agent.md` | keep | medium | low | unknown | partially sound | `K3` scoped backlog park |
| `doc/backlog/heartbeat-modular-refactor.md` | keep | medium | low | unknown | partially sound | `K3` scoped backlog park |
| `doc/backlog/scope-firewall-code.md` | keep | medium | low | unknown | partially sound | `K3` scoped backlog park |
| `doc/backlog/skill-creation-engine.md` | keep | medium | low | unknown | partially sound | `K3` scoped backlog park |
| `doc/backlog/stage1-classifier-rename.md` | keep | medium | low | unknown | partially sound | `K3` scoped backlog park |
| `doc/backlog/stage1-skip-heavy-architecture.md` | keep | medium | low | unknown | partially sound | `K3` scoped backlog park |
| `doc/experimental/issue-worktree-support.md` | keep | medium | low | unknown | partially sound | `K3` scoped experimental note |
| `doc/plans/2026-02-16-module-system.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-02-18-agent-authentication-implementation.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-02-18-agent-authentication.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-02-19-agent-mgmt-followup-plan.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-02-19-ceo-agent-creation-and-hiring.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-02-20-issue-run-orchestration-plan.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-02-20-storage-system-implementation.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-02-21-humans-and-permissions-implementation.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-02-21-humans-and-permissions.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-02-23-deployment-auth-mode-consolidation.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-10-workspace-strategy-and-git-worktrees.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-11-agent-chat-ui-and-issue-backed-conversations.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-13-TOKEN-OPTIMIZATION-PLAN.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-13-features.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-13-paperclip-skill-tightening-plan.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-13-plugin-kitchen-sink-example.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-13-workspace-product-model-and-work-product.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-16-dgdh-autonomous-governance-framework.md` | archive | high | low | materially stale | unsound | `A1` superseded by newer doctrine and governance core |
| `doc/plans/2026-03-16-memory-kernel-sprint-1.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-16-memory-viewer-debug-board-sprint-3b.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-17-dgdh-platform-evolution-strategy.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-17-dgdh-repo-restructure-plan.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-17-gemini-cli-integration-audit.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-17-gemini-cli-integration-test-note.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-17-gemini-first-smoke-run-playbook.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-21-dgdh-north-star-roadmap.md` | update | high | high | materially stale | partially sound | `U2` still cited widely but no longer the cleanest current strategic anchor |
| `doc/plans/2026-03-21-gemini-engine-to-role-architecture-progress-report.md` | archive | high | low | materially stale | unsound | `A1` dated progress report in active path |
| `doc/plans/2026-03-21-heartbeat-ceo-worker-review-architecture-report.md` | archive | high | low | materially stale | unsound | `A1` dated progress report in active path |
| `doc/plans/2026-03-21-role-template-architecture.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-22-dgdh-deep-analysis-reflektion.md` | archive | high | low | materially stale | unsound | `A1` dated reflection in active plan path |
| `doc/plans/2026-03-23-chat-ai-docking-prompt.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-23-dgdh-evolution-lane-werkbank-baut-werkbank.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-23-dgdh-leitdokument.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-23-firmenlauf-ux-direction.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-23-focus-freeze.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-23-research-and-skills-direction.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-23-research-role-and-skill-invocation-direction.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-23-working-triad.md` | archive | high | low | materially stale | unsound | `A1` dated plan not in current canonical set |
| `doc/plans/2026-03-24-dgdh-ai-trinity-and-operator-stack.md` | keep | high | high | accurate | sound | `K1` current canonical doctrine |
| `doc/plans/2026-03-24-dgdh-first-principles-operating-doctrine.md` | keep | high | high | accurate | sound | `K1` current canonical doctrine |
| `doc/plans/2026-03-24-dgdh-memory-learning-self-improvement-first-principles.md` | keep | high | high | accurate | sound | `K1` current canonical doctrine |
| `doc/plans/2026-03-24-dgdh-soul-layer-and-boardmeeting-direction.md` | keep | high | high | accurate | sound | `K1` current canonical doctrine |
| `doc/plans/2026-03-24-run-truth-observability-direction.md` | archive | medium | low | partly stale | partially sound | `A1` superseded by runbook + truth inventory |
| `doc/plans/2026-03-25-dgdh-lane-economics-and-supervision-doctrine.md` | keep | medium | medium | accurate | sound | `K2` still-useful doctrine layer |
| `doc/plans/2026-03-26-dgdh-roadmap-snapshot.md` | keep | high | high | accurate | sound | `K1` current canonical roadmap snapshot |
| `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md` | keep | high | high | accurate | sound | `K1` current canonical doctrine |
| `doc/plans/2026-03-27-dgdh-substrate-boundary-cut-v1.md` | keep | high | medium | accurate | sound | `K2` still referenced mission substrate doc |
| `doc/plans/2026-03-30-dgdh-predictive-delivery-doctrine.md` | keep | high | high | accurate | sound | `K1` current canonical doctrine |
| `doc/plans/2026-03-30-droid-harness-roadmap-kimi-exoskeleton-v1.md` | keep | medium | medium | accurate | sound | `K2` still-current harness roadmap layer |
| `doc/plans/DROID-SETUP-PLAN.md` | archive | high | low | materially stale | unsound | `A1` dated setup plan in active path |
| `doc/plans/revenue-lane-capabilities.md` | archive | medium | low | partly stale | partially sound | `A1` dated plan not in current canonical set |
| `doc/plugins/PLUGIN_AUTHORING_GUIDE.md` | keep | medium | medium | accurate | sound | `K2` package/plugin reference |
| `doc/plugins/PLUGIN_SPEC.md` | keep | medium | medium | accurate | sound | `K2` package/plugin reference |
| `doc/plugins/ideas-from-opencode.md` | keep | medium | low | unknown | partially sound | `K3` scoped plugin research/reference |
| `doc/reflections/2026-03-22-sprint-s-verdict-and-next-steps.md` | keep | medium | low | unknown | partially sound | `K3` scoped reflection |
| `doc/research/2026-03-21-paper-insights-for-dgdh.md` | keep | medium | low | unknown | partially sound | `K3` scoped research |
| `doc/research/2026-03-23-hermes-agent-research.md` | keep | medium | low | unknown | partially sound | `K3` scoped research |
| `doc/research/2026-03-23-open-source-pattern-research.md` | keep | medium | low | unknown | partially sound | `K3` scoped research |
| `doc/research/research-llm-free.md` | keep | medium | low | unknown | partially sound | `K3` scoped research |
| `doc/spec/agent-runs.md` | keep | medium | low | unknown | partially sound | `K2` narrow spec reference |
| `doc/spec/agents-runtime.md` | keep | medium | low | unknown | partially sound | `K2` narrow spec reference |
| `doc/spec/ui.md` | keep | medium | low | unknown | partially sound | `K2` narrow spec reference |
| `doc/sprints/sprint-seed-from-git.md` | keep | medium | low | unknown | partially sound | `K3` scoped sprint record |
| `doc/truth-inventory/platform-truth-inventory-v1-2026-03-31.md` | keep | high | medium | accurate | sound | `K2` recent evidence-rich truth inventory |

### `docs/` Public/Product Docs
| Path | Category | Confidence | Operational Importance | Truth Status | First-Principles Status | Short Reason |
|---|---|---:|---:|---|---|---|
| `docs/WORKSPACE-BOOTSTRAP.md` | keep | medium | medium | accurate | sound | `K2` scoped bootstrap guide |
| `docs/adapters/claude-local.md` | keep | medium | medium | accurate | sound | `K2` scoped adapter doc |
| `docs/adapters/codex-local.md` | keep | medium | medium | accurate | sound | `K2` scoped adapter doc |
| `docs/adapters/creating-an-adapter.md` | keep | medium | medium | accurate | sound | `K2` scoped adapter reference |
| `docs/adapters/gemini-local.md` | keep | medium | medium | accurate | sound | `K2` scoped adapter doc |
| `docs/adapters/http.md` | keep | medium | medium | partly stale | partially sound | `K2` mostly okay; minor wording drift only |
| `docs/adapters/overview.md` | update | high | high | materially stale | partially sound | `U1` built-in adapter list no longer matches code |
| `docs/adapters/process.md` | keep | medium | medium | partly stale | partially sound | `K2` mostly okay; minor wording drift only |
| `docs/agents-runtime.md` | update | high | high | materially stale | partially sound | `U1` runtime/adapters section lags current adapters/status surface |
| `docs/api/activity.md` | keep | medium | medium | unknown | partially sound | `K2` no direct contradiction found |
| `docs/api/agents.md` | update | high | high | materially stale | partially sound | `U1` misses current agent/triad/operator surfaces |
| `docs/api/approvals.md` | keep | medium | medium | unknown | partially sound | `K2` no direct contradiction found |
| `docs/api/authentication.md` | keep | medium | medium | partly stale | partially sound | `K2` auth doc still useful, but overview needs nuance |
| `docs/api/companies.md` | keep | medium | medium | unknown | partially sound | `K2` no direct contradiction found |
| `docs/api/costs.md` | keep | medium | low | unknown | partially sound | `K2` no direct contradiction found |
| `docs/api/dashboard.md` | keep | medium | low | unknown | partially sound | `K2` no direct contradiction found |
| `docs/api/goals-and-projects.md` | keep | medium | low | unknown | partially sound | `K2` no direct contradiction found |
| `docs/api/issues.md` | update | high | high | materially stale | partially sound | `U1` misses triad/closeout/read surfaces shipped in routes/tests |
| `docs/api/overview.md` | update | high | high | misleading | unsound | `U1` falsely says all requests require auth |
| `docs/api/secrets.md` | keep | medium | low | accurate | sound | `K2` scoped API doc |
| `docs/cli/control-plane-commands.md` | update | high | high | materially stale | partially sound | `U1` CLI command set lags current runtime/triad/liveness surface |
| `docs/cli/overview.md` | update | high | high | materially stale | partially sound | `U1` overclaims global `--api-base` and misses newer surfaces |
| `docs/cli/setup-commands.md` | keep | medium | medium | accurate | sound | `K2` setup docs still align broadly |
| `docs/deploy/database.md` | keep | medium | medium | accurate | sound | `K2` deploy reference |
| `docs/deploy/deployment-modes.md` | keep | medium | medium | accurate | sound | `K2` deploy reference |
| `docs/deploy/docker.md` | keep | medium | medium | accurate | sound | `K2` deploy reference |
| `docs/deploy/environment-variables.md` | keep | medium | medium | unknown | partially sound | `K2` no direct contradiction found |
| `docs/deploy/local-development.md` | keep | medium | medium | accurate | sound | `K2` deploy/dev reference |
| `docs/deploy/overview.md` | keep | medium | medium | accurate | sound | `K2` deploy reference |
| `docs/deploy/secrets.md` | keep | medium | medium | accurate | sound | `K2` deploy reference |
| `docs/deploy/storage.md` | keep | medium | low | accurate | sound | `K2` deploy reference |
| `docs/deploy/tailscale-private-access.md` | keep | medium | low | accurate | sound | `K2` deploy reference |
| `docs/guides/agent-developer/comments-and-communication.md` | keep | medium | medium | unknown | partially sound | `K2` guide; no direct contradiction found |
| `docs/guides/agent-developer/cost-reporting.md` | keep | medium | medium | unknown | partially sound | `K2` guide; no direct contradiction found |
| `docs/guides/agent-developer/handling-approvals.md` | keep | medium | medium | unknown | partially sound | `K2` guide; no direct contradiction found |
| `docs/guides/agent-developer/heartbeat-protocol.md` | keep | medium | medium | unknown | partially sound | `K2` guide; no direct contradiction found |
| `docs/guides/agent-developer/how-agents-work.md` | keep | medium | medium | unknown | partially sound | `K2` guide; no direct contradiction found |
| `docs/guides/agent-developer/task-workflow.md` | keep | medium | medium | unknown | partially sound | `K2` guide; no direct contradiction found |
| `docs/guides/agent-developer/writing-a-skill.md` | keep | medium | medium | accurate | sound | `K2` guide; aligned with repo skill use |
| `docs/guides/board-operator/activity-log.md` | keep | medium | medium | unknown | partially sound | `K2` board guide; no direct contradiction found |
| `docs/guides/board-operator/approvals.md` | keep | medium | medium | unknown | partially sound | `K2` board guide; no direct contradiction found |
| `docs/guides/board-operator/costs-and-budgets.md` | keep | medium | medium | unknown | partially sound | `K2` board guide; no direct contradiction found |
| `docs/guides/board-operator/creating-a-company.md` | keep | medium | medium | unknown | partially sound | `K2` board guide; no direct contradiction found |
| `docs/guides/board-operator/dashboard.md` | keep | medium | medium | unknown | partially sound | `K2` board guide; no direct contradiction found |
| `docs/guides/board-operator/managing-agents.md` | keep | medium | medium | unknown | partially sound | `K2` board guide; no direct contradiction found |
| `docs/guides/board-operator/managing-tasks.md` | keep | medium | medium | unknown | partially sound | `K2` board guide; no direct contradiction found |
| `docs/guides/board-operator/org-structure.md` | keep | medium | low | unknown | partially sound | `K2` board guide; no direct contradiction found |
| `docs/guides/dgdh-governance-shift.md` | keep | medium | medium | accurate | sound | `K2` repo/product guide |
| `docs/guides/dgdh-repo-operating-model.md` | keep | high | medium | accurate | sound | `K2` current repo operating guide |
| `docs/guides/governance-test-safety.md` | keep | medium | medium | accurate | sound | `K2` safety guide |
| `docs/guides/openclaw-docker-setup.md` | update | high | high | materially stale | partially sound | `U1` still documents old `openclaw` path/defaults instead of gateway-only truth |
| `docs/plans/2026-03-13-issue-documents-plan.md` | archive | high | low | materially stale | unsound | `A1` dated docs-site plan not current canon |
| `docs/specs/agent-config-ui.md` | keep | medium | low | unknown | partially sound | `K2` narrow design/spec doc |
| `docs/start/architecture.md` | update | high | high | materially stale | partially sound | `U1` repo structure and adapter list lag current code |
| `docs/start/core-concepts.md` | keep | medium | high | accurate | sound | `K2` high-level concepts still broadly correct |
| `docs/start/quickstart.md` | update | high | high | materially stale | partially sound | `U1` onboarding story misses current runtime/operator truth |
| `docs/start/what-is-paperclip.md` | update | high | high | materially stale | partially sound | `U1` product framing still describes older adapter/runtime set |

### Packages, Releases, Server, Report, Shared Customer Content, Skills
| Path | Category | Confidence | Operational Importance | Truth Status | First-Principles Status | Short Reason |
|---|---|---:|---:|---|---|---|
| `packages/adapter-utils/CHANGELOG.md` | keep | high | low | accurate | sound | `K3` package history |
| `packages/adapters/claude-local/CHANGELOG.md` | keep | high | low | accurate | sound | `K3` package history |
| `packages/adapters/codex-local/CHANGELOG.md` | keep | high | low | accurate | sound | `K3` package history |
| `packages/adapters/cursor-local/CHANGELOG.md` | keep | high | low | accurate | sound | `K3` package history |
| `packages/adapters/openclaw-gateway/CHANGELOG.md` | keep | high | low | accurate | sound | `K3` package history |
| `packages/adapters/openclaw-gateway/README.md` | keep | medium | medium | accurate | sound | `K2` package README |
| `packages/adapters/openclaw-gateway/doc/ONBOARDING_AND_TEST_PLAN.md` | keep | high | medium | accurate | sound | `K2` current gateway-only onboarding truth |
| `packages/adapters/opencode-local/CHANGELOG.md` | keep | high | low | accurate | sound | `K3` package history |
| `packages/adapters/pi-local/CHANGELOG.md` | keep | high | low | accurate | sound | `K3` package history |
| `packages/db/CHANGELOG.md` | keep | high | low | accurate | sound | `K3` package history |
| `packages/plugins/create-paperclip-plugin/README.md` | keep | medium | medium | accurate | sound | `K2` package README |
| `packages/plugins/examples/plugin-authoring-smoke-example/README.md` | keep | medium | low | accurate | sound | `K2` example README |
| `packages/plugins/examples/plugin-file-browser-example/README.md` | keep | medium | low | accurate | sound | `K2` example README |
| `packages/plugins/examples/plugin-hello-world-example/README.md` | keep | medium | low | accurate | sound | `K2` example README |
| `packages/plugins/examples/plugin-kitchen-sink-example/README.md` | keep | medium | low | accurate | sound | `K2` example README |
| `packages/plugins/sdk/README.md` | keep | medium | medium | accurate | sound | `K2` SDK README |
| `packages/shared/CHANGELOG.md` | keep | high | low | accurate | sound | `K3` package history |
| `releases/v0.2.7.md` | keep | high | low | accurate | sound | `K3` time-scoped release note |
| `releases/v0.3.0.md` | keep | high | low | accurate | sound | `K3` time-scoped release note |
| `releases/v0.3.1.md` | keep | high | low | accurate | sound | `K3` time-scoped release note |
| `report/2026-03-13-08-46-token-optimization-implementation.md` | archive | high | low | materially stale | unsound | `A1` dated one-off report in misleading top-level path |
| `server/CHANGELOG.md` | keep | high | low | accurate | sound | `K3` package history |
| `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/pages/startseite/index.md` | unclear / needs human decision | low | low | unknown | unknown | `H1` generated customer/site content in repo |
| `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/sections/08-bewertungen/index.md` | unclear / needs human decision | low | low | unknown | unknown | `H1` generated customer/site content in repo |
| `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/sections/09-preise/index.md` | unclear / needs human decision | low | low | unknown | unknown | `H1` generated customer/site content in repo |
| `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/sections/anreise/index.md` | unclear / needs human decision | low | low | unknown | unknown | `H1` generated customer/site content in repo |
| `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/sections/ausstattung-komfort/index.md` | unclear / needs human decision | low | low | unknown | unknown | `H1` generated customer/site content in repo |
| `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/sections/buchungsanfrage/index.md` | unclear / needs human decision | low | low | unknown | unknown | `H1` generated customer/site content in repo |
| `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/sections/einblicke-in-die-unterkunft/index.md` | unclear / needs human decision | low | low | unknown | unknown | `H1` generated customer/site content in repo |
| `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/sections/haeufige-fragen/index.md` | unclear / needs human decision | low | low | unknown | unknown | `H1` generated customer/site content in repo |
| `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/sections/umgebung/index.md` | unclear / needs human decision | low | low | unknown | unknown | `H1` generated customer/site content in repo |
| `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/settings/datenschutz.md` | unclear / needs human decision | low | low | unknown | unknown | `H1` generated customer/site content in repo |
| `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/settings/impressum.md` | unclear / needs human decision | low | low | unknown | unknown | `H1` generated customer/site content in repo |
| `skills/paperclip-create-agent/SKILL.md` | keep | high | medium | accurate | sound | `K4` active repo skill |
| `skills/paperclip-create-agent/references/api-reference.md` | keep | high | low | accurate | sound | `K4` scoped skill reference |
| `skills/paperclip-create-plugin/SKILL.md` | keep | high | medium | accurate | sound | `K4` active repo skill |
| `skills/paperclip/SKILL.md` | keep | high | medium | accurate | sound | `K4` active repo skill |
| `skills/paperclip/references/api-reference.md` | keep | high | low | accurate | sound | `K4` scoped skill reference |
| `skills/para-memory-files/SKILL.md` | keep | high | medium | accurate | sound | `K4` active repo skill |
| `skills/para-memory-files/references/schemas.md` | keep | high | low | accurate | sound | `K4` scoped skill reference |

## High-Risk Docs
These are the files most likely to cause wrong missions, wrong runtime assumptions, wrong harness expectations, or wasted David minutes if left uncorrected:
- `README.md`
- `INIT.md`
- `REINIT.md`
- `company-hq/AGENT-CONSTITUTION.md`
- `company-hq/AUTONOMY-MODES.md`
- `company-hq/ROADMAP.md`
- `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
- `docs/api/overview.md`
- `docs/api/issues.md`
- `docs/api/agents.md`
- `docs/cli/overview.md`
- `docs/cli/control-plane-commands.md`
- `docs/adapters/overview.md`
- `docs/guides/openclaw-docker-setup.md`
- `docs/start/architecture.md`
- `docs/start/quickstart.md`
- `docs/start/what-is-paperclip.md`
- `DGDH-WERKBANK-SETUP.md`
- `DROID-MISSION.md`

## Update Queue
### 1. `README.md`
- Exact problem: public feature/adapters/runtime story is older than the current codebase; it still markets a narrower adapter/runtime set and older roadmap items while the repo now ships triad/runtime/liveness/operator surfaces and more adapter types.
- Exact evidence: current adapter types in `packages/shared/src/constants.ts`; current CLI/runtime features in recent git commits (`issue liveness`, `validate-packet`, `runtime status`, triad `--api-url`); current docs split across `docs/` and DGDH operator docs.
- Exact recommended fix scope: patch feature table, works-with section, roadmap bullets, quickstart/development links, and current CLI/runtime mentions.
- Patch depth: substantial rewrite, but only inside existing sections.

### 2. `INIT.md`
- Exact problem: still acts as a primary agent entrypoint but references stale priorities and at least one absent file (`CLAUDE.md`), and overweights older north-star material over the newer canonical set.
- Exact evidence: no root `CLAUDE.md` exists; newer precedence in `company-hq/AI-CONTEXT-START-HERE.md`; newer canon in `CURRENT.md`, `MEMORY.md`, `company-hq/CORE.md`, `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md`, and `doc/plans/2026-03-30-dgdh-predictive-delivery-doctrine.md`.
- Exact recommended fix scope: update read order, precedence rules, role descriptions, and remove dead file references.
- Patch depth: substantial rewrite.

### 3. `REINIT.md`
- Exact problem: says “Codex in coder role” and mixes Codex with executor behavior, which conflicts with the current Codex dock and Trinity split.
- Exact evidence: `CODEX.md` defines Codex as planner/reviewer/reflector; `COPILOT.md` + `EXECUTOR.md` hold the execution lane; `TRINITY.md` separates the lanes clearly.
- Exact recommended fix scope: recut as a Codex recovery shortcut only; remove executor-lane language except explicit handoff to `EXECUTOR.md` when relevant.
- Patch depth: substantial rewrite.

### 4. `company-hq/AGENT-CONSTITUTION.md`
- Exact problem: its “Strategic Direction” role map is pre-Trinity and says Claude/Codex/Gemini occupy roles that no longer match repo canon.
- Exact evidence: `TRINITY.md`, `CODEX.md`, `CHATGPT.md`, `COPILOT.md`, `CURRENT.md`, and `MEMORY.md` describe the current direct AI layer and mission-autonomy model.
- Exact recommended fix scope: preserve governance rules, replace stale role map with current lane model and mission-autonomy framing.
- Patch depth: light-to-moderate patch.

### 5. `company-hq/AUTONOMY-MODES.md`
- Exact problem: claims Mode 3 / mission operations is defined but not active.
- Exact evidence: `company-hq/ACTIVE-MISSION.md` explicitly sets `Mode: mission autonomy mode`; `CURRENT.md` and `MEMORY.md` also treat mission autonomy as active current firm mode.
- Exact recommended fix scope: update current-state preface, active modes, and approval/budget examples to reflect the present governed mission-autonomy phase.
- Patch depth: moderate patch.

### 6. `company-hq/ROADMAP.md`
- Exact problem: still describes a Gemini-first “worker loop, reviewer matrix, then CEO V1” phase as the next step.
- Exact evidence: `CURRENT.md`, `MEMORY.md`, and `ACTIVE-MISSION.md` show the repo is now on Kimi-first harness, predictive-delivery doctrine, triad/runtime/liveness surfaces, and second live-triad proof work.
- Exact recommended fix scope: keep the roadmap file, but rewrite the “where we are / next step / phases” sections around current mission-autonomy and predictive-delivery truth.
- Patch depth: substantial rewrite.

### 7. `doc/plans/2026-03-21-dgdh-north-star-roadmap.md`
- Exact problem: still has too much active authority because many docs point to it first, even though newer, shorter canon superseded it.
- Exact evidence: `company-hq/AI-CONTEXT-START-HERE.md` and `CURRENT.md` now anchor on `CORE.md`, roadmap snapshot, mission-autonomy doctrine, and predictive-delivery doctrine.
- Exact recommended fix scope: demote it explicitly to strategic depth/history, add a top warning, and point to the current canonical stack.
- Patch depth: light patch.

### 8. `docs/adapters/overview.md`
- Exact problem: built-in adapter list is wrong. It still lists `openclaw` and omits `pi_local`, `cursor`, and `hermes_local`.
- Exact evidence: `packages/shared/src/constants.ts` defines adapter types as `process`, `http`, `claude_local`, `codex_local`, `gemini_local`, `opencode_local`, `pi_local`, `cursor`, `openclaw_gateway`, `hermes_local`.
- Exact recommended fix scope: correct the adapter table and chooser guidance.
- Patch depth: light patch.

### 9. `docs/agents-runtime.md`
- Exact problem: adapter choices and runtime behavior are presented as if only the older set matters.
- Exact evidence: current adapter list in `packages/shared/src/constants.ts`; current triad/runtime/operator surfaces in git history and CLI commands.
- Exact recommended fix scope: refresh adapter list, statuses, and runtime/operator guidance.
- Patch depth: moderate patch.

### 10. `docs/api/overview.md`
- Exact problem: falsely says all requests require an Authorization header.
- Exact evidence: `server/src/routes/health.ts` exposes unauthenticated health; tests also probe `/api/health` directly; plugin webhook routes also have documented exceptions.
- Exact recommended fix scope: document auth exceptions and deployment-mode nuance.
- Patch depth: light patch.

### 11. `docs/api/issues.md`
- Exact problem: only documents CRUD/checkout/comments/documents/attachments, omitting the current triad and closeout routes.
- Exact evidence: `server/src/routes/issues.ts` and tests cover `company-run-chain`, `worker-done`, `worker-pr`, `worker-rescue`, `reviewer-verdict`, `merge-pr`, `archive-stale`, `active-run`, and `live-runs` surfaces.
- Exact recommended fix scope: add the missing operator/triad endpoints and describe when they are used.
- Patch depth: substantial rewrite.

### 12. `docs/api/agents.md`
- Exact problem: misses current operator-facing agent runtime surfaces like triad preflight and newer adapter realities.
- Exact evidence: `server/src/routes/agents.ts` plus `triad-preflight-route.test.ts`; adapter type list from `packages/shared/src/constants.ts`.
- Exact recommended fix scope: add `triad-preflight`, update adapter examples/statuses, and document the current runtime-facing endpoints.
- Patch depth: moderate patch.

### 13. `docs/cli/overview.md`
- Exact problem: claims all commands support `--api-base`, which is no longer true for newer triad/runtime commands.
- Exact evidence: `cli/src/index.ts` still supports global `--api-base`, but `cli/src/commands/runtime/index.ts` and `cli/src/commands/client/triad.ts` use `--api-url`; tests explicitly verify that mapping.
- Exact recommended fix scope: distinguish global client-stack flags from newer runtime/triad flags and mention the newer command groups.
- Patch depth: moderate patch.

### 14. `docs/cli/control-plane-commands.md`
- Exact problem: command inventory is missing `triad`, `runtime status`, `issue liveness`, `validate-packet`, and still documents heartbeat with `--api-base` only.
- Exact evidence: `cli/src/commands/client/triad.ts`, `cli/src/commands/runtime/*`, `cli/src/commands/client/issue.ts`, tests and recent git commits.
- Exact recommended fix scope: refresh the CLI surface inventory and fix the flag examples.
- Patch depth: substantial rewrite.

### 15. `docs/guides/openclaw-docker-setup.md`
- Exact problem: still uses `adapterType=openclaw` and documents device-auth defaults that conflict with current gateway-only onboarding truth.
- Exact evidence: `packages/adapters/openclaw-gateway/doc/ONBOARDING_AND_TEST_PLAN.md` says gateway-only and requires `openclaw_gateway`; current guide still says `openclaw` and default disabled device auth.
- Exact recommended fix scope: rewrite the guide around gateway-only onboarding and current pairing/device-auth expectations.
- Patch depth: substantial rewrite.

### 16. `docs/start/architecture.md`
- Exact problem: repo structure and adapter list lag current code. It still names a much smaller adapter surface and the old `doc/` internal-doc structure.
- Exact evidence: actual workspace shape, `packages/shared/src/constants.ts`, and current `docs/` site structure.
- Exact recommended fix scope: refresh architecture diagram, repo tree, and adapter examples.
- Patch depth: moderate patch.

### 17. `docs/start/quickstart.md`
- Exact problem: onboarding story is too generic for the current repo and misses the operator/runtime readiness surfaces now shipped.
- Exact evidence: current repo ships `paperclipai runtime status`, triad preflight, health `seedStatus`, and seeded DGDH runtime/operator flows in the runbook.
- Exact recommended fix scope: preserve quickstart brevity but update “what next” and runtime verification guidance.
- Patch depth: moderate patch.

### 18. `docs/start/what-is-paperclip.md`
- Exact problem: still describes the older adapter/runtime world and underspecifies the current built-in surface.
- Exact evidence: adapter list in `packages/shared/src/constants.ts`; current CLI/API/runtime/operator surfaces in recent git history.
- Exact recommended fix scope: refresh the product framing and supported runtimes paragraph.
- Patch depth: light-to-moderate patch.

## Archive/Delete Candidates
### Archive
The following files no longer earn active-path placement because they are either dated plans in active folders, duplicate authority surfaces, or old setup/history artifacts that current agents could mistake for canon.

Root / company setup artifacts:
- `DGDH-WERKBANK-SETUP.md`
- `DROID-MISSION.md`
- `company-hq/AGENT-PROFILES.md`
- `company-hq/CLAUDE-CODE-INIT.md`
- `company-hq/HARNESS-LEARNINGS-FOR-DGDH-2026-03-18.md`
- `company-hq/MODEL-ROADMAP.md`
- `company-hq/ROLE-ASSIGNMENT-RUNTIME-MAP-2026-03-18.md`
- `company-hq/cleanup-decision-matrix-20260328.md`

Legacy manuals / duplicate authority docs:
- `doc/CLAUDE-ARCHITECTURE.md`
- `doc/CLAUDE-WORKFLOW.md`
- `doc/CLI.md`
- `doc/DATABASE.md`
- `doc/DEVELOPMENT-PHASES.md`
- `doc/DOCKER.md`
- `doc/GOAL.md`
- `doc/PRODUCT.md`
- `doc/PUBLISHING.md`
- `doc/RELEASING.md`
- `doc/SPEC-implementation.md`
- `doc/SPEC.md`
- `doc/TASKS-mcp.md`
- `doc/TASKS.md`
- `doc/architecture/dgdh-agent-architecture.md`

Dated plans left in active `doc/plans/` or `docs/plans/` paths:
- all `doc/plans/*.md` files classified `archive` in the table
- `docs/plans/2026-03-13-issue-documents-plan.md`

Misplaced report artifact:
- `report/2026-03-13-08-46-token-optimization-implementation.md`

Why archive instead of delete:
- these files still contain historical context or design lineage
- but leaving them in active-looking locations creates false authority
- moving them to archive preserves evidence without asking future agents to guess whether they are current

Risk of removing them from active paths:
- low operational risk if links are updated
- moderate reference risk for old docs/skills that still point at them
- best handled by a bounded archive pass that adds redirect notes where necessary

### Delete
The following files do not appear to earn even archival prominence:
- `ZERO_RESCUE.md`
  - Why: one-line proof artifact with no durable operational guidance; superseded by richer commit reports and mission records.
  - Replacement: none needed.
  - Removal risk: very low.
- `baseline.md`
  - Why: duplicate text snapshot of `baseline.json`; even the cleanup matrix already identifies it as duplicate.
  - Replacement: `baseline.json`.
  - Removal risk: very low.
- `doc/README-draft.md`
  - Why: abandoned draft superseded by the real `README.md` and `docs/` site.
  - Replacement: `README.md`, `docs/`.
  - Removal risk: very low.

### Unclear / human decision
- All 11 files under `shared/Kunde/Unbekannt Bamberger Tante/processed/site-output/src/content/**`
  - Why unclear: they are not repo-operating docs; they look like generated customer/site content.
  - Possible interpretations: real sample fixture, accidental customer residue, or output that should live outside the repo.
  - Human decision needed: keep as fixture, move to a fixture/example location, or remove entirely.

## Canon Candidates
The small set of docs that should remain canonical anchors:
- `AGENTS.md`
- `CURRENT.md`
- `MEMORY.md`
- `company-hq/ACTIVE-MISSION.md`
- `company-hq/CORE.md`
- `company-hq/AI-CONTEXT-START-HERE.md`
- `company-hq/VISION.md`
- `SOUL.md`
- `TRINITY.md`
- `COPILOT.md`
- `CODEX.md`
- `CHATGPT.md`
- `EXECUTOR.md`
- `doc/DGDH-AI-OPERATOR-RUNBOOK.md`
- `doc/DEVELOPING.md`
- `doc/plans/2026-03-26-dgdh-roadmap-snapshot.md`
- `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md`
- `doc/plans/2026-03-30-dgdh-predictive-delivery-doctrine.md`
- relevant `company-hq/mission-contracts/*.md` for the currently active mission only

## First-Principles Findings
- The files that feel most “important” by title are often not the files currently carrying the system. The real load-bearing docs are the baton files, lane docks, the runbook, `AGENTS.md`, and the active mission contracts.
- A large portion of the `doc/` tree is no longer living product truth. It is design history still sitting in a folder name that sounds canonical.
- The public `docs/` site is not dead, but it is behind the code on exactly the surfaces that matter most to operators: adapters, auth nuance, triad/API routes, CLI flags, and runtime diagnostics.
- Historical docs are not the enemy. Historical docs in clearly historical paths are fine. Historical docs in active-looking root/company-hq/doc paths are the problem.
- Several “governance core” docs are still worth keeping, but only after they are reconciled with the current Trinity and mission-autonomy model.
- Some docs should probably become generated or at least mechanically checked over time: adapter lists, CLI command inventories, API route inventories, and maybe parts of the README feature matrix.

## Recommended Next Step
`targeted high-risk doc fixes first`

Why this is the best next move:
- the most dangerous drift is concentrated in a small set of entrypoint/public/operator docs
- fixing those first will immediately reduce future agent confusion
- broad archival cleanup should follow, but doing archive-only first would still leave the highest-risk lies in place

Suggested bounded cleanup order:
1. patch the high-risk entrypoints and public/operator docs marked `update`
2. archive the stale active-path files marked `archive`
3. make one follow-up pass on surviving cross-links so they point only at canonical anchors or clearly historical paths
