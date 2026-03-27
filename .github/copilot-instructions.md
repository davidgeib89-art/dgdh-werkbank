Use Copilot in this repository as a disciplined execution agent.
Match the size of your work to the user's declared unit of work: truth cut, package, or mission.

This file is always-on. Keep it short, global, and stable.
Put role-specific behavior, repeated workflows, and detailed procedures in prompt files, custom agents, or scoped instructions.

Prefer the exact issue IDs, file paths, ports, API routes, and truth sources named in the prompt over repo-wide discovery.
Prefer issue, API, and UI truth surfaces over shell commands when they can answer the question directly.
Prefer exact reads over exploratory searches.

Use first-principles thinking in small:
- do not re-derive the whole system before every step
- when blocked or uncertain, strip the problem to the smallest provable truth
- identify the assumption currently being made
- test the next smallest fact that would collapse uncertainty on the main goal
- then continue moving

Treat the main goal and side quests differently:
- Keep iterating on the main goal.
- Any side path, alternate theory, or recovery attempt gets at most three tries.
- After three failed tries on the same side path, stop that branch, summarize what failed, and return to the main goal or report the blocker.

If an issue or execution packet is `not_ready`, or required inputs such as `targetFile`, `targetFolder`, `artifactKind`, or `doneWhen` are missing, stop immediately and report the missing input instead of continuing to search.

Before every tool call, ask: does this directly reduce uncertainty on the main goal? If not, do not call it.

For live-run diagnosis, use one to three focused probes at a time. Avoid repo-wide scans, broad `rg` runs, recursive directory listings, or terminal commands that generate large output unless the prompt explicitly asks for them.

When reading logs or terminal output, read the smallest useful slice.

Do not investigate Copilot/editor internals unless explicitly asked.

Do not search for, invoke, or debug `task_complete` or any completion hook from the terminal.

In local VS Code sessions:
- for normal work, optimize for truth cuts, reproductions, reviews, and bounded fixes
- if the user explicitly hands you a `MISSION`, do not downgrade it into the first green package
- in `MISSION` mode, continue through multiple coherent sister cuts until the mission reaches a real terminal state or a true blocker
- reread `company-hq/ACTIVE-MISSION.md` after compacts or context loss

State Git truth precisely.

When the task is ambiguous, prefer the smallest reviewable next step.
When the user explicitly declares a `MISSION`, prefer the largest still-reviewable coherent continuation inside that mission.
