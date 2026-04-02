# Audit Doku Layer - 2026-04-02

Status: phase-1 audit only  
Scope: top-level root `.md`, top-level `company-hq/*.md`, and the three currently canonical plan docs explicitly referenced by the operating stack  
Basis: `company-hq/cleanup-decision-matrix-20260328.md`, `doc/audits/markdown-truth-audit-v1.md`, current canon reads, and current known repo consumers

## Executive summary

The doc layer is not broken by absence. It is broken by overlap.

The current carrying truth is real and fairly strong, but too many files still look like valid entrypoints at the same time. The main risk is not "we have no guidance"; it is that a new AI can still load the wrong truth surface first and burn time or drift before touching code.

This is not a greenfield cleanup. Nerah's matrix from 2026-03-28 already proved the conservative pattern: archive before destructive action, keep live load-bearing truth, and classify from evidence. The change since then is that the real problem has become clearer: the next cleanup mountain is the **doc/truth layer**, not runtime objects.

The shortest truthful reading today is:

- `AGENTS.md` is still the repo execution anchor.
- `CURRENT.md` is still the live baton.
- `MEMORY.md` is still stable cross-session truth.
- `company-hq/ACTIVE-MISSION.md` is still the compact mission anchor.
- `company-hq/AI-CONTEXT-START-HERE.md`, `company-hq/CORE.md`, and `company-hq/VISION.md` still carry the highest-value firm context.
- `doc/plans/2026-03-26-dgdh-roadmap-snapshot.md`, `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md`, and `doc/plans/2026-03-30-dgdh-predictive-delivery-doctrine.md` are still canonical directional docs.

The real cleanup target is everything around that kernel that still competes for entrypoint authority.

## Reconciliation With 2026-03-28 Matrix

What still holds from `company-hq/cleanup-decision-matrix-20260328.md`:

- `CURRENT.md` remains `KEEP` and load-bearing.
- `baseline.md` remains a duplicate and should not regain authority.
- conservative classification before deletion is still the right method.

What changed since 2026-03-28:

- the doc problem is now broader than `CURRENT.md` plus a few cleanup leftovers
- the repo has a stronger explicit canon than the older matrix captured
- the next cleanup should focus on competing truth surfaces, not just runtime/state artifacts
- the old cleanup matrix itself is now useful **prior art**, but no longer canonical operating truth

## Current canonical stack

### Canonical operating kernel

- `AGENTS.md`
- `CURRENT.md`
- `MEMORY.md`
- `company-hq/ACTIVE-MISSION.md`
- `company-hq/AI-CONTEXT-START-HERE.md`
- `company-hq/CORE.md`
- `company-hq/VISION.md`
- `doc/plans/2026-03-26-dgdh-roadmap-snapshot.md`
- `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md`
- `doc/plans/2026-03-30-dgdh-predictive-delivery-doctrine.md`

### Still useful but not part of the smallest default stack

- `SOUL.md`
- `TRINITY.md`
- `CODEX.md`
- `CHATGPT.md`
- `COPILOT.md`
- `EXECUTOR.md`
- `company-hq/DGDH-CEO-CONTEXT.md`
- `doc/DGDH-AI-OPERATOR-RUNBOOK.md`

## Conflict map

### 1. Entrypoint conflict

`AGENTS.md`, `INIT.md`, `REINIT.md`, and `company-hq/AI-CONTEXT-START-HERE.md` all speak as if they are the right place to begin. The problem is not that they are all wrong. The problem is that they all ask to be first.

### 2. "What is live right now?" conflict

`CURRENT.md`, `company-hq/ACTIVE-MISSION.md`, `company-hq/ROADMAP.md`, and older bridge docs all partially answer "what are we doing now?" They do not all serve the same role, but they still visually compete.

### 3. Lane and operator dock sprawl

`CODEX.md`, `CHATGPT.md`, `COPILOT.md`, `EXECUTOR.md`, `.hermes.md`, `CLAUDE-CODE-INIT.md`, and `DROID-MISSION.md` describe different operator/agent entrypaths. Some are active, some are historical, and some are only safe as references.

### 4. Historical strategy still sitting in active-looking paths

`AGENT-PROFILES.md`, `MODEL-ROADMAP.md`, `ROLE-ASSIGNMENT-RUNTIME-MAP-2026-03-18.md`, `HARNESS-LEARNINGS-FOR-DGDH-2026-03-18.md`, `DGDH-WERKBANK-SETUP.md`, and `baseline.md` all still occupy prominent paths despite mostly historical value.

## North Star protection

