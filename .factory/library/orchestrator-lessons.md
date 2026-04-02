# Orchestrator Lessons

First-principles retrospectives from real missions. Each lesson strips the inherited assumption,
states what is fundamentally true, and says what changes when you act on that truth.

---

## Mission: reviewer-wake-reliability (2026-03-28)

### Raw timeline facts (what actually happened, no narrative)

| Event | Time | Note |
|---|---|---|
| Session 3affaed3 spawned | -12h | 4 worker attempts, all failed in <5 min, 0 commits |
| Session 245b77dd started | 07:11 | Fresh proposal required because StartMissionRun needs session context |
| Feature 1 complete | 07:17 | 5m 23s, clean commit |
| Feature 2 worker paused | 07:20 | 3m 46s with partial uncommitted work (45-line test file) |
| Feature 2 resumed + complete | 07:46 | 26 min after resume |
| Feature 3 worker complete | 08:12 | 25 min, reported fake commit hash `d0f6f2c` |
| Orchestrator manually committed feature 3 | after mission | Had to manually `git add` + `git commit` |
| Features 4–6 complete | 08:13–08:26 | Fast, clean |
| Live proof blocker | 08:26 | Server healthy but zero companies on instance |

---

## First-principles analysis

### Assumption 1: "A fresh session can resume a previous mission by calling StartMissionRun"

**What was assumed:** The mission runner preserves mission context across sessions automatically.

**What is provably true:** The mission runner uses the *current session's* missionDir context. If a new session starts, there is no active mission — `StartMissionRun` fails with "mission directory does not exist." The previous mission's artifacts are fully intact on disk, but the session bridge is gone.

**What changes:** When resuming an overnight mission in a new session, `propose_mission` must be called first to establish the missionDir context for this session. The proposal can be minimal — the artifacts already exist. The orchestrator wasted ~8 tool calls and several minutes re-discovering this.

**Durable rule:** At the start of any session that intends to resume an existing mission: call `propose_mission` first, even if all artifacts are complete. The proposal is cheap; the confusion is expensive.

---

### Assumption 2: "A worker that pauses has a reason it communicated"

**What was assumed:** Workers pause because they hit a genuine blocker they can articulate.

**What is provably true:** Workers can pause at any point, including in the middle of TDD setup, without leaving any handoff message. The pause mechanism is not gated on having something to say. Feature 2's worker paused after 3m46s with 45 lines of a test file written but no explanation.

**What changes:** A pause with no `whatWasLeftUndone` content is a **silent pause** — indistinguishable from a crash from the orchestrator's perspective. The orchestrator must check the working tree to understand state, which costs time.

**Durable rule added to SKILL.md:** Workers must populate `whatWasLeftUndone` with a specific next step before pausing. "Pausing to think" is not acceptable. If you cannot name what you were about to do, you are not ready to pause — you are confused, which is a different condition that requires returning to the orchestrator.

---

### Assumption 3: "A worker that reports a commitId has a real commit"

**What was assumed:** The commitId field in a handoff reflects an actual git commit that landed on the working branch.

**What is provably true:** Workers can report any string in the commitId field. In this mission, feature 3's worker reported `d0f6f2c` which did not exist in git. The changes were real (correct code was in the working tree), but the commit did not land. Cause: the worker likely ran `git commit` against a detached HEAD or a stale ref and got a local object that was not reachable from `main`.

**What changes:** The orchestrator cannot trust commitId fields without verification. After every feature completion, the orchestrator must run `git log --oneline -1` and cross-check the reported hash. A missing commit with existing working tree changes means the orchestrator must commit manually.

**Durable rule added to SKILL.md and architecture.md:** After `git commit`, run `git log --oneline -1` and confirm the hash matches what you report. Report `no commit` if it does not match.

---

### Assumption 4: "The planning phase is overhead; getting to workers fast is the goal"

**What was assumed:** Faster worker spawn = better mission velocity.

**What is provably true:** The previous session (3affaed3) had 4 workers fail in <5 minutes each — a total of ~25 minutes of wasted worker time — because the droid wasn't installed yet and the SKILL.md had a hardcoded path to a wrong mission ID. The planning phase for the current session took ~20 minutes but produced 6 cleanly-executing features with 5/6 committing on first attempt.

**What changes:** Planning time that eliminates ambiguity about file locations, existing code patterns, and codebase shape directly multiplies worker success rate. A worker that starts with exact file paths and code examples completes in 5 minutes. A worker that starts by discovering the codebase from scratch takes 25+ minutes or fails.

