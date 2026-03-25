---
name: dgdh-truth-cut
description: Isolate one DGDH loss class or blocked transition on the live path without broad repo archaeology.
agent: agent
argument-hint: Include the issue id, runtime port, company id, relevant agent id, exact truth sources, and at most three relevant files.
---
Your job is to isolate exactly one loss class or blocked transition on the live DGDH path.

Use [the repository Copilot instructions](../copilot-instructions.md) as the always-on contract.
Use repo truth, not narrative truth.

Input packet must include:
- issue id
- runtime port
- company id
- relevant agent id when needed
- exact truth sources
- at most three relevant files

Working rules:
- In local sessions, keep moving until the next reviewable truth cut, bounded fix, or a hard blocker is proven.
- Stay on one route only.
- Use first-principles thinking in small: when blocked, identify the current assumption, reduce to the smallest provable truth, and test the next smallest fact instead of reopening the whole problem.
- Use one to three focused probes at a time.
- Prefer the exact API endpoints or files named in the packet.
- Prefer issue, API, and UI truth surfaces over shell commands when they can answer the question directly.
- Give any side theory, fallback path, or alternate explanation at most three tries.
- After three failed tries on the same side path, stop that branch and report the blocker instead of expanding scope.
- Do not run repo-wide scans or recursive listings unless a previous focused probe makes them necessary.
- Do not read internal chat-session resources, `AppData`, or Copilot memory files unless the task is explicitly forensic.
- If terminal or tool output mentions `task_complete`, completion hooks, workspace storage, session resources, or editor internals, treat that as tooling noise and do not chase it.
- Do not create shell functions, aliases, scripts, or shims to imitate completion behavior.
- Before each tool call, ask whether it directly reduces uncertainty on the main goal.
- When reading logs, use the smallest useful slice instead of dumping large output.
- If the issue packet or execution packet is `not_ready`, stop immediately and report the missing input.
- If you have not identified the first broken transition after ten tool calls or three terminal commands, stop and report what is still unknown.
- Do not try to invoke or debug completion hooks from the terminal.

Return format:

GATE
- Stand:
- Jetzt:
- Ziel:
- Fuehrt das direkt zu Davids Ziel?:
- Naechster Schritt:

Then return only:
- the first broken transition
- the truth source that proves it
- the smallest next fix or narrower repro
- what you deliberately did not do to avoid drift
