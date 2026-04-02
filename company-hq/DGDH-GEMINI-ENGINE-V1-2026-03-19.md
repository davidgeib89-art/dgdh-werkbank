# DGDH Gemini Engine — V1 Architecture Concept

Status note 2026-04-02:
- historical technical concept from the Gemini-engine phase
- keep as reference because tests and truth inventories still cite it
- not default current operating truth for DGDH mission autonomy or doc entry
- if this document disagrees with product code or newer doctrine, code and newer canon win

Date: 2026-03-19
Status: Active design document — main build focus from this date

Companion: MODEL-ROADMAP.md, PLATFORM-VISION.md, TOKEN-ECONOMY-STRATEGY.md

---

## 1. Why This Document Exists

Benchmarking proved the current Paperclip/Gemini loop works end-to-end.
The next problem is not measurement — it is fitness.

The Paperclip runtime is a generic multi-agent platform.
DGDH is a human-led, single-operator firm.
The mismatch between those two shapes produces waste: over-complex prompt injection,
generic skills that add noise, no founder-readable quota state, and no routing policy.

This document defines what the Gemini engine should look like for DGDH specifically.

---

## 2. Layer Separation

Four independent layers must stay separated:

| Layer                        | What it is                                      | Current state                     |
| ---------------------------- | ----------------------------------------------- | --------------------------------- |
| Control plane                | stats, quota, routing policy, hard/soft caps    | Partial — data exists, no surface |
| Work engine                  | prompt assembly, skill injection, run lifecycle | Working but over-generic          |
| Memory / reflection layer    | memory hydration, reflection candidates         | Wired in, not DGDH-tuned          |
| Specialist / OContract layer | multi-agent delegation, contract protocols      | Not yet — postponed               |

---

## 3. Control Plane Shape (V1)

### 3a. Stats / Telemetry Endpoint

`GET /api/agents/:id/stats`

Returns a founder-readable snapshot from `agentRuntimeState`:

- `totalInputTokens`, `totalOutputTokens`, `totalCachedInputTokens`
- `totalCostCents` (convert to USD display as needed)
- `lastRunId`, `lastRunStatus`, `lastHeartbeatAt`
- `sessionId` (current active session)
- `hardCapTokens` (resolved for last run)
- `quotaBucket` (flash / pro / flash-lite — derived from model config)

The data is already written to DB on every run finalization (`updateRuntimeState()`).
This endpoint is the missing surface layer.

### 3b. Quota Snapshot

Budget Classes already defined in `resolveHardTokenCapTokens()`:

- `small` = 35k tokens
- `medium` = 75k tokens
- `large` = 125k tokens
- default absolute = 150k tokens

Policy: Default Gemini runs should always be created with an explicit `budgetClass`
in the issue context snapshot. Do not rely on the 150k absolute cap as the operating cap.

Recommended mapping:

- diagnostic / research tasks → `budgetClass: "medium"` (75k)
- full-workflow default-path tasks → `budgetClass: "large"` (125k)
- floor benchmarks → leave as floor contract (already always small by design)

### 3c. Soft Cap Warning

A soft-cap warning should be emitted when a run reaches 80% of `hardCapTokens`.
The keepalive loop already exists in `heartbeat.ts` (`touchRunKeepalive()` at 25s intervals).
Add a threshold check there: if `estimateTotalTokens(usage) > 0.8 * hardCapTokens`, emit a
`publishLiveEvent` with type `heartbeat.run.budget_warning`.

### 3d. Account → Bucket → Model Lane

Current state: flat `config.model` per adapter, no routing abstraction.

V1 routing policy (no code yet — document first):

```
flash bucket:  gemini-3-flash-preview, gemini-2.5-flash
pro bucket:    gemini-3.1-pro-preview, gemini-2.5-pro
flash-lite:    gemini-2.5-flash-lite (future, cheap routing/helper)
```

Policy file (future): a simple JSON field on the agent `runtimeConfig`:

```json
{
  "routingPolicy": {
    "defaultBucket": "flash",
    "expensive_task_bucket": "pro",
    "account": "account-1"
  }
}
```

Multi-account switching is a later option. V1 uses one account, one bucket at a time.
Switching is a manual config change, not automatic routing.

### 3e. Founder-Readable Routing Decisions

Every run should log which model, bucket, and budgetClass were resolved.
This is already partially done via `commandNotes` in `execute.ts`.
Add model + budgetClass to `heartbeatRuns.resultJson` for easy inspection.

---

## 4. Work Engine: What to Keep, Simplify, Cut

### KEEP

- `heartbeatRuns` table / run lifecycle tracking — the full audit trail
- `resolveHardTokenCapTokens()` with `budgetClass` — the cap policy engine
- `parse.ts` with strict output classification — the quality gate (already patched)
- `memoryService.hydrateRunContext()` — already wired at lines 2548 and 3794 in heartbeat.ts
- `run-log-store.ts` / per-run streaming log — necessary for founder inspection
- `costService.createEvent()` — token and spend accounting already works
- Phase B checkpoint gate — good governance hook for write operations later
- Session compaction policy (3-axis: runs, raw tokens, age) — correct design, wrong defaults for DGDH

### SIMPLIFY

- **Prompt assembly**: currently 7 injected sections for a single-agent setup.
  Floor has the right minimal shape. Default should move closer to it while staying broader.
  Target: 3-4 meaningful sections max (task context + session handoff + governance note + prompt).