**Durable rule:** Investigation before planning is not overhead — it is the primary quality lever. The AGENTS.md technical context section (specific line numbers, exact import patterns, example logActivity call signatures) is what makes workers reliable. When the investigation is thorough, feature descriptions become precise enough that workers do not need to rediscover.

---

### Assumption 5: "The live proof milestone adds value"

**What was assumed:** A live proof at the end closes the gap between mocked tests and real behavior.

**What is provably true:** The live proof worker found the server healthy but found zero companies on the runtime instance — a configuration state, not a code state. The worker correctly documented this as a specific named blocker. This is real value: it distinguishes "code wrong" from "runtime not configured."

**What the live proof actually tests:** Not the code. The runtime configuration. If the runtime has no companies, the code cannot be exercised. The live proof milestone is a runtime readiness check, not a code correctness check.

**What changes:** The live proof milestone should be scoped as a runtime configuration audit first, code exercise second. If the runtime is not configured (no companies, no agents), the feature should document that and optionally include a step to configure it. Treating the live proof as purely observational leaves it dependent on pre-existing runtime state that the mission never controls.

**Durable rule for future live-proof features:** Include a pre-check step: is the runtime configured with at least one company and one agent per role? If not, either (a) configure it as part of this feature, or (b) document the exact configuration steps as the output and mark the live execution as deferred. Do not let "zero companies" be a surprise at the end.

---

### Assumption 6: "A mission needs a full validation-contract with 20 assertions to be rigorous"

**What was assumed:** More assertions = more thorough = better mission quality.

**What is provably true:** The validation contract for this mission had 20 assertions across 5 areas. Of these, 15 were directly verifiable by targeted unit tests, 3 were documentation diffs, and 2 were live proof. The contract added overhead in planning (coverage check, assertion mapping) without catching anything that the targeted test verification didn't already catch.

**What changes for tightly-scoped server-side missions:** A contract with 5–8 assertions would have been sufficient and faster. The contract value is highest when assertions span surfaces that workers wouldn't naturally cover (UI states, cross-area flows, runtime behaviors). For a mission that is purely service-layer TypeScript with mocked tests, assertions map 1:1 to test cases — the contract duplicates the test spec.

**Durable rule:** For pure server-side TypeScript missions with no UI surface and no runtime dependencies, the validation contract can be lighter: 1 assertion per behavioral boundary, not 1 per test case. Reserve full 20-assertion contracts for missions that cross multiple surfaces (API + UI + runtime).

---

---

## Mission: dgdh-autonomy-bootstrap (2026-03-28)

### Raw timeline facts

| Event | Note |
|---|---|
| Initial proposal rejected | Feature 1 assumed seeding was missing; David corrected — seeding already existed and was tested |
| Reshaped mission accepted | 3 new primitives + runbook instead of re-implementing what existed |
| Mountain 1 complete (4 features) | readiness-truth + operator-path milestones; 147 files, 762 passing |
| Mountain 2 complete (1 feature) | `paperclipai triad start` command; 148 files, 765 passing |

---

### Assumption 7: "If the mission prompt identifies a gap, the gap is real"

**What was assumed:** The orchestrator's analysis of `CURRENT.md` saying "ZERO companies configured" meant `ensure-seed-data.ts` didn't seed agents. The logical conclusion was to implement agent seeding.

**What is provably true:** `ensure-seed-data.ts` already seeded the DGDH company AND CEO/Worker/Reviewer agents, backed by tests. The "ZERO companies" was a runtime configuration state (no DB data), not a code gap. The orchestrator read the symptom as a code deficiency without verifying the code.

**What changes:** Before any feature that claims to "add missing capability X," run a quick grep/glob to confirm X really is missing. One targeted read of the relevant service file would have prevented the wrong proposal in <2 minutes.

**Durable rule:** For any feature described as "add X that is missing" — verify X is actually absent before writing the feature description. One targeted Read/Grep call before writing the feature description is cheaper than a rejected proposal.

---

### Assumption 8: "Symptoms and causes are the same thing"

**What was assumed:** "ZERO companies on runtime" = "seeding code is missing" → "add seeding code."

**What is actually true:** A symptom can have multiple causes. "ZERO companies on runtime" could mean: (a) seeding code missing, (b) seeding code present but not wired, (c) seeding code wired but DB was empty and seeding ran correctly, (d) seeding ran but agents were deleted after. The correct response to a runtime symptom is an observability primitive (can I tell which cause?) before a fix attempt.

**What changes:** When a symptom is identified, enumerate at least 2-3 possible causes before choosing a solution. The highest-value response is often an observability primitive that distinguishes the causes, not an immediate fix for the assumed cause.