These files carry long-horizon or identity truth and should not be collapsed into tactical baton docs:

- `company-hq/VISION.md`
- `company-hq/CORE.md`
- `SOUL.md`
- `TRINITY.md`

They are not the same kind of truth as:

- `CURRENT.md` for live baton
- `company-hq/ACTIVE-MISSION.md` for current mission anchor
- `MEMORY.md` for stable facts

The cleanup must preserve the long-horizon DGDH / Werkbank aspiration while making the operational entry surface smaller and more boring.

## Decision matrix

Legend:

- Authority class: `canonical`, `supporting`, `historical`
- Operational role: `live`, `stable`, `role-specific`, `reference`
- Recommended action: `keep`, `merge`, `archive`, `replace-later`, `delete-later`

### Root `.md` files

| File | Current function | Authority class | Operational role | Runtime/operator value | Drift risk | Known consumers | Recommended action | Why |
|---|---|---|---|---|---|---|---|---|
| `.hermes.md` | Hermes-specific dock / prompt surface | supporting | role-specific | low | medium | no strong current canonical references found | replace-later | likely belongs in a clearer role-specific home, not as a root default truth surface |
| `AGENTS.md` | repo-wide execution anchor | canonical | stable | high | medium | direct repo onboarding, lane docs, tests, portability export | keep | still the strongest repo execution root and explicitly consumed |
| `baseline.md` | old textual baseline snapshot | historical | reference | low | low | prior cleanup matrix only | delete-later | duplicate of machine-readable/stateful prior-art and no longer a safe active entrypoint |
| `CHATGPT.md` | ChatGPT lane dock | supporting | role-specific | medium | medium | `TRINITY.md`, human lane usage | keep | still a valid lane-specific dock, but not part of the smallest default read order |
| `CODEX.md` | Codex lane dock | supporting | role-specific | high | medium | `REINIT.md`, `TRINITY.md`, human lane usage | keep | active lane-specific truth for Codex/Taren work |
| `CONTRIBUTING.md` | public contributor guidance | supporting | reference | medium | medium | GitHub/public contributor expectations | keep | not part of DGDH operator canon, but still a legitimate public repo surface |
| `COPILOT-SKILLS.md` | Copilot lane skill map | supporting | role-specific | medium | medium | Copilot lane, root lane docs | merge | skill indexing likely belongs closer to Copilot lane docs or skill substrate instead of its own root authority surface |
| `COPILOT.md` | Copilot lane dock | supporting | role-specific | high | medium | active Copilot execution lane | keep | still active and role-specific, not redundant with repo-wide canon |
| `CURRENT.md` | live baton | canonical | live | high | high | AGENTS, INIT, AI-CONTEXT, mission cells/tests, portability export | keep | this is the active handoff truth and still has real live consumers |
| `DGDH-WERKBANK-SETUP.md` | old repo/setup/remotes story | historical | reference | low | high | human/manual only | delete-later | old setup truth and duplicated historical state still sit in an active-looking root path |
| `DROID-MISSION.md` | early Droid mission brief | historical | reference | low | high | human/manual only | archive | useful as history of an early carrier phase, unsafe as current mission authority |
| `EXECUTOR.md` | execution-lane runtime/operator rules | supporting | role-specific | high | medium | ACTIVE-MISSION, INIT, long-running agent use | keep | still active and load-bearing for execution-lane behavior |
| `INIT.md` | universal onboarding entrypoint | supporting | reference | high | high | AI-CONTEXT, direct human/operator use | replace-later | too broad and too eager to be first; still useful but no longer the cleanest default starting surface |
| `MEMORY.md` | stable cross-session facts | canonical | stable | high | medium | AGENTS, INIT, lane docs, tests, portability export | keep | still the clearest stable-facts surface and explicitly consumed |
| `README.md` | public product/repo overview | supporting | reference | medium | medium | GitHub/public onboarding | keep | needed as public repo entrypoint, but not part of the smallest DGDH operator stack |
| `REINIT.md` | Codex recovery shortcut after compact/context loss | supporting | role-specific | medium | high | Codex/Taren re-entry | replace-later | useful recovery path, but overlaps heavily with `CODEX.md`, `CURRENT.md`, and `MEMORY.md` |
| `SOUL.md` | shared soul contract | supporting | stable | medium | low | lane docs, canon references | keep | high North Star value and still actively referenced, but not live baton truth |
| `TRINITY.md` | shared contract for direct David assistant layer | supporting | stable | medium | medium | lane docs, direct-assistant routing | keep | still actively used to coordinate the direct-assistant layer |
| `ZERO_RESCUE.md` | older proof artifact / mission note | historical | reference | low | high | no current canonical consumers found | delete-later | old proof residue should not remain a root-level active-looking truth surface |