- **Session compaction defaults**: Paperclip defaults are 200 runs / 2M tokens / 72h.
  DGDH should configure: maxSessionRuns: 20, maxRawInputTokens: 500k, maxSessionAgeHours: 48.
- **Skill set**: currently 4 skills injected (paperclip, paperclip-create-agent,
  paperclip-create-plugin, para-memory-files). For Research-Gemini, only `paperclip` is relevant.

### CUT (from default prompt injection for DGDH)

- `renderApiAccessNote()` — 15-line PowerShell API tutorial injected into every non-floor prompt.
  The `paperclip` skill already covers API access patterns. Remove from default injection.
- `renderPaperclipEnvNote()` — lists every PAPERCLIP\_\* env var. Adds ~1k tokens of noise.
  The agent auto-inherits env vars; no need to list them verbosely in the prompt.
- `paperclip-create-agent` skill symlink — DGDH does not want agents creating agents now.
- `paperclip-create-plugin` skill symlink — not in scope for current phase.
- `para-memory-files` skill — generic memory management skill, not DGDH-tuned.
- Generic "Continue your Paperclip work" default prompt — replace with DGDH-specific template
  in the agent's `runtimeConfig.promptTemplate`.

### POSTPONE

- Phase B checkpoint approval UI and write-operation enforcement
- Advanced reflection candidate promotion flow
- `para-memory-files` specialization for DGDH context
- Bucket-aware automatic model routing
- Multi-account switching
- Flash-lite as cheap routing/helper lane

---

## 5. Memory / Reflection Layer Note

**Current state:**

- `memoryService.hydrateRunContext()` is already live. It loads up to 8 memory items per scope
  (personal, company, project, social) and injects them into the context before every run.
- `reflection.ts` proposes lesson/decision candidates but never auto-commits. Correct design.
- The UI for promoting reflection candidates exists (Sprint 3b / MemoryViewer).

**DGDH policy:**

- Memory hydration is already useful — do not disable it.
- Reflection proposals should stay human-reviewed for now — no auto-promote.
- A specialist memory/reflection agent may exist later but is not V1 scope.
- Do not overdesign memory now. The wired-in hydration is sufficient for V1.
- The main missing feature is not more reflection complexity — it is a cheap
  `stats` tool call at run start/end so the agent can self-report quota state ephemerally.

---

## 6. Specialist / OContract Layer Note (Future)

- Multi-agent collaboration and OContracts between agents are not V1.
- Do not build orchestration now.
- When ready, the Phase B gate and work-packet governance structure already provides
  the checkpoint mechanism for controlled delegation.
- First: build a lean Gemini engine that works well in isolation.
  Then: add controlled delegation paths, one use case at a time.

---

## 7. Obvious Implementation Improvements (No More Testing Required)

These can be applied directly from architecture reading:

1. **Remove `renderApiAccessNote()` from default prompt injection** — saves ~1k tokens per run,
   removes PowerShell tutorial noise that the skill already covers.
2. **Remove `renderPaperclipEnvNote()` from default prompt injection** — additional ~0.5k token saving.
3. **Remove `paperclip-create-agent` and `paperclip-create-plugin` skill symlinks** for DGDH's
   Gemini agent — apply via `runtimeConfig` flag or adapter-level exclusion.
4. **Set explicit `budgetClass` on default issue context** — always pass `budgetClass: "medium"` or
   `budgetClass: "large"` in benchmark/task issue payloads instead of hitting the absolute 150k cap.
5. **Replace generic default promptTemplate** — set DGDH-specific template in agent `runtimeConfig`.
   Example: `"You are Research-Gemini for DGDH. Your task: {{context.paperclipTaskPrompt}}. Stay within scope."`.
6. **Add `/api/agents/:id/stats` endpoint** — the `agentRuntimeState` data is already written every run.
   Expose it as a simple GET for operator inspection.
7. **Tighten session compaction defaults** — set DGDH values in agent `runtimeConfig`:
   `maxSessionRuns: 20`, `maxRawInputTokens: 500000`, `maxSessionAgeHours: 48`.

---

## 8. What Still Requires Measurement Before Touching

- Flash vs Pro cost differential for the same task class (3+3 series — still pending)
- Skill injection token overhead: how much does the `paperclip` skill add to context?
  One run with skill, one without, same task, compare input tokens.
- Memory hydration token cost: how many tokens does `hydrateRunContext()` contribute
  to the input token count? Not yet measured.

Do not cut or simplify any of these until the measurement exists.

---

## 9. Recommended Next Implementation Slice

**Slice: Add `/api/agents/:id/stats` route.**

Why: The token and cost data is already written to `agentRuntimeState` on every run.
This route is a 30-line read-only endpoint. It gives David a founder-readable quota snapshot
without touching the run pipeline. It is the simplest useful step toward the control plane.

After that: the soft-cap warning in the keepalive loop.
After that: the default prompt simplification (remove API note + env note).

---

## 10. Companion Phase Updates

- [MODEL-ROADMAP.md](./MODEL-ROADMAP.md) — updated 2026-03-19 to declare benchmark = guardrail workstream
- [PLATFORM-VISION.md](./PLATFORM-VISION.md) — still valid, no changes needed
- [TOKEN-ECONOMY-STRATEGY.md](./TOKEN-ECONOMY-STRATEGY.md) — still valid