**Durable rule:** "Runtime state X is wrong" → first ask "which of several causes could produce X?" → the right feature is often an observability endpoint or health check, not a fix for the assumed first cause.

---

## Speed vs quality levers (ranked by actual impact in this mission)

1. **Codebase investigation depth** — knowing exact line numbers and call signatures before writing feature descriptions prevented all worker confusion. Highest leverage.
2. **Commit verification** — one missing commit required manual orchestrator intervention. Low cost to prevent (add `git log` check to SKILL.md), high cost when it occurs.
3. **Silent pause prevention** — feature 2 pause added 3m delay and required orchestrator investigation of the working tree. Adding a required reason to pauses prevents this.
4. **Session continuity awareness** — `propose_mission` must precede `StartMissionRun` in new sessions. This is now documented but cost ~8 tool calls to re-discover.
5. **Live proof pre-configuration** — runtime must be configured before the live proof feature runs. Add as a precondition, not a surprise.
6. **Contract size calibration** — lighter contracts for tightly-scoped missions save planning overhead without losing quality signal.

---

## Mission: platform-truth-inventory-v1 (2026-03-31)

### Assumption 9: "A documentation or inventory mission is harmless by default"

**What was assumed:** If the stated output is documentation, then the mission cannot meaningfully drift or mutate the shared harness.

**What is provably true:** A documentation mission can still rewrite shared Factory substrate if those files stay writable. In this run, shared files such as `.factory/init.sh`, `.factory/services.yaml`, and `.factory/library/*` were changed into mission-specific forms even though the real product was an inventory document.

**What changes:** Investigation and synthesis missions must be treated as **read-only by default**, not merely "docs-oriented." Shared runtime and harness files need an explicit out-of-scope fence unless the mission itself is a bounded harness-repair cut.

**Durable rule:** For investigation, inventory, audit, and synthesis missions:
- forbid edits to `.factory/init.sh`, `.factory/services.yaml`, `.factory/library/*`, and shared runtime hooks by default
- require explicit mission permission before creating new skills or harness helpers
- require `git status --short` at closeout and reject any claim of `clean working tree` if out-of-scope residue remains

---

## Mission: triad-packet-and-closeout-boringness-v1 setup dropout (2026-03-31)

### Assumption 10: "Narrating the next setup step is close enough to doing it"

**What was assumed:** Once the proposal was approved and the mission artifacts existed, a sentence like "Let me verify the assertion coverage before proceeding" was an acceptable temporary stopping point.

**What is provably true:** That narration can become a silent setup dropout. The mission directory exists, validation artifacts exist, but there is still no `state.json` because `StartMissionRun` was never called. The mission is neither running nor explicitly blocked; it is stranded in proposal-approved limbo.

**What changes:** Mission setup needs its own completion rule. After proposal approval and artifact creation, the orchestrator should either finish the last setup check and call `StartMissionRun` in the same turn, or stop with one exact blocker. Verification prep text is not progress.

**Durable rule:** Treat `mission dir exists` + core artifacts present + no `state.json` as an incomplete setup error state. Do not pause there. Finish setup immediately or report the exact blocker.

---

## Mission: triad-packet-and-closeout-boringness-v1 worker read-loop wobble (2026-03-31)

### Assumption 11: "Rereading the same code slice is harmless thinking time"

**What was assumed:** If a worker is still reading, it is still making progress, even if the reads are nearly identical.

**What is provably true:** A worker can get stuck rereading the same narrow file slice after a truncation or local context wobble. In this mission, the worker repeatedly read the same region of `server/src/routes/issues.ts` before recovering. It did not hard-fail, but it burned time and tokens without adding new evidence.

**What changes:** This should not be treated as a reason to abort the worker immediately. It needs a soft loop breaker: after two same-slice reads, summarize what is already known, force one different action, and only escalate if the loop still persists.

**Durable rule:** Same-slice read repetition is a small `applicability / harness failure` signal. Workers should break it with one summary plus one different move before returning blocked.

---

## Mission: triad-packet-and-closeout-boringness-v1 closeout dropout and HEAD commit truth (2026-03-31)

### Assumption 12: "If the feature graph finished, the mission is cleanly closed"

**What was assumed:** Once the last implementation feature and the last scrutiny validator succeeded, the mission was effectively done even if the orchestrator's final closeout turn was missing.

**What is provably true:** The feature graph can finish while the mission still lacks a real closeout sentence, explicit git truth, and a clean accounting summary. In this run, Mission Control marked the mission as completed, but the orchestrator never fully closed the loop and the mission counters drifted (`completedFeatures > totalFeatures`).

