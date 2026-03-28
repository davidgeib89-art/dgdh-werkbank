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

## Speed vs quality levers (ranked by actual impact in this mission)

1. **Codebase investigation depth** — knowing exact line numbers and call signatures before writing feature descriptions prevented all worker confusion. Highest leverage.
2. **Commit verification** — one missing commit required manual orchestrator intervention. Low cost to prevent (add `git log` check to SKILL.md), high cost when it occurs.
3. **Silent pause prevention** — feature 2 pause added 3m delay and required orchestrator investigation of the working tree. Adding a required reason to pauses prevents this.
4. **Session continuity awareness** — `propose_mission` must precede `StartMissionRun` in new sessions. This is now documented but cost ~8 tool calls to re-discover.
5. **Live proof pre-configuration** — runtime must be configured before the live proof feature runs. Add as a precondition, not a surprise.
6. **Contract size calibration** — lighter contracts for tightly-scoped missions save planning overhead without losing quality signal.