### `company-hq/*.md` top-level files

| File | Current function | Authority class | Operational role | Runtime/operator value | Drift risk | Known consumers | Recommended action | Why |
|---|---|---|---|---|---|---|---|---|
| `company-hq/ACTIVE-MISSION.md` | compact mission anchor for long runs | canonical | live | high | high | lane docs, mission templates, tests, portability export | keep | still the shortest active answer to "what mission is live?" |
| `company-hq/AGENT-CONSTITUTION.md` | governance/agent behavior rules | supporting | stable | medium | medium | AI-CONTEXT governance set | keep | still governance-bearing, though not smallest default entrypoint |
| `company-hq/AGENT-PROFILES.md` | older role/profile sheet | historical | reference | low | high | no current canonical consumer found | archive | mostly historical role framing left in an active-looking location |
| `company-hq/AI-CONTEXT-START-HERE.md` | canonical AI doc index | canonical | reference | high | medium | AGENTS, INIT, company-hq README | keep | still the cleanest doc-index surface for broad repo/company context |
| `company-hq/AUTONOMY-MODES.md` | autonomy-mode explanation | supporting | stable | medium | medium | AI-CONTEXT governance set | replace-later | still useful, but overlaps with newer mission-autonomy doctrine and active canon |
| `company-hq/BUDGET-POLICY.md` | governance budget policy | supporting | stable | medium | low | AI-CONTEXT governance set | keep | stable governance rule, not a conflict-heavy surface |
| `company-hq/CLAUDE-CODE-INIT.md` | Claude-specific onboarding | historical | role-specific | low | high | no current canonical consumer found | archive | old lane-specific init from a prior operating phase |
| `company-hq/cleanup-decision-matrix-20260328.md` | prior cleanup audit artifact | historical | reference | medium | medium | this audit, prior cleanup work | archive | useful prior art, but should not remain mistaken for current canon |
| `company-hq/CORE.md` | shortest firm heart | canonical | stable | high | low | CURRENT, MEMORY, AI-CONTEXT, lane docs, tests/export | keep | still the shortest truthful company core |
| `company-hq/DGDH-CEO-CONTEXT.md` | David/CEO orientation and priorities | supporting | stable | medium | medium | AI-CONTEXT operating core | keep | still useful company-specific orientation, but not live baton truth |
| `company-hq/DGDH-GEMINI-ENGINE-V1-2026-03-19.md` | dated Gemini-engine phase spec | historical | reference | low | high | AI-CONTEXT technical set only | archive | dated engine-phase spec should stop competing with current DROID/Triad/Werkbank truth |
| `company-hq/ESCALATION-MATRIX.md` | escalation policy | supporting | stable | medium | low | AI-CONTEXT governance set | keep | stable governance document with ongoing operator value |
| `company-hq/HARNESS-LEARNINGS-FOR-DGDH-2026-03-18.md` | dated harness learnings digest | historical | reference | low | high | no current canonical consumer found | archive | useful history, no longer safe as active top-level truth |
| `company-hq/IDLE-POLICY.md` | idle behavior policy | supporting | stable | medium | low | AI-CONTEXT governance set | keep | stable governance rule with narrow surface |
| `company-hq/MINIMAL-CORE-PROMPT-CONTRACT.md` | compact core prompt contract | supporting | stable | medium | medium | company-hq canonical set | keep | still a useful compact contract document, not obviously superseded |
| `company-hq/MODEL-ROADMAP.md` | older model-strategy roadmap | historical | reference | low | high | no current canonical consumer found | archive | model-phase roadmap is no longer current operating truth |
| `company-hq/README.md` | directory index for company-hq | supporting | reference | medium | low | human/new AI directory orientation | keep | still a legitimate scoped index and already demotes older material |
| `company-hq/ROADMAP.md` | older company bridge roadmap | historical | reference | low | medium | human/manual references | archive | explicitly self-demotes and should eventually live in history rather than active root |
| `company-hq/ROLE-ASSIGNMENT-RUNTIME-MAP-2026-03-18.md` | dated role/runtime map | historical | reference | low | high | no current canonical consumer found | archive | old runtime-role mapping should not compete with current lane/canon |
| `company-hq/ROLE-ROUTING-CONTRACT.md` | role routing contract | supporting | stable | medium | medium | company-hq canonical set | keep | still describes active routing logic at a contract level |
| `company-hq/TASK-BRIEF-TEMPLATE.md` | task brief template | supporting | stable | medium | low | AI-CONTEXT governance set | keep | still a bounded template with governance value |
| `company-hq/TOKEN-ECONOMY-STRATEGY.md` | token/quota strategy context | supporting | reference | low | medium | AI-CONTEXT technical set | keep | useful reference material, but not active baton truth |
| `company-hq/VALIDATION-SAFETY-POLICY.md` | validation/safety policy | supporting | stable | medium | low | company-hq canonical set | keep | still an active safety policy with narrow role |
| `company-hq/VISION.md` | long-horizon company vision | canonical | stable | high | low | AI-CONTEXT, INIT, current canon references | keep | long-horizon North Star must remain explicit and separate from tactical docs |