**What changes:** The final validator return is not the end by itself. The orchestrator still owes one explicit closeout turn: result classification, git truth, and any residue or blocker truth.

**Durable rule:** After the final feature or validator returns, close out in the same turn or emit one exact blocker. Do not rely on state-machine completion alone as proof of an honest mission finish.

### Assumption 13: "`commitId: HEAD` is close enough to a real commit hash"

**What was assumed:** Reporting `HEAD` still communicates that a commit happened.

**What is provably true:** `HEAD` is not a commit identity. It hides whether the worker actually verified the hash, and it lets validation or later commits absorb feature work without a clean feature-level git truth.

**What changes:** Commit truth must be either:
- a real verified hash
- or explicit `no commit`

Anything else is ambiguity masquerading as git truth.

**Durable rule:** Treat `commitId: HEAD` as missing commit verification. Workers must report a real verified hash or explicitly report `no commit`.

---

## Mission: triad-liveness-cli-diagnosis (2026-03-31)

### Assumption 14: "If the mission state says completed, the closeout is already honest"

**What was assumed:** Once both milestones and both scrutiny validators passed, the mission was fully and cleanly finished.

**What is provably true:** The state machine can say `completed` while operational truth is still softer than it looks. In this run, the mission state still drifted (`completedFeatures > totalFeatures`) and the working tree needed a final cleanup pass before the branch was actually boringly clean.

**What changes:** Mission completion is not the final truth surface. Git truth still needs one explicit last read: clean tree, exact pushed commit, or explicit parked residue. Without that, "completed" is only workflow truth, not promotion truth.

**Durable rule:** Treat Factory completion as one signal, not the final verdict. Promotion truth still requires explicit git closeout.

### Assumption 15: "A validator can safely fix a few product issues on the side"

**What was assumed:** If scrutiny finds a small product defect while validating, it is efficient for the validator to patch it immediately and keep going.

**What is provably true:** That blurs ownership and weakens feature truth. In this mission, validation reported small fixes such as a missing shared type export and test-file cleanup. Even when the intent is good, the result is that review, validation, and implementation truth get mixed together.

**What changes:** Validators should prove or fail. If validation discovers a real implementation gap, that should become an explicit fix feature or an explicit blocker. Silent validator-side product mutation makes git truth and feature truth harder to trust.

**Durable rule:** Scrutiny validators may write validation artifacts, but should not silently absorb product implementation changes. Reopen the feature or cut a repair feature instead.

### Assumption 16: "A bigger-feeling mission needs more micro-features and more scrutiny steps"

**What was assumed:** To make a mission feel substantial, the answer is often more feature fragmentation and more validator hops.

**What is provably true:** This mission produced a real operator-facing CLI surface and live proof, but it still completed in roughly an hour because the actual product mountain was one medium CLI cut plus live validation. The size limiter was not lack of validator activity; it was the narrowness of the product surface.

**What changes:** If the goal is an all-day autonomous mountain, make the product surface broader and more coherent, not merely more subdivided. More validation phases can increase confidence, but they do not by themselves create a larger mountain.

**Durable rule:** To cut a real day-carrying mission, increase the coherent product surface first. Use validation to prove the mountain, not to simulate size.

---

## Mission: execution-substrate-boundary-v1 validator limbo (2026-03-31)

### Assumption 17: "If the orchestrator says 'Mission Complete', the mission runner must already agree"

**What was assumed:** Completion prose in the orchestrator chat is close enough to state-machine completion, so the user can trust the summary even if Mission Control still shows an open validator.

**What is provably true:** These are separate truth surfaces. In this run:
- `features.json` contained three features, including `scrutiny-validator-closeout-boundary`
- `state.json` still counted only two total features
- `progress_log.jsonl` ended at `milestone_validation_triggered`
- `validation-state.json` remained entirely pending
- the orchestrator chat still emitted "Mission Complete"

So the product work may have been real, but the mission state machine had not honestly crossed the finish line.

**What changes:** Completion must come from the feature graph and validation state, not from chat narration. `milestone_validation_triggered` is not near-complete. It is an intermediate state that still owes one of three things: validator execution, explicit skip reason, or explicit blocker.

**Durable rule:** Treat `features.json` + validation truth as the canonical completion surface. If counters, UI, and chat disagree, do not close the mission from prose. Resolve the mismatch or call it a truthful partial.

### Assumption 18: "Summary counters are strong enough to drive completion"

**What was assumed:** `completedFeatures == totalFeatures` in `state.json` is sufficient proof that the mission is complete.

**What is provably true:** Counters can drift from the actual feature graph. In this run, `state.json` said `2/2` while `features.json` still listed a pending scrutiny validator as the third feature visible in Mission Control. The counters were convenience state, not the real contract.

**What changes:** Feature count must be derived from the actual mission graph. A separate stale counter should never be allowed to overrule a pending feature.

**Durable rule:** If completion accounting exists in more than one place, only one may be canonical. In practice that should be `features.json` plus validator state; all other counters should derive from it.

### Assumption 19: "After `mission_run_started`, the visible Plan pane is still safe to read as current mission truth"

**What was assumed:** Once a mission starts, any plan list still visible in chat or Mission Control remains a reliable description of what is actually open.

**What is provably true:** The old setup checklist can survive past mission start and keep showing steps like `Create validation contract`, `Create features.json`, or `Create worker skill` even after the mission has already created those artifacts, started the worker, completed the implementation feature, and completed scrutiny. In the same run, `state.json` can say `completed`, `features.json` can show all features complete, and the visible plan pane can still sit at `2/7`.

**What changes:** After `mission_run_started`, the feature graph becomes the canonical plan. Any stale setup checklist is UI residue, not mission truth. The orchestrator must say that explicitly if the operator could be misled.

**Durable rule:** Never close or judge a running/completed mission from a stale setup plan. After mission start, trust `features.json`, validation truth, `progress_log.jsonl`, and explicit git truth. If the UI still shows the old setup plan, call it stale residue and continue/close out from the canonical surfaces.

---

## Mission: triad-chain-proof-on-fresh-main worker-crash and validator drift (2026-04-02)

### Raw timeline facts

| Event | Note |
|---|---|
| Mission started | `mission_run_started` on fresh main |
| Foundation worker started | `triad-foundation-setup` |
| Worker failed | `Droid process exited unexpectedly (exit code 0)` |
| Foundation assertions partly landed | parent issue `DAV-27` created, triad preflight green, packet truth partially visible |
| Feature graph drift | `triad-foundation-setup` marked `completed` despite worker failure |
| Validator triggered | `scrutiny-validator-foundation` started immediately after crash |
| Broad scrutiny failed | workspace-wide typecheck/test/build surfaced unrelated baseline failures |
| Mission paused | no CEO cut, no worker execution, no reviewer verdict |

### Assumption 20: "If enough evidence landed before a crash, the feature can be treated as complete"

**What was assumed:** Partial durable side effects plus a crash are close enough to completion for milestone accounting.

**What is provably true:** A crashed worker leaves ambiguous truth. Some expectedBehavior may have landed, but completion is not honest until the feature's expectedBehavior is re-proven from canonical truth surfaces. In this run, the parent issue existed and some assertions were completed, but the worker still crashed and the feature was marked complete anyway.

**What changes:** A crash is not completion. After `worker_failed`, the orchestrator must re-anchor to runtime truth, packet truth, issue truth, and git truth before changing feature status.

**Durable rule:** `worker_failed` must never silently imply `feature completed`. Re-prove the feature, retry/recut it, or stop with one exact blocker.

### Assumption 21: "If a milestone exists, scrutiny is the right default move after a worker failure"

**What was assumed:** The safest recovery after a crash is to let the validator take over.

**What is provably true:** That can turn one bounded mission seam into broad validation theater. In this run, scrutiny escalated immediately into workspace-wide install/typecheck/test/build and reported unrelated baseline failures before the actual triad carry had even reached CEO cut.

**What changes:** Scrutiny is for proof after feature truth, not for replacing feature truth after a crash. The first recovery move should be re-anchoring the crashed feature itself.

**Durable rule:** Do not trigger broad scrutiny by default after `worker_failed`. First recover or classify the implementation feature. Only widen into validators when the packet explicitly asks for broader proof or the feature actually landed and now needs validation.

### Assumption 22: "Repo-local CLI truth can be invoked as `paperclipai ...` inside worker shells"

**What was assumed:** The CLI is available on PATH in mission workers.

**What is provably true:** In this repo on Windows/PowerShell, repo-local CLI truth is dependable as `pnpm paperclipai ...` after `pnpm --filter paperclipai build`, not as raw `paperclipai ...`. In this run, raw `paperclipai runtime status` failed as a command lookup.

**What changes:** Mission skills and examples should stop teaching raw CLI invocation for repo-local truth.

**Durable rule:** In repo-local missions, default to `pnpm paperclipai ...`; build the CLI first when needed. Treat raw `paperclipai ...` as non-canonical unless the environment explicitly proves it is installed globally.