### Explicitly canonical plan docs in scope

| File | Current function | Authority class | Operational role | Runtime/operator value | Drift risk | Known consumers | Recommended action | Why |
|---|---|---|---|---|---|---|---|---|
| `doc/plans/2026-03-26-dgdh-roadmap-snapshot.md` | short current roadmap snapshot | canonical | stable | high | medium | CURRENT, MEMORY, AI-CONTEXT, INIT | keep | still one of the shortest canonical directional docs |
| `doc/plans/2026-03-27-dgdh-mission-autonomy-doctrine.md` | mission-autonomy doctrine | canonical | stable | high | low | AGENTS, CURRENT, MEMORY, AI-CONTEXT, ACTIVE-MISSION, tests/export | keep | still the canonical doctrine for DGDH mission autonomy |
| `doc/plans/2026-03-30-dgdh-predictive-delivery-doctrine.md` | delivery/verification doctrine | canonical | stable | high | low | AGENTS, CURRENT, MEMORY, AI-CONTEXT, INIT | keep | still the canonical delivery discipline document |

## Migration candidates for Phase 2

### `merge`

- `COPILOT-SKILLS.md`

### `archive`

- `DROID-MISSION.md`
- `company-hq/AGENT-PROFILES.md`
- `company-hq/CLAUDE-CODE-INIT.md`
- `company-hq/cleanup-decision-matrix-20260328.md`
- `company-hq/DGDH-GEMINI-ENGINE-V1-2026-03-19.md`
- `company-hq/HARNESS-LEARNINGS-FOR-DGDH-2026-03-18.md`
- `company-hq/MODEL-ROADMAP.md`
- `company-hq/ROADMAP.md`
- `company-hq/ROLE-ASSIGNMENT-RUNTIME-MAP-2026-03-18.md`

### `replace-later`

- `.hermes.md`
- `INIT.md`
- `REINIT.md`
- `company-hq/AUTONOMY-MODES.md`

### `delete-later`

- `baseline.md`
- `DGDH-WERKBANK-SETUP.md`
- `ZERO_RESCUE.md`

## Open risks

- `CURRENT.md`, `MEMORY.md`, `AGENTS.md`, `company-hq/ACTIVE-MISSION.md`, and `company-hq/CORE.md` have **real repo consumers** in tests, portability export, mission templates, and lane docs. They cannot be replaced casually.
- `INIT.md` and `REINIT.md` are drift-prone, but they are still actively used by humans and AIs as recovery shortcuts. They should be reduced or replaced only after a smaller canonical onboarding flow is proven.
- `company-hq/AI-CONTEXT-START-HERE.md` is not itself the problem; it is valuable as an index. The risk is letting it stay broad while also keeping too many parallel entrypoints alive.
- The public `README.md` and contributor surface are a separate truth problem from the DGDH operator stack. They should not be cleaned up accidentally inside a DGDH doc reconsolidation cut.
- The current DROID `server/src/index.ts` mission is still running, so the live baton files must be treated as evidence surfaces, not migration targets, until that work settles.

## Verification

Matrix coverage for this audit:

- root top-level `.md` files audited: 19
- top-level `company-hq/*.md` files audited: 24
- explicit canonical plan docs audited: 3
- total rows: 46

Required status callouts:

- `AGENTS.md`: canonical, stable, `keep`
- `CURRENT.md`: canonical, live, `keep`
- `MEMORY.md`: canonical, stable, `keep`
- `company-hq/ACTIVE-MISSION.md`: canonical, live, `keep`
- `company-hq/AI-CONTEXT-START-HERE.md`: canonical, reference, `keep`

No migration executed in this phase:

- no file renames
- no archive moves
- no deletions
- no replacement files created

## One sentence

The next cleanup should not invent a new documentation ideology; it should reduce the number of files that pretend to be first without breaking the small set of files that actually carry the firm.
